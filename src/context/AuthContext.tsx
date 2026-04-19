import React, { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { doc, onSnapshot } from 'firebase/firestore';
import { auth, db } from '../firebase';

interface AuthContextType {
  user: User | null;
  profile: any | null;
  loading: boolean;
  isAdmin: boolean;
  isTeacher: boolean;
  isSubscribed: boolean;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  profile: null,
  loading: true,
  isAdmin: false,
  isTeacher: false,
  isSubscribed: false,
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  console.log('[AuthProvider] Initializing');
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    console.log('[AuthProvider] Setting up auth listener');
    let unsubscribeAuth: (() => void) | undefined;
    
    try {
      unsubscribeAuth = onAuthStateChanged(auth, (user) => {
        console.log('[AuthProvider] Auth state changed:', user?.uid || 'No user');
        setUser(user);
        if (!user) {
          setProfile(null);
          setLoading(false);
        }
      }, (error) => {
        console.error('[AuthProvider] Auth listener error:', error);
        setLoading(false);
      });
    } catch (error) {
      console.error('[AuthProvider] Failed to setup auth listener:', error);
      setLoading(false);
    }

    return () => {
      if (unsubscribeAuth) unsubscribeAuth();
    };
  }, []);

  useEffect(() => {
    let unsubscribeProfile: (() => void) | undefined;

    if (user?.uid) {
      console.log('[AuthProvider] Setting up profile listener for:', user.uid);
      try {
        unsubscribeProfile = onSnapshot(doc(db, 'users', user.uid), (doc) => {
          console.log('[AuthProvider] Profile data received');
          if (doc.exists()) {
            setProfile(doc.data());
          } else {
            console.warn('[AuthProvider] No profile document found for user');
            setProfile(null);
          }
          setLoading(false);
        }, (error) => {
          console.error("[AuthProvider] Profile listener error:", error);
          setLoading(false);
        });
      } catch (error) {
        console.error('[AuthProvider] Failed to setup profile listener:', error);
        setLoading(false);
      }
    } else if (user === null) {
      setLoading(false);
    }

    return () => {
      if (unsubscribeProfile) unsubscribeProfile();
    };
  }, [user]);

  const value = {
    user,
    profile,
    loading,
    isAdmin: profile?.role === 'admin' || (user?.email === 'anand@one.mn' && user?.emailVerified),
    isTeacher: profile?.role === 'teacher' || profile?.role === 'admin' || (user?.email === 'anand@one.mn' && user?.emailVerified),
    isSubscribed: profile?.subscriptionStatus === 'active',
  };

  console.log('[AuthProvider] Rendering with loading state:', loading);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-brand-icon/20 border-t-brand-icon rounded-full animate-spin" />
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-brand-ink/40">Ачаалж байна...</p>
        </div>
      </div>
    );
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
