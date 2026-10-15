// deno test tests/comentarios
import { assertEquals } from "../ia/afirmar.ts";
import { celda, Comentario, Deps, manejar } from "../../supabase/functions/comentarios/manejador.ts";

const ESP = "0b7e6f2a-1c2d-4e5f-8a9b-0c1d2e3f4a5b";
function deps(over: Partial<Deps> = {}) {
  const guardados: Comentario[] = [], filas: Record<string, string>[] = [];
  const d: Deps = {
    usuario: async (jwt) => (jwt === "ok" ? { id: "user-1", email: "ana@x.uy" } : null),
    esMiembro: async (e) => (e === ESP ? { espacio: ESP, nombre: "Casa" } : null),
    recientes: async () => 0,
    guardar: async (c) => { guardados.push(c); },
    planilla: async (f) => { filas.push(f); },
    origenes: ["https://app.ejemplo.uy"],
    ...over,
  };
  return { d, guardados, filas };
}
const pedir = (cuerpo: unknown, jwt = "ok", origin = "https://app.ejemplo.uy") =>
  new Request("https://x/functions/v1/comentarios", { method: "POST", headers: { authorization: `Bearer ${jwt}`, origin, "content-type": "application/json" }, body: JSON.stringify(cuerpo) });

Deno.test("guarda el comentario y lo copia a la planilla", async () => {
  const { d, guardados, filas } = deps();
  const r = await manejar(pedir({ tipo: "idea", texto: "  Me encanta la semana  ", espacio_id: ESP, pantalla: "semana" }), d);
  assertEquals(r.status, 200);
  assertEquals(guardados[0].texto, "Me encanta la semana");
  assertEquals(guardados[0].espacio_id, ESP);
  assertEquals(filas[0].email, "ana@x.uy");
  assertEquals(filas[0].espacio, "Casa");
});

Deno.test("sin sesión, sin texto u origen ajeno: no guarda", async () => {
  const { d, guardados } = deps();
  assertEquals((await manejar(pedir({ texto: "hola" }, "malo"), d)).status, 401);
  assertEquals((await manejar(pedir({ texto: "   " }), d)).status, 400);
  assertEquals((await manejar(pedir({ texto: "hola" }, "ok", "https://otro.com"), d)).status, 403);
  assertEquals(guardados.length, 0);
});

Deno.test("espacio ajeno no se asocia; tipo desconocido pasa a 'otro'", async () => {
  const { d, guardados } = deps();
  await manejar(pedir({ tipo: "hack", texto: "x", espacio_id: "11111111-1111-1111-1111-111111111111" }), d);
  assertEquals(guardados[0].espacio_id, null);
  assertEquals(guardados[0].tipo, "otro");
});

Deno.test("tope de 10 por hora", async () => {
  const { d, guardados } = deps({ recientes: async () => 10 });
  assertEquals((await manejar(pedir({ texto: "x" }), d)).status, 429);
  assertEquals(guardados.length, 0);
});

Deno.test("si la planilla falla, igual responde bien (quedó en la base)", async () => {
  const { d, guardados } = deps({ planilla: () => Promise.reject(new Error("caída")) });
  assertEquals((await manejar(pedir({ texto: "x" }), d)).status, 200);
  assertEquals(guardados.length, 1);
});

Deno.test("las celdas que parecen fórmulas se neutralizan", () => {
  assertEquals(celda("=HYPERLINK(\"x\")"), "'=HYPERLINK(\"x\")");
  assertEquals(celda("hola"), "hola");
});
