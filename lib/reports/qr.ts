/**
 * Lightweight, zero-dependency QR Code SVG Generator
 * Generates standards-compliant QR Code Matrix (Model 2, Byte Encoding, Error Correction Level L/M)
 */

// QR Code Polynomials and Galois Field (GF(256))
const GF_EXP = new Uint8Array(512)
const GF_LOG = new Uint8Array(256)

;(function initGaloisField() {
  let x = 1
  for (let i = 0; i < 255; i++) {
    GF_EXP[i] = x
    GF_EXP[i + 255] = x
    GF_LOG[x] = i
    x <<= 1
    if (x & 0x100) x ^= 0x11d
  }
  GF_LOG[0] = 0
})()

function gfMul(x: number, y: number): number {
  if (x === 0 || y === 0) return 0
  return GF_EXP[GF_LOG[x] + GF_LOG[y]]
}

function polyMul(p1: Uint8Array, p2: Uint8Array): Uint8Array {
  const result = new Uint8Array(p1.length + p2.length - 1)
  for (let i = 0; i < p1.length; i++) {
    for (let j = 0; j < p2.length; j++) {
      result[i + j] ^= gfMul(p1[i], p2[j])
    }
  }
  return result
}

function rsGeneratorPoly(degree: number): Uint8Array {
  let poly: any = new Uint8Array([1])
  for (let i = 0; i < degree; i++) {
    poly = polyMul(poly, new Uint8Array([1, GF_EXP[i]]))
  }
  return poly as Uint8Array
}

function rsCompute(data: Uint8Array, ecCount: number): Uint8Array {
  const gen = rsGeneratorPoly(ecCount)
  const remainder = new Uint8Array(ecCount)
  for (let i = 0; i < data.length; i++) {
    const factor = data[i] ^ remainder[0]
    for (let j = 0; j < ecCount - 1; j++) {
      remainder[j] = remainder[j + 1] ^ gfMul(gen[j + 1], factor)
    }
    remainder[ecCount - 1] = gfMul(gen[ecCount], factor)
  }
  return remainder
}

// Versions config: [version, totalCodewords, dataCodewords, ecCodewords, size]
const VERSIONS = [
  { version: 1, total: 26, data: 19, ec: 7, size: 21 },
  { version: 2, total: 44, data: 34, ec: 10, size: 25 },
  { version: 3, total: 70, data: 55, ec: 15, size: 29 },
  { version: 4, total: 100, data: 80, ec: 20, size: 33 },
  { version: 5, total: 134, data: 108, ec: 26, size: 37 },
  { version: 6, total: 172, data: 136, ec: 36, size: 41 },
]

