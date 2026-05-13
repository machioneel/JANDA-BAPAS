/**
 * Scoring engine for extracted field candidates.
 * Scores based on: location (header/body/footer), keyword presence,
 * format match, and length validation.
 */

export type Section = 'header' | 'body' | 'footer';

export interface Candidate {
  value: string;
  section: Section;
  patternIndex: number;
  hasKeyword: boolean;
  formatScore: number;
}

export interface ScoredResult {
  value: string;
  confidence: number;
}

const SECTION_WEIGHTS: Record<Section, number> = {
  header: 1.0,
  body: 0.5,
  footer: 0.3,
};

export function scoreCandidate(candidate: Candidate): number {
  let score = 0;

  // Location score (0 - 0.35)
  score += SECTION_WEIGHTS[candidate.section] * 0.35;

  // Keyword presence (0 - 0.25)
  if (candidate.hasKeyword) {
    score += 0.25;
  }

  // Pattern priority - earlier patterns = higher score (0 - 0.2)
  const patternBonus = Math.max(0, 0.2 - candidate.patternIndex * 0.04);
  score += patternBonus;

  // Format match score (0 - 0.2)
  score += candidate.formatScore * 0.2;

  return Math.min(score, 1.0);
}

export function selectBestCandidate(candidates: Candidate[]): ScoredResult {
  if (candidates.length === 0) {
    return { value: '', confidence: 0 };
  }

  const scored = candidates.map(c => ({
    candidate: c,
    score: scoreCandidate(c),
  }));

  scored.sort((a, b) => b.score - a.score);
  const best = scored[0];

  return {
    value: best.candidate.value.trim(),
    confidence: Math.round(best.score * 100) / 100,
  };
}

// --- Format validators ---

export function validateLetterNumber(value: string): number {
  // Indonesian gov letter number: contains dots, dashes, slashes
  if (/[A-Z]{2,}[\.\-]/.test(value) && /\d/.test(value)) return 1.0;
  if (/\d+[\-\/]\d+/.test(value)) return 0.7;
  if (/\d/.test(value)) return 0.4;
  return 0.1;
}

export function validateDate(value: string): number {
  if (/\d{1,2}\s+(?:Januari|Februari|Maret|April|Mei|Juni|Juli|Agustus|September|Oktober|November|Desember)\s+\d{4}/i.test(value)) return 1.0;
  if (/\d{1,2}[\-\/]\d{1,2}[\-\/]\d{2,4}/.test(value)) return 0.7;
  return 0.2;
}

export function validateSubject(value: string): number {
  const len = value.length;
  if (len >= 10 && len <= 200) return 1.0;
  if (len >= 5) return 0.6;
  return 0.2;
}

export function validateName(value: string): number {
  if (value.length >= 3 && value.length <= 150) return 0.8;
  return 0.3;
}

export function validateClassification(value: string): number {
  const known = ['rahasia', 'biasa', 'penting', 'segera', 'sangat segera', 'konfidensial'];
  if (known.includes(value.toLowerCase().trim())) return 1.0;
  return 0.3;
}
