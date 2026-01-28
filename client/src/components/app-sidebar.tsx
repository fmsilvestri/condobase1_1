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
  CreditCard,
  UserCog,
  Package,
  Store,
  Receipt,
  BarChart3,
  Send,
  Home,
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
import logoImage from "@assets/imobcore-logo-new.png";

const pillarModules = [
  {
    title: "Painel Executivo",
    url: "/",
    icon: Target,
    iconColor: "text-emerald-500",
    bgColor: "bg-emerald-500/10",
  },
  {
    title: "Governança",
    url: "/governanca",
    icon: Landmark,
    iconColor: "text-indigo-500",
    bgColor: "bg-indigo-500/10",
  },
  {
    title: "Financeiro",
    url: "/financeiro",
    icon: DollarSign,
    iconColor: "text-green-500",
    bgColor: "bg-green-500/10",
  },
  {
    title: "Taxas e Cobranças",
    url: "/taxas-cobrancas",
    icon: Receipt,
    iconColor: "text-amber-500",
    bgColor: "bg-amber-500/10",
  },
  {
    title: "Contratos e RH",
    url: "/contratos",
    icon: ScrollText,
    iconColor: "text-purple-500",
    bgColor: "bg-purple-500/10",
  },
  {
    title: "Conformidade Legal",
    url: "/conformidade",
    icon: Scale,
    iconColor: "text-red-500",
    bgColor: "bg-red-500/10",
  },
  {
    title: "Seguros",
    url: "/seguros",
    icon: ShieldCheck,
    iconColor: "text-blue-500",
    bgColor: "bg-blue-500/10",
  },
];

const mainModules = [
  {
    title: "Ativos & Manutenções",
    url: "/manutencoes",
    icon: Wrench,
    iconColor: "text-orange-500",
    bgColor: "bg-orange-500/10",
  },
  {
    title: "Manutenção Preventiva",
    url: "/manutencao-preventiva",
    icon: CalendarCheck,
    iconColor: "text-teal-500",
    bgColor: "bg-teal-500/10",
  },
  {
    title: "Piscina & Qualidade",
    url: "/piscina",
    icon: Waves,
    iconColor: "text-cyan-500",
    bgColor: "bg-cyan-500/10",
  },
  {
    title: "Água & Reservatórios",
    url: "/agua",
    icon: Droplets,
    iconColor: "text-blue-500",
    bgColor: "bg-blue-500/10",
  },
  {
    title: "Gás",
    url: "/gas",
    icon: Flame,
    iconColor: "text-orange-600",
    bgColor: "bg-orange-600/10",
  },
  {
    title: "Energia",
    url: "/energia",
    icon: Zap,
    iconColor: "text-yellow-500",
    bgColor: "bg-yellow-500/10",
  },
  {
    title: "Segurança & Acessos",
    url: "/seguranca",
    icon: Shield,
    iconColor: "text-red-500",
    bgColor: "bg-red-500/10",
  },
  {
    title: "Dispositivos IoT",
    url: "/dispositivos-iot",
    icon: Router,
    iconColor: "text-violet-500",
    bgColor: "bg-violet-500/10",
  },
  {
    title: "Operação e Automação",
    url: "/automacao",
    icon: Settings,
    iconColor: "text-slate-500",
    bgColor: "bg-slate-500/10",
  },
  {
    title: "Equipe e Processos",
    url: "/equipe",
    icon: UserCog,
    iconColor: "text-pink-500",
    bgColor: "bg-pink-500/10",
  },
  {
    title: "Gestão de Atividades",
    url: "/gestao-atividades",
    icon: ClipboardList,
    iconColor: "text-lime-500",
    bgColor: "bg-lime-500/10",
  },
  {
    title: "Encomendas",
    url: "/encomendas",
    icon: Package,
    iconColor: "text-amber-600",
    bgColor: "bg-amber-600/10",
  },
  {
    title: "Moradores",
    url: "/moradores",
    icon: Users,
    iconColor: "text-sky-500",
    bgColor: "bg-sky-500/10",
  },
  {
    title: "Gestão Locações",
    url: "/gestao-locacoes",
    icon: Home,
    iconColor: "text-rose-500",
    bgColor: "bg-rose-500/10",
  },
  {
    title: "Marketplace",
    url: "/marketplace",
    icon: Store,
    iconColor: "text-fuchsia-500",
    bgColor: "bg-fuchsia-500/10",
  },
  {
    title: "Meu Painel Fornecedor",
    url: "/marketplace-fornecedor",
    icon: Store,
    iconColor: "text-fuchsia-600",
    bgColor: "bg-fuchsia-600/10",
  },
];

