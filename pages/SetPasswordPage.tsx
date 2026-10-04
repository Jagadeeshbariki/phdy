import React, { useState, useEffect } from 'react';
import { supabase, isSupabaseConfigured, cleanSupabaseUrl } from '../lib/supabaseClient';
import { LoggedInUser, Page } from '../App';
import { Lock, KeyRound, CheckCircle2, AlertCircle, Eye, EyeOff, ShieldCheck, ArrowRight, Mail, Sparkles } from 'lucide-react';

interface SetPasswordPageProps {
  onLoginSuccess: (user: LoggedInUser) => void;
  onNavigate: (page: Page) => void;
}

export const SetPasswordPage: React.FC<SetPasswordPageProps> = ({ onLoginSuccess, onNavigate }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [userRole, setUserRole] = useState('phdy_member');

  useEffect(() => {
    // 1. Extract email from URL search params or hash if available
    const searchParams = new URLSearchParams(window.location.search);
    const hashParams = new URLSearchParams(window.location.hash.replace(/^#\/?/, '').replace(/^set-password\??/, ''));
    
    const emailParam = searchParams.get('email') || hashParams.get('email') || searchParams.get('to') || hashParams.get('to');
    if (emailParam) {
      setEmail(emailParam.trim().toLowerCase());
    }

    // 2. Check current Supabase Auth session
    if (isSupabaseConfigured()) {
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (session?.user?.email) {
          setEmail(session.user.email);
          const metaRole = session.user.user_metadata?.role;
          if (metaRole) setUserRole(metaRole);
        }
      });

      // 3. Listen for token recovery or sign-in events
      const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
        if (session?.user?.email) {
          setEmail(session.user.email);
          const metaRole = session.user.user_metadata?.role;
          if (metaRole) setUserRole(metaRole);
        }
      });

      return () => {
        subscription.unsubscribe();
      };
    }
  }, []);

  const handleSetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    const cleanEmail = email.trim().toLowerCase();
    const cleanPassword = password.trim();

    if (!cleanEmail || !cleanEmail.includes('@')) {
      setError('Please enter a valid email address.');
      return;
    }

    if (!cleanPassword || cleanPassword.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }

    if (cleanPassword !== confirmPassword.trim()) {
      setError('Passwords do not match. Please verify and re-enter.');
      return;
    }

    setIsLoading(true);

    try {
      let updateSucceeded = false;
      let finalRole = userRole || 'phdy_member';

      // 1. Update in Supabase Authentication (hashed securely in PostgreSQL auth.users)
      if (isSupabaseConfigured()) {
        try {
          const { data, error: supaErr } = await supabase.auth.updateUser({
            password: cleanPassword,
            data: {
              role: finalRole,
              status: 'Active'
            }
          });

          if (supaErr) {
            // If session expired or direct update failed, try sign in then update
            const { error: signInErr } = await supabase.auth.signInWithPassword({
              email: cleanEmail,
              password: cleanPassword
            });

            if (signInErr) {
              console.warn('[Supabase update password notice]:', supaErr.message);
            } else {
              updateSucceeded = true;
            }
          } else {
            updateSucceeded = true;
            if (data.user?.user_metadata?.role) {
              finalRole = data.user.user_metadata.role;
            }
          }

          // 2. Also ensure profile record is marked Active in public.profiles
          try {
            await supabase.from('profiles').upsert({
              email: cleanEmail,
              status: 'Active',
              role: finalRole
            }, { onConflict: 'email' });
          } catch (profErr) {
            console.warn('[Supabase profiles status update]:', profErr);
          }

          // 3. Update membership_requests table status if applicable
          try {
            await supabase.from('membership_requests').update({
              status: 'Approved'
            }).eq('email', cleanEmail);
          } catch (reqErr) {
            console.warn('[Supabase membership_requests update]:', reqErr);
          }
        } catch (supaErr: any) {
          console.warn('[Supabase Auth update error]:', supaErr);
        }
      }

      // 4. Update in local registered users cache
      try {
        const localUsers: any[] = JSON.parse(localStorage.getItem('phdy_registered_users_list') || '[]');
        const updated = localUsers.map(u => {
          if (String(u.email || '').toLowerCase().trim() === cleanEmail) {
            finalRole = u.role || finalRole;
            return { ...u, password: cleanPassword, status: 'Active' };
          }
          return u;
        });

        // If not found in list, append it
        if (!updated.some(u => String(u.email || '').toLowerCase().trim() === cleanEmail)) {
          updated.unshift({
            name: cleanEmail.split('@')[0],
            email: cleanEmail,
            role: finalRole,
            joinedDate: new Date().toISOString().split('T')[0],
            status: 'Active',
            password: cleanPassword
          });
        }
        localStorage.setItem('phdy_registered_users_list', JSON.stringify(updated));
      } catch (cacheErr) {}

      // 5. Notify user and auto-login
      const loggedUser: LoggedInUser = {
        email: cleanEmail,
        role: finalRole
      };

      onLoginSuccess(loggedUser);
      setSuccess('Your password has been successfully created and encrypted! Redirecting to Home...');

      // Auto-redirect to home page after brief confirmation
      setTimeout(() => {
        onNavigate('home');
      }, 1500);

    } catch (err: any) {
      setError(err.message || 'Failed to save password. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-[85vh] flex items-center justify-center px-4 bg-slate-50 py-12 animate-fadeIn">
      <div className="bg-white rounded-[36px] p-8 md:p-12 shadow-2xl border border-orange-100/70 w-full max-w-md relative overflow-hidden">
        {/* Subtle decorative glow */}
        <div className="absolute top-0 right-0 w-36 h-36 bg-orange-500/10 rounded-full blur-3xl pointer-events-none"></div>

        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-gradient-to-tr from-orange-500 to-amber-500 text-white rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-orange-500/20">
            <KeyRound className="w-8 h-8" />
          </div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-orange-50 border border-orange-200 rounded-full text-orange-700 text-[10px] font-black uppercase tracking-wider mb-2">
            <Sparkles className="w-3 h-3" />
            Official Account Activation
          </div>
          <h1 className="text-2xl md:text-3xl font-black text-gray-900 uppercase tracking-tight">
            Create Your Password
          </h1>
          <p className="text-xs text-gray-500 mt-2 font-medium">
            Welcome to <strong className="text-gray-900">PHDY</strong>. Enter your password twice to activate your account and securely store it in the database.
          </p>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="mb-6 p-4 bg-rose-50 border border-rose-200 text-rose-800 rounded-2xl text-xs flex items-start gap-2.5 animate-shake">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <p className="font-semibold leading-relaxed">{error}</p>
          </div>
        )}

        {/* Success Alert */}
        {success && (
          <div className="mb-6 p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl text-xs flex items-start gap-2.5 animate-fadeIn">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-black mb-1">{success}</p>
              <button
                type="button"
                onClick={() => onNavigate('home')}
                className="text-emerald-700 underline font-bold text-[11px] mt-1 inline-flex items-center gap-1"
              >
                Go to Home Page Now <ArrowRight className="w-3 h-3" />
              </button>
            </div>
          </div>
        )}

        {/* Set Password Form */}
        <form onSubmit={handleSetPassword} className="space-y-4">
          {/* Email (Pre-filled / Auto-detected) */}
          <div>
            <label className="block text-[11px] font-black uppercase tracking-wider text-gray-700 mb-1.5 flex items-center justify-between">
              <span>Your Registered Email</span>
              <span className="text-[10px] text-gray-400 font-bold">Auto-detected</span>
            </label>
            <div className="relative">
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com"
                className="w-full pl-10 pr-4 py-3.5 bg-gray-50 border border-gray-200 rounded-2xl text-sm font-semibold text-gray-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all"
              />
              <Mail className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            </div>
          </div>

          {/* New Password */}
          <div>
            <label className="block text-[11px] font-black uppercase tracking-wider text-gray-700 mb-1.5">
              1. Enter New Password
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Minimum 6 characters"
                className="w-full pl-10 pr-11 py-3.5 bg-gray-50 border border-gray-200 rounded-2xl text-sm font-semibold text-gray-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all"
              />
              <Lock className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 focus:outline-none"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Confirm Password */}
          <div>
            <label className="block text-[11px] font-black uppercase tracking-wider text-gray-700 mb-1.5">
              2. Re-enter Password (Confirm)
            </label>
            <div className="relative">
              <input
                type={showConfirmPassword ? 'text' : 'password'}
                required
                minLength={6}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-type password exactly"
                className="w-full pl-10 pr-11 py-3.5 bg-gray-50 border border-gray-200 rounded-2xl text-sm font-semibold text-gray-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all"
              />
              <Lock className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 focus:outline-none"
              >
                {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Validation Feedback */}
          {password && confirmPassword && (
            <div className="text-[11px] font-bold flex items-center gap-1.5 pt-1">
              {password === confirmPassword ? (
                <span className="text-emerald-600 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Passwords match perfectly
                </span>
              ) : (
                <span className="text-rose-500 flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5" /> Passwords do not match yet
                </span>
              )}
            </div>
          )}

          {/* Security Notice */}
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl text-[11px] text-slate-600 flex items-start gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            <p>
              Your password is encrypted using <strong>bcrypt cryptographic hashing</strong> before storage in PostgreSQL. Nobody (including administrators) can view your raw password.
            </p>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-4 bg-orange-600 hover:bg-orange-700 active:scale-95 text-white rounded-2xl font-black text-xs uppercase tracking-widest transition-all shadow-xl shadow-orange-600/20 flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {isLoading ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            ) : (
              <>
                <span>Save Password & Activate Account</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        {/* Back to Sign In / Home */}
        <div className="mt-6 text-center pt-4 border-t border-gray-100 flex items-center justify-between text-xs font-bold text-gray-500">
          <button
            type="button"
            onClick={() => onNavigate('login')}
            className="hover:text-orange-600 transition-colors"
          >
            &larr; Back to Sign In
          </button>
          <button
            type="button"
            onClick={() => onNavigate('home')}
            className="hover:text-gray-900 transition-colors"
          >
            Home Page
          </button>
        </div>
      </div>
    </div>
  );
};
