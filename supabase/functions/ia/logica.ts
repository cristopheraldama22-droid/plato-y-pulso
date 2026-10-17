// Lógica pura de la función de IA: arma los pedidos a Claude, interpreta las
// respuestas y calcula el costo. No toca la red ni la base de datos, así se
// puede probar sola (ver tests/ia).

export type Tarea = "estimar" | "estimar_lote" | "foto" | "recetas" | "compra" | "ticket";
export const TAREAS: Tarea[] = ["estimar", "estimar_lote", "foto", "recetas", "compra", "ticket"];

export interface Config {
  modeloRapido: string;   // estimaciones, fotos, lista de compras
  modeloRecetas: string;  // recetas
  precios: Record<string, [number, number]>; // USD por millón de tokens [entrada, salida]
}

export const CONFIG_BASE: Config = {
  modeloRapido: "claude-haiku-5-5",
  modeloRecetas: "claude-haiku-5-5",   // el más barato; con MODELO_RECETAS se puede subir a claude-sonnet-5-5
  // Precios públicos de Anthropic (octubre 2026). Se pueden cambiar con la variable PRECIOS_JSON.
  precios: {
    "claude-haiku-5-5": [0.10, 0.50],
    "claude-sonnet-5-5": [2, 10],
    "claude-opus-5-5": [4, 20],
  },
};

export class ErrorPedido extends Error {
  constructor(public codigo: string, mensaje: string, public status = 400) { super(mensaje); }
}

// ---------- saneamiento de entradas ----------
const limpiar = (v: unknown, max: number): string =>
  String(v ?? "").replace(/[\u0000-\u001f\u007f]+/g, " ").replace(/\s+/g, " ").trim().slice(0, max);
const lista = <T>(v: unknown, max: number): T[] => (Array.isArray(v) ? v.slice(0, max) : []) as T[];
const num = (v: unknown): number | null => {
  const n = typeof v === "number" ? v : parseFloat(String(v ?? "").replace(",", "."));
  return Number.isFinite(n) ? n : null;
};
const q = (s: string) => JSON.stringify(s);

const FILTROS: Record<string, string> = {
  rapida: "Rápidas (30 min o menos)",
  vianda: "Para llevar al trabajo",
  desayuno: "Desayuno o merienda",
  horno: "Al horno",
  unaolla: "Una sola olla o sartén",
  economica: "Económicas",
};
const SLOTS: Record<string, string> = { desayuno: "Desayuno", almuerzo: "Almuerzo", merienda: "Merienda", cena: "Cena", snacks: "Snacks" };
const CATS = ["prot", "ver", "lac", "alm", "otr"];
const RESTRICCIONES: Record<string, string> = {
  sin_tacc: "sin gluten, aptas para celíacos (sin trigo, avena, cebada ni centeno: nada de harina común, pan, pan rallado, fideos ni masas comunes; usar versiones sin TACC certificadas)",
  vegetariano: "vegetarianas (sin carne, pollo, pescado ni mariscos; huevos y lácteos sí)",
  vegano: "veganas (sin ningún producto animal: ni carne, pescado, huevos, lácteos ni miel)",
  sin_lactosa: "sin lactosa (sin leche, manteca, crema ni quesos comunes; se pueden usar versiones deslactosadas)",
};

const FORMATO_EST = `kcal y prot son enteros (prot en gramos). veg = porciones de verdura o fruta que aporta (0 a 3, puede ser .5; una porción ≈ 80 g). ultra = true solo si es mayormente un producto ultraprocesado industrial (galletitas, fiambres, snacks, gaseosas, panificados industriales).`;

export interface Pedido {
  modelo: string;
  maxTokens: number;
  contenido: Array<Record<string, unknown>>;
}

