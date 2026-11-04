import { test } from 'node:test'
import assert from 'node:assert/strict'
import { makeZip } from '../src/services/zip.js'

// "123456789" is the standard CRC-32 check value: 0xCBF43926.
const bytes = new TextEncoder().encode('123456789')
const zip = makeZip([{ name: 'a.txt', bytes }], new Date(2026, 10, 4, 12, 30, 0))
const data = new DataView(zip.buffer)

test('the ZIP has one local header, the file, one directory entry and the end record', () => {
  assert.equal(zip.length, 30 + 5 + 9 + 46 + 5 + 22)
  assert.equal(data.getUint32(0, true), 0x04034b50)
  assert.equal(data.getUint32(30 + 5 + 9, true), 0x02014b50)
  assert.equal(data.getUint32(zip.length - 22, true), 0x06054b50)
})

test('the header has the method, date, CRC-32, sizes and name of the stored file', () => {
  assert.equal(data.getUint16(8, true), 0) // stored, not compressed
  // MS-DOS time and date of 2026-11-04 12:30:00.
  assert.equal(data.getUint16(10, true), (12 << 11) | (30 << 5))
  assert.equal(data.getUint16(12, true), ((2026 - 1980) << 9) | (11 << 5) | 4)
  assert.equal(data.getUint32(14, true), 0xcbf43926)
  assert.equal(data.getUint32(18, true), 9)
  assert.equal(data.getUint32(22, true), 9)
  assert.equal(data.getUint16(26, true), 5)
  assert.equal(new TextDecoder().decode(zip.slice(30, 30 + 5)), 'a.txt')
  assert.equal(new TextDecoder().decode(zip.slice(30 + 5, 30 + 5 + 9)), '123456789')
})

test('the directory entry repeats the CRC-32 and points at the local header', () => {
  const entry = 30 + 5 + 9
  assert.equal(data.getUint32(entry + 16, true), 0xcbf43926)
  assert.equal(data.getUint16(entry + 28, true), 5)
  assert.equal(data.getUint32(entry + 42, true), 0)
})

test('the end record counts the files and points at the directory', () => {
  const end = zip.length - 22
  assert.equal(data.getUint16(end + 10, true), 1)
  assert.equal(data.getUint32(end + 12, true), 46 + 5)
  assert.equal(data.getUint32(end + 16, true), 30 + 5 + 9)
})
