// 1. Tipe untuk Jenis Surat Utama (Hanya Surat Masuk)
export type DocumentType = 'incoming';

// 2. Konstanta Label untuk Jenis Surat (UI Display)
export const DOCUMENT_TYPE_LABELS: Record<DocumentType, string> = {
  incoming: 'Surat Masuk',
};

// 3. Tipe Kategori (Hanya 4 Kategori)
export type DocumentCategory = 'Umum' | 'Kepegawaian' | 'Keuangan' | 'Permintaan';

// 4. Antarmuka Utama Dokumen
export interface Document {
  id: string;
  document_type: DocumentType;
  category: string;
  letter_number: string;
  letter_date: string | null;
  sender: string;
  receiver: string;
  subject: string;
  classification: string;
  description: string; // <-- Tambahan
  file_url: string;
  file_name: string;
  uploaded_by: string;
  uploader_name: string;
  uploader_id: string;
  created_at: string;
}

// 5. Payload untuk membuat dokumen baru
export interface CreateDocumentPayload {
  document_type: DocumentType;
  category: string;
  letter_number: string;
  letter_date?: string | null;
  sender: string;
  receiver: string;
  subject: string;
  classification: string;
  description: string; // <-- Tambahan
  file_url: string;
  file_name: string;
  uploaded_by: string;
  uploader_name: string;
  uploader_id: string;
}

// 6. Payload untuk memperbarui dokumen
export interface UpdateDocumentPayload extends Partial<CreateDocumentPayload> {
  id: string;
}

// 7. Struktur hasil ekstraksi AI/Regex
export interface ExtractedMetadata {
  letter_number: { value: string; confidence: number };
  letter_date: { value: string; confidence: number };
  sender: { value: string; confidence: number };
  receiver: { value: string; confidence: number };
  subject: { value: string; confidence: number };
  classification: { value: string; confidence: number };
  description?: { value: string; confidence: number }; // <-- Tambahan
  document_type?: { value: string; confidence: number }; 
  category?: { value: string; confidence: number };      
}