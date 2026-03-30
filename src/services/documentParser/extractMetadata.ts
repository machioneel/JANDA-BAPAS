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

// Definisikan tipe struktur JSON yang diharapkan dari AI
interface AIResponse {
  letter_number: string | null;
  letter_date: string | null; // format YYYY-MM-DD atau teks
  sender: string | null;
  receiver: string | null;
  subject: string | null;
  classification: string | null;
}

// ============================================================================
// BAGIAN 1: SISTEM AI FALLBACK
// ============================================================================

const SYSTEM_PROMPT = `Anda adalah asisten AI yang ahli dalam mengekstrak metadata dari dokumen teks bahasa Indonesia. 
Tugas Anda adalah membaca teks acak dari dokumen PDF/Word dan mencari informasi berikut:
1. Nomor Surat (letter_number)
2. Tanggal Surat (letter_date)
3. Pengirim (sender) - Instansi atau nama pengirim
4. Penerima (receiver)
5. Perihal / Judul (subject)
6. Klasifikasi (classification) - Rahasia, Biasa, Penting, dll.

KEMBALIKAN HANYA DALAM FORMAT JSON MURNI TANPA MARKDOWN ATAU TEKS LAIN.
Jika informasi tidak ditemukan, isi dengan null.
Format JSON yang diwajibkan:
{
  "letter_number": "...",
  "letter_date": "...",
  "sender": "...",
  "receiver": "...",
  "subject": "...",
  "classification": "..."
}`;

/**
 * 1. Panggilan ke API Groq
 */
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
      model: 'llama-3.1-8b-instant', // Model diperbarui
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: `Teks dokumen:\n${text}` }
      ],
      temperature: 0.1,
      response_format: { type: "json_object" }
    }),
  });

  if (!response.ok) throw new Error(`Groq Error: ${response.status} ${response.statusText}`);
  const data = await response.json();
  return data.choices[0].message.content;
}

/**
 * 2. Panggilan ke API Gemini Google
 */
async function fetchFromGemini(text: string): Promise<string> {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY?.trim(); // .trim() mencegah error 404 karena spasi
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

  if (!response.ok) throw new Error(`Gemini Error: ${response.status} ${response.statusText}`);
  const data = await response.json();
  return data.candidates[0].content.parts[0].text;
}

/**
 * 3. Panggilan ke API OpenRouter
 */
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
      model: 'google/gemma-2-9b-it:free', // Model diperbarui ke versi yang tersedia
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: `Teks dokumen:\n${text}` }
      ],
      temperature: 0.1
    }),
  });

  if (!response.ok) throw new Error(`OpenRouter Error: ${response.status} ${response.statusText}`);
  const data = await response.json();
  return data.choices[0].message.content;
}

/**
 * 4. Panggilan ke Puter.js (Jika Anda menggunakan script dari Puter.js)
 */
async function fetchFromPuter(text: string): Promise<string> {
  // @ts-ignore - Karena puter di-load via CDN di index.html
  if (typeof puter === 'undefined' || !puter.ai) {
    throw new Error('Puter.js SDK tidak tersedia');
  }

  // @ts-ignore
  const response = await puter.ai.chat(
    `${SYSTEM_PROMPT}\n\nTeks dokumen:\n${text}`, 
    { model: 'claude-3-haiku' } // Puter kadang menyediakan akses ini
  );
  
  // Terkadang LLM mengembalikan teks beserta markdown ```json, kita harus membersihkannya
  return response?.message?.content || response;
}

/**
 * Fungsi Manajer Utama AI (Load Balancer & Fallback)
 */
async function extractWithAIFallback(text: string): Promise<AIResponse> {
  // Potong teks agar tidak melebihi batas token (ambil 4000 karakter pertama)
  const safeText = text.substring(0, 4000); 
  
  let rawJsonResponse = "";

  // Percobaan berjenjang
  try {
    console.log("Mencoba ekstraksi dengan Groq...");
    rawJsonResponse = await fetchFromGroq(safeText);
  } catch (errGroq) {
    console.warn("Groq gagal, beralih ke Gemini:", errGroq);
    
    try {
      console.log("Mencoba ekstraksi dengan Gemini...");
      rawJsonResponse = await fetchFromGemini(safeText);
    } catch (errGemini) {
      console.warn("Gemini gagal, beralih ke OpenRouter:", errGemini);
      
      try {
        console.log("Mencoba ekstraksi dengan OpenRouter...");
        rawJsonResponse = await fetchFromOpenRouter(safeText);
      } catch (errOpenRouter) {
        console.warn("OpenRouter gagal, beralih ke Puter.js:", errOpenRouter);
        
        try {
          console.log("Mencoba ekstraksi dengan Puter.js...");
          rawJsonResponse = await fetchFromPuter(safeText);
        } catch (errPuter) {
          console.error("Semua AI gagal, akan menggunakan Regex fallback.");
          throw new Error("ALL_AI_FAILED");
        }
      }
    }
  }

  // Membersihkan JSON jika ada markdown tambahan dari AI (seperti ```json ... ```)
  const cleanJsonText = rawJsonResponse.replace(/```json/gi, '').replace(/```/g, '').trim();
  return JSON.parse(cleanJsonText) as AIResponse;
}


// ============================================================================
// BAGIAN 2: LOGIK LAMA ANDA (SEBAGAI FALLBACK/PENYELAMAT)
// ============================================================================
// (Fungsi-fungsi di bawah ini tetap dibiarkan seperti asli dari kode Anda)

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
    if (match) return match[0].trim();
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
// BAGIAN 3: FUNGSI EKSTRAKSI UTAMA YANG DIEKSPOR
// ============================================================================

/**
 * Fungsi utama untuk mengekstrak metadata.
 * PERHATIAN: Fungsi ini sekarang asinkronus (Promise). Anda perlu
 * memperbarui komponen yang memanggilnya menjadi `await extractMetadata(...)`.
 */
export async function extractMetadata(rawText: string): Promise<ExtractedMetadata> {
  const text = normalizeKeys(normalizeText(rawText));
  
  try {
    // 1. Coba ekstraksi menggunakan AI
    const aiData = await extractWithAIFallback(text);
    
    // Konversi hasil AI ke tipe ExtractedMetadata dengan nilai confidence maksimum
    // karena kita mempercayai output AI.
    // Konversi hasil AI ke tipe ExtractedMetadata dengan nilai confidence maksimum
    // karena kita mempercayai output AI.
    return {
      letter_number: { value: aiData.letter_number || '', confidence: 1.0 },
      letter_date: { 
        value: aiData.letter_date ? (parseIndonesianDate(aiData.letter_date) || aiData.letter_date) : '', 
        confidence: 1.0 
      },
      sender: { value: aiData.sender || '', confidence: 1.0 },
      receiver: { value: aiData.receiver || '', confidence: 1.0 },
      subject: { value: aiData.subject || '', confidence: 1.0 },
      classification: { value: aiData.classification || '', confidence: 1.0 },
    };

  } catch (error) {
    // 2. Jika SELURUH AI gagal (misal tidak ada internet / limit terlampaui),
    // kembali menggunakan logik Regex dan Scoring asli Anda yang solid!
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
      if (parsed) letterDate = { ...letterDate, value: parsed };
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