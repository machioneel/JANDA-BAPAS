import { useState, useCallback, useEffect } from 'react';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'; 
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { toast } from 'sonner';
import { Upload, FileText, X, CheckCheck, Activity, Eye, Loader2, AlertTriangle } from 'lucide-react';

const emptyForm: MetadataFormValues = {
  letter_number: '', 
  letter_date: '', 
  sender: '', 
  receiver: '', 
  subject: '', 
  classification: '',
  description: '', 
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
  isDuplicate?: boolean; // Indikator Duplikat
}

const mapDetectedCategory = (rawCategory: any): DocumentCategory => {
  const catStr = (typeof rawCategory === 'object' ? rawCategory?.value : rawCategory) || '';
  const normalized = String(catStr).toLowerCase().trim();
  
  if (normalized.includes('pegawai') || normalized.includes('sdm')) return 'Kepegawaian';
  if (normalized.includes('uang') || normalized.includes('dipa')) return 'Keuangan';
  if (normalized.includes('minta') || normalized.includes('litmas') || normalized.includes('pb') || normalized.includes('asimilasi')) return 'Permintaan';
  
  return 'Umum';
};

function PdfPreview({ file }: { file: File }) {
  const [url, setUrl] = useState<string>('');
  useEffect(() => {
    if (file.type !== 'application/pdf') return;
    const objectUrl = URL.createObjectURL(file);
    setUrl(objectUrl);
    return () => URL.revokeObjectURL(objectUrl); 
  }, [file]);

  if (file.type !== 'application/pdf') {
    return (
      <div className="flex flex-col items-center justify-center h-full bg-muted/10 text-muted-foreground border rounded-xl border-dashed py-20">
        <FileText className="w-12 h-12 opacity-30 mb-3" />
        <p className="text-sm font-medium">Pratinjau DOCX tidak didukung</p>
      </div>
    );
  }
  return <iframe src={url} className="w-full h-[600px] rounded-xl border border-border bg-background shadow-inner" title="PDF Preview" />;
}

