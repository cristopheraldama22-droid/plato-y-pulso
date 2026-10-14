// Función "ia" de Supabase (Edge Function, Deno).
// Variables necesarias (Supabase las da solas salvo la clave de Anthropic):
//   ANTHROPIC_API_KEY          clave de console.anthropic.com  (secreto)
//   SUPABASE_URL y la clave de servidor (automáticas): SUPABASE_SERVICE_ROLE_KEY en
//   proyectos con claves "legacy", o SUPABASE_SECRET_KEYS en proyectos con las claves nuevas.
// Opcionales:
//   ORIGENES_PERMITIDOS   "https://app.tudominio.com,https://tudominio.com"
//   MODELO_RAPIDO, MODELO_RECETAS, PRECIOS_JSON, MAX_LLAMADAS_5MIN
//   CLAVE_SERVIDOR        clave secreta (sb_secret_...) si ninguna de las automáticas está
import { createClient } from "npm:@supabase/supabase-js@2.117.2";
import { CONFIG_BASE, Config } from "./logica.ts";
import { manejar } from "./manejador.ts";

const env = (k: string) => Deno.env.get(k) ?? "";
const leerJSON = (k: string) => {
  if (!env(k)) return {};
  try { return JSON.parse(env(k)); } catch { console.error(`ia: ${k} no es un JSON válido; se ignora`); return {}; }
};

function claveServidor(): string {
  if (env("SUPABASE_SERVICE_ROLE_KEY")) return env("SUPABASE_SERVICE_ROLE_KEY");
  const claves = leerJSON("SUPABASE_SECRET_KEYS") as Record<string, string>;
  return claves.default || Object.values(claves)[0] || env("CLAVE_SERVIDOR");
}
const admin = createClient(env("SUPABASE_URL"), claveServidor(), { auth: { persistSession: false } });

const config: Config = {
  modeloRapido: env("MODELO_RAPIDO") || CONFIG_BASE.modeloRapido,
  modeloRecetas: env("MODELO_RECETAS") || CONFIG_BASE.modeloRecetas,
  precios: { ...CONFIG_BASE.precios, ...leerJSON("PRECIOS_JSON") },
};

Deno.serve((req) => manejar(req, {
  config,
  origenes: env("ORIGENES_PERMITIDOS").split(",").map((s) => s.trim()).filter(Boolean),
  maxLlamadas: Number(env("MAX_LLAMADAS_5MIN")) || 40,

  async usuario(jwt) {
    const { data, error } = await admin.auth.getUser(jwt);
    return error ? null : data.user?.id ?? null;
  },
  async miembro(espacio, user) {
    const { data, error } = await admin.from("miembros").select("rol").eq("espacio_id", espacio).eq("user_id", user).eq("activo", true).maybeSingle();
    if (error) throw error;
    return data;
  },
  async estado(espacio) {
    const { data: s, error } = await admin.from("espacios").select("estado, plan_vence, planes(ia_tope_usd, ia_foto)").eq("id", espacio).maybeSingle();
    if (error) throw error;
    if (!s) return null;
    const inicioMes = new Date(); inicioMes.setUTCDate(1); inicioMes.setUTCHours(0, 0, 0, 0);
    const { data: usos, error: e2 } = await admin.from("uso_ia").select("costo_usd").eq("espacio_id", espacio).gte("creado_en", inicioMes.toISOString());
    if (e2) throw e2;
    const gastado = (usos ?? []).reduce((a, u) => a + Number(u.costo_usd || 0), 0);
    // deno-lint-ignore no-explicit-any
    const plan = (s as any).planes ?? {};
    const vencido = !!s.plan_vence && s.plan_vence < new Date().toISOString().slice(0, 10);
    return { gastado, tope: Number(plan.ia_tope_usd ?? 0), foto: !!plan.ia_foto, activo: s.estado === "activo" && !vencido };
  },
  async llamadasRecientes(user, segundos) {
    const desde = new Date(Date.now() - segundos * 1000).toISOString();
    const { count, error } = await admin.from("uso_ia").select("id", { count: "exact", head: true }).eq("user_id", user).gte("creado_en", desde);
    if (error || count === null) throw error ?? new Error("sin conteo");
    return count;
  },
  async reservar(fila) {
    const { data, error } = await admin.from("uso_ia").insert(fila).select("id").single();
    if (error) throw error;
    return data.id;
  },
  async cerrar(id, cambios) {
    // Si falla, la fila queda con el costo máximo reservado: se cobra de más, nunca de menos.
    const { error } = await admin.from("uso_ia").update(cambios).eq("id", id);
    if (error) console.error("ia: no se pudo cerrar el registro de uso", id, error);
  },
  async claude(pedido) {
    const r = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "x-api-key": env("ANTHROPIC_API_KEY"), "anthropic-version": "2023-06-01", "content-type": "application/json" },
      body: JSON.stringify(pedido),
    });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) console.error("ia: Anthropic respondió", r.status, j?.error?.message ?? "");
    const texto = Array.isArray(j.content) ? j.content.filter((c: { type: string }) => c.type === "text").map((c: { text: string }) => c.text).join("") : "";
    return { status: r.status, texto, entrada: j.usage?.input_tokens ?? 0, salida: j.usage?.output_tokens ?? 0 };
  },
}));
