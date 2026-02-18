
import React, { useState, useEffect } from 'react';
import { LoggedInUser, Page } from '../App';

interface NavbarProps {
  currentPage: string;
  onNavClick: (page: Page) => void;
  loggedInUser: LoggedInUser | null;
  onLogout: () => void;
}

const Navbar: React.FC<NavbarProps> = ({ currentPage, onNavClick, loggedInUser, onLogout }) => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const navItems = [
    { id: 'home', label: 'Home' },
    { id: 'members', label: 'Members' },
    { id: 'ourworks', label: 'Our Works' },
    { id: 'accounting', label: 'Accounting' },
    { id: 'contact', label: 'Contact Us' }
  ];

  const handleMobileNavClick = (page: Page) => {
    onNavClick(page);
    setIsMenuOpen(false);
  };

  return (
    <nav className={`fixed w-full z-50 transition-all duration-300 ${isScrolled || isMenuOpen ? 'bg-white shadow-md py-3' : 'bg-white/95 backdrop-blur-md py-4'}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex justify-between items-center">
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
        
        {/* Desktop Navigation */}
        <div className="hidden md:flex items-center space-x-1">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => onNavClick(item.id as Page)}
              className={`px-4 py-2 rounded-lg font-bold transition-all duration-300 ${
                currentPage === item.id 
                ? 'text-orange-700 bg-orange-50' 
                : 'text-gray-600 hover:text-orange-600 hover:bg-orange-50'
              }`}
            >
              {item.label}
            </button>
          ))}

          {/* Conditional Admin Access */}
          {loggedInUser?.role === 'admin' && (
            <button
              onClick={() => onNavClick('admin' as Page)}
              className={`px-4 py-2 rounded-lg font-bold transition-all duration-300 ${
                currentPage === 'admin' 
                ? 'text-orange-700 bg-orange-50' 
                : 'text-gray-600 hover:text-orange-600 hover:bg-orange-50'
              }`}
            >
              Admin
            </button>
          )}

          {/* Authentication Entry Point */}
          {loggedInUser ? (
            <button
              onClick={onLogout}
              className="ml-4 px-6 py-2 bg-gray-100 hover:bg-red-50 text-gray-500 hover:text-red-600 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all border border-transparent hover:border-red-100 flex items-center space-x-2"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              <span>Sign Out</span>
            </button>
          ) : (
            <button
              onClick={() => onNavClick('admin' as Page)}
              className={`ml-4 px-6 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-xl font-black text-[10px] uppercase tracking-widest transition-all shadow-lg shadow-orange-200 ${
                currentPage === 'admin' ? 'ring-4 ring-orange-100' : ''
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
        <div className="md:hidden bg-white border-t border-gray-50 animate-fadeIn">
          <div className="px-4 py-6 space-y-2">
            {navItems.map((item) => (
              <button
                key={item.id}
                onClick={() => handleMobileNavClick(item.id as Page)}
                className={`w-full text-left px-6 py-4 rounded-2xl font-bold transition-all ${
                  currentPage === item.id 
                  ? 'text-orange-700 bg-orange-50 shadow-sm' 
                  : 'text-gray-600 hover:text-orange-600 hover:bg-orange-50'
                }`}
              >
                {item.label}
              </button>
            ))}
            
            {loggedInUser?.role === 'admin' && (
              <button
                onClick={() => handleMobileNavClick('admin' as Page)}
                className={`w-full text-left px-6 py-4 rounded-2xl font-bold transition-all ${
                  currentPage === 'admin' 
                  ? 'text-orange-700 bg-orange-50 shadow-sm' 
                  : 'text-gray-600 hover:text-orange-600 hover:bg-orange-50'
                }`}
              >
                Admin Panel
              </button>
            )}

            <div className="pt-4 border-t border-gray-50 mt-4">
              {loggedInUser ? (
                <button
                  onClick={() => { onLogout(); setIsMenuOpen(false); }}
                  className="w-full py-4 bg-gray-100 text-gray-600 rounded-2xl font-black uppercase tracking-widest text-xs flex items-center justify-center space-x-2"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                  <span>Sign Out</span>
                </button>
              ) : (
                <button
                  onClick={() => handleMobileNavClick('admin' as Page)}
                  className="w-full py-5 bg-orange-600 text-white rounded-2xl font-black uppercase tracking-widest text-xs shadow-xl shadow-orange-200"
                >
                  Admin Login
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
