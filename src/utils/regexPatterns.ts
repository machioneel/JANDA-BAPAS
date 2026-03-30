// Regex patterns for Indonesian administrative document metadata extraction
// Optimized for: Surat Pemberitahuan, Nota Dinas, Jadwal Kegiatan, Surat Resmi Instansi

// --- LETTER NUMBER ---
export const LETTER_NUMBER_PATTERNS = [
  // Nota Dinas / Surat Resmi: "Nomor : WP.10.PAS.PAS.8-UM.01.01 - 892"
  /Nomor\s*:\s*([A-Za-z0-9\.\-\/\s]+(?:[-–]\s*\d+))/i,
  // "Nomor: SEK.2-UM.01.01-183"
  /Nomor\s*:\s*([A-Za-z0-9\.\-\/]+(?:[-\/][A-Za-z0-9\.\-]+)*)/i,
  // "No. : ..."
  /No\.?\s*:\s*([A-Za-z0-9\.\-\/\s]+(?:[-–]\s*\d+))/i,
  /No\.?\s*:\s*([A-Za-z0-9\.\-\/]+(?:[-\/][A-Za-z0-9\.\-]+)*)/i,
  // Nomor Surat
  /Nomor\s+Surat\s*:\s*(.+?)(?:\n|$)/i,
  // Standalone pattern like "SEK.2-UM.01.01-183" at start of line
  /^([A-Z]{2,5}[\.\-][0-9]+[\.\-][A-Z0-9\.\-\/]+)/m,
  // Pattern with WP prefix
  /^(WP[\.\-][A-Za-z0-9\.\-\/\s]+(?:[-–]\s*\d+))/m,
];

// --- LETTER DATE ---
export const LETTER_DATE_PATTERNS = [
  // "Tanggal : 04 Maret 2026" or "Tanggal: 27 Februari 2026"
  /Tanggal\s*:\s*(\d{1,2}\s+(?:Januari|Februari|Maret|April|Mei|Juni|Juli|Agustus|September|Oktober|November|Desember)\s+\d{4})/i,
  // Standalone date after city or on its own line: "11 Maret 2026"
  /(?:^|\n)\s*(\d{1,2}\s+(?:Januari|Februari|Maret|April|Mei|Juni|Juli|Agustus|September|Oktober|November|Desember)\s+\d{4})/im,
  // City prefix: "Jakarta, 12 Maret 2026"
  /(?:Jakarta|Bandung|Surabaya|Semarang|Medan|Makassar|[\w]+),?\s*(\d{1,2}\s+(?:Januari|Februari|Maret|April|Mei|Juni|Juli|Agustus|September|Oktober|November|Desember)\s+\d{4})/i,
  // Tgl. format
  /Tgl\.?\s*:\s*(\d{1,2}\s+(?:Januari|Februari|Maret|April|Mei|Juni|Juli|Agustus|September|Oktober|November|Desember)\s+\d{4})/i,
  // Numeric: DD/MM/YYYY or DD-MM-YYYY
  /(\d{1,2}[\-\/]\d{1,2}[\-\/]\d{2,4})/,
];

// --- SENDER ---
export const SENDER_PATTERNS = [
  // "Dari : Kepala Balai Pemasyarakatan Kelas I Jakarta Barat"
  /Dari\s*:\s*(.+?)(?:\n|$)/i,
  // "Pengirim : ..."
  /Pengirim\s*:\s*(.+?)(?:\n|$)/i,
  // Title-based: "Kepala ..." , "Direktur ..."
  /(?:Kepala|Direktur|Ketua|Pimpinan|Sekretaris)\s+(.+?)(?:\n|$)/i,
];

// --- RECEIVER ---
export const RECEIVER_PATTERNS = [
  // "Kepada: Seluruh Pegawai ..."
  /Kepada\s*:\s*(.+?)(?:\n|$)/i,
  // "Yth. : ..." or "Yth. :" (Nota Dinas variant)
  /Yth\.?\s*:?\s*(.+?)(?:\n|$)/i,
  // "Yang Terhormat ..."
  /Yang\s+Terhormat\s*:?\s*(.+?)(?:\n|$)/i,
  // "Tujuan : ..." or "Penerima : ..."
  /(?:Tujuan|Penerima)\s*:\s*(.+?)(?:\n|$)/i,
];

