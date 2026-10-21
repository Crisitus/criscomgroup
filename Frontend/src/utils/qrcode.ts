// QR Code (modo byte, correccion M, versiones 1-10: hasta 213 bytes) sin dependencias.
// Pensado para URLs cortas de producto; si el texto no cabe lanza un error.

// [ecc por bloque, [[n bloques, datos por bloque], ...]] para nivel M, versiones 1..10
const BLOQUES_M: Array<[number, Array<[number, number]>]> = [
  [10, [[1, 16]]], [16, [[1, 28]]], [26, [[1, 44]]], [18, [[2, 32]]], [24, [[2, 43]]],
  [16, [[4, 27]]], [18, [[4, 31]]], [22, [[2, 38], [2, 39]]], [22, [[3, 36], [2, 37]]], [26, [[4, 43], [1, 44]]],
]
const ALINEACION: number[][] = [[], [6, 18], [6, 22], [6, 26], [6, 30], [6, 34], [6, 22, 38], [6, 24, 42], [6, 26, 46], [6, 28, 50]]

// --- Galois GF(256), polinomio 0x11d ---
const EXP = new Array<number>(512)
const LOG = new Array<number>(256)
{
  let x = 1
  for (let i = 0; i < 255; i++) { EXP[i] = x; LOG[x] = i; x <<= 1; if (x & 0x100) x ^= 0x11d }
  for (let i = 255; i < 512; i++) EXP[i] = EXP[i - 255]
}
const gfMul = (a: number, b: number) => (a === 0 || b === 0 ? 0 : EXP[LOG[a] + LOG[b]])

const generador = (n: number) => {
  let poly = [1]
  for (let i = 0; i < n; i++) {
    const next = new Array<number>(poly.length + 1).fill(0)
    for (let j = 0; j < poly.length; j++) {
      next[j] ^= poly[j]
      next[j + 1] ^= gfMul(poly[j], EXP[i])
    }
    poly = next
  }
  return poly
}

const reedSolomon = (datos: number[], n: number) => {
  const gen = generador(n)
  const resto = new Array<number>(n).fill(0)
  for (const d of datos) {
    const factor = d ^ resto.shift()!
    resto.push(0)
    for (let i = 0; i < n; i++) resto[i] ^= gfMul(gen[i + 1], factor)
  }
  return resto
}

const utf8 = (texto: string) => Array.from(new TextEncoder().encode(texto))

const elegirVersion = (largo: number) => {
  for (let v = 1; v <= 10; v++) {
    const [, grupos] = BLOQUES_M[v - 1]
    const capacidad = grupos.reduce((s, [n, d]) => s + n * d, 0)
    const cc = v < 10 ? 8 : 16
    if (4 + cc + 8 * largo <= capacidad * 8) return v
  }
  throw new Error("QR: el texto es demasiado largo")
}

const codewords = (bytes: number[], version: number) => {
  const [ecc, grupos] = BLOQUES_M[version - 1]
  const capacidad = grupos.reduce((s, [n, d]) => s + n * d, 0)
  const bits: number[] = []
  const push = (valor: number, n: number) => { for (let i = n - 1; i >= 0; i--) bits.push((valor >>> i) & 1) }
  push(0b0100, 4)
  push(bytes.length, version < 10 ? 8 : 16)
  bytes.forEach(b => push(b, 8))
  push(0, Math.min(4, capacidad * 8 - bits.length))
  while (bits.length % 8) bits.push(0)
  for (let pad = 0xec; bits.length < capacidad * 8; pad ^= 0xec ^ 0x11) push(pad, 8)
  const datos: number[] = []
  for (let i = 0; i < bits.length; i += 8) datos.push(parseInt(bits.slice(i, i + 8).join(""), 2))
  const bloques: number[][] = []
  const eccs: number[][] = []
  let pos = 0
  for (const [n, d] of grupos) {
    for (let i = 0; i < n; i++) {
      const b = datos.slice(pos, pos + d)
      pos += d
      bloques.push(b)
      eccs.push(reedSolomon(b, ecc))
    }
  }
  const out: number[] = []
  const maxD = Math.max(...grupos.map(g => g[1]))
  for (let i = 0; i < maxD; i++) bloques.forEach(b => { if (i < b.length) out.push(b[i]) })
  for (let i = 0; i < ecc; i++) eccs.forEach(e => out.push(e[i]))
  return out
}

