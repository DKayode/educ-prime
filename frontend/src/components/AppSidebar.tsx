import {
  LayoutDashboard,
  GraduationCap,
  Building2,
  GitFork,
  Layers,
  BookMarked,
  FileText,
  List,
  Building,
  Award,
  MessageCircle,
  MessagesSquare,
  Route,
  MessageSquare,
  Tags,
  Briefcase,
  Wrench,
  UserCheck,
  UserCog,
  Star,
  Cog,
  Megaphone,
  CalendarDays,
  Lightbulb,
  Settings,
  User,
  Users,
  BarChart3,
  SlidersHorizontal,
  UserPlus,
  Contact,
  Bell,
  Smartphone,
  ChevronRight,
  BookOpen,
  ClipboardCheck,
  Wallet,
  Banknote,
  Map,
  MapPin,
  ClipboardList,
  ShieldCheck,
  type LucideIcon,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { NavLink } from "@/components/NavLink";
import { useLocation } from "react-router-dom";

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarHeader,
  useSidebar,
} from "@/components/ui/sidebar";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { useApp } from "@/hooks/useApp";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";
import { Permission, hasAnyPermission } from "@/lib/permissions";

// A nav entry is either a leaf (route, or disabled "à venir") or a group with
// children. Groups may nest one level (Concours sits under Éducation).
interface NavItem {
  title: string;
  icon: LucideIcon;
  url?: string;
  badge?: string;
  children?: NavItem[];
  permission?: string | string[];
}

