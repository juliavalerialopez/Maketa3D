// A minimal ZIP maker (no library): files are stored as they are, not
// compressed, which suits PNG and JPEG (already compressed). Used to save all
// AI versions as one file.

// CRC-32 (the checksum ZIP requires), with its lookup table built once.
const CRC_TABLE = Array.from({ length: 256 }, (_, n) => {
  let c = n
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
  return c >>> 0
})

function crc32(bytes) {
  let crc = 0xffffffff
  for (const byte of bytes) crc = CRC_TABLE[(crc ^ byte) & 0xff] ^ (crc >>> 8)
  return (crc ^ 0xffffffff) >>> 0
}

// The date as ZIP (MS-DOS) time and date fields, local time.
function dosDateTime(date) {
  const time = (date.getHours() << 11) | (date.getMinutes() << 5) | Math.floor(date.getSeconds() / 2)
  const day = ((date.getFullYear() - 1980) << 9) | ((date.getMonth() + 1) << 5) | date.getDate()
  return { time, day }
}

// files: [{ name, bytes: Uint8Array }] with plain ASCII names. Returns the
// ZIP file as a Uint8Array.
export function makeZip(files, date = new Date()) {
  const { time, day } = dosDateTime(date)
  const encoder = new TextEncoder()
  const parts = []
  const directory = []
  let offset = 0

  for (const file of files) {
    const name = encoder.encode(file.name)
    const crc = crc32(file.bytes)
    const size = file.bytes.length

    // Local file header, then the file itself.
    const local = new DataView(new ArrayBuffer(30))
    local.setUint32(0, 0x04034b50, true)
    local.setUint16(4, 20, true) // version needed
    local.setUint16(6, 0, true) // flags
    local.setUint16(8, 0, true) // method: stored
    local.setUint16(10, time, true)
    local.setUint16(12, day, true)
    local.setUint32(14, crc, true)
    local.setUint32(18, size, true) // compressed size
    local.setUint32(22, size, true) // uncompressed size
    local.setUint16(26, name.length, true)
    local.setUint16(28, 0, true) // extra field length
    parts.push(new Uint8Array(local.buffer), name, file.bytes)

    // Its entry in the central directory, written after all files.
    const entry = new DataView(new ArrayBuffer(46))
    entry.setUint32(0, 0x02014b50, true)
    entry.setUint16(4, 20, true) // version made by
    entry.setUint16(6, 20, true) // version needed
    entry.setUint16(8, 0, true)
    entry.setUint16(10, 0, true)
    entry.setUint16(12, time, true)
    entry.setUint16(14, day, true)
    entry.setUint32(16, crc, true)
    entry.setUint32(20, size, true)
    entry.setUint32(24, size, true)
    entry.setUint16(28, name.length, true)
    // Extra, comment, disk, attributes: all 0 (bytes 30-41).
    entry.setUint32(42, offset, true) // where the local header starts
    directory.push(new Uint8Array(entry.buffer), name)

    offset += 30 + name.length + size
  }

  const directorySize = directory.reduce((sum, part) => sum + part.length, 0)
  const end = new DataView(new ArrayBuffer(22))
  end.setUint32(0, 0x06054b50, true)
  end.setUint16(8, files.length, true) // entries on this disk
  end.setUint16(10, files.length, true) // entries in total
  end.setUint32(12, directorySize, true)
  end.setUint32(16, offset, true) // where the central directory starts

  const all = [...parts, ...directory, new Uint8Array(end.buffer)]
  const zip = new Uint8Array(all.reduce((sum, part) => sum + part.length, 0))
  let position = 0
  for (const part of all) {
    zip.set(part, position)
    position += part.length
  }
  return zip
}
