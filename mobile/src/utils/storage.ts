import { Platform } from 'react-native';

let SecureStore: any;
if (Platform.OS !== 'web') {
  SecureStore = require('expo-secure-store');
}

export async function setItemAsync(key: string, value: string): Promise<void> {
  if (Platform.OS === 'web') {
    try {
      localStorage.setItem(key, value);
    } catch (e) {
      console.warn('localStorage not available on web', e);
    }
  } else if (SecureStore) {
    await SecureStore.setItemAsync(key, value);
  }
}

export async function getItemAsync(key: string): Promise<string | null> {
  if (Platform.OS === 'web') {
    try {
      return localStorage.getItem(key);
    } catch (e) {
      console.warn('localStorage not available on web', e);
      return null;
    }
  } else if (SecureStore) {
    return await SecureStore.getItemAsync(key);
  }
  return null;
}

export async function deleteItemAsync(key: string): Promise<void> {
  if (Platform.OS === 'web') {
    try {
      localStorage.removeItem(key);
    } catch (e) {
      console.warn('localStorage not available on web', e);
    }
  } else if (SecureStore) {
    await SecureStore.deleteItemAsync(key);
  }
}
