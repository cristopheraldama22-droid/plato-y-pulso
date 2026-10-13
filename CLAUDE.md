# Plato y Pulso: contexto para Claude Code

App web instalable (PWA) de alimentación, entrenamiento y hábitos con IA. Hoy es un piloto para Cristopher y Clara (su esposa); el objetivo es venderla como servicio a hogares, gimnasios, entrenadores y nutricionistas, con marca propia de cada cliente. Cristopher también vende apps con marca para gimnasios y entrenadores de running: este proyecto puede ser un módulo de esa oferta.

## Cómo trabajar acá

- Idioma de la app, los textos y los comentarios: **español rioplatense (Uruguay)**, con tono cercano, sin sermones.
- **Pensar siempre en la monetización:** planes, topes, costos por cliente y lo que se pueda facturar. Cualquier función nueva que use IA tiene que pasar por la función del servidor y quedar registrada en `uso_ia`.
- Valores nutricionales siempre aproximados (con "~") y corregibles. Nada de consejos médicos.
- Al terminar un cambio, correr las pruebas que correspondan (ver abajo) y contar qué se probó.

## Estructura

- `web/`: la app, archivos estáticos sin build. `app.js` tiene las pantallas y la lógica (es grande; partirlo en módulos es tarea pendiente), `backend.js` es la capa de datos (Supabase o demo) y `config.js` tiene la URL y la clave pública.
- `supabase/migrations/`: esquema y seguridad por filas (RLS).
- `supabase/functions/ia/`: función del servidor que llama a Claude. `logica.ts` es puro y probado, `manejador.ts` controla permisos, topes y registro, `index.ts` hace la conexión.
- `docs/GUIA.md` explica cómo publicar; `docs/NEGOCIO.md`, costos y planes.

## Reglas que no se rompen

1. **Nunca editar una migración ya aplicada.** Los cambios de base de datos van en un archivo nuevo en `supabase/migrations/` que solo agrega.
2. **Nunca poner claves secretas en el código ni en el chat.** `ANTHROPIC_API_KEY` y la service_role key van como secretos de Supabase (`npx supabase secrets set ...`). En `web/config.js` solo va la clave **anon** (pública).
3. **Al cambiar algo de `web/`, subir `VERSION` en `web/sw.js`** para que los celulares tomen la versión nueva.
4. La app nunca llama a Anthropic directo: siempre por `functions/v1/ia`, con tareas cerradas (no hay chat libre).
5. Los datos son documentos JSON por persona y mes (`docs`). Para cambiar su forma, mantener compatibilidad con los datos existentes y con los respaldos (`importarRespaldo` en `app.js`).

## Pruebas

```bash
sh tests/db/run.sh                       # seguridad de la base (Postgres local en el puerto 5499)
deno test tests/ia                       # función de IA con Claude simulado
python3 tests/web/flujo_demo.py /tmp     # recorrido completo en Chromium (modo demo)
```

Modo demo, sin servidor: abrir `web/` con `?demo` (por ejemplo `python3 -m http.server -d web` y entrar a `http://localhost:8000/?demo`).

## Pendientes conocidos

- Partir `web/app.js` en módulos y sumar pruebas de pantalla para el modo nube (hoy solo se prueba el modo demo).
- Con marca propia, el color elegido pisa el acento también en modo oscuro; revisar el contraste.
- Panel del profesional (constancia de cada socio o paciente, alertas, notas).
- Notificaciones push reales, cobro automático, términos y política de privacidad (datos de salud, Ley 18.331).