const navTree: NavItem[] = [
  { title: "Tableau de bord", icon: LayoutDashboard, url: "/", permission: Permission.ADMIN_DASHBOARD_READ },
  {
    title: "Éducation",
    icon: GraduationCap,
    children: [
      { title: "Établissements", icon: Building2, url: "/etablissements" },
      { title: "Filières", icon: GitFork, url: "/filieres" },
      { title: "Niveaux d'étude", icon: Layers, url: "/niveaux" },
      { title: "Matières", icon: BookMarked, url: "/matieres" },
      { title: "Épreuves", icon: FileText, url: "/epreuves" },
      {
        title: "Examens Nat.",
        icon: GraduationCap,
        children: [
          { title: "Examens Nat.", icon: FileText, url: "/examens-nationaux", permission: Permission.EXAMENS_NATIONAUX_READ },
          { title: "Types d'examen", icon: List, url: "/types-examen", permission: Permission.REFERENTIALS_READ },
          { title: "Séries", icon: Layers, url: "/series-examen" },
          { title: "Matières", icon: BookMarked, url: "/matieres-examen" },
          { title: "Filières", icon: BookMarked, url: "/filieres-examen" },
        ],
      },
      {
        title: "Concours",
        icon: GraduationCap,
        children: [
          { title: "Concours", icon: List, url: "/concours", permission: Permission.CONCOURS_READ },
          { title: "Vue groupée", icon: Layers, url: "/concours/groupes" },
          { title: "Structures", icon: Building, url: "/structures", permission: Permission.REFERENTIALS_READ },
          { title: "Titres", icon: Award, url: "/titres", permission: Permission.REFERENTIALS_READ },
        ],
      },
    ],
  },
  {
    title: "Approbations",
    icon: UserCheck,
    children: [
      { title: "Épreuves en attente", icon: FileText, url: "/approbations/epreuves" },
      { title: "Concours en attente", icon: FileText, url: "/approbations/concours", permission: [Permission.CONCOURS_READ, Permission.CONCOURS_VALIDATE] },
      { title: "Examens Nat. en attente", icon: FileText, url: "/approbations/examens-nationaux", permission: [Permission.EXAMENS_NATIONAUX_READ, Permission.EXAMENS_NATIONAUX_VALIDATE] },
      { title: "Statistiques", icon: BarChart3, url: "/statistiques-approbations", permission: Permission.STATS_READ },
      {
        title: "Wallet",
        icon: Wallet,
        children: [
          { title: "Retraits", icon: Banknote, url: "/admin/retraits", permission: Permission.WALLET_WITHDRAWALS_READ },
          { title: "Configuration", icon: SlidersHorizontal, url: "/admin/wallet-configuration", permission: Permission.WALLET_CONFIGURATION_UPDATE },
        ],
      },
    ],
  },
  {
    title: "Communauté",
    icon: MessageCircle,
    children: [
      { title: "Forums", icon: MessagesSquare, url: "/forums", permission: Permission.ADMIN_DASHBOARD_READ },
      {
        title: "Parcours",
        icon: Route,
        children: [
          { title: "Parcours", icon: Route, url: "/parcours", permission: Permission.ADMIN_DASHBOARD_READ },
          { title: "Catégories", icon: Tags, url: "/categories" },
        ],
      },
      { title: "Commentaires", icon: MessageSquare },
    ],
  },
  {
    title: "JobKia",
    icon: Briefcase,
    children: [
      { title: "Services", icon: Wrench, url: "/admin/services", permission: Permission.ADMIN_DASHBOARD_READ },
      { title: "Offres", icon: Briefcase, url: "/admin/offres", permission: Permission.ADMIN_DASHBOARD_READ },
      { title: "Prestataires", icon: UserCheck },
      { title: "Recruteurs", icon: UserCog, url: "/admin/recruteurs", permission: Permission.ADMIN_DASHBOARD_READ },
      { title: "Avis", icon: Star },
      { title: "Types (Services, Offres)", icon: Layers, url: "/admin/service-types", permission: Permission.ADMIN_DASHBOARD_READ },
      { title: "Compétences", icon: Cog, url: "/admin/competences" },
    ],
  },
  {
    title: "Enquêtes",
    icon: ClipboardList,
    children: [
      { title: "Campagnes", icon: ClipboardList, url: "/enquetes", permission: Permission.ADMIN_DASHBOARD_READ },
    ],
  },
  {
    title: "Contenu",
    icon: Megaphone,
    children: [
      { title: "Publicités", icon: Megaphone, url: "/publicites", permission: Permission.ADMIN_DASHBOARD_READ },
      { title: "Événements", icon: CalendarDays, url: "/evenements", permission: Permission.ADMIN_DASHBOARD_READ },
      { title: "Opportunités", icon: Lightbulb, url: "/opportunites", permission: Permission.ADMIN_DASHBOARD_READ },
    ],
  },
  {
    title: "Utilisateurs",
    icon: Users,
    children: [
      { title: "Utilisateurs", icon: User, url: "/users", permission: Permission.USERS_READ },
      { title: "Indicateurs", icon: BarChart3, url: "/indicateurs", permission: Permission.STATS_READ },
      { title: "Parrainage", icon: UserPlus, url: "/parrainages", permission: Permission.USERS_READ },
      { title: "Appareils partagés", icon: Smartphone, url: "/appareils-partages", permission: Permission.USERS_READ },
      {
        // geo-profile: Géographie subgroup, nested under Utilisateurs
        title: "Géographie",
        icon: Map,
        children: [
          { title: "Départements", icon: MapPin, url: "/departements", permission: Permission.REFERENTIALS_READ },
          { title: "Villes", icon: MapPin, url: "/villes", permission: Permission.REFERENTIALS_READ },
        ],
      },
    ],
  },
  {
    title: "Personnalisation",
    icon: UserCog,
    children: [
      { title: "Types de profil", icon: Tags, url: "/types-profil", permission: Permission.REFERENTIALS_READ },
      { title: "Associations audience", icon: Tags, url: "/types-profil/associations", permission: Permission.REFERENTIALS_UPDATE },
    ],
  },
  {
    title: "Système",
    icon: Settings,
    children: [
      { title: "Paramètres", icon: SlidersHorizontal },
      { title: "Contacts Pro", icon: Contact, url: "/contacts-professionnels", permission: Permission.ADMIN_DASHBOARD_READ },
      { title: "Notifications", icon: Bell, url: "/notifications", permission: [Permission.NOTIFICATIONS_READ, Permission.NOTIFICATIONS_SEND] },
      { title: "Versions App", icon: Smartphone, url: "/app-versions", permission: Permission.AUTHORIZATION_MANAGE },
      { title: "Autorisations", icon: ShieldCheck, url: "/authorization", permission: Permission.AUTHORIZATION_MANAGE },
    ],
  },
];

const filterNavTree = (items: NavItem[], permissions: string[]): NavItem[] =>
  items
    .map((item) => {
      const children = item.children ? filterNavTree(item.children, permissions) : undefined;
      const isAllowed = hasAnyPermission(permissions, item.permission);
      if (children?.length) return { ...item, children };
      if (!item.children && isAllowed) return item;
      return null;
    })
    .filter((item): item is NavItem => Boolean(item));

const collectUrls = (item: NavItem): string[] =>
  item.children ? item.children.flatMap(collectUrls) : item.url ? [item.url] : [];

const containsPath = (item: NavItem, path: string) =>
  collectUrls(item).includes(path);

function SubLeaf({ item, currentPath }: { item: NavItem; currentPath: string }) {
  if (!item.url) {
    return (
      <SidebarMenuSubItem>
        <SidebarMenuSubButton asChild>
          <span aria-disabled className="cursor-default">
            <item.icon className="h-3.5 w-3.5" />
            <span>{item.title}</span>
            <span className="ml-auto rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
              à venir
            </span>
          </span>
        </SidebarMenuSubButton>
      </SidebarMenuSubItem>
    );
  }

  return (
    <SidebarMenuSubItem>
      <SidebarMenuSubButton asChild isActive={currentPath === item.url}>
        <NavLink to={item.url} end>
          <item.icon className="h-3.5 w-3.5" />
          <span>{item.title}</span>
          {item.badge && (
            <span className="ml-auto rounded bg-emerald-50 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-600">
              {item.badge}
            </span>
          )}
        </NavLink>
      </SidebarMenuSubButton>
    </SidebarMenuSubItem>
  );
}

