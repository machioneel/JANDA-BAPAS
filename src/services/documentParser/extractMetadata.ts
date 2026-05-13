import type { ExtractedMetadata } from '@/types/document';
import {
  LETTER_NUMBER_PATTERNS,
  LETTER_DATE_PATTERNS,
  SENDER_PATTERNS,
  RECEIVER_PATTERNS,
  SUBJECT_PATTERNS,
  CLASSIFICATION_PATTERNS,
  KOP_PATTERNS,
  FOOTER_SIGNER_PATTERNS,
  parseIndonesianDate,
} from '@/utils/regexPatterns';
import { normalizeText, normalizeKeys } from './normalizeText';
import { splitIntoSections, type DocumentSections } from './sectionSplitter';
import {
  type Candidate,
  type Section,
  type ScoredResult,
  selectBestCandidate,
  validateLetterNumber,
  validateDate,
  validateSubject,
  validateName,
  validateClassification,
} from './scoringEngine';

// ============================================================================
// FUNGSI PEMBERSIH & TIPE DATA
// ============================================================================

interface AIResponse {
  letter_number: string | null;
  letter_date: string | null;
  sender: string | null;
  receiver: string | null;
  subject: string | null;
  classification: string | null;
  document_type: string | null;
  category: string | null;
  description: string | null;
}

function formatSafeDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '';
  let safeDate = dateStr.replace(/-00/g, '-01');
  const isValidFormat = /^\d{4}-\d{2}-\d{2}$/.test(safeDate);
  return isValidFormat ? safeDate : ''; 
}

// ============================================================================
// BAGIAN 1: SISTEM AI FALLBACK CERDAS
// ============================================================================

let activeAIProvider = 1; 

const SYSTEM_PROMPT = `Anda adalah asisten AI spesialis ekstraksi metadata dokumen administrasi resmi Indonesia.
Tugas utama Anda adalah membaca teks hasil OCR dan mengekstrak metadata secara AKURAT, KOREKTIF, dan BERSIH.

ATURAN PEMBERSIHAN (CLEANING):
- HILANGKAN kata kunci label, spasi berlebih, dan tanda titik dua (:) pada nilai yang diekstrak.
  Contoh Salah: ": WP.10.PAS.2.PK.06.02-1333" -> Contoh Benar: "WP.10.PAS.2.PK.06.02-1333"
  Contoh Salah: ": Sangat Segera" -> Contoh Benar: "Sangat Segera"

ATURAN SENDER & RECEIVER:
- Ambil HANYA unit yang paling spesifik (paling bawah tingkatannya).
- JANGAN masukkan frasa "Kementerian Hukum dan HAM", "Direktorat Jenderal", atau "Kantor Wilayah".
- PERTAHANKAN dan KOREKSI kelas instansi (Contoh: "KELASI" -> "KELAS I", "KELASIIA" -> "KELAS IIA").
- KOREKSI WAJIB: Jika hanya tertulis "Balai Pemasyarakatan Jakarta Barat", Anda WAJIB mengubahnya menjadi "Balai Pemasyarakatan Kelas I Jakarta Barat".
- Contoh Output Benar: "Lembaga Pemasyarakatan Narkotika Kelas IIA Jakarta" atau "Rumah Tahanan Negara Kelas I Jakarta Pusat".

ATURAN KATEGORI:
- Pilih SATU dari: "Umum", "Kepegawaian", "Keuangan", "Permintaan".
- KUNCI PERMINTAAN: Jika Perihal/Isi mengandung "Permohonan Litmas", "Pembebasan Bersyarat", "PB", "Asimilasi", WAJIB isi kategori dengan "Permintaan". DILARANG memilih "Umum".

EKSTRAK FIELD BERIKUT:
1. letter_number: Nomor surat. (Bersihkan dari ":" dan HAPUS SEMUA SPASI KOSONG di dalamnya).
2. letter_date: Format DD-MM-YYYY.
3. sender: Instansi pengirim paling spesifik (lihat aturan).
4. receiver: Instansi penerima paling spesifik (lihat aturan).
5. subject: Perihal surat secara utuh (contoh: "Permohonan Litmas untuk Pengusulan Pembebasan Bersyarat a/n Budianto"). Bersihkan dari ":".
6. classification: Sifat surat (Biasa/Sangat Segera/dll). Bersihkan dari ":". Jika tidak ada, isi null.
7. document_type: SELALU "incoming".
8. category: Lihat aturan kategori di atas.
9. description: 1 paragraf ringkas esensi surat.

OUTPUT HANYA JSON MURNI TANPA MARKDOWN.`;

