import { create } from 'zustand';
import type { SelfUserDto, AuthResponse, LoginInput, RegisterInput } from '@padel/shared';
import { api, tokenStorage, setUnauthorizedHandler } from '@/lib/api';

type Status = 'idle' | 'hydrating' | 'authenticated' | 'guest';

interface AuthState {
  user: SelfUserDto | null;
  status: Status;
  hydrate: () => Promise<void>;
  login: (input: LoginInput) => Promise<void>;
  register: (input: RegisterInput) => Promise<void>;
  logout: () => Promise<void>;
  setUser: (user: SelfUserDto) => void;
}

export const useAuth = create<AuthState>((set) => ({
  user: null,
  status: 'idle',

  hydrate: async () => {
    const token = tokenStorage.get();
    if (!token) {
      set({ status: 'guest', user: null });
      return;
    }
    set({ status: 'hydrating' });
    try {
      const { data } = await api.get<SelfUserDto>('/api/auth/me');
      set({ user: data, status: 'authenticated' });
    } catch {
      tokenStorage.clear();
      set({ user: null, status: 'guest' });
    }
  },

  login: async (input) => {
    const { data } = await api.post<AuthResponse>('/api/auth/login', input);
    tokenStorage.set(data.token);
    set({ user: data.user, status: 'authenticated' });
  },

  register: async (input) => {
    const { data } = await api.post<AuthResponse>('/api/auth/register', input);
    tokenStorage.set(data.token);
    set({ user: data.user, status: 'authenticated' });
  },

  logout: async () => {
    try {
      await api.post('/api/auth/logout');
    } catch {
      // ignore — JWT is stateless
    }
    tokenStorage.clear();
    set({ user: null, status: 'guest' });
  },

  setUser: (user) => set({ user }),
}));

// Wire 401 responses → silent logout
setUnauthorizedHandler(() => {
  const { status } = useAuth.getState();
  if (status === 'authenticated') {
    tokenStorage.clear();
    useAuth.setState({ user: null, status: 'guest' });
  }
});
