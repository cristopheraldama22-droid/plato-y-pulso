// Recibe un comentario de la app, lo guarda y lo reenvía a la planilla de Google.
// Las dependencias se inyectan para poder probarlo (tests/comentarios).

export interface Comentario {
  user_id: string; espacio_id: string | null; tipo: "idea" | "problema" | "otro";
  texto: string; pantalla: string; dispositivo: string; version: string;
}
export interface Deps {
  usuario(jwt: string): Promise<{ id: string; email: string } | null>;
  esMiembro(espacio: string, user: string): Promise<{ espacio: string; nombre: string } | null>;
  recientes(user: string, segundos: number): Promise<number>;
  guardar(c: Comentario): Promise<void>;
  // Reenvío a la planilla: si falla, el comentario igual quedó guardado en la base.
  planilla?(fila: Record<string, string>): Promise<void>;
  origenes?: string[];
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const limpiar = (v: unknown, max: number) =>
  String(v ?? "").replace(/[\u0000-\u0008\u000b-\u001f\u007f]+/g, " ").trim().slice(0, max);
// Una celda que empieza con = + - @ la planilla la tomaría como fórmula
export const celda = (s: string) => (/^[=+\-@\t]/.test(s) ? "'" + s : s);

export async function manejar(req: Request, deps: Deps): Promise<Response> {
  const origen = req.headers.get("origin") ?? "";
  const permitido = !deps.origenes?.length || deps.origenes.includes(origen);
  const cors: Record<string, string> = {
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Vary": "Origin",
  };
  if (permitido) cors["Access-Control-Allow-Origin"] = origen || "*";
  const responder = (status: number, cuerpo: unknown) =>
    new Response(JSON.stringify(cuerpo), { status, headers: { ...cors, "Content-Type": "application/json" } });

  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return responder(405, { error: "metodo" });
  if (!permitido) return responder(403, { error: "origen_no_permitido" });

  try {
    const jwt = (req.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "");
    const u = jwt ? await deps.usuario(jwt) : null;
    if (!u) return responder(401, { error: "sin_sesion", mensaje: "Volvé a iniciar sesión." });

    let b: Record<string, unknown>;
    try { b = await req.json(); } catch { return responder(400, { error: "json_invalido" }); }
    const texto = limpiar(b.texto, 2000);
    if (!texto) return responder(400, { error: "sin_texto", mensaje: "Escribí tu comentario." });
    const tipo = (["idea", "problema", "otro"].includes(String(b.tipo)) ? String(b.tipo) : "otro") as Comentario["tipo"];
    const espacioPedido = String(b.espacio_id ?? "");
    const esp = UUID.test(espacioPedido) ? await deps.esMiembro(espacioPedido, u.id) : null;

    if (await deps.recientes(u.id, 3600) >= 10)
      return responder(429, { error: "muchos_comentarios", mensaje: "Mandaste muchos comentarios seguidos. Probá en un rato." });

    const c: Comentario = {
      user_id: u.id, espacio_id: esp ? esp.espacio : null, tipo, texto,
      pantalla: limpiar(b.pantalla, 40), dispositivo: limpiar(b.dispositivo, 80), version: limpiar(b.version, 40),
    };
    await deps.guardar(c);
    if (deps.planilla) {
      try {
        await deps.planilla({
          fecha: new Date().toISOString(), tipo, texto: celda(texto), email: u.email,
          espacio: celda(esp ? esp.nombre : ""), pantalla: celda(c.pantalla), dispositivo: celda(c.dispositivo), version: celda(c.version),
        });
      } catch (e) { console.error("comentarios: no se pudo copiar a la planilla", e); }
    }
    return responder(200, { ok: true });
  } catch (e) {
    console.error("comentarios: error inesperado", e);
    return responder(500, { error: "error_interno", mensaje: "No se pudo enviar. Probá de nuevo en un rato." });
  }
}
