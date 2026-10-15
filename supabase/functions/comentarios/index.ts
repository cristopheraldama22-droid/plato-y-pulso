// Función "comentarios" de Supabase (Edge Function, Deno).
// Variables:
//   SUPABASE_URL y la clave de servidor (automáticas, igual que en la función "ia")
//   ORIGENES_PERMITIDOS            mismo valor que en "ia"
//   PLANILLA_URL, PLANILLA_TOKEN   web app de Google Apps Script y su clave (opcionales:
//                                  sin ellas los comentarios solo quedan en la base)
import { createClient } from "npm:@supabase/supabase-js@2.117.2";
import { manejar } from "./manejador.ts";

const env = (k: string) => Deno.env.get(k) ?? "";
function claveServidor(): string {
  if (env("SUPABASE_SERVICE_ROLE_KEY")) return env("SUPABASE_SERVICE_ROLE_KEY");
  try { const c = JSON.parse(env("SUPABASE_SECRET_KEYS") || "{}"); return c.default || Object.values(c)[0] as string || env("CLAVE_SERVIDOR"); }
  catch { return env("CLAVE_SERVIDOR"); }
}
const admin = createClient(env("SUPABASE_URL"), claveServidor(), { auth: { persistSession: false } });

Deno.serve((req) => manejar(req, {
  origenes: env("ORIGENES_PERMITIDOS").split(",").map((s) => s.trim()).filter(Boolean),

  async usuario(jwt) {
    const { data, error } = await admin.auth.getUser(jwt);
    return error || !data.user ? null : { id: data.user.id, email: data.user.email ?? "" };
  },
  async esMiembro(espacio, user) {
    const { data, error } = await admin.from("miembros").select("espacio_id, espacios(nombre)")
      .eq("espacio_id", espacio).eq("user_id", user).eq("activo", true).maybeSingle();
    if (error) throw error;
    // deno-lint-ignore no-explicit-any
    return data ? { espacio: data.espacio_id, nombre: (data as any).espacios?.nombre ?? "" } : null;
  },
  async recientes(user, segundos) {
    const desde = new Date(Date.now() - segundos * 1000).toISOString();
    const { count, error } = await admin.from("comentarios").select("id", { count: "exact", head: true })
      .eq("user_id", user).gte("creado_en", desde);
    if (error || count === null) throw error ?? new Error("sin conteo");
    return count;
  },
  async guardar(c) {
    const { error } = await admin.from("comentarios").insert(c);
    if (error) throw error;
  },
  planilla: env("PLANILLA_URL") ? async (fila) => {
    const r = await fetch(env("PLANILLA_URL"), {
      method: "POST", headers: { "content-type": "text/plain;charset=utf-8" },
      body: JSON.stringify({ token: env("PLANILLA_TOKEN"), ...fila }),
    });
    const t = await r.text();
    if (!r.ok || !t.includes("ok")) throw new Error(`planilla respondió ${r.status}: ${t.slice(0, 80)}`);
  } : undefined,
}));
