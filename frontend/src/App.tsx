import React, { useEffect, useState } from 'react';
import { SplashScreen } from './components/SplashScreen';
import { OTPAuthForm } from './components/OTPAuthForm';
import { MobileAdminDashboard } from './components/MobileAdminDashboard';
import { MobileCardholderDashboard } from './components/MobileCardholderDashboard';

type AppState = 'splash' | 'auth' | 'dashboard';
type UserType = 'admin' | 'cardholder' | null;

export default function App() {
  const [appState, setAppState] = useState<AppState>('auth'); // default; will auto-restore if token exists
  const [userType, setUserType] = useState<UserType>(null);
  const [userData, setUserData] = useState(null);

  // Restore session on mount if token + user data exist
  useEffect(() => {
    const token = localStorage.getItem('auth_token');
    const role = localStorage.getItem('user_role') as UserType | null;
    const raw = localStorage.getItem('user_data');
    if (token && role && raw) {
      try {
        const parsed = JSON.parse(raw);
        setUserType(role);
        setUserData(parsed);
        setAppState('dashboard');
      } catch {
        // Corrupt storage → clear and show auth
        localStorage.removeItem('auth_token');
        localStorage.removeItem('user_role');
        localStorage.removeItem('user_data');
        setAppState('auth');
      }
    }
  }, []);

  const handleSplashComplete = () => {
    setAppState('auth');
  };

  const handleLogin = (type: 'admin' | 'cardholder', data: any) => {
    setUserType(type);
    setUserData(data);
    setAppState('dashboard');
  };

  const handleLogout = () => {
    // Clear persisted auth
    localStorage.removeItem('auth_token');
    localStorage.removeItem('user_role');
    localStorage.removeItem('user_data');
    setUserType(null);
    setUserData(null);
    setAppState('auth');
  };

  if (appState === 'splash') {
    return <SplashScreen onComplete={handleSplashComplete} />;
  }

  if (appState === 'auth') {
    return <OTPAuthForm onLogin={handleLogin} />;
  }

  if (appState === 'dashboard') {
    if (userType === 'admin') {
      return <MobileAdminDashboard userData={userData} onLogout={handleLogout} />;
    }

    if (userType === 'cardholder') {
      return <MobileCardholderDashboard userData={userData} onLogout={handleLogout} />;
    }
  }

  return <div className="min-h-screen flex items-center justify-center bg-red-500 text-white text-2xl">Fallback: No state matched</div>;
}