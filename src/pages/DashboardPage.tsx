import { useState, useMemo } from 'react';
import { useDocuments } from '@/hooks/useDocuments';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FileText, Activity, PieChart, BarChart3, Clock, ArrowRight, TrendingUp, Calendar, FileSearch, Users } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  AreaChart, 
  Area 
} from 'recharts';

export default function DashboardPage() {
  const { data, isLoading } = useDocuments({ pageSize: 1000, type: 'incoming' });
  const documents = data?.documents || [];
  
  // State untuk Filter Grafik
  const [timeFilter, setTimeFilter] = useState<'default' | 'monthly' | 'yearly'>('default');

  // ==========================================
  // PERHITUNGAN RINGKASAN (SUMMARY)
  // ==========================================
  const totalDocs = documents.length;
  const umumDocs = documents.filter(d => d.category === 'Umum').length;
  const permintaanDocs = documents.filter(d => d.category === 'Permintaan').length;

  const categoryCounts = documents.reduce((acc, doc) => {
    const cat = doc.category || 'Tanpa Kategori';
    acc[cat] = (acc[cat] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const sortedCategories = Object.entries(categoryCounts)
    .sort(([, a], [, b]) => b - a);

  const topCategory = sortedCategories.length > 0 ? sortedCategories[0][0] : '-';
  
  const recentDocuments = [...documents]
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 5);

  // ==========================================
  // LOGIKA GRAFIK TREN DINAMIS
  // ==========================================
  const chartData = useMemo(() => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
    
    if (timeFilter === 'default') {
      const last6Months = [];
      for (let i = 5; i >= 0; i--) {
        const d = new Date();
        d.setMonth(d.getMonth() - i);
        last6Months.push({
          label: months[d.getMonth()],
          monthIdx: d.getMonth(),
          year: d.getFullYear(),
          Total: 0, Umum: 0, Permintaan: 0
        });
      }

      documents.forEach(doc => {
        const dateSource = new Date(doc.letter_date || doc.created_at);
        if (isNaN(dateSource.getTime())) return;
        const match = last6Months.find(m => m.monthIdx === dateSource.getMonth() && m.year === dateSource.getFullYear());
        if (match) {
          match.Total++;
          if (doc.category === 'Umum') match.Umum++;
          if (doc.category === 'Permintaan') match.Permintaan++;
        }
      });
      return last6Months;
    }

    if (timeFilter === 'monthly') {
      const currentYear = new Date().getFullYear();
      const yearData = months.map((m, idx) => ({
        label: m, monthIdx: idx, Total: 0, Umum: 0, Permintaan: 0
      }));

      documents.forEach(doc => {
        const dateSource = new Date(doc.letter_date || doc.created_at);
        if (dateSource.getFullYear() === currentYear) {
          const match = yearData[dateSource.getMonth()];
          match.Total++;
          if (doc.category === 'Umum') match.Umum++;
          if (doc.category === 'Permintaan') match.Permintaan++;
        }
      });
      return yearData;
    }

    if (timeFilter === 'yearly') {
      const currentYear = new Date().getFullYear();
      const yearlyData = [];
      for (let i = 4; i >= 0; i--) {
        yearlyData.push({ label: (currentYear - i).toString(), year: currentYear - i, Total: 0, Umum: 0, Permintaan: 0 });
      }

      documents.forEach(doc => {
        const dateSource = new Date(doc.letter_date || doc.created_at);
        const match = yearlyData.find(y => y.year === dateSource.getFullYear());
        if (match) {
          match.Total++;
          if (doc.category === 'Umum') match.Umum++;
          if (doc.category === 'Permintaan') match.Permintaan++;
        }
      });
      return yearlyData;
    }

    return [];
  }, [documents, timeFilter]);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48 mb-6" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-32 w-full rounded-xl" />)}
        </div>
        <Skeleton className="h-[400px] w-full rounded-xl" />
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in pb-8">
      {/* Header Dashboard */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
            <Activity className="w-8 h-8 text-primary" /> 
            Dashboard Surat Masuk
          </h1>
          <p className="text-muted-foreground mt-1">Analisis arsip berdasarkan kategori unit dan periode waktu.</p>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/50 px-3 py-1.5 rounded-lg border">
          <Clock className="w-4 h-4" />
          Update: {new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
        </div>
      </div>

      {/* 1. KARTU RANGKUMAN (SUMMARY) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-border shadow-sm hover:shadow-md transition-all">
          <CardContent className="p-6 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
              <FileText className="w-6 h-6 text-primary" />
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Total Surat Masuk</p>
              <h3 className="text-3xl font-bold text-foreground">{totalDocs}</h3>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border shadow-sm hover:shadow-md transition-all">
          <CardContent className="p-6 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-blue-500/10 flex items-center justify-center shrink-0">
              <Users className="w-6 h-6 text-blue-500" />
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Kategori Umum</p>
              <h3 className="text-3xl font-bold text-foreground">{umumDocs}</h3>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border shadow-sm hover:shadow-md transition-all">
          <CardContent className="p-6 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-green-500/10 flex items-center justify-center shrink-0">
              <FileSearch className="w-6 h-6 text-green-500" />
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Permintaan</p>
              <h3 className="text-3xl font-bold text-foreground">{permintaanDocs}</h3>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border shadow-sm hover:shadow-md transition-all">
          <CardContent className="p-6 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-orange-500/10 flex items-center justify-center shrink-0">
              <PieChart className="w-6 h-6 text-orange-500" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium text-muted-foreground">Dominasi Kategori</p>
              <h3 className="text-xl font-bold text-foreground truncate" title={topCategory}>{topCategory}</h3>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 2. GRAFIK INFOGRAFIS (TREN DENGAN FILTER) */}
      <Card className="border-border shadow-md overflow-hidden bg-card/50 backdrop-blur">
        <CardHeader className="border-b bg-muted/20">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <CardTitle className="text-xl flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-primary" />
                Tren Volume Surat Masuk
              </CardTitle>
              <CardDescription>
                {timeFilter === 'default' && "Volume dokumen 6 bulan terakhir"}
                {timeFilter === 'monthly' && `Statistik bulanan tahun ${new Date().getFullYear()}`}
                {timeFilter === 'yearly' && "Statistik perbandingan tahunan"}
              </CardDescription>
            </div>
            
            <div className="flex items-center gap-2 bg-background border rounded-lg p-1">
              <Calendar className="w-4 h-4 ml-2 text-muted-foreground" />
              <Select value={timeFilter} onValueChange={(v: any) => setTimeFilter(v)}>
                <SelectTrigger className="w-[160px] border-none shadow-none focus:ring-0 h-8 text-xs font-medium">
                  <SelectValue placeholder="Pilih Periode" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="default">6 Bulan Terakhir</SelectItem>
                  <SelectItem value="monthly">Tahun Ini (Bulanan)</SelectItem>
                  <SelectItem value="yearly">5 Tahun Terakhir</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="h-[320px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="gradTotal" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--muted-foreground))" opacity={0.1} />
                <XAxis 
                  dataKey="label" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{fill: 'hsl(var(--muted-foreground))', fontSize: 12}} 
                  dy={10} 
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{fill: 'hsl(var(--muted-foreground))', fontSize: 12}} 
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--card))', 
                    border: '1px solid hsl(var(--border))', 
                    borderRadius: '12px',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.1)' 
                  }}
                />
                <Area 
                  type="monotone" 
                  dataKey="Total" 
                  stroke="hsl(var(--primary))" 
                  strokeWidth={3} 
                  fillOpacity={1} 
                  fill="url(#gradTotal)" 
                  name="Total"
                />
                <Area type="monotone" dataKey="Umum" stroke="#3b82f6" fill="transparent" strokeWidth={2} strokeDasharray="4 4" name="Kategori Umum" />
                <Area type="monotone" dataKey="Permintaan" stroke="#22c55e" fill="transparent" strokeWidth={2} strokeDasharray="4 4" name="Permintaan Litmas/Data" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <div className="flex flex-wrap justify-center gap-6 mt-6 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-primary" /> Total Masuk
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-blue-500" /> Kategori Umum
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-green-500" /> Permintaan
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 3. SEBARAN KATEGORI */}
        <Card className="border-border shadow-sm">
          <CardHeader className="pb-2 border-b mb-4">
            <CardTitle className="text-lg flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-primary" /> Distribusi 4 Kategori Utama
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            {sortedCategories.map(([category, count]) => {
              const perc = totalDocs > 0 ? Math.round((count / totalDocs) * 100) : 0;
              return (
                <div key={category} className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="font-semibold">{category}</span>
                    <span className="text-muted-foreground">{count} Surat ({perc}%)</span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-2.5 overflow-hidden">
                    <div 
                      className="bg-primary h-full rounded-full transition-all duration-1000" 
                      style={{ width: `${perc}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>

        {/* 4. AKTIVITAS TERBARU (UPLOAD) */}
        <Card className="border-border shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between border-b pb-4 mb-4">
            <div>
              <CardTitle className="text-lg flex items-center gap-2">
                <Clock className="w-5 h-5 text-primary" /> Arsip Terbaru
              </CardTitle>
              <CardDescription>Pencatatan terakhir ke dalam sistem</CardDescription>
            </div>
            <Button variant="ghost" size="sm" asChild className="text-primary hover:text-primary hover:bg-primary/5">
              <Link to="/archive" className="gap-1">
                Buka Arsip <ArrowRight className="w-4 h-4" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent className="space-y-3">
            {recentDocuments.length === 0 ? (
              <div className="text-center py-6 text-muted-foreground">Belum ada dokumen</div>
            ) : (
              recentDocuments.map((doc) => (
                <div key={doc.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-xl border border-border hover:border-primary/30 hover:bg-primary/[0.02] transition-all gap-4">
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                      <FileText className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-semibold text-sm line-clamp-1">{doc.subject || 'Tanpa Perihal'}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        No: {doc.letter_number || '-'} • Dari: {doc.sender || '-'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {doc.category && <Badge variant="outline" className="text-[10px] bg-background">{doc.category}</Badge>}
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}