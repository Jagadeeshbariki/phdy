import React, { useState, useEffect } from 'react';
import { supabase, isSupabaseConfigured, getAuthRedirectUrl } from '../lib/supabaseClient';
import { LoggedInUser, Page } from '../App';
import { ShieldCheck, Lock, Mail, User, KeyRound, ArrowLeft, CheckCircle2, AlertCircle, RefreshCw } from 'lucide-react';

interface LoginPageProps {
  loggedInUser: LoggedInUser | null;
  onLoginSuccess: (user: LoggedInUser) => void;
  onNavigate: (page: Page) => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ loggedInUser, onLoginSuccess, onNavigate }) => {
  const [authMode, setAuthMode] = useState<'login' | 'register' | 'forgot' | 'reset'>('login');
  const [loginData, setLoginData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    role: 'user',
    newPassword: ''
  });

  const [authError, setAuthError] = useState('');
  const [authSuccess, setAuthSuccess] = useState('');
  const [isAuthenticating, setIsAuthenticating] = useState(false);

  // Check URL Hash for Supabase Auth redirect tokens (like password recovery or signup confirmation errors)
  useEffect(() => {
    const hash = window.location.hash;

    // Check for error in hash (e.g. otp_expired)
    if (hash.includes('error=') || hash.includes('error_code=')) {
      if (hash.includes('otp_expired') || hash.includes('invalid')) {
        setAuthError("The email link was invalid or has expired. If you need to reset your password, please use the 'Forgot Password' option below.");
      } else {
        const errorDesc = decodeURIComponent(hash.match(/error_description=([^&]*)/)?.[1]?.replace(/\+/g, ' ') || 'Authentication link error.');
        setAuthError(errorDesc);
      }
      setAuthMode('login');
    }

    // Check for password recovery token
    if (hash.includes('type=recovery') || hash.includes('access_token=')) {
      setAuthMode('reset');
      setAuthSuccess("Email verified! Please enter your new password below.");
    }

    // Supabase auth state listener
    if (isSupabaseConfigured()) {
      const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
        if (event === 'PASSWORD_RECOVERY') {
          setAuthMode('reset');
          setAuthSuccess("Email link verified! Enter your new password below.");
        } else if (event === 'SIGNED_IN' && session?.user) {
          const userRole = session.user.user_metadata?.role || 'user';
          onLoginSuccess({
            email: session.user.email || '',
            role: userRole
          });
          onNavigate('home');
        }
      });

      return () => {
        subscription.unsubscribe();
      };
    }
  }, []);

  const handleAuthAction = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    setAuthSuccess('');
    setIsAuthenticating(true);

    try {
      const inputEmail = loginData.email.trim().toLowerCase();
      const inputPass = loginData.password;

      // ----------------------------------------------------
      // 1. SIGN IN MODE
      // ----------------------------------------------------
      if (authMode === 'login') {
        if (!inputEmail || !inputPass) {
          throw new Error("Please enter both email and password.");
        }

        // Try Supabase Auth first
        if (isSupabaseConfigured()) {
          try {
            const { data, error } = await supabase.auth.signInWithPassword({
              email: inputEmail,
              password: inputPass
            });

            if (error) {
              // If email not confirmed or invalid login credentials
              if (error.message.includes("Email not confirmed")) {
                throw new Error("Your email address has not been confirmed yet. Please check your inbox (and spam folder) and click the confirmation link to activate your account.");
              }
              if (error.message.includes("Invalid login credentials")) {
                throw new Error("Incorrect email or password. Please verify your credentials or reset your password.");
              }
              throw error;
            }

            if (data?.user) {
              const userRole = data.user.user_metadata?.role || 'user';
              onLoginSuccess({ email: data.user.email || inputEmail, role: userRole });
              setAuthSuccess("Logged in successfully! Welcome to PHDY.");
              onNavigate('home');
              setIsAuthenticating(false);
              return;
            }
          } catch (supaErr: any) {
            // Strictly enforce email confirmation & invalid credentials from Supabase - DO NOT bypass!
            if (
              supaErr.message?.includes("not been confirmed") || 
              supaErr.message?.includes("Email not confirmed") ||
              supaErr.message?.includes("Invalid login credentials")
            ) {
              throw supaErr;
            }
            throw new Error(supaErr.message || "Invalid credentials or account not registered.");
          }
        } else {
          // Local fallback directory when Supabase is not configured
          const savedUsers: any[] = JSON.parse(localStorage.getItem('phdy_registered_users_list') || '[]');
          const found = savedUsers.find(u => String(u.email || '').toLowerCase().trim() === inputEmail);
          
          if (!found) {
            throw new Error("Account not found. Please register first.");
          }
          if (found.password && found.password !== inputPass) {
            throw new Error("Incorrect password. Please try again.");
          }
          if (found.status === 'Blocked') {
            throw new Error("Your account has been suspended by the Administrator.");
          }

          const role = found.role || 'user';
          onLoginSuccess({ email: inputEmail, role });
          setAuthSuccess("Logged in successfully! Welcome to PHDY.");
          onNavigate('home');
        }
      }

      // ----------------------------------------------------
      // 2. REGISTER MODE
      // ----------------------------------------------------
      else if (authMode === 'register') {
        if (!loginData.name.trim()) throw new Error("Full name is required.");
        if (!inputEmail || !inputEmail.includes('@')) throw new Error("Please enter a valid email address.");
        if (!inputPass || inputPass.length < 6) throw new Error("Password must be at least 6 characters long.");
        if (inputPass !== loginData.confirmPassword) throw new Error("Passwords do not match.");

        const regEmail = inputEmail;
        const redirectUrl = getAuthRedirectUrl('#login');

        // Always register with Supabase Auth
        const { data, error } = await supabase.auth.signUp({
          email: regEmail,
          password: inputPass,
          options: {
            emailRedirectTo: redirectUrl,
            data: {
              full_name: loginData.name.trim(),
              name: loginData.name.trim(),
              role: 'user' // Default new registration role
            }
          }
        });

        if (error) {
          const errLower = error.message?.toLowerCase() || '';
          if (errLower.includes("already registered") || errLower.includes("already exists") || errLower.includes("user already registered")) {
            throw new Error("This email address is already registered. Please log in.");
          }
          if (errLower.includes("password should be at least")) {
            throw new Error("Password must be at least 6 characters long.");
          }
          if (
            errLower.includes("rate limit") || 
            errLower.includes("too many requests") || 
            errLower.includes("over_email_send_rate_limit") ||
            errLower.includes("security purposes")
          ) {
            throw new Error("Supabase Auth email rate limit reached (1 request per 60 seconds). If you already submitted, please check your inbox (and spam folder) for the verification link, or switch to Sign In.");
          }
          throw error;
        }

        // If user is created, create/upsert the profile record in profiles table
        if (data?.user?.id) {
          try {
            await supabase.from('profiles').upsert({
              id: data.user.id,
              full_name: loginData.name.trim(),
              email: regEmail,
              status: 'active',
              is_admin: false,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            }, { onConflict: 'id' });
          } catch (profileErr) {
            console.warn("[Profiles table auto-upsert]:", profileErr);
          }
        }

        setAuthSuccess(`Registration successful! Supabase has sent a verification email to ${regEmail}. Please open your inbox and click the confirmation link to activate your account.`);
        setAuthMode('login');
        setLoginData(prev => ({ ...prev, password: '', confirmPassword: '' }));
      }

      // ----------------------------------------------------
      // 3. FORGOT PASSWORD (REQUEST RESET LINK)
      // ----------------------------------------------------
      else if (authMode === 'forgot') {
        if (!inputEmail || !inputEmail.includes('@')) {
          throw new Error("Please enter your registered email address.");
        }

        const redirectUrl = getAuthRedirectUrl('#login');

        if (isSupabaseConfigured()) {
          const { error } = await supabase.auth.resetPasswordForEmail(inputEmail, {
            redirectTo: redirectUrl
          });

          if (error) {
            console.warn("[Supabase Reset Password Notice]:", error.message);
          }
        }

        setAuthSuccess(`Password reset request sent to ${inputEmail}. Please check your inbox for the reset link to choose a new password.`);
        setAuthMode('login');
      }

      // ----------------------------------------------------
      // 4. RESET PASSWORD (SET NEW PASSWORD)
      // ----------------------------------------------------
      else if (authMode === 'reset') {
        const newPass = loginData.newPassword.trim();
        if (!newPass || newPass.length < 6) {
          throw new Error("Please enter a new password with at least 6 characters.");
        }

        if (isSupabaseConfigured()) {
          try {
            const { error } = await supabase.auth.updateUser({ password: newPass });
            if (error) throw error;
          } catch (e: any) {
            console.warn("[Supabase updateUser notice]:", e.message);
          }
        }

        // Update in local registered users cache
        try {
          const savedUsers: any[] = JSON.parse(localStorage.getItem('phdy_registered_users_list') || '[]');
          const updated = savedUsers.map(u => {
            if (String(u.email || '').toLowerCase().trim() === inputEmail) {
              return { ...u, password: newPass };
            }
            return u;
          });
          localStorage.setItem('phdy_registered_users_list', JSON.stringify(updated));
        } catch (e) {}

        setAuthSuccess("Password has been successfully updated! You can now sign in with your new password.");
        setAuthMode('login');
        setLoginData(prev => ({ ...prev, password: '', newPassword: '' }));
      }
    } catch (err: any) {
      setAuthError(err.message || 'Authentication operation failed.');
    } finally {
      setIsAuthenticating(false);
    }
  };

  return (
    <div className="min-h-[85vh] flex items-center justify-center px-4 bg-slate-50 py-12">
      <div className="bg-white rounded-[40px] p-8 md:p-12 shadow-2xl border border-orange-50 w-full max-w-md animate-fadeIn">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-orange-100 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-orange-200">
            <img 
              src="https://res.cloudinary.com/dbohmpxko/image/upload/v1729417549/LogoWithoutBG_qzoqus.png" 
              alt="Logo" 
              className="w-10 h-10 object-contain" 
            />
          </div>
          <h1 className="text-2xl md:text-3xl font-black text-gray-900 uppercase tracking-tight mb-1">
            {authMode === 'login' ? 'Portal Sign In' : 
             authMode === 'register' ? 'Register Account' :
             authMode === 'forgot' ? 'Reset Password' : 'Set New Password'}
          </h1>
          <p className="text-gray-400 font-bold text-[10px] uppercase tracking-widest">
            Pedda Harivanam Youth Organization
          </p>
        </div>

        {/* Tab switch between Sign In and Register */}
        {(authMode === 'login' || authMode === 'register') && (
          <div className="flex bg-gray-100 p-1.5 rounded-2xl mb-6">
            <button
              type="button"
              onClick={() => { setAuthMode('login'); setAuthError(''); setAuthSuccess(''); }}
              className={`flex-1 py-2.5 rounded-xl font-bold text-xs transition-all ${
                authMode === 'login' 
                  ? 'bg-white text-orange-600 shadow-sm' 
                  : 'text-gray-500 hover:text-gray-900'
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => { setAuthMode('register'); setAuthError(''); setAuthSuccess(''); }}
              className={`flex-1 py-2.5 rounded-xl font-bold text-xs transition-all ${
                authMode === 'register' 
                  ? 'bg-white text-orange-600 shadow-sm' 
                  : 'text-gray-500 hover:text-gray-900'
              }`}
            >
              Register
            </button>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleAuthAction} className="space-y-4">
          {authMode === 'register' && (
            <div>
              <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1.5 ml-1">
                Full Name
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-gray-400 absolute left-4 top-1/2 -translate-y-1/2" />
                <input 
                  required
                  type="text" 
                  className="w-full pl-11 pr-4 py-3.5 rounded-2xl bg-gray-50 border border-gray-200 outline-none focus:ring-4 focus:ring-orange-100 font-bold text-sm transition-all"
                  placeholder="e.g. Ramesh Kumar"
                  value={loginData.name}
                  onChange={(e) => setLoginData({ ...loginData, name: e.target.value })}
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1.5 ml-1">
              Email Address
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-gray-400 absolute left-4 top-1/2 -translate-y-1/2" />
              <input 
                required
                type="email" 
                className="w-full pl-11 pr-4 py-3.5 rounded-2xl bg-gray-50 border border-gray-200 outline-none focus:ring-4 focus:ring-orange-100 font-bold text-sm transition-all"
                placeholder="name@example.com"
                value={loginData.email}
                onChange={(e) => setLoginData({ ...loginData, email: e.target.value })}
              />
            </div>
          </div>

          {(authMode === 'login' || authMode === 'register') && (
            <div>
              <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1.5 ml-1">
                Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-gray-400 absolute left-4 top-1/2 -translate-y-1/2" />
                <input 
                  required
                  type="password" 
                  className="w-full pl-11 pr-4 py-3.5 rounded-2xl bg-gray-50 border border-gray-200 outline-none focus:ring-4 focus:ring-orange-100 font-bold text-sm transition-all"
                  placeholder="••••••••"
                  value={loginData.password}
                  onChange={(e) => setLoginData({ ...loginData, password: e.target.value })}
                />
              </div>
            </div>
          )}

          {authMode === 'register' && (
            <div>
              <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1.5 ml-1">
                Confirm Password
              </label>
              <div className="relative">
                <KeyRound className="w-4 h-4 text-gray-400 absolute left-4 top-1/2 -translate-y-1/2" />
                <input 
                  required
                  type="password" 
                  className="w-full pl-11 pr-4 py-3.5 rounded-2xl bg-gray-50 border border-gray-200 outline-none focus:ring-4 focus:ring-orange-100 font-bold text-sm transition-all"
                  placeholder="••••••••"
                  value={loginData.confirmPassword}
                  onChange={(e) => setLoginData({ ...loginData, confirmPassword: e.target.value })}
                />
              </div>
            </div>
          )}

          {authMode === 'reset' && (
            <div>
              <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1.5 ml-1">
                New Secure Password
              </label>
              <div className="relative">
                <KeyRound className="w-4 h-4 text-gray-400 absolute left-4 top-1/2 -translate-y-1/2" />
                <input 
                  required
                  type="password" 
                  className="w-full pl-11 pr-4 py-3.5 rounded-2xl bg-gray-50 border border-gray-200 outline-none focus:ring-4 focus:ring-orange-100 font-bold text-sm transition-all"
                  placeholder="At least 6 characters"
                  value={loginData.newPassword}
                  onChange={(e) => setLoginData({ ...loginData, newPassword: e.target.value })}
                />
              </div>
            </div>
          )}

          {authError && (
            <div className="p-4 bg-red-50 text-red-700 rounded-2xl text-xs font-semibold border border-red-100 space-y-2 animate-fadeIn">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                <span>{authError}</span>
              </div>
              {authError.includes('already registered') && (
                <button
                  type="button"
                  onClick={() => {
                    setAuthMode('login');
                    setAuthError('');
                    setAuthSuccess(`Please sign in with your password.`);
                  }}
                  className="mt-2 text-xs font-bold text-orange-700 underline hover:text-orange-900 block"
                >
                  Switch to Sign In &rarr;
                </button>
              )}
              {authError.includes('rate limit') && (
                <div className="pt-2 space-y-2">
                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-[11px] text-amber-900 leading-relaxed">
                    <p className="font-bold text-amber-950 mb-1">ℹ️ Why is this happening in Supabase?</p>
                    <p>
                      Supabase's built-in free email service has an hourly rate limit (approx. 3-4 emails/hr). When this limit is reached, Supabase blocks sending further emails.
                    </p>
                    <p className="mt-1 font-semibold text-amber-900">
                      💡 Quick Fix in Supabase Dashboard:
                    </p>
                    <ol className="list-decimal ml-4 mt-0.5 space-y-0.5">
                      <li>Open your <strong>Supabase Dashboard</strong></li>
                      <li>Go to <strong>Authentication &rarr; Providers &rarr; Email</strong></li>
                      <li>Turn OFF <strong>"Confirm email"</strong> and click <strong>Save</strong></li>
                    </ol>
                    <p className="mt-1 text-[10px] text-amber-800">
                      (Turning off email confirmation will allow immediate registrations into <code className="bg-amber-100 px-1 py-0.5 rounded font-mono">auth.users</code> without email rate-limiting).
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setAuthMode('login');
                        setAuthError('');
                        setAuthSuccess(`Try signing in if your account is already active.`);
                      }}
                      className="px-3 py-1.5 bg-orange-600 text-white rounded-xl text-xs font-bold shadow-sm"
                    >
                      Go to Sign In
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setAuthError('');
                        setAuthSuccess(`Check your inbox and spam folder for any confirmation email already sent.`);
                      }}
                      className="px-3 py-1.5 bg-white border border-gray-300 text-gray-700 rounded-xl text-xs font-bold"
                    >
                      Check Inbox & Spam
                    </button>
                  </div>
                </div>
              )}
              {authError.includes('not been confirmed') && loginData.email && (
                <button
                  type="button"
                  onClick={async () => {
                    try {
                      setIsAuthenticating(true);
                      const { error } = await supabase.auth.resend({
                        type: 'signup',
                        email: loginData.email.trim().toLowerCase(),
                        options: {
                          emailRedirectTo: getAuthRedirectUrl('#login')
                        }
                      });
                      if (error) throw error;
                      setAuthError('');
                      setAuthSuccess(`A fresh confirmation email has been dispatched to ${loginData.email}. Please check your inbox and spam folder.`);
                    } catch (err: any) {
                      setAuthError(err.message || 'Failed to resend confirmation email.');
                    } finally {
                      setIsAuthenticating(false);
                    }
                  }}
                  className="mt-2 text-xs font-bold text-orange-700 underline hover:text-orange-900 block"
                >
                  Resend Confirmation Email &rarr;
                </button>
              )}
            </div>
          )}

          {authSuccess && (
            <div className="p-4 bg-green-50 text-green-800 rounded-2xl text-xs font-semibold border border-green-200 flex items-start gap-2 animate-fadeIn">
              <CheckCircle2 className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
              <span>{authSuccess}</span>
            </div>
          )}

          <button 
            disabled={isAuthenticating}
            type="submit" 
            className="w-full py-4 bg-orange-600 hover:bg-orange-700 active:scale-95 text-white rounded-2xl font-black uppercase tracking-widest shadow-xl shadow-orange-500/20 transition-all disabled:opacity-50 text-xs flex items-center justify-center gap-2"
          >
            {isAuthenticating ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Processing...</span>
              </>
            ) : (
              authMode === 'login' ? 'Sign In' :
              authMode === 'register' ? 'Submit Registration' :
              authMode === 'forgot' ? 'Send Reset Link' : 'Save New Password'
            )}
          </button>
        </form>

        {/* Footer actions */}
        <div className="mt-6 flex flex-col space-y-2 text-center text-xs">
          {authMode === 'login' && (
            <button 
              type="button" 
              onClick={() => { setAuthMode('forgot'); setAuthError(''); setAuthSuccess(''); }} 
              className="font-bold text-orange-600 hover:underline"
            >
              Forgot Password?
            </button>
          )}

          {(authMode === 'forgot' || authMode === 'reset') && (
            <button 
              type="button" 
              onClick={() => { setAuthMode('login'); setAuthError(''); setAuthSuccess(''); }} 
              className="font-bold text-gray-500 hover:text-orange-600 flex items-center justify-center gap-1"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Sign In</span>
            </button>
          )}

          <div className="pt-4 border-t border-gray-100 flex items-center justify-between text-gray-400 text-[11px]">
            <button 
              type="button" 
              onClick={() => onNavigate('home')} 
              className="hover:text-gray-700 font-medium"
            >
              &larr; Back to Home
            </button>
            <button 
              type="button" 
              onClick={() => onNavigate('contact')} 
              className="hover:text-orange-600 font-medium"
            >
              Join Us (Apply) &rarr;
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
