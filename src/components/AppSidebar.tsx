import { useState } from 'react'; // Tambahkan import useState
import { NavLink } from '@/components/NavLink';
import { useAuth } from '@/hooks/useAuth';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from '@/components/ui/sidebar';
import { 
  LayoutDashboard, 
  Upload, 
  Archive, 
  Shield, 
  FileText, 
  LogOut,
  User,
  Info
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ConfirmDialog'; // Tambahkan import ConfirmDialog

const mainItems = [
  { title: 'Dashboard', url: '/', icon: LayoutDashboard },
  { title: 'Upload Dokumen', url: '/upload', icon: Upload, roles: ['administrator', 'umum'] },
  { title: 'Arsip Dokumen', url: '/archive', icon: Archive },
  { title: 'About', url: '/about', icon: Info }
];

const adminItems = [
  { title: 'Admin Panel', url: '/admin', icon: Shield },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === 'collapsed';
  
  const { employee, logout } = useAuth();
  
  // State untuk mengontrol pop-up konfirmasi logout
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  const visibleMainItems = mainItems.filter((item) => {
    if (!item.roles) return true;
    return employee && item.roles.includes(employee.role);
  });

  const showAdmin = employee?.role === 'administrator';

  return (
    <>
      <Sidebar 
        collapsible="icon" 
        className={cn(
          "border-none bg-transparent transition-all duration-300",
          collapsed ? "p-0" : "p-4"
        )}
      >
        <div className={cn(
          "flex h-full flex-col overflow-hidden transition-all duration-300",
          "outline border border-border/50 bg-card shadow-2xl shadow-black/5",
        )}>
          
          {/* LOGO SECTION */}
          <SidebarHeader className={cn("transition-all", collapsed ? "p-4" : "p-6")}>
            <div className={cn(
              "flex items-center gap-3",
              collapsed ? "justify-center" : "justify-start"
            )}>
              <div className="w-9 h-9 rounded-xl bg-foreground flex items-center justify-center shrink-0 shadow-lg">
                <FileText className="w-5 h-5 text-background" />
              </div>
              {!collapsed && (
                <div className="flex flex-col animate-in fade-in slide-in-from-left-2 duration-500">
                  <span className="text-sm font-black tracking-tight whitespace-nowrap">
                      DIGITAL ARCHIVE
                  </span>
                </div>
              )}
            </div>
          </SidebarHeader>

          <SidebarContent className={cn("transition-all", collapsed ? "px-1" : "px-4")}>
            <SidebarGroup className="p-0">
              {!collapsed && (
                <SidebarGroupLabel className="text-[11px] font-bold uppercase tracking-[0.2em] text-foreground/40 px-2 mb-4 mt-2">
                  Menu
                </SidebarGroupLabel>
              )}
              <SidebarGroupContent>
                <SidebarMenu className="gap-2">
                  {visibleMainItems.map((item) => (
                    <SidebarMenuItem key={item.title}>
                      <SidebarMenuButton asChild tooltip={item.title} className="h-auto p-0">
                        <NavLink 
                          to={item.url} 
                          end 
                          className={cn(
                            "flex items-center transition-all duration-200 text-muted-foreground hover:text-foreground hover:bg-muted",
                            collapsed 
                              ? "justify-center h-12 w-12 mx-auto rounded-xl" 
                              : "gap-3 px-4 py-6 rounded-2xl w-full"
                          )}
                          activeClassName={cn(
                            "bg-foreground text-background font-bold shadow-xl shadow-foreground/10",
                            collapsed ? "rounded-xl" : "rounded-2xl"
                          )}
                        >
                          <item.icon className="h-5 w-5 shrink-0" />
                          {!collapsed && (
                            <span className="text-sm tracking-tight whitespace-nowrap animate-in fade-in">
                              {item.title}
                            </span>
                          )}
                        </NavLink>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>

            {showAdmin && (
              <SidebarGroup className={cn("transition-all", collapsed ? "mt-4" : "mt-8")}>
                {!collapsed && (
                  <SidebarGroupLabel className="text-[11px] font-bold uppercase tracking-[0.2em] text-foreground/40 px-2 mb-4">
                    System
                  </SidebarGroupLabel>
                )}
                <SidebarGroupContent>
                  <SidebarMenu className="gap-2">
                    {adminItems.map((item) => (
                      <SidebarMenuItem key={item.title}>
                        <SidebarMenuButton asChild tooltip={item.title} className="h-auto p-0">
                          <NavLink 
                            to={item.url} 
                            end 
                            className={cn(
                              "flex items-center transition-all duration-200 text-muted-foreground hover:text-foreground hover:bg-muted",
                              collapsed 
                                ? "justify-center h-12 w-12 mx-auto rounded-xl" 
                                : "gap-3 px-4 py-6 rounded-2xl w-full"
                            )}
                            activeClassName="bg-foreground text-background font-bold shadow-xl shadow-foreground/10"
                          >
                            <item.icon className="h-5 w-5 shrink-0" />
                            {!collapsed && (
                              <span className="text-sm tracking-tight whitespace-nowrap animate-in fade-in">
                                {item.title}
                              </span>
                            )}
                          </NavLink>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    ))}
                  </SidebarMenu>
                </SidebarGroupContent>
              </SidebarGroup>
            )}
          </SidebarContent>

          <SidebarFooter className={cn("transition-all", collapsed ? "p-2" : "p-4")}>
            <div className={cn(
              "flex flex-col gap-3 rounded-3xl border border-border/50 bg-muted/30 transition-all duration-300",
              collapsed ? "items-center p-2" : "p-4"
            )}>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-foreground/10 border border-foreground/10 flex items-center justify-center shrink-0">
                  <User className="w-4 h-4 text-foreground/60" />
                </div>
                {!collapsed && (
                  <div className="flex flex-col min-w-0 flex-1 overflow-hidden animate-in fade-in">
                    <p className="text-[11px] font-bold truncate text-foreground">
                      {employee?.name || 'User'}
                    </p>
                    <p className="text-[9px] font-medium text-muted-foreground uppercase truncate">
                      {employee?.role || 'Admin'}
                    </p>
                  </div>
                )}
              </div>
              
              <Button 
                variant="ghost" 
                size="sm" 
                className={cn(
                  "transition-all duration-200 font-bold",
                  collapsed 
                    ? "h-10 w-10 p-0 rounded-xl" 
                    : "w-full justify-start h-10 px-3 rounded-xl text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                )}
                // PERUBAHAN: Membuka dialog konfirmasi saat diklik
                onClick={() => setShowLogoutConfirm(true)}
              >
                <LogOut className={cn("h-4 w-4", !collapsed && "mr-2")} />
                {!collapsed && <span className="text-xs uppercase tracking-wider font-black">Sign Out</span>}
              </Button>
            </div>
          </SidebarFooter>
        </div>
      </Sidebar>

      {/* KOMPONEN POP-UP KONFIRMASI LOGOUT */}
      <ConfirmDialog
        open={showLogoutConfirm}
        onOpenChange={setShowLogoutConfirm}
        title="Konfirmasi Sign Out"
        description="Apakah Anda yakin ingin keluar dari sistem ?"
        confirmLabel="Ya, Keluar"
        variant="destructive" // Menggunakan warna merah (destructive) untuk aksi logout
        onConfirm={async () => {
          setShowLogoutConfirm(false);
          await logout?.();
        }}
      />
    </>
  );
}