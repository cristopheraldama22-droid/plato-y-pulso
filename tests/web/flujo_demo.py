"""Prueba de punta a punta de la app en modo demo (sin servidor), en Chromium.
Uso: python3 tests/web/flujo_demo.py <carpeta_capturas>
Levanta un servidor local sobre web/ y recorre los flujos principales."""
import json, os, sys, threading, http.server, functools, tempfile
from playwright.sync_api import sync_playwright

RAIZ = os.path.join(os.path.dirname(__file__), "..", "..", "web")
OUT = sys.argv[1] if len(sys.argv) > 1 else "/tmp"
PUERTO = 8765
srv = http.server.ThreadingHTTPServer(("127.0.0.1", PUERTO), functools.partial(http.server.SimpleHTTPRequestHandler, directory=RAIZ))
threading.Thread(target=srv.serve_forever, daemon=True).start()
URL = f"http://127.0.0.1:{PUERTO}/?demo&test"

# Respaldo como el que descarga el artefacto de Claude (versión 2, personas "cris" y "pareja")
RESPALDO = {"app": "plato-y-pulso", "version": 2, "exportado": "2026-10-13T20:00:00Z", "docs": {
    "perfiles/cris": {"objetivo": "musculo", "sexo": "h", "edad": 33, "peso": 80, "altura": 175, "pin": "x"},
    "perfiles/pareja": {"objetivo": "mantener", "sexo": "m", "edad": 31, "peso": 60, "altura": 165},
    "meses/cris_2026-10": {"persona": "cris", "mes": "2026-10", "comidas": {"2026-10-12": [{"id": "a1", "slot": "almuerzo", "texto": "lentejas", "porcion": "m", "kcal": 430, "prot": 24, "fuente": "claude"}]}, "entrenos": {}, "extras": {}},
    "meses/pareja_2026-10": {"persona": "pareja", "mes": "2026-10", "comidas": {"2026-10-12": [{"id": "b1", "slot": "cena", "texto": "tarta", "porcion": "m", "kcal": 330, "prot": 12, "fuente": "tabla"}]}, "entrenos": {}, "extras": {}},
    "compartido/despensa": {"items": [{"id": "d1", "nombre": "Huevos", "cat": "prot"}, {"id": "d2", "nombre": "Tomate", "cat": "ver"}]},
}}

