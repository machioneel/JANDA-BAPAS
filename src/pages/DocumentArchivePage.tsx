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
import { Checkbox } from '@/components/ui/checkbox';
import { DocCategorySelect } from '@/components/DocCategorySelect'; 
import { type DocumentCategory, type Document } from '@/types/document';
import { Search, ChevronLeft, ChevronRight, Eye, Filter, X, Download, Trash2, ArrowUp, ArrowDown, ArrowUpDown, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { useAuth } from '@/hooks/useAuth';
import { DocumentDetailModal } from '@/components/DocumentDetailModal';

const currentYear = new Date().getFullYear();
const yearOptions = Array.from({ length: 10 }, (_, i) => currentYear - i);

const formatDate = (dateStr: string | null) => {
  if (!dateStr) return '-';
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    return `${parts[2]}-${parts[1]}-${parts[0]}`;
  }
  return dateStr;
};

export default function DocumentArchivePage() {
  const navigate = useNavigate();
  const { employee } = useAuth();
  
  // State Filters
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState<DocumentCategory | ''>(''); 
  const [year, setYear] = useState('');
  const [sender, setSender] = useState('');
  const [receiver, setReceiver] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  
  // State Pagination & Rows per page
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10); 
  
  // State Sorting
  const [sortParam, setSortParam] = useState('created_at:desc');
  
  // State UI
  const [showFilters, setShowFilters] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]); 
  const [selectedDocId, setSelectedDocId] = useState<string | null>(null); 
  const [deleteTarget, setDeleteTarget] = useState<{ id?: string; ids?: string[]; name: string } | null>(null);

  const deleteDoc = useDeleteDocument();
  const [sortBy, sortOrder] = sortParam.split(':');

  const { data, isLoading } = useDocuments({
    search, 
    type: 'incoming', 
    category, 
    year, 
    sender, 
    receiver, 
    dateFrom, 
    dateTo, 
    page, 
    pageSize,
  });
  
  const documents = [...(data?.documents || [])] as Document[];
  
  // Pengurutan Lokal
  documents.sort((a, b) => {
    const valA = (a[sortBy as keyof Document] || '').toString().toLowerCase();
    const valB = (b[sortBy as keyof Document] || '').toString().toLowerCase();
    if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
    if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
    return 0;
  });

  const totalPages = Math.ceil((data?.total ?? 0) / pageSize);
  const activeFilterCount = [category, year, sender, receiver, dateFrom, dateTo].filter(Boolean).length;

  const handleSort = (column: string) => {
    if (sortBy === column) {
      setSortParam(`${column}:${sortOrder === 'asc' ? 'desc' : 'asc'}`);
    } else {
      setSortParam(`${column}:asc`);
    }
    setPage(1);
  };

  const renderSortableHeader = (label: string, column: string, className: string = '') => {
    const isActive = sortBy === column;
    return (
      <TableHead 
        className={`font-semibold border-r border-border cursor-pointer hover:bg-muted/50 select-none transition-colors ${className}`}
        onClick={() => handleSort(column)}
      >
        <div className={`flex items-center gap-1.5 ${className.includes('text-center') ? 'justify-center' : ''}`}>
          <span>{label}</span>
          <div className="flex shrink-0">
            {isActive ? (
              sortOrder === 'asc' ? <ArrowUp className="w-3 h-3 text-primary" /> : <ArrowDown className="w-3 h-3 text-primary" />
            ) : (
              <ArrowUpDown className="w-3 h-3 text-muted-foreground opacity-30 hover:opacity-100 transition-opacity" />
            )}
          </div>
        </div>
      </TableHead>
    );
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === documents.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(documents.map(doc => doc.id));
    }
  };

  const toggleSelectRow = (id: string) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]);
  };

  const clearFilters = () => {
    setCategory(''); setYear(''); setSender(''); setReceiver(''); setDateFrom(''); setDateTo('');
    setSortParam('created_at:desc');
    setPage(1);
    toast.info('Semua filter telah dihapus');
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      if (deleteTarget.ids) {
        await Promise.all(deleteTarget.ids.map(id => deleteDoc.mutateAsync(id)));
        setSelectedIds([]);
      } else if (deleteTarget.id) {
        await deleteDoc.mutateAsync(deleteTarget.id);
      }
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
      const [currentSortBy, currentSortOrder] = sortParam.split(':');
      let query: any = supabase
        .from('documents')
        .select('letter_number, letter_date, sender, receiver, subject, classification, description, file_name, created_at, category')
        .eq('document_type', 'incoming') 
        .order(currentSortBy, { ascending: currentSortOrder === 'asc' }) 
        .limit(5000);

      if (search) query = query.or(`letter_number.ilike.%${search}%,sender.ilike.%${search}%,receiver.ilike.%${search}%,subject.ilike.%${search}%,description.ilike.%${search}%`);
      if (category) query = query.eq('category', category);
      if (year) query = query.gte('letter_date', `${year}-01-01`).lte('letter_date', `${year}-12-31`);
      if (sender) query = query.ilike('sender', `%${sender}%`);
      if (receiver) query = query.ilike('receiver', `%${receiver}%`);
      if (dateFrom) query = query.gte('letter_date', dateFrom);
      if (dateTo) query = query.lte('letter_date', dateTo);

      const { data: docsData, error } = await query;
      if (error) throw error;
      if (!docsData || docsData.length === 0) { toast.error('Tidak ada data untuk diekspor'); return; }

      const headers = ['No. Surat', 'Tanggal', 'Pengirim', 'Penerima', 'Perihal', 'Klasifikasi', 'Kategori', 'Ringkasan', 'Nama File'];
      const rows = docsData.map((d: any) => [
        d.letter_number, formatDate(d.letter_date), d.sender, d.receiver, d.subject, d.classification,
        d.category || '-', d.description || '', d.file_name
      ]);

      const csvContent = [headers, ...rows]
        .map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
        .join('\n');

      const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `arsip_surat_masuk_${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      toast.success('Export berhasil');
    } catch {
      toast.error('Gagal ekspor');
    } finally {
      setExporting(false);
    }
  }, [search, category, year, sender, receiver, dateFrom, dateTo, sortParam]);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Arsip Surat Masuk</h1>
          <p className="text-sm text-muted-foreground">Cari dan kelola arsip dokumen · {data?.total ?? 0} dokumen</p>
        </div>
        <div className="flex gap-2">
          {selectedIds.length > 0 && employee?.role === 'administrator' && (
            <Button 
                variant="destructive" 
                className="gap-2 animate-in fade-in zoom-in duration-200"
                onClick={() => setDeleteTarget({ ids: selectedIds, name: `${selectedIds.length} dokumen terpilih` })}
            >
                <Trash2 className="w-4 h-4" /> Hapus ({selectedIds.length})
            </Button>
          )}
          <Button variant="outline" className="gap-2" disabled={exporting} onClick={handleExport}>
            <Download className="w-4 h-4" />
            {exporting ? 'Mengekspor...' : 'Export CSV'}
          </Button>
        </div>
      </div>

      <Card className="border-border">
        <CardHeader className="pb-3 border-b">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input placeholder="Cari nomor surat, pengirim, atau perihal..." value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} className="pl-10" />
            </div>

            <Button variant={showFilters ? 'default' : 'outline'} onClick={() => setShowFilters(!showFilters)} className="gap-2">
              <Filter className="w-4 h-4" />
              Filter {activeFilterCount > 0 && `(${activeFilterCount})`}
            </Button>
          </div>

          {showFilters && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 p-4 rounded-xl bg-muted/30 border border-border mt-2 animate-in slide-in-from-top-2 duration-200">
              <div className="space-y-1">
                <Label className="text-xs">Kategori / Unit</Label>
                <DocCategorySelect value={category} onValueChange={(v) => { setCategory(v as DocumentCategory); setPage(1); }} />
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
              <div className="flex items-end lg:col-span-3 justify-end mt-2">
                <Button variant="ghost" size="sm" onClick={clearFilters} className="gap-1 text-muted-foreground hover:text-destructive">
                  <X className="w-3 h-3" /> Hapus filter
                </Button>
              </div>
            </div>
          )}
        </CardHeader>

        <CardContent className="p-0">
          <div className="overflow-x-auto">
            {/* Tabel diubah menggunakan table-fixed agar persentase akurat */}
            <Table className="table-fixed w-full">
              <TableHeader>
                <TableRow className="bg-muted/50 border-y border-border">
                  {/* Kolom Checkbox statis 50px */}
                  <TableHead className="w-[50px] border-r border-border">
                    <Checkbox checked={documents.length > 0 && selectedIds.length === documents.length} onCheckedChange={toggleSelectAll} />
                  </TableHead>
                  
                  {/* ANDA BISA MENYESUAIKAN PERSENTASE LEBAR KOLOM DI SINI */}
                  {renderSortableHeader('No. Surat', 'letter_number', 'w-[15%]')}
                  {renderSortableHeader('Tanggal', 'letter_date', 'w-[10%]')}
                  {renderSortableHeader('Pengirim', 'sender', 'w-[25%]')}
                  {renderSortableHeader('Perihal', 'subject', 'w-[25%]')}
                  {renderSortableHeader('Kategori', 'category', 'w-[10%] text-center')}
                  
                  {/* Kolom Aksi statis 100px */}
                  <TableHead className="w-[100px] font-semibold text-center">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow><TableCell colSpan={7} className="text-center py-12"><Loader2 className="w-6 h-6 animate-spin mx-auto text-primary" /></TableCell></TableRow>
                ) : documents.length === 0 ? (
                  <TableRow><TableCell colSpan={7} className="text-center py-12 text-muted-foreground">Tidak ada dokumen ditemukan</TableCell></TableRow>
                ) : (
                  documents.map((doc, i) => (
                    <TableRow key={doc.id} className={`transition-colors border-b border-border hover:bg-muted/30 ${i % 2 === 0 ? '' : 'bg-muted/10'} ${selectedIds.includes(doc.id) ? 'bg-primary/5' : ''}`}>
                      <TableCell className="border-r border-border">
                        <Checkbox checked={selectedIds.includes(doc.id)} onCheckedChange={() => toggleSelectRow(doc.id)} />
                      </TableCell>
                      
                      {/* Konten tabel dipotong dengan 'truncate' agar tidak merusak lebar persentase */}
                      <TableCell className="font-medium text-sm border-r border-border truncate" title={doc.letter_number}>{doc.letter_number || '-'}</TableCell>
                      <TableCell className="text-sm border-r border-border truncate" title={formatDate(doc.letter_date)}>{formatDate(doc.letter_date)}</TableCell>
                      <TableCell className="text-sm border-r border-border truncate" title={doc.sender}>{doc.sender || '-'}</TableCell>
                      <TableCell className="text-sm font-medium border-r border-border truncate" title={doc.subject}>{doc.subject || '-'}</TableCell>
                      
                      <TableCell className="text-sm text-center border-r border-border">
                        <span className="text-[10px] uppercase font-bold bg-muted px-2 py-0.5 rounded border border-border">{doc.category || '-'}</span>
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex justify-center gap-1">
                          <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => setSelectedDocId(doc.id)}><Eye className="w-4 h-4 text-primary" /></Button>
                          {employee?.role === 'administrator' && (
                            <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-destructive" onClick={() => setDeleteTarget({ id: doc.id, name: doc.file_name })}><Trash2 className="w-4 h-4" /></Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-between p-4 bg-muted/5 gap-4">
            <div className="flex items-center gap-4">
              <p className="text-xs text-muted-foreground whitespace-nowrap">Halaman {page} dari {totalPages || 1} · {data?.total || 0} dokumen</p>
              
              <div className="flex items-center gap-2">
                <Label className="text-[10px] uppercase font-bold text-muted-foreground">Baris:</Label>
                <Select value={String(pageSize)} onValueChange={(v) => { setPageSize(Number(v)); setPage(1); }}>
                  <SelectTrigger className="h-7 w-[65px] text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="10">10</SelectItem>
                    <SelectItem value="25">25</SelectItem>
                    <SelectItem value="50">50</SelectItem>
                    <SelectItem value="100">100</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex gap-2">
              <Button variant="outline" size="sm" className="h-8 w-8 p-0" disabled={page <= 1} onClick={() => setPage(page - 1)}>
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <Button variant="outline" size="sm" className="h-8 w-8 p-0" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title={deleteTarget?.ids ? "Hapus Banyak Dokumen" : "Hapus Dokumen"}
        description={`Apakah Anda yakin ingin menghapus ${deleteTarget?.name}?`}
        confirmLabel="Hapus"
        variant="destructive"
        onConfirm={handleDelete}
      />

      <DocumentDetailModal documentId={selectedDocId} isOpen={!!selectedDocId} onClose={() => setSelectedDocId(null)} />
    </div>
  );
}