import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import type { Condominium, UserCondominium } from "@shared/schema";
import { useAuth } from "./use-auth";
import { queryClient } from "@/lib/queryClient";

interface CondominiumContextType {
  condominiums: Condominium[];
  userCondominiums: (UserCondominium & { condominium?: Condominium })[];
  selectedCondominium: Condominium | null;
  selectCondominium: (condominium: Condominium | null) => void;
  isLoading: boolean;
  userRoleInCondominium: string | null;
}

const CondominiumContext = createContext<CondominiumContextType | undefined>(undefined);

export function CondominiumProvider({ children }: { children: ReactNode }) {
  const { dbUserId } = useAuth();
  const [selectedCondominium, setSelectedCondominium] = useState<Condominium | null>(null);

  const { data: condominiums = [], isLoading: loadingCondominiums } = useQuery<Condominium[]>({
    queryKey: ["/api/condominiums"],
  });

  const { data: userCondominiums = [], isLoading: loadingUserCondominiums } = useQuery<(UserCondominium & { condominium?: Condominium })[]>({
    queryKey: ["/api/users", dbUserId, "condominiums"],
    enabled: !!dbUserId,
  });

  useEffect(() => {
    const savedCondominiumId = localStorage.getItem("selectedCondominiumId");
    if (savedCondominiumId && condominiums.length > 0) {
      const found = condominiums.find(c => c.id === savedCondominiumId);
      if (found) {
        setSelectedCondominium(found);
      }
    } else if (userCondominiums.length > 0 && userCondominiums[0].condominium) {
      setSelectedCondominium(userCondominiums[0].condominium);
    } else if (condominiums.length > 0 && !selectedCondominium) {
      setSelectedCondominium(condominiums[0]);
    }
  }, [condominiums, userCondominiums]);

  const selectCondominium = (condominium: Condominium | null) => {
    const previousId = selectedCondominium?.id;
    setSelectedCondominium(condominium);
    if (condominium) {
      localStorage.setItem("selectedCondominiumId", condominium.id);
    } else {
      localStorage.removeItem("selectedCondominiumId");
    }
    if (previousId !== condominium?.id) {
      queryClient.invalidateQueries({ 
        predicate: (query) => {
          const key = query.queryKey[0];
          if (typeof key !== 'string') return false;
          return key.startsWith('/api/') && 
            !key.includes('/api/condominiums') && 
            !key.includes('/api/users');
        }
      });
    }
  };

  const userRoleInCondominium = selectedCondominium
    ? userCondominiums.find(uc => uc.condominiumId === selectedCondominium.id)?.role || null
    : null;

  return (
    <CondominiumContext.Provider
      value={{
        condominiums,
        userCondominiums,
        selectedCondominium,
        selectCondominium,
        isLoading: loadingCondominiums || loadingUserCondominiums,
        userRoleInCondominium,
      }}
    >
      {children}
    </CondominiumContext.Provider>
  );
}

export function useCondominium() {
  const context = useContext(CondominiumContext);
  if (context === undefined) {
    throw new Error("useCondominium must be used within a CondominiumProvider");
  }
  return context;
}
