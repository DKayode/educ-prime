import { LayoutDashboard, Users, BookOpen, Calendar, FileText, Settings, Building2, BookMarked, FolderOpen, Megaphone, CalendarDays, Briefcase, GraduationCap, UserCheck } from "lucide-react";
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

const academicItems = [
  { title: "Dashboard", url: "/", icon: LayoutDashboard },
  { title: "Utilisateurs", url: "/users", icon: Users },
  { title: "Établissements", url: "/etablissements", icon: Building2 },
  { title: "Filières", url: "/filieres", icon: BookOpen },
  { title: "Niveaux d'études", url: "/niveaux", icon: Calendar },
  { title: "Matières", url: "/matieres", icon: BookMarked },
  { title: "Épreuves", url: "/epreuves", icon: FileText },
  { title: "Ressources", url: "/ressources", icon: FolderOpen },
];

const publicContentItems = [
  { title: "Parcours", url: "/parcours", icon: BookOpen },
  { title: "Publicités", url: "/publicites", icon: Megaphone },
  { title: "Événements", url: "/evenements", icon: CalendarDays },
  { title: "Opportunités", url: "/opportunites", icon: Briefcase },
  { title: "Concours", url: "/concours", icon: GraduationCap },
  { title: "Contacts Pro", url: "/contacts-professionnels", icon: UserCheck },
];

const settingsItems = [
  { title: "Paramètres", url: "/settings", icon: Settings },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const location = useLocation();
  const currentPath = location.pathname;

  const isActive = (path: string) => currentPath === path;

  return (
    <Sidebar className={state === "collapsed" ? "w-14" : "w-64"} collapsible="icon">
      <SidebarHeader className="border-b border-sidebar-border p-4">
        {state !== "collapsed" && (
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-sidebar-primary">
              <BookOpen className="h-5 w-5 text-sidebar-primary-foreground" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-sidebar-foreground">Admin Panel</h2>
              <p className="text-xs text-sidebar-foreground/60">Épreuves d'examens</p>
            </div>
          </div>
        )}
        {state === "collapsed" && (
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-sidebar-primary">
            <BookOpen className="h-5 w-5 text-sidebar-primary-foreground" />
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
