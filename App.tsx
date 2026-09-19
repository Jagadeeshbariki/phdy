
import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import Home from './pages/Home';
import MembersPage from './pages/MembersPage';
import ContactPage from './pages/ContactPage';
import OurWorksPage from './pages/OurWorksPage';
import AccountingPage from './pages/AccountingPage';
import AdminPage from './pages/AdminPage';
import LoginPage from './pages/LoginPage';
import PHDYInternalPage from './pages/PHDYInternalPage';
import Footer from './components/Footer';
import { useFirebase } from './src/context/FirebaseContext';
import { logout } from './src/lib/firebase';

export type Page = 'home' | 'members' | 'ourworks' | 'accounting' | 'contact' | 'admin' | 'internal' | 'login';

export interface LoggedInUser {
  email: string;
  role: 'admin' | 'treasurer' | 'phdy_member' | 'user' | string;
  name?: string;
}

const hasInternalAccess = (role: string | null) => {
  if (!role) return false;
  const r = String(role).toLowerCase();
  return r === 'phdy_member' || r === 'admin' || r === 'treasurer' || r === 'tressurer';
};

const hasAdminPortalAccess = (role: string | null) => {
  if (!role) return false;
  const r = String(role).toLowerCase();
  return r === 'admin' || r === 'treasurer' || r === 'tressurer';
};

const App: React.FC = () => {
  const { user, role, loading } = useFirebase();
  const [currentPage, setCurrentPage] = useState<Page>('home');

  const loggedInUser: LoggedInUser | null = user ? {
    email: user.email || '',
    role: role || 'user',
    name: user.displayName || user.email?.split('@')[0] || ''
  } : null;

  useEffect(() => {
    const handlePopState = () => {
      const path = window.location.hash.replace('#', '') as Page;

      // Gate PHDY Internal: phdy_member, treasurer, or admin only
      if (path === 'internal') {
        if (!hasInternalAccess(role)) {
          setCurrentPage('home');
          window.location.hash = 'home';
          return;
        }
      }

      // Gate Admin: admin or treasurer only
      if (path === 'admin' && !hasAdminPortalAccess(role)) {
        setCurrentPage('home');
        window.location.hash = 'home';
        return;
      }

      if (['home', 'members', 'ourworks', 'accounting', 'contact', 'admin', 'internal', 'login'].includes(path)) {
        setCurrentPage(path);
      } else {
        setCurrentPage('home');
      }
    };

    window.addEventListener('popstate', handlePopState);
    handlePopState();

    return () => window.removeEventListener('popstate', handlePopState);
  }, [role]);

  const navigateTo = (page: Page) => {
    if (page === 'internal' && !hasInternalAccess(role)) {
      setCurrentPage('home');
      window.location.hash = 'home';
    } else if (page === 'admin' && !hasAdminPortalAccess(role)) {
      setCurrentPage('home');
      window.location.hash = 'home';
    } else {
      setCurrentPage(page);
      window.location.hash = page;
    }
    window.scrollTo(0, 0);
  };

  const onLogout = async () => {
    await logout();
    navigateTo('home');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600"></div>
      </div>
    );
  }

  const renderPage = () => {
    switch (currentPage) {
      case 'home':
        return <Home onNavigate={navigateTo} />;
      case 'members':
        return <MembersPage />;
      case 'ourworks':
        return <OurWorksPage />;
      case 'accounting':
        return <AccountingPage />;
      case 'internal':
        if (!hasInternalAccess(role)) return <Home onNavigate={navigateTo} />;
        return <PHDYInternalPage onNavigate={navigateTo} onLogout={onLogout} />;
      case 'contact':
        return <ContactPage />;
      case 'login':
        return <LoginPage onNavigate={navigateTo} />;
      case 'admin':
        if (!hasAdminPortalAccess(role)) return <Home onNavigate={navigateTo} />;
        return <AdminPage onLogout={onLogout} onNavigate={navigateTo} />;
      default:
        return <Home onNavigate={navigateTo} />;
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Navbar 
        currentPage={currentPage} 
        onNavClick={navigateTo} 
        loggedInUser={loggedInUser} 
        onLogout={onLogout} 
      />
      
      <main className="flex-grow pt-20">
        {renderPage()}
      </main>

      <Footer onNavClick={navigateTo} loggedInUser={loggedInUser} />
    </div>
  );
};

export default App;
