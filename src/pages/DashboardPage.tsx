import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FileText, ArrowDownLeft, ArrowUpRight, TrendingUp } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

const COLORS = [
  'hsl(200, 98%, 39%)',
  'hsl(160, 84%, 39%)',
  'hsl(38, 92%, 50%)',
  'hsl(215, 25%, 27%)',
  'hsl(0, 84%, 60%)',
];

export default function DashboardPage() {
  const { employee } = useAuth();

  const { data: stats } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: async () => {
      const { count: total } = await supabase.from('documents').select('*', { count: 'exact', head: true });
      const { count: incoming } = await supabase.from('documents').select('*', { count: 'exact', head: true }).eq('document_type', 'incoming');
      const { count: outgoing } = await supabase.from('documents').select('*', { count: 'exact', head: true }).eq('document_type', 'outgoing');
      const now = new Date();
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
      const { count: thisMonth } = await supabase.from('documents').select('*', { count: 'exact', head: true }).gte('created_at', firstDay);
      return { total: total ?? 0, incoming: incoming ?? 0, outgoing: outgoing ?? 0, thisMonth: thisMonth ?? 0 };
    },
  });

  const { data: recentDocs } = useQuery({
    queryKey: ['recent-documents'],
    queryFn: async () => {
      const { data } = await supabase.from('documents').select('*').order('created_at', { ascending: false }).limit(5);
      return data ?? [];
    },
  });

  const { data: monthlyData } = useQuery({
    queryKey: ['analytics-monthly'],
    queryFn: async () => {
      const { data } = await supabase.from('documents').select('created_at, document_type');
      if (!data) return [];
      const months: Record<string, { incoming: number; outgoing: number }> = {};
      data.forEach((doc) => {
        const month = doc.created_at.slice(0, 7);
        if (!months[month]) months[month] = { incoming: 0, outgoing: 0 };
        if (doc.document_type === 'incoming') months[month].incoming++;
        else months[month].outgoing++;
      });
      return Object.entries(months)
        .sort(([a], [b]) => a.localeCompare(b))
        .slice(-12)
        .map(([month, counts]) => ({
          month: new Date(month + '-01').toLocaleDateString('id-ID', { month: 'short', year: '2-digit' }),
          'Surat Masuk': counts.incoming,
          'Surat Keluar': counts.outgoing,
        }));
    },
  });

  const { data: typeData } = useQuery({
    queryKey: ['analytics-type'],
    queryFn: async () => {
      const { count: incoming } = await supabase.from('documents').select('*', { count: 'exact', head: true }).eq('document_type', 'incoming');
      const { count: outgoing } = await supabase.from('documents').select('*', { count: 'exact', head: true }).eq('document_type', 'outgoing');
      return [
        { name: 'Surat Masuk', value: incoming ?? 0 },
        { name: 'Surat Keluar', value: outgoing ?? 0 },
      ];
    },
  });

  const { data: topSenders } = useQuery({
    queryKey: ['analytics-senders'],
    queryFn: async () => {
      const { data } = await supabase.from('documents').select('sender');
      if (!data) return [];
      const counts: Record<string, number> = {};
      data.forEach((doc) => { if (doc.sender) counts[doc.sender] = (counts[doc.sender] || 0) + 1; });
      return Object.entries(counts).sort(([, a], [, b]) => b - a).slice(0, 10).map(([sender, count]) => ({ sender, count }));
    },
  });

  const statCards = [
    { title: 'Total Dokumen', value: stats?.total ?? 0, icon: FileText, color: 'text-primary' },
    { title: 'Surat Masuk', value: stats?.incoming ?? 0, icon: ArrowDownLeft, color: 'text-accent' },
    { title: 'Surat Keluar', value: stats?.outgoing ?? 0, icon: ArrowUpRight, color: 'text-warning' },
    { title: 'Bulan Ini', value: stats?.thisMonth ?? 0, icon: TrendingUp, color: 'text-primary' },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
        <p className="text-muted-foreground">Selamat datang, {employee?.name || 'Pengguna'}</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((stat) => (
          <Card key={stat.title} className="border-border">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{stat.title}</CardTitle>
              <stat.icon className={`h-5 w-5 ${stat.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-foreground">{stat.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Monthly Trend */}
      <Card className="border-border">
        <CardHeader>
          <CardTitle className="text-lg">Tren Bulanan</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyData || []}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(214, 32%, 91%)" />
                <XAxis dataKey="month" fontSize={12} />
                <YAxis fontSize={12} />
                <Tooltip />
                <Bar dataKey="Surat Masuk" fill={COLORS[0]} radius={[2, 2, 0, 0]} />
                <Bar dataKey="Surat Keluar" fill={COLORS[1]} radius={[2, 2, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Type Distribution */}
        <Card className="border-border">
          <CardHeader>
            <CardTitle className="text-lg">Distribusi Jenis</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[250px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={typeData || []} cx="50%" cy="50%" outerRadius={80} dataKey="value" label={({ name, value }) => `${name}: ${value}`}>
                    {(typeData || []).map((_, index) => (
                      <Cell key={index} fill={COLORS[index]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Top Senders */}
        <Card className="border-border">
          <CardHeader>
            <CardTitle className="text-lg">Pengirim Terbanyak</CardTitle>
          </CardHeader>
          <CardContent>
            {topSenders && topSenders.length > 0 ? (
              <div className="space-y-2">
                {topSenders.map((item, i) => (
                  <div key={i} className="flex items-center justify-between py-1.5 border-b border-border last:border-0">
                    <span className="text-sm text-foreground truncate mr-4">{item.sender}</span>
                    <span className="text-sm font-semibold text-primary">{item.count}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground text-sm">Belum ada data</p>
            )}
          </CardContent>
        </Card>

        {/* Recent Documents */}
        <Card className="border-border">
          <CardHeader>
            <CardTitle className="text-lg">Dokumen Terbaru</CardTitle>
          </CardHeader>
          <CardContent>
            {recentDocs && recentDocs.length > 0 ? (
              <div className="space-y-3">
                {recentDocs.map((doc) => (
                  <div key={doc.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{doc.subject || 'Tanpa subjek'}</p>
                      <p className="text-xs text-muted-foreground">{doc.letter_number} · {doc.sender}</p>
                    </div>
                    <span className={`text-xs px-2 py-1 rounded-sm font-medium ${
                      doc.document_type === 'incoming' ? 'bg-accent/10 text-accent' : 'bg-warning/10 text-warning'
                    }`}>
                      {doc.document_type === 'incoming' ? 'Masuk' : 'Keluar'}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground text-sm">Belum ada dokumen.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
