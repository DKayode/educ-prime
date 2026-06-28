import { LayoutDashboard, Users, BookOpen, Calendar, FileText, Settings, Building2, BookMarked, Megaphone, CalendarDays, Briefcase, GraduationCap, UserCheck, Layers, Bell, Smartphone, MessageSquare, ClipboardList, UserPen, Wrench, Award } from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useLocation }
  from "react-router-dom";

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  useSidebar,
} from "@/components/ui/sidebar";
import { useApp } from "@/hooks/useApp";

const academicItems = [
  { title: "Dashboard", url: "/", icon: LayoutDashboard },
  { title: "Utilisateurs", url: "/users", icon: Users },
  { title: "Parrainages", url: "/parrainages", icon: Users },
  { title: "Établissements", url: "/etablissements", icon: Building2 },
  { title: "Filières", url: "/filieres", icon: BookOpen },
  { title: "Niveaux d'études", url: "/niveaux", icon: Calendar },
  { title: "Matières", url: "/matieres", icon: BookMarked },
  { title: "Épreuves", url: "/epreuves", icon: FileText },
  { title: "Forums", url: "/forums", icon: MessageSquare },
];

const publicContentItems = [
  { title: "Catégories", url: "/categories", icon: Layers },
  { title: "Parcours", url: "/parcours", icon: BookOpen },
  { title: "Publicités", url: "/publicites", icon: Megaphone },
  { title: "Événements", url: "/evenements", icon: CalendarDays },
  { title: "Opportunités", url: "/opportunites", icon: Briefcase },
  { title: "Concours", url: "/concours", icon: GraduationCap },
  { title: "Structures", url: "/structures", icon: Building2 },
  { title: "Titres", url: "/titres", icon: Award },
  { title: "Contacts Pro", url: "/contacts-professionnels", icon: UserCheck },
];

const jobkiaItems = [
  { title: "Recruteurs", url: "/admin/recruteurs", icon: UserPen },
  { title: "Services", url: "/admin/services", icon: ClipboardList },
  { title: "Offres", url: "/admin/offres", icon: ClipboardList },
  { title: "Types (Services, Offres)", url: "/admin/service-types", icon: Layers },
  { title: "Compétences", url: "/admin/competences", icon: Wrench },
];

const settingsItems = [
  { title: "Paramètres", url: "/settings", icon: Settings },
  { title: "Notifications", url: "/notifications", icon: Bell },
  { title: "Versions App", url: "/app-versions", icon: Smartphone },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const location = useLocation();
  const currentPath = location.pathname;
  const { data: app } = useApp();

  const isActive = (path: string) => currentPath === path;

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
          <SidebarGroupLabel>Contenu Académique</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {academicItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild isActive={isActive(item.url)}>
                    <NavLink
                      to={item.url}
                      end
                      className="hover:bg-sidebar-accent/50"
                      activeClassName="bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                    >
                      <item.icon className="h-4 w-4" />
                      {state !== "collapsed" && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>Contenu Public</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {publicContentItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild isActive={isActive(item.url)}>
                    <NavLink
                      to={item.url}
                      end
                      className="hover:bg-sidebar-accent/50"
                      activeClassName="bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                    >
                      <item.icon className="h-4 w-4" />
                      {state !== "collapsed" && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>Jobkia</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {jobkiaItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild isActive={isActive(item.url)}>
                    <NavLink
                      to={item.url}
                      end
                      className="hover:bg-sidebar-accent/50"
                      activeClassName="bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                    >
                      <item.icon className="h-4 w-4" />
                      {state !== "collapsed" && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>Système</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {settingsItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild isActive={isActive(item.url)}>
                    <NavLink
                      to={item.url}
                      end
                      className="hover:bg-sidebar-accent/50"
                      activeClassName="bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                    >
                      <item.icon className="h-4 w-4" />
                      {state !== "collapsed" && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