export function generateQRCodeMatrix(text: string): boolean[][] {
  const bytes = new TextEncoder().encode(text)
  const length = bytes.length

  // Choose smallest version that fits
  const verConfig = VERSIONS.find((v) => v.data >= length + 3) || VERSIONS[VERSIONS.length - 1]
  const { size, data: maxData, ec: ecCount } = verConfig

  // Data stream: mode indicator (0100 for Byte mode) + count + data + terminator + pad bytes
  const bitArray: number[] = []
  function pushBits(val: number, bits: number) {
    for (let i = bits - 1; i >= 0; i--) {
      bitArray.push((val >> i) & 1)
    }
  }

  pushBits(0b0100, 4) // 8-bit byte mode
  pushBits(length, 8) // Length indicator
  for (const b of bytes) pushBits(b, 8)

  // Terminator
  const maxBits = maxData * 8
  const termLen = Math.min(4, maxBits - bitArray.length)
  for (let i = 0; i < termLen; i++) bitArray.push(0)

  // Align to byte boundary
  while (bitArray.length % 8 !== 0) bitArray.push(0)

  // Pad bytes: 0xEC, 0x11
  const padBytes = [0xec, 0x11]
  let padIdx = 0
  while (bitArray.length < maxBits) {
    pushBits(padBytes[padIdx % 2], 8)
    padIdx++
  }

  // Convert bits to data codewords
  const dataCodewords = new Uint8Array(maxData)
  for (let i = 0; i < maxData; i++) {
    let byteVal = 0
    for (let b = 0; b < 8; b++) {
      byteVal = (byteVal << 1) | bitArray[i * 8 + b]
    }
    dataCodewords[i] = byteVal
  }

  // Error correction
  const ecCodewords = rsCompute(dataCodewords, ecCount)

  // Full codeword stream
  const allCodewords = new Uint8Array(dataCodewords.length + ecCodewords.length)
  allCodewords.set(dataCodewords)
  allCodewords.set(ecCodewords, dataCodewords.length)

  // Initialize Matrix
  const matrix: boolean[][] = Array.from({ length: size }, () => Array(size).fill(false))
  const isFunction: boolean[][] = Array.from({ length: size }, () => Array(size).fill(false))

  function setModule(r: number, c: number, val: boolean) {
    if (r >= 0 && r < size && c >= 0 && c < size) {
      matrix[r][c] = val
      isFunction[r][c] = true
    }
  }

  // 1. Finder patterns (7x7) + Separators (8x8)
  function placeFinder(top: number, left: number) {
    for (let r = -1; r <= 7; r++) {
      for (let c = -1; c <= 7; c++) {
        const row = top + r
        const col = left + c
        if (row >= 0 && row < size && col >= 0 && col < size) {
          if (r >= 0 && r <= 6 && c >= 0 && c <= 6) {
            const isBlack =
              r === 0 || r === 6 || c === 0 || c === 6 || (r >= 2 && r <= 4 && c >= 2 && c <= 4)
            setModule(row, col, isBlack)
          } else {
            setModule(row, col, false)
          }
        }
      }
    }
  }

  placeFinder(0, 0)
  placeFinder(0, size - 7)
  placeFinder(size - 7, 0)

  // 2. Timing patterns
  for (let i = 8; i < size - 8; i++) {
    setModule(6, i, i % 2 === 0)
    setModule(i, 6, i % 2 === 0)
  }

  // 3. Dark module
  setModule(size - 8, 8, true)

  // 4. Format info reserved areas
  for (let i = 0; i < 9; i++) {
    if (i !== 6) {
      isFunction[8][i] = true
      isFunction[i][8] = true
    }
  }
  for (let i = size - 8; i < size; i++) {
    isFunction[8][i] = true
    isFunction[i][8] = true
  }

  // 5. Place Data Codewords (2-column zig-zag right to left)
  let bitIndex = 0
  const totalBits = allCodewords.length * 8
  let upward = true

  for (let col = size - 1; col > 0; col -= 2) {
    if (col === 6) col-- // Skip vertical timing column
    const rows = upward
      ? Array.from({ length: size }, (_, i) => size - 1 - i)
      : Array.from({ length: size }, (_, i) => i)

    for (const row of rows) {
      for (let c = 0; c < 2; c++) {
        const currCol = col - c
        if (!isFunction[row][currCol]) {
          let bit = false
          if (bitIndex < totalBits) {
            const bytePos = Math.floor(bitIndex / 8)
            const bitPos = 7 - (bitIndex % 8)
            bit = ((allCodewords[bytePos] >> bitPos) & 1) === 1
            bitIndex++
          }
          // Apply Mask Pattern 0: (row + col) % 2 == 0
          const mask = (row + currCol) % 2 === 0
          matrix[row][currCol] = bit !== mask
        }
      }
    }
    upward = !upward
  }

  // 6. Format info bits (Mask 0, Error Correction L = 01): 15-bit format string 0x77c4 with BCH code
  const formatBits = [1, 1, 1, 0, 1, 1, 1, 1, 1, 0, 0, 0, 1, 0, 0] // 0x77c4
  // Place format info around top-left
  const formatCoords1 = [
    [8, 0], [8, 1], [8, 2], [8, 3], [8, 4], [8, 5], [8, 7], [8, 8],
    [7, 8], [5, 8], [4, 8], [3, 8], [2, 8], [1, 8], [0, 8]
  ]
  for (let i = 0; i < 15; i++) {
    const [r, c] = formatCoords1[i]
    matrix[r][c] = formatBits[i] === 1
  }

  // Format info duplicate at top-right and bottom-left
  for (let i = 0; i < 7; i++) {
    matrix[size - 1 - i][8] = formatBits[i] === 1
  }
  for (let i = 0; i < 8; i++) {
    matrix[8][size - 8 + i] = formatBits[7 + i] === 1
  }

  return matrix
}

/**
 * Returns an SVG string representing the QR code for embedding directly into HTML / PDF.
 */
export function generateQRCodeSVG(text: string, size = 160): string {
  const matrix = generateQRCodeMatrix(text)
  const moduleCount = matrix.length
  const cellSize = size / moduleCount

  let rects = ""
  for (let r = 0; r < moduleCount; r++) {
    for (let c = 0; c < moduleCount; c++) {
      if (matrix[r][c]) {
        rects += `<rect x="${(c * cellSize).toFixed(2)}" y="${(r * cellSize).toFixed(2)}" width="${cellSize.toFixed(2)}" height="${cellSize.toFixed(2)}" fill="#0f172a" />`
      }
    }
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" width="${size}" height="${size}" shape-rendering="crispEdges">
    <rect width="${size}" height="${size}" fill="#ffffff" />
    ${rects}
  </svg>`
}