const secondaryModules = [
  {
    title: "Resíduos & Coleta",
    url: "/residuos",
    icon: Trash2,
    iconColor: "text-green-600",
    bgColor: "bg-green-600/10",
  },
  {
    title: "Ocupação & População",
    url: "/ocupacao",
    icon: Users,
    iconColor: "text-indigo-500",
    bgColor: "bg-indigo-500/10",
  },
  {
    title: "Documentos & Licenças",
    url: "/documentos",
    icon: FileText,
    iconColor: "text-amber-500",
    bgColor: "bg-amber-500/10",
  },
  {
    title: "Fornecedores",
    url: "/fornecedores",
    icon: Truck,
    iconColor: "text-slate-600",
    bgColor: "bg-slate-600/10",
  },
  {
    title: "Comunicados",
    url: "/comunicados",
    icon: Megaphone,
    iconColor: "text-red-500",
    bgColor: "bg-red-500/10",
  },
  {
    title: "Pagamentos",
    url: "/pagamentos",
    icon: CreditCard,
    iconColor: "text-emerald-500",
    bgColor: "bg-emerald-500/10",
  },
  {
    title: "Perguntas Frequentes",
    url: "/faq",
    icon: HelpCircle,
    iconColor: "text-blue-400",
    bgColor: "bg-blue-400/10",
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
    if (item.url === "/marketplace-fornecedor") {
      return effectiveRole === "prestador" || isAdmin;
    }
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
            alt="ImobCore" 
            className="h-16 w-auto object-contain"
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
                    className="rounded-lg h-9 transition-all duration-200 data-[active=true]:bg-primary/15 data-[active=true]:font-medium"
                  >
                    <Link href={item.url}>
                      <div className={`flex h-6 w-6 items-center justify-center rounded-md ${item.bgColor}`}>
                        <item.icon className={`h-3.5 w-3.5 ${item.iconColor}`} />
                      </div>
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
                    className="rounded-lg h-9 transition-all duration-200 data-[active=true]:bg-primary/15 data-[active=true]:font-medium"
                  >
                    <Link href={item.url}>
                      <div className={`flex h-6 w-6 items-center justify-center rounded-md ${item.bgColor}`}>
                        <item.icon className={`h-3.5 w-3.5 ${item.iconColor}`} />
                      </div>
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
                    className="rounded-lg h-9 transition-all duration-200 data-[active=true]:bg-primary/15 data-[active=true]:font-medium"
                  >
                    <Link href={item.url}>
                      <div className={`flex h-6 w-6 items-center justify-center rounded-md ${item.bgColor}`}>
                        <item.icon className={`h-3.5 w-3.5 ${item.iconColor}`} />
                      </div>
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
                    className="rounded-lg h-9 transition-all duration-200 data-[active=true]:bg-primary/15 data-[active=true]:font-medium"
                  >
                    <Link href="/admin">
                      <div className="flex h-6 w-6 items-center justify-center rounded-md bg-gray-500/10">
                        <Settings className="h-3.5 w-3.5 text-gray-500" />
                      </div>
                      <span className="text-sm">Painel Admin</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton
                    asChild
                    isActive={location === "/controle-acesso"}
                    data-testid="nav-controle-acesso"
                    className="rounded-lg h-9 transition-all duration-200 data-[active=true]:bg-primary/15 data-[active=true]:font-medium"
                  >
                    <Link href="/controle-acesso">
                      <div className="flex h-6 w-6 items-center justify-center rounded-md bg-violet-500/10">
                        <ToggleRight className="h-3.5 w-3.5 text-violet-500" />
                      </div>
                      <span className="text-sm">Controle de Acesso</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton
                    asChild
                    isActive={location === "/relatorios"}
                    data-testid="nav-relatorios"
                    className="rounded-lg h-9 transition-all duration-200 data-[active=true]:bg-primary/15 data-[active=true]:font-medium"
                  >
                    <Link href="/relatorios">
                      <div className="flex h-6 w-6 items-center justify-center rounded-md bg-blue-500/10">
                        <ClipboardList className="h-3.5 w-3.5 text-blue-500" />
                      </div>
                      <span className="text-sm">Relatórios</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton
                    asChild
                    isActive={location === "/marketplace-admin"}
                    data-testid="nav-marketplace-admin"
                    className="rounded-lg h-9 transition-all duration-200 data-[active=true]:bg-primary/15 data-[active=true]:font-medium"
                  >
                    <Link href="/marketplace-admin">
                      <div className="flex h-6 w-6 items-center justify-center rounded-md bg-fuchsia-500/10">
                        <Store className="h-3.5 w-3.5 text-fuchsia-500" />
                      </div>
                      <span className="text-sm">Marketplace Admin</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton
                    asChild
                    isActive={location === "/marketplace-relatorios"}
                    data-testid="nav-marketplace-relatorios"
                    className="rounded-lg h-9 transition-all duration-200 data-[active=true]:bg-primary/15 data-[active=true]:font-medium"
                  >
                    <Link href="/marketplace-relatorios">
                      <div className="flex h-6 w-6 items-center justify-center rounded-md bg-cyan-500/10">
                        <BarChart3 className="h-3.5 w-3.5 text-cyan-500" />
                      </div>
                      <span className="text-sm">Relatorios Marketplace</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton
                    asChild
                    isActive={location === "/marketplace-campanhas"}
                    data-testid="nav-marketplace-campanhas"
                    className="rounded-lg h-9 transition-all duration-200 data-[active=true]:bg-primary/15 data-[active=true]:font-medium"
                  >
                    <Link href="/marketplace-campanhas">
                      <div className="flex h-6 w-6 items-center justify-center rounded-md bg-green-500/10">
                        <Send className="h-3.5 w-3.5 text-green-500" />
                      </div>
                      <span className="text-sm">Campanhas WhatsApp</span>
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
                        className="rounded-lg h-9 transition-all duration-200 data-[active=true]:bg-primary/15 data-[active=true]:font-medium"
                      >
                        <Link href="/painel-plataforma">
                          <div className="flex h-6 w-6 items-center justify-center rounded-md bg-red-500/10">
                            <Shield className="h-3.5 w-3.5 text-red-500" />
                          </div>
                          <span className="text-sm">Painel da Plataforma</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                    <SidebarMenuItem>
                      <SidebarMenuButton
                        asChild
                        isActive={location === "/condominios"}
                        data-testid="nav-condominios"
                        className="rounded-lg h-9 transition-all duration-200 data-[active=true]:bg-primary/15 data-[active=true]:font-medium"
                      >
                        <Link href="/condominios">
                          <div className="flex h-6 w-6 items-center justify-center rounded-md bg-amber-500/10">
                            <Building2 className="h-3.5 w-3.5 text-amber-500" />
                          </div>
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
