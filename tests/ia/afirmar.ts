// Afirmaciones mínimas para las pruebas (sin dependencias externas).
export function assert(c: unknown, msg = "afirmación falsa"): asserts c { if (!c) throw new Error(msg); }
export function assertEquals(a: unknown, b: unknown) {
  const sa = JSON.stringify(a), sb = JSON.stringify(b);
  if (sa !== sb) throw new Error(`esperado ${sb}, llegó ${sa}`);
}
export function assertMatch(s: string, re: RegExp) { if (!re.test(s)) throw new Error(`no coincide ${re}`); }