export default function MultiUploadPanel() {
  const { user, employee } = useAuth();
  const createDocument = useCreateDocument();
  const [files, setFiles] = useState<MultiFile[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const selected = files.find(f => f.id === selectedId);

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
      
      const getString = (val: any): string => {
        if (typeof val === 'string') return val;
        if (val && typeof val === 'object' && 'value' in val) return String(val.value);
        return '';
      };

      const letterNumberStr = getString(extracted.letter_number);
      let isDuplicate = false;

      // --- CEK DUPLIKAT REAL-TIME ---
      if (letterNumberStr && letterNumberStr !== '-') {
        const { data: existingDoc } = await supabase
          .from('documents')
          .select('id')
          .eq('letter_number', letterNumberStr)
          .maybeSingle();

        if (existingDoc) {
          isDuplicate = true;
          toast.error(`Peringatan: Surat ${item.file.name} sudah ada di arsip!`, { duration: 5000 });
        } else {
          toast.success(`Metadata ${item.file.name} dideteksi`);
        }
      }
      // -------------------------------
      
      setFiles(prev => prev.map(f => {
        if (f.id !== item.id) return f;
        return {
          ...f,
          status: 'ready' as const,
          extracted,
          type: 'incoming', 
          category: mapDetectedCategory(extracted.category), 
          isDuplicate: isDuplicate, // Tandai sebagai duplikat
          error: isDuplicate ? 'Peringatan: Nomor Surat Duplikat' : undefined,
          form: {
            letter_number: letterNumberStr,
            letter_date: getString(extracted.letter_date),
            sender: getString(extracted.sender),
            receiver: getString(extracted.receiver),
            subject: getString(extracted.subject),
            classification: getString(extracted.classification),
            description: getString(extracted.description), 
          },
        };
      }));
        
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
    setFiles(prev => prev.map(f => {
      if (f.id !== selectedId) return f;
      // Hapus peringatan duplikat jika pengguna mengedit nomor surat
      const newDuplicateState = form.letter_number !== f.extracted?.letter_number?.value ? false : f.isDuplicate;
      return { ...f, form, isDuplicate: newDuplicateState, error: newDuplicateState ? 'Peringatan: Nomor Surat Duplikat' : undefined };
    }));
  };

  const updateFileData = (id: string, data: Partial<Pick<MultiFile, 'category' | 'type'>>) => {
    setFiles(prev => prev.map(f => f.id === id ? { ...f, ...data } : f));
  };

  const submitOne = async (item: MultiFile) => {
    if (!user) return false;
    try {
      setFiles(prev => prev.map(f => f.id === item.id ? { ...f, status: 'uploading' as const } : f));

      if (item.form.letter_number && item.form.letter_number !== '-') {
        const { data: existingDoc } = await supabase
          .from('documents')
          .select('id')
          .eq('letter_number', item.form.letter_number)
          .maybeSingle();

        if (existingDoc) {
          throw new Error(`Duplikat: Surat dengan nomor ${item.form.letter_number} sudah ada.`);
        }
      }
      
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
        description: item.form.description, 
        file_url: urlData.publicUrl,
        file_name: item.file.name,
        uploaded_by: user.id,
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
    
    // Peringatan ekstra jika ada antrean yang terindikasi duplikat
    const duplicateFilesCount = readyFiles.filter(f => f.isDuplicate).length;
    if (duplicateFilesCount > 0) {
      toast.warning(`${duplicateFilesCount} dokumen berpotensi gagal karena nomor surat duplikat.`);
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
    if (fail > 0) toast.error(`${fail} dokumen gagal disimpan karena duplikat/error`);
  };

  const readyCount = files.filter(f => f.status === 'ready').length;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
      <div className="lg:col-span-2 space-y-4">
        <Card className="border-border shadow-sm flex flex-col max-h-[85vh]">
          <CardHeader className="pb-3 border-b shrink-0">
            <CardTitle className="text-lg">Daftar Antrean Upload</CardTitle>
          </CardHeader>
          <CardContent className="p-4 space-y-4 flex-1 flex flex-col min-h-0">
            <label
              className={`flex flex-col items-center justify-center w-full h-20 border-2 border-dashed rounded-lg cursor-pointer transition-colors shrink-0 mb-2 ${
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

            <div className="space-y-3 overflow-y-auto flex-1 pr-1 custom-scrollbar">
              {files.map(item => (
                <div
                  key={item.id}
                  className={`flex flex-col gap-3 p-3 rounded-lg border transition-all ${
                    selectedId === item.id 
                      ? (item.isDuplicate ? 'border-destructive ring-1 ring-destructive/20 bg-destructive/5' : 'border-primary ring-1 ring-primary/20 bg-primary/[0.04]') 
                      : (item.isDuplicate ? 'border-destructive/30 bg-destructive/[0.02]' : 'border-border bg-card hover:bg-muted/30')
                  } ${item.status === 'done' ? 'opacity-50 bg-muted/20' : ''}`}
                  onClick={() => setSelectedId(item.id)}
                >
                  <div className="flex items-center gap-2">
                    {item.isDuplicate ? (
                      <AlertTriangle className={`w-4 h-4 shrink-0 ${selectedId === item.id ? 'text-destructive' : 'text-destructive/70'}`} />
                    ) : (
                      <FileText className={`w-4 h-4 shrink-0 ${selectedId === item.id ? 'text-primary' : 'text-muted-foreground'}`} />
                    )}
                    
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold truncate">{item.file.name}</p>
                      <p className={`text-[10px] uppercase font-medium mt-0.5 ${item.isDuplicate ? 'text-destructive' : 'text-muted-foreground'}`}>
                        {item.status} {item.error ? ` - ${item.error}` : ''}
                      </p>
                    </div>
                    {item.status === 'done' && <CheckCheck className="w-4 h-4 text-accent" />}
                    {['pending', 'ready', 'error'].includes(item.status) && (
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="h-6 w-6 p-0 hover:text-destructive text-muted-foreground" 
                        onClick={e => { e.stopPropagation(); removeFile(item.id); }}
                      >
                        <X className="w-3 h-3" />
                      </Button>
                    )}
                  </div>
                  
                  {item.status !== 'done' && (
                    <div className="grid grid-cols-2 gap-2" onClick={e => e.stopPropagation()}>
                      <div className="space-y-1">
                        <Label className="text-[9px] uppercase font-bold text-muted-foreground">Jenis</Label>
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
              {files.length === 0 && (
                <div className="flex flex-col items-center justify-center py-10 text-muted-foreground opacity-50">
                  <p className="text-sm">Belum ada antrean file</p>
                </div>
              )}
            </div>

            {files.length > 0 && (
              <div className="pt-3 border-t border-border shrink-0">
                <Button className="w-full gap-2 font-bold" disabled={readyCount === 0 || saving} onClick={triggerSaveAll}>
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCheck className="w-4 h-4" />}
                  {saving ? 'Proses Simpan...' : `Simpan Antrean (${readyCount})`}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="lg:col-span-3">
        <Card className={`border-border shadow-sm h-full max-h-[85vh] flex flex-col ${selected?.isDuplicate ? 'ring-1 ring-destructive/50' : ''}`}>
          <CardHeader className={`border-b pb-3 shrink-0 ${selected?.isDuplicate ? 'bg-destructive/10' : 'bg-muted/10'}`}>
            <CardTitle className={`text-lg flex items-center gap-2 ${selected?.isDuplicate ? 'text-destructive' : ''}`}>
              {selected?.isDuplicate ? <AlertTriangle className="w-5 h-5" /> : <Activity className="w-5 h-5 text-primary" />}
              {selected?.isDuplicate ? 'Perhatian: Nomor Surat Duplikat' : 'Verifikasi Data'}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0 flex-1 overflow-hidden flex flex-col">
            {selected && selected.status !== 'pending' ? (
              <Tabs defaultValue="metadata" className="w-full h-full flex flex-col">
                <div className="px-6 pt-4 shrink-0 bg-card">
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="metadata" className="font-bold">Form Metadata</TabsTrigger>
                    <TabsTrigger value="preview" className="font-bold gap-2"><Eye className="w-4 h-4" /> Pratinjau Asli</TabsTrigger>
                  </TabsList>
                  
                  <div className="mt-4 p-3 bg-muted/40 rounded-lg border border-border">
                    <p className="text-[10px] uppercase font-bold text-muted-foreground mb-0.5">Nama File Terpilih:</p>
                    <p className="text-sm font-semibold truncate">{selected.file.name}</p>
                  </div>
                </div>
                
                <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
                  <TabsContent value="metadata" className="m-0 space-y-4">
                    <MetadataForm form={selected.form} metadata={selected.extracted} onChange={updateForm} />
                  </TabsContent>
                  
                  <TabsContent value="preview" className="m-0 h-full min-h-[500px]">
                    <PdfPreview file={selected.file} />
                  </TabsContent>
                </div>
              </Tabs>
            ) : (
              <div className="flex flex-col items-center justify-center h-full py-24 text-muted-foreground bg-muted/5">
                <FileText className="w-16 h-16 mb-4 opacity-20" />
                <p className="text-base font-bold text-foreground">Detail Dokumen Kosong</p>
                <p className="text-sm mt-1">Klik salah satu dokumen di antrean sebelah kiri</p>
                <p className="text-xs opacity-70">untuk melengkapi rincian dan melihat pratinjau</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <ConfirmDialog
        open={showConfirm}
        onOpenChange={setShowConfirm}
        title="Konfirmasi Upload Massal"
        description={`Anda akan menyimpan ${readyCount} dokumen sekaligus. Dokumen duplikat akan otomatis DITOLAK oleh database saat diunggah.`}
        confirmLabel="Ya, Simpan Sekarang"
        onConfirm={handleAcceptAll}
      />
    </div>
  );
}