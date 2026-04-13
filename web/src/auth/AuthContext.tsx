import { createContextId, type Signal } from '@builder.io/qwik';

export interface AuthState {
  isAuthenticated: boolean;
  username: string | null;
  loading: boolean;
}

export const AuthContext = createContextId<Signal<AuthState>>('auth-context');
