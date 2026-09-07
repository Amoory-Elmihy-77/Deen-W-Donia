import { create } from 'zustand';
import * as SecureStore from '../utils/storage';
import api from '../services/api';

interface User {
  id: string;
  name: string;
  email: string;
}

interface AuthState {
  user: User | null;
  isLoggedIn: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  restoreSession: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isLoggedIn: false,
  isLoading: true,

  login: async (email, password) => {
    const { data } = await api.post('/auth/login', { email, password });
    const { user, accessToken, refreshToken } = data.data;
    await SecureStore.setItemAsync('accessToken', accessToken);
    await SecureStore.setItemAsync('refreshToken', refreshToken);
    set({ user, isLoggedIn: true });
  },

  register: async (name, email, password) => {
    const { data } = await api.post('/auth/register', { name, email, password });
    const { user, accessToken, refreshToken } = data.data;
    await SecureStore.setItemAsync('accessToken', accessToken);
    await SecureStore.setItemAsync('refreshToken', refreshToken);
    set({ user, isLoggedIn: true });
  },

  logout: async () => {
    await api.post('/auth/logout');
    await SecureStore.deleteItemAsync('accessToken');
    await SecureStore.deleteItemAsync('refreshToken');
    set({ user: null, isLoggedIn: false });
  },

  restoreSession: async () => {
    try {
      const token = await SecureStore.getItemAsync('accessToken');
      if (!token) { set({ isLoading: false }); return; }

      const { data } = await api.get('/me');
      set({ user: data.data, isLoggedIn: true, isLoading: false });
    } catch {
      await SecureStore.deleteItemAsync('accessToken');
      await SecureStore.deleteItemAsync('refreshToken');
      set({ user: null, isLoggedIn: false, isLoading: false });
    }
  },
}));