const bit = (x: number, i: number) => ((x >>> i) & 1) !== 0

class Matriz {
  readonly size: number
  modulos: boolean[][]
  funcion: boolean[][]
  constructor(readonly version: number) {
    this.size = version * 4 + 17
    this.modulos = Array.from({ length: this.size }, () => new Array<boolean>(this.size).fill(false))
    this.funcion = Array.from({ length: this.size }, () => new Array<boolean>(this.size).fill(false))
  }
  set(x: number, y: number, oscuro: boolean) { this.modulos[y][x] = oscuro; this.funcion[y][x] = true }
  patronesFuncion() {
    const n = this.size
    for (let i = 0; i < n; i++) { this.set(6, i, i % 2 === 0); this.set(i, 6, i % 2 === 0) }
    for (const [cx, cy] of [[3, 3], [n - 4, 3], [3, n - 4]]) {
      for (let dy = -4; dy <= 4; dy++) {
        for (let dx = -4; dx <= 4; dx++) {
          const d = Math.max(Math.abs(dx), Math.abs(dy)); const x = cx + dx; const y = cy + dy
          if (x >= 0 && x < n && y >= 0 && y < n) this.set(x, y, d !== 2 && d !== 4)
        }
      }
    }
    const pos = ALINEACION[this.version - 1]
    const ult = pos.length - 1
    pos.forEach((px, i) => pos.forEach((py, j) => {
      if ((i === 0 && j === 0) || (i === 0 && j === ult) || (i === ult && j === 0)) return
      for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) this.set(px + dx, py + dy, Math.max(Math.abs(dx), Math.abs(dy)) !== 1)
    }))
    this.formato(0)
    this.versionBits()
  }
  formato(mascara: number) {
    const n = this.size
    const datos = mascara // nivel M = 00
    let rem = datos
    for (let i = 0; i < 10; i++) rem = (rem << 1) ^ ((rem >>> 9) * 0x537)
    const bits = ((datos << 10) | rem) ^ 0x5412
    for (let i = 0; i <= 5; i++) this.set(8, i, bit(bits, i))
    this.set(8, 7, bit(bits, 6)); this.set(8, 8, bit(bits, 7)); this.set(7, 8, bit(bits, 8))
    for (let i = 9; i < 15; i++) this.set(14 - i, 8, bit(bits, i))
    for (let i = 0; i < 8; i++) this.set(n - 1 - i, 8, bit(bits, i))
    for (let i = 8; i < 15; i++) this.set(8, n - 15 + i, bit(bits, i))
    this.set(8, n - 8, true)
  }
  versionBits() {
    if (this.version < 7) return
    let rem = this.version
    for (let i = 0; i < 12; i++) rem = (rem << 1) ^ ((rem >>> 11) * 0x1f25)
    const bits = (this.version << 12) | rem
    for (let i = 0; i < 18; i++) {
      const a = this.size - 11 + (i % 3); const b = Math.floor(i / 3)
      this.set(a, b, bit(bits, i)); this.set(b, a, bit(bits, i))
    }
  }
  datos(cw: number[]) {
    const n = this.size
    let i = 0
    for (let derecha = n - 1; derecha >= 1; derecha -= 2) {
      if (derecha === 6) derecha = 5
      for (let v = 0; v < n; v++) {
        for (let j = 0; j < 2; j++) {
          const x = derecha - j
          const arriba = ((derecha + 1) & 2) === 0
          const y = arriba ? n - 1 - v : v
          if (!this.funcion[y][x] && i < cw.length * 8) { this.modulos[y][x] = bit(cw[i >>> 3], 7 - (i & 7)); i++ }
        }
      }
    }
  }
  mascara(m: number) {
    for (let y = 0; y < this.size; y++) {
      for (let x = 0; x < this.size; x++) {
        let inv = false
        switch (m) {
          case 0: inv = (x + y) % 2 === 0; break
          case 1: inv = y % 2 === 0; break
          case 2: inv = x % 3 === 0; break
          case 3: inv = (x + y) % 3 === 0; break
          case 4: inv = (Math.floor(x / 3) + Math.floor(y / 2)) % 2 === 0; break
          case 5: inv = ((x * y) % 2) + ((x * y) % 3) === 0; break
          case 6: inv = (((x * y) % 2) + ((x * y) % 3)) % 2 === 0; break
          default: inv = (((x + y) % 2) + ((x * y) % 3)) % 2 === 0
        }
        if (!this.funcion[y][x] && inv) this.modulos[y][x] = !this.modulos[y][x]
      }
    }
  }
  penalidad() {
    const n = this.size; const m = this.modulos
    let total = 0
    const contar = (h: number[]) => {
      const k = h[1]
      const nucleo = k > 0 && h[2] === k && h[3] === k * 3 && h[4] === k && h[5] === k
      return (nucleo && h[0] >= k * 4 && h[6] >= k ? 1 : 0) + (nucleo && h[6] >= k * 4 && h[0] >= k ? 1 : 0)
    }
    const agregar = (largo: number, h: number[]) => { if (h[0] === 0) largo += n; h.pop(); h.unshift(largo) }
    const linea = (get: (i: number) => boolean) => {
      let color = false; let racha = 0; const h = [0, 0, 0, 0, 0, 0, 0]
      for (let i = 0; i < n; i++) {
        if (get(i) === color) { racha++; if (racha === 5) total += 3; else if (racha > 5) total++ }
        else { agregar(racha, h); if (!color) total += contar(h) * 40; color = get(i); racha = 1 }
      }
      if (color) { agregar(racha, h); racha = 0 }
      racha += n; agregar(racha, h)
      total += contar(h) * 40
    }
    for (let y = 0; y < n; y++) linea(x => m[y][x])
    for (let x = 0; x < n; x++) linea(y => m[y][x])
    for (let y = 0; y < n - 1; y++) for (let x = 0; x < n - 1; x++) {
      const c = m[y][x]
      if (c === m[y][x + 1] && c === m[y + 1][x] && c === m[y + 1][x + 1]) total += 3
    }
    const oscuros = m.reduce((s, f) => s + f.filter(Boolean).length, 0)
    const t = n * n
    total += (Math.ceil(Math.abs(oscuros * 20 - t * 10) / t) - 1) * 10
    return total
  }
}

