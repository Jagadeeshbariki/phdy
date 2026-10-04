-- ==============================================================================
-- PHDY (Pedda Harivanam Development Youth)
-- Production-Ready Supabase SQL Migration
-- Clean 3-Table Architecture: profiles, membership_requests, members
-- ==============================================================================

-- 0. Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ==============================================================================
-- 1. CLEANUP & SEQUENCES
-- ==============================================================================

-- Create sequence for transaction-safe membership numbers (e.g. PHDY-000001)
CREATE SEQUENCE IF NOT EXISTS public.phdy_membership_no_seq START WITH 1 INCREMENT BY 1;

-- ==============================================================================
-- 2. CORE TABLES
-- ==============================================================================

-- 2.1 PROFILES TABLE
-- Stores profile information for every registered website user.
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name TEXT NOT NULL,
    email TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'blocked')),
    is_admin BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);
CREATE INDEX IF NOT EXISTS idx_profiles_is_admin ON public.profiles(is_admin);

-- 2.2 MEMBERSHIP REQUESTS TABLE
-- Stores applications from users seeking official PHDY membership.
CREATE TABLE IF NOT EXISTS public.membership_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL UNIQUE REFERENCES public.profiles(id) ON DELETE CASCADE,
    photo_url TEXT,
    date_of_birth DATE,
    phone TEXT,
    qualification TEXT,
    reason_to_join TEXT,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    reviewed_at TIMESTAMPTZ,
    reviewed_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    admin_remarks TEXT
);

CREATE INDEX IF NOT EXISTS idx_membership_requests_user ON public.membership_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_membership_requests_status ON public.membership_requests(status);

-- 2.3 MEMBERS TABLE
-- Stores ONLY officially approved PHDY members.
CREATE TABLE IF NOT EXISTS public.members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL UNIQUE REFERENCES public.profiles(id) ON DELETE CASCADE,
    membership_number TEXT NOT NULL UNIQUE,
    full_name TEXT NOT NULL,
    photo_url TEXT,
    date_of_birth DATE,
    phone TEXT,
    qualification TEXT,
    reason_to_join TEXT,
    joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    approved_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    approved_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_members_user ON public.members(user_id);
CREATE INDEX IF NOT EXISTS idx_members_number ON public.members(membership_number);
CREATE INDEX IF NOT EXISTS idx_members_status ON public.members(status);

-- ==============================================================================
-- 3. AUTOMATIC TIMESTAMPS & PROFILE CREATION TRIGGERS
-- ==============================================================================

CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_profiles_updated_at ON public.profiles;
CREATE TRIGGER trg_profiles_updated_at
BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS trg_members_updated_at ON public.members;
CREATE TRIGGER trg_members_updated_at
BEFORE UPDATE ON public.members
FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Automatically create profile row when user registers via Supabase Auth
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public, auth
LANGUAGE plpgsql
AS $$
BEGIN
    INSERT INTO public.profiles (id, full_name, email, is_admin, status)
    VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
        NEW.email,
        false,
        'active'
    )
    ON CONFLICT (id) DO UPDATE
    SET 
        full_name = EXCLUDED.full_name,
        email = EXCLUDED.email,
        updated_at = NOW();
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ==============================================================================
-- 4. HELPER SECURITY FUNCTIONS
-- ==============================================================================

-- Fast helper function to check if caller is an Administrator
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
SECURITY DEFINER
SET search_path = public, auth
LANGUAGE plpgsql
STABLE
AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 
        FROM public.profiles 
        WHERE id = auth.uid() 
          AND is_admin = true 
          AND status = 'active'
    );
END;
$$;

-- ==============================================================================
-- 5. ATOMIC RPC TRANSACTIONS (APPROVAL & REJECTION)
-- ==============================================================================

-- 5.1 APPROVE MEMBERSHIP REQUEST
CREATE OR REPLACE FUNCTION public.approve_membership_request(request_id UUID)
RETURNS JSONB
SECURITY DEFINER
SET search_path = public, auth
LANGUAGE plpgsql
AS $$
DECLARE
    v_admin_id UUID;
    v_request RECORD;
    v_profile RECORD;
    v_member_number TEXT;
    v_member_id UUID;
