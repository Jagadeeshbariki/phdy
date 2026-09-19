
import React from 'react';
import { ShieldCheck, LogIn } from 'lucide-react';
import { signInWithGoogleRedirect, handleRedirectResult } from '../src/lib/firebase';
import { Page } from '../App';
import { useFirebase } from '../src/context/FirebaseContext';

interface LoginPageProps {
  onNavigate: (page: Page) => void;
}

const LoginPage: React.FC<LoginPageProps> = ({ onNavigate }) => {
  const { user, role, isAdmin, isTreasurer, loading } = useFirebase();
  const [error, setError] = React.useState<string | null>(null);

  // Check for redirect result on mount
  React.useEffect(() => {
    handleRedirectResult().catch((err) => {
      console.error("Auth redirect error:", err);
      setError("Sign in failed. Please ensure popups/redirects are allowed.");
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

  const handleSignIn = async () => {
    try {
      await signInWithGoogleRedirect();
    } catch (error) {
      console.error("Sign in failed:", error);
      setError("Failed to initiate sign in. Please try again.");
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
          <div className="mb-6 p-4 bg-red-50 border border-red-100 rounded-2xl text-red-600 text-xs font-bold">
            {error}
          </div>
        )}

        <button 
          onClick={handleSignIn}
          className="w-full flex items-center justify-center gap-3 py-4 bg-white border-2 border-gray-100 hover:border-orange-200 hover:bg-orange-50 rounded-2xl transition-all group active:scale-95"
        >
          <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" className="w-5 h-5" alt="Google" />
          <span className="font-black text-xs uppercase tracking-widest text-gray-700 group-hover:text-orange-700">Sign in with Google</span>
        </button>

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