/** Matriz de modulos (true = oscuro). `mascara` solo se fuerza en pruebas. */
export const qrMatriz = (texto: string, mascara?: number): boolean[][] => {
  const bytes = utf8(texto)
  const version = elegirVersion(bytes.length)
  const q = new Matriz(version)
  q.patronesFuncion()
  q.datos(codewords(bytes, version))
  let mejor = mascara ?? 0
  if (mascara === undefined) {
    let min = Infinity
    for (let m = 0; m < 8; m++) {
      q.mascara(m); q.formato(m)
      const p = q.penalidad()
      if (p < min) { min = p; mejor = m }
      q.mascara(m)
    }
  }
  q.mascara(mejor); q.formato(mejor)
  return q.modulos
}

/** Camino SVG con una celda por modulo (une corridas horizontales). `margen` = quiet zone en modulos. */
export const qrPath = (texto: string, margen = 0): { d: string; size: number } => {
  const m = qrMatriz(texto)
  let d = ""
  m.forEach((fila, y) => {
    let x = 0
    while (x < fila.length) {
      if (fila[x]) { let j = x; while (fila[j]) j++; d += `M${x + margen} ${y + margen}h${j - x}v1h-${j - x}z`; x = j } else x++
    }
  })
  return { d, size: m.length + margen * 2 }
}
