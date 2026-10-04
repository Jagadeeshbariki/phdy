-- ==============================================================================
-- PHDY (Pedda Harivanam Development Youth) 
-- Production-Grade Supabase Auth + PostgreSQL RBAC & Membership Schema
-- Completely Idempotent & Migration-Safe (handles existing tables/columns gracefully)
-- ==============================================================================

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ==============================================================================
-- 2. TABLES DEFINITIONS & AUTOMATIC COLUMN REPAIR
-- ==============================================================================

-- 2.1 PROFILES TABLE (Linked 1:1 to auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name TEXT NOT NULL DEFAULT '',
    phone TEXT,
    email TEXT,
    avatar_url TEXT,
    status TEXT NOT NULL DEFAULT 'active',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Ensure all columns exist even if public.profiles already existed from previous setup
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS full_name TEXT NOT NULL DEFAULT '';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS avatar_url TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'active';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

-- 2.2 ROLES TABLE
CREATE TABLE IF NOT EXISTS public.roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT UNIQUE NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.roles ADD COLUMN IF NOT EXISTS name TEXT;
ALTER TABLE public.roles ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE public.roles ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

-- 2.3 USER_ROLES JUNCTION TABLE
CREATE TABLE IF NOT EXISTS public.user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    role_id UUID NOT NULL REFERENCES public.roles(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_user_roles UNIQUE (user_id, role_id)
);

ALTER TABLE public.user_roles ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE;
ALTER TABLE public.user_roles ADD COLUMN IF NOT EXISTS role_id UUID REFERENCES public.roles(id) ON DELETE CASCADE;
ALTER TABLE public.user_roles ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

-- 2.4 PHDY_MEMBERS TABLE (Join Us / Official Membership Applications)
CREATE TABLE IF NOT EXISTS public.phdy_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID UNIQUE NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    membership_id TEXT UNIQUE,
    application_status TEXT NOT NULL DEFAULT 'pending',
    village TEXT,
    mandal TEXT,
    district TEXT,
    occupation TEXT,
    reason_to_join TEXT,
    joined_at TIMESTAMPTZ,
    approved_at TIMESTAMPTZ,
    approved_by UUID REFERENCES public.profiles(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.phdy_members ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE;
ALTER TABLE public.phdy_members ADD COLUMN IF NOT EXISTS membership_id TEXT;
ALTER TABLE public.phdy_members ADD COLUMN IF NOT EXISTS application_status TEXT NOT NULL DEFAULT 'pending';
ALTER TABLE public.phdy_members ADD COLUMN IF NOT EXISTS village TEXT;
ALTER TABLE public.phdy_members ADD COLUMN IF NOT EXISTS mandal TEXT;
ALTER TABLE public.phdy_members ADD COLUMN IF NOT EXISTS district TEXT;
ALTER TABLE public.phdy_members ADD COLUMN IF NOT EXISTS occupation TEXT;
ALTER TABLE public.phdy_members ADD COLUMN IF NOT EXISTS reason_to_join TEXT;
ALTER TABLE public.phdy_members ADD COLUMN IF NOT EXISTS joined_at TIMESTAMPTZ;
ALTER TABLE public.phdy_members ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ;
ALTER TABLE public.phdy_members ADD COLUMN IF NOT EXISTS approved_by UUID REFERENCES public.profiles(id);
ALTER TABLE public.phdy_members ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE public.phdy_members ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

-- 2.5 PERMISSIONS TABLE
CREATE TABLE IF NOT EXISTS public.permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    permission_code TEXT UNIQUE NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.permissions ADD COLUMN IF NOT EXISTS permission_code TEXT;
ALTER TABLE public.permissions ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE public.permissions ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

-- 2.6 ROLE_PERMISSIONS JUNCTION TABLE
CREATE TABLE IF NOT EXISTS public.role_permissions (
    role_id UUID NOT NULL REFERENCES public.roles(id) ON DELETE CASCADE,
    permission_id UUID NOT NULL REFERENCES public.permissions(id) ON DELETE CASCADE,
    PRIMARY KEY (role_id, permission_id)
);

ALTER TABLE public.role_permissions ADD COLUMN IF NOT EXISTS role_id UUID REFERENCES public.roles(id) ON DELETE CASCADE;
ALTER TABLE public.role_permissions ADD COLUMN IF NOT EXISTS permission_id UUID REFERENCES public.permissions(id) ON DELETE CASCADE;

-- ==============================================================================
-- 3. DATABASE INDEXES (Created safely after columns exist)
-- ==============================================================================
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);
CREATE INDEX IF NOT EXISTS idx_profiles_phone ON public.profiles(phone);
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON public.user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_role_id ON public.user_roles(role_id);
CREATE INDEX IF NOT EXISTS idx_phdy_members_user_id ON public.phdy_members(user_id);
CREATE INDEX IF NOT EXISTS idx_phdy_members_membership_id ON public.phdy_members(membership_id);
CREATE INDEX IF NOT EXISTS idx_phdy_members_app_status ON public.phdy_members(application_status);

-- ==============================================================================
-- 4. SEED ROLES & PERMISSIONS
-- ==============================================================================

-- 4.1 Insert Initial Roles
INSERT INTO public.roles (name, description) VALUES
    ('user', 'Standard registered website user with dashboard access'),
    ('member', 'Verified PHDY member with internal directory & data access'),
    ('moderator', 'Youth coordinator with member management rights'),
    ('admin', 'Organization administrator with full management & approval rights'),
    ('super_admin', 'System root with unrestricted platform permissions')
ON CONFLICT (name) DO UPDATE SET description = EXCLUDED.description;

-- 4.2 Insert Initial Permissions
INSERT INTO public.permissions (permission_code, description) VALUES
    ('view_public_data', 'View public village maps, projects, and public information'),
    ('view_member_data', 'View internal members directory, resolutions, and group assets'),
    ('view_dashboard', 'Access the member/user personalized dashboard'),
    ('view_beneficiary_data', 'View sensitive beneficiary and youth welfare lists'),
    ('view_financial_data', 'View village treasury accounts, vouchers, and funds'),
    ('manage_members', 'Edit member records and organize rosters'),
    ('manage_users', 'Manage user accounts, block/unblock users'),
    ('manage_data', 'Create and modify village development works and accounting records'),
    ('approve_members', 'Review and approve/reject Join Us membership applications')
ON CONFLICT (permission_code) DO UPDATE SET description = EXCLUDED.description;

-- 4.3 Map Role Permissions
DO $$
DECLARE
    r_user UUID;
    r_member UUID;
    r_moderator UUID;
    r_admin UUID;
    r_super_admin UUID;
    
    p_view_pub UUID;
    p_view_dash UUID;
    p_view_mem UUID;
    p_view_ben UUID;
    p_view_fin UUID;
    p_man_mem UUID;
    p_man_usr UUID;
    p_man_data UUID;
    p_appr_mem UUID;
BEGIN
    SELECT id INTO r_user FROM public.roles WHERE name = 'user';
    SELECT id INTO r_member FROM public.roles WHERE name = 'member';
    SELECT id INTO r_moderator FROM public.roles WHERE name = 'moderator';
    SELECT id INTO r_admin FROM public.roles WHERE name = 'admin';
    SELECT id INTO r_super_admin FROM public.roles WHERE name = 'super_admin';

    SELECT id INTO p_view_pub FROM public.permissions WHERE permission_code = 'view_public_data';
    SELECT id INTO p_view_dash FROM public.permissions WHERE permission_code = 'view_dashboard';
    SELECT id INTO p_view_mem FROM public.permissions WHERE permission_code = 'view_member_data';
    SELECT id INTO p_view_ben FROM public.permissions WHERE permission_code = 'view_beneficiary_data';
    SELECT id INTO p_view_fin FROM public.permissions WHERE permission_code = 'view_financial_data';
    SELECT id INTO p_man_mem FROM public.permissions WHERE permission_code = 'manage_members';
    SELECT id INTO p_man_usr FROM public.permissions WHERE permission_code = 'manage_users';
    SELECT id INTO p_man_data FROM public.permissions WHERE permission_code = 'manage_data';
    SELECT id INTO p_appr_mem FROM public.permissions WHERE permission_code = 'approve_members';

    -- user role permissions
    INSERT INTO public.role_permissions (role_id, permission_id) VALUES
        (r_user, p_view_pub),
        (r_user, p_view_dash)
    ON CONFLICT DO NOTHING;

    -- member role permissions
    INSERT INTO public.role_permissions (role_id, permission_id) VALUES
        (r_member, p_view_pub),
        (r_member, p_view_dash),
        (r_member, p_view_mem)
    ON CONFLICT DO NOTHING;

    -- moderator role permissions
    INSERT INTO public.role_permissions (role_id, permission_id) VALUES
        (r_moderator, p_view_pub),
        (r_moderator, p_view_dash),
        (r_moderator, p_view_mem),
        (r_moderator, p_man_mem)
    ON CONFLICT DO NOTHING;

    -- admin role permissions
    INSERT INTO public.role_permissions (role_id, permission_id) VALUES
        (r_admin, p_view_pub),
        (r_admin, p_view_dash),
        (r_admin, p_view_mem),
        (r_admin, p_view_ben),
        (r_admin, p_view_fin),
        (r_admin, p_man_mem),
        (r_admin, p_man_usr),
        (r_admin, p_man_data),
        (r_admin, p_appr_mem)
    ON CONFLICT DO NOTHING;

    -- super_admin (all permissions)
    INSERT INTO public.role_permissions (role_id, permission_id)
    SELECT r_super_admin, id FROM public.permissions
    ON CONFLICT DO NOTHING;
END $$;

-- ==============================================================================
-- 5. SECURE HELPER FUNCTIONS (SECURITY DEFINER)
-- ==============================================================================

-- 5.1 Check if current user has a specific role
CREATE OR REPLACE FUNCTION public.has_role(role_name TEXT)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
    SELECT EXISTS (
        SELECT 1 
        FROM public.user_roles ur
        JOIN public.roles r ON ur.role_id = r.id
        WHERE ur.user_id = auth.uid()
          AND (r.name = role_name OR r.name = 'super_admin')
    );
$$;

-- 5.2 Check if current user has a specific permission
CREATE OR REPLACE FUNCTION public.has_permission(perm_code TEXT)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
    SELECT EXISTS (
        SELECT 1 
        FROM public.user_roles ur
        JOIN public.role_permissions rp ON ur.role_id = rp.role_id
        JOIN public.permissions p ON rp.permission_id = p.id
        JOIN public.roles r ON ur.role_id = r.id
        WHERE ur.user_id = auth.uid()
          AND (p.permission_code = perm_code OR r.name = 'super_admin')
    );
$$;

-- 5.3 Get list of role names for current user
CREATE OR REPLACE FUNCTION public.get_user_roles()
RETURNS TABLE (role_name TEXT)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
    SELECT r.name
    FROM public.user_roles ur
    JOIN public.roles r ON ur.role_id = r.id
    WHERE ur.user_id = auth.uid();
$$;

-- 5.4 Get list of all permissions for current user
CREATE OR REPLACE FUNCTION public.get_user_permissions()
RETURNS TABLE (permission_code TEXT)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
    SELECT DISTINCT p.permission_code
    FROM public.user_roles ur
    JOIN public.role_permissions rp ON ur.role_id = rp.role_id
    JOIN public.permissions p ON rp.permission_id = p.id
    WHERE ur.user_id = auth.uid();
$$;

-- ==============================================================================
-- 6. PROFILE & USER CREATION TRIGGER
-- ==============================================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    default_role_id UUID;
    user_name TEXT;
    user_phone TEXT;
BEGIN
    -- Extract full name and phone from raw user metadata if provided
    user_name := COALESCE(
        NEW.raw_user_meta_data->>'full_name',
        NEW.raw_user_meta_data->>'name',
        split_part(NEW.email, '@', 1)
    );
    user_phone := NEW.raw_user_meta_data->>'phone';

    -- 1. Create Profile
    INSERT INTO public.profiles (
        id,
        full_name,
        email,
        phone,
        avatar_url,
        status
    ) VALUES (
        NEW.id,
        user_name,
        NEW.email,
        user_phone,
        NEW.raw_user_meta_data->>'avatar_url',
        'active'
    ) ON CONFLICT (id) DO UPDATE SET
        full_name = EXCLUDED.full_name,
        email = EXCLUDED.email,
        phone = COALESCE(EXCLUDED.phone, profiles.phone);

    -- 2. Assign default "user" role
    SELECT id INTO default_role_id FROM public.roles WHERE name = 'user';
    IF default_role_id IS NOT NULL THEN
        INSERT INTO public.user_roles (user_id, role_id)
        VALUES (NEW.id, default_role_id)
        ON CONFLICT DO NOTHING;
    END IF;

    RETURN NEW;
EXCEPTION WHEN OTHERS THEN
    -- Make signup resilient: log warning and continue
    RAISE WARNING 'handle_new_user error: %', SQLERRM;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_profiles_updated_at ON public.profiles;
CREATE TRIGGER trg_profiles_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS trg_phdy_members_updated_at ON public.phdy_members;
CREATE TRIGGER trg_phdy_members_updated_at
    BEFORE UPDATE ON public.phdy_members
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ==============================================================================
-- 7. SECURE RPC FUNCTIONS (MEMBERSHIP APPROVAL & REJECTION)
-- ==============================================================================

-- 7.1 Approve Membership RPC
CREATE OR REPLACE FUNCTION public.approve_membership(target_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    caller_id UUID;
    member_role_id UUID;
    gen_member_id TEXT;
    app_record RECORD;
BEGIN
    caller_id := auth.uid();
    IF caller_id IS NULL THEN
        RAISE EXCEPTION 'Authentication required.';
    END IF;

    -- 1. Validate caller has 'approve_members' permission or admin/super_admin role
    IF NOT (public.has_permission('approve_members') OR public.has_role('admin') OR public.has_role('super_admin')) THEN
        RAISE EXCEPTION 'Access denied: You do not have permission to approve members.';
    END IF;

    -- 2. Verify membership record exists
    SELECT * INTO app_record FROM public.phdy_members WHERE user_id = target_user_id;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Membership application not found for user: %', target_user_id;
    END IF;

    -- 3. Generate structured membership ID if not already generated
    IF app_record.membership_id IS NULL OR app_record.membership_id = '' THEN
        gen_member_id := 'PHDY-' || TO_CHAR(NOW(), 'YYYY') || '-' || LPAD(FLOOR(RANDOM() * 10000)::TEXT, 4, '0');
    ELSE
        gen_member_id := app_record.membership_id;
    END IF;

    -- 4. Update phdy_members status
    UPDATE public.phdy_members
    SET 
        application_status = 'approved',
        membership_id = gen_member_id,
        approved_at = NOW(),
        approved_by = caller_id,
        joined_at = COALESCE(joined_at, NOW()),
        updated_at = NOW()
    WHERE user_id = target_user_id;

    -- 5. Assign 'member' role in user_roles
    SELECT id INTO member_role_id FROM public.roles WHERE name = 'member';
    IF member_role_id IS NOT NULL THEN
        INSERT INTO public.user_roles (user_id, role_id)
        VALUES (target_user_id, member_role_id)
        ON CONFLICT DO NOTHING;
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'message', 'Member application approved successfully.',
        'membership_id', gen_member_id,
        'user_id', target_user_id
    );
END;
$$;

-- 7.2 Reject Membership RPC
CREATE OR REPLACE FUNCTION public.reject_membership(target_user_id UUID, rejection_reason TEXT DEFAULT NULL)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    caller_id UUID;
    member_role_id UUID;
BEGIN
    caller_id := auth.uid();
    IF caller_id IS NULL THEN
        RAISE EXCEPTION 'Authentication required.';
    END IF;

    -- 1. Validate caller has 'approve_members' permission
    IF NOT (public.has_permission('approve_members') OR public.has_role('admin') OR public.has_role('super_admin')) THEN
        RAISE EXCEPTION 'Access denied: You do not have permission to reject membership requests.';
    END IF;

    -- 2. Update status to rejected
    UPDATE public.phdy_members
    SET 
        application_status = 'rejected',
        approved_at = NULL,
        approved_by = caller_id,
        updated_at = NOW()
    WHERE user_id = target_user_id;

    -- 3. Remove 'member' role if it was previously assigned
    SELECT id INTO member_role_id FROM public.roles WHERE name = 'member';
    IF member_role_id IS NOT NULL THEN
        DELETE FROM public.user_roles 
        WHERE user_id = target_user_id AND role_id = member_role_id;
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'message', 'Member application has been rejected.',
        'user_id', target_user_id
    );
