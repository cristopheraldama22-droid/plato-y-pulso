# Plato y Pulso

App web instalable de alimentación, entrenamiento y hábitos, con estimaciones y recetas hechas con IA. Pensada para hogares, gimnasios, entrenadores y nutricionistas, cada uno con su espacio, sus miembros y su marca.

- **Publicarla:** [docs/GUIA.md](docs/GUIA.md)
- **Costos, planes y precios:** [docs/NEGOCIO.md](docs/NEGOCIO.md)

## Estructura

```
web/                      la app (archivos estáticos, sin build)
  index.html, styles.css
  app.js                  pantallas y lógica de la app
  backend.js              capa de datos: Supabase (nube) o demo (navegador)
  config.js               dirección y clave pública de Supabase
  sw.js, manifest.webmanifest, icons/   app instalable y uso sin señal
  vendor/supabase.js      supabase-js 2.117.2 (copia local)
supabase/
  migrations/             esquema de la base de datos y reglas de seguridad
  functions/ia/           función del servidor que habla con Claude
    logica.ts             arma los pedidos, interpreta respuestas, calcula costos
    manejador.ts          permisos, topes del plan, límite de consultas, registro de uso
    index.ts              conexión con Supabase y la API de Anthropic
tests/
  db/                     pruebas de seguridad en un Postgres real
  ia/                     pruebas de la función de IA (Claude simulado)
  web/                    recorrido completo de la app en un navegador (modo demo)
docs/                     guía de publicación y modelo de negocio
```

## Probarla sin servidor

Abrí la app con `?demo` al final (por ejemplo, `python3 -m http.server -d web` y entrá a `http://localhost:8000/?demo`). Los datos quedan solo en ese navegador y no hay IA real: las estimaciones salen de la tabla base. También sirve para mostrársela a un cliente.

## Pruebas

```bash
# Base de datos (necesita Postgres 15+ en el puerto 5499)
sh tests/db/run.sh

# Función de IA
deno test tests/ia

# App completa en Chromium (necesita Playwright)
python3 tests/web/flujo_demo.py /tmp
```

## Decisiones de diseño

- **Datos como documentos JSON por persona y por mes**, con seguridad por filas en Postgres. Es el mismo modelo que el artefacto original, así que la importación es directa y la app casi no cambió. Si más adelante hacen falta reportes complejos, se pueden sumar tablas sin migrar la app.
- **La IA solo se usa desde el servidor**, con tareas cerradas: no hay un chat libre que alguien pueda abusar. La clave de Anthropic nunca llega al celular.
- **Cada consulta queda registrada con su costo** y cada plan tiene un tope mensual: al llegar al tope, la app usa la tabla base hasta el mes siguiente.
- **Funciona sin señal:** la app queda guardada en el celular y los cambios se suben solos cuando vuelve la conexión.
