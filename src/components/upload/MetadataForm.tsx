import type { ExtractedMetadata } from '@/types/document';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { CheckCircle, AlertTriangle } from 'lucide-react';

export interface MetadataFormValues {
  letter_number: string;
  letter_date: string;
  sender: string;
  receiver: string;
  subject: string;
  classification: string;
}

interface MetadataFormProps {
  form: MetadataFormValues;
  metadata: ExtractedMetadata | null;
  onChange: (form: MetadataFormValues) => void;
}

const fields = [
  { key: 'letter_number' as const, label: 'Nomor Surat', inputType: 'text' },
  { key: 'letter_date' as const, label: 'Tanggal Surat', inputType: 'date' },
  { key: 'sender' as const, label: 'Pengirim', inputType: 'text' },
  { key: 'receiver' as const, label: 'Penerima', inputType: 'text' },
  { key: 'subject' as const, label: 'Perihal', inputType: 'text' },
  { key: 'classification' as const, label: 'Sifat / Klasifikasi', inputType: 'text' },
] as const;

export default function MetadataForm({ form, metadata, onChange }: MetadataFormProps) {
  const getConfidenceIndicator = (confidence: number) => {
    if (confidence >= 0.7) return <CheckCircle className="w-4 h-4 text-accent" />;
    if (confidence > 0) return <AlertTriangle className="w-4 h-4 text-warning" />;
    return null;
  };

  return (
    <div className="space-y-4">
      {metadata && (
        <p className="text-xs text-muted-foreground">
          Field dengan ikon kuning memerlukan verifikasi
        </p>
      )}
      {fields.map(({ key, label, inputType }) => (
        <div key={key} className="space-y-1 pl-2">
          <div className="flex items-center gap-2">
            <Label>{label}</Label>
            {metadata && getConfidenceIndicator(metadata[key].confidence)}
          </div>
          <Input
            type={inputType}
            value={form[key]}
            onChange={e => onChange({ ...form, [key]: e.target.value })}
          />
        </div>
      ))}
    </div>
  );
}