// ---------- armado de pedidos ----------
export function armarPedido(tarea: Tarea, datos: Record<string, unknown>, cfg: Config = CONFIG_BASE): Pedido {
  const texto = (t: string) => [{ type: "text", text: t }];
  switch (tarea) {
    case "estimar": {
      const t = limpiar(datos.texto, 200);
      if (!t) throw new ErrorPedido("datos_invalidos", "Falta la comida.");
      const cant = limpiar(datos.cant, 60);
      return {
        modelo: cfg.modeloRapido, maxTokens: 300,
        contenido: texto(`Sos nutricionista en Uruguay. Estimá de forma aproximada esta comida tal como se suele comer en una casa uruguaya.
Comida: ${q(t)}
${cant ? `Cantidad: ${q(cant)}` : "Cantidad: una porción mediana casera (un plato normal para un adulto)."}
Respondé solo con JSON con esta forma: {"kcal": 520, "prot": 38, "veg": 1.5, "ultra": false, "nota": "frase corta (máximo 12 palabras) con la porción que asumiste"}
${FORMATO_EST}`),
      };
    }
    case "estimar_lote": {
      const items = lista<Record<string, unknown>>(datos.items, 30)
        .map((x) => ({ texto: limpiar(x?.texto, 200), cant: limpiar(x?.cant, 60) }))
        .filter((x) => x.texto);
      if (!items.length) throw new ErrorPedido("datos_invalidos", "No hay comidas para estimar.");
      return {
        modelo: cfg.modeloRapido, maxTokens: 120 * items.length + 200,
        contenido: texto(`Sos nutricionista en Uruguay. Estimá de forma aproximada cada una de estas comidas, tal como se suelen comer en una casa uruguaya. Si no se indica cantidad, asumí una porción mediana casera (un plato normal para un adulto).
${items.map((v, i) => `${i}. ${q(v.texto)}${v.cant ? ` (cantidad: ${q(v.cant)})` : ""}`).join("\n")}
Respondé solo con un array JSON con un objeto por comida, en el mismo orden: [{"i":0,"kcal":520,"prot":38,"veg":1.5,"ultra":false}]
${FORMATO_EST}`),
      };
    }
    case "ticket": {
      const imgs = lista<Record<string, unknown>>(datos.imagenes, 3)
        .map((x) => ({ img: String(x?.imagen ?? ""), tipo: String(x?.media_type ?? "image/jpeg") }));
      if (!imgs.length) throw new ErrorPedido("imagen_invalida", "Falta la foto del ticket.");
      let total = 0;
      for (const { img, tipo } of imgs) {
        if (!/^image\/(jpeg|png|webp)$/.test(tipo)) throw new ErrorPedido("imagen_invalida", "Formato de imagen no admitido.");
        if (!/^[A-Za-z0-9+/=]+$/.test(img) || img.length < 200) throw new ErrorPedido("imagen_invalida", "La imagen no llegó bien.");
        total += img.length;
      }
      if (total > 4_500_000) throw new ErrorPedido("imagen_grande", "Las fotos son demasiado grandes.", 413);
      return {
        modelo: cfg.modeloRapido, maxTokens: 3000,
        contenido: [
          ...imgs.map(({ img, tipo }) => ({ type: "image", source: { type: "base64", media_type: tipo, data: img } })),
          { type: "text", text: `${imgs.length > 1 ? "Son fotos de partes del mismo ticket de supermercado de Uruguay, en orden." : "Es la foto de un ticket de supermercado de Uruguay."} Leé cada producto comprado.
Para cada producto: "nombre" claro en español de Uruguay, sin marca salvo que haga falta, expandiendo las abreviaturas del ticket (por ejemplo "PECH POLLO" es "Pechuga de pollo", "LECHE ENT" es "Leche entera"); "cant" con la cantidad o el peso si aparece ("1 kg", "2 u", "500 g"), si no, vacío; "precio" = importe final de esa línea como número; "cat" una de: prot (carnes, huevos, pescado), ver (verduras y frutas), lac (lácteos), alm (almacén), otr (otros); "comida" = true si es comida o bebida, false si es limpieza, higiene u otra cosa.
Ignorá descuentos sueltos, subtotales, medios de pago, números de tarjeta, RUT y cualquier dato personal: no los incluyas en la respuesta.
Respondé solo con JSON: {"comercio":"nombre del super","fecha":"AAAA-MM-DD o vacío","total":1234.5,"moneda":"UYU","items":[{"nombre":"Pechuga de pollo","cant":"1 kg","precio":289.5,"cat":"prot","comida":true}]}
Si la imagen no es un ticket o no se puede leer, respondé {"items":[],"legible":false}.` },
        ],
      };
    }
    case "foto": {
      const img = String(datos.imagen ?? "");
      const tipo = String(datos.media_type ?? "image/jpeg");
      if (!/^image\/(jpeg|png|webp)$/.test(tipo)) throw new ErrorPedido("imagen_invalida", "Formato de imagen no admitido.");
      if (!/^[A-Za-z0-9+/=]+$/.test(img) || img.length < 200) throw new ErrorPedido("imagen_invalida", "La imagen no llegó bien.");
      if (img.length > 2_000_000) throw new ErrorPedido("imagen_grande", "La imagen es demasiado grande.", 413);
      return {
        modelo: cfg.modeloRapido, maxTokens: 400,
        contenido: [
          { type: "image", source: { type: "base64", media_type: tipo, data: img } },
          { type: "text", text: `Mirá la foto de una comida. Identificá el plato con el nombre que se usaría en Uruguay y estimá de forma aproximada lo que se ve (una porción, la que está en la foto).
Respondé solo con JSON con esta forma: {"texto":"nombre corto del plato","kcal":520,"prot":38,"veg":1.5,"ultra":false,"nota":"porción que asumiste, máximo 12 palabras"}
${FORMATO_EST}
Si en la foto no se ve comida, respondé {"texto":"","kcal":0,"prot":0,"veg":0,"ultra":false,"nota":"No se ve comida en la foto"}.` },
        ],
      };
    }
    case "recetas": {
      const despensa = lista<Record<string, unknown>>(datos.despensa, 150)
        .map((x) => ({ nombre: limpiar(x?.nombre, 60), cant: limpiar(x?.cant, 40) })).filter((x) => x.nombre);
      const objetivos = lista<Record<string, unknown>>(datos.objetivos, 10).map((o) => ({
        nombre: limpiar(o?.nombre, 40) || "Persona",
        musculo: o?.objetivo === "musculo",
        kcal: num(o?.kcal), prot: num(o?.prot),
      }));
      const porciones = Math.min(10, Math.max(1, Math.round(num(datos.porciones) ?? (objetivos.length || 2))));
      const filtros = lista<string>(datos.filtros, 6).map((f) => FILTROS[String(f)]).filter(Boolean);
      const antojo = limpiar(datos.antojo, 200);
      const evitar = lista<string>(datos.evitar, 60).map((t) => limpiar(t, 80)).filter(Boolean);
      const restr = lista<string>(datos.restricciones, 4).map(String).filter((r) => RESTRICCIONES[r]);
      const alergias = limpiar(datos.alergias, 300);
      const reglaRestr = restr.length || alergias
        ? `- RESTRICCIONES OBLIGATORIAS (alguien de la casa las tiene; las 3 recetas tienen que respetarlas todas, sin excepción y sin "opcional"): ${[...restr.map((r) => RESTRICCIONES[r]), ...(alergias ? [`no usar: ${q(alergias)} (alergias o intolerancias)`] : [])].join("; ")}.`
        : "- Sin restricciones alimentarias; el criterio es que sean saludables.";
      const mus = objetivos.some((o) => o.musculo);
      const conRef = objetivos.some((o) => o.kcal);
      const objs = objetivos.length
        ? objetivos.map((o) => `${o.nombre}: ${o.musculo ? "ganar músculo" : "mantenerse y comer mejor"}${o.kcal ? `, referencia diaria ~${Math.round(o.kcal)} kcal y ~${Math.round(o.prot ?? 0)} g de proteína` : ""}`).join("; ")
        : "mantenerse y comer mejor";
      return {
        modelo: cfg.modeloRecetas, maxTokens: 3600,
        contenido: texto(`Sos un equipo de nutricionista y cocinero uruguayo. Proponé 3 recetas de cocina casera uruguaya, en versión saludable, para ${porciones} ${porciones === 1 ? "persona" : "personas"}.
${despensa.length ? "Usá sobre todo estos ingredientes que hay en la casa:\n" + despensa.map((x) => "- " + x.nombre + (x.cant ? ` (${x.cant})` : "")).join("\n") : 'La despensa está vacía: proponé recetas con ingredientes básicos y poné en "faltan" lo que haría falta comprar.'}
Objetivos: ${objs}.
${mus ? "Al menos una persona quiere ganar músculo: priorizá 35 g de proteína o más por porción y energía suficiente (nada de platos muy bajos en calorías)." : "Objetivo general: mantenerse y comer mejor, platos equilibrados y saciantes, con buena cantidad de verdura."}
${filtros.length ? "Condiciones pedidas: " + filtros.join("; ") + "." : ""}
${antojo ? `Idea o antojo de la casa: ${q(antojo)}. Tenelo en cuenta.` : ""}
Reglas:
- Solo recetas reales y conocidas de la cocina uruguaya de todos los días, con su nombre habitual: lo que se cocina en una casa uruguaya (por ejemplo tarta de zapallitos o de acelga, pascualina, guiso de lentejas, buseca, puchero, estofado, milanesas al horno, pastel de carne, carne al horno con boniatos, pollo al horno, tortilla de papas, revuelto de zapallitos, ñoquis, tallarines con tuco, polenta con salsa, arroz con pollo, croquetas de arroz, ensalada completa). Nada de cocina asiática, mexicana, india ni de otros países que no sea habitual en Uruguay (salvo que el antojo lo pida), nada de combinaciones inventadas, fusiones raras ni ingredientes que no van juntos.
- Saludables sin dejar de ser el plato de siempre: más verdura, carnes magras, horno o plancha antes que fritura, poca crema y manteca.
- Técnicas, temperaturas, tiempos y cantidades realistas y probados; que alguien que cocina en casa pueda seguirla y le salga. Si con lo de la despensa no alcanza para una receta real, usá una receta real igual y poné en "faltan" lo que haga falta, antes que inventar.
- Las 3 bien distintas entre sí: distinto tipo de plato (por ejemplo horno, guiso, tarta, plancha o ensalada completa), distinto ingrediente principal y distinto método de cocción.
- No repitas ni hagas variantes cercanas de estas recetas: ${evitar.length ? evitar.join("; ") : "(ninguna)"}.
- Ingredientes que se consiguen en un supermercado uruguayo, con nombres locales (morrón, zapallito, boniato, choclo, nalga, suprema, etc.).
${conRef ? "- Que cada plato principal aporte aproximadamente entre un 25% y un 35% de esas referencias diarias por porción.\n" : ""}- Cantidades para ${porciones} porciones. Entre 4 y 7 pasos claros y concretos, de longitud media.
- kcal, prot (gramos) y veg (porciones de verdura o fruta, puede ser .5) son aproximadas y por porción.
- "faltan": ingredientes de la receta que no están en la lista (sin contar sal, pimienta, agua, aceite y especias comunes).${despensa.length ? " Máximo 3 por receta." : ""}
${reglaRestr}
Respondé solo con un array JSON de 3 objetos con esta forma exacta:
[{"titulo":"Pollo al horno con boniatos y zanahorias","tiempo_min":50,"kcal":480,"prot":42,"veg":2,"ingredientes":[{"item":"Supremas de pollo","cant":"2 (300 g)"}],"pasos":["Prendé el horno a 200 °C..."],"faltan":["limón"]}]`),
      };
    }
    case "compra": {
      const rutinas = lista<Record<string, unknown>>(datos.rutinas, 10).map((r) => ({
        nombre: limpiar(r?.nombre, 40) || "Persona",
        dias: lista<Record<string, unknown>>(r?.dias, 7).map((d) => ({
          dia: limpiar(d?.dia, 12),
          comidas: lista<Record<string, unknown>>(d?.comidas, 5)
            .map((c) => ({ slot: SLOTS[String(c?.slot)] ?? "", texto: limpiar(c?.texto, 120) }))
            .filter((c) => c.texto),
        })).filter((d) => d.comidas.length),
      })).filter((r) => r.dias.length);
      if (!rutinas.length) throw new ErrorPedido("sin_rutinas", "No hay rutinas de comidas cargadas.");
      const despensa = lista<Record<string, unknown>>(datos.despensa, 150)
        .map((x) => limpiar(x?.nombre, 60) + (x?.cant ? ` (${limpiar(x?.cant, 40)})` : "")).filter((x) => x.trim());
      const personas = rutinas.length;
      return {
        modelo: cfg.modeloRapido, maxTokens: 2500,
        contenido: texto(`Sos nutricionista en Uruguay y armás la lista del super para una casa de ${personas} ${personas === 1 ? "persona" : "personas"} para la próxima semana.
${rutinas.map((r) => `Rutina de comidas de ${r.nombre}:\n` + r.dias.map((d) => `${d.dia}: ` + d.comidas.map((c) => `${c.slot}: ${c.texto}`).join("; ")).join("\n")).join("\n\n")}
En la despensa ya hay: ${despensa.join(", ") || "nada cargado"}.
Armá la lista de lo que falta comprar para cumplir esas rutinas, con cantidades razonables para una semana. No incluyas lo que ya hay en la despensa salvo que claramente no alcance. Agrupá por categoría: prot (carnes, huevos, pescado), ver (verduras y frutas), lac (lácteos), alm (almacén), otr (otros).
Respondé solo con un array JSON de objetos: [{"nombre":"Supremas de pollo","cant":"1 kg","cat":"prot"}]`),
      };
    }
  }
}

