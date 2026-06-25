/**
 * Reads Doubao (ByteDance desktop app) conversation history from its local
 * IndexedDB store. Doubao uses a Chromium-based shell, so conversations are
 * persisted in LevelDB with Chrome's custom "idb_cmp1" comparator.
 *
 * We work around the comparator lock by:
 *   1. Copying the DB files to a temp directory.
 *   2. Rebuilding the MANIFEST-000001 record to declare the standard
 *      BytewiseComparator (with a recalculated CRC32C).
 *   3. Opening the patched copy with classic-level.
 *
 * The two IndexedDB object-store entries that hold the recent conversation
 * list were located by inspecting the raw LevelDB WAL:
 *   key 00010201030000000000000000  (object store 2, key = integer 3)
 *   key 00030201030000000000000000  (object store 3, key = integer 3)
 * Each value is a serialised pull_recent_conv_chain response containing an
 * array of {conversation_id (ASCII), name (UTF-16 LE)} cells.
 */

import { join } from "node:path";
import { homedir, tmpdir } from "node:os";
import { existsSync, cpSync, writeFileSync, mkdtempSync, rmSync } from "node:fs";

export const DOUBAO_PARSER_VERSION = "v2";

export function doubaoDbDir(): string {
  return join(
    homedir(),
    "Library/Application Support/Doubao/Default/IndexedDB",
    "chrome_doubao-chat_0.indexeddb.leveldb",
  );
}

// ---------------------------------------------------------------------------
// CRC32C (Castagnoli) — required for rebuilding the LevelDB MANIFEST record.
// ---------------------------------------------------------------------------

const CRC32C_TABLE: Uint32Array = (() => {
  const t = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let j = 0; j < 8; j++) c = c & 1 ? (0x82f63b78 ^ (c >>> 1)) : c >>> 1;
    t[i] = c;
  }
  return t;
})();

function crc32c(buf: Buffer): number {
  let crc = 0xffffffff;
  for (const b of buf) crc = (CRC32C_TABLE[(crc ^ b) & 0xff] ^ (crc >>> 8)) >>> 0;
  return (crc ^ 0xffffffff) >>> 0;
}

/** LevelDB masks the stored CRC before writing to protect against bit-rot. */
function maskCrc(crc: number): number {
  const c = crc >>> 0;
  const rot = ((c >>> 15) | ((c << 17) >>> 0)) >>> 0;
  return (rot + 0xa282ead8) >>> 0;
}

/** Build a MANIFEST-000001 that declares the standard BytewiseComparator. */
function buildPatchedManifest(): Buffer {
  const cmpName = "leveldb.BytewiseComparator";
  // VersionEdit encoding: tag=1 (comparator), tag=2 (log_number=0),
  //                        tag=3 (next_file=2), tag=4 (last_seq=0).
  const ve = Buffer.concat([
    Buffer.from([0x01, cmpName.length]),
    Buffer.from(cmpName),
    Buffer.from([0x02, 0x00, 0x03, 0x02, 0x04, 0x00]),
  ]);
  const typeAndData = Buffer.concat([Buffer.from([0x01]), ve]);
  const crc = maskCrc(crc32c(typeAndData));
  const rec = Buffer.allocUnsafe(7 + ve.length);
  rec.writeUInt32LE(crc, 0);
  rec.writeUInt16LE(ve.length, 4);
  rec[6] = 0x01; // kFullType
  ve.copy(rec, 7);
  return rec;
}

// ---------------------------------------------------------------------------
// Conversation extraction from the custom binary serialisation format.
// Field layout: <len_byte> <ascii_name> <type_byte> [value]
//   type 0x22 '"' → ASCII string:  next byte = len, then ASCII bytes
//   type 0x63 'c' → UTF-16 LE str: next byte = byte_len, then UTF-16LE bytes
// ---------------------------------------------------------------------------

export interface DoubaoConversation {
  id: string;
  name: string;
}

function extractConversationsFromValue(v: Buffer): DoubaoConversation[] {
  const ID_FIELD = Buffer.from("conversation_id");
  const NAME_FIELD = Buffer.from("name");

  const ids: string[] = [];
  let pos = 0;
  while (pos < v.length) {
    const idx = v.indexOf(ID_FIELD, pos);
    if (idx === -1) break;
    if (idx > 0 && v[idx - 1] === ID_FIELD.length) {
      const tp = idx + ID_FIELD.length;
      if (v[tp] === 0x22) {
        const len = v[tp + 1];
        ids.push(v.slice(tp + 2, tp + 2 + len).toString("ascii"));
      }
    }
    pos = idx + 1;
  }

  const names: string[] = [];
  pos = 0;
  while (pos < v.length) {
    const idx = v.indexOf(NAME_FIELD, pos);
    if (idx === -1) break;
    if (idx > 0 && v[idx - 1] === NAME_FIELD.length) {
      const tp = idx + NAME_FIELD.length;
      if (v[tp] === 0x63) {
        const len = v[tp + 1];
        try {
          names.push(v.slice(tp + 2, tp + 2 + len).toString("utf16le"));
        } catch {
          /* skip malformed */
        }
      }
    }
    pos = idx + 1;
  }

  const results: DoubaoConversation[] = [];
  for (let i = 0; i < ids.length && i < names.length; i++) {
    results.push({ id: ids[i], name: names[i] });
  }
  return results;
}

// Two IndexedDB entries that each store the recent conversation list.
const CONV_LIST_KEYS = [
  Buffer.from("00010201030000000000000000", "hex"),
  Buffer.from("00030201030000000000000000", "hex"),
];

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export async function readDoubaoConversations(): Promise<DoubaoConversation[]> {
  const src = doubaoDbDir();
  if (!existsSync(src)) return [];

  // Copy to a temp dir — lets us open with classic-level even while Doubao
  // is running (the LOCK only blocks other LevelDB openers, not file copies).
  const tmp = mkdtempSync(join(tmpdir(), "devpulse-doubao-"));
  try {
    cpSync(src, tmp, { recursive: true, force: true });
    writeFileSync(join(tmp, "MANIFEST-000001"), buildPatchedManifest());

    // Dynamic import so the module loads only when Doubao is detected.
    const { ClassicLevel } = (await import("classic-level")) as typeof import("classic-level");
    const db = new ClassicLevel<Buffer, Buffer>(tmp, {
      keyEncoding: "buffer",
      valueEncoding: "buffer",
      createIfMissing: false,
    });

    const seen = new Map<string, string>(); // id → name (dedup across both keys)
    try {
      await db.open();
      for (const key of CONV_LIST_KEYS) {
        try {
          const val = (await db.get(key)) as Buffer;
          for (const c of extractConversationsFromValue(val)) {
            if (!seen.has(c.id)) seen.set(c.id, c.name);
          }
        } catch {
          /* key absent in this object store — fine */
        }
      }
    } finally {
      await db.close();
    }

    return [...seen.entries()].map(([id, name]) => ({ id, name }));
  } catch {
    return [];
  } finally {
    try {
      rmSync(tmp, { recursive: true, force: true });
    } catch {
      /* ignore cleanup errors */
    }
  }
}
