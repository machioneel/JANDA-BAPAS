// @ts-ignore - pdfjs-dist types not available
import * as pdfjsLib from 'pdfjs-dist';

// Import worker file secara lokal menggunakan fitur import URL dari Vite
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

// Set worker menggunakan fail yang telah di-import di atas
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

export async function parsePdf(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  const texts: string[] = [];

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    const pageText = content.items
      .map((item: any) => item.str)
      .join(' ');
    texts.push(pageText);
  }

  return texts.join('\n');
}