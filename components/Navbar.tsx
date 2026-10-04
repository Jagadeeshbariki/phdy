import React, { useState, useEffect } from 'react';
import { useAuth } from '../src/auth/AuthProvider';
import { Page, LoggedInUser } from '../App';
import { PWAInstallButton } from './PWAInstallButton';
import { Award, ShieldCheck, User, LogOut, FileText } from 'lucide-react';

interface NavbarProps {
  currentPage: string;
  onNavClick: (page: Page) => void;
  loggedInUser?: LoggedInUser | null;
  onLogout?: () => void;
}

const Navbar: React.FC<NavbarProps> = ({ currentPage, onNavClick, onLogout }) => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const { user, profile, membership, membershipRequest, isAdmin, isMember, logout } = useAuth();

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleSignOut = async () => {
    if (onLogout) onLogout();
    await logout();
    onNavClick('home');
    setIsMenuOpen(false);
  };

  const displayName = profile?.full_name || user?.user_metadata?.full_name || user?.email?.split('@')[0] || '';

  // Construct dynamic navigation items:
  // 1. Not Logged In: Home, Village Map, Members, Accounting, Contact Us
  // 2. Normal User: Home, Dashboard, Profile, Members, (Become PHDY Member or Membership Status), Village Map, Accounting, Contact Us
  // 3. Approved Member: Home, Dashboard, Profile, Members, My Membership, Village Map, Accounting, PHDY Internal, Contact Us
  // 4. Admin: All above + Admin Portal
  const navItems: { id: Page; label: string }[] = [];

  // Home (All users)
  navItems.push({ id: 'home', label: 'Home' });

  // Dashboard (Authenticated users)
  if (user) {
    navItems.push({ id: 'dashboard', label: 'Dashboard' });
  }

  // Members Directory (All users can view official members)
  navItems.push({ id: 'members', label: 'Members' });

  // Village Map (All users)
  navItems.push({ id: 'villagemap', label: 'Village Map' });

  // Our Works (All users)
  navItems.push({ id: 'ourworks', label: 'Our Works' });

  // Membership Actions based on authentic membership state
  if (user) {
    if (membership && membership.status === 'active') {
      navItems.push({ id: 'my-membership', label: 'My Membership' });
      navItems.push({ id: 'internal', label: 'PHDY Internal' });
    } else if (membershipRequest && (membershipRequest.status === 'pending' || membershipRequest.status === 'rejected')) {
      navItems.push({ id: 'membership-status', label: 'Membership Status' });
    } else {
      navItems.push({ id: 'become-member', label: 'Become Member' });
    }
  }

  // Accounting (All users)
  navItems.push({ id: 'accounting', label: 'Accounting' });

  // Admin Portal (Admin only)
  if (isAdmin) {
    navItems.push({ id: 'admin', label: 'Admin Portal' });
  }

  // Contact Us (All users)
  navItems.push({ id: 'contact', label: 'Contact Us' });

  const handleMobileNavClick = (page: Page) => {
    onNavClick(page);
    setIsMenuOpen(false);
  };

  return (
    <nav className={`fixed w-full z-50 transition-all duration-300 ${isScrolled || isMenuOpen ? 'bg-white shadow-md py-3' : 'bg-white/95 backdrop-blur-md py-4'}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex justify-between items-center">
        
        {/* Brand Logo */}
        <div 
          className="flex items-center space-x-3 cursor-pointer group" 
          onClick={() => handleMobileNavClick('home' as Page)}
        >
          <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-lg border border-orange-50 overflow-hidden transition-transform group-hover:scale-105">
            <img 
              src="https://res.cloudinary.com/dbohmpxko/image/upload/v1729417549/LogoWithoutBG_qzoqus.png" 
              alt="PHDY Logo" 
              className="w-8 h-8 object-contain"
            />
          </div>
          <span className="text-2xl font-black text-orange-600 tracking-tighter">PHDY</span>
        </div>
        
        {/* Desktop Navigation Links */}
        <div className="hidden md:flex items-center space-x-1">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => onNavClick(item.id as Page)}
              className={`px-3.5 py-2 rounded-xl font-bold text-xs transition-all duration-200 ${
                currentPage === item.id 
                ? 'text-orange-700 bg-orange-50 font-black shadow-sm' 
                : 'text-gray-600 hover:text-orange-600 hover:bg-orange-50/60'
              }`}
            >
              {item.label}
            </button>
          ))}

          {/* PWA Install Button */}
          <div className="ml-1">
            <PWAInstallButton />
          </div>

          {/* User Profile / Auth Button */}
          {user ? (
            <div className="flex items-center space-x-2 ml-3">
              <button
                onClick={() => onNavClick('profile')}
                className={`px-3 py-1.5 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all border ${
                  currentPage === 'profile' 
                    ? 'bg-orange-50 border-orange-200 text-orange-800' 
                    : 'bg-gray-50 hover:bg-gray-100 border-gray-200 text-gray-700'
                }`}
                title="View Profile"
              >
                <div className="w-5 h-5 rounded-full bg-orange-500 text-white text-[10px] font-black flex items-center justify-center">
                  {displayName ? displayName.charAt(0).toUpperCase() : 'U'}
                </div>
                <span className="max-w-[120px] truncate text-[11px] font-bold">
                  {displayName || user.email?.split('@')[0]}
                </span>
                {isAdmin && (
                  <span className="text-[9px] px-1.5 py-0.2 bg-indigo-100 text-indigo-800 rounded font-black uppercase">
                    Admin
                  </span>
                )}
                {isMember && !isAdmin && (
                  <span className="text-[9px] px-1.5 py-0.2 bg-emerald-100 text-emerald-800 rounded font-black uppercase">
                    Member
                  </span>
                )}
              </button>

              <button
                onClick={handleSignOut}
                className="p-2 bg-gray-50 hover:bg-red-50 text-gray-400 hover:text-red-600 rounded-xl transition-all border border-gray-200 hover:border-red-100"
                title="Sign Out"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <button
              onClick={() => onNavClick('login' as Page)}
              className={`ml-3 px-5 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-xl font-black text-xs uppercase tracking-wider transition-all shadow-md shadow-orange-200 ${
                currentPage === 'login' ? 'ring-4 ring-orange-100' : ''
              }`}
            >
              Sign In
            </button>
          )}
        </div>

        {/* Mobile Menu Button */}
        <div className="md:hidden">
          <button 
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="text-gray-700 p-2 hover:bg-gray-100 rounded-lg transition-colors outline-none"
          >
            {isMenuOpen ? (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16m-7 6h7" />
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* Mobile Menu Content */}
      {isMenuOpen && (
        <div className="md:hidden bg-white border-t border-gray-50 animate-fadeIn shadow-xl">
          <div className="px-4 py-6 space-y-2">
            {navItems.map((item) => (
              <button
                key={item.id}
                onClick={() => handleMobileNavClick(item.id as Page)}
                className={`w-full text-left px-5 py-3 rounded-2xl font-bold text-xs transition-all ${
                  currentPage === item.id 
                  ? 'text-orange-700 bg-orange-50 shadow-sm' 
                  : 'text-gray-600 hover:text-orange-600 hover:bg-orange-50'
                }`}
              >
                {item.label}
              </button>
            ))}

            <div className="pt-4 border-t border-gray-100 mt-4 space-y-3">
              <PWAInstallButton isMobileNav />
              {user ? (
                <div className="space-y-2">
                  <button
                    onClick={() => handleMobileNavClick('profile')}
                    className="w-full px-5 py-3 bg-gray-50 rounded-2xl text-xs font-bold text-gray-700 flex items-center justify-between"
                  >
                    <span>Profile: {displayName || user.email}</span>
                    <span className="text-[10px] uppercase font-black text-orange-600">View</span>
                  </button>

                  <button
                    onClick={handleSignOut}
                    className="w-full py-3.5 bg-red-50 hover:bg-red-100 text-red-600 rounded-2xl font-black uppercase tracking-widest text-xs flex items-center justify-center gap-2 transition-colors"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>Sign Out</span>
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => handleMobileNavClick('login' as Page)}
                  className="w-full py-4 bg-orange-600 text-white rounded-2xl font-black uppercase tracking-widest text-xs shadow-xl shadow-orange-200"
                >
                  Sign In / Register
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navbar;
