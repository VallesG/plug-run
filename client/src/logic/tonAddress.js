// TON wallet addresses, as data. Pure: no SDK, no network.
//
// A wallet connected through TON Connect reports its raw address
// ("0:<64 hex>"). People and wallets exchange the user-friendly form: 36
// bytes (flags, workchain, the 32-byte account hash, a CRC16-XMODEM of the
// first 34) in url-safe base64. Payouts go to the non-bounceable form ("UQ…"),
// which is what wallets show for a personal wallet.

const B64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';

function crc16(bytes) {
  let crc = 0;
  for (const b of bytes) {
    crc ^= b << 8;
    for (let i = 0; i < 8; i++) crc = crc & 0x8000 ? ((crc << 1) ^ 0x1021) & 0xffff : (crc << 1) & 0xffff;
  }
  return crc;
}

function toBase64Url(bytes) {
  let out = '';
  for (let i = 0; i < bytes.length; i += 3) {
    const n = (bytes[i] << 16) | ((bytes[i + 1] ?? 0) << 8) | (bytes[i + 2] ?? 0);
    out += B64[(n >> 18) & 63] + B64[(n >> 12) & 63] + (i + 1 < bytes.length ? B64[(n >> 6) & 63] : '') + (i + 2 < bytes.length ? B64[n & 63] : '');
  }
  return out;
}

function fromBase64(text) {
  const clean = String(text).replace(/\+/g, '-').replace(/\//g, '_');
  if (!/^[A-Za-z0-9_-]{48}$/.test(clean)) return null;
  const bytes = new Uint8Array(36);
  for (let i = 0, j = 0; i < 48; i += 4) {
    const n = (B64.indexOf(clean[i]) << 18) | (B64.indexOf(clean[i + 1]) << 12) | (B64.indexOf(clean[i + 2]) << 6) | B64.indexOf(clean[i + 3]);
    bytes[j++] = (n >> 16) & 255; bytes[j++] = (n >> 8) & 255; bytes[j++] = n & 255;
  }
  return bytes;
}

/** { workchain, hash } for "0:<hex>" or "-1:<hex>", else null. */
export function parseRawAddress(raw) {
  const m = /^(0|-1):([0-9a-fA-F]{64})$/.exec(String(raw ?? ''));
  return m ? { workchain: Number(m[1]), hash: m[2].toLowerCase() } : null;
}

/** The user-friendly form of a raw address (non-bounceable unless asked), or null. */
export function friendlyAddress(raw, { bounceable = false, testOnly = false } = {}) {
  const a = parseRawAddress(raw);
  if (!a) return null;
  const bytes = new Uint8Array(36);
  bytes[0] = (bounceable ? 0x11 : 0x51) | (testOnly ? 0x80 : 0);
  bytes[1] = a.workchain === -1 ? 0xff : 0;
  for (let i = 0; i < 32; i++) bytes[2 + i] = parseInt(a.hash.slice(i * 2, i * 2 + 2), 16);
  const crc = crc16(bytes.subarray(0, 34));
  bytes[34] = crc >> 8; bytes[35] = crc & 0xff;
  return toBase64Url(bytes);
}

/** A user-friendly address read back: { raw, bounceable, testOnly }, or null unless its checksum holds. */
export function parseFriendlyAddress(text) {
  const bytes = fromBase64(text);
  if (!bytes) return null;
  const crc = crc16(bytes.subarray(0, 34));
  if (bytes[34] !== crc >> 8 || bytes[35] !== (crc & 0xff)) return null;
  const tag = bytes[0] & 0x7f;
  if (tag !== 0x11 && tag !== 0x51) return null;
  if (bytes[1] !== 0 && bytes[1] !== 0xff) return null;
  const hash = Array.from(bytes.subarray(2, 34), (b) => b.toString(16).padStart(2, '0')).join('');
  return { raw: (bytes[1] === 0xff ? '-1' : '0') + ':' + hash, bounceable: tag === 0x11, testOnly: (bytes[0] & 0x80) !== 0 };
}

/** "UQDKbj…gqPuwA": enough to recognise a wallet in a message. */
export function shortAddress(friendly) {
  const s = String(friendly ?? '');
  return s.length > 14 ? s.slice(0, 6) + '…' + s.slice(-6) : s;
}
