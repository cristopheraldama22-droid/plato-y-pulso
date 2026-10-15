// Recibe el pedido de la app, controla permisos y topes del plan, llama a
// Claude y registra el costo. Las dependencias se inyectan para poder probarlo.
import { armarPedido, Config, CONFIG_BASE, costoMaximo, costoUSD, ErrorPedido, extraerJSON, interpretar, Tarea, TAREAS, thinkingPara } from "./logica.ts";

export interface FilaUso { espacio_id: string; user_id: string; tarea: string; modelo: string; tokens_entrada: number; tokens_salida: number; costo_usd: number; ok: boolean }

export interface Deps {
  usuario(jwt: string): Promise<string | null>;
  miembro(espacio: string, user: string): Promise<{ rol: string } | null>;
  // Si la base falla, estas lecturas tiran error: ante la duda no se llama a la IA.
  estado(espacio: string): Promise<{ gastado: number; tope: number; foto: boolean; activo: boolean; vencido?: boolean } | null>;
  llamadasRecientes(user: string, segundos: number): Promise<number>;
  // Antes de llamar a Claude se reserva una fila con el costo máximo; al terminar se cierra con el costo real.
  reservar(fila: FilaUso): Promise<string | number>;
  cerrar(id: string | number, cambios: Pick<FilaUso, "tokens_entrada" | "tokens_salida" | "costo_usd" | "ok">): Promise<void>;
  claude(pedido: { model: string; max_tokens: number; messages: unknown[]; thinking?: Record<string, string> }): Promise<{ status: number; texto: string; entrada: number; salida: number }>;
  config?: Config;
  origenes?: string[];   // dominios permitidos; vacío = cualquiera
  maxLlamadas?: number;  // por usuario cada 5 minutos
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

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
    return await atender(req, deps, responder);
  } catch (e) {
    console.error("ia: error inesperado", e);
    return responder(500, { error: "error_interno", mensaje: "Algo falló en el servidor. Probá de nuevo en un rato." });
  }
}

async function atender(req: Request, deps: Deps, responder: (status: number, cuerpo: unknown) => Response): Promise<Response> {
  const jwt = (req.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "");
  const user = jwt ? await deps.usuario(jwt) : null;
  if (!user) return responder(401, { error: "sin_sesion", mensaje: "Volvé a iniciar sesión." });

  let cuerpo: Record<string, unknown>;
  try { cuerpo = await req.json(); } catch { return responder(400, { error: "json_invalido" }); }
  const espacio = String(cuerpo.espacio_id ?? "");
  const tarea = String(cuerpo.tarea ?? "") as Tarea;
  if (!UUID.test(espacio) || !TAREAS.includes(tarea)) return responder(400, { error: "datos_invalidos" });

  const m = await deps.miembro(espacio, user);
  if (!m) return responder(403, { error: "sin_permiso" });
  const est = await deps.estado(espacio);
  if (!est || !est.activo) return responder(403, { error: "espacio_suspendido", mensaje: "El espacio está suspendido." });
  if (est.vencido) return responder(402, { error: "plan_vencido", mensaje: "Terminó tu período con IA. La app sigue funcionando: las estimaciones salen de la tabla." });
  if ((tarea === "foto" || tarea === "ticket") && !est.foto) return responder(403, { error: "plan_sin_foto", mensaje: "Tu plan no incluye estimar desde fotos." });
  if (est.gastado >= est.tope) return responder(402, { error: "tope_plan", mensaje: est.tope > 0 ? "Se usó todo el cupo de IA del plan este mes." : "Tu plan no incluye IA.", gastado: est.gastado, tope: est.tope });
  const recientes = await deps.llamadasRecientes(user, 300);
  if (recientes >= (deps.maxLlamadas ?? 40)) return responder(429, { error: "muchas_llamadas", mensaje: "Muchas consultas seguidas. Esperá unos minutos." });

  const cfg = deps.config ?? CONFIG_BASE;
  let pedido;
  try { pedido = armarPedido(tarea, (cuerpo.datos ?? {}) as Record<string, unknown>, cfg); }
  catch (e) {
    if (e instanceof ErrorPedido) return responder(e.status, { error: e.codigo, mensaje: e.message });
    throw e;
  }

  const reserva = await deps.reservar({ espacio_id: espacio, user_id: user, tarea, modelo: pedido.modelo, tokens_entrada: 0, tokens_salida: 0, costo_usd: costoMaximo(pedido, cfg), ok: false });
  const thinking = thinkingPara(pedido.modelo);
  let r;
  try {
    r = await deps.claude({ model: pedido.modelo, max_tokens: pedido.maxTokens, messages: [{ role: "user", content: pedido.contenido }], ...(thinking ? { thinking } : {}) });
  } catch {
    await deps.cerrar(reserva, { tokens_entrada: 0, tokens_salida: 0, costo_usd: 0, ok: false });
    return responder(503, { error: "ia_no_disponible", mensaje: "No se pudo contactar a la IA. Probá de nuevo." });
  }
  const costo = costoUSD(pedido.modelo, r.entrada, r.salida, cfg);
  const cierre = { tokens_entrada: r.entrada, tokens_salida: r.salida, costo_usd: costo };
  if (r.status !== 200) {
    await deps.cerrar(reserva, { ...cierre, ok: false });
    const ocupado = r.status === 429 || r.status === 529 || r.status >= 500;
    return responder(ocupado ? 503 : 502, { error: ocupado ? "ia_ocupada" : "ia_error", mensaje: ocupado ? "La IA está ocupada. Probá en un rato." : "La IA no pudo responder." });
  }

  let resultado;
  try { resultado = interpretar(tarea, extraerJSON(r.texto)); }
  catch (e) {
    await deps.cerrar(reserva, { ...cierre, ok: false });
    if (e instanceof ErrorPedido) return responder(e.status, { error: e.codigo, mensaje: e.message });
    throw e;
  }
  await deps.cerrar(reserva, { ...cierre, ok: true });
  return responder(200, { ok: true, resultado, costo_usd: costo, gastado_usd: est.gastado + costo, tope_usd: est.tope });
}
