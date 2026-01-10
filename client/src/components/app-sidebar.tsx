import { useLocation, Link } from "wouter";
import {
  LayoutDashboard,
  Wrench,
  Waves,
  Droplets,
  Flame,
  Zap,
  Trash2,
  Users,
  FileText,
  Truck,
  Megaphone,
  LogOut,
  Settings,
  ToggleRight,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarFooter,
} from "@/components/ui/sidebar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useModulePermissions, moduleKeyMap } from "@/hooks/use-module-permissions";
import logoImage from "@assets/image_1767976092597.png";

const mainModules = [
  {
    title: "Dashboard",
    url: "/",
    icon: LayoutDashboard,
  },
  {
    title: "Ativos & Manutenções",
    url: "/manutencoes",
    icon: Wrench,
  },
  {
    title: "Piscina & Qualidade",
    url: "/piscina",
    icon: Waves,
  },
  {
    title: "Água & Reservatórios",
    url: "/agua",
    icon: Droplets,
  },
  {
    title: "Gás",
    url: "/gas",
    icon: Flame,
  },
  {
    title: "Energia",
    url: "/energia",
    icon: Zap,
  },
];

const secondaryModules = [
  {
    title: "Resíduos & Coleta",
    url: "/residuos",
    icon: Trash2,
  },
  {
    title: "Ocupação & População",
    url: "/ocupacao",
    icon: Users,
  },
  {
    title: "Documentos & Licenças",
    url: "/documentos",
    icon: FileText,
  },
  {
    title: "Fornecedores",
    url: "/fornecedores",
    icon: Truck,
  },
  {
    title: "Comunicados",
    url: "/comunicados",
    icon: Megaphone,
  },
];

interface AppSidebarProps {
  userName?: string | null;
  userRole?: string | null;
  onSignOut?: () => void;
}

export function AppSidebar({ userName, userRole, onSignOut }: AppSidebarProps) {
  const [location] = useLocation();
  const { canAccessModule } = useModulePermissions();

  const displayRole = userRole === "admin" ? "Administrador" : userRole === "síndico" ? "Síndico" : "Condômino";
  const displayName = userName || "Usuário";
  const isAdmin = userRole === "admin" || userRole === "síndico";

  const filteredMainModules = mainModules.filter(item => {
    const moduleKey = moduleKeyMap[item.url];
    if (!moduleKey) return true;
    return canAccessModule(moduleKey);
  });

  const filteredSecondaryModules = secondaryModules.filter(item => {
    const moduleKey = moduleKeyMap[item.url];
    if (!moduleKey) return true;
    return canAccessModule(moduleKey);
  });

  return (
    <Sidebar className="border-r-0">
      <SidebarHeader className="border-b border-cyan-500/10 p-4 bg-gradient-to-b from-cyan-500/5 to-transparent">
        <Link href="/" className="flex items-center justify-center" data-testid="link-logo">
          <img 
            src={logoImage} 
            alt="CONDOBASE1" 
            className="h-16 w-auto object-contain drop-shadow-lg"
          />
        </Link>
      </SidebarHeader>
      <SidebarContent className="px-2">
        <SidebarGroup>
          <SidebarGroupLabel className="text-xs font-semibold uppercase tracking-wider text-cyan-500/70 px-2">
            Módulos Principais
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {filteredMainModules.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    isActive={location === item.url}
                    data-testid={`nav-${item.url.replace("/", "") || "dashboard"}`}
                    className="rounded-lg transition-all duration-200 data-[active=true]:bg-gradient-to-r data-[active=true]:from-cyan-500/20 data-[active=true]:to-blue-500/20 data-[active=true]:border-l-2 data-[active=true]:border-l-cyan-500"
                  >
                    <Link href={item.url}>
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        <SidebarGroup>
          <SidebarGroupLabel className="text-xs font-semibold uppercase tracking-wider text-cyan-500/70 px-2">
            Gestão
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {filteredSecondaryModules.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    isActive={location === item.url}
                    data-testid={`nav-${item.url.replace("/", "")}`}
                    className="rounded-lg transition-all duration-200 data-[active=true]:bg-gradient-to-r data-[active=true]:from-cyan-500/20 data-[active=true]:to-blue-500/20 data-[active=true]:border-l-2 data-[active=true]:border-l-cyan-500"
                  >
                    <Link href={item.url}>
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        {isAdmin && (
          <SidebarGroup>
            <SidebarGroupLabel className="text-xs font-semibold uppercase tracking-wider text-cyan-500/70 px-2">
              Administração
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton
                    asChild
                    isActive={location === "/admin"}
                    data-testid="nav-admin"
                    className="rounded-lg transition-all duration-200 data-[active=true]:bg-gradient-to-r data-[active=true]:from-cyan-500/20 data-[active=true]:to-blue-500/20 data-[active=true]:border-l-2 data-[active=true]:border-l-cyan-500"
                  >
                    <Link href="/admin">
                      <Settings className="h-4 w-4" />
                      <span>Painel Admin</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton
                    asChild
                    isActive={location === "/controle-acesso"}
                    data-testid="nav-controle-acesso"
                    className="rounded-lg transition-all duration-200 data-[active=true]:bg-gradient-to-r data-[active=true]:from-cyan-500/20 data-[active=true]:to-blue-500/20 data-[active=true]:border-l-2 data-[active=true]:border-l-cyan-500"
                  >
                    <Link href="/controle-acesso">
                      <ToggleRight className="h-4 w-4" />
                      <span>Controle de Acesso</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>
      <SidebarFooter className="border-t border-cyan-500/10 p-4 bg-gradient-to-t from-cyan-500/5 to-transparent">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-500/20 to-blue-500/20 ring-1 ring-cyan-500/20">
              <Users className="h-4 w-4 text-cyan-500" />
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-medium truncate max-w-[120px]">{displayName}</span>
              <Badge 
                variant="secondary" 
                className="w-fit text-xs bg-cyan-500/10 text-cyan-500 border-cyan-500/20"
              >
                {displayRole}
              </Badge>
            </div>
          </div>
          {onSignOut && (
            <Button 
              size="icon" 
              variant="ghost" 
              onClick={onSignOut}
              data-testid="button-logout"
              className="rounded-lg"
            >
              <LogOut className="h-4 w-4" />
            </Button>
          )}
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