errores = []
with sync_playwright() as p:
    b = p.chromium.launch()
    ctx = b.new_context(viewport={"width": 390, "height": 844}, accept_downloads=True)
    pg = ctx.new_page()
    pg.on("pageerror", lambda e: errores.append(str(e)))
    pg.route("**/*", lambda r: r.abort() if "fonts.g" in r.request.url else r.continue_())
    pg.goto(URL); pg.wait_for_timeout(500)
    c = lambda s: (pg.locator(s).first.click(), pg.wait_for_timeout(200))
    print("1. pantalla de ingreso:", pg.inner_text("main h1"))
    pg.screenshot(path=f"{OUT}/1-ingreso.png")

    pg.fill("#lgE", "cris@ejemplo.uy"); c('[data-a="lgEnviar"]'); pg.wait_for_timeout(300)
    print("2. espacios:", pg.inner_text("main h1"))
    pg.fill("#nNom", "Casa Aldama"); pg.fill("#nYo", "Cristopher"); c('[data-a="crearEsp"]'); pg.wait_for_timeout(500)
    print("3. dentro del hogar:", pg.inner_text("main h1"), "| selector visible:", pg.locator("#who").is_visible())

    c('[data-a="ajustes"]'); pg.wait_for_timeout(400)
    codigo = pg.inner_text("#ajCod .num").strip()
    print("4. código de invitación:", codigo, "| texto de IA:", pg.inner_text("#ajIA")[:60].replace("\n", " "))
    pg.screenshot(path=f"{OUT}/4-ajustes.png", full_page=True)
    c('#sheetPanel [data-x="salir"]'); pg.wait_for_timeout(300)

    pg.fill("#lgE", "clara@ejemplo.uy"); c('[data-a="lgEnviar"]'); pg.wait_for_timeout(300)
    pg.fill("#uCod", codigo.lower()); pg.fill("#uNom", "Clara"); c('[data-a="unirme"]'); pg.wait_for_timeout(500)
    print("5. Clara entró:", pg.inner_text("main h1"), "| personas:", pg.locator("#who button").all_inner_texts())

    c('main [data-a="nuevaComida"]')
    pg.fill("#mT", "milanesa de pollo al horno con ensalada")
    c('#sheetPanel [data-g="para"] [data-v="dos"]')
    print("6. porciones para el otro:", pg.locator("#mPor2L .fld > span").all_inner_texts())
    c("#mEst"); pg.wait_for_timeout(300)
    print("-> estimación:", pg.input_value("#mK"), "kcal |", pg.inner_text("#mOtro"))
    c("#mOk"); pg.wait_for_timeout(400)
    st = pg.evaluate("()=>Object.entries(window.__pp.S.meses).map(([k,v])=>[k.slice(37),Object.values(v.comidas).flat().map(e=>[e.texto.slice(0,9),e.kcal,!!e.grupo])])")
    print("-> guardado en ambos perfiles:", st)

    c('[data-a="tab"][data-t="cocina"]'); c('[data-a="cocSeg"][data-c="recetas"]')
    c('[data-a="ideasBase"]')
    print("7. recetas sin IA (demo):", pg.locator("main .rec").count(), "| aviso:", pg.inner_text("main .coach")[:60])

    # importar el respaldo del artefacto
    f = os.path.join(tempfile.gettempdir(), "respaldo-artefacto.json"); json.dump(RESPALDO, open(f, "w"))
    c('[data-a="ajustes"]'); pg.wait_for_timeout(300)
    pg.set_input_files("#aImp", f); pg.wait_for_timeout(300)
    sels = pg.locator("[data-imp]")
    nombres = pg.locator("#aImpBox .fld > span").all_inner_texts()
    print("8. perfiles del respaldo:", nombres)
    # mapear: "Perfil 1" (cris) → Cristopher; "Perfil 2" (pareja) → Clara
    ids = pg.evaluate("()=>window.__pp.PERS")
    nombres_ids = pg.evaluate("()=>window.__pp.PERS.map(p=>document.querySelector('#who button[data-p=\"'+p+'\"]').textContent)")
    mapa = dict(zip(nombres_ids, ids))
    sels.nth(0).select_option(mapa["Cristopher"]); sels.nth(1).select_option(mapa["Clara"])
    c("#aImpOk"); pg.wait_for_timeout(400)
    imp = pg.evaluate("""()=>{const S=window.__pp.S;return {perfiles:Object.values(S.perfiles).map(x=>[x.objetivo,x.peso,'pin' in x]),meses:Object.keys(S.meses).map(k=>k.slice(37)),despensa:(S.comp.despensa||{items:[]}).items.map(x=>x.nombre)}}""")
    print("-> importado:", imp)

    c('[data-a="tab"][data-t="hoy"]')
    c('[data-a="persona"][data-p="%s"]' % mapa["Cristopher"])
    print("9. hoy de Cristopher, objetivo importado:", pg.locator('[data-a="objetivo"][aria-pressed="true"]').inner_text().strip(), "| referencia:", pg.inner_text("main .tiles").replace("\n", " ")[:80])

    with pg.expect_download() as dl:
        c('[data-a="ajustes"]'); pg.wait_for_timeout(300); c("#aExp")
    d = dl.value; ruta = os.path.join(tempfile.gettempdir(), d.suggested_filename); d.save_as(ruta)
    j = json.load(open(ruta)); print("10. respaldo descargado:", d.suggested_filename, "| versión", j["version"], "| bloques", len(j["docs"]), "| personas", list(j["personas"].values()))
    c("#sheetPanel [data-cerrar]")

    pg.reload(); pg.wait_for_timeout(700)
    print("11. tras recargar sigue adentro:", pg.inner_text("main h1"), "| comidas de hoy:", pg.locator("main .entry").count())
    pg.screenshot(path=f"{OUT}/11-hoy.png", full_page=True)

    # marca propia (dueño = Cristopher; Clara es miembro, no ve marca)
    c('[data-a="ajustes"]'); pg.wait_for_timeout(300)
    print("12. Clara (miembro) ve sección de marca:", pg.locator("#mkOk").count() > 0)
    c("#sheetPanel [data-cerrar]")

    pg.emulate_media(color_scheme="dark"); pg.wait_for_timeout(100)
    pg.screenshot(path=f"{OUT}/12-oscuro.png")
    print("13. ancho de página (debe ser 390):", pg.evaluate("()=>document.documentElement.scrollWidth"))

    # sin configuración y sin ?demo: debe pedir configurar
    pg2 = ctx.new_page(); pg2.goto(f"http://127.0.0.1:{PUERTO}/"); pg2.wait_for_timeout(400)
    print("14. sin configurar:", pg2.inner_text("main h1"))
    b.close()
srv.shutdown()
print("ERRORES:", errores or "ninguno")
