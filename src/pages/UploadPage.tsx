import { useState, useCallback, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useCreateDocument } from '@/hooks/useDocuments';
import { supabase } from '@/integrations/supabase/client';
import { extractMetadata } from '@/services/documentParser/extractMetadata';
import { parseDocx } from '@/services/documentParser/parseDocx';
import { parsePdf } from '@/services/documentParser/parsePdf';
import type { ExtractedMetadata, DocumentType, DocumentCategory } from '@/types/document';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { DocTypeSelect } from '@/components/DocTypeSelect';
import { DocCategorySelect } from '@/components/DocCategorySelect'; 
import { toast } from 'sonner';
import MetadataForm, { type MetadataFormValues } from '@/components/upload/MetadataForm';
import MultiUploadPanel from '@/components/upload/MultiUploadPanel';
import { Upload, FileText, X, Loader2, CheckCircle, Files, AlertTriangle } from 'lucide-react';
import { ConfirmDialog } from '@/components/ConfirmDialog';

const emptyForm: MetadataFormValues = {
  letter_number: '', letter_date: '', sender: '', receiver: '', subject: '', classification: '', description: '',
};

type SingleStatus = 'idle' | 'extracting' | 'ready' | 'uploading' | 'done' | 'error';

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
      <div className="flex items-center justify-center h-full bg-muted/20 text-muted-foreground text-sm border rounded-xl border-dashed">
        Pratinjau langsung untuk file DOCX tidak didukung browser.
      </div>
    );
  }
  return <iframe src={url} className="w-full h-full rounded-xl border border-border bg-background" title="PDF Preview" />;
}

