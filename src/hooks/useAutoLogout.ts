import { useEffect, useRef, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

// Atur waktu timeout (30 menit dalam milidetik)
const TIMEOUT_MS = 30 * 60 * 1000; 

export function useAutoLogout() {
  const { user, logout } = useAuth();
  
  // PERBAIKAN: Menggunakan ReturnType bawaan browser agar tidak error NodeJS
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const performLogout = useCallback(async () => {
    if (logout) {
      await logout();
      toast.info('Sesi Anda telah berakhir secara otomatis karena tidak ada aktivitas.');
    }
  }, [logout]);

  const resetTimer = useCallback(() => {
    // Bersihkan timer yang lama
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    
    // Hanya jalankan timer jika ada user yang sedang login
    if (user) {
      timeoutRef.current = setTimeout(() => {
        performLogout();
      }, TIMEOUT_MS);
    }
  }, [user, performLogout]);

  useEffect(() => {
    // Jika tidak ada user login, hentikan proses
    if (!user) return;

    // Daftar event yang dianggap sebagai "Aktivitas"
    const activityEvents = [
      'mousemove',
      'mousedown',
      'keydown',
      'touchstart',
      'scroll',
      'click'
    ];

    // Jalankan timer pertama kali
    resetTimer();

    // Fungsi untuk mereset timer saat ada aktivitas
    const handleActivity = () => {
      resetTimer();
    };

    // Daftarkan event listener ke window
    activityEvents.forEach(event => {
      window.addEventListener(event, handleActivity);
    });

    // Cleanup saat komponen di-unmount atau user logout
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      activityEvents.forEach(event => {
        window.removeEventListener(event, handleActivity);
      });
    };
  }, [user, resetTimer]);
}