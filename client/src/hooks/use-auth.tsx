import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { apiRequest } from "@/lib/queryClient";

interface DbUser {
  id: string;
  email: string;
  name: string | null;
  role: string;
}

interface AuthContextType {
  user: DbUser | null;
  loading: boolean;
  signOut: () => void;
  userRole: string | null;
  userName: string | null;
  userEmail: string | null;
  userId: string | null;
  dbUserId: string | null;
  isAdmin: boolean;
  isSindico: boolean;
  isCondomino: boolean;
  canEdit: boolean;
  accessToken: string | null;
  refreshAuth: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<DbUser | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchCurrentUser = async () => {
    const token = localStorage.getItem("authToken");
    if (!token) {
      setUser(null);
      setLoading(false);
      return;
    }

    try {
      const response = await fetch("/api/auth/me", {
        headers: { "Authorization": `Bearer ${token}` },
      });
      
      if (response.ok) {
        const userData = await response.json();
        setUser(userData);
        localStorage.setItem("dbUserId", userData.id);
        
        // Auto-select first condominium if none selected and user has condominiums
        const selectedCondoId = localStorage.getItem("selectedCondominiumId");
        if (!selectedCondoId && userData.condominiums?.length > 0) {
          const firstCondo = userData.condominiums[0];
          localStorage.setItem("selectedCondominiumId", firstCondo.condominiumId);
        }
      } else {
        localStorage.removeItem("authToken");
        localStorage.removeItem("dbUserId");
        setUser(null);
      }
    } catch (error) {
      console.error("Error fetching current user:", error);
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCurrentUser();
  }, []);

  const signOut = () => {
    localStorage.removeItem("authToken");
    localStorage.removeItem("dbUserId");
    localStorage.removeItem("selectedCondominiumId");
    setUser(null);
    window.location.href = "/login";
  };

  const refreshAuth = async () => {
    await fetchCurrentUser();
  };

  const userRole = user?.role || null;
  const userName = user?.name || user?.email?.split("@")[0] || null;
  const userEmail = user?.email || null;
  const userId = user?.id || null;
  const dbUserId = user?.id || null;
  const isAdmin = userRole === "admin";
  const isSindico = userRole === "síndico";
  const isCondomino = userRole === "condômino";
  const canEdit = isAdmin || isSindico;
  const accessToken = localStorage.getItem("authToken");

  return (
    <AuthContext.Provider value={{ 
      user, 
      loading, 
      signOut, 
      userRole, 
      userName, 
      userEmail, 
      userId, 
      dbUserId, 
      isAdmin, 
      isSindico, 
      isCondomino, 
      canEdit, 
      accessToken,
      refreshAuth 
    }}>
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