BEGIN
    -- 1. Verify caller is authenticated
    v_admin_id := auth.uid();
    IF v_admin_id IS NULL THEN
        RAISE EXCEPTION 'Authentication required.';
    END IF;

    -- 2. Verify caller is an Administrator
    IF NOT public.is_admin() THEN
        RAISE EXCEPTION 'Permission denied: Only administrators can approve membership applications.';
    END IF;

    -- 3. Lock & retrieve pending membership request
    SELECT * INTO v_request
    FROM public.membership_requests
    WHERE id = request_id
    FOR UPDATE;

    IF v_request IS NULL THEN
        RAISE EXCEPTION 'Membership request with ID % not found.', request_id;
    END IF;

    IF v_request.status != 'pending' THEN
        RAISE EXCEPTION 'Request is already processed (current status: %).', v_request.status;
    END IF;

    -- 4. Retrieve applicant profile
    SELECT * INTO v_profile
    FROM public.profiles
    WHERE id = v_request.user_id;

    IF v_profile IS NULL THEN
        RAISE EXCEPTION 'Applicant user profile not found.';
    END IF;

    -- 5. Generate collision-proof membership number (e.g. PHDY-000001)
    v_member_number := 'PHDY-' || LPAD(nextval('public.phdy_membership_no_seq')::TEXT, 6, '0');

    -- 6. Insert atomic official member record
    INSERT INTO public.members (
        user_id,
        membership_number,
        full_name,
        photo_url,
        date_of_birth,
        phone,
        qualification,
        reason_to_join,
        joined_at,
        approved_at,
        approved_by,
        status
    ) VALUES (
        v_request.user_id,
        v_member_number,
        v_profile.full_name,
        v_request.photo_url,
        v_request.date_of_birth,
        v_request.phone,
        v_request.qualification,
        v_request.reason_to_join,
        NOW(),
        NOW(),
        v_admin_id,
        'active'
    )
    RETURNING id INTO v_member_id;

    -- 7. Update membership request status to approved
    UPDATE public.membership_requests
    SET 
        status = 'approved',
        reviewed_at = NOW(),
        reviewed_by = v_admin_id
    WHERE id = request_id;

    -- 8. Return comprehensive payload for frontend & notifications
    RETURN jsonb_build_object(
        'success', true,
        'message', 'Membership approved successfully.',
        'membership_number', v_member_number,
        'member_id', v_member_id,
        'user_id', v_request.user_id,
        'applicant_name', v_profile.full_name,
        'applicant_email', v_profile.email,
        'approved_at', NOW()
    );
END;
$$;

-- 5.2 REJECT MEMBERSHIP REQUEST
CREATE OR REPLACE FUNCTION public.reject_membership_request(request_id UUID, remarks TEXT DEFAULT NULL)
RETURNS JSONB
SECURITY DEFINER
SET search_path = public, auth
LANGUAGE plpgsql
AS $$
DECLARE
    v_admin_id UUID;
    v_request RECORD;
BEGIN
    v_admin_id := auth.uid();
    IF v_admin_id IS NULL THEN
        RAISE EXCEPTION 'Authentication required.';
    END IF;

    IF NOT public.is_admin() THEN
        RAISE EXCEPTION 'Permission denied: Only administrators can reject membership applications.';
    END IF;

    SELECT * INTO v_request
    FROM public.membership_requests
    WHERE id = request_id
    FOR UPDATE;

    IF v_request IS NULL THEN
        RAISE EXCEPTION 'Membership request not found.';
    END IF;

    UPDATE public.membership_requests
    SET 
        status = 'rejected',
        reviewed_at = NOW(),
        reviewed_by = v_admin_id,
        admin_remarks = remarks
    WHERE id = request_id;

    RETURN jsonb_build_object(
        'success', true,
        'message', 'Membership application marked as rejected.',
        'request_id', request_id
    );
END;
$$;

-- ==============================================================================
-- 6. ROW LEVEL SECURITY (RLS) POLICIES
-- ==============================================================================

