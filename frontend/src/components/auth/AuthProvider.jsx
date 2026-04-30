import { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [dbUser, setDbUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    const fetchUser = async (sessionUser) => {
      try {
        console.log('AuthProvider: Fetching user data for session:', sessionUser?.id);
        if (!sessionUser) {
          if(mounted) {
              setUser(null);
              setDbUser(null);
              setLoading(false);
          }
          return;
        }

        // Fetch public.users to get role and extra info
        const { data, error } = await supabase
          .from('users')
          .select('*')
          .eq('id', sessionUser.id)
          .single();
        
        if(mounted) {
          setUser(sessionUser);
          if (error) {
            console.error('AuthProvider: Error fetching DB user:', error);
          }
          if (data) {
            setDbUser(data);
          }
          setLoading(false);
        }
      } catch (err) {
        console.error('AuthProvider: Unexpected error in fetchUser:', err);
        if(mounted) setLoading(false);
      }
    };

    // Safety timeout: don't stay in loading state forever
    const timeoutId = setTimeout(() => {
      if (mounted && loading) {
        console.warn('AuthProvider: Loading timeout reached. Forcing loading to false.');
        setLoading(false);
      }
    }, 5000);

    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      console.log('AuthProvider: Initial session retrieved');
      if(mounted) fetchUser(session?.user);
    }).catch(err => {
      console.error('AuthProvider: Error getting session:', err);
      if(mounted) setLoading(false);
    });

    // Listen for changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      console.log('AuthProvider: Auth state changed:', _event);
      if(mounted) fetchUser(session?.user);
    });

    return () => {
        mounted = false;
        clearTimeout(timeoutId);
        subscription.unsubscribe();
    };
  }, []);

  const signIn = async (email, password) => {
    return supabase.auth.signInWithPassword({ email, password });
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ user, dbUser, loading, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};
