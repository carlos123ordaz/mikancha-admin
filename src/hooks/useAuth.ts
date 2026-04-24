import { useState, useEffect } from 'react';
import type { IUser } from '../types';
import api from '../lib/api';

interface AuthState {
  user: IUser | null;
  loading: boolean;
}

export function useAuth(): AuthState {
  const [state, setState] = useState<AuthState>({ user: null, loading: true });

  useEffect(() => {
    const token = localStorage.getItem('auth_token');
    if (!token) {
      setState({ user: null, loading: false });
      return;
    }

    api
      .get<{ success: boolean; data: IUser }>('/api/auth/me')
      .then(({ data }) => setState({ user: data.data, loading: false }))
      .catch(() => {
        localStorage.removeItem('auth_token');
        setState({ user: null, loading: false });
      });
  }, []);

  return state;
}
