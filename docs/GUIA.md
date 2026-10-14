# Guía para publicar Plato y Pulso en tu dominio

Tiempo estimado: 1 a 2 horas la primera vez. Todo se hace una sola vez; después, publicar una versión nueva lleva un minuto.

**Cómo queda armado**

| Pieza | Servicio | Costo para el piloto |
|---|---|---|
| La app (lo que se ve) | Cloudflare Pages, en tu dominio | Gratis |
| Base de datos, inicio de sesión y función de IA | Supabase | Gratis (ver límites abajo) |
| IA (estimaciones, fotos, recetas) | API de Anthropic | Por consumo: centavos por mes por hogar |
| Mails con el código para entrar | Resend (u otro SMTP) | Gratis hasta 3.000 mails por mes |

> **Las actualizaciones no borran datos.** La app vive en Cloudflare y los datos en Supabase. Publicar una versión nueva solo reemplaza el código. Cada versión publicada queda guardada en Cloudflare y se puede volver a una anterior con un clic.

---

## 1. Supabase: base de datos y usuarios

1. Entrá a <https://supabase.com>, creá una cuenta y un proyecto nuevo.
   - **Región:** elegí la región específica **South America (São Paulo)**, `sa-east-1`. La opción general "América" cae en EE. UU. y la región no se cambia después.
   - Guardá en un lugar seguro la contraseña de la base de datos.
   - Dejá marcados **Habilitar Data API** y **Exponer automáticamente nuevas tablas** (las migraciones cuentan con eso) y marcá **Activar RLS automático**.
2. Aplicá **todas** las migraciones de `supabase/migrations/`, en orden y **por una sola vía** (si se aplica dos veces, falla):
   - Con la terminal (recomendado): `npx supabase link --project-ref TU_REF` y `npx supabase db push`.
   - O a mano: en **SQL Editor** pegá cada archivo, en orden, y tocá **Run**. Después no uses `db push` sin antes marcar esas migraciones como aplicadas (`npx supabase migration repair --status applied <número>`).
3. Abrí **Project Settings › API Keys** (o el botón **Connect**) y anotá:
   - **Project URL** (ej. `https://abcd1234.supabase.co`).
   - La clave pública: **publishable** (`sb_publishable_...`) en proyectos nuevos, o **anon** (`eyJ...`) en los viejos. Es pública por diseño: la seguridad la dan las reglas de la base de datos.
   - La clave **secret** / **service_role** **no** se comparte ni se pone en la app. Supabase la carga sola en la función.

> Los espacios nuevos nacen en el plan **Prueba (sin IA)**. Para darle IA a uno, cambiale `plan_id` en **Table Editor › espacios** (ver *Administración*).

### Inicio de sesión con código por mail

4. **Authentication › Sign In / Providers › Email**: dejá activado Email y **desactivá "Confirm email"** (el código ya confirma el mail; si queda activo, a la gente nueva le puede llegar un link en vez del código). Por las dudas, poné `{{ .Token }}` también en la plantilla **Confirm signup**.
5. **Authentication › Email Templates › Magic Link**: reemplazá el contenido por algo así (lo importante es `{{ .Token }}`):

   ```html
   <h2>Tu código para entrar a Plato y Pulso</h2>
   <p style="font-size:28px;letter-spacing:4px"><b>{{ .Token }}</b></p>
   <p>Vence en una hora. Si no lo pediste, ignorá este mail.</p>
   ```
   Asunto sugerido: `Tu código para entrar`.
6. **Authentication › URL Configuration**: en **Site URL** poné la dirección final de la app (ej. `https://app.tudominio.com`) y en **Redirect URLs** agregá `https://app.tudominio.com/` y `https://app.tudominio.com/**`.

### Mails de verdad (obligatorio)

El servicio de mail que trae Supabase **solo le manda a las personas del equipo del proyecto y como máximo 2 mails por hora**. Para que Clara (y después los clientes) reciban el código, hay que conectar un servicio propio:

7. Creá una cuenta en <https://resend.com> (plan gratis: 3.000 mails por mes, 100 por día).
8. En Resend, **Domains › Add domain** con un **subdominio de envío** (ej. `mail.tudominio.com`): así no se tocan los registros de mail del dominio principal. Si el dominio está en Cloudflare, el botón **Sign in to Cloudflare** carga los registros solo; si no, cargalos a mano (MX y TXT, en Cloudflare siempre "DNS only"). Esperá a que diga **Verified**.
9. Creá una **API key** en Resend con permiso "Sending access" para ese dominio.
10. En Supabase, **Authentication › Email (Notifications) › SMTP Settings**: activá **Custom SMTP** con:
    - Host `smtp.resend.com`, puerto `465`, usuario `resend`, contraseña: la API key de Resend.
    - Remitente: `no-responder@mail.tudominio.com`, nombre: `Plato y Pulso`.
11. **Authentication › Rate Limits**: al activar SMTP propio el límite baja a 30 mails por hora; subilo a 60–100 (el plan gratis de Resend corta en 100 por día).

---

## 2. Anthropic: la IA

1. Entrá a <https://console.anthropic.com>, creá una cuenta y cargá crédito (es prepago).
2. En **Limits**, poné un tope de gasto mensual bajo para el piloto (por ejemplo, US$ 10). Es una segunda red de seguridad además de los topes por plan de la app.
3. Creá una **API key** y guardala: se muestra una sola vez.

## 3. Publicar la función de IA en Supabase