END;
$$;

-- ==============================================================================
-- 8. ROW LEVEL SECURITY (RLS) POLICIES
-- ==============================================================================

-- 8.1 PROFILES POLICIES
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "profiles_select_policy" ON public.profiles;
CREATE POLICY "profiles_select_policy"
ON public.profiles FOR SELECT
TO authenticated, anon
USING (
    -- Users can read their own profile, or members/admins can read public profiles
    auth.uid() = id 
    OR public.has_permission('view_member_data')
    OR public.has_permission('manage_users')
    OR status = 'active'
);

DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;
CREATE POLICY "profiles_update_own"
ON public.profiles FOR UPDATE
TO authenticated
USING (auth.uid() = id)
WITH CHECK (
    auth.uid() = id 
    AND (status = (SELECT status FROM public.profiles WHERE id = auth.uid()) OR public.has_role('admin'))
);

DROP POLICY IF EXISTS "profiles_admin_manage" ON public.profiles;
CREATE POLICY "profiles_admin_manage"
ON public.profiles FOR ALL
TO authenticated
USING (public.has_role('admin') OR public.has_role('super_admin'))
WITH CHECK (public.has_role('admin') OR public.has_role('super_admin'));

-- 8.2 ROLES & PERMISSIONS POLICIES
ALTER TABLE public.roles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "roles_read_all" ON public.roles;
CREATE POLICY "roles_read_all" ON public.roles FOR SELECT TO authenticated, anon USING (true);

