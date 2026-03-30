export type DocumentType = 'incoming' | 'outgoing' | 'nota_dinas' | 'laporan_litmas' | 'surat_keputusan';

export const DOCUMENT_TYPE_LABELS: Record<DocumentType, string> = {
  incoming: 'Surat Masuk',
  outgoing: 'Surat Keluar',
  nota_dinas: 'Nota Dinas',
  laporan_litmas: 'Laporan Litmas',
  surat_keputusan: 'Surat Keputusan',
};

export interface DocumentRecord {
  id: string;
  document_type: DocumentType;
  letter_number: string;
  letter_date: string;
  sender: string;
  receiver: string;
  subject: string;
  classification: string;
  file_url: string;
  file_name: string;
  uploaded_by: string;
  created_at: string;
}

export interface ExtractedMetadata {
  letter_number: { value: string; confidence: number };
  letter_date: { value: string; confidence: number };
  sender: { value: string; confidence: number };
  receiver: { value: string; confidence: number };
  subject: { value: string; confidence: number };
  classification: { value: string; confidence: number };
}
