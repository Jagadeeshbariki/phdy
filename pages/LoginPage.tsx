
import React from 'react';
import { ShieldCheck, LogIn } from 'lucide-react';
import { signInWithGoogle, signInWithGoogleRedirect, handleRedirectResult } from '../src/lib/firebase';
import { Page } from '../App';
import { useFirebase } from '../src/context/FirebaseContext';

interface LoginPageProps {
  onNavigate: (page: Page) => void;
}

const LoginPage: React.FC<LoginPageProps> = ({ onNavigate }) => {
  const { user, role, isAdmin, isTreasurer, loading } = useFirebase();
  const [error, setError] = React.useState<string | null>(null);
  const [isLoggingIn, setIsLoggingIn] = React.useState(false);

  // Check for redirect result on mount
  React.useEffect(() => {
    handleRedirectResult().catch((err) => {
      console.error("Auth redirect error:", err);
      // Only show error if it's not a "no result" case
      if (err.code !== 'auth/no-auth-event') {
        setError("Sign in failed. Please ensure your browser allows popups/redirects.");
      }
    });
  }, []);

  // Redirect based on role once logged in
  React.useEffect(() => {
    if (user && !loading && role) {
      if (isAdmin || isTreasurer) {
        onNavigate('admin');
      } else if (role === 'phdy_member') {
        onNavigate('internal');
      } else {
        onNavigate('home');
      }
    }
  }, [user, role, loading, onNavigate, isAdmin, isTreasurer]);

  const handleSignInPopup = async () => {
    setError(null);
    setIsLoggingIn(true);
    try {
      await signInWithGoogle();
    } catch (err: any) {
      console.error("Sign in failed:", err);
      if (err.code === 'auth/popup-blocked') {
        setError("Popup blocked by your browser. Please allow popups or try the Redirect method.");
      } else {
        setError("Failed to sign in. Please try again.");
      }
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleSignInRedirect = async () => {
    setError(null);
    setIsLoggingIn(true);
    try {
      await signInWithGoogleRedirect();
    } catch (err) {
      console.error("Sign in redirect failed:", err);
      setError("Failed to initiate redirect. Please try the Popup method.");
      setIsLoggingIn(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center bg-gray-50 px-4">
      <div className="max-w-md w-full bg-white rounded-[40px] p-8 md:p-12 shadow-2xl border border-gray-100 text-center animate-fadeIn">
        <div className="w-20 h-20 bg-orange-600 rounded-[28px] flex items-center justify-center text-white mx-auto mb-8 shadow-xl shadow-orange-200">
          <ShieldCheck className="w-10 h-10" />
        </div>
        
        <h1 className="text-3xl font-black text-gray-900 mb-4 uppercase tracking-tight">Portal Access</h1>
        <p className="text-gray-500 text-sm mb-10 leading-relaxed">
          Sign in to access PHDY administrative tools, financial records, and internal member portals.
        </p>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-100 rounded-2xl text-red-600 text-xs font-bold animate-fadeIn">
            {error}
          </div>
        )}

        <div className="space-y-4">
          <button 
            onClick={handleSignInPopup}
            disabled={isLoggingIn}
            className={`w-full flex items-center justify-center gap-3 py-4 bg-white border-2 border-gray-100 hover:border-orange-200 hover:bg-orange-50 rounded-2xl transition-all group active:scale-95 ${isLoggingIn ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" className="w-5 h-5 group-hover:scale-110 transition-transform" alt="Google" />
            <span className="font-black text-[10px] uppercase tracking-widest text-gray-700">
              {isLoggingIn ? 'Connecting...' : 'Sign in with Popup'}
            </span>
          </button>

          <button 
            onClick={handleSignInRedirect}
            disabled={isLoggingIn}
            className={`w-full flex items-center justify-center gap-3 py-4 bg-gray-50 border-2 border-transparent hover:border-gray-200 rounded-2xl transition-all group active:scale-95 ${isLoggingIn ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            <LogIn className="w-4 h-4 text-gray-400 group-hover:text-orange-600 transition-colors" />
            <span className="font-black text-[10px] uppercase tracking-widest text-gray-600">
              Use Redirect Method
            </span>
          </button>
        </div>

        <div className="mt-10 pt-8 border-t border-gray-50 text-left">
          <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-4">Troubleshooting</h4>
          <ul className="text-[10px] text-gray-400 space-y-2 font-bold uppercase tracking-wider leading-relaxed">
            <li className="flex items-start gap-2">
              <span className="text-orange-400">•</span>
              <span>Use Google Chrome for the best experience.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-orange-400">•</span>
              <span>Enable popups in your browser settings.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-orange-400">•</span>
              <span>Authorized Email: vyomanautjagadeesh@gmail.com</span>
            </li>
          </ul>
        </div>

        <div className="mt-8 pt-8 border-t border-gray-50">
          <button 
            onClick={() => onNavigate('home')}
            className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 hover:text-orange-600 transition-colors"
          >
            ← Back to Home
          </button>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
