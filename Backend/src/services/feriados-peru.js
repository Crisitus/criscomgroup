'use strict';
// Feriados nacionales no laborables del Peru para el calculo de dias habiles.
// FIJOS: [mes, dia]. Jueves y Viernes Santo se calculan (domingo de Pascua).
// FERIADOS_EXTRA: dias adicionales por decreto (feriados puente, dias no laborables).
// Formato 'AAAA-MM-DD'. Editar aqui cuando el Gobierno publique nuevos dias.
const FERIADOS_FIJOS = [
  [1, 1], [5, 1], [6, 7], [6, 29], [7, 23], [7, 28], [7, 29],
  [8, 6], [8, 30], [10, 8], [11, 1], [12, 8], [12, 9], [12, 25],
];
const FERIADOS_EXTRA = [];

const pad = n => String(n).padStart(2, '0');
const ymd = (y, m, d) => `${y}-${pad(m)}-${pad(d)}`;

// Algoritmo de Meeus/Jones/Butcher para el domingo de Pascua.
function pascua(year) {
  const a = year % 19, b = Math.floor(year / 100), c = year % 100;
  const d = Math.floor(b / 4), e = b % 4, f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3), h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4), k = c % 4, l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return { month, day };
}

const addDays = (text, days) => {
  const [y, m, d] = text.split('-').map(Number);
  const date = new Date(Date.UTC(y, m - 1, d + days));
  return ymd(date.getUTCFullYear(), date.getUTCMonth() + 1, date.getUTCDate());
};

const cache = new Map();
function feriadosDe(year) {
  if (cache.has(year)) return cache.get(year);
  const set = new Set(FERIADOS_FIJOS.map(([m, d]) => ymd(year, m, d)));
  const p = pascua(year);
  const domingo = ymd(year, p.month, p.day);
  set.add(addDays(domingo, -3));
  set.add(addDays(domingo, -2));
  for (const extra of FERIADOS_EXTRA) if (extra.startsWith(`${year}-`)) set.add(extra);
  cache.set(year, set);
  return set;
}

const esFeriado = text => feriadosDe(Number(text.slice(0, 4))).has(text);
const diaSemana = text => {
  const [y, m, d] = text.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
};
const esHabil = text => {
  const dow = diaSemana(text);
  return dow !== 0 && dow !== 6 && !esFeriado(text);
};

// Fecha 'AAAA-MM-DD' resultante de sumar n dias habiles (el dia inicial no cuenta).
function sumarDiasHabiles(inicio, n) {
  let actual = inicio;
  let restantes = n;
  while (restantes > 0) {
    actual = addDays(actual, 1);
    if (esHabil(actual)) restantes -= 1;
  }
  return actual;
}

// Dias habiles entre hoy y el vencimiento: >0 faltan, 0 vence hoy, <0 vencido.
function diasHabilesRestantes(hoy, vencimiento) {
  if (hoy === vencimiento) return 0;
  const sentido = hoy < vencimiento ? 1 : -1;
  let actual = hoy;
  let cuenta = 0;
  while (actual !== vencimiento) {
    if (sentido === 1) { actual = addDays(actual, 1); if (esHabil(actual)) cuenta += 1; }
    else { if (esHabil(actual)) cuenta -= 1; actual = addDays(actual, -1); }
  }
  return cuenta;
}

module.exports = { FERIADOS_FIJOS, FERIADOS_EXTRA, feriadosDe, esFeriado, esHabil, sumarDiasHabiles, diasHabilesRestantes, addDays };
