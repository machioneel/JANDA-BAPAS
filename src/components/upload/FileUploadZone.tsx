import { useState, useCallback } from 'react';
import { Upload, FileText, X, CheckCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

export interface UploadFileItem {
  id: string;
  file: File;
  status: 'pending' | 'extracting' | 'ready' | 'uploading' | 'done' | 'error';
  error?: string;
}

interface FileUploadZoneProps {
  files: UploadFileItem[];
  onFilesAdded: (files: File[]) => void;
  onRemoveFile: (id: string) => void;
}

export default function FileUploadZone({ files, onFilesAdded, onRemoveFile }: FileUploadZoneProps) {
  const [dragOver, setDragOver] = useState(false);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const droppedFiles = Array.from(e.dataTransfer.files).filter(f => {
      const ext = f.name.split('.').pop()?.toLowerCase();
      return ext === 'pdf' || ext === 'docx';
    });
    if (droppedFiles.length) onFilesAdded(droppedFiles);
  }, [onFilesAdded]);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(e.target.files ?? []);
    if (selected.length) onFilesAdded(selected);
    e.target.value = '';
  }, [onFilesAdded]);

  const statusIcon = (status: UploadFileItem['status']) => {
    switch (status) {
      case 'extracting': return <Loader2 className="w-4 h-4 animate-spin text-primary" />;
      case 'ready': return <CheckCircle className="w-4 h-4 text-accent" />;
      case 'uploading': return <Loader2 className="w-4 h-4 animate-spin text-primary" />;
      case 'done': return <CheckCircle className="w-4 h-4 text-accent" />;
      case 'error': return <X className="w-4 h-4 text-destructive" />;
      default: return null;
    }
  };

  const statusText = (item: UploadFileItem) => {
    switch (item.status) {
      case 'extracting': return 'Mengekstrak...';
      case 'ready': return 'Siap';
      case 'uploading': return 'Mengunggah...';
      case 'done': return 'Selesai';
      case 'error': return item.error || 'Gagal';
      default: return 'Menunggu';
    }
  };

  return (
    <div className="space-y-4">
      <label
        className={`flex flex-col items-center justify-center w-full h-40 border-2 border-dashed rounded-lg cursor-pointer transition-colors ${
          dragOver ? 'border-primary bg-primary/5' : 'border-border hover:bg-muted/50'
        }`}
        onDragOver={e => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
      >
        <Upload className="mx-auto h-8 w-8 text-muted-foreground mb-2" />
        <p className="text-sm text-muted-foreground">Klik atau seret file ke sini</p>
        <p className="text-xs text-muted-foreground">PDF atau DOCX · Bisa pilih banyak file</p>
        <input
          type="file"
          accept=".pdf,.docx"
          multiple
          className="hidden"
          onChange={handleInputChange}
        />
      </label>

      {files.length > 0 && (
        <div className="space-y-2 max-h-[300px] overflow-y-auto">
          {files.map(item => (
            <div key={item.id} className="flex items-center gap-3 p-3 rounded-md bg-muted/30 border border-border">
              <FileText className="w-5 h-5 text-primary shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{item.file.name}</p>
                <p className="text-xs text-muted-foreground">
                  {(item.file.size / 1024 / 1024).toFixed(2)} MB · {statusText(item)}
                </p>
              </div>
              {statusIcon(item.status)}
              {(item.status === 'pending' || item.status === 'ready' || item.status === 'error') && (
                <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => onRemoveFile(item.id)}>
                  <X className="w-4 h-4" />
                </Button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