ALTER TABLE public.permissions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "permissions_read_all" ON public.permissions;
CREATE POLICY "permissions_read_all" ON public.permissions FOR SELECT TO authenticated USING (true);

ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "role_permissions_read_all" ON public.role_permissions;
CREATE POLICY "role_permissions_read_all" ON public.role_permissions FOR SELECT TO authenticated USING (true);

-- 8.3 USER_ROLES POLICIES
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "user_roles_select_own_or_admin" ON public.user_roles;
CREATE POLICY "user_roles_select_own_or_admin"
ON public.user_roles FOR SELECT
TO authenticated
USING (
    auth.uid() = user_id 
    OR public.has_role('admin') 
    OR public.has_role('super_admin')
);

DROP POLICY IF EXISTS "user_roles_admin_modify" ON public.user_roles;
CREATE POLICY "user_roles_admin_modify"
ON public.user_roles FOR ALL
TO authenticated
USING (public.has_role('admin') OR public.has_role('super_admin'))
WITH CHECK (public.has_role('admin') OR public.has_role('super_admin'));

-- 8.4 PHDY_MEMBERS POLICIES
ALTER TABLE public.phdy_members ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "phdy_members_select" ON public.phdy_members;
CREATE POLICY "phdy_members_select"
ON public.phdy_members FOR SELECT
TO authenticated
USING (
    auth.uid() = user_id 
    OR public.has_permission('view_member_data') 
    OR public.has_permission('manage_members')
    OR public.has_permission('approve_members')
);

