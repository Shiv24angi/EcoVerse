'use client';

import {
  createContext,
  useContext,
  useState,
  useEffect,
  type ReactNode,
} from 'react';
import {
  signInWithPopup,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
} from 'firebase/auth';
import { FirebaseError } from 'firebase/app';
import { auth, googleProvider } from '@/lib/firebase';
import { toast } from '@/components/ui/use-toast';
import type { AvatarId } from './ui/avatar';

interface User {
  _id: string;
  email: string;
  name: string;
  avatarId?: AvatarId;
  avatarCustomization?: Record<string, unknown>;
  monthlyCarbon: number;
  totalScanned: number;
  joinedAt: string;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  signup: (name: string, email: string, password: string) => Promise<boolean>;
  signInWithGoogle: () => Promise<boolean>;
  logout: () => Promise<void>;
  updateUserStats: (carbonAdded: number) => void;
  updateAvatar: (avatarId: AvatarId) => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchSession = async () => {
    try {
      const res = await fetch('/api/auth/session');
      if (res.ok) {
        const data = await res.json();
        setUser(data.user);
      } else {
        setUser(null);
      }
    } catch (err) {
      // Keep existing state on network error
      console.error('Session fetch failed:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSession();

    const handleStorageEvent = (e: StorageEvent) => {
      if (e.key === 'logout-event') {
        setUser(null);
      }
    };

    window.addEventListener('storage', handleStorageEvent);
    return () => window.removeEventListener('storage', handleStorageEvent);
  }, []);

  const signup = async (
    name: string,
    email: string,
    password: string
  ): Promise<boolean> => {
    try {
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        email,
        password
      );

      const response = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          email,
          password,
          firebaseUid: userCredential.user.uid,
        }),
      });

      let data;
      try {
        data = await response.json();
      } catch (jsonErr) {
        console.warn('⚠️ Failed to parse JSON response:', jsonErr);
        data = { error: 'Invalid response from server' };
      }

      if (!response.ok) {
        console.error('❌ Signup failed:', data.error);
        // Rollback Firebase user
        await userCredential.user.delete();
        return false;
      }

      setUser(data.user);
      return true;
    } catch (err) {
      if (
        err instanceof FirebaseError &&
        err.code === 'auth/email-already-in-use'
      ) {
        console.error('⚠️ Email already in use');
        toast({
          title: 'Email already registered',
          description: 'Try signing in instead, or use a different email.',
          variant: 'destructive',
        });
        return false;
      }

      console.error('🔥 Signup error:', err);
      toast({
        title: 'Signup failed',
        description: 'Something went wrong. Please try again.',
        variant: 'destructive',
      });
      return false;
    }
  };

  const login = async (email: string, password: string): Promise<boolean> => {
    try {
      // First authenticate with Firebase
      await signInWithEmailAndPassword(auth, email, password);

      // Send verified token to backend
      const res = await fetch('/api/auth/signin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          password,
        }),
      });

      const data = await res.json();

      if (res.ok) {
        setUser(data.user);
        return true;
      } else {
        console.warn('❌ Login failed:', data.error);
        await signOut(auth);
        return false;
      }
    } catch (err) {
      console.error('🔥 Login error:', err);
      return false;
    }
  };

  const signInWithGoogle = async (): Promise<boolean> => {
    try {
      if (!auth || !googleProvider) {
        console.error('❌ Firebase not available');
        return false;
      }

      const result = await signInWithPopup(auth, googleProvider);
      const firebaseUser = result.user;

      const response = await fetch('/api/auth/google', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name:
            firebaseUser.displayName ||
            firebaseUser.email?.split('@')[0] ||
            'Google User',
          email: firebaseUser.email,
          firebaseUid: firebaseUser.uid,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setUser(data.user);
        return true;
      } else {
        console.error('❌ Failed to authenticate Google user');
        await signOut(auth);
        return false;
      }
    } catch (error) {
      console.error('🔥 Google sign-in error:', error);
      return false;
    }
  };

  const logout = async () => {
    try {
      await signOut(auth);
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch (err) {
      console.error('Logout error:', err);
    } finally {
      setUser(null);
      localStorage.setItem('logout-event', Date.now().toString());
    }
  };

  const updateUserStats = (carbonAdded: number) => {
    // Only optimistically update local state. The backend `/api/scan` already handles real persistence.
    if (user) {
      setUser({
        ...user,
        monthlyCarbon: user.monthlyCarbon + carbonAdded,
        totalScanned: user.totalScanned + 1,
      });
    }
  };

  const updateAvatar = async (avatarId: AvatarId) => {
    if (user) {
      const previousUser = { ...user };

      setUser({
        ...user,
        avatarId,
      });

      try {
        const res = await fetch('/api/user/avatar', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: user.email, avatarId }),
        });

        if (!res.ok) throw new Error('Failed to update on server');
      } catch (err) {
        console.error('Failed to update avatar on server:', err);
        // Rollback optimistic UI
        setUser(previousUser);
      }
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        login,
        signup,
        signInWithGoogle,
        logout,
        updateUserStats,
        updateAvatar,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
