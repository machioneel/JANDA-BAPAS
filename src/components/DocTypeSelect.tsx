import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DOCUMENT_TYPE_LABELS, type DocumentType } from "@/types/document";

interface DocTypeSelectProps {
  value: DocumentType | 'all' | ''; 
  onValueChange: (value: any) => void;
  includeAll?: boolean;
}

export function DocTypeSelect({ value, onValueChange, includeAll }: DocTypeSelectProps) {
  return (
    <Select value={value || 'incoming'} onValueChange={onValueChange} disabled={!includeAll}>
      <SelectTrigger className="bg-muted text-muted-foreground opacity-100">
        <SelectValue placeholder="Pilih Jenis Surat..." />
      </SelectTrigger>
      <SelectContent>
        {includeAll && (
          <SelectItem value="all">Semua Jenis Surat</SelectItem>
        )}
        
        {Object.entries(DOCUMENT_TYPE_LABELS).map(([key, label]) => (
          <SelectItem key={key} value={key}>
            {label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}