DROP POLICY IF EXISTS "phdy_members_insert_own" ON public.phdy_members;
CREATE POLICY "phdy_members_insert_own"
ON public.phdy_members FOR INSERT
TO authenticated
WITH CHECK (
    auth.uid() = user_id 
    AND application_status = 'pending'
);

DROP POLICY IF EXISTS "phdy_members_update_own" ON public.phdy_members;
CREATE POLICY "phdy_members_update_own"
ON public.phdy_members FOR UPDATE
TO authenticated
USING (auth.uid() = user_id AND application_status = 'pending')
WITH CHECK (
    auth.uid() = user_id 
    AND application_status = 'pending'
    AND approved_by IS NULL 
    AND approved_at IS NULL
);

DROP POLICY IF EXISTS "phdy_members_admin_manage" ON public.phdy_members;
CREATE POLICY "phdy_members_admin_manage"
ON public.phdy_members FOR ALL
TO authenticated
USING (public.has_permission('manage_members') OR public.has_role('admin') OR public.has_role('super_admin'))
WITH CHECK (public.has_permission('manage_members') OR public.has_role('admin') OR public.has_role('super_admin'));

-- ==============================================================================
-- 9. GRANT PRIVILEGES
-- ==============================================================================
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO anon, authenticated;
GRANT INSERT, UPDATE ON public.profiles TO authenticated;
GRANT INSERT, UPDATE ON public.phdy_members TO authenticated;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO authenticated, anon;
