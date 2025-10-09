import AsyncStorage from '@react-native-async-storage/async-storage';
import {STORAGE_KEYS} from './constants';
import type {QuickNote} from '../types';

export const StorageService = {
  // Quick Note
  async getQuickNote(): Promise<QuickNote | null> {
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEYS.QUICK_NOTE);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.error('Error getting quick note:', error);
      return null;
    }
  },

  async saveQuickNote(content: string): Promise<void> {
    try {
      const quickNote: QuickNote = {
        content,
        updatedAt: Date.now(),
      };
      await AsyncStorage.setItem(STORAGE_KEYS.QUICK_NOTE, JSON.stringify(quickNote));
    } catch (error) {
      console.error('Error saving quick note:', error);
    }
  },

  async clearQuickNote(): Promise<void> {
    try {
      await AsyncStorage.removeItem(STORAGE_KEYS.QUICK_NOTE);
    } catch (error) {
      console.error('Error clearing quick note:', error);
    }
  },

  // User data
  async getUserEmail(): Promise<string | null> {
    try {
      return await AsyncStorage.getItem(STORAGE_KEYS.USER_EMAIL);
    } catch (error) {
      console.error('Error getting user email:', error);
      return null;
    }
  },

  async saveUserEmail(email: string): Promise<void> {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.USER_EMAIL, email);
    } catch (error) {
      console.error('Error saving user email:', error);
    }
  },

  async getFingerprint(): Promise<string | null> {
    try {
      return await AsyncStorage.getItem(STORAGE_KEYS.USER_FINGERPRINT);
    } catch (error) {
      console.error('Error getting fingerprint:', error);
      return null;
    }
  },

  async saveFingerprint(fingerprint: string): Promise<void> {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.USER_FINGERPRINT, fingerprint);
    } catch (error) {
      console.error('Error saving fingerprint:', error);
    }
  },

  async clearUserData(): Promise<void> {
    try {
      await AsyncStorage.multiRemove([
        STORAGE_KEYS.USER_EMAIL,
        STORAGE_KEYS.USER_FINGERPRINT,
        STORAGE_KEYS.AUTH_TOKEN,
      ]);
    } catch (error) {
      console.error('Error clearing user data:', error);
    }
  },
};
