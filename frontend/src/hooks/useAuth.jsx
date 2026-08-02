import { createContext, useContext, useEffect, useRef, useState } from 'react';
import posthog from '../lib/posthog';
import { supabase } from '../lib/supabase';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const identifiedUserId = useRef(null);

  useEffect(() => {
    const identifySession = (currentSession) => {
      const user = currentSession?.user;
      if (!user?.id || identifiedUserId.current === user.id) return;

      if (identifiedUserId.current) posthog.reset();

      const personProperties = {
        ...(user.email && { email: user.email }),
        ...(user.user_metadata?.name && { name: user.user_metadata.name }),
        ...(user.user_metadata?.role && { role: user.user_metadata.role }),
      };

      posthog.identify(user.id, personProperties);
      identifiedUserId.current = user.id;
    };

    const resetIdentity = () => {
      if (!identifiedUserId.current) return;
      posthog.reset();
      identifiedUserId.current = null;
    };

    // Get initial session — handle network errors gracefully
    supabase.auth.getSession()
      .then(({ data: { session } }) => {
        identifySession(session);
        setSession(session);
      })
      .catch((err) => {
        console.error('Failed to restore session:', err.message);
        setSession(null);
      })
      .finally(() => {
        setLoading(false);
      });

    // Listen for auth state changes (login, logout, token refresh)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, currentSession) => {
      if (event === 'SIGNED_OUT') {
        resetIdentity();
      } else {
        identifySession(currentSession);
      }

      setSession(currentSession);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    setSession(null);
  };

  const value = {
    session,
    user: session?.user ?? null,
    loading,
    signOut,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
};