async function fetchFromOpenRouter(text: string): Promise<string> {
  const apiKey = import.meta.env.VITE_OPENROUTER_API_KEY?.trim();
  if (!apiKey) throw new Error('API Key OpenRouter tidak ditemukan');

  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'openai/gpt-oss-20b:free',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: `Teks dokumen:\n${text}` }
      ],
      temperature: 0.1
    }),
  });

  if (!response.ok) {
    const errorDetails = await response.text();
    throw new Error(`OpenRouter Error ${response.status}: ${errorDetails}`);
  }
  
  const data = await response.json();
  return data.choices[0].message.content;
}

async function fetchFromGroq(text: string): Promise<string> {
  const apiKey = import.meta.env.VITE_GROQ_API_KEY?.trim();
  if (!apiKey) throw new Error('API Key Groq tidak ditemukan');

  const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'llama-3.1-8b-instant',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: `Teks dokumen:\n${text}` }
      ],
      temperature: 0.1,
      response_format: { type: "json_object" }
    }),
  });

  if (!response.ok) throw new Error(`Groq Error: ${response.status}`);
  const data = await response.json();
  return data.choices[0].message.content;
}

async function extractWithAIFallback(text: string): Promise<AIResponse> {
  const safeText = text.substring(0, 4000); 
  let rawJsonResponse = "";
  let attempts = 0;

  while (attempts < 2) {
    try {
      if (activeAIProvider === 1) {
        console.log("Mencoba ekstraksi dengan OpenRouter...");
        rawJsonResponse = await fetchFromOpenRouter(safeText);
      } 
      else if (activeAIProvider === 2) {
        console.log("Mencoba ekstraksi dengan Groq...");
        rawJsonResponse = await fetchFromGroq(safeText);
      }
      break; 
    } catch (error: any) {
      console.warn(`Provider AI ${activeAIProvider} gagal (${error.message}). Beralih ke AI selanjutnya...`);
      activeAIProvider = activeAIProvider >= 2 ? 1 : activeAIProvider + 1; 
      attempts++; 
    }
  }

  if (attempts >= 2 || !rawJsonResponse) throw new Error("ALL_AI_FAILED");

  const cleanJsonText = rawJsonResponse.replace(/```json/gi, '').replace(/```/g, '').trim();
  return JSON.parse(cleanJsonText) as AIResponse;
}

// ============================================================================
// BAGIAN 2: LOGIK LAMA ANDA (SEBAGAI FALLBACK/PENYELAMAT REGEX)
// ============================================================================

function extractCandidatesFromSection(
  text: string, section: Section, patterns: RegExp[], formatValidator: (v: string) => number
): Candidate[] {
  const candidates: Candidate[] = [];
  for (let i = 0; i < patterns.length; i++) {
    const match = text.match(patterns[i]);
    if (match) {
      const value = (match[1] || match[0]).trim();
      if (value.length > 0) {
        candidates.push({
          value, section, patternIndex: i,
          hasKeyword: i < patterns.length - 1,
          formatScore: formatValidator(value),
        });
      }
    }
  }
  return candidates;
}

function extractFieldWithScoring(
  sections: DocumentSections, patterns: RegExp[], formatValidator: (v: string) => number, prioritySections: Section[] = ['header', 'body', 'footer']
): ScoredResult {
  const allCandidates: Candidate[] = [];
  for (const section of prioritySections) {
    const text = sections[section];
    if (!text) continue;
    const candidates = extractCandidatesFromSection(text, section, patterns, formatValidator);
    allCandidates.push(...candidates);
  }
  return selectBestCandidate(allCandidates);
}

