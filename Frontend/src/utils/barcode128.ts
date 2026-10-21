// Code 128 (sets B y C) sin dependencias. Devuelve los modulos como "1" (barra) / "0" (espacio).
// Tabla de patrones: ancho de barra/espacio alternados (ISO/IEC 15417); el ultimo es el stop.
const PATRONES = [
  "212222", "222122", "222221", "121223", "121322", "131222", "122213", "122312",
  "132212", "221213", "221312", "231212", "112232", "122132", "122231", "113222",
  "123122", "123221", "223211", "221132", "221231", "213212", "223112", "312131",
  "311222", "321122", "321221", "312212", "322112", "322211", "212123", "212321",
  "232121", "111323", "131123", "131321", "112313", "132113", "132311", "211313",
  "231113", "231311", "112133", "112331", "132131", "113123", "113321", "133121",
  "313121", "211331", "231131", "213113", "213311", "213131", "311123", "311321",
  "331121", "312113", "312311", "332111", "314111", "221411", "431111", "111224",
  "111422", "121124", "121421", "141122", "141221", "112214", "112412", "122114",
  "122411", "142112", "142211", "241211", "221114", "413111", "241112", "134111",
  "111242", "121142", "121241", "114212", "124112", "124211", "411212", "421112",
  "421211", "212141", "214121", "412121", "111143", "111341", "131141", "114113",
  "114311", "411113", "411311", "113141", "114131", "311141", "411131", "211412",
  "211214", "211232", "2331112",
]

const START_B = 104
const START_C = 105
const CODE_B = 100
const CODE_C = 99
const STOP = 106

const esDigito = (c: string | undefined) => c !== undefined && c >= "0" && c <= "9"

// Largo de la racha de digitos que empieza en i.
const rachaDigitos = (texto: string, i: number) => {
  let n = 0
  while (esDigito(texto[i + n])) n++
  return n
}

/** Caracteres que Code 128 B puede codificar (ASCII imprimible). */
export const esCode128Valido = (texto: string) => texto.length > 0 && /^[\x20-\x7e]+$/.test(texto)

/** Valores de simbolo (sin checksum ni stop). Usa C para rachas largas de digitos. */
export const code128Valores = (texto: string): number[] => {
  if (!esCode128Valido(texto)) throw new Error("Code128: texto no valido")
  const valores: number[] = []
  let modo: "B" | "C" = "B"
  let i = 0
  // Racha numerica al inicio: C si hay 4+ digitos (si es impar, el primero va en B).
  const inicio = rachaDigitos(texto, 0)
  if (inicio >= 4 && inicio % 2 === 0) { valores.push(START_C); modo = "C" } else valores.push(START_B)
  while (i < texto.length) {
    const racha = rachaDigitos(texto, i)
    if (modo === "B" && racha >= (i + racha === texto.length ? 4 : 6)) {
      if (racha % 2 === 1) { valores.push(texto.charCodeAt(i) - 32); i++ }
      valores.push(CODE_C); modo = "C"
      continue
    }
    if (modo === "C") {
      if (racha >= 2) { valores.push(Number(texto.slice(i, i + 2))); i += 2; continue }
      valores.push(CODE_B); modo = "B"
      continue
    }
    valores.push(texto.charCodeAt(i) - 32); i++
  }
  return valores
}

/** Modulos del simbolo completo (quiet zone NO incluida). Cada barra/espacio es un modulo. */
export const code128Modulos = (texto: string): string => {
  const valores = code128Valores(texto)
  const check = valores.reduce((s, v, k) => s + (k === 0 ? v : v * k), 0) % 103
  const simbolos = [...valores, check, STOP]
  let out = ""
  for (const v of simbolos) {
    const anchos = PATRONES[v]
    for (let k = 0; k < anchos.length; k++) out += (k % 2 === 0 ? "1" : "0").repeat(Number(anchos[k]))
  }
  return out
}

/** Rachas [inicio, largo] de modulos en barra: para dibujar un Rect por barra. */
export const barras = (modulos: string): Array<[number, number]> => {
  const res: Array<[number, number]> = []
  let i = 0
  while (i < modulos.length) {
    if (modulos[i] === "1") {
      let j = i
      while (modulos[j] === "1") j++
      res.push([i, j - i])
      i = j
    } else i++
  }
  return res
}

/** Camino SVG de las barras (alto 1, ancho = modulos + 2*margen). `margen` = quiet zone en modulos. */
export const code128Path = (texto: string, margen = 6): { d: string; anchoModulos: number } => {
  const mod = code128Modulos(texto)
  let d = ""
  for (const [inicio, largo] of barras(mod)) d += `M${inicio + margen} 0h${largo}v1h-${largo}z`
  return { d, anchoModulos: mod.length + margen * 2 }
}
