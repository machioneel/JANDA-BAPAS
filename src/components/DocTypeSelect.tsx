import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DOCUMENT_TYPE_LABELS, type DocumentType } from '@/types/document';

interface DocTypeSelectProps {
  value: DocumentType | string;
  onValueChange: (v: DocumentType) => void;
  includeAll?: boolean;
  className?: string;
}

export function DocTypeSelect({ value, onValueChange, includeAll = false, className }: DocTypeSelectProps) {
  return (
    <Select value={value || (includeAll ? 'all' : '')} onValueChange={(v) => onValueChange(v as DocumentType)}>
      <SelectTrigger className={className}><SelectValue placeholder="Pilih jenis" /></SelectTrigger>
      <SelectContent>
        {includeAll && <SelectItem value="all">Semua Jenis</SelectItem>}
        {Object.entries(DOCUMENT_TYPE_LABELS).map(([key, label]) => (
          <SelectItem key={key} value={key}>{label}</SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
