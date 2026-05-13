import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { DocumentCategory } from "@/types/document";

interface DocCategorySelectProps {
  value: DocumentCategory | '';
  onValueChange: (value: DocumentCategory) => void;
}

export function DocCategorySelect({ value, onValueChange }: DocCategorySelectProps) {
  return (
    <Select value={value} onValueChange={onValueChange}>
      <SelectTrigger>
        <SelectValue placeholder="Pilih Kategori Surat..." />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="Umum">Umum</SelectItem>
        <SelectItem value="Kepegawaian">Kepegawaian</SelectItem>
        <SelectItem value="Keuangan">Keuangan</SelectItem>
        <SelectItem value="Permintaan">Permintaan</SelectItem>
      </SelectContent>
    </Select>
  );
}