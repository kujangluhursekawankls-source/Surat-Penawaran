import React, { createContext, useContext, useEffect, useState, useRef, useCallback } from 'react';
import {
  User,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  signInWithPopup,
  GoogleAuthProvider,
  sendPasswordResetEmail,
  updatePassword,
  onAuthStateChanged,
} from 'firebase/auth';
import { auth } from '../firebase';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  loginWithEmail: (email: string, pass: string) => Promise<void>;
  registerWithEmail: (email: string, pass: string) => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
  resetPasswordEmail: (email: string) => Promise<void>;
  changePassword: (newPass: string) => Promise<void>;
  sessionRemainingSeconds: number;
  resetSessionTimer: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Default inaktivitas timeout: 30 menit (1800 detik)
const SESSION_TIMEOUT_DEFAULT = 30 * 60;

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [sessionRemainingSeconds, setSessionRemainingSeconds] = useState(SESSION_TIMEOUT_DEFAULT);
  const lastActivityRef = useRef<number>(Date.now());

  const resetSessionTimer = useCallback(() => {
    lastActivityRef.current = Date.now();
    setSessionRemainingSeconds(SESSION_TIMEOUT_DEFAULT);
  }, []);

  const logout = useCallback(async () => {
    try {
      await signOut(auth);
      // Bersihkan seluruh cache lokal & temporary state sesuai spesifikasi keamanan
      sessionStorage.clear();
      localStorage.removeItem('active_quotation_draft');
      localStorage.removeItem('cached_user_profile');
      setUser(null);
    } catch (err) {
      console.error('Error during logout:', err);
    }
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
      resetSessionTimer();
    });
    return () => unsubscribe();
  }, [resetSessionTimer]);

  // Session Activity Listeners & Auto-logout
  useEffect(() => {
    if (!user) return;

    const handleUserActivity = () => {
      resetSessionTimer();
    };

    const events = ['mousedown', 'mousemove', 'keydown', 'touchstart', 'scroll'];
    events.forEach((evt) => window.addEventListener(evt, handleUserActivity, { passive: true }));

    const timer = setInterval(() => {
      const elapsed = Math.floor((Date.now() - lastActivityRef.current) / 1000);
      const remaining = Math.max(0, SESSION_TIMEOUT_DEFAULT - elapsed);
      setSessionRemainingSeconds(remaining);

      if (remaining <= 0) {
        console.warn('Session timeout: logging out due to inactivity.');
        logout();
      }
    }, 1000);

    return () => {
      events.forEach((evt) => window.removeEventListener(evt, handleUserActivity));
      clearInterval(timer);
    };
  }, [user, resetSessionTimer, logout]);

  const loginWithEmail = async (email: string, pass: string) => {
    await signInWithEmailAndPassword(auth, email.trim(), pass);
  };

  const registerWithEmail = async (email: string, pass: string) => {
    await createUserWithEmailAndPassword(auth, email.trim(), pass);
  };

  const loginWithGoogle = async () => {
    const provider = new GoogleAuthProvider();
    await signInWithPopup(auth, provider);
  };

  const resetPasswordEmail = async (email: string) => {
    await sendPasswordResetEmail(auth, email.trim());
  };

  const changePassword = async (newPass: string) => {
    if (!auth.currentUser) throw new Error('Pengguna belum login');
    await updatePassword(auth.currentUser, newPass);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        loginWithEmail,
        registerWithEmail,
        loginWithGoogle,
        logout,
        resetPasswordEmail,
        changePassword,
        sessionRemainingSeconds,
        resetSessionTimer,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
