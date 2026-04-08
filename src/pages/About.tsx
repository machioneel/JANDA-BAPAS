import { useState } from 'react';
import { 
  FileText, 
  Shield, 
  Info, 
  Server, 
  Cpu, 
  Zap, 
  Database, 
  Lock, 
  Fingerprint,
  CheckCircle2,
  BrainCircuit
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';

// Data spesifikasi teknis untuk grid dan popup
const techSpecs = [
  { 
    id: "storage",
    label: "Storage", 
    val: "Cloud Native", 
    icon: <Database className="w-5 h-5" />,
    iconLarge: <Database className="w-8 h-8 text-foreground" />,
    title: "Cloud Native Storage",
    description: "Sistem penyimpanan arsip dibangun di atas arsitektur cloud modern untuk memastikan ketersediaan dan integritas data secara terus-menerus.",
    details: [
      "Menggunakan Supabase PostgreSQL sebagai basis data relasional terpusat.",
      "Penyimpanan berkas fisik (PDF/DOCX) menggunakan S3-compatible storage buckets.",
      "Penerapan replikasi data real-time untuk mencegah kehilangan data (Data Loss Prevention).",
      "Skalabilitas otomatis untuk menampung volume arsip yang terus bertambah."
    ]
  },
  { 
    id: "processing",
    label: "Processing", 
    val: "AI-Augmented", 
    icon: <Cpu className="w-5 h-5" />,
    iconLarge: <Cpu className="w-8 h-8 text-foreground" />,
    title: "AI-Augmented Processing",
    description: "Inti dari kecerdasan JANDA BAPAS, memanfaatkan teknologi Artificial Intelligence untuk mengotomatisasi pekerjaan administratif.",
    details: [
      "Ekstraksi metadata dokumen cerdas (Nomor Surat, Perihal, Tanggal, Pengirim).",
      "Parsing dan pemrosesan teks dari format PDF maupun DOCX secara asinkron.",
      "Pengurangan human-error hingga 95% dibandingkan input data manual.",
      "Algoritma pembacaan dokumen yang dioptimalkan untuk format persuratan dinas."
    ]
  },
  { 
    id: "network",
    label: "Network", 
    val: "Secure-Tunnel", 
    icon: <Zap className="w-5 h-5" />,
    iconLarge: <Zap className="w-8 h-8 text-foreground" />,
    title: "Secure-Tunnel Network",
    description: "Infrastruktur jaringan dirancang dengan protokol keamanan ketat untuk melindungi transmisi data arsip rahasia negara.",
    details: [
      "Transmisi data dilindungi oleh enkripsi End-to-End menggunakan standar TLS/SSL.",
      "Penerapan Row Level Security (RLS) untuk membatasi akses data pada level database.",
      "Sistem otentikasi sesi (Session-based Authentication) dengan token yang aman.",
      "Proteksi terhadap serangan siber umum seperti SQL Injection dan XSS."
    ]
  },
  { 
    id: "environment",
    label: "Environment", 
    val: "Encrypted", 
    icon: <Server className="w-5 h-5" />,
    iconLarge: <Server className="w-8 h-8 text-foreground" />,
    title: "Encrypted Environment",
    description: "Lingkungan server dan aplikasi diisolasi serta dienkripsi untuk memenuhi standar kepatuhan keamanan data tingkat tinggi.",
    details: [
      "Data at rest dienkripsi menggunakan algoritma standar industri (AES-256).",
      "Manajemen variabel lingkungan (Environment Variables) yang diisolasi dengan ketat.",
      "Pencatatan jejak audit (Audit Logging) yang permanen untuk setiap tindakan pengguna.",
      "Infrastruktur di-host pada server yang mematuhi standar privasi data global."
    ]
  }
];

export default function AboutPage() {
  // State untuk mengontrol popup
  const [selectedSpec, setSelectedSpec] = useState<typeof techSpecs[0] | null>(null);

  return (
    <div className="flex flex-col gap-8 p-8 animate-in fade-in duration-500 max-w-7xl mx-auto">
      
      {/* HEADER SECTION */}
      <div className="border-b border-border pb-6 flex justify-between items-end">
        <div>
          <h1 className="text-4xl font-black uppercase tracking-tight text-foreground leading-none">
            About System
          </h1>
          <p className="text-muted-foreground text-xs uppercase tracking-[0.2em] font-bold mt-2">
            Centralized Records Management System v3.0
          </p>
        </div>
        <div className="hidden md:block opacity-20">
           <BrainCircuit className="w-10 h-10 text-foreground" />
        </div>
      </div>

      {/* CORE INFO GRID */}
      <div className="grid gap-8 md:grid-cols-3">
        
         {/* Deskripsi Utama JANDA BAPAS */}
        <div className="md:col-span-2 p-8 bg-card rounded-[2rem] border border-border/50 shadow-xl shadow-black/[0.03]">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-14 h-14 rounded-2xl bg-foreground flex items-center justify-center shrink-0 shadow-lg shadow-foreground/20">
              <FileText className="text-background w-7 h-7" />
            </div>
            <div>
              <h2 className="text-2xl font-black tracking-tight text-foreground uppercase">JANDA BAPAS</h2>
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground italic">Intelligent Archiving System</p>
            </div>
          </div>
          
          <div className="space-y-4">
            <p className="text-base leading-relaxed text-foreground/90 font-medium text-justify">
              <span className="font-bold text-foreground">JANDA BAPAS (Jaringan Arsip Naskah Digital Administrasi Balai Pemasyarakatan)</span> adalah sistem arsip digital berbasis web yang dirancang untuk mengelola seluruh dokumen persuratan administrasi secara terpusat, terstruktur, dan efisien.
            </p>
            
            <div className="bg-muted/50 p-6 rounded-2xl border border-border/40 my-6 italic border-l-4 border-l-foreground">
               "Keunggulan utama sistem ini terletak pada pemanfaatan <span className="font-bold text-foreground">teknologi AI</span> untuk mengekstraksi metadata secara otomatis dari dokumen, meminimalisir kesalahan input manual dan mempercepat birokrasi."
            </div>

            <p className="text-sm leading-relaxed text-muted-foreground font-medium text-justify">
              Melalui sistem ini, pengguna dapat mengunggah berbagai jenis surat seperti nota dinas, surat pemberitahuan, dan dokumen administratif lainnya dalam format <span className="font-bold">PDF atau DOCX</span>. Sistem cerdas ini akan menganalisis isi dokumen untuk mengidentifikasi informasi penting seperti nomor surat, tanggal, perihal, pengirim, dan penerima secara otomatis.
            </p>
          </div>
        </div>

        {/* Security / Identity Card */}
        <div className="p-8 bg-muted/30 rounded-[2rem] border border-border/50 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 rounded-xl bg-background border border-border shadow-sm">
                <Shield className="w-6 h-6 text-foreground" />
              </div>
              <h2 className="text-xl font-black tracking-tight text-foreground uppercase">Security</h2>
            </div>
            <ul className="space-y-4">
              {[
                { icon: <Lock className="w-4 h-4" />, text: "End-to-End Encryption" },
                { icon: <Fingerprint className="w-4 h-4" />, text: "Multi-Role Access Control" },
                { icon: <Database className="w-4 h-4" />, text: "Redundant Storage Backup" },
                { icon: <Server className="w-4 h-4" />, text: "Audit Log Integrity" }
              ].map((item, i) => (
                <li key={i} className="flex items-center gap-3">
                  <div className="bg-foreground w-7 h-7 rounded-lg flex items-center justify-center text-background shadow-sm shadow-foreground/20">
                    {item.icon}
                  </div>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-foreground/80">{item.text}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="mt-8 pt-4 border-t border-border/50">
             <p className="text-[10px] font-bold uppercase opacity-40 italic text-center tracking-widest text-muted-foreground">Certified Internal Protocol</p>
          </div>
        </div>
      </div>

      {/* TECH STACK / SYSTEM SPECS: GRID 4 COLUMNS */}
      <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
         {techSpecs.map((stat) => (
           <div 
             key={stat.id} 
             onClick={() => setSelectedSpec(stat)}
             className="bg-background border border-border/60 p-5 rounded-2xl flex flex-col items-center justify-center text-center transition-all hover:bg-muted/50 group shadow-sm hover:shadow-md cursor-pointer active:scale-95"
           >
              <div className="mb-3 text-muted-foreground group-hover:text-foreground group-hover:scale-110 transition-all duration-300">
                {stat.icon}
              </div>
              <p className="text-[8px] font-black uppercase tracking-[0.2em] opacity-40 mb-1 leading-none">{stat.label}</p>
              <p className="text-[10px] font-bold uppercase text-foreground leading-none">{stat.val}</p>
           </div>
         ))}
      </div>

      {/* FOOTER INFO */}
      <div className="mt-auto pt-8">
        <div className="flex flex-col md:flex-row justify-between items-center gap-4 border-t border-border/50 pt-6">
          <div className="flex items-center gap-4 text-muted-foreground">
            <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center border border-border">
                <Info className="w-5 h-5 text-foreground" />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest leading-none text-foreground/80">
                Official Release v3.0.4-Stable
              </p>
              <p className="text-[9px] font-bold uppercase tracking-widest mt-1 opacity-50">
                © 2026 Balai Pemasyarakatan Kelas I Jakarta Barat
              </p>
              <p className="text-[10px] font-black uppercase tracking-widest leading-none text-foreground/50 mt-1">
                Made by Agung Prastyo
              </p>
            </div>
          </div>
          <div className="bg-muted px-5 py-2 rounded-full border border-border shadow-inner">
             <span className="text-[9px] font-black uppercase tracking-[0.3em] text-muted-foreground">Classified System</span>
          </div>
        </div>
      </div>

      {/* DIALOG / POPUP UNTUK TECH SPECS */}
      <Dialog open={!!selectedSpec} onOpenChange={(open) => !open && setSelectedSpec(null)}>
        <DialogContent className="sm:max-w-md rounded-3xl border-border/50 shadow-2xl p-0 overflow-hidden bg-background">
          {selectedSpec && (
            <>
              <DialogHeader className="p-6 pb-4 border-b border-border/50 bg-muted/20">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-background border border-border shadow-sm flex items-center justify-center shrink-0">
                    {selectedSpec.iconLarge}
                  </div>
                  <div>
                    <DialogTitle className="text-xl font-black uppercase tracking-tight text-foreground">
                      {selectedSpec.title}
                    </DialogTitle>
                    <DialogDescription className="text-[10px] font-bold uppercase tracking-widest mt-1">
                      {selectedSpec.label} Protocol
                    </DialogDescription>
                  </div>
                </div>
              </DialogHeader>
              
              <div className="p-6 space-y-6">
                <p className="text-sm font-medium text-muted-foreground leading-relaxed">
                  {selectedSpec.description}
                </p>
                
                <div className="space-y-3">
                  <p className="text-[10px] font-black uppercase tracking-widest text-foreground/50 mb-2">Key Specifications:</p>
                  <ul className="space-y-3">
                    {selectedSpec.details.map((detail, idx) => (
                      <li key={idx} className="flex items-start gap-3">
                        <CheckCircle2 className="w-4 h-4 text-foreground shrink-0 mt-0.5" />
                        <span className="text-xs font-semibold leading-snug text-foreground/80">{detail}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

    </div>
  );
}