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
}

// Mencegah error React pada input form kalender jika tanggalnya "00"
function formatSafeDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '';
  let safeDate = dateStr.replace(/-00/g, '-01');
  const isValidFormat = /^\d{4}-\d{2}-\d{2}$/.test(safeDate);
  return isValidFormat ? safeDate : ''; 
}

// ============================================================================
// BAGIAN 1: SISTEM AI FALLBACK CERDAS (STATEFUL)
// ============================================================================

// Mengingat provider mana yang tidak sedang limit.
// 1 = Groq, 2 = Gemini, 3 = OpenRouter, 4 = Puter
let activeAIProvider = 1; 

const SYSTEM_PROMPT = `Anda adalah asisten AI yang ahli dalam mengekstrak metadata dan mengklasifikasikan dokumen administrasi Indonesia. 
Tugas Anda adalah membaca teks dari dokumen PDF/Word dan mencari informasi berikut:

1. Nomor Surat (letter_number) - Cari nomor surat utama. Jika ada nomor referensi/rujukan, pastikan hanya mengambil nomor surat yang dikeluarkan.
2. Tanggal Surat (letter_date) - Format: YYYY-MM-DD.
3. Pengirim (sender) - Ekstrak nama unit kerja/instansi tingkat terbawah (Contoh: "BALAI PEMASYARAKATAN KELAS I JAKARTA SELATAN").
4. Penerima (receiver) - Jika individu, ambil nama lengkap. Jika instansi, ambil unit terkecilnya.
5. Perihal / Judul (subject) - Ringkasan singkat isi surat.
6. Klasifikasi (classification) - (Rahasia, Biasa, Penting, Segera, dll).

7. Jenis Surat (document_type) - KLASIFIKASIKAN ke dalam salah satu opsi berikut berdasarkan konteks teks:
   - "incoming": Jika surat berasal dari instansi luar yang ditujukan ke BAPAS.
   - "outgoing": Jika surat diterbitkan oleh BAPAS untuk pihak luar.
   - "nota_dinas": Jika surat bersifat internal antar bagian/pejabat di dalam instansi.
   - "laporan_litmas": Jika dokumen berisi Penelitian Kemasyarakatan atau pendampingan klien.
   - "surat_keputusan": Jika teks mengandung kata "Menimbang", "Mengingat", "Memutuskan".

8. Kategori (category) - Tentukan Unit Kerja/Kategori yang paling relevan:
   - "Umum": Administrasi harian, surat tugas umum, persuratan rutin.
   - "Kepegawaian": Mutasi, cuti, kenaikan pangkat, data pegawai.
   - "Keuangan": DIPA, tagihan, anggaran, kuitansi, gaji.
   - "Sarana Prasarana": Pengadaan barang, pemeliharaan gedung, inventaris.
   - "Teknologi Informasi": Jaringan, aplikasi, pemeliharaan server/PC.
   - "Hubungan Masyarakat": Publikasi, berita acara kegiatan, dokumentasi.

KEMBALIKAN HANYA DALAM FORMAT JSON MURNI TANPA MARKDOWN ATAU TEKS LAIN.
Jika informasi tidak ditemukan, isi dengan null.

Format JSON yang diwajibkan:
{
  "letter_number": "...",
  "letter_date": "...",
  "sender": "...",
  "receiver": "...",
  "subject": "...",
  "classification": "...",
  "document_type": "...",
  "category": "..."
}

Analisis teks secara mendalam untuk menentukan document_type dan category berdasarkan kata kunci dan tata bahasa formal yang digunakan.`;

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

async function fetchFromGemini(text: string): Promise<string> {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY?.trim();
  if (!apiKey) throw new Error('API Key Gemini tidak ditemukan');

  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      system_instruction: { parts: { text: SYSTEM_PROMPT } },
      contents: [{ parts: [{ text: `Teks dokumen:\n${text}` }] }],
      generationConfig: {
        response_mime_type: "application/json",
        temperature: 0.1
      }
    }),
  });

  if (!response.ok) throw new Error(`Gemini Error: ${response.status}`);
  const data = await response.json();
  return data.candidates[0].content.parts[0].text;
}

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
      model: 'meta-llama/llama-3-8b-instruct:free',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: `Teks dokumen:\n${text}` }
      ],
      temperature: 0.1
    }),
  });

  if (!response.ok) throw new Error(`OpenRouter Error: ${response.status}`);
  const data = await response.json();
  return data.choices[0].message.content;
}

async function fetchFromPuter(text: string): Promise<string> {
  // @ts-ignore
  if (typeof puter === 'undefined' || !puter.ai) throw new Error('Puter SDK tidak tersedia');
  // @ts-ignore
  const response = await puter.ai.chat(`${SYSTEM_PROMPT}\n\nTeks dokumen:\n${text}`, { model: 'claude-3-haiku' });
  return response?.message?.content || response;
}

async function extractWithAIFallback(text: string): Promise<AIResponse> {
  const safeText = text.substring(0, 4000); 
  let rawJsonResponse = "";

  while (activeAIProvider <= 4) {
    try {
      if (activeAIProvider === 1) {
        console.log("Mencoba ekstraksi dengan Groq...");
        rawJsonResponse = await fetchFromGroq(safeText);
        break;
      } 
      else if (activeAIProvider === 2) {
        console.log("Mencoba ekstraksi dengan Gemini...");
        rawJsonResponse = await fetchFromGemini(safeText);
        break;
      } 
      else if (activeAIProvider === 3) {
        console.log("Mencoba ekstraksi dengan OpenRouter...");
        rawJsonResponse = await fetchFromOpenRouter(safeText);
        break;
      } 
      else if (activeAIProvider === 4) {
        console.log("Mencoba ekstraksi dengan Puter.js...");
        rawJsonResponse = await fetchFromPuter(safeText);
        break;
      }
    } catch (error: any) {
      console.warn(`Provider AI ${activeAIProvider} gagal (${error.message}). Beralih permanen ke AI selanjutnya...`);
      activeAIProvider++; 
    }
  }

  if (activeAIProvider > 4 || !rawJsonResponse) {
    throw new Error("ALL_AI_FAILED");
  }

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
// BAGIAN 3: FUNGSI UTAMA
// ============================================================================

export async function extractMetadata(rawText: string): Promise<ExtractedMetadata> {
  const text = normalizeKeys(normalizeText(rawText));
  
  try {
    const aiData = await extractWithAIFallback(text);
    return {
      letter_number: { value: aiData.letter_number || '', confidence: 1.0 },
      letter_date: { 
        value: formatSafeDate(aiData.letter_date ? (parseIndonesianDate(aiData.letter_date) || aiData.letter_date) : ''), 
        confidence: 1.0 
      },
      sender: { value: aiData.sender || '', confidence: 1.0 },
      receiver: { value: aiData.receiver || '', confidence: 1.0 },
      subject: { value: aiData.subject || '', confidence: 1.0 },
      classification: { value: aiData.classification || '', confidence: 1.0 },
    };

  } catch (error) {
    console.warn("Menggunakan Algoritma Regex bawaan karena AI gagal/limit.");
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

    return { letter_number: letterNumber, letter_date: letterDate, sender, receiver, subject, classification };
  }
}