/**
 * Splits document text into HEADER, BODY, and FOOTER sections.
 * Indonesian government documents typically have:
 * - HEADER: KOP Surat, Nomor, Tanggal, Perihal, Kepada, Dari (first ~30 lines)
 * - BODY: Main content
 * - FOOTER: Signer name, NIP, electronic signature note (last ~20 lines)
 */
export interface DocumentSections {
  header: string;
  body: string;
  footer: string;
  lines: string[];
}

export function splitIntoSections(text: string): DocumentSections {
  const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
  const totalLines = lines.length;

  if (totalLines <= 10) {
    return { header: text, body: '', footer: '', lines };
  }

  // Adaptive header size: look for end-of-header markers
  let headerEnd = Math.min(30, Math.floor(totalLines * 0.4));

  // Try to find where body starts (after metadata fields end)
  const metadataKeywords = /^(?:Nomor|No\.?|Tanggal|Tgl|Perihal|Hal|Kepada|Yth|Dari|Pengirim|Sifat|Lampiran|Klasifikasi)\s*:/i;
  const bodyStartMarkers = /^(?:Sehubungan|Bahwa|Dengan\s+hormat|Berdasarkan|Dalam\s+rangka|Menindaklanjuti|Bersama\s+ini|Demikian)/i;

  for (let i = 5; i < Math.min(50, totalLines); i++) {
    if (bodyStartMarkers.test(lines[i])) {
      headerEnd = i;
      break;
    }
  }

  // If no body marker found, use last metadata keyword line + 2
  if (headerEnd === Math.min(30, Math.floor(totalLines * 0.4))) {
    let lastMetaLine = 0;
    for (let i = 0; i < Math.min(40, totalLines); i++) {
      if (metadataKeywords.test(lines[i])) {
        lastMetaLine = i;
      }
    }
    if (lastMetaLine > 0) {
      headerEnd = Math.min(lastMetaLine + 3, totalLines);
    }
  }

  // Footer: last 20 lines or from electronic signature note
  let footerStart = Math.max(headerEnd + 1, totalLines - 20);
  for (let i = Math.max(headerEnd, totalLines - 30); i < totalLines; i++) {
    if (/(?:Demikian|Hormat\s+(?:kami|saya)|ditandatangani\s+secara\s+elektronik|ttd|Tembusan)/i.test(lines[i])) {
      footerStart = i;
      break;
    }
  }

  const header = lines.slice(0, headerEnd).join('\n');
  const body = lines.slice(headerEnd, footerStart).join('\n');
  const footer = lines.slice(footerStart).join('\n');

  return { header, body, footer, lines };
}
