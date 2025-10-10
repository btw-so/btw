import React, {createContext, useContext, useState, useEffect} from 'react';
import {ApiService} from '../services/api';
import {StorageService} from '../utils/storage';
import {generateDeviceFingerprint} from '../utils/deviceFingerprint';
import type {User} from '../types';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (email: string, otp: string) => Promise<{success: boolean; error?: string}>;
  logout: () => Promise<void>;
  generateOTP: (email: string) => Promise<{success: boolean; error?: string}>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{children: React.ReactNode}> = ({children}) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    initializeAuth();
  }, []);

  const initializeAuth = async () => {
    try {
      const email = await StorageService.getUserEmail();
      let fingerprint = await StorageService.getFingerprint();

      if (!fingerprint) {
        fingerprint = await generateDeviceFingerprint();
        await StorageService.saveFingerprint(fingerprint);
      }

      ApiService.setFingerprint(fingerprint);

      if (email && fingerprint) {
        setUser({
          email,
          fingerprint,
          isLoggedIn: true,
        });
      }
    } catch (error) {
      console.error('Error initializing auth:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const generateOTP = async (email: string): Promise<{success: boolean; error?: string}> => {
    const result = await ApiService.generateOTP(email);
    return result;
  };

  const login = async (email: string, otp: string): Promise<{success: boolean; error?: string}> => {
    const result = await ApiService.validateOTP(email, otp);

    if (result.success) {
      await StorageService.saveUserEmail(email);
      const fingerprint = await StorageService.getFingerprint();

      setUser({
        email,
        fingerprint: fingerprint!,
        isLoggedIn: true,
      });
    }

    return result;
  };

  const logout = async () => {
    await StorageService.clearUserData();
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{user, isLoading, login, logout, generateOTP}}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
