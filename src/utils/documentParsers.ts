import type { ImportedDocument, ImportedDocumentSection } from '../types/aiImport.types';
import { decodeUtf8, readZipEntries } from './zip';

const MIN_TEXT_LENGTH = 60;

function normalizeWhitespace(value: string): string {
  return value
    .replace(/\r\n?/g, '\n')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/[ \t]{2,}/g, ' ')
    .trim();
}

function decodeXmlEntities(value: string): string {
  return value
    .replaceAll('&amp;', '&')
    .replaceAll('&lt;', '<')
    .replaceAll('&gt;', '>')
    .replaceAll('&quot;', '"')
    .replaceAll('&apos;', "'");
}

function stripFileExtension(filename: string): string {
  return filename.replace(/\.[^.]+$/, '');
}

function splitTextIntoSections(rawText: string): ImportedDocumentSection[] {
  const normalized = normalizeWhitespace(rawText);
  if (!normalized) return [];
  const paragraphChunks = normalized
    .split('\n\n')
    .map((chunk) => chunk.trim())
    .filter((chunk) => chunk.length > 0);

  return paragraphChunks.map((chunk, index) => {
    const firstSentence = chunk.split(/(?<=[.!?])\s+/)[0] || chunk;
    const title = firstSentence.length > 70 ? `${firstSentence.slice(0, 67)}...` : firstSentence;
    return {
      title: title || `Section ${index + 1}`,
      body: chunk,
    };
  });
}

function plainTextDocumentFromString(text: string, fallbackTitle = 'Imported Content'): ImportedDocument {
  const normalized = normalizeWhitespace(text);
  if (normalized.length < MIN_TEXT_LENGTH) {
    throw new Error('Not enough readable text extracted from source.');
  }

  const sections = splitTextIntoSections(normalized);
  return {
    kind: 'text',
    title: fallbackTitle,
    rawText: normalized,
    sections: sections.length > 0 ? sections : [{ title: fallbackTitle, body: normalized }],
    warnings: [],
  };
}

function findZipEntry(entries: Map<string, Uint8Array>, candidates: string[]): Uint8Array | null {
  for (const candidate of candidates) {
    const match = entries.get(candidate);
    if (match) return match;
  }
  return null;
}

function getEntriesMatching(entries: Map<string, Uint8Array>, pattern: RegExp): Array<[string, Uint8Array]> {
  return [...entries.entries()].filter(([name]) => pattern.test(name));
}

function extractDocxTextFromXml(xml: string): string {
  const withBreaks = xml
    .replace(/<w:tab\s*\/>/g, '\t')
    .replace(/<w:br[^>]*\/>/g, '\n')
    .replace(/<\/w:p>/g, '\n')
    .replace(/<\/w:tr>/g, '\n');

  const rawText = withBreaks.replace(/<[^>]+>/g, ' ');
  return normalizeWhitespace(decodeXmlEntities(rawText));
}

function getPptxSlideIndex(path: string): number {
  const match = /slide(\d+)\.xml$/i.exec(path);
  return match ? Number(match[1]) : Number.MAX_SAFE_INTEGER;
}

function extractPptxTextFromXml(xml: string): string {
  const textRuns = [...xml.matchAll(/<a:t[^>]*>([\s\S]*?)<\/a:t>/g)].map((match) => decodeXmlEntities(match[1]));
  return normalizeWhitespace(textRuns.join('\n'));
}

function decodePdfEscapedText(value: string): string {
  return value
    .replace(/\\([0-7]{1,3})/g, (_, octal: string) => String.fromCharCode(parseInt(octal, 8)))
    .replace(/\\n/g, '\n')
    .replace(/\\r/g, '\r')
    .replace(/\\t/g, '\t')
    .replace(/\\b/g, '\b')
    .replace(/\\f/g, '\f')
    .replace(/\\\(/g, '(')
    .replace(/\\\)/g, ')')
    .replace(/\\\\/g, '\\');
}

function latin1Decode(bytes: Uint8Array): string {
  return new TextDecoder('latin1').decode(bytes);
}

function findSequence(bytes: Uint8Array, needle: Uint8Array, from = 0): number {
  for (let offset = from; offset <= bytes.length - needle.length; offset += 1) {
    let matches = true;
    for (let index = 0; index < needle.length; index += 1) {
      if (bytes[offset + index] !== needle[index]) {
        matches = false;
        break;
      }
    }
    if (matches) return offset;
  }
  return -1;
}

