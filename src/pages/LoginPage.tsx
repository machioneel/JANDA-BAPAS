import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Lock, User, RefreshCw } from 'lucide-react';

export default function LoginPage() {
  const { loginWithNip } = useAuth();
  const [nip, setNip] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // State untuk CAPTCHA Numerik
  const [captchaCode, setCaptchaCode] = useState('');
  const [userCaptchaInput, setUserCaptchaInput] = useState('');

  // Kondisi untuk memunculkan CAPTCHA (hanya jika NIP dan Password sudah diisi)
  const showCaptcha = nip.length > 0 && password.length > 0;

  const refreshCaptcha = () => {
    setCaptchaCode(Math.floor(1000 + Math.random() * 9000).toString());
    setUserCaptchaInput(''); // Kosongkan input CAPTCHA
  };

  useEffect(() => {
    refreshCaptcha();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // 1. Validasi CAPTCHA dieksekusi pertama kali
    if (userCaptchaInput !== captchaCode) {
      setError('Kode keamanan salah. Seluruh isian telah direset.');
      setNip(''); // Kosongkan NIP
      setPassword(''); // Kosongkan Password
      refreshCaptcha(); // Acak ulang CAPTCHA
      return;
    }

    // 2. Proses validasi NIP & Password ke database
    setLoading(true);
    try {
      await loginWithNip(nip, password);
    } catch (err: any) {
      setError(err.message || 'Kredensial tidak valid. Seluruh isian telah direset.');
      setNip(''); // Kosongkan NIP
      setPassword(''); // Kosongkan Password
      refreshCaptcha(); // Acak ulang CAPTCHA jika login gagal
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <Card className="w-full max-w-md mx-4 border-border shadow-lg transition-all duration-500">
        <CardHeader className="text-center space-y-2 pb-2">
          <div className="mx-auto w-16 h-16 rounded-lg bg-secondary flex items-center justify-center mb-2">
            <Lock className="w-8 h-8 text-secondary-foreground" />
          </div>
          <CardTitle className="text-2xl font-bold text-foreground">DIGITAL ARCHIVE</CardTitle>
          <p className="text-sm text-muted-foreground">
            Jaringan Arsip Naskah Digital Administrasi
          </p>
          <p className="text-xs text-muted-foreground">Balai Pemasyarakatan</p>
        </CardHeader>
        
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="nip">NIP</Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="nip"
                  type="text"
                  placeholder="Masukkan NIP"
                  value={nip}
                  onChange={(e) => setNip(e.target.value)}
                  className="pl-10"
                  required
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="password"
                  type="password"
                  placeholder="Masukkan password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10"
                  required
                />
              </div>
            </div>

            {/* Bagian CAPTCHA Lokal - Muncul secara dinamis */}
            <div className={`space-y-2 pt-2 transition-all duration-500 overflow-hidden ${showCaptcha ? 'max-h-40 opacity-100' : 'max-h-0 opacity-0'}`}>
              <Label>Kode Keamanan</Label>
              <div className="flex gap-3">
                <div className="flex-1 flex items-center justify-between border rounded-md bg-muted/30 px-4 h-10 select-none">
                  <span className="text-lg font-bold tracking-[0.5em] text-foreground pointer-events-none line-through decoration-muted-foreground/40">
                    {captchaCode}
                  </span>
                  <Button 
                    type="button" 
                    variant="ghost" 
                    size="sm" 
                    className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
                    onClick={refreshCaptcha}
                    title="Muat ulang kode"
                    tabIndex={showCaptcha ? 0 : -1}
                  >
                    <RefreshCw className="w-4 h-4" />
                  </Button>
                </div>
                
                <Input 
                  type="text" 
                  maxLength={4}
                  value={userCaptchaInput} 
                  onChange={(e) => {
                    const val = e.target.value.replace(/[^0-9]/g, '');
                    setUserCaptchaInput(val);
                  }} 
                  className="w-24 text-center font-bold tracking-widest h-10"
                  placeholder="----"
                  required={showCaptcha}
                  tabIndex={showCaptcha ? 0 : -1}
                />
              </div>
            </div>

            {error && (
              <p className="text-sm text-destructive">{error}</p>
            )}
            
            <Button 
              type="submit" 
              className="w-full mt-2" 
              disabled={loading || (showCaptcha && userCaptchaInput.length !== 4)}
            >
              {loading ? 'Memproses...' : 'Masuk'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}