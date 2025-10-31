import { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';

type Session = Awaited<ReturnType<typeof supabase.auth.getSession>>['data']['session'];
type Role = 'admin' | 'user';
type AuthContextType = {
  session: Session | null;
  role: Role | null;
  loading: boolean;
  refreshAuth: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType>({
  session: null,
  role: null,
  loading: true,
  refreshAuth: async () => {},
});

export const useAuth = () => useContext(AuthContext);

async function fetchProfileRole(userId: string): Promise<Role> {
  const { data, error } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', userId)
    .single();
  if (error) {
    console.error('fetchProfileRole', error);
    return 'user';
  }
  const role = (data?.role ?? 'user') as Role;
  return role;
}

export default function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [role, setRole] = useState<Role | null>(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase.auth.getSession();
    const s = data.session ?? null;
    setSession(s);
    if (s?.user?.id) {
      const r = await fetchProfileRole(s.user.id);
      setRole(r);
    } else {
      setRole(null);
    }
    setLoading(false);
  };

  useEffect(() => {
    load();
    const { data: sub } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
      (async () => {
        if (newSession?.user?.id) {
          const r = await fetchProfileRole(newSession.user.id);
          setRole(r);
        } else {
          setRole(null);
        }
      })();
    });
    return () => {
      sub.subscription.unsubscribe();
    };
  }, []);

  return (
    <AuthContext.Provider
      value={{
        session,
        role,
        loading,
        refreshAuth: load,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}