Desde una computadora con Node instalado (o pedíselo a Claude Code en la carpeta del proyecto):

```bash
npx supabase login
npx supabase link --project-ref TU_REF          # el código que aparece en la URL del proyecto
npx supabase secrets set ANTHROPIC_API_KEY=sk-ant-...
npx supabase secrets set ORIGENES_PERMITIDOS=https://app.tudominio.com
npx supabase functions deploy ia --no-verify-jwt
```

- `--no-verify-jwt` hace falta con las claves nuevas de Supabase (`sb_publishable_...`). Es seguro: la función valida la sesión de cada pedido por su cuenta.
- `ORIGENES_PERMITIDOS` hace que la función solo responda a tu app (exacto, sin barra final). Si lo dejás vacío, responde a cualquier página, aunque igual exige una sesión válida.
- No cargues secretos que empiecen con `SUPABASE_`: esos los pone Supabase.
- Opcionales: `MODELO_RAPIDO` (por defecto `claude-haiku-5-5`), `MODELO_RECETAS` (por defecto `claude-sonnet-5-5`) y `MAX_LLAMADAS_5MIN` (por defecto 40 por persona).

## 4. La app en tu dominio (Cloudflare Pages)

1. Completá `web/config.js` con la **Project URL** y la clave pública del paso 1.
2. Creá una cuenta en <https://dash.cloudflare.com> › **Workers & Pages › Create application**.
   - Si Cloudflare lo crea como **Worker** conectado a GitHub (lo que pasa hoy por defecto), está bien: `wrangler.jsonc` en la raíz del repo hace que publique solo `web/`. El comando de implementación tiene que ser `npx wrangler deploy` y el dominio se agrega en la pestaña **Dominios** › **Dominio personalizado**.
   - Si preferís **Pages**, elegí esa pestaña y seguí el paso 3.
3. Elegí una de dos formas (no se puede cambiar de una a otra después):
   - **Subir la carpeta** (lo más simple): **Upload assets**, ponele nombre al proyecto y arrastrá la carpeta `web`.
   - **Conectar GitHub** (recomendado si vas a seguir con Claude Code): **Connect to Git**, elegí el repositorio, preset **None**, comando de build vacío y carpeta de salida `web`. Cada cambio que se sube a GitHub se publica solo.
4. En el proyecto de Pages: **Custom domains › Set up a custom domain** › `app.tudominio.com`. Si el dominio está en Cloudflare, el registro se crea solo: **no lo crees a mano antes**. Si no está en Cloudflare, te indica un **CNAME** para cargar en tu proveedor.
5. Abrí `https://app.tudominio.com`. Tiene que aparecer la pantalla para entrar con tu mail.

## 5. Primer uso

1. Entrá con tu mail, poné el código y creá el espacio **Hogar** con tu nombre.
2. **Ajustes ⚙ › Invitar personas**: copiá el link y mandáselo a Clara. Ella entra con su mail, pone su nombre y queda en el hogar.
3. **Traer los datos del artefacto:** en el artefacto de Claude tocá Ajustes › **Descargar respaldo**. En la app nueva, **Ajustes › Importar un respaldo**, elegí ese archivo y asigná cada perfil a la persona que corresponde. La importación suma: no borra nada y no duplica si la repetís.
4. **Instalarla en el celular:**
   - **Android (Chrome):** menú ⋮ › **Instalar app**.
   - **iPhone (Safari):** botón Compartir › **Agregar a pantalla de inicio**.

---

## Administración (vos, como dueño del servicio)

En Supabase › **Table Editor**:

- **`espacios`**: cambiá `plan_id` (`prueba`, `piloto`, `hogar`, `profesional`, `gimnasio`), `plan_vence` o `estado` (`activo` o `suspendido`). Todo espacio nuevo nace en `prueba` (sin IA): pasalo a otro plan para activarle la IA. Un espacio suspendido, o con `plan_vence` pasado, no puede usar IA; suspendido tampoco puede cargar ni borrar datos, pero sí verlos. Sirve para cuando no paga.
- **`planes`**: cantidad máxima de personas, tope de gasto de IA por mes, si incluye fotos y precio de referencia.
- **`admin_resumen`** (vista): por espacio, cuántas personas activas tiene, cuánto gastó en IA este mes y la última actividad. Es tu tablero para facturar.
- **`uso_ia`**: cada consulta a la IA, con sus tokens y su costo exacto.

## Cómo publicar cambios sin perder nada

- **Cambios en la app** (`web/`): subí la carpeta de nuevo en Cloudflare o, con GitHub, subí los cambios. Antes, cambiá el número de `VERSION` en `web/sw.js` para que los celulares tomen la versión nueva al abrir.
- **Cambios en la base de datos:** nunca edites la migración ya aplicada. Creá un archivo nuevo en `supabase/migrations/` que solo **agregue** (columnas, tablas, políticas) y aplicalo con `npx supabase db push`. Antes, descargá un respaldo desde Supabase (**Database › Backups**, o `npx supabase db dump`).
- **Cambios en la función de IA:** `npx supabase functions deploy ia`.

## Límites del plan gratis de Supabase (a tener en cuenta)

- 500 MB de base de datos y 2 proyectos activos.
- **El proyecto se pausa después de 1 semana sin actividad.** Con uso diario no pasa; si se pausa, se reactiva desde el panel.
- Para clientes que pagan, conviene el plan Pro (desde US$ 25 por mes): no se pausa y tiene respaldos diarios.