async function inflatePdfStream(data: Uint8Array): Promise<Uint8Array> {
  const inflateWith = async (format: 'deflate' | 'deflate-raw'): Promise<Uint8Array> => {
    const rawBuffer = new ArrayBuffer(data.byteLength);
    new Uint8Array(rawBuffer).set(data);
    const stream = new Blob([rawBuffer]).stream().pipeThrough(new DecompressionStream(format));
    const inflatedBuffer = await new Response(stream).arrayBuffer();
    return new Uint8Array(inflatedBuffer);
  };

  try {
    return await inflateWith('deflate');
  } catch {
    return inflateWith('deflate-raw');
  }
}

function extractTextOperatorsFromPdfContent(content: string): string[] {
  const out: string[] = [];

  const singleOps = [...content.matchAll(/\((?:\\.|[^\\)])*\)\s*Tj/g)];
  singleOps.forEach((match) => {
    const raw = match[0].replace(/\s*Tj$/, '').trim();
    const inner = raw.slice(1, -1);
    const decoded = decodePdfEscapedText(inner).trim();
    if (decoded) out.push(decoded);
  });

  const arrayOps = [...content.matchAll(/\[(.*?)\]\s*TJ/gs)];
  arrayOps.forEach((match) => {
    const items = [...match[1].matchAll(/\((?:\\.|[^\\)])*\)/g)];
    const joined = items
      .map((item) => decodePdfEscapedText(item[0].slice(1, -1)))
      .join('')
      .trim();
    if (joined) out.push(joined);
  });

  return out;
}

