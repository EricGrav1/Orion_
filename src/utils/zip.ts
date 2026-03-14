interface ZipCentralDirectoryEntry {
  name: string;
  compression: number;
  compressedSize: number;
  uncompressedSize: number;
  localHeaderOffset: number;
}

const textDecoder = new TextDecoder('utf-8');

function findEndOfCentralDirectoryOffset(bytes: Uint8Array): number {
  const minOffset = Math.max(0, bytes.length - 65557);
  for (let offset = bytes.length - 22; offset >= minOffset; offset -= 1) {
    if (
      bytes[offset] === 0x50 &&
      bytes[offset + 1] === 0x4b &&
      bytes[offset + 2] === 0x05 &&
      bytes[offset + 3] === 0x06
    ) {
      return offset;
    }
  }
  return -1;
}

function parseCentralDirectoryEntries(bytes: Uint8Array): ZipCentralDirectoryEntry[] {
  const eocdOffset = findEndOfCentralDirectoryOffset(bytes);
  if (eocdOffset < 0) {
    throw new Error('ZIP end-of-central-directory signature not found.');
  }

  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const totalEntries = view.getUint16(eocdOffset + 10, true);
  const centralDirectoryOffset = view.getUint32(eocdOffset + 16, true);
  const entries: ZipCentralDirectoryEntry[] = [];
  let offset = centralDirectoryOffset;

  for (let index = 0; index < totalEntries; index += 1) {
    const signature = view.getUint32(offset, true);
    if (signature !== 0x02014b50) break;

    const compression = view.getUint16(offset + 10, true);
    const compressedSize = view.getUint32(offset + 20, true);
    const uncompressedSize = view.getUint32(offset + 24, true);
    const fileNameLength = view.getUint16(offset + 28, true);
    const extraLength = view.getUint16(offset + 30, true);
    const commentLength = view.getUint16(offset + 32, true);
    const localHeaderOffset = view.getUint32(offset + 42, true);
    const nameStart = offset + 46;
    const nameEnd = nameStart + fileNameLength;
    const name = textDecoder.decode(bytes.slice(nameStart, nameEnd));

    entries.push({
      name,
      compression,
      compressedSize,
      uncompressedSize,
      localHeaderOffset,
    });

    offset = nameEnd + extraLength + commentLength;
  }

  return entries;
}

function readLocalFileData(bytes: Uint8Array, entry: ZipCentralDirectoryEntry): Uint8Array {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const localOffset = entry.localHeaderOffset;
  const signature = view.getUint32(localOffset, true);
  if (signature !== 0x04034b50) {
    throw new Error(`Invalid local header signature for ZIP entry "${entry.name}".`);
  }

  const fileNameLength = view.getUint16(localOffset + 26, true);
  const extraLength = view.getUint16(localOffset + 28, true);
  const dataStart = localOffset + 30 + fileNameLength + extraLength;
  const dataEnd = dataStart + entry.compressedSize;
  return bytes.slice(dataStart, dataEnd);
}

async function inflateDeflateRaw(data: Uint8Array): Promise<Uint8Array> {
  const buffer = new ArrayBuffer(data.byteLength);
  new Uint8Array(buffer).set(data);
  const stream = new Blob([buffer]).stream().pipeThrough(new DecompressionStream('deflate-raw'));
  const inflatedBuffer = await new Response(stream).arrayBuffer();
  return new Uint8Array(inflatedBuffer);
}

async function decodeEntryData(entry: ZipCentralDirectoryEntry, rawData: Uint8Array): Promise<Uint8Array> {
  if (entry.compression === 0) {
    return rawData;
  }
  if (entry.compression === 8) {
    return inflateDeflateRaw(rawData);
  }
  throw new Error(`Unsupported ZIP compression method ${entry.compression} for entry "${entry.name}".`);
}

export async function readZipEntries(arrayBuffer: ArrayBuffer): Promise<Map<string, Uint8Array>> {
  const bytes = new Uint8Array(arrayBuffer);
  const entries = parseCentralDirectoryEntries(bytes);
  const out = new Map<string, Uint8Array>();

  await Promise.all(
    entries.map(async (entry) => {
      const rawData = readLocalFileData(bytes, entry);
      const decoded = await decodeEntryData(entry, rawData);
      out.set(entry.name, decoded);
    })
  );

  return out;
}

export function decodeUtf8(bytes: Uint8Array): string {
  return textDecoder.decode(bytes);
}