// ---------- lectura tolerante del JSON que devuelve Claude ----------
export function extraerJSON(texto: string): unknown {
  const t = texto.trim();
  try { return JSON.parse(t); } catch { /* sigue */ }
  const fence = t.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fence) { try { return JSON.parse(fence[1]); } catch { /* sigue */ } }
  const ini = t.search(/[[{]/);
  const fin = Math.max(t.lastIndexOf("}"), t.lastIndexOf("]"));
  if (ini >= 0 && fin > ini) { try { return JSON.parse(t.slice(ini, fin + 1)); } catch { /* sigue */ } }
  throw new ErrorPedido("respuesta_invalida", "La IA no devolvió datos legibles.", 502);
}

const r05 = (v: unknown) => Math.round((num(v) ?? 0) * 2) / 2;
function est(o: Record<string, unknown>) {
  return {
    kcal: Math.max(0, Math.round(num(o?.kcal) ?? 0)),
    prot: Math.max(0, Math.round(num(o?.prot) ?? 0)),
    veg: Math.min(5, Math.max(0, r05(o?.veg))),
    ultra: o?.ultra === true || o?.ultra === "true",
    nota: limpiar(o?.nota, 140),
  };
}

export function interpretar(tarea: Tarea, crudo: unknown): unknown {
  const arr = (v: unknown): Record<string, unknown>[] =>
    Array.isArray(v) ? v : (v && typeof v === "object" && Array.isArray((v as Record<string, unknown>).recetas)) ? (v as { recetas: Record<string, unknown>[] }).recetas : [];
  switch (tarea) {
    case "estimar": {
      const o = crudo as Record<string, unknown>;
      if (!o || num(o.kcal) === null) throw new ErrorPedido("respuesta_invalida", "La IA no devolvió una estimación.", 502);
      return est(o);
    }
    case "foto": {
      const o = (crudo ?? {}) as Record<string, unknown>;
      return { ...est(o), texto: limpiar(o.texto, 80) };
    }
    case "estimar_lote":
      return arr(crudo).filter((o) => o && num(o.kcal) !== null).map((o, idx) => ({ i: num(o.i) ?? idx, ...est(o) }));
    case "recetas": {
      const lista3 = arr(crudo).filter((x) => x && x.titulo).slice(0, 3).map((x) => ({
        titulo: limpiar(x.titulo, 120),
        tiempo_min: Math.max(1, Math.round(num(x.tiempo_min) ?? 30)),
        kcal: Math.max(0, Math.round(num(x.kcal) ?? 0)),
        prot: Math.max(0, Math.round(num(x.prot) ?? 0)),
        veg: r05(x.veg),
        ingredientes: (Array.isArray(x.ingredientes) ? x.ingredientes : []).slice(0, 25).map((i: unknown) =>
          typeof i === "string" ? { item: limpiar(i, 100), cant: "" } : { item: limpiar((i as Record<string, unknown>)?.item, 100), cant: limpiar((i as Record<string, unknown>)?.cant, 60) }),
        pasos: (Array.isArray(x.pasos) ? x.pasos : []).slice(0, 12).map((s: unknown) => limpiar(s, 600).replace(/^\d+[.)]\s*/, "")),
        faltan: (Array.isArray(x.faltan) ? x.faltan : []).slice(0, 8).map((s: unknown) => limpiar(s, 60)).filter(Boolean),
      }));
      if (lista3.length < 2) throw new ErrorPedido("respuesta_invalida", "La IA no devolvió recetas completas.", 502);
      return lista3;
    }
    case "ticket": {
      const o = (crudo && typeof crudo === "object" ? crudo : {}) as Record<string, unknown>;
      const items = (Array.isArray(o.items) ? o.items : []).slice(0, 80).map((x: Record<string, unknown>) => {
        const p = num(x?.precio);
        return {
          nombre: limpiar(x?.nombre, 60), cant: limpiar(x?.cant, 30),
          precio: p !== null && p >= 0 && p < 1e6 ? Math.round(p * 100) / 100 : null,
          cat: CATS.includes(String(x?.cat)) ? String(x?.cat) : "otr",
          comida: x?.comida !== false && x?.comida !== "false",
        };
      }).filter((x: { nombre: string }) => x.nombre);
      const t = num(o.total), f = String(o.fecha ?? "");
      return {
        comercio: limpiar(o.comercio, 60),
        fecha: /^\d{4}-\d{2}-\d{2}$/.test(f) ? f : "",
        total: t !== null && t >= 0 && t < 1e7 ? Math.round(t * 100) / 100 : null,
        moneda: o.moneda === "USD" ? "USD" : "UYU",
        items,
        legible: o.legible !== false && items.length > 0,
      };
    }
    case "compra":
      return arr(crudo).filter((x) => x && x.nombre).slice(0, 60).map((x) => ({
        nombre: limpiar(x.nombre, 60), cant: limpiar(x.cant, 40), cat: CATS.includes(String(x.cat)) ? String(x.cat) : "otr",
      }));
  }
}

