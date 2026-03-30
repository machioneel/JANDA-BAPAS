import { useState, useCallback } from 'react';
import { useDocuments, useDeleteDocument } from '@/hooks/useDocuments';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DocTypeSelect } from '@/components/DocTypeSelect';
import { DOCUMENT_TYPE_LABELS } from '@/types/document';
import { Search, ChevronLeft, ChevronRight, Eye, Filter, X, Download, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { useAuth } from '@/hooks/useAuth';
import type { DocumentType } from '@/types/document';

const currentYear = new Date().getFullYear();
const yearOptions = Array.from({ length: 10 }, (_, i) => currentYear - i);

export default function DocumentArchivePage() {
  const navigate = useNavigate();
  const { employee } = useAuth();
  const [search, setSearch] = useState('');
  const [type, setType] = useState<DocumentType | ''>('');
  const [year, setYear] = useState('');
  const [sender, setSender] = useState('');
  const [receiver, setReceiver] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [page, setPage] = useState(1);
  const [exporting, setExporting] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);
  const deleteDoc = useDeleteDocument();

  const { data, isLoading } = useDocuments({
    search, type, year, sender, receiver, dateFrom, dateTo, page, pageSize: 15,
  });
  const totalPages = Math.ceil((data?.total ?? 0) / 15);

  const activeFilterCount = [type, year, sender, receiver, dateFrom, dateTo].filter(Boolean).length;

  const clearFilters = () => {
    setType(''); setYear(''); setSender(''); setReceiver(''); setDateFrom(''); setDateTo('');
    setPage(1);
    toast.info('Semua filter telah dihapus');
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteDoc.mutateAsync(deleteTarget.id);
      toast.success('Dokumen berhasil dihapus');
    } catch {
      toast.error('Gagal menghapus dokumen');
    } finally {
      setDeleteTarget(null);
    }
  };

  const handleExport = useCallback(async () => {
    setExporting(true);
    try {
      let query = supabase
        .from('documents')
        .select('letter_number, letter_date, sender, receiver, subject, classification, document_type, file_name, created_at')
        .order('created_at', { ascending: false })
        .limit(5000);

      if (search) query = query.or(`letter_number.ilike.%${search}%,sender.ilike.%${search}%,receiver.ilike.%${search}%,subject.ilike.%${search}%`);
      if (type) query = query.eq('document_type', type);
      if (year) query = query.gte('letter_date', `${year}-01-01`).lte('letter_date', `${year}-12-31`);
      if (sender) query = query.ilike('sender', `%${sender}%`);
      if (receiver) query = query.ilike('receiver', `%${receiver}%`);
      if (dateFrom) query = query.gte('letter_date', dateFrom);
      if (dateTo) query = query.lte('letter_date', dateTo);

      const { data: docs, error } = await query;
      if (error) throw error;
      if (!docs || docs.length === 0) { toast.error('Tidak ada data untuk diekspor'); return; }

      const headers = ['No. Surat', 'Tanggal', 'Pengirim', 'Penerima', 'Perihal', 'Klasifikasi', 'Jenis', 'Nama File', 'Tanggal Upload'];
      const rows = docs.map(d => [
        d.letter_number, d.letter_date || '', d.sender, d.receiver, d.subject, d.classification,
        DOCUMENT_TYPE_LABELS[d.document_type as DocumentType] || d.document_type,
        d.file_name, new Date(d.created_at).toLocaleDateString('id-ID'),
      ]);

      const csvContent = [headers, ...rows]
        .map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
        .join('\n');

      const BOM = '\uFEFF';
      const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `arsip_dokumen_${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success(`${docs.length} data berhasil diekspor ke CSV`);
    } catch (err: any) {
      toast.error('Gagal mengekspor data');
    } finally {
      setExporting(false);
    }
  }, [search, type, year, sender, receiver, dateFrom, dateTo]);

  const getDocTypeLabel = (dt: string) => DOCUMENT_TYPE_LABELS[dt as DocumentType] || dt;
  const getDocTypeColor = (dt: string) => {
    switch (dt) {
      case 'incoming': return 'bg-accent/10 text-accent';
      case 'outgoing': return 'bg-warning/10 text-warning';
      case 'nota_dinas': return 'bg-primary/10 text-primary';
      case 'laporan_litmas': return 'bg-secondary/10 text-secondary-foreground';
      case 'surat_keputusan': return 'bg-destructive/10 text-destructive';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Arsip Dokumen</h1>
          <p className="text-sm text-muted-foreground">Cari dan kelola arsip surat · {data?.total ?? 0} dokumen</p>
        </div>
        <Button variant="outline" className="gap-2" disabled={exporting} onClick={handleExport}>
          <Download className="w-4 h-4" />
          {exporting ? 'Mengekspor...' : 'Export CSV'}
        </Button>
      </div>

      <Card className="border-border">
        <CardHeader className="pb-3">
          <div className="flex flex-col gap-3">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input placeholder="Cari nomor surat, pengirim, perihal..." value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} className="pl-10" />
              </div>
              <Button variant={showFilters ? 'default' : 'outline'} onClick={() => setShowFilters(!showFilters)} className="gap-2">
                <Filter className="w-4 h-4" />
                Filter
                {activeFilterCount > 0 && (
                  <span className="ml-1 bg-primary-foreground text-primary text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold">
                    {activeFilterCount}
                  </span>
                )}
              </Button>
            </div>

            {showFilters && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 p-4 rounded-xl bg-muted/30 border border-border">
                <div className="space-y-1">
                  <Label className="text-xs">Jenis Surat</Label>
                  <DocTypeSelect value={type || 'all'} onValueChange={(v) => { setType(v === 'all' as any ? '' : v); setPage(1); }} includeAll />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Tahun</Label>
                  <Select value={year || 'all'} onValueChange={(v) => { setYear(v === 'all' ? '' : v); setPage(1); }}>
                    <SelectTrigger><SelectValue placeholder="Semua Tahun" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Semua Tahun</SelectItem>
                      {yearOptions.map(y => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Pengirim</Label>
                  <Input placeholder="Filter pengirim..." value={sender} onChange={e => { setSender(e.target.value); setPage(1); }} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Penerima</Label>
                  <Input placeholder="Filter penerima..." value={receiver} onChange={e => { setReceiver(e.target.value); setPage(1); }} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Dari Tanggal</Label>
                  <Input type="date" value={dateFrom} onChange={e => { setDateFrom(e.target.value); setPage(1); }} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Sampai Tanggal</Label>
                  <Input type="date" value={dateTo} onChange={e => { setDateTo(e.target.value); setPage(1); }} />
                </div>
                {activeFilterCount > 0 && (
                  <div className="sm:col-span-2 lg:col-span-3 flex justify-end">
                    <Button variant="ghost" size="sm" onClick={clearFilters} className="gap-1 text-muted-foreground">
                      <X className="w-3 h-3" /> Hapus semua filter
                    </Button>
                  </div>
                )}
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="font-semibold">No. Surat</TableHead>
                  <TableHead className="font-semibold">Tanggal</TableHead>
                  <TableHead className="font-semibold">Pengirim</TableHead>
                  <TableHead className="font-semibold">Penerima</TableHead>
                  <TableHead className="font-semibold">Perihal</TableHead>
                  <TableHead className="font-semibold">Jenis</TableHead>
                  <TableHead className="font-semibold w-[100px]">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Memuat data...</TableCell></TableRow>
                ) : data?.documents.length === 0 ? (
                  <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Tidak ada dokumen ditemukan</TableCell></TableRow>
                ) : (
                  data?.documents.map((doc, i) => (
                    <TableRow key={doc.id} className={`transition-colors hover:bg-muted/30 ${i % 2 === 0 ? '' : 'bg-muted/10'}`}>
                      <TableCell className="font-medium text-sm">{doc.letter_number || '-'}</TableCell>
                      <TableCell className="text-sm">{doc.letter_date || '-'}</TableCell>
                      <TableCell className="text-sm max-w-[150px] truncate">{doc.sender || '-'}</TableCell>
                      <TableCell className="text-sm max-w-[150px] truncate">{doc.receiver || '-'}</TableCell>
                      <TableCell className="text-sm max-w-[200px] truncate">{doc.subject || '-'}</TableCell>
                      <TableCell>
                        <span className={`text-xs px-2 py-1 rounded-full font-medium ${getDocTypeColor(doc.document_type)}`}>
                          {getDocTypeLabel(doc.document_type)}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => navigate(`/documents/${doc.id}`)}>
                            <Eye className="w-4 h-4" />
                          </Button>
                          {employee?.role === 'administrator' && (
                            <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-destructive hover:text-destructive" onClick={() => setDeleteTarget({ id: doc.id, name: doc.file_name })}>
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
          {totalPages > 1 && (
            <div className="flex items-center justify-between p-4 border-t border-border">
              <p className="text-sm text-muted-foreground">Halaman {page} dari {totalPages} · {data?.total} dokumen</p>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Hapus Dokumen"
        description={`Apakah Anda yakin ingin menghapus "${deleteTarget?.name}"? Tindakan ini tidak dapat dibatalkan.`}
        confirmLabel="Hapus"
        variant="destructive"
        onConfirm={handleDelete}
      />
    </div>
  );
}
