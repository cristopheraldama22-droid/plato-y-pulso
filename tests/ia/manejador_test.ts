// deno test tests/ia
import { assert, assertEquals, assertMatch } from "./afirmar.ts";
import { manejar, Deps } from "../../supabase/functions/ia/manejador.ts";
import { armarPedido, CONFIG_BASE, costoUSD, extraerJSON } from "../../supabase/functions/ia/logica.ts";

const ESP = "0b7e6f2a-1c2d-4e5f-8a9b-0c1d2e3f4a5b";

function deps(over: Partial<Deps> & { respuesta?: string; status?: number } = {}) {
  const registros: Record<string, unknown>[] = [];
  const pedidos: Record<string, unknown>[] = [];
  const d: Deps = {
    usuario: async (jwt) => (jwt === "ok" ? "user-1" : null),
    miembro: async () => ({ rol: "miembro" }),
    estado: async () => ({ gastado: 0.1, tope: 3, foto: true, activo: true }),
    llamadasRecientes: async () => 0,
    reservar: async (f) => { registros.push({ ...f }); return registros.length - 1; },
    cerrar: async (id, c) => { Object.assign(registros[Number(id)], c); },
    claude: async (p) => { pedidos.push({ ...p, reservados: registros.length }); return { status: over.status ?? 200, texto: over.respuesta ?? '{"kcal":520,"prot":38,"veg":1.5,"ultra":false,"nota":"plato normal"}', entrada: 400, salida: 80 }; },
    ...over,
  };
  return { d, registros, pedidos };
}
const pedir = (cuerpo: unknown, jwt = "ok", origin = "https://app.ejemplo.uy") =>
  new Request("https://x/functions/v1/ia", { method: "POST", headers: { authorization: `Bearer ${jwt}`, origin, "content-type": "application/json" }, body: JSON.stringify(cuerpo) });

Deno.test("estimar: responde, registra costo y usa el modelo rápido", async () => {
  const { d, registros, pedidos } = deps();
  const r = await manejar(pedir({ espacio_id: ESP, tarea: "estimar", datos: { texto: "milanesa de pollo al horno con ensalada" } }), d);
  assertEquals(r.status, 200);
  const j = await r.json();
  assertEquals(j.resultado.kcal, 520);
  assertEquals((pedidos[0] as { model: string }).model, "claude-haiku-5-5");
  assertEquals(registros.length, 1);
  assertEquals(registros[0].costo_usd, costoUSD("claude-haiku-5-5", 400, 80));
  assert(Number(j.costo_usd) < 0.001, "una estimación cuesta menos de una décima de centavo");
});

Deno.test("sin sesión → 401, sin tocar la IA", async () => {
  const { d, pedidos } = deps();
  const r = await manejar(pedir({ espacio_id: ESP, tarea: "estimar", datos: { texto: "x" } }, "malo"), d);
  assertEquals(r.status, 401); assertEquals(pedidos.length, 0);
});

Deno.test("no es miembro → 403", async () => {
  const { d, pedidos } = deps({ miembro: async () => null });
  const r = await manejar(pedir({ espacio_id: ESP, tarea: "estimar", datos: { texto: "x" } }), d);
  assertEquals(r.status, 403); assertEquals(pedidos.length, 0);
});

Deno.test("tope del plan alcanzado → 402", async () => {
  const { d, pedidos } = deps({ estado: async () => ({ gastado: 3.01, tope: 3, foto: true, activo: true }) });
  const r = await manejar(pedir({ espacio_id: ESP, tarea: "estimar", datos: { texto: "x" } }), d);
  assertEquals(r.status, 402); assertEquals((await r.json()).error, "tope_plan"); assertEquals(pedidos.length, 0);
});

Deno.test("plan sin foto → 403 para foto", async () => {
  const { d } = deps({ estado: async () => ({ gastado: 0, tope: 3, foto: false, activo: true }) });
  const r = await manejar(pedir({ espacio_id: ESP, tarea: "foto", datos: { imagen: "A".repeat(500) } }), d);
  assertEquals((await r.json()).error, "plan_sin_foto");
});

Deno.test("espacio suspendido → 403", async () => {
  const { d } = deps({ estado: async () => ({ gastado: 0, tope: 3, foto: true, activo: false }) });
  assertEquals((await manejar(pedir({ espacio_id: ESP, tarea: "estimar", datos: { texto: "x" } }), d)).status, 403);
});