export default function UploadPage() {
  const { user, employee } = useAuth(); 
  const createDocument = useCreateDocument();

  const [mode, setMode] = useState<'single' | 'multi'>('single');
  const [singleFile, setSingleFile] = useState<File | null>(null);
  const [singleStatus, setSingleStatus] = useState<SingleStatus>('idle');
  const [singleExtracted, setSingleExtracted] = useState<ExtractedMetadata | null>(null);
  const [singleForm, setSingleForm] = useState<MetadataFormValues>(emptyForm);
  const [isDuplicateWarning, setIsDuplicateWarning] = useState(false); // State baru untuk penanda UI
  
  const [docType, setDocType] = useState<DocumentType>('incoming');
  const [docCategory, setDocCategory] = useState<DocumentCategory | ''>('');
  const [showConfirm, setShowConfirm] = useState(false);
  const [saving, setSaving] = useState(false);

  const handleSingleFile = useCallback(async (file: File) => {
    setSingleFile(file);
    setSingleStatus('extracting');
    setSingleExtracted(null);
    setSingleForm(emptyForm);
    setDocCategory(''); 
    setIsDuplicateWarning(false);

    try {
      let text = '';
      const ext = file.name.split('.').pop()?.toLowerCase();
      if (ext === 'pdf') text = await parsePdf(file);
      else if (ext === 'docx') text = await parseDocx(file);
      else throw new Error('Format tidak didukung');

      const extracted = await extractMetadata(text);
      setSingleExtracted(extracted);
      
      const detectedCategory = mapDetectedCategory(extracted.category);
      setDocCategory(detectedCategory);
      
      const letterNumberValue = extracted.letter_number.value;

      setSingleForm({
        letter_number: letterNumberValue,
        letter_date: extracted.letter_date.value,
        sender: extracted.sender.value,
        receiver: extracted.receiver.value,
        subject: extracted.subject.value,
        classification: extracted.classification.value,
        description: extracted.description?.value || '',
      });
      
      setSingleStatus('ready');

      // --- CEK DUPLIKAT REAL-TIME ---
      if (letterNumberValue && letterNumberValue !== '-') {
        const { data: existingDoc } = await supabase
          .from('documents')
          .select('id')
          .eq('letter_number', letterNumberValue)
          .maybeSingle();

        if (existingDoc) {
          setIsDuplicateWarning(true);
          toast.error(`Perhatian: Surat dengan nomor ${letterNumberValue} sudah pernah diunggah di arsip!`, { duration: 6000 });
        } else {
          toast.success('Metadata berhasil diekstrak');
        }
      } else {
        toast.success('Metadata berhasil diekstrak (Nomor surat kosong)');
      }
      // -------------------------------

    } catch (err) {
      console.error('Extraction error:', err);
      setSingleStatus('error');
      toast.error('Gagal mengekstrak metadata');
    }
  }, []);

  const handleSingleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const file = Array.from(e.dataTransfer.files).find(f => {
      const ext = f.name.split('.').pop()?.toLowerCase();
      return ext === 'pdf' || ext === 'docx';
    });
    if (file) handleSingleFile(file);
  }, [handleSingleFile]);

  const handleSingleInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleSingleFile(file);
    e.target.value = '';
  }, [handleSingleFile]);

  const handleSingleSubmit = async () => {
    if (!user || !singleFile || singleStatus !== 'ready') return;
    if (!docCategory) { toast.error('Harap pilih kategori surat'); return; }

    setSaving(true);
    setSingleStatus('uploading');
    try {
      if (singleForm.letter_number && singleForm.letter_number !== '-') {
        const { data: existingDoc, error: checkError } = await supabase
          .from('documents')
          .select('id')
          .eq('letter_number', singleForm.letter_number)
          .maybeSingle();

        if (checkError) throw checkError;
        if (existingDoc) {
          toast.error(`Gagal Menyimpan! Nomor surat ${singleForm.letter_number} sudah ada di database.`);
          setSaving(false);
          setSingleStatus('ready'); 
          setIsDuplicateWarning(true);
          return; 
        }
      }

      const fileName = `${Date.now()}_${singleFile.name}`;
      const { error: uploadError } = await supabase.storage.from('bapas-documents').upload(fileName, singleFile);
      if (uploadError) throw uploadError;
      const { data: urlData } = supabase.storage.from('bapas-documents').getPublicUrl(fileName);

      await createDocument.mutateAsync({
        document_type: docType,
        category: docCategory,
        letter_number: singleForm.letter_number,
        letter_date: singleForm.letter_date || null,
        sender: singleForm.sender,
        receiver: singleForm.receiver,
        subject: singleForm.subject,
        classification: singleForm.classification,
        description: singleForm.description, 
        file_url: urlData.publicUrl,
        file_name: singleFile.name,
        uploaded_by: user.id,
        uploader_id: employee?.id || user.id, 
        uploader_name: employee?.name || 'Unknown', 
      });
      
      setSingleStatus('done');
      setIsDuplicateWarning(false);
      toast.success('Dokumen berhasil disimpan');
    } catch (err: any) {
      console.error(err);
      setSingleStatus('error');
      toast.error(err.message || 'Gagal mengunggah dokumen');
    } finally {
      setSaving(false);
    }
  };

  const resetSingle = () => {
    setSingleFile(null);
    setSingleStatus('idle');
    setSingleExtracted(null);
    setSingleForm(emptyForm);
    setDocCategory('');
    setIsDuplicateWarning(false);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Upload Dokumen</h1>
          <p className="text-sm text-muted-foreground">Unggah dan arsipkan dokumen surat</p>
        </div>
        <Button
          variant={mode === 'multi' ? 'default' : 'outline'}
          onClick={() => setMode(mode === 'single' ? 'multi' : 'single')}
          className="gap-2"
        >
          <Files className="w-4 h-4" />
          {mode === 'single' ? 'Beralih Multi Upload' : 'Beralih Single Upload'}
        </Button>
      </div>

      {mode === 'single' ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="border-border flex flex-col">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">File Dokumen & Pratinjau</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 flex-1 flex flex-col">
              {!singleFile ? (
                <label
                  className="flex flex-col items-center justify-center w-full flex-1 min-h-[300px] border-2 border-dashed rounded-xl cursor-pointer transition-all border-border hover:border-primary/50 hover:bg-primary/5"
                  onDragOver={e => e.preventDefault()}
                  onDrop={handleSingleDrop}
                >
                  <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-3">
                    <Upload className="h-6 w-6 text-primary" />
                  </div>
                  <p className="text-sm font-medium text-foreground">Klik atau seret file ke sini</p>
                  <p className="text-xs text-muted-foreground mt-1">Hanya PDF atau DOCX</p>
                  <input type="file" accept=".pdf,.docx" className="hidden" onChange={handleSingleInput} />
                </label>
              ) : (
                <>
                  <div className={`flex items-center gap-3 p-3 rounded-xl border shrink-0 ${isDuplicateWarning ? 'bg-destructive/10 border-destructive/30' : 'bg-muted/30 border-border'}`}>
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${isDuplicateWarning ? 'bg-destructive/20' : 'bg-primary/10'}`}>
                      {isDuplicateWarning ? <AlertTriangle className="w-5 h-5 text-destructive" /> : <FileText className="w-5 h-5 text-primary" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold truncate text-foreground">{singleFile.name}</p>
                      <p className={`text-xs font-medium uppercase tracking-wider mt-0.5 ${isDuplicateWarning ? 'text-destructive' : 'text-muted-foreground'}`}>
                        {singleStatus === 'extracting' && 'AI Mengekstrak...'}
                        {singleStatus === 'ready' && (isDuplicateWarning ? 'Peringatan Duplikat!' : 'Siap Disimpan')}
                        {singleStatus === 'uploading' && 'Mengunggah...'}
                        {singleStatus === 'done' && 'Tersimpan'}
                        {singleStatus === 'error' && 'Gagal'}
                      </p>
                    </div>
                    {singleStatus === 'extracting' && <Loader2 className="w-5 h-5 animate-spin text-primary" />}
                    {(singleStatus === 'ready' || singleStatus === 'done') && !isDuplicateWarning && <CheckCircle className="w-5 h-5 text-accent" />}
                    {(singleStatus === 'ready' || singleStatus === 'error' || singleStatus === 'done') && (
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive" onClick={resetSingle}>
                        <X className="w-4 h-4" />
                      </Button>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-4 shrink-0">
                    <div>
                      <Label className="text-xs text-muted-foreground mb-1 block">Jenis Surat</Label>
                      <DocTypeSelect value={docType} onValueChange={setDocType} />
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground mb-1 block">Kategori / Unit</Label>
                      <DocCategorySelect value={docCategory} onValueChange={setDocCategory} />
                    </div>
                  </div>

                  {/* PDF Preview Container */}
                  <div className="mt-2 flex-1 w-full min-h-[400px]">
                    <PdfPreview file={singleFile} />
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          <Card className={`border-border ${isDuplicateWarning ? 'ring-2 ring-destructive/50' : ''}`}>
            <CardHeader>
              <CardTitle className="text-lg">
                Hasil Ekstraksi Metadata
              </CardTitle>
            </CardHeader>
            <CardContent>
              {singleStatus !== 'idle' && singleFile ? (
                <>
                  <MetadataForm 
                    form={singleForm} 
                    metadata={singleExtracted} 
                    onChange={(newForm) => {
                      setSingleForm(newForm);
                      if (newForm.letter_number !== singleExtracted?.letter_number.value) {
                         setIsDuplicateWarning(false); // Reset peringatan jika nomor diubah manual
                      }
                    }} 
                  />
                  <div className="mt-6 pt-4 border-t border-border">
                    <Button 
                      className="w-full h-11 font-bold text-base" 
                      variant={isDuplicateWarning ? 'destructive' : 'default'}
                      disabled={singleStatus !== 'ready' || saving} 
                      onClick={() => setShowConfirm(true)} 
                    >
                      {saving ? (
                        <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Menyimpan...</>
                      ) : isDuplicateWarning ? 'Peringatan: Dokumen Duplikat' : 'Simpan ke Arsip'}
                    </Button>

                    <ConfirmDialog
                      open={showConfirm}
                      onOpenChange={setShowConfirm}
                      title={isDuplicateWarning ? "Peringatan Duplikasi!" : "Simpan Dokumen?"}
                      description={isDuplicateWarning ? `Nomor surat ini sudah terdaftar. Yakin ingin melanjutkan penyimpanan?` : `Pastikan metadata sudah sesuai dengan pratinjau dokumen di sebelah kiri.`}
                      confirmLabel={isDuplicateWarning ? "Tetap Simpan" : "Ya, Simpan"}
                      variant={isDuplicateWarning ? "destructive" : "default"}
                      onConfirm={() => {
                        setShowConfirm(false); 
                        handleSingleSubmit();  
                      }}
                    />
                    
                    {singleStatus === 'done' && (
                      <p className="text-xs font-bold text-accent text-center mt-3">Dokumen telah tersimpan di pangkalan data ✓</p>
                    )}
                  </div>
                </>
              ) : (
                <div className="flex flex-col items-center justify-center py-20 text-muted-foreground border-2 border-dashed rounded-xl opacity-60">
                  <FileText className="w-12 h-12 mb-3" />
                  <p className="text-sm">Metadata akan muncul di sini</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      ) : (
        <MultiUploadPanel/>
      )}
    </div>
  );
}