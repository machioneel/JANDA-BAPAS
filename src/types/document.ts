// 1. Tipe untuk Jenis Surat Utama
export type DocumentType = 'incoming' | 'outgoing' | 'nota_dinas' | 'laporan_litmas' | 'surat_keputusan';

// 2. Konstanta Label untuk Jenis Surat (UI Display)
export const DOCUMENT_TYPE_LABELS: Record<DocumentType, string> = {
  incoming: 'Surat Masuk',
  outgoing: 'Surat Keluar',
  nota_dinas: 'Nota Dinas',
  laporan_litmas: 'Laporan Litmas',
  surat_keputusan: 'Surat Keputusan',
};

// 3. Tipe Kategori / Unit Kerja
export type DocumentCategory = 'Umum' | 'Keuangan' | 'Kepegawaian' | 'Litmas' | 'TPP' | 'Pengawasan' | 'Pembimbingan';

// 4. Antarmuka Utama Dokumen (Sesuai Database Supabase)
export interface Document {
  id: string;
  document_type: DocumentType;
  category: string; // Di DB biasanya disimpan sebagai string
  letter_number: string;
  letter_date: string | null;
  sender: string;
  receiver: string;
  subject: string;
  classification: string;
  file_url: string;
  file_name: string;
  uploaded_by: string;
  uploader_name: string; // Nama petugas pengunggah
  uploader_id: string;   // ID petugas pengunggah
  created_at: string;
}

// 5. Payload untuk membuat dokumen baru (Create Action)
// Digunakan di useCreateDocument dan fungsi upload
export interface CreateDocumentPayload {
  document_type: DocumentType;
  category: string;
  letter_number: string;
  letter_date?: string | null;
  sender: string;
  receiver: string;
  subject: string;
  classification: string;
  file_url: string;
  file_name: string;
  uploaded_by: string;
  uploader_name: string;
  uploader_id: string;
}

// 6. Payload untuk memperbarui dokumen (Update Action)
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
  
  // Klasifikasi otomatis dari AI (Optional)
  document_type?: { value: string; confidence: number }; 
  category?: { value: string; confidence: number };      
}