Deno.test("demasiadas llamadas → 429", async () => {
  const { d } = deps({ llamadasRecientes: async () => 99 });
  assertEquals((await manejar(pedir({ espacio_id: ESP, tarea: "estimar", datos: { texto: "x" } }), d)).status, 429);
});

Deno.test("tarea desconocida o espacio mal formado → 400", async () => {
  const { d } = deps();
  assertEquals((await manejar(pedir({ espacio_id: ESP, tarea: "chatear", datos: {} }), d)).status, 400);
  assertEquals((await manejar(pedir({ espacio_id: "x'; drop", tarea: "estimar", datos: {} }), d)).status, 400);
});

Deno.test("origen no permitido → 403; preflight CORS ok", async () => {
  const { d } = deps({ origenes: ["https://app.ejemplo.uy"] });
  const otro = await manejar(pedir({ espacio_id: ESP, tarea: "estimar", datos: { texto: "x" } }, "ok", "https://otro.com"), d);
  assertEquals(otro.status, 403);
  assertEquals(otro.headers.get("Access-Control-Allow-Origin"), null);
  const pre = await manejar(new Request("https://x", { method: "OPTIONS", headers: { origin: "https://app.ejemplo.uy" } }), d);
  assertEquals(pre.headers.get("Access-Control-Allow-Origin"), "https://app.ejemplo.uy");
});

Deno.test("respuesta ilegible: 502 y el costo igual se registra", async () => {
  const { d, registros } = deps({ respuesta: "no sé" });
  const r = await manejar(pedir({ espacio_id: ESP, tarea: "estimar", datos: { texto: "x" } }), d);
  assertEquals(r.status, 502); assertEquals(registros[0].ok, false);
});

Deno.test("IA saturada → 503 con mensaje", async () => {
  const { d } = deps({ status: 529 });
  assertEquals((await manejar(pedir({ espacio_id: ESP, tarea: "estimar", datos: { texto: "x" } }), d)).status, 503);
});

Deno.test("recetas: usa el modelo de recetas, limpia y devuelve 5", async () => {
  const receta = (i: number) => ({ titulo: `Receta ${i}`, tiempo_min: "30", kcal: 500.4, prot: 40, veg: 1.3, ingredientes: [{ item: "Huevos", cant: "4" }, "Sal"], pasos: ["1. Batí", "2) Cociná"], faltan: ["limón"] });
  const { d, pedidos } = deps({ respuesta: "Acá van:\n```json\n" + JSON.stringify([1, 2, 3, 4, 5, 6].map(receta)) + "\n```" });
  const r = await manejar(pedir({ espacio_id: ESP, tarea: "recetas", datos: { despensa: [{ nombre: "Huevos" }], objetivos: [{ nombre: "Cris", objetivo: "musculo", kcal: 2550, prot: 140 }, { nombre: "Clara", objetivo: "mantener" }], filtros: ["rapida", "inventado"], evitar: ["Tortilla"] } }), d);
  assertEquals(r.status, 200);
  const j = await r.json();
  assertEquals(j.resultado.length, 5);
  assertEquals(j.resultado[0].pasos[0], "Batí");
  assertEquals(j.resultado[0].veg, 1.5);
  assertEquals(j.resultado[0].ingredientes[1], { item: "Sal", cant: "" });
  const p = pedidos[0] as { model: string; messages: { content: { text: string }[] }[] };
  assertEquals(p.model, "claude-haiku-5-5");
  const txt = p.messages[0].content[0].text;
  assertMatch(txt, /para 2 personas/); assertMatch(txt, /ganar músculo/); assertMatch(txt, /Rápidas/); assertMatch(txt, /Tortilla/);
});

Deno.test("foto: arma el bloque de imagen y valida el contenido", () => {
  const p = armarPedido("foto", { imagen: "QUJD".repeat(100), media_type: "image/jpeg" });
  assertEquals((p.contenido[0] as { type: string }).type, "image");
  let error = "";
  try { armarPedido("foto", { imagen: "<script>", media_type: "image/jpeg" }); } catch (e) { error = (e as { codigo: string }).codigo; }
  assertEquals(error, "imagen_invalida");
});

