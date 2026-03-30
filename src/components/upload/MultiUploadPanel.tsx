import { useState, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useCreateDocument } from '@/hooks/useDocuments';
import { supabase } from '@/integrations/supabase/client';
import { extractMetadata } from '@/services/documentParser/extractMetadata';
import { parseDocx } from '@/services/documentParser/parseDocx';
import { parsePdf } from '@/services/documentParser/parsePdf';
import type { ExtractedMetadata, DocumentType } from '@/types/document';
import type { MetadataFormValues } from '@/components/upload/MetadataForm';
import MetadataForm from '@/components/upload/MetadataForm';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { DocTypeSelect } from '@/components/DocTypeSelect';
import { toast } from 'sonner';
import { Upload, FileText, X, Loader2, CheckCircle, CheckCheck, Trash2 } from 'lucide-react';

const emptyForm: MetadataFormValues = {
  letter_number: '', letter_date: '', sender: '', receiver: '', subject: '', classification: '',
};

interface MultiFile {
  id: string;
  file: File;
  status: 'pending' | 'extracting' | 'ready' | 'uploading' | 'done' | 'error';
  error?: string;
  extracted: ExtractedMetadata | null;
  form: MetadataFormValues;
}

interface MultiUploadPanelProps {
  docType: DocumentType;
  onDocTypeChange: (v: DocumentType) => void;
}