// --- SUBJECT ---
export const SUBJECT_PATTERNS = [
  // "Perihal : Kegiatan Safari Ramadhan ..."
  /Perihal\s*:\s*(.+?)(?:\n|$)/i,
  // "Hal : Pemberitahuan Ketentuan ..."
  /Hal\s*:\s*(.+?)(?:\n|$)/i,
  // "Subjek : ..."
  /Subjek\s*:\s*(.+?)(?:\n|$)/i,
  // "Tentang : ..."
  /Tentang\s*:\s*(.+?)(?:\n|$)/i,
  // "Mengenai : ..."
  /Mengenai\s*:\s*(.+?)(?:\n|$)/i,
];

// --- CLASSIFICATION ---
export const CLASSIFICATION_PATTERNS = [
  // "Sifat: Segera"
  /Sifat\s*:\s*(.+?)(?:\n|$)/i,
  // "Klasifikasi : ..."
  /Klasifikasi\s*:\s*(.+?)(?:\n|$)/i,
  // Direct keywords
  /\b(Rahasia|Biasa|Penting|Segera|Sangat\s+Segera|Konfidensial)\b/i,
];

// --- KOP SURAT (Institution Header) ---
export const KOP_PATTERNS = [
  /(?:KEMENTERIAN|DIREKTORAT|KANTOR|BALAI|BADAN|LEMBAGA|DINAS)\s+[A-Z\s]+(?:REPUBLIK\s+INDONESIA)?/i,
  /(?:BALAI\s+PEMASYARAKATAN|BAPAS)\s+[A-Z\s]+/i,
];

// --- DOCUMENT TYPE DETECTION ---
export const DOC_TYPE_PATTERNS = [
  { type: 'nota_dinas', pattern: /N\s*O\s*T\s*A\s+D\s*I\s*N\s*A\s*S/i },
  { type: 'nota_dinas', pattern: /NOTA\s*[-–]?\s*DINAS/i },
  { type: 'surat_pemberitahuan', pattern: /(?:Hal|Perihal)\s*:\s*Pemberitahuan/i },
  { type: 'jadwal', pattern: /JADWAL\s+/i },
  { type: 'surat_edaran', pattern: /SURAT\s+EDARAN/i },
  { type: 'surat_keputusan', pattern: /SURAT\s+KEPUTUSAN/i },
  { type: 'surat_perintah', pattern: /SURAT\s+PERINTAH/i },
];

// --- FOOTER SIGNER PATTERNS ---
export const FOOTER_SIGNER_PATTERNS = [
  // NIP pattern in footer
  /NIP\.?\s*:?\s*(\d[\d\s]+)/i,
  // Name in ALL CAPS (common for signer)
  /^([A-Z][A-Z\s\.]+)$/m,
];

// --- MONTH MAP ---
export const MONTH_MAP: Record<string, string> = {
  'januari': '01', 'februari': '02', 'maret': '03', 'april': '04',
  'mei': '05', 'juni': '06', 'juli': '07', 'agustus': '08',
  'september': '09', 'oktober': '10', 'november': '11', 'desember': '12',
};

export function parseIndonesianDate(dateStr: string): string | null {
  const match = dateStr.match(/(\d{1,2})\s+(\w+)\s+(\d{4})/);
  if (match) {
    const [, day, month, year] = match;
    const monthNum = MONTH_MAP[month.toLowerCase()];
    if (monthNum) {
      return `${year}-${monthNum}-${day.padStart(2, '0')}`;
    }
  }
  // Try DD/MM/YYYY or DD-MM-YYYY
  const altMatch = dateStr.match(/(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})/);
  if (altMatch) {
    const [, day, month, year] = altMatch;
    const fullYear = year.length === 2 ? `20${year}` : year;
    return `${fullYear}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  }
  return null;
}
