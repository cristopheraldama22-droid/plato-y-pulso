# Modelo de negocio: Plato y Pulso como servicio

Precios de proveedores consultados el 13 de octubre de 2026. Los precios de venta son sugerencias para validar con clientes reales.

## Qué se vende

Una app web instalable de **alimentación, entrenamiento y hábitos con IA**, con la marca del cliente (su nombre y su color), para:

1. **Gimnasios y entrenadores.** Encaja como módulo de nutrición para la app con marca que ya ofrecés. El profesional ve la constancia y el progreso de sus socios.
2. **Nutricionistas.** Cada paciente anota con foto y estimaciones, y la profesional ve todo en un solo lugar.
3. **Hogares y personas.** Suscripción directa, como el piloto de ustedes.

La base técnica ya está preparada para los tres: espacios con dueño, profesionales y miembros; privacidad por persona; topes de IA por plan, y registro del costo de cada consulta.

## Costos reales

**Costo por consulta a la IA** (precios oficiales de Anthropic por millón de tokens: Haiku 5.5 US$ 0,10 de entrada y 0,50 de salida; Sonnet 5.5 US$ 2 y 10):

| Acción | Modelo | Costo aprox. por vez |
|---|---|---|
| Estimar una comida escrita | Haiku | US$ 0,0001 |
| Estimar desde una foto | Haiku | US$ 0,0003 |
| Generar 5 recetas | Haiku | US$ 0,0015 |
| Armar la compra de la semana | Haiku | US$ 0,001 |

**Uso típico por persona activa al mes** (unas 150 comidas, 30 fotos, 8 tandas de recetas y 4 compras): **unos US$ 0,04**. Todas las tareas usan Haiku 5.5, el modelo más barato. Si se pasaran las recetas a Sonnet (más calidad), subiría a unos US$ 0,27.

**Infraestructura**

| | Piloto | Con clientes que pagan |
|---|---|---|
| Supabase | Gratis | Pro, desde US$ 25 por mes (sirve para muchos clientes a la vez) |
| Cloudflare Pages | Gratis | Gratis |
| Resend (mails) | Gratis hasta 3.000 por mes | US$ 20 por mes desde 50.000 |
| Dominio | El que ya tenés | El mismo |

## Planes sugeridos (ya cargados en la base de datos, editables)

| Plan | Personas | Tope de IA por mes | Precio sugerido | Margen típico | Margen si se usa todo el tope |
|---|---|---|---|---|---|
| Hogar | hasta 4 | US$ 1 | US$ 4 por mes | ~87 % (2 personas) | 75 % |
| Profesional (entrenador o nutricionista) | hasta 40 | US$ 8 | US$ 19 por mes | ~74 % (20 activos) | 58 % |
| Gimnasio | hasta 300 | US$ 40 | US$ 59 por mes, o un adicional sobre tu app de gimnasio | ~62 % (90 activos) | 32 % |

Los márgenes no incluyen la infraestructura, que se reparte entre todos los clientes.

- El **tope de IA** es la garantía de margen: si un cliente usa más, la app pasa sola a la tabla base hasta el mes siguiente. Nunca podés perder plata por uso.
- **Punto de equilibrio con Supabase Pro:** 2 clientes profesionales o 7 hogares.
- Sobre tu oferta de gimnasios (unos $3.000 por mes): este módulo puede ser un **plan superior** o un **adicional**. Por ejemplo, "con nutrición e IA" por un recargo fijo, sin cobrar por socio, siguiendo tu decisión de mantener precios simples.

## Cómo cobrar

- **Al principio, a mano:** factura mensual y, si no paga, el espacio pasa a `suspendido` desde el panel. Es lo mismo que ya planteás para el estado de cuota en la app de gimnasios.
- **Después, automático:** un procesador de pagos con suscripciones que opere en Uruguay (por ejemplo Mercado Pago o dLocal Go; hay que verificar condiciones y comisiones). Lo integramos con Claude Code para que el plan se active o se suspenda solo.

## Antes de vender: temas legales

- La app guarda **datos de salud** (peso, alimentación). En Uruguay, la Ley 18.331 de protección de datos personales trata los datos de salud como **datos sensibles**. Antes del primer cliente conviene:
  - Términos y condiciones, y política de privacidad (quién es responsable de los datos, para qué se usan y cómo pedir que se borren).
  - Consentimiento explícito al registrarse.
  - Consultar con un profesional sobre el registro de la base de datos ante la Unidad Reguladora y de Control de Datos Personales (URCDP).
- La app ya aclara en todas las pantallas que los valores son **orientativos** y no son consejo médico. Para nutricionistas, que el criterio profesional quede siempre de su lado.

## Próximos pasos sugeridos (en Claude Code)

1. **Piloto:** 1 o 2 semanas de uso real con Clara.
2. **Refactor:** partir `web/app.js` en módulos y sumar pruebas de pantalla automáticas.
3. **Panel del profesional:** lista de socios o pacientes con constancia semanal, alertas de quién dejó de anotar y notas del profesional.
4. **Notificaciones push reales** (recordatorios desde el servidor).
5. **Cobro automático** y página de venta en tu dominio.
6. **Legal:** términos, privacidad y consentimiento.
