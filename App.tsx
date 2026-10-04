import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './src/auth/AuthProvider';
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
import { SetPasswordPage } from './pages/SetPasswordPage';
import { BecomeMemberPage } from './pages/BecomeMemberPage';
import { MembershipStatusPage } from './pages/MembershipStatusPage';
import { MyMembershipPage } from './pages/MyMembershipPage';
import { UserProfilePage } from './pages/UserProfilePage';
import Footer from './components/Footer';
import { SupabaseConnectionTester } from './components/SupabaseConnectionTester';

export type Page = 
  | 'home' 
  | 'members' 
  | 'ourworks' 
  | 'accounting' 
  | 'contact' 
  | 'login' 
  | 'admin' 
  | 'internal' 
  | 'villagemap' 
  | 'dashboard' 
  | 'set-password'
  | 'become-member'
  | 'membership-status'
  | 'my-membership'
  | 'profile';

export interface LoggedInUser {
  email: string;
  role: 'admin' | 'treasurer' | 'Phdy_member' | 'user' | string;
}

const AppContent: React.FC = () => {
  const [currentPage, setCurrentPage] = useState<Page>('home');
  const [isSupabaseTesterOpen, setIsSupabaseTesterOpen] = useState(false);

  const { user, profile, membership, isAdmin, isMember, logout } = useAuth();

  const loggedInUser: LoggedInUser | null = user ? {
    email: user.email || profile?.email || '',
    role: isAdmin ? 'admin' : isMember ? 'phdy_member' : 'user'
  } : null;

  useEffect(() => {
    const handleOpenSupabaseTester = () => setIsSupabaseTesterOpen(true);
    window.addEventListener('open-supabase-tester', handleOpenSupabaseTester);
    return () => window.removeEventListener('open-supabase-tester', handleOpenSupabaseTester);
  }, []);

  useEffect(() => {
    const handlePopState = () => {
      const rawHash = window.location.hash;
      const path = rawHash.replace('#', '').split('?')[0] as Page;

      // 0. Detect confirmation / recovery / reset email tokens
      if (
        rawHash.includes('type=recovery') || 
        rawHash.includes('type=invite') || 
        rawHash.includes('type=signup') || 
        rawHash.includes('set-password') ||
        (rawHash.includes('access_token=') && !rawHash.includes('type=magiclink'))
      ) {
        setCurrentPage('set-password');
        return;
      }

      // Valid pages
      const validPages: Page[] = [
        'home', 
        'members', 
        'ourworks', 
        'accounting', 
        'contact', 
        'login', 
        'admin', 
        'internal', 
        'villagemap', 
        'dashboard', 
        'set-password',
        'become-member',
        'membership-status',
        'my-membership',
        'profile'
      ];

      if (validPages.includes(path)) {
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
    // 1. Admin protection
    if (page === 'admin' && !isAdmin) {
      setCurrentPage('login');
      window.location.hash = 'login';
      window.scrollTo(0, 0);
      return;
    }

    // 2. Member protection
    if (page === 'internal' && !isMember) {
      setCurrentPage('login');
      window.location.hash = 'login';
      window.scrollTo(0, 0);
      return;
    }

    // 3. Authenticated user protection
    if (['dashboard', 'profile', 'become-member', 'membership-status', 'my-membership'].includes(page) && !user) {
      setCurrentPage('login');
      window.location.hash = 'login';
      window.scrollTo(0, 0);
      return;
    }

    setCurrentPage(page);
    window.location.hash = page;
    window.scrollTo(0, 0);
  };

  const onLoginSuccess = (usr: LoggedInUser) => {
    sessionStorage.setItem('phdy_admin_session', JSON.stringify(usr));
    navigateTo('home');
  };

  const onLogout = async () => {
    await logout();
    navigateTo('home');
  };

  const renderPage = () => {
    switch (currentPage) {
      case 'home':
        return <Home onNavigate={navigateTo} loggedInUser={loggedInUser} />;
      
      case 'set-password':
        return <SetPasswordPage onLoginSuccess={onLoginSuccess} onNavigate={navigateTo} />;
      
      case 'dashboard':
        if (!user) {
          return <LoginPage loggedInUser={loggedInUser} onLoginSuccess={onLoginSuccess} onNavigate={navigateTo} />;
        }
        return <DashboardPage loggedInUser={loggedInUser} onNavigate={navigateTo} />;
      
      case 'profile':
        if (!user) {
          return <LoginPage loggedInUser={loggedInUser} onLoginSuccess={onLoginSuccess} onNavigate={navigateTo} />;
        }
        return <UserProfilePage onNavigate={navigateTo} onLogout={onLogout} />;
      
      case 'become-member':
        if (!user) {
          return <LoginPage loggedInUser={loggedInUser} onLoginSuccess={onLoginSuccess} onNavigate={navigateTo} />;
        }
        return <BecomeMemberPage onNavigate={navigateTo} />;
      
      case 'membership-status':
        if (!user) {
          return <LoginPage loggedInUser={loggedInUser} onLoginSuccess={onLoginSuccess} onNavigate={navigateTo} />;
        }
        return <MembershipStatusPage onNavigate={navigateTo} />;
      
      case 'my-membership':
        if (!user) {
          return <LoginPage loggedInUser={loggedInUser} onLoginSuccess={onLoginSuccess} onNavigate={navigateTo} />;
        }
        return <MyMembershipPage onNavigate={navigateTo} />;
      
      case 'members':
        return <MembersPage />;
      
      case 'ourworks':
        return <OurWorksPage />;
      
      case 'accounting':
        return <AccountingPage />;
      
      case 'login':
        return <LoginPage loggedInUser={loggedInUser} onLoginSuccess={onLoginSuccess} onNavigate={navigateTo} />;
      
      case 'internal':
        if (!isMember) {
          return <LoginPage loggedInUser={loggedInUser} onLoginSuccess={onLoginSuccess} onNavigate={navigateTo} />;
        }
        return <PHDYInternalPage onNavigate={navigateTo} loggedInUser={loggedInUser} onLoginSuccess={onLoginSuccess} onLogout={onLogout} />;
      
      case 'contact':
        return <ContactPage />;
      
      case 'villagemap':
        return <VillageMapPage />;
      
      case 'admin':
        if (!isAdmin) {
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

const App: React.FC = () => {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
};

export default App;
