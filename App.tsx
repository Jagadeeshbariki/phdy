
import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import Home from './pages/Home';
import MembersPage from './pages/MembersPage';
import ContactPage from './pages/ContactPage';
import OurWorksPage from './pages/OurWorksPage';
import AccountingPage from './pages/AccountingPage';
import AdminPage from './pages/AdminPage';
import Footer from './components/Footer';

export type Page = 'home' | 'members' | 'ourworks' | 'accounting' | 'contact' | 'admin';

export interface LoggedInUser {
  username: string;
  role: 'admin' | 'phdy_member';
}

const App: React.FC = () => {
  const [currentPage, setCurrentPage] = useState<Page>('home');
  const [loggedInUser, setLoggedInUser] = useState<LoggedInUser | null>(() => {
    const saved = sessionStorage.getItem('phdy_admin_session');
    return saved ? JSON.parse(saved) : null;
  });

  useEffect(() => {
    const handlePopState = () => {
      const path = window.location.hash.replace('#', '') as Page;
      if (['home', 'members', 'ourworks', 'accounting', 'contact', 'admin'].includes(path)) {
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
      case 'contact':
        return <ContactPage />;
      case 'admin':
        return <AdminPage loggedInUser={loggedInUser} onLoginSuccess={onLoginSuccess} onLogout={onLogout} />;
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

      <Footer onNavClick={navigateTo} />
    </div>
  );
};

export default App;
