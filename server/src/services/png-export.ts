/**
 * Вставляет/заменяет tEXt chunk `ccv3` в PNG без перекодирования картинки.
 * - удаляет все существующие tEXt chunks с keyword `ccv3` (case-insensitive)
 * - вставляет новый `ccv3` перед `IEND`
 */
export function buildPngWithCcv3TextChunk(opts: {
  inputPng: Buffer;
  ccv3Object: unknown;
}): Buffer {
  const json = JSON.stringify(opts.ccv3Object);
  const ccv3Text = Buffer.from(json, "utf8").toString("base64");

  // Compatibility: some tools expect V2 metadata in `tEXt:chara`
  // If stored object is V2, embed both `ccv3` and `chara` with same payload.
  const spec =
    opts.ccv3Object &&
    typeof opts.ccv3Object === "object" &&
    "spec" in (opts.ccv3Object as any)
      ? String((opts.ccv3Object as any).spec)
      : "";
  const keywordsToInsert =
    spec === "chara_card_v2"
      ? (["ccv3", "chara"] as const)
      : (["ccv3"] as const);

  const signature = opts.inputPng.subarray(0, 8);
  // PNG signature: 89 50 4E 47 0D 0A 1A 0A
  if (signature.toString("hex") !== "89504e470d0a1a0a") {
    throw new Error("Invalid PNG signature");
  }

  const chunks: Buffer[] = [];
  let pos = 8;

  while (pos + 12 <= opts.inputPng.length) {
    const len = opts.inputPng.readUInt32BE(pos);
    const type = opts.inputPng.toString("ascii", pos + 4, pos + 8);
    const dataStart = pos + 8;
    const dataEnd = dataStart + len;
    const crcEnd = dataEnd + 4;

    if (crcEnd > opts.inputPng.length) break;

    const data = opts.inputPng.subarray(dataStart, dataEnd);

    if (type === "tEXt") {
      const nullIdx = data.indexOf(0);
      if (nullIdx > 0) {
        const keyword = data
          .subarray(0, nullIdx)
          .toString("ascii")
          .toLowerCase();
        if ((keywordsToInsert as readonly string[]).includes(keyword)) {
          // skip existing chunks we are going to replace
          pos = crcEnd;
          continue;
        }
      }
    }

    if (type === "IEND") {
      // Insert our ccv3 tEXt before IEND
      for (const kw of keywordsToInsert) {
        chunks.push(makeTextChunk(kw, ccv3Text));
      }
      chunks.push(opts.inputPng.subarray(pos, crcEnd));
      return Buffer.concat([signature, ...chunks]);
    }

    chunks.push(opts.inputPng.subarray(pos, crcEnd));
    pos = crcEnd;
  }

  throw new Error("Invalid PNG: missing IEND chunk");
}

function makeTextChunk(keyword: string, text: string): Buffer {
  const keyBytes = Buffer.from(keyword, "ascii");
  const textBytes = Buffer.from(text, "ascii"); // base64 => ASCII
  const data = Buffer.concat([keyBytes, Buffer.from([0]), textBytes]);
  const typeBytes = Buffer.from("tEXt", "ascii");
  const lenBytes = Buffer.alloc(4);
  lenBytes.writeUInt32BE(data.length, 0);
  const crcBytes = Buffer.alloc(4);
  const crc = crc32(Buffer.concat([typeBytes, data]));
  crcBytes.writeUInt32BE(crc >>> 0, 0);
  return Buffer.concat([lenBytes, typeBytes, data, crcBytes]);
}

// CRC32 (PNG uses IEEE 802.3 polynomial)
const CRC32_TABLE: Uint32Array = (() => {
  const table = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let k = 0; k < 8; k++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[i] = c >>> 0;
  }
  return table;
})();

function crc32(buf: Buffer): number {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    c = CRC32_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  }
  return (c ^ 0xffffffff) >>> 0;
}
