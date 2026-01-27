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
  ClipboardList,
  Shield,
  Building2,
  ChevronDown,
  CalendarCheck,
  HelpCircle,
  Router,
  Landmark,
  DollarSign,
  ScrollText,
  Scale,
  ShieldCheck,
  Target,
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useModulePermissions, moduleKeyMap } from "@/hooks/use-module-permissions";
import { useCondominium } from "@/hooks/use-condominium";
import logoImage from "@assets/image_1767976092597.png";

const pillarModules = [
  {
    title: "Painel Executivo",
    url: "/",
    icon: Target,
  },
  {
    title: "Governança",
    url: "/governanca",
    icon: Landmark,
  },
  {
    title: "Financeiro",
    url: "/financeiro",
    icon: DollarSign,
  },
  {
    title: "Contratos",
    url: "/contratos",
    icon: ScrollText,
  },
  {
    title: "Conformidade Legal",
    url: "/conformidade",
    icon: Scale,
  },
  {
    title: "Seguros",
    url: "/seguros",
    icon: ShieldCheck,
  },
];

const mainModules = [
  {
    title: "Ativos & Manutenções",
    url: "/manutencoes",
    icon: Wrench,
  },
  {
    title: "Manutenção Preventiva",
    url: "/manutencao-preventiva",
    icon: CalendarCheck,
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
  {
    title: "Segurança & Acessos",
    url: "/seguranca",
    icon: Shield,
  },
  {
    title: "Dispositivos IoT",
    url: "/dispositivos-iot",
    icon: Router,
  },
  {
    title: "Operação e Automação",
    url: "/automacao",
    icon: Settings,
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
  {
    title: "Perguntas Frequentes",
    url: "/faq",
    icon: HelpCircle,
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
  const { condominiums, selectedCondominium, selectCondominium, userRoleInCondominium } = useCondominium();

  const isPlatformAdmin = userRole === "admin";
  const effectiveRole = isPlatformAdmin ? "admin" : (userRoleInCondominium || userRole);
  const displayRole = isPlatformAdmin ? "Administrador" : effectiveRole === "síndico" ? "Síndico" : effectiveRole === "prestador" ? "Prestador" : "Condômino";
  const displayName = userName || "Usuário";
  const isAdmin = isPlatformAdmin || effectiveRole === "síndico";

  const filteredPillarModules = pillarModules.filter(item => {
    const moduleKey = moduleKeyMap[item.url];
    if (!moduleKey) return true;
    return canAccessModule(moduleKey);
  });

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
    <Sidebar className="border-r border-border/40">
      <SidebarHeader className="p-4 pb-2 space-y-3">
        <Link href="/" className="flex items-center justify-center" data-testid="link-logo">
          <img 
            src={logoImage} 
            alt="CONDOBASE1" 
            className="h-14 w-auto object-contain"
          />
        </Link>
        {condominiums.length > 0 && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button 
                variant="outline" 
                className="w-full justify-between h-9 text-sm"
                data-testid="dropdown-condominium-selector"
              >
                <div className="flex items-center gap-2 truncate">
                  <Building2 className="h-4 w-4 shrink-0 text-primary" />
                  <span className="truncate">{selectedCondominium?.name || "Selecionar..."}</span>
                </div>
                <ChevronDown className="h-4 w-4 shrink-0 opacity-50" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-[--radix-dropdown-menu-trigger-width]" align="start">
              {condominiums.map((condo) => (
                <DropdownMenuItem
                  key={condo.id}
                  onClick={() => selectCondominium(condo)}
                  className={selectedCondominium?.id === condo.id ? "bg-accent" : ""}
                  data-testid={`dropdown-item-condominium-${condo.id}`}
                >
                  <Building2 className="h-4 w-4 mr-2" />
                  {condo.name}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </SidebarHeader>
      <SidebarContent className="px-3 py-2">
        <SidebarGroup>
          <SidebarGroupLabel className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60 px-2 mb-1">
            7 Pilares
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {filteredPillarModules.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    isActive={location === item.url}
                    data-testid={`nav-${item.url.replace("/", "") || "painel"}`}
                    className="rounded-lg h-9 transition-all duration-200 data-[active=true]:bg-emerald-500/15 data-[active=true]:text-emerald-600 dark:data-[active=true]:text-emerald-400 data-[active=true]:font-medium"
                  >
                    <Link href={item.url}>
                      <item.icon className="h-4 w-4" />
                      <span className="text-sm">{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        <SidebarGroup>
          <SidebarGroupLabel className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60 px-2 mb-1">
            Operações
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {filteredMainModules.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    isActive={location === item.url}
                    data-testid={`nav-${item.url.replace("/", "") || "dashboard"}`}
                    className="rounded-lg h-9 transition-all duration-200 data-[active=true]:bg-cyan-500/15 data-[active=true]:text-cyan-600 dark:data-[active=true]:text-cyan-400 data-[active=true]:font-medium"
                  >
                    <Link href={item.url}>
                      <item.icon className="h-4 w-4" />
                      <span className="text-sm">{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        <SidebarGroup>
          <SidebarGroupLabel className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60 px-2 mb-1">
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
                    className="rounded-lg h-9 transition-all duration-200 data-[active=true]:bg-cyan-500/15 data-[active=true]:text-cyan-600 dark:data-[active=true]:text-cyan-400 data-[active=true]:font-medium"
                  >
                    <Link href={item.url}>
                      <item.icon className="h-4 w-4" />
                      <span className="text-sm">{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        {isAdmin && (
          <SidebarGroup>
            <SidebarGroupLabel className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60 px-2 mb-1">
              Administração
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton
                    asChild
                    isActive={location === "/admin"}
                    data-testid="nav-admin"
                    className="rounded-lg h-9 transition-all duration-200 data-[active=true]:bg-cyan-500/15 data-[active=true]:text-cyan-600 dark:data-[active=true]:text-cyan-400 data-[active=true]:font-medium"
                  >
                    <Link href="/admin">
                      <Settings className="h-4 w-4" />
                      <span className="text-sm">Painel Admin</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton
                    asChild
                    isActive={location === "/controle-acesso"}
                    data-testid="nav-controle-acesso"
                    className="rounded-lg h-9 transition-all duration-200 data-[active=true]:bg-cyan-500/15 data-[active=true]:text-cyan-600 dark:data-[active=true]:text-cyan-400 data-[active=true]:font-medium"
                  >
                    <Link href="/controle-acesso">
                      <ToggleRight className="h-4 w-4" />
                      <span className="text-sm">Controle de Acesso</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton
                    asChild
                    isActive={location === "/relatorios"}
                    data-testid="nav-relatorios"
                    className="rounded-lg h-9 transition-all duration-200 data-[active=true]:bg-cyan-500/15 data-[active=true]:text-cyan-600 dark:data-[active=true]:text-cyan-400 data-[active=true]:font-medium"
                  >
                    <Link href="/relatorios">
                      <ClipboardList className="h-4 w-4" />
                      <span className="text-sm">Relatórios</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                {userRole === "admin" && (
                  <>
                    <SidebarMenuItem>
                      <SidebarMenuButton
                        asChild
                        isActive={location === "/painel-plataforma"}
                        data-testid="nav-painel-plataforma"
                        className="rounded-lg h-9 transition-all duration-200 data-[active=true]:bg-cyan-500/15 data-[active=true]:text-cyan-600 dark:data-[active=true]:text-cyan-400 data-[active=true]:font-medium"
                      >
                        <Link href="/painel-plataforma">
                          <Shield className="h-4 w-4" />
                          <span className="text-sm">Painel da Plataforma</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                    <SidebarMenuItem>
                      <SidebarMenuButton
                        asChild
                        isActive={location === "/condominios"}
                        data-testid="nav-condominios"
                        className="rounded-lg h-9 transition-all duration-200 data-[active=true]:bg-cyan-500/15 data-[active=true]:text-cyan-600 dark:data-[active=true]:text-cyan-400 data-[active=true]:font-medium"
                      >
                        <Link href="/condominios">
                          <Building2 className="h-4 w-4" />
                          <span className="text-sm">Condomínios</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  </>
                )}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>
      <SidebarFooter className="border-t border-border/40 p-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10">
              <Users className="h-4 w-4 text-primary" />
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-sm font-medium truncate">{displayName}</span>
              <span className="text-xs text-muted-foreground">{displayRole}</span>
            </div>
          </div>
          {onSignOut && (
            <Button 
              size="icon" 
              variant="ghost" 
              onClick={onSignOut}
              data-testid="button-logout"
              className="rounded-lg h-8 w-8"
            >
              <LogOut className="h-4 w-4" />
            </Button>
          )}
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
