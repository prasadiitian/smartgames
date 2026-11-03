// Number helpers. Plain doubles reach 1.79e308, so values are clamped to 1e300.
export const MAX = 1e300;
const SUFFIX = ['', 'K', 'M', 'B', 'T', 'Qa', 'Qi', 'Sx', 'Sp', 'Oc', 'No', 'Dc'];

export function clamp(n) {
  if (!Number.isFinite(n)) return n > 0 ? MAX : 0;
  return n > MAX ? MAX : n;
}

export function fmt(n, digits = 2) {
  if (!Number.isFinite(n)) return n > 0 ? '1.00e300' : '0';
  if (n < 0) return '-' + fmt(-n, digits);
  if (n < 1000) {
    if (n >= 100 || Number.isInteger(n)) return String(Math.floor(n));
    return n.toFixed(n >= 10 ? 1 : digits);
  }
  const tier = Math.floor(Math.log10(n) / 3);
  if (tier < SUFFIX.length) {
    let v = n / Math.pow(1000, tier);
    let t = tier;
    // guard rounding up to 1000.00
    if (Number(v.toFixed(digits)) >= 1000 && t + 1 < SUFFIX.length) { v /= 1000; t += 1; }
    return v.toFixed(digits) + SUFFIX[t];
  }
  const exp = Math.floor(Math.log10(n));
  let m = n / Math.pow(10, exp);
  let e = exp;
  if (Number(m.toFixed(digits)) >= 10) { m /= 10; e += 1; }
  return m.toFixed(digits) + 'e' + e;
}

export function fmtTime(sec) {
  sec = Math.max(0, Math.floor(sec));
  const h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60), s = sec % 60;
  if (h) return h + 'h ' + m + 'm';
  if (m) return m + 'm ' + s + 's';
  return s + 's';
}