// Second-level collapsible group (e.g. Concours), rendered inside a SidebarMenuSub.
function SubGroup({ item, currentPath }: { item: NavItem; currentPath: string }) {
  const hasActive = useMemo(() => containsPath(item, currentPath), [item, currentPath]);
  const [open, setOpen] = useState(hasActive);
  useEffect(() => {
    if (hasActive) setOpen(true);
  }, [hasActive]);

  return (
    <SidebarMenuSubItem>
      <Collapsible open={open} onOpenChange={setOpen}>
        <CollapsibleTrigger asChild>
          <SidebarMenuSubButton asChild>
            <button type="button" className="w-full">
              <item.icon className="h-3.5 w-3.5" />
              <span>{item.title}</span>
              <span className="ml-auto flex shrink-0 items-center gap-1.5">
                <span className="text-[10px] text-muted-foreground">
                  {item.children?.length}
                </span>
                <ChevronRight
                  className={cn("h-3.5 w-3.5 transition-transform", open && "rotate-90")}
                />
              </span>
            </button>
          </SidebarMenuSubButton>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <SidebarMenuSub>
            {item.children?.map((child) => (
              <SubLeaf key={child.title} item={child} currentPath={currentPath} />
            ))}
          </SidebarMenuSub>
        </CollapsibleContent>
      </Collapsible>
    </SidebarMenuSubItem>
  );
}

// Top-level collapsible group.
function TopGroup({ item, currentPath }: { item: NavItem; currentPath: string }) {
  const hasActive = useMemo(() => containsPath(item, currentPath), [item, currentPath]);
  const [open, setOpen] = useState(hasActive);
  useEffect(() => {
    if (hasActive) setOpen(true);
  }, [hasActive]);

  return (
    <Collapsible open={open} onOpenChange={setOpen} asChild>
      <SidebarMenuItem>
        <CollapsibleTrigger asChild>
          <SidebarMenuButton tooltip={item.title} className="font-medium">
            <item.icon className="h-4 w-4" />
            <span>{item.title}</span>
            <span className="ml-auto flex shrink-0 items-center gap-1.5">
              <span className="text-[10px] text-muted-foreground">
                {item.children?.length}
              </span>
              <ChevronRight
                className={cn("h-4 w-4 transition-transform", open && "rotate-90")}
              />
            </span>
          </SidebarMenuButton>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <SidebarMenuSub>
            {item.children?.map((child) =>
              child.children ? (
                <SubGroup key={child.title} item={child} currentPath={currentPath} />
              ) : (
                <SubLeaf key={child.title} item={child} currentPath={currentPath} />
              ),
            )}
          </SidebarMenuSub>
        </CollapsibleContent>
      </SidebarMenuItem>
    </Collapsible>
  );
}

export function AppSidebar() {
  const { state } = useSidebar();
  const location = useLocation();
  const currentPath = location.pathname;
  const { data: app } = useApp();
  const { permissions } = useAuth();
  const visibleNavTree = useMemo(() => filterNavTree(navTree, permissions), [permissions]);

  const brandName = app?.name ?? "Admin Panel";
  const Logo = () =>
    app?.logo ? (
      <img src={app.logo} alt={brandName} className="h-5 w-5 object-contain" />
    ) : (
      <BookOpen className="h-5 w-5 text-sidebar-primary-foreground" />
    );

  return (
    <Sidebar className={state === "collapsed" ? "w-14" : "w-64"} collapsible="icon">
      <SidebarHeader className="border-b border-sidebar-border p-4">
        {state !== "collapsed" && (
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-sidebar-primary overflow-hidden">
              <Logo />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-sidebar-foreground">{brandName}</h2>
              <p className="text-xs text-sidebar-foreground/60">Console d'administration</p>
            </div>
          </div>
        )}
        {state === "collapsed" && (
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-sidebar-primary overflow-hidden">
            <Logo />
          </div>
        )}
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {visibleNavTree.map((item) =>
                item.children ? (
                  <TopGroup key={item.title} item={item} currentPath={currentPath} />
                ) : (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton
                      asChild
                      isActive={currentPath === item.url}
                      tooltip={item.title}
                    >
                      <NavLink
                        to={item.url!}
                        end
                        className="hover:bg-sidebar-accent/50"
                        activeClassName="bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                      >
                        <item.icon className="h-4 w-4" />
                        <span>{item.title}</span>
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ),
              )}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
