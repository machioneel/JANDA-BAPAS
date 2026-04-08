import { useState, useEffect } from 'react';
import { useDocumentById, useUpdateDocument } from '@/hooks/useDocuments';
import { DOCUMENT_TYPE_LABELS, type DocumentType, type Document } from '@/types/document'; // Tambahkan import 'Document'
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { DocTypeSelect } from '@/components/DocTypeSelect';
import { DocCategorySelect } from '@/components/DocCategorySelect';
import { toast } from 'sonner';
import { Calendar, FileText, User, Tag, Edit2, ExternalLink, Loader2, Save, X, Copy, Check, Clock, ShieldCheck } from 'lucide-react';

interface DocumentDetailModalProps {
  documentId: string | null;
  isOpen: boolean;
  onClose: () => void;
}

export function DocumentDetailModal({ documentId, isOpen, onClose }: DocumentDetailModalProps) {
  const { data, isLoading } = useDocumentById(documentId || '');
  // PERBAIKAN: Cast 'data' ke tipe 'Document' agar TypeScript mengenali uploader_name
  const doc = data as Document; 
  
  const updateDocument = useUpdateDocument();

  const [mode, setMode] = useState<'view' | 'edit'>('view');
  const [editForm, setEditForm] = useState<any>({});
  const [saving, setSaving] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) setMode('view');
  }, [isOpen]);

  const copyToClipboard = (text: string, field: string) => {
    if (!text || text === '-') return;
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    toast.success(`Tersalin: ${text.length > 20 ? text.substring(0, 20) + '...' : text}`);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const handleOpenEdit = () => {
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
      toast.success('Metadata dokumen berhasil diperbarui');
      setMode('view');
    } catch {
      toast.error('Gagal memperbarui dokumen');
    } finally {
      setSaving(false);
    }
  };

  const fileExtension = doc?.file_name?.split('.').pop()?.toLowerCase();
  const isPdf = fileExtension === 'pdf';
  const viewerUrl = doc ? (isPdf ? doc.file_url : `https://docs.google.com/viewer?url=${encodeURIComponent(doc.file_url)}&embedded=true`) : '';

  const MetadataRow = ({ label, value, icon: Icon, id }: { label: string, value: string, icon: any, id: string }) => (
    <div className="group relative">
      <p className="text-sm text-muted-foreground mb-1 flex items-center gap-2">
        <Icon className="w-4 h-4"/> {label}
      </p>
      <div className="flex items-center justify-between gap-2 p-2 rounded-md hover:bg-muted/50 transition-colors">
        <p className="font-medium leading-snug">{value || '-'}</p>
        {value && value !== '-' && (
          <Button 
            variant="ghost" 
            size="sm" 
            className="h-7 w-7 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
            onClick={() => copyToClipboard(value, id)}
          >
            {copiedField === id ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
          </Button>
        )}
      </div>
    </div>
  );

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-6xl h-[90vh] flex flex-col p-0 gap-0 overflow-hidden bg-background">
        
        {isLoading ? (
          <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground h-full">
            <Loader2 className="w-10 h-10 animate-spin mb-4 text-primary" />
            <p>Memuat detail dokumen...</p>
          </div>
        ) : !doc ? (
          <div className="flex-1 flex flex-col items-center justify-center text-destructive h-full">
            <p className="mb-4">Dokumen tidak ditemukan.</p>
            <Button variant="outline" onClick={onClose}>Tutup</Button>
          </div>
        ) : (
          <>
            <DialogHeader className="p-4 sm:p-6 border-b bg-muted/10 shrink-0">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                  <DialogDescription className="sr-only">Detail Informasi Dokumen</DialogDescription>
                  <div className="flex flex-wrap gap-2 mb-2">
                    <Badge className="bg-primary/90">{DOCUMENT_TYPE_LABELS[doc.document_type as DocumentType]}</Badge>
                    {doc.category && <Badge variant="outline" className="bg-background">{doc.category}</Badge>}
                    <Badge variant="secondary">{doc.classification}</Badge>
                  </div>
                  <DialogTitle className="text-xl sm:text-2xl leading-tight text-foreground pr-8">
                    {doc.subject || 'Tanpa Perihal'}
                  </DialogTitle>
                </div>
                
                <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
                  {mode === 'view' ? (
                    <Button variant="outline" className="gap-2 shadow-sm bg-background" onClick={handleOpenEdit}>
                      <Edit2 className="w-4 h-4" /> Edit Metadata
                    </Button>
                  ) : (
                    <>
                      <Button variant="ghost" onClick={() => setMode('view')}>
                        <X className="w-4 h-4 mr-2" /> Batal
                      </Button>
                      <Button onClick={handleSaveEdit} disabled={saving} className="gap-2">
                        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                        Simpan
                      </Button>
                    </>
                  )}
                </div>
              </div>
            </DialogHeader>

            <div className="flex-1 overflow-y-auto relative">
              {mode === 'edit' ? (
                <div className="p-6 max-w-4xl mx-auto space-y-6 pb-20">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-1 md:col-span-2"><Label>Perihal</Label><Input value={editForm.subject} onChange={e => setEditForm({ ...editForm, subject: e.target.value })} /></div>
                    <div className="space-y-1"><Label>Nomor Surat</Label><Input value={editForm.letter_number} onChange={e => setEditForm({ ...editForm, letter_number: e.target.value })} /></div>
                    <div className="space-y-1"><Label>Tanggal Surat</Label><Input type="date" value={editForm.letter_date} onChange={e => setEditForm({ ...editForm, letter_date: e.target.value })} /></div>
                    <div className="space-y-1"><Label>Pengirim</Label><Input value={editForm.sender} onChange={e => setEditForm({ ...editForm, sender: e.target.value })} /></div>
                    <div className="space-y-1"><Label>Penerima</Label><Input value={editForm.receiver} onChange={e => setEditForm({ ...editForm, receiver: e.target.value })} /></div>
                    <div className="space-y-1"><Label>Jenis Surat</Label><DocTypeSelect value={editForm.document_type} onValueChange={v => setEditForm({ ...editForm, document_type: v })} /></div>
                    <div className="space-y-1"><Label>Kategori / Unit</Label><DocCategorySelect value={editForm.category} onValueChange={v => setEditForm({ ...editForm, category: v })} /></div>
                    <div className="space-y-1 md:col-span-2"><Label>Klasifikasi</Label><Input value={editForm.classification} onChange={e => setEditForm({ ...editForm, classification: e.target.value })} /></div>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-3 divide-y lg:divide-y-0 lg:divide-x border-border h-full min-h-[600px]">
                  
                  {/* Kolom Kiri: Metadata */}
                  <div className="p-6 space-y-2 bg-muted/5 overflow-y-auto">
                    <h3 className="font-semibold text-foreground border-b pb-2 mb-4">Informasi Dokumen</h3>
                    <div className="space-y-4">
                      <MetadataRow label="Perihal" value={doc.subject} icon={FileText} id="subject" />
                      <MetadataRow label="Nomor Surat" value={doc.letter_number} icon={Tag} id="number" />
                      <MetadataRow label="Tanggal Surat" value={doc.letter_date} icon={Calendar} id="date" />
                      <MetadataRow label="Pengirim" value={doc.sender} icon={User} id="sender" />
                      <MetadataRow label="Penerima" value={doc.receiver} icon={User} id="receiver" />
                      
                      {/* Riwayat Digitalisasi (Penambahan Informasi Uploader) */}
                      <div className="pt-6 border-t border-border mt-6">
                        <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-4">Riwayat Arsip</h4>
                        <div className="space-y-4">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                              <ShieldCheck className="w-4 h-4 text-primary" />
                            </div>
                            <div>
                              <p className="text-[10px] text-muted-foreground uppercase font-bold">Pengunggah</p>
                              <p className="text-sm font-semibold">{doc.uploader_name || 'Administrator'}</p>
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                              <Clock className="w-4 h-4 text-muted-foreground" />
                            </div>
                            <div>
                              <p className="text-[10px] text-muted-foreground uppercase font-bold">Digitalisasi Pada</p>
                              <p className="text-sm font-semibold">
                                {new Date(doc.created_at).toLocaleString('id-ID', { 
                                  day: '2-digit', month: 'long', year: 'numeric', 
                                  hour: '2-digit', minute: '2-digit' 
                                })}
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="pt-4 border-t border-border mt-4">
                         <p className="text-xs text-muted-foreground mb-1">Nama File Asli</p>
                         <p className="text-[10px] font-mono break-all bg-background p-2 rounded border">{doc.file_name}</p>
                      </div>
                    </div>
                  </div>

                  {/* Kolom Kanan: Live View */}
                  <div className="lg:col-span-2 p-6 flex flex-col bg-muted/10 h-full">
                    <div className="flex justify-between items-center mb-3">
                      <h3 className="font-semibold text-foreground">Pratinjau Dokumen</h3>
                      <div className="flex gap-2">
                        <Button variant="secondary" size="sm" className="gap-2 text-xs bg-background hover:bg-muted shadow-sm border" onClick={() => window.open(doc.file_url, '_blank')}>
                          Buka Penuh <ExternalLink className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                    <div className="flex-1 w-full bg-background rounded-xl border overflow-hidden relative shadow-inner">
                      <div className="absolute inset-0 flex flex-col items-center justify-center text-muted-foreground -z-10">
                        <Loader2 className="w-8 h-8 mb-2 opacity-30 animate-spin text-primary" />
                        <p className="text-sm">Menyiapkan pratinjau...</p>
                      </div>
                      <iframe src={viewerUrl} className="absolute inset-0 w-full h-full border-0 bg-transparent" title="Document Live View" allowFullScreen />
                    </div>
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}