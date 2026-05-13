import { useAuth } from '@/hooks/useAuth';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { ThemeToggle } from '@/components/ThemeToggle';

export function AppTopbar() {
  const { employee } = useAuth();

  return (
    <header className="h-14 border-b border-border bg-card flex items-center justify-between px-4 shrink-0">
      {/* Bagian Kiri: Trigger Sidebar dan Judul */}
      <div className="flex items-center gap-3">
        <SidebarTrigger />
        <span className="text-sm font-black tracking-tighter text-foreground hidden sm:inline">
          DIGITAL ARCHIVE
        </span>
      </div>

      {/* Bagian Kanan: Hanya Theme Toggle */}
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-2 text-sm text-muted-foreground mr-2">
          {/* Label Role tetap dipertahankan jika Anda ingin info minimalis, 
              namun jika ingin benar-benar bersih, baris di bawah ini bisa dihapus */}
          <span className="text-[10px] bg-muted text-muted-foreground px-2 py-0.5 border border-border font-bold uppercase tracking-wider">
            {employee?.role || ''}
          </span>
        </div>
        <ThemeToggle />
      </div>
    </header>
  );
}