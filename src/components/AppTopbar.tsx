import { useAuth } from '@/hooks/useAuth';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import { ThemeToggle } from '@/components/ThemeToggle';
import { LogOut, User } from 'lucide-react';
import { toast } from 'sonner';
import { useState } from 'react';
import { ConfirmDialog } from '@/components/ConfirmDialog';

export function AppTopbar() {
  const { employee, logout } = useAuth();
  const [showLogout, setShowLogout] = useState(false);

  const handleLogout = () => {
    logout();
    toast.success('Berhasil keluar dari sistem');
  };

  return (
    <>
      <header className="h-14 border-b border-border bg-card flex items-center justify-between px-4 shrink-0">
        <div className="flex items-center gap-3">
          <SidebarTrigger />
          <span className="text-sm font-semibold text-foreground hidden sm:inline">JANDA BAPAS</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <User className="w-4 h-4" />
            <span className="hidden sm:inline">{employee?.name || 'Pengguna'}</span>
            <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full font-medium">{employee?.role || ''}</span>
          </div>
          <ThemeToggle />
          <Button variant="ghost" size="sm" onClick={() => setShowLogout(true)} title="Keluar">
            <LogOut className="w-4 h-4" />
          </Button>
        </div>
      </header>

      <ConfirmDialog
        open={showLogout}
        onOpenChange={setShowLogout}
        title="Keluar dari Sistem"
        description="Apakah Anda yakin ingin keluar?"
        confirmLabel="Keluar"
        variant="destructive"
        onConfirm={handleLogout}
      />
    </>
  );
}
