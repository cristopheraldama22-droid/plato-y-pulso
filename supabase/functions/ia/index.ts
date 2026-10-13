// Función "ia" de Supabase (Edge Function, Deno).
// Variables necesarias (Supabase las da solas salvo la clave de Anthropic):
//   ANTHROPIC_API_KEY          clave de console.anthropic.com  (secreto)
//   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY   (automáticas)
// Opcionales:
//   ORIGENES_PERMITIDOS   "https://app.tudominio.com,https://tudominio.com"
//   MODELO_RAPIDO, MODELO_RECETAS, PRECIOS_JSON, MAX_LLAMADAS_5MIN
import { createClient } from "npm:@supabase/supabase-js@2.117.2";
import { CONFIG_BASE, Config } from "./logica.ts";
import { manejar } from "./manejador.ts";

const env = (k: string) => Deno.env.get(k) ?? "";
const admin = createClient(env("SUPABASE_URL"), env("SUPABASE_SERVICE_ROLE_KEY"), { auth: { persistSession: false } });

const config: Config = {
  modeloRapido: env("MODELO_RAPIDO") || CONFIG_BASE.modeloRapido,
  modeloRecetas: env("MODELO_RECETAS") || CONFIG_BASE.modeloRecetas,
  precios: { ...CONFIG_BASE.precios, ...(env("PRECIOS_JSON") ? JSON.parse(env("PRECIOS_JSON")) : {}) },
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
    const { data } = await admin.from("miembros").select("rol").eq("espacio_id", espacio).eq("user_id", user).eq("activo", true).maybeSingle();
    return data;
  },
  async estado(espacio) {
    const { data: s } = await admin.from("espacios").select("estado, planes(ia_tope_usd, ia_foto)").eq("id", espacio).maybeSingle();
    if (!s) return null;
    const inicioMes = new Date(); inicioMes.setUTCDate(1); inicioMes.setUTCHours(0, 0, 0, 0);
    const { data: usos } = await admin.from("uso_ia").select("costo_usd").eq("espacio_id", espacio).gte("creado_en", inicioMes.toISOString());
    const gastado = (usos ?? []).reduce((a, u) => a + Number(u.costo_usd || 0), 0);
    // deno-lint-ignore no-explicit-any
    const plan = (s as any).planes ?? {};
    return { gastado, tope: Number(plan.ia_tope_usd ?? 0), foto: !!plan.ia_foto, activo: s.estado === "activo" };
  },
  async llamadasRecientes(user, segundos) {
    const desde = new Date(Date.now() - segundos * 1000).toISOString();
    const { count } = await admin.from("uso_ia").select("id", { count: "exact", head: true }).eq("user_id", user).gte("creado_en", desde);
    return count ?? 0;
  },
  async registrar(fila) {
    await admin.from("uso_ia").insert(fila);
  },
  async claude(pedido) {
    const r = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "x-api-key": env("ANTHROPIC_API_KEY"), "anthropic-version": "2023-06-01", "content-type": "application/json" },
      body: JSON.stringify(pedido),
    });
    const j = await r.json().catch(() => ({}));
    const texto = Array.isArray(j.content) ? j.content.filter((c: { type: string }) => c.type === "text").map((c: { text: string }) => c.text).join("") : "";
    return { status: r.status, texto, entrada: j.usage?.input_tokens ?? 0, salida: j.usage?.output_tokens ?? 0 };
  },
}));