export default function MultiUploadPanel({ docType, onDocTypeChange }: MultiUploadPanelProps) {
  const { user } = useAuth();
  const createDocument = useCreateDocument();
  const [files, setFiles] = useState<MultiFile[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  const selected = files.find(f => f.id === selectedId);

  const extractFile = useCallback(async (item: MultiFile) => {
    try {
      setFiles(prev => prev.map(f => f.id === item.id ? { ...f, status: 'extracting' as const } : f));
      let text = '';
      const ext = item.file.name.split('.').pop()?.toLowerCase();
      if (ext === 'pdf') text = await parsePdf(item.file);
      else if (ext === 'docx') text = await parseDocx(item.file);
      else throw new Error('Format tidak didukung');

      const extracted = extractMetadata(text);
      setFiles(prev => prev.map(f => f.id === item.id ? {
        ...f,
        status: 'ready' as const,
        extracted,
        form: {
          letter_number: extracted.letter_number.value,
          letter_date: extracted.letter_date.value,
          sender: extracted.sender.value,
          receiver: extracted.receiver.value,
          subject: extracted.subject.value,
          classification: extracted.classification.value,
        },
      } : f));
    } catch {
      setFiles(prev => prev.map(f => f.id === item.id ? { ...f, status: 'error' as const, error: 'Gagal ekstrak' } : f));
    }
  }, []);

  const handleFilesAdded = useCallback((newFiles: File[]) => {
    const items: MultiFile[] = newFiles.map(file => ({
      id: `${Date.now()}_${Math.random().toString(36).slice(2)}`,
      file,
      status: 'pending' as const,
      extracted: null,
      form: emptyForm,
    }));
    setFiles(prev => [...prev, ...items]);
    if (!selectedId && items.length > 0) setSelectedId(items[0].id);
    items.forEach(item => extractFile(item));
  }, [selectedId, extractFile]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const droppedFiles = Array.from(e.dataTransfer.files).filter(f => {
      const ext = f.name.split('.').pop()?.toLowerCase();
      return ext === 'pdf' || ext === 'docx';
    });
    if (droppedFiles.length) handleFilesAdded(droppedFiles);
  }, [handleFilesAdded]);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(e.target.files ?? []);
    if (selected.length) handleFilesAdded(selected);
    e.target.value = '';
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

  const submitOne = async (item: MultiFile) => {
    if (!user) return;
    setFiles(prev => prev.map(f => f.id === item.id ? { ...f, status: 'uploading' as const } : f));
    try {
      const fileName = `${Date.now()}_${item.file.name}`;
      const { error: uploadError } = await supabase.storage.from('bapas-documents').upload(fileName, item.file);
      if (uploadError) throw uploadError;
      const { data: urlData } = supabase.storage.from('bapas-documents').getPublicUrl(fileName);

      await createDocument.mutateAsync({
        document_type: docType,
        letter_number: item.form.letter_number,
        letter_date: item.form.letter_date || null,
        sender: item.form.sender,
        receiver: item.form.receiver,
        subject: item.form.subject,
        classification: item.form.classification,
        file_url: urlData.publicUrl,
        file_name: item.file.name,
        uploaded_by: user.id,
      });
      setFiles(prev => prev.map(f => f.id === item.id ? { ...f, status: 'done' as const } : f));
      return true;
    } catch (err: any) {
      setFiles(prev => prev.map(f => f.id === item.id ? { ...f, status: 'error' as const, error: err.message } : f));
      return false;
    }
  };

  const handleAcceptAll = async () => {
    const readyFiles = files.filter(f => f.status === 'ready');
    if (readyFiles.length === 0) { toast.error('Tidak ada file yang siap'); return; }
    setSaving(true);
    let success = 0, fail = 0;
    for (const item of readyFiles) {
      const ok = await submitOne(item);
      if (ok) success++; else fail++;
    }
    setSaving(false);
    if (success > 0) toast.success(`${success} dokumen berhasil disimpan`);
    if (fail > 0) toast.error(`${fail} dokumen gagal`);
  };

  const readyCount = files.filter(f => f.status === 'ready').length;
  const doneCount = files.filter(f => f.status === 'done').length;

  const statusIcon = (status: MultiFile['status']) => {
    if (status === 'extracting' || status === 'uploading') return <Loader2 className="w-4 h-4 animate-spin text-primary shrink-0" />;
    if (status === 'ready') return <CheckCircle className="w-4 h-4 text-accent shrink-0" />;
    if (status === 'done') return <CheckCheck className="w-4 h-4 text-accent shrink-0" />;
    if (status === 'error') return <X className="w-4 h-4 text-destructive shrink-0" />;
    return null;
  };

  const statusLabel = (item: MultiFile) => {
    switch (item.status) {
      case 'extracting': return 'Mengekstrak...';
      case 'ready': return 'Siap';
      case 'uploading': return 'Mengunggah...';
      case 'done': return 'Tersimpan';
      case 'error': return item.error || 'Gagal';
      default: return 'Menunggu';
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
      {/* Left: File list */}
      <div className="lg:col-span-2 space-y-4">
        <Card className="border-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">File Dokumen</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <label
              className={`flex flex-col items-center justify-center w-full h-28 border-2 border-dashed rounded-lg cursor-pointer transition-colors ${
                dragOver ? 'border-primary bg-primary/5' : 'border-border hover:bg-muted/50'
              }`}
              onDragOver={e => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
            >
              <Upload className="mx-auto h-6 w-6 text-muted-foreground mb-1" />
              <p className="text-sm text-muted-foreground">Seret file atau klik untuk pilih</p>
              <p className="text-xs text-muted-foreground">PDF / DOCX · Bisa banyak file</p>
              <input type="file" accept=".pdf,.docx" multiple className="hidden" onChange={handleInputChange} />
            </label>

            <div>
              <Label>Jenis Surat (semua file)</Label>
              <DocTypeSelect value={docType} onValueChange={onDocTypeChange} />
            </div>

            {files.length > 0 && (
              <div className="space-y-1 max-h-[400px] overflow-y-auto">
                {files.map(item => (
                  <div
                    key={item.id}
                    className={`flex items-center gap-2 p-2.5 rounded-md border cursor-pointer transition-colors ${
                      selectedId === item.id ? 'border-primary bg-primary/5' : 'border-border hover:bg-muted/30'
                    } ${item.status === 'done' ? 'opacity-60' : ''}`}
                    onClick={() => setSelectedId(item.id)}
                  >
                    <FileText className="w-4 h-4 text-primary shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium truncate">{item.file.name}</p>
                      <p className="text-[10px] text-muted-foreground">{statusLabel(item)}</p>
                    </div>
                    {statusIcon(item.status)}
                    {(item.status === 'pending' || item.status === 'ready' || item.status === 'error') && (
                      <Button variant="ghost" size="sm" className="h-6 w-6 p-0 shrink-0" onClick={e => { e.stopPropagation(); removeFile(item.id); }}>
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            )}

            {files.length > 0 && (
              <div className="space-y-2 pt-2 border-t border-border">
                <Button className="w-full gap-2" disabled={readyCount === 0 || saving} onClick={handleAcceptAll}>
                  <CheckCheck className="w-4 h-4" />
                  {saving ? 'Mengunggah...' : `Simpan Semua (${readyCount})`}
                </Button>
                {doneCount > 0 && (
                  <p className="text-xs text-accent text-center">{doneCount} dokumen telah disimpan</p>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Right: Metadata editor */}
      <div className="lg:col-span-3">
        <Card className="border-border">
          <CardHeader>
            <CardTitle className="text-lg">
              {selected ? `Metadata — ${selected.file.name.length > 35 ? selected.file.name.slice(0, 32) + '...' : selected.file.name}` : 'Metadata'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {selected && selected.status !== 'pending' ? (
              <MetadataForm form={selected.form} metadata={selected.extracted} onChange={updateForm} />
            ) : (
              <p className="text-sm text-muted-foreground py-8 text-center">
                {files.length === 0 ? 'Upload file untuk mulai' : 'Pilih file di daftar untuk edit metadata'}
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
