import { useState, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useCreateDocument } from '@/hooks/useDocuments';
import { supabase } from '@/integrations/supabase/client';
import { extractMetadata } from '@/services/documentParser/extractMetadata';
import { parseDocx } from '@/services/documentParser/parseDocx';
import { parsePdf } from '@/services/documentParser/parsePdf';
import type { ExtractedMetadata, DocumentType, DocumentCategory } from '@/types/document';
import type { MetadataFormValues } from '@/components/upload/MetadataForm';
import MetadataForm from '@/components/upload/MetadataForm';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { DocTypeSelect } from '@/components/DocTypeSelect';
import { DocCategorySelect } from '@/components/DocCategorySelect';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { toast } from 'sonner';
import { Upload, FileText, X, Loader2, CheckCircle, CheckCheck, Trash2, Activity } from 'lucide-react';

const emptyForm: MetadataFormValues = {
  letter_number: '', 
  letter_date: '', 
  sender: '', 
  receiver: '', 
  subject: '', 
  classification: '',
};

interface MultiFile {
  id: string;
  file: File;
  status: 'pending' | 'extracting' | 'ready' | 'uploading' | 'done' | 'error';
  error?: string;
  extracted: ExtractedMetadata | null;
  form: MetadataFormValues;
  category: DocumentCategory | '';
  type: DocumentType; 
}

