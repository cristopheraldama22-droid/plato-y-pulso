/* Configuración de la app. La dirección y la clave pública de Supabase están en
   Supabase › Project Settings › API. La clave "anon" es pública por diseño: la
   seguridad la dan las reglas de la base de datos, no esta clave.
   Para probar sin servidor: demo: true (o abrir la app con ?demo). */
window.PP_CONFIG = {
  supabaseUrl: "https://ozciicrxridojhhdtxcq.supabase.co",
  supabaseAnonKey: "sb_publishable_Aby-LM8baNH44ETh5-SdVw_yxeW6t6g",   // clave pública (publishable)
  demo: false,
  turnstileSiteKey: "0x4AAAAAAFX-EHjIUjz540sb"   // clave pública de Cloudflare Turnstile (anti-robots al pedir el código); vacío = apagado
};