// Pensamiento del modelo: estas tareas son cortas y con formato fijo. Pensar gasta
// tokens de salida (se cobran y cuentan dentro de max_tokens) y con topes de 300 o
// 400 puede dejar la respuesta vacía. Haiku 5.5 lo apaga con "disabled"; Sonnet 5.5
// no lo acepta y usa "between_tools" (sin herramientas, equivale a no pensar).
export function thinkingPara(modelo: string): Record<string, string> | undefined {
  if (modelo === "claude-haiku-5-5") return { type: "disabled" };
  if (modelo === "claude-sonnet-5-5") return { type: "between_tools" };
  return undefined;
}

// Lo máximo que puede costar un pedido (se reserva antes de llamar a Claude para
// que varios pedidos simultáneos no pasen todos juntos el tope del plan).
export function costoMaximo(p: Pedido, cfg: Config = CONFIG_BASE): number {
  const entrada = p.contenido.reduce((a, c) => a + (c.type === "image" ? 2000 : Math.ceil(String(c.text ?? "").length / 3)), 0);
  return costoUSD(p.modelo, entrada, p.maxTokens, cfg);
}

export function costoUSD(modelo: string, entrada: number, salida: number, cfg: Config = CONFIG_BASE): number {
  const p = cfg.precios[modelo] ?? cfg.precios[cfg.modeloRecetas] ?? [3, 15];
  return Math.round(((entrada * p[0] + salida * p[1]) / 1_000_000) * 1e6) / 1e6;
}
