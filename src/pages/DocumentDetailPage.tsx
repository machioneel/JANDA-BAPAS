import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useDocumentById, useUpdateDocument } from '@/hooks/useDocuments';
import { DOCUMENT_TYPE_LABELS, type DocumentType } from '@/types/document';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { DocTypeSelect } from '@/components/DocTypeSelect';
import { DocCategorySelect } from '@/components/DocCategorySelect';
import { toast } from 'sonner';
import { ArrowLeft, Calendar, FileText, User, Tag, Edit2, ExternalLink, Save, X, Loader2 } from 'lucide-react';

export default function DocumentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: doc, isLoading } = useDocumentById(id!);
  const updateDocument = useUpdateDocument();

  // Mode halaman: 'view' untuk melihat PDF, 'edit' untuk form perubahan data
  const [mode, setMode] = useState<'view' | 'edit'>('view');
  const [editForm, setEditForm] = useState<any>({});
  const [saving, setSaving] = useState(false);

  const openEditMode = () => {
    if (!doc) return;
    setEditForm({
      letter_number: doc.letter_number,
      subject: doc.subject,
      sender: doc.sender,
      receiver: doc.receiver,
      classification: doc.classification,
      document_type: doc.document_type,
      category: doc.category || '',
      letter_date: doc.letter_date || '',
    });
    setMode('edit');
  };

  const handleSaveEdit = async () => {
    setSaving(true);
    try {
      await updateDocument.mutateAsync({
        id: doc!.id,
        ...editForm,
      });
      toast.success('Dokumen berhasil diperbarui');
      setMode('view');
    } catch {
      toast.error('Gagal memperbarui dokumen');
    } finally {
      setSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center p-20 text-muted-foreground animate-pulse">
        <Loader2 className="w-10 h-10 animate-spin mb-4 text-primary" />
        <p>Memuat detail dokumen...</p>
      </div>
    );
  }

  if (!doc) {
    return (
      <div className="p-8 text-center text-destructive">
        <p>Dokumen tidak ditemukan.</p>
        <Button variant="outline" className="mt-4" onClick={() => navigate(-1)}>Kembali</Button>
      </div>
    );
  }

  // Logika Live View
  const fileExtension = doc.file_name.split('.').pop()?.toLowerCase();
  const isPdf = fileExtension === 'pdf';
  const viewerUrl = isPdf 
    ? doc.file_url 
    : `https://docs.google.com/viewer?url=${encodeURIComponent(doc.file_url)}&embedded=true`;

  return (
    <div className="space-y-6 animate-fade-in max-w-6xl mx-auto pb-8">
      <Button variant="ghost" onClick={() => navigate(-1)} className="gap-2 -ml-4 hover:bg-transparent">
        <ArrowLeft className="w-4 h-4" /> Kembali ke Arsip
      </Button>

      <Card className="border-border shadow-sm relative overflow-hidden">
        {/* Dekorasi Latar Belakang */}
        <div className="absolute top-0 right-0 p-6 opacity-5 pointer-events-none">
          <FileText className="w-64 h-64" />
        </div>
        
        {/* HEADER CARD */}
        <CardHeader className="pb-4 border-b bg-muted/10">
          <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
            <div>
              <div className="flex flex-wrap gap-2 mb-3">
                <Badge className="bg-primary/90">{DOCUMENT_TYPE_LABELS[doc.document_type as DocumentType]}</Badge>
                {doc.category && <Badge variant="outline" className="bg-background">{doc.category}</Badge>}
                <Badge variant="secondary">{doc.classification}</Badge>
              </div>
              <CardTitle className="text-2xl leading-tight text-foreground pr-8">
                {doc.subject || 'Tanpa Perihal'}
              </CardTitle>
            </div>
            
            {/* Tombol Aksi Kanan Atas */}
            <div className="shrink-0 flex items-center gap-2">
              {mode === 'view' ? (
                <Button variant="outline" className="gap-2 bg-background shadow-sm" onClick={openEditMode}>
                  <Edit2 className="w-4 h-4" /> Edit Metadata
                </Button>
              ) : (
                <>
                  <Button variant="ghost" onClick={() => setMode('view')}>
                    <X className="w-4 h-4 mr-2" /> Batal
                  </Button>
                  <Button onClick={handleSaveEdit} disabled={saving} className="gap-2 shadow-sm">
                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    Simpan Perubahan
                  </Button>
                </>
              )}
            </div>
          </div>
        </CardHeader>

        {/* KONTEN UTAMA */}
        <CardContent className="p-0">
          {mode === 'edit' ? (
            /* --- MODE EDIT (FORM) --- */
            <div className="p-6 md:p-8 max-w-4xl mx-auto bg-background min-h-[500px]">
              <h3 className="font-semibold text-lg border-b pb-3 mb-6">Ubah Informasi Dokumen</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-1 md:col-span-2">
                  <Label>Perihal</Label>
                  <Input value={editForm.subject} onChange={e => setEditForm({ ...editForm, subject: e.target.value })} />
                </div>
                <div className="space-y-1">
                  <Label>Nomor Surat</Label>
                  <Input value={editForm.letter_number} onChange={e => setEditForm({ ...editForm, letter_number: e.target.value })} />
                </div>
                <div className="space-y-1">
                  <Label>Tanggal Surat</Label>
                  <Input type="date" value={editForm.letter_date} onChange={e => setEditForm({ ...editForm, letter_date: e.target.value })} />
                </div>
                <div className="space-y-1">
                  <Label>Pengirim</Label>
                  <Input value={editForm.sender} onChange={e => setEditForm({ ...editForm, sender: e.target.value })} />
                </div>
                <div className="space-y-1">
                  <Label>Penerima</Label>
                  <Input value={editForm.receiver} onChange={e => setEditForm({ ...editForm, receiver: e.target.value })} />
                </div>
                <div className="space-y-1">
                  <Label>Jenis Surat</Label>
                  <DocTypeSelect value={editForm.document_type} onValueChange={v => setEditForm({ ...editForm, document_type: v })} />
                </div>
                <div className="space-y-1">
                  <Label>Kategori / Unit</Label>
                  <DocCategorySelect value={editForm.category} onValueChange={v => setEditForm({ ...editForm, category: v })} />
                </div>
                <div className="space-y-1 md:col-span-2">
                  <Label>Klasifikasi (Sifat Surat)</Label>
                  <Input value={editForm.classification} onChange={e => setEditForm({ ...editForm, classification: e.target.value })} />
                </div>
              </div>
            </div>
          ) : (
            /* --- MODE VIEW (METADATA + LIVE IFRAME) --- */
            <div className="grid grid-cols-1 lg:grid-cols-3 divide-y lg:divide-y-0 lg:divide-x border-border min-h-[700px]">
              
              {/* Kolom Kiri: Metadata */}
              <div className="p-6 space-y-6 bg-muted/5">
                <h3 className="font-semibold text-foreground border-b pb-2">Informasi Dokumen</h3>
                <div className="space-y-5">
                  <div>
                    <p className="text-sm text-muted-foreground mb-1 flex items-center gap-2"><Tag className="w-4 h-4"/> Nomor Surat</p>
                    <p className="font-medium">{doc.letter_number || '-'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground mb-1 flex items-center gap-2"><Calendar className="w-4 h-4"/> Tanggal Surat</p>
                    <p className="font-medium">{doc.letter_date || '-'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground mb-1 flex items-center gap-2"><User className="w-4 h-4"/> Pengirim</p>
                    <p className="font-medium leading-snug">{doc.sender || '-'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground mb-1 flex items-center gap-2"><User className="w-4 h-4"/> Penerima</p>
                    <p className="font-medium leading-snug">{doc.receiver || '-'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground mb-1 flex items-center gap-2"><FileText className="w-4 h-4"/> Nama File Asli</p>
                    <p className="font-medium text-sm break-all">{doc.file_name}</p>
                  </div>
                </div>
              </div>

              {/* Kolom Kanan: Live View */}
              <div className="lg:col-span-2 p-6 flex flex-col bg-muted/10">
                <div className="flex justify-between items-center mb-3">
                  <h3 className="font-semibold text-foreground">Pratinjau Dokumen</h3>
                  <Button variant="secondary" size="sm" className="gap-2 text-xs bg-background hover:bg-muted shadow-sm border" onClick={() => window.open(doc.file_url, '_blank')}>
                    Buka Tab Baru <ExternalLink className="w-3 h-3" />
                  </Button>
                </div>
                
                {/* Wadah Iframe */}
                <div className="flex-1 w-full bg-background rounded-xl border border-border overflow-hidden relative shadow-inner min-h-[600px]">
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-muted-foreground -z-10">
                    <Loader2 className="w-8 h-8 mb-4 opacity-50 animate-spin text-primary" />
                    <p className="text-sm">Menghubungkan pratinjau...</p>
                  </div>
                  <iframe
                    src={viewerUrl}
                    className="absolute inset-0 w-full h-full border-0 bg-transparent"
                    title="Document Live View"
                    allowFullScreen
                  />
                </div>
              </div>

            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}