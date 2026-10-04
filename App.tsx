
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
import { DashboardPage } from './pages/DashboardPage';
import Footer from './components/Footer';
import { SupabaseConnectionTester } from './components/SupabaseConnectionTester';

export type Page = 'home' | 'members' | 'ourworks' | 'accounting' | 'contact' | 'login' | 'admin' | 'internal' | 'villagemap' | 'dashboard';

export interface LoggedInUser {
  email: string;
  role: 'admin' | 'treasurer' | 'Phdy_member' | 'user' | string;
}

const isMemberOrAbove = (user: LoggedInUser | null) => {
  if (!user) return false;
  const r = String(user.role).toLowerCase();
  return r === 'phdy_member' || r === 'member' || r === 'admin' || r === 'super_admin' || r === 'treasurer' || r === 'tressurer' || r === 'moderator';
};

const isAdminOnly = (user: LoggedInUser | null) => {
  if (!user) return false;
  const r = String(user.role).toLowerCase();
  return r === 'admin' || r === 'super_admin';
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

      // 1. Tier 3 Protected: Admin only
      if (path === 'admin') {
        if (!isAdminOnly(user)) {
          setCurrentPage('login');
          window.location.hash = 'login';
          return;
        }
      }

      // 2. Tier 2 Protected: Member and Admin only (Members, PHDY Internal)
      if (path === 'internal' || path === 'members') {
        if (!isMemberOrAbove(user)) {
          setCurrentPage('login');
          window.location.hash = 'login';
          return;
        }
      }

      // 3. Tier 1 Protected: Registered User, Member, Admin (Accounting, Our Works, Tier Dashboard)
      if (path === 'accounting' || path === 'ourworks' || path === 'dashboard') {
        if (!user) {
          setCurrentPage('login');
          window.location.hash = 'login';
          return;
        }
      }

      // 4. Public Tiers: Home, Village Map, Contact Us, Login
      if (['home', 'members', 'ourworks', 'accounting', 'contact', 'login', 'admin', 'internal', 'villagemap', 'dashboard'].includes(path)) {
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
    // 1. Tier 3 Protected: Admin only
    if (page === 'admin' && !isAdminOnly(loggedInUser)) {
      setCurrentPage('login');
      window.location.hash = 'login';
      window.scrollTo(0, 0);
      return;
    }

    // 2. Tier 2 Protected: Member & Admin only
    if ((page === 'internal' || page === 'members') && !isMemberOrAbove(loggedInUser)) {
      setCurrentPage('login');
      window.location.hash = 'login';
      window.scrollTo(0, 0);
      return;
    }

    // 3. Tier 1 Protected: Registered User, Member, Admin
    if ((page === 'accounting' || page === 'ourworks' || page === 'dashboard') && !loggedInUser) {
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
        return <Home onNavigate={navigateTo} loggedInUser={loggedInUser} />;
      case 'dashboard':
        if (!loggedInUser) {
          return <LoginPage loggedInUser={loggedInUser} onLoginSuccess={onLoginSuccess} onNavigate={navigateTo} />;
        }
        return <DashboardPage loggedInUser={loggedInUser} onNavigate={navigateTo} />;
      case 'members':
        // Tier 2 & Tier 3 only
        if (!isMemberOrAbove(loggedInUser)) {
          return <LoginPage loggedInUser={loggedInUser} onLoginSuccess={onLoginSuccess} onNavigate={navigateTo} />;
        }
        return <MembersPage />;
      case 'ourworks':
        // Tier 3 Admin only
        if (!isAdminOnly(loggedInUser)) {
          return <LoginPage loggedInUser={loggedInUser} onLoginSuccess={onLoginSuccess} onNavigate={navigateTo} />;
        }
        return <OurWorksPage />;
      case 'accounting':
        // Tier 1, Tier 2, Tier 3 (Registered users & above)
        if (!loggedInUser) {
          return <LoginPage loggedInUser={loggedInUser} onLoginSuccess={onLoginSuccess} onNavigate={navigateTo} />;
        }
        return <AccountingPage />;
      case 'login':
        return <LoginPage loggedInUser={loggedInUser} onLoginSuccess={onLoginSuccess} onNavigate={navigateTo} />;
      case 'internal':
        // Tier 2 & Tier 3 only (Protected: Only phdy_member, treasurer, or admin)
        if (!isMemberOrAbove(loggedInUser)) {
          return <LoginPage loggedInUser={loggedInUser} onLoginSuccess={onLoginSuccess} onNavigate={navigateTo} />;
        }
        return <PHDYInternalPage onNavigate={navigateTo} loggedInUser={loggedInUser} onLoginSuccess={onLoginSuccess} onLogout={onLogout} />;
      case 'contact':
        return <ContactPage />;
      case 'villagemap':
        return <VillageMapPage />;
      case 'admin':
        // Tier 3 Admin only
        if (!isAdminOnly(loggedInUser)) {
          return <LoginPage loggedInUser={loggedInUser} onLoginSuccess={onLoginSuccess} onNavigate={navigateTo} />;
        }
        return <AdminPage loggedInUser={loggedInUser} onLoginSuccess={onLoginSuccess} onLogout={onLogout} onNavigate={navigateTo} />;
      default:
        return <Home onNavigate={navigateTo} loggedInUser={loggedInUser} />;
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
