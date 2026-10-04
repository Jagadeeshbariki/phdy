import React from 'react';
import { MultiTierDashboard } from '../components/MultiTierDashboard';
import { LoggedInUser, Page } from '../App';

interface DashboardPageProps {
  loggedInUser: LoggedInUser | null;
  onNavigate: (page: Page) => void;
}

export const DashboardPage: React.FC<DashboardPageProps> = ({ loggedInUser, onNavigate }) => {
  return (
    <MultiTierDashboard 
      loggedInUser={loggedInUser} 
      onNavigate={onNavigate} 
      isStandalonePage={true} 
    />
  );
};
