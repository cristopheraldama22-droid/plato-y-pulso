/* Configuración de la app. La dirección y la clave pública de Supabase están en
   Supabase › Project Settings › API. La clave "anon" es pública por diseño: la
   seguridad la dan las reglas de la base de datos, no esta clave.
   Para probar sin servidor: demo: true (o abrir la app con ?demo). */
window.PP_CONFIG = {
  supabaseUrl: "",       // ej: "https://abcdxyz.supabase.co"
  supabaseAnonKey: "",   // ej: "eyJhbGciOi..."
  demo: false
};