function extractKopSurat(header: string): string | null {
  for (const pattern of KOP_PATTERNS) {
    const match = header.match(pattern);
    if (match) {
      const fullKop = match[0].trim();
      const specificUnitMatch = fullKop.match(/(?:BALAI|KANTOR|DINAS|LEMBAGA|RUMAH SAKIT|BADAN|UPT)[A-Z0-9\sI\-]+$/i);
      if (specificUnitMatch) {
        return specificUnitMatch[0].replace(/\s+/g, ' ').trim();
      }
      const lines = fullKop.split('\n').map(l => l.trim()).filter(l => l.length > 5);
      if (lines.length > 1) {
        return lines[lines.length - 1];
      }
      return fullKop;
    }
  }
  return null;
}

function extractFooterSigner(footer: string): { name: string; nip: string } | null {
  if (!footer) return null;
  let name = ''; let nip = '';
  for (const pattern of FOOTER_SIGNER_PATTERNS) {
    const match = footer.match(pattern);
    if (match && match[1]) {
      const val = match[1].trim();
      if (/^\d/.test(val)) nip = val;
      else if (val.length >= 3 && /^[A-Z]/.test(val)) {
        if (!/^(?:KEMENTERIAN|DIREKTORAT|BALAI|REPUBLIK|BADAN|NOTA|SURAT|DOKUMEN|BSrE)/i.test(val)) name = val;
      }
    }
  }
  if (name || nip) return { name, nip };
  return null;
}

// ============================================================================
// REGEX FALLBACK & MAIN EXPORT
// ============================================================================

export async function extractMetadata(rawText: string): Promise<ExtractedMetadata> {
  const text = normalizeKeys(normalizeText(rawText));
  
  try {
    const aiData = await extractWithAIFallback(text);
    return {
      // PERBAIKAN: .replace(/\s+/g, '') akan MENGHAPUS SEMUA SPASI secara paksa dari kode JavaScript
      letter_number: { value: (aiData.letter_number || '').replace(/\s+/g, ''), confidence: 1.0 },
      letter_date: { 
        value: formatSafeDate(aiData.letter_date ? (parseIndonesianDate(aiData.letter_date) || aiData.letter_date) : ''), 
        confidence: 1.0 
      },
      sender: { value: aiData.sender || '', confidence: 1.0 },
      receiver: { value: aiData.receiver || '', confidence: 1.0 },
      subject: { value: aiData.subject || '', confidence: 1.0 },
      classification: { value: aiData.classification || '', confidence: 1.0 },
      document_type: { value: aiData.document_type || 'incoming', confidence: 1.0 },
      category: { value: aiData.category || '', confidence: 1.0 },
      description: { value: aiData.description || '', confidence: 1.0 },
    };

  } catch (error) {
    const sections = splitIntoSections(text);
    const letterNumber = extractFieldWithScoring(sections, LETTER_NUMBER_PATTERNS, validateLetterNumber, ['header']);
    let letterDate = extractFieldWithScoring(sections, LETTER_DATE_PATTERNS, validateDate, ['header', 'body']);
    const sender = extractFieldWithScoring(sections, SENDER_PATTERNS, validateName, ['header', 'footer']);
    const receiver = extractFieldWithScoring(sections, RECEIVER_PATTERNS, validateName, ['header', 'body']);
    const subject = extractFieldWithScoring(sections, SUBJECT_PATTERNS, validateSubject, ['header', 'body']);
    const classification = extractFieldWithScoring(sections, CLASSIFICATION_PATTERNS, validateClassification, ['header']);

    if (letterDate.value) {
      const parsed = parseIndonesianDate(letterDate.value);
      letterDate = { ...letterDate, value: formatSafeDate(parsed || letterDate.value) };
    }

    if (!sender.value || sender.confidence < 0.4) {
      const kop = extractKopSurat(sections.header);
      if (kop) {
        if (0.6 > sender.confidence) { sender.value = kop; sender.confidence = 0.6; }
      }
    }

    const signer = extractFooterSigner(sections.footer);
    if (signer && signer.name && (!sender.value || sender.confidence < 0.5)) {
      sender.value = signer.name; sender.confidence = 0.45;
    }

    return { 
      // PERBAIKAN: Hapus spasi juga pada fallback Regex
      letter_number: { value: letterNumber.value.replace(/\s+/g, ''), confidence: letterNumber.confidence }, 
      letter_date: letterDate, 
      sender, 
      receiver, 
      subject, 
      classification,
      document_type: { value: 'incoming', confidence: 1.0 },
      category: { value: '', confidence: 0 },
      description: { value: '', confidence: 0 }
    };
  }
}