export default function MultiUploadPanel() {
  const { user, employee } = useAuth(); // Tambahkan employee
  const createDocument = useCreateDocument();
  const [files, setFiles] = useState<MultiFile[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const selected = files.find(f => f.id === selectedId);

  // --- LOGIKA INTERNAL (DIDEFINISIKAN SEBELUM DIGUNAKAN) ---

  const extractFile = useCallback(async (item: MultiFile) => {
    try {
      setFiles(prev => prev.map(f => f.id === item.id ? { ...f, status: 'extracting' as const } : f));
      
      let text = '';
      const ext = item.file.name.split('.').pop()?.toLowerCase();
      
      if (ext === 'pdf') {
        text = await parsePdf(item.file);
      } else if (ext === 'docx') {
        text = await parseDocx(item.file);
      } else {
        throw new Error('Format tidak didukung');
      }

      const extracted = await extractMetadata(text);
      
      setFiles(prev => prev.map(f => {
        if (f.id !== item.id) return f;

        const getString = (val: any): string => {
          if (typeof val === 'string') return val;
          if (val && typeof val === 'object' && 'value' in val) return String(val.value);
          return '';
        };

        return {
          ...f,
          status: 'ready' as const,
          extracted,
          type: (getString(extracted.document_type) || 'incoming') as DocumentType,
          category: (getString(extracted.category) || 'Umum') as DocumentCategory,
          
          form: {
            letter_number: getString(extracted.letter_number),
            letter_date: getString(extracted.letter_date),
            sender: getString(extracted.sender),
            receiver: getString(extracted.receiver),
            subject: getString(extracted.subject),
            classification: getString(extracted.classification),
          },
        };
      }));

      toast.success(`Metadata ${item.file.name} berhasil dideteksi otomatis`);
        
    } catch (error: any) {
      console.error(`Error mengekstrak ${item.file.name}:`, error);
      setFiles(prev => prev.map(f => f.id === item.id ? { 
        ...f, 
        status: 'error' as const, 
        error: 'Gagal ekstrak metadata' 
      } : f));
    }
  }, []);

  const handleFilesAdded = useCallback(async (newFiles: File[]) => {
    const items: MultiFile[] = newFiles.map(file => ({
      id: `${Date.now()}_${Math.random().toString(36).slice(2)}`,
      file,
      status: 'pending' as const,
      extracted: null,
      form: emptyForm,
      category: '',
      type: 'incoming',
    }));
    
    setFiles(prev => [...prev, ...items]);
    if (!selectedId && items.length > 0) setSelectedId(items[0].id);
    
    for (const item of items) {
      await extractFile(item);
      await new Promise(resolve => setTimeout(resolve, 1500));
    }
  }, [selectedId, extractFile]);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files ?? []);
    if (selectedFiles.length) handleFilesAdded(selectedFiles);
    e.target.value = '';
  }, [handleFilesAdded]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const droppedFiles = Array.from(e.dataTransfer.files).filter(f => {
      const ext = f.name.split('.').pop()?.toLowerCase();
      return ext === 'pdf' || ext === 'docx';
    });
    if (droppedFiles.length) handleFilesAdded(droppedFiles);
  }, [handleFilesAdded]);

  const removeFile = (id: string) => {
    setFiles(prev => prev.filter(f => f.id !== id));
    if (selectedId === id) {
      const remaining = files.filter(f => f.id !== id);
      setSelectedId(remaining.length > 0 ? remaining[0].id : null);
    }
  };

  const updateForm = (form: MetadataFormValues) => {
    if (!selectedId) return;
    setFiles(prev => prev.map(f => f.id === selectedId ? { ...f, form } : f));
  };

  const updateFileData = (id: string, data: Partial<Pick<MultiFile, 'category' | 'type'>>) => {
    setFiles(prev => prev.map(f => f.id === id ? { ...f, ...data } : f));
  };

  const submitOne = async (item: MultiFile) => {
    if (!user) return false;
    try {
      setFiles(prev => prev.map(f => f.id === item.id ? { ...f, status: 'uploading' as const } : f));
      
      const fileName = `${Date.now()}_${item.file.name}`;
      const { error: uploadError } = await supabase.storage.from('bapas-documents').upload(fileName, item.file);
      if (uploadError) throw uploadError;
      
      const { data: urlData } = supabase.storage.from('bapas-documents').getPublicUrl(fileName);

      await createDocument.mutateAsync({
        document_type: item.type,
        category: item.category || 'Umum',
        letter_number: item.form.letter_number,
        letter_date: item.form.letter_date || null,
        sender: item.form.sender,
        receiver: item.form.receiver,
        subject: item.form.subject,
        classification: item.form.classification,
        file_url: urlData.publicUrl,
        file_name: item.file.name,
        uploaded_by: user.id,
        // PENAMBAHAN INFO PENGUNGGAH
        uploader_name: employee?.name || 'User',
        uploader_id: user.id,
      });
      
      setFiles(prev => prev.map(f => f.id === item.id ? { ...f, status: 'done' as const } : f));
      return true;
    } catch (err: any) {
      setFiles(prev => prev.map(f => f.id === item.id ? { ...f, status: 'error' as const, error: err.message } : f));
      return false;
    }
  };

  const triggerSaveAll = () => {
    const readyFiles = files.filter(f => f.status === 'ready');
    if (readyFiles.length === 0) { 
      toast.error('Tidak ada file yang siap disimpan'); 
      return; 
    }
    if (readyFiles.some(f => !f.category)) {
      toast.error('Beberapa dokumen belum dipilih kategorinya!');
      return;
    }
    setShowConfirm(true);
  };

  const handleAcceptAll = async () => {
    setShowConfirm(false);
    const readyFiles = files.filter(f => f.status === 'ready');
    setSaving(true);
    let success = 0, fail = 0;
    for (const item of readyFiles) {
      const ok = await submitOne(item);
      if (ok) success++; else fail++;
    }
    setSaving(false);
    if (success > 0) toast.success(`${success} dokumen berhasil disimpan`);
    if (fail > 0) toast.error(`${fail} dokumen gagal disimpan`);
  };

  const readyCount = files.filter(f => f.status === 'ready').length;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
      <div className="lg:col-span-2 space-y-4">
        <Card className="border-border shadow-sm">
          <CardHeader className="pb-3 border-b">
            <CardTitle className="text-lg">Daftar Antrean Upload</CardTitle>
          </CardHeader>
          <CardContent className="p-4 space-y-4">
            <label
              className={`flex flex-col items-center justify-center w-full h-20 border-2 border-dashed rounded-lg cursor-pointer transition-colors mb-2 ${
                dragOver ? 'border-primary bg-primary/5' : 'border-border hover:bg-muted/50'
              }`}
              onDragOver={e => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
            >
              <Upload className="mx-auto h-4 w-4 text-muted-foreground mb-1" />
              <p className="text-[10px] text-muted-foreground uppercase font-bold">Tambah File Lagi</p>
              <input type="file" accept=".pdf,.docx" multiple className="hidden" onChange={handleInputChange} />
            </label>

            <div className="space-y-4 max-h-[500px] overflow-y-auto pr-1">
              {files.map(item => (
                <div
                  key={item.id}
                  className={`flex flex-col gap-3 p-3 rounded-lg border transition-all ${
                    selectedId === item.id ? 'border-primary ring-1 ring-primary/20 bg-primary/[0.02]' : 'border-border'
                  } ${item.status === 'done' ? 'opacity-50 bg-muted/20' : ''}`}
                  onClick={() => setSelectedId(item.id)}
                >
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-primary shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold truncate">{item.file.name}</p>
                      <p className="text-[10px] text-muted-foreground uppercase">{item.status}</p>
                    </div>
                    {item.status === 'done' && <CheckCheck className="w-4 h-4 text-accent" />}
                    {['pending', 'ready', 'error'].includes(item.status) && (
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="h-6 w-6 p-0 hover:text-destructive" 
                        onClick={e => { e.stopPropagation(); removeFile(item.id); }}
                      >
                        <X className="w-3 h-3" />
                      </Button>
                    )}
                  </div>
                  
                  {item.status !== 'done' && (
                    <div className="grid grid-cols-2 gap-2" onClick={e => e.stopPropagation()}>
                      <div className="space-y-1">
                        <Label className="text-[9px] uppercase font-bold text-muted-foreground">Jenis Surat</Label>
                        <DocTypeSelect 
                          value={item.type} 
                          onValueChange={(v) => updateFileData(item.id, { type: v })} 
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-[9px] uppercase font-bold text-muted-foreground">Kategori</Label>
                        <DocCategorySelect 
                          value={item.category} 
                          onValueChange={(v) => updateFileData(item.id, { category: v as DocumentCategory })} 
                        />
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {files.length > 0 && (
              <div className="pt-4">
                <Button className="w-full gap-2 shadow-lg" disabled={readyCount === 0 || saving} onClick={triggerSaveAll}>
                  <CheckCheck className="w-4 h-4" />
                  {saving ? 'Proses Simpan...' : `Simpan Semua (${readyCount})`}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="lg:col-span-3">
        <Card className="border-border shadow-sm h-full sticky top-6">
          <CardHeader className="border-b">
            <CardTitle className="text-lg flex items-center gap-2">
              <Activity className="w-5 h-5 text-primary" />
              Metadata Dokumen
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            {selected && selected.status !== 'pending' ? (
              <div className="space-y-4">
                <div className="p-3 bg-muted/30 rounded-lg border border-border mb-4">
                  <p className="text-[10px] uppercase font-bold text-muted-foreground mb-1">File Aktif:</p>
                  <p className="text-sm font-medium">{selected.file.name}</p>
                </div>
                <MetadataForm form={selected.form} metadata={selected.extracted} onChange={updateForm} />
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-24 text-muted-foreground border-2 border-dashed rounded-xl opacity-50">
                <FileText className="w-12 h-12 mb-4" />
                <p className="text-sm font-medium">Klik salah satu dokumen di kiri</p>
                <p className="text-xs">untuk melengkapi rincian metadata</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <ConfirmDialog
        open={showConfirm}
        onOpenChange={setShowConfirm}
        title="Konfirmasi Upload Massal"
        description={`Anda akan menyimpan ${readyCount} dokumen sekaligus. Pastikan Jenis dan Kategori setiap surat sudah sesuai.`}
        confirmLabel="Ya, Simpan Sekarang"
        onConfirm={handleAcceptAll}
      />
    </div>
  );
}