import { createContext, useContext, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import type { ModulePermission } from "@shared/schema";
import { useAuth } from "./use-auth";

interface ModulePermissionsContextType {
  permissions: ModulePermission[];
  isLoading: boolean;
  isModuleEnabled: (moduleKey: string) => boolean;
  canAccessModule: (moduleKey: string) => boolean;
}

const ModulePermissionsContext = createContext<ModulePermissionsContextType | undefined>(undefined);

export function ModulePermissionsProvider({ children }: { children: React.ReactNode }) {
  const { userRole } = useAuth();

  const { data: permissions = [], isLoading } = useQuery<ModulePermission[]>({
    queryKey: ["/api/module-permissions"],
    staleTime: 60000,
  });

  const value = useMemo(() => {
    const isModuleEnabled = (moduleKey: string): boolean => {
      const permission = permissions.find(p => p.moduleKey === moduleKey);
      return permission?.isEnabled ?? true;
    };

    const canAccessModule = (moduleKey: string): boolean => {
      if (userRole === "admin" || userRole === "síndico") {
        return true;
      }
      return isModuleEnabled(moduleKey);
    };

    return {
      permissions,
      isLoading,
      isModuleEnabled,
      canAccessModule,
    };
  }, [permissions, isLoading, userRole]);

  return (
    <ModulePermissionsContext.Provider value={value}>
      {children}
    </ModulePermissionsContext.Provider>
  );
}

export function useModulePermissions() {
  const context = useContext(ModulePermissionsContext);
  if (context === undefined) {
    throw new Error("useModulePermissions must be used within a ModulePermissionsProvider");
  }
  return context;
}

export const moduleKeyMap: Record<string, string> = {
  "/manutencoes": "manutencoes",
  "/piscina": "piscina",
  "/agua": "agua",
  "/gas": "gas",
  "/energia": "energia",
  "/residuos": "residuos",
  "/ocupacao": "ocupacao",
  "/documentos": "documentos",
  "/fornecedores": "fornecedores",
  "/comunicados": "comunicados",
  "/seguranca": "seguranca",
  "/governanca": "governanca",
  "/financeiro": "financeiro",
  "/contratos": "contratos",
  "/conformidade": "conformidade",
  "/seguros": "seguros",
};
