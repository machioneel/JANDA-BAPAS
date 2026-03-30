export function normalizeText(text: string): string {
  return text
    .replace(/\r\n/g, '\n')
    .replace(/\t/g, ' ')
    .replace(/ {2,}/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    // Fix OCR artifacts: "N O T A   D I N A S" → "NOTA DINAS"
    .replace(/([A-Z])\s(?=[A-Z]\s[A-Z])/g, '$1')
    .replace(/NOT\s*A\s*[-–]?\s*DINAS/gi, 'NOTA DINAS')
    .trim();
}

export function normalizeKeys(text: string): string {
  return text
    .replace(/No\.?\s*Surat/gi, 'Nomor')
    .replace(/Nomer/gi, 'Nomor')
    .replace(/Tgl\.?\s*:/gi, 'Tanggal :')
    .replace(/Yth\.?\s*:/gi, 'Kepada :')
    .replace(/Yth\.?\s+/gi, 'Kepada ')
    .replace(/Perihal/gi, 'Hal');
}