async function parsePdfDocument(file: File): Promise<ImportedDocument> {
  const bytes = new Uint8Array(await file.arrayBuffer());
  const streamMarker = new TextEncoder().encode('stream');
  const endStreamMarker = new TextEncoder().encode('endstream');
  const extracted: string[] = [];
  const warnings: string[] = [];
  let offset = 0;

  while (offset < bytes.length) {
    const streamOffset = findSequence(bytes, streamMarker, offset);
    if (streamOffset < 0) break;
    const endStreamOffset = findSequence(bytes, endStreamMarker, streamOffset + streamMarker.length);
    if (endStreamOffset < 0) break;

    let contentStart = streamOffset + streamMarker.length;
    if (bytes[contentStart] === 0x0d && bytes[contentStart + 1] === 0x0a) {
      contentStart += 2;
    } else if (bytes[contentStart] === 0x0a || bytes[contentStart] === 0x0d) {
      contentStart += 1;
    }

    const rawStreamData = bytes.slice(contentStart, endStreamOffset);

    const dictStart = Math.max(0, streamOffset - 240);
    const dictChunk = latin1Decode(bytes.slice(dictStart, streamOffset));
    const isFlate = /\/Filter\s*\/FlateDecode/.test(dictChunk) || /\/Filter\s*\[\s*\/FlateDecode/.test(dictChunk);

    try {
      const decodedBytes = isFlate ? await inflatePdfStream(rawStreamData) : rawStreamData;
      const decodedContent = latin1Decode(decodedBytes);
      extracted.push(...extractTextOperatorsFromPdfContent(decodedContent));
    } catch {
      warnings.push('Some compressed PDF streams could not be decoded.');
    }

    offset = endStreamOffset + endStreamMarker.length;
  }

  if (extracted.length === 0) {
    const fallbackText = latin1Decode(bytes);
    const fallbackFragments =
      fallbackText.match(/[A-Za-z0-9][A-Za-z0-9 ,.;:'"!?()/%&-]{28,}/g)?.slice(0, 200) ?? [];
    extracted.push(...fallbackFragments);
  }

  const rawText = normalizeWhitespace(extracted.join('\n'));
  if (rawText.length < MIN_TEXT_LENGTH) {
    throw new Error('Could not extract readable text from this PDF. Try OCR text export and re-upload.');
  }

  return {
    kind: 'pdf',
    title: stripFileExtension(file.name),
    rawText,
    sections: splitTextIntoSections(rawText),
    warnings,
  };
}

async function parseDocxDocument(file: File): Promise<ImportedDocument> {
  const entries = await readZipEntries(await file.arrayBuffer());
  const documentXml = findZipEntry(entries, ['word/document.xml']);
  if (!documentXml) {
    throw new Error('Invalid DOCX: word/document.xml not found.');
  }

  const xmlFiles = [
    'word/document.xml',
    ...getEntriesMatching(entries, /^word\/header\d+\.xml$/).map(([name]) => name),
    ...getEntriesMatching(entries, /^word\/footer\d+\.xml$/).map(([name]) => name),
    ...getEntriesMatching(entries, /^word\/footnotes\.xml$/).map(([name]) => name),
    ...getEntriesMatching(entries, /^word\/endnotes\.xml$/).map(([name]) => name),
    ...getEntriesMatching(entries, /^word\/comments\.xml$/).map(([name]) => name),
  ];

  const chunks = xmlFiles
    .map((path) => entries.get(path))
    .filter((chunk): chunk is Uint8Array => Boolean(chunk))
    .map((chunk) => extractDocxTextFromXml(decodeUtf8(chunk)))
    .filter((chunk) => chunk.length > 0);

  const rawText = normalizeWhitespace(chunks.join('\n\n'));
  if (rawText.length < MIN_TEXT_LENGTH) {
    throw new Error('DOCX text extraction returned too little content.');
  }

  return {
    kind: 'docx',
    title: stripFileExtension(file.name),
    rawText,
    sections: splitTextIntoSections(rawText),
    warnings: [],
  };
}

async function parsePptxDocument(file: File): Promise<ImportedDocument> {
  const entries = await readZipEntries(await file.arrayBuffer());
  const slideEntries = getEntriesMatching(entries, /^ppt\/slides\/slide\d+\.xml$/).sort(
    (left, right) => getPptxSlideIndex(left[0]) - getPptxSlideIndex(right[0])
  );
  if (slideEntries.length === 0) {
    throw new Error('Invalid PPTX: no slides found.');
  }

  const noteEntries = getEntriesMatching(entries, /^ppt\/notesSlides\/notesSlide\d+\.xml$/).sort(
    (left, right) => getPptxSlideIndex(left[0]) - getPptxSlideIndex(right[0])
  );
  const notesByIndex = new Map<number, string>(
    noteEntries.map(([name, bytes]) => [getPptxSlideIndex(name), extractPptxTextFromXml(decodeUtf8(bytes))])
  );

  const sections: ImportedDocumentSection[] = slideEntries.reduce<ImportedDocumentSection[]>(
    (accumulator, [name, bytes], idx) => {
      const slideIndex = getPptxSlideIndex(name);
      const slideText = extractPptxTextFromXml(decodeUtf8(bytes));
      const noteText = notesByIndex.get(slideIndex) || '';
      const merged = normalizeWhitespace([slideText, noteText].filter(Boolean).join('\n'));
      if (!merged) return accumulator;
      const lines = merged.split('\n').map((line) => line.trim()).filter(Boolean);
      accumulator.push({
        title: lines[0] || `Slide ${idx + 1}`,
        body: merged,
        sourceRef: `slide-${idx + 1}`,
      });
      return accumulator;
    },
    []
  );

  const rawText = normalizeWhitespace(sections.map((section) => `${section.title}\n${section.body}`).join('\n\n'));
  if (rawText.length < MIN_TEXT_LENGTH) {
    throw new Error('PPTX text extraction returned too little content.');
  }

  return {
    kind: 'pptx',
    title: stripFileExtension(file.name),
    rawText,
    sections,
    warnings: [],
  };
}

export async function parseImportedFile(file: File): Promise<ImportedDocument> {
  const lowerName = file.name.toLowerCase();

  if (file.type.startsWith('text/') || lowerName.endsWith('.txt') || lowerName.endsWith('.md')) {
    return plainTextDocumentFromString(await file.text(), stripFileExtension(file.name));
  }

  if (lowerName.endsWith('.docx')) {
    return parseDocxDocument(file);
  }

  if (lowerName.endsWith('.pptx')) {
    return parsePptxDocument(file);
  }

  if (lowerName.endsWith('.pdf')) {
    return parsePdfDocument(file);
  }

  throw new Error('Unsupported file type. Use PDF, DOCX, PPTX, TXT, or Markdown.');
}

export function parseTextInput(text: string, title = 'Imported Text'): ImportedDocument {
  return plainTextDocumentFromString(text, title);
}