Deno.test("lote y compra: interpreta arrays y categorías", async () => {
  const { d } = deps({ respuesta: '[{"i":0,"kcal":600,"prot":40,"veg":1},{"i":1,"kcal":"300","prot":10}]' });
  const r = await manejar(pedir({ espacio_id: ESP, tarea: "estimar_lote", datos: { items: [{ texto: "tarta" }, { texto: "sopa", cant: "1 taza" }] } }), d);
  const j = await r.json();
  assertEquals(j.resultado.map((x: { kcal: number }) => x.kcal), [600, 300]);
  const { d: d2 } = deps({ respuesta: '[{"nombre":"Tomates","cant":"1 kg","cat":"ver"},{"nombre":"Cosa","cat":"rara"}]' });
  const r2 = await manejar(pedir({ espacio_id: ESP, tarea: "compra", datos: { rutinas: [{ nombre: "Cris", dias: [{ dia: "Lunes", comidas: [{ slot: "almuerzo", texto: "Lentejas" }] }] }] } }), d2);
  assertEquals((await r2.json()).resultado[1].cat, "otr");
  const { d: d3 } = deps();
  assertEquals((await manejar(pedir({ espacio_id: ESP, tarea: "compra", datos: { rutinas: [] } }), d3)).status, 400);
});

Deno.test("extraerJSON tolera texto alrededor", () => {
  assertEquals(extraerJSON('Claro: {"a":1} listo'), { a: 1 });
});

Deno.test("reserva el costo máximo antes de llamar a Claude y después lo ajusta", async () => {
  const { d, registros, pedidos } = deps();
  await manejar(pedir({ espacio_id: ESP, tarea: "estimar", datos: { texto: "milanesa" } }), d);
  assertEquals((pedidos[0] as { reservados: number }).reservados, 1);
  assertEquals(registros[0].ok, true);
  assertEquals(registros[0].tokens_salida, 80);
});

Deno.test("pensamiento apagado en todas las tareas; Sonnet usa between_tools si se configura", async () => {
  const { d, pedidos } = deps();
  await manejar(pedir({ espacio_id: ESP, tarea: "estimar", datos: { texto: "milanesa" } }), d);
  assertEquals((pedidos[0] as { thinking: unknown }).thinking, { type: "disabled" });
  const { d: d2, pedidos: p2 } = deps({ respuesta: "[]", config: { ...CONFIG_BASE, modeloRecetas: "claude-sonnet-5-5" } });
  await manejar(pedir({ espacio_id: ESP, tarea: "recetas", datos: {} }), d2);
  assertEquals((p2[0] as { thinking: unknown }).thinking, { type: "between_tools" });
});

Deno.test("si la base falla al leer el gasto: no llama a la IA y responde con CORS", async () => {
  const { d, pedidos } = deps({ estado: () => Promise.reject(new Error("db caída")), origenes: ["https://app.ejemplo.uy"] });
  const r = await manejar(pedir({ espacio_id: ESP, tarea: "estimar", datos: { texto: "x" } }), d);
  assertEquals(r.status, 500); assertEquals(pedidos.length, 0);
  assertEquals(r.headers.get("Access-Control-Allow-Origin"), "https://app.ejemplo.uy");
});

Deno.test("si no se puede reservar el uso: no llama a la IA", async () => {
  const { d, pedidos } = deps({ reservar: () => Promise.reject(new Error("insert falló")) });
  const r = await manejar(pedir({ espacio_id: ESP, tarea: "estimar", datos: { texto: "x" } }), d);
  assertEquals(r.status, 500); assertEquals(pedidos.length, 0);
});

Deno.test("prueba vencida → 402 plan_vencido, sin llamar a la IA", async () => {
  const { d, pedidos } = deps({ estado: async () => ({ gastado: 0, tope: 0.5, foto: true, activo: true, vencido: true }) });
  const r = await manejar(pedir({ espacio_id: ESP, tarea: "estimar", datos: { texto: "x" } }), d);
  assertEquals(r.status, 402); assertEquals((await r.json()).error, "plan_vencido"); assertEquals(pedidos.length, 0);
});

Deno.test("plan sin IA (tope 0) → 402", async () => {
  const { d, pedidos } = deps({ estado: async () => ({ gastado: 0, tope: 0, foto: false, activo: true }) });
  const r = await manejar(pedir({ espacio_id: ESP, tarea: "estimar", datos: { texto: "x" } }), d);
  assertEquals(r.status, 402); assertEquals(pedidos.length, 0);
});

Deno.test("costo de referencia: recetas con Haiku cuestan menos de medio centavo", () => {
  const c = costoUSD("claude-haiku-5-5", 1500, 2500);
  assert(c < 0.005, String(c));
});