-- 6.1 PROFILES RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "profiles_select_own_or_admin" ON public.profiles;
CREATE POLICY "profiles_select_own_or_admin"
ON public.profiles FOR SELECT
TO authenticated, anon
USING (
    auth.uid() = id 
    OR public.is_admin()
    OR status = 'active'
);

DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;
CREATE POLICY "profiles_update_own"
ON public.profiles FOR UPDATE
TO authenticated
USING (auth.uid() = id)
WITH CHECK (
    auth.uid() = id
    AND (is_admin = (SELECT is_admin FROM public.profiles WHERE id = auth.uid()) OR public.is_admin())
);

-- 6.2 MEMBERSHIP REQUESTS RLS
ALTER TABLE public.membership_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "requests_user_insert_own" ON public.membership_requests;
CREATE POLICY "requests_user_insert_own"
ON public.membership_requests FOR INSERT
TO authenticated
WITH CHECK (
    auth.uid() = user_id 
    AND status = 'pending'
    AND reviewed_at IS NULL
    AND reviewed_by IS NULL
);

DROP POLICY IF EXISTS "requests_select_own_or_admin" ON public.membership_requests;
CREATE POLICY "requests_select_own_or_admin"
ON public.membership_requests FOR SELECT
TO authenticated
USING (
    auth.uid() = user_id 
    OR public.is_admin()
);

DROP POLICY IF EXISTS "requests_user_update_own_pending" ON public.membership_requests;
CREATE POLICY "requests_user_update_own_pending"
ON public.membership_requests FOR UPDATE
TO authenticated
USING (auth.uid() = user_id AND status = 'pending')
WITH CHECK (
    auth.uid() = user_id 
    AND status = 'pending'
    AND reviewed_at IS NULL
    AND reviewed_by IS NULL
);

-- 6.3 MEMBERS RLS
ALTER TABLE public.members ENABLE ROW LEVEL SECURITY;

-- Approved members are readable by authenticated users and visitors (directory view)
DROP POLICY IF EXISTS "members_select_active" ON public.members;
CREATE POLICY "members_select_active"
ON public.members FOR SELECT
TO authenticated, anon
USING (
    status = 'active' 
    OR auth.uid() = user_id 
    OR public.is_admin()
);

-- Only admins or SECURITY DEFINER functions can manage members
DROP POLICY IF EXISTS "members_admin_all" ON public.members;
CREATE POLICY "members_admin_all"
ON public.members FOR ALL
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

-- ==============================================================================
-- 7. STORAGE BUCKET CONFIGURATION (membership-photos)
-- ==============================================================================

-- Create bucket if storage schema exists
INSERT INTO storage.buckets (id, name, public)
VALUES ('membership-photos', 'membership-photos', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Storage Policy 1: Authenticated users can upload their own application photo
DROP POLICY IF EXISTS "User can upload own photo" ON storage.objects;
CREATE POLICY "User can upload own photo"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
    bucket_id = 'membership-photos'
    AND (storage.foldername(name))[1] = auth.uid()::TEXT
);

-- Storage Policy 2: Users can update their own photo
DROP POLICY IF EXISTS "User can update own photo" ON storage.objects;
CREATE POLICY "User can update own photo"
ON storage.objects FOR UPDATE
TO authenticated
USING (
    bucket_id = 'membership-photos'
    AND (storage.foldername(name))[1] = auth.uid()::TEXT
);

-- Storage Policy 3: Public read for approved member photos and admin review
DROP POLICY IF EXISTS "Public can view membership photos" ON storage.objects;
CREATE POLICY "Public can view membership photos"
ON storage.objects FOR SELECT
TO authenticated, anon
USING (bucket_id = 'membership-photos');

-- ==============================================================================
-- 8. GRANT PRIVILEGES
-- ==============================================================================
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO anon, authenticated;
GRANT INSERT, UPDATE ON public.profiles TO authenticated;
GRANT INSERT, UPDATE ON public.membership_requests TO authenticated;
GRANT SELECT ON public.members TO anon, authenticated;
GRANT USAGE, SELECT ON SEQUENCE public.phdy_membership_no_seq TO authenticated;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO authenticated, anon;
