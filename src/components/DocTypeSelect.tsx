import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DOCUMENT_TYPE_LABELS, type DocumentType } from "@/types/document";

interface DocTypeSelectProps {
  // Kita izinkan value berupa DocumentType, 'all', atau string kosong
  value: DocumentType | 'all' | ''; 
  onValueChange: (value: any) => void;
  includeAll?: boolean; // Daftarkan properti ini agar bisa digunakan
}

export function DocTypeSelect({ value, onValueChange, includeAll }: DocTypeSelectProps) {
  return (
    <Select value={value} onValueChange={onValueChange}>
      <SelectTrigger>
        <SelectValue placeholder="Pilih Jenis Surat..." />
      </SelectTrigger>
      <SelectContent>
        {/* Tambahkan opsi 'all' jika properti includeAll dikirim */}
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