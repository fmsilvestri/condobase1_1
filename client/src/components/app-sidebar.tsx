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

  const displayRole = userRole === "síndico" ? "Síndico" : "Condômino";
  const displayName = userName || "Usuário";

  return (
    <Sidebar>
      <SidebarHeader className="border-b border-sidebar-border p-4">
        <Link href="/" className="flex items-center justify-center" data-testid="link-logo">
          <img 
            src={logoImage} 
            alt="CONDOBASE1" 
            className="h-16 w-auto object-contain"
          />
        </Link>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Módulos Principais</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {mainModules.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    isActive={location === item.url}
                    data-testid={`nav-${item.url.replace("/", "") || "dashboard"}`}
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
          <SidebarGroupLabel>Gestão</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {secondaryModules.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    isActive={location === item.url}
                    data-testid={`nav-${item.url.replace("/", "")}`}
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
      </SidebarContent>
      <SidebarFooter className="border-t border-sidebar-border p-4">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary">
              <Users className="h-4 w-4" />
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-medium truncate max-w-[120px]">{displayName}</span>
              <Badge variant="secondary" className="w-fit text-xs">
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
            >
              <LogOut className="h-4 w-4" />
            </Button>
          )}
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
