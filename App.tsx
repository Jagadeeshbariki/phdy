
import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import Home from './pages/Home';
import MembersPage from './pages/MembersPage';
import ContactPage from './pages/ContactPage';
import OurWorksPage from './pages/OurWorksPage';
import AccountingPage from './pages/AccountingPage';
import AdminPage from './pages/AdminPage';
import { LoginPage } from './pages/LoginPage';
import PHDYInternalPage from './pages/PHDYInternalPage';
import VillageMapPage from './pages/VillageMapPage';
import Footer from './components/Footer';
import { SupabaseConnectionTester } from './components/SupabaseConnectionTester';

export type Page = 'home' | 'members' | 'ourworks' | 'accounting' | 'contact' | 'login' | 'admin' | 'internal' | 'villagemap';

export interface LoggedInUser {
  email: string;
  role: 'admin' | 'treasurer' | 'Phdy_member' | 'user' | string;
}

const hasInternalAccess = (user: LoggedInUser | null) => {
  if (!user) return false;
  const r = String(user.role).toLowerCase();
  return r === 'phdy_member' || r === 'admin' || r === 'treasurer' || r === 'tressurer';
};

const hasAdminPortalAccess = (user: LoggedInUser | null) => {
  if (!user) return false;
  const r = String(user.role).toLowerCase();
  return r === 'admin' || r === 'treasurer' || r === 'tressurer';
};

const App: React.FC = () => {
  const [currentPage, setCurrentPage] = useState<Page>('home');
  const [isSupabaseTesterOpen, setIsSupabaseTesterOpen] = useState(false);
  const [loggedInUser, setLoggedInUser] = useState<LoggedInUser | null>(() => {
    const saved = sessionStorage.getItem('phdy_admin_session');
    return saved ? JSON.parse(saved) : null;
  });

  useEffect(() => {
    const handleOpenSupabaseTester = () => setIsSupabaseTesterOpen(true);
    window.addEventListener('open-supabase-tester', handleOpenSupabaseTester);
    return () => window.removeEventListener('open-supabase-tester', handleOpenSupabaseTester);
  }, []);

  useEffect(() => {
    const handlePopState = () => {
      const path = window.location.hash.replace('#', '') as Page;
      const session = sessionStorage.getItem('phdy_admin_session');
      const user: LoggedInUser | null = session ? JSON.parse(session) : null;

      // Gate PHDY Internal: phdy_member, treasurer, or admin only
      if (path === 'internal') {
        if (!hasInternalAccess(user)) {
          setCurrentPage('home');
          window.location.hash = 'home';
          return;
        }
      }

      // Gate Admin: admin only
      if (path === 'admin') {
        if (!user || user.role !== 'admin') {
          setCurrentPage('login');
          window.location.hash = 'login';
          return;
        }
      }

      if (['home', 'members', 'ourworks', 'accounting', 'contact', 'login', 'admin', 'internal', 'villagemap'].includes(path)) {
        setCurrentPage(path as Page);
      } else {
        setCurrentPage('home');
      }
    };

    window.addEventListener('popstate', handlePopState);
    handlePopState();

    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const navigateTo = (page: Page) => {
    // Gate PHDY Internal
    if (page === 'internal') {
      if (!hasInternalAccess(loggedInUser)) {
        setCurrentPage('login');
        window.location.hash = 'login';
        window.scrollTo(0, 0);
        return;
      }
    }

    // Gate Admin: admin only
    if (page === 'admin' && (!loggedInUser || loggedInUser.role !== 'admin')) {
      setCurrentPage('login');
      window.location.hash = 'login';
      window.scrollTo(0, 0);
      return;
    }

    setCurrentPage(page);
    window.location.hash = page;
    window.scrollTo(0, 0);
  };

  const onLoginSuccess = (user: LoggedInUser) => {
    setLoggedInUser(user);
    sessionStorage.setItem('phdy_admin_session', JSON.stringify(user));
  };

  const onLogout = () => {
    setLoggedInUser(null);
    sessionStorage.removeItem('phdy_admin_session');
    navigateTo('home');
  };

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
      case 'login':
        return <LoginPage loggedInUser={loggedInUser} onLoginSuccess={onLoginSuccess} onNavigate={navigateTo} />;
      case 'internal':
        // Protected: Only phdy_member, treasurer, or admin
        if (!hasInternalAccess(loggedInUser)) {
          return <LoginPage loggedInUser={loggedInUser} onLoginSuccess={onLoginSuccess} onNavigate={navigateTo} />;
        }
        return <PHDYInternalPage onNavigate={navigateTo} loggedInUser={loggedInUser} onLoginSuccess={onLoginSuccess} onLogout={onLogout} />;
      case 'contact':
        return <ContactPage />;
      case 'villagemap':
        return <VillageMapPage />;
      case 'admin':
        if (!loggedInUser || loggedInUser.role !== 'admin') {
          return <LoginPage loggedInUser={loggedInUser} onLoginSuccess={onLoginSuccess} onNavigate={navigateTo} />;
        }
        return <AdminPage loggedInUser={loggedInUser} onLoginSuccess={onLoginSuccess} onLogout={onLogout} onNavigate={navigateTo} />;
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

      <Footer 
        onNavClick={navigateTo} 
        loggedInUser={loggedInUser} 
        onOpenSupabaseTester={() => setIsSupabaseTesterOpen(true)}
      />

      <SupabaseConnectionTester 
        isOpen={isSupabaseTesterOpen} 
        onClose={() => setIsSupabaseTesterOpen(false)} 
      />
    </div>
  );
};

export default App;
