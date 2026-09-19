
import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import Home from './pages/Home';
import MembersPage from './pages/MembersPage';
import ContactPage from './pages/ContactPage';
import OurWorksPage from './pages/OurWorksPage';
import AccountingPage from './pages/AccountingPage';
import AdminPage from './pages/AdminPage';
import PHDYInternalPage from './pages/PHDYInternalPage';
import Footer from './components/Footer';

export type Page = 'home' | 'members' | 'ourworks' | 'accounting' | 'contact' | 'admin' | 'internal';

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
  const [loggedInUser, setLoggedInUser] = useState<LoggedInUser | null>(() => {
    const saved = sessionStorage.getItem('phdy_admin_session');
    return saved ? JSON.parse(saved) : null;
  });

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

      // Gate Admin: admin or treasurer only (treasurers manage funds, admins manage all)
      if (path === 'admin' && user && !hasAdminPortalAccess(user)) {
        if (hasInternalAccess(user)) {
          setCurrentPage('internal');
          window.location.hash = 'internal';
        } else {
          setCurrentPage('home');
          window.location.hash = 'home';
        }
        return;
      }

      if (['home', 'members', 'ourworks', 'accounting', 'contact', 'admin', 'internal'].includes(path)) {
        setCurrentPage(path);
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
        setCurrentPage('home');
        window.location.hash = 'home';
        window.scrollTo(0, 0);
        return;
      }
    }

    // Gate Admin: admin or treasurer only
    if (page === 'admin' && loggedInUser && !hasAdminPortalAccess(loggedInUser)) {
      if (hasInternalAccess(loggedInUser)) {
        setCurrentPage('internal');
        window.location.hash = 'internal';
      } else {
        setCurrentPage('home');
        window.location.hash = 'home';
      }
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
      case 'internal':
        // Protected: Only phdy_member, treasurer, or admin
        if (!hasInternalAccess(loggedInUser)) {
          return <Home onNavigate={navigateTo} />;
        }
        return <PHDYInternalPage onNavigate={navigateTo} loggedInUser={loggedInUser} onLoginSuccess={onLoginSuccess} onLogout={onLogout} />;
      case 'contact':
        return <ContactPage />;
      case 'admin':
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

      <Footer onNavClick={navigateTo} loggedInUser={loggedInUser} />
    </div>
  );
};

export default App;
