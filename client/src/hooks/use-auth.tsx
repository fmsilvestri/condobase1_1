import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { supabase, supabaseReady } from "@/lib/supabase";
import type { User, Session } from "@supabase/supabase-js";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signOut: () => Promise<void>;
  userRole: string | null;
  userName: string | null;
  isAdmin: boolean;
  isSindico: boolean;
  canEdit: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [dbRole, setDbRole] = useState<string | null>(null);

  useEffect(() => {
    async function initAuth() {
      await supabaseReady;
      
      if (!supabase) {
        setLoading(false);
        return;
      }

      const { data: { session } } = await supabase.auth.getSession();
      setSession(session);
      setUser(session?.user ?? null);
      
      if (session?.user?.email) {
        await fetchUserRole(session.user.email);
      }
      
      setLoading(false);

      const { data: { subscription } } = supabase.auth.onAuthStateChange(
        async (event, session) => {
          setSession(session);
          setUser(session?.user ?? null);
          
          if (session?.user?.email) {
            await fetchUserRole(session.user.email);
          } else {
            setDbRole(null);
          }
          
          setLoading(false);
        }
      );

      return () => subscription.unsubscribe();
    }

    initAuth();
  }, []);

  const fetchUserRole = async (email: string) => {
    try {
      const response = await fetch(`/api/users/by-email/${encodeURIComponent(email)}`);
      if (response.ok) {
        const userData = await response.json();
        setDbRole(userData.role);
      }
    } catch (error) {
      console.error("Error fetching user role:", error);
    }
  };

  const signOut = async () => {
    if (supabase) {
      await supabase.auth.signOut();
      setDbRole(null);
    }
  };

  const userRole = dbRole || user?.user_metadata?.role || null;
  const userName = user?.user_metadata?.name || user?.email?.split("@")[0] || null;
  const isAdmin = userRole === "admin";
  const isSindico = userRole === "síndico";
  const canEdit = isAdmin || isSindico;

  return (
    <AuthContext.Provider value={{ user, session, loading, signOut, userRole, userName, isAdmin, isSindico, canEdit }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
