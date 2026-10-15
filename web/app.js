(function(){
"use strict";
/* =========================================================
   Utilidades
   ========================================================= */
const $=s=>document.querySelector(s);
const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const uid=()=>Math.random().toString(36).slice(2,8)+Date.now().toString(36).slice(-5);
const pad=n=>String(n).padStart(2,"0");
const fmtD=d=>`${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
const parseD=s=>{const [y,m,d]=s.split("-").map(Number);return new Date(y,m-1,d)};
const addDays=(s,n)=>{const d=parseD(s);d.setDate(d.getDate()+n);return fmtD(d)};
const hoyStr=()=>fmtD(new Date());
const lunesDe=s=>{const d=parseD(s);d.setDate(d.getDate()-((d.getDay()+6)%7));return fmtD(d)};
const DIAS=["lun","mar","mie","jue","vie","sab","dom"];
const DIAS_L={lun:"Lunes",mar:"Martes",mie:"Miércoles",jue:"Jueves",vie:"Viernes",sab:"Sábado",dom:"Domingo"};
const DIAS_C=["L","M","M","J","V","S","D"];
const MESES=["enero","febrero","marzo","abril","mayo","junio","julio","agosto","setiembre","octubre","noviembre","diciembre"];
const diaKey=s=>DIAS[(parseD(s).getDay()+6)%7];
const fechaLarga=s=>{const d=parseD(s);return `${DIAS_L[diaKey(s)]} ${d.getDate()} de ${MESES[d.getMonth()]}`};
const fechaCorta=s=>{const d=parseD(s);return `${d.getDate()} ${MESES[d.getMonth()].slice(0,3)}`};
const nf=new Intl.NumberFormat("es-UY",{maximumFractionDigits:0});
const nf1=new Intl.NumberFormat("es-UY",{maximumFractionDigits:1});
const fmtN=v=>nf.format(Math.round(+v||0));
const isNum=v=>v!==null&&v!==undefined&&v!==""&&!isNaN(+v);
const norm=s=>String(s||"").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g,"").replace(/\s+/g," ").trim();
const clone=o=>JSON.parse(JSON.stringify(o||{}));
const r05=v=>Math.round((+v||0)*2)/2;
const numIn=v=>{const n=parseFloat(String(v??"").replace(",","."));return isNaN(n)?null:n};
const horaAhora=()=>{const d=new Date();return pad(d.getHours())+":"+pad(d.getMinutes())};
const lsGet=k=>{try{return JSON.parse(localStorage.getItem(k))}catch(e){return null}};
const lsSet=(k,v)=>{try{localStorage.setItem(k,JSON.stringify(v))}catch(e){}};
const ssGet=k=>{try{return JSON.parse(sessionStorage.getItem(k))}catch(e){return null}};
const ssSet=(k,v)=>{try{sessionStorage.setItem(k,JSON.stringify(v))}catch(e){}};
const sumBy=(a,k)=>a.reduce((s,x)=>s+(isNum(x[k])?+x[k]:0),0);

/* =========================================================
   Constantes del dominio
   ========================================================= */
const SLOTS=[["desayuno","Desayuno"],["almuerzo","Almuerzo"],["merienda","Merienda"],["cena","Cena"],["snacks","Snacks"]];
const SLOT_N=Object.fromEntries(SLOTS);
const SLOT_LIM={desayuno:11,almuerzo:15.5,merienda:19.5,cena:23.5};
const TIPOS=[["gimnasio","Gimnasio"],["bici","Bici"],["caminar","Caminar"],["correr","Correr"]];
const TIPO_N=Object.fromEntries(TIPOS);
const INTS=[["suave","Suave"],["media","Media"],["alta","Intensa"]];
const MET={gimnasio:{suave:3.5,media:5,alta:6},bici:{suave:4,media:6.8,alta:9},caminar:{suave:2.8,media:3.5,alta:4.5},correr:{suave:7,media:9.8,alta:11.5}};
const OBJ={mantener:"Mantenerme / comer mejor",musculo:"Ganar músculo"};
const ACT=[["sentado","Sentado casi todo el día"],["depie","De pie o caminando parte del día"],["fisico","Trabajo físico o muy activo"]];
const PAL={sentado:1.25,depie:1.4,fisico:1.6};
const PORC={s:{l:"Chica",m:.7},m:{l:"Mediana",m:1},l:{l:"Grande",m:1.4},x:{l:"Otra cantidad",m:1}};
const pm=k=>(PORC[k]||PORC.m).m;
/* Personas visibles en el espacio actual (ids de miembro). Se cargan al entrar. */
let PERS=[];
const NOMBRES={};
const otros=p=>PERS.filter(x=>x!==p);
const COMPARTE=()=>!!(ESP&&ESP.datos_compartidos);
/* Con quién puedo anotar comidas compartidas: en un hogar, con todos los demás. */
const companeros=p=>COMPARTE()?otros(p):[];
const CATS=[["prot","Proteínas"],["ver","Verduras y frutas"],["lac","Lácteos"],["alm","Almacén"],["otr","Otros"]];
const CAT_IDS=CATS.map(c=>c[0]);
const BASICOS=[["Huevos","prot"],["Pollo","prot"],["Carne picada","prot"],["Atún en lata","prot"],["Merluza","prot"],["Lentejas","alm"],["Garbanzos","alm"],["Arroz","alm"],["Fideos","alm"],["Avena","alm"],["Pan integral","alm"],["Tomate","ver"],["Cebolla","ver"],["Zanahoria","ver"],["Zapallito","ver"],["Morrón","ver"],["Papa","ver"],["Boniato","ver"],["Zapallo","ver"],["Espinaca","ver"],["Limón","ver"],["Banana","ver"],["Manzana","ver"],["Leche","lac"],["Yogur natural","lac"],["Queso magro","lac"],["Ajo","otr"],["Aceite de oliva","otr"]];
const FILTROS=[["rapida","Rápidas (30 min o menos)"],["vianda","Para llevar al trabajo"],["desayuno","Desayuno o merienda"],["horno","Al horno"],["unaolla","Una sola olla o sartén"],["economica","Económicas"]];
const RECORD_DEF=[{id:"des",t:"Anotá el desayuno en Plato y Pulso",h:"09:30",r:"FREQ=DAILY"},{id:"alm",t:"Anotá el almuerzo en Plato y Pulso",h:"14:30",r:"FREQ=DAILY"},{id:"cen",t:"Anotá merienda y cena en Plato y Pulso",h:"21:30",r:"FREQ=DAILY"},{id:"sem",t:"Plato y Pulso: mirá el resumen y armá la compra",h:"19:00",r:"FREQ=WEEKLY;BYDAY=SU"}];
const slotPorHora=()=>{const h=new Date().getHours()+new Date().getMinutes()/60;return h<11?"desayuno":h<15.5?"almuerzo":h<19.5?"merienda":h<23.5?"cena":"snacks"};

/* Tabla base aproximada por porción casera mediana: [clave, kcal, prot] */
const NUT=[["chivito",900,45],["milanesa napolitana",520,38],["milanesa de pollo",320,30],["milanesa de carne",380,28],["milanesa",350,28],["suprema",250,38],["pollo",260,32],["asado",480,38],["bife",380,38],["carne",380,36],["hamburguesa",300,20],["chorizo",300,14],["pancho",280,10],["merluza",190,32],["pescado",200,30],["atun",130,28],["omelette",280,20],["tortilla",320,16],["huevo",75,6],["tallarines",380,12],["fideos",380,12],["ravioles",450,16],["noquis",420,10],["lasagna",550,28],["arroz",210,4],["quinoa",220,8],["lentejas",300,18],["garbanzos",280,14],["porotos",260,15],["guiso",380,20],["puchero",450,30],["pure",180,4],["papas fritas",420,5],["papa",160,4],["boniato",180,3],["zapallo",70,2],["ensalada",70,2],["verduras",80,3],["sopa",140,6],["pizza",290,12],["faina",220,7],["empanada",280,10],["tarta",330,12],["pascualina",330,12],["sandwich",350,18],["wrap",330,18],["torta frita",260,4],["bizcocho",180,3],["croissant",230,4],["medialuna",190,4],["alfajor",230,3],["galletitas",150,2],["tostada",70,2],["pan",150,5],["cafe con leche",110,6],["licuado",200,7],["batido de proteina",130,25],["proteina",130,25],["leche",120,8],["yogur",120,8],["queso",100,7],["jamon",50,8],["granola",200,5],["avena",150,5],["banana",100,1],["manzana",80,0],["naranja",70,1],["fruta",80,1],["frutos secos",180,6],["mani",180,8],["dulce de leche",70,1],["tuco",90,2],["salsa",90,2],["refresco",140,0],["gaseosa",140,0],["cerveza",150,1],["vino",125,0],["cafe",5,0],["mate",5,0]].sort((a,b)=>b[0].length-a[0].length);
const VEG_KEYS=["ensalada","verdura","tomate","zapallo","zapallito","espinaca","brocoli","zanahoria","lechuga","morron","acelga","pepino","fruta","banana","manzana","naranja","mandarina","frutilla","pera","kiwi","durazno","uva","choclo","calabaza","berenjena","remolacha"];
const ULTRA_KEYS=["galletitas","alfajor","pancho","salchicha","chorizo","papas fritas de paquete","snack","nuggets","refresco","gaseosa","coca","jugo en polvo","bizcocho","medialuna","croissant","torta frita","golosina","chocolate","helado","fiambre","panchos","hamburguesa congelada","pizza congelada"];

/* Recetas base (sin Claude) */
const RB=(titulo,tiempo_min,kcal,prot,veg,ing,pasos)=>({titulo,tiempo_min,kcal,prot,veg,ingredientes:ing,pasos});
const RECETAS_BASE=[
RB("Pollo al limón con verduras asadas",35,480,42,2,[["Supremas de pollo","2 (300 g)","pollo"],["Limón","1","limon"],["Zapallito","1","zapallito"],["Morrón","1","morron"],["Cebolla","1","cebolla"],["Aceite de oliva","1 cda","aceite"],["Sal, pimienta y orégano","a gusto",""]],["Prendé el horno a 200 °C. Cortá el zapallito, el morrón y la cebolla en trozos parejos.","Acomodá las verduras en una asadera con la mitad del aceite, sal y orégano.","Condimentá las supremas con jugo y ralladura de limón, sal y pimienta, y ponelas encima de las verduras.","Horneá 25 a 30 minutos, dando vuelta el pollo a mitad de cocción, hasta que esté dorado y sin rosado adentro.","Serví con un chorrito más de limón por arriba."]),
RB("Lentejas guisadas con verduras",40,430,24,2,[["Lentejas secas","200 g","lenteja"],["Zanahoria","1","zanahoria"],["Cebolla","1","cebolla"],["Morrón","1/2","morron"],["Tomate triturado","1/2 caja","tomate"],["Ajo","1 diente","ajo"],["Pimentón y comino","1 cdita",""]],["Enjuagá las lentejas y dejalas en agua mientras picás las verduras.","Rehogá la cebolla, el morrón y el ajo en una olla con un poco de aceite, 5 minutos.","Sumá la zanahoria en cubos y las especias, y revolvé un minuto.","Agregá las lentejas escurridas, el tomate y agua hasta cubrir. Cociná tapado 25 minutos a fuego bajo.","Probá de sal y dejá reposar 5 minutos antes de servir."]),
RB("Merluza al horno con puré de zapallo",30,380,36,2,[["Filetes de merluza","2 (350 g)","merluza"],["Zapallo","600 g","zapallo"],["Limón","1","limon"],["Ajo","1 diente","ajo"],["Perejil","un puñado",""],["Aceite de oliva","1 cda","aceite"]],["Pelá el zapallo en cubos y hervilo 15 minutos hasta que esté tierno.","Mientras, poné la merluza en una fuente con ajo picado, limón, sal y un hilo de aceite.","Horneá a 200 °C entre 12 y 15 minutos, hasta que el pescado se separe fácil.","Escurrí el zapallo y pisalo con sal, pimienta y un poco de nuez moscada.","Serví la merluza sobre el puré con perejil picado."]),
RB("Tortilla de papa y espinaca al horno",40,420,22,1.5,[["Huevos","5","huevo"],["Papas","2 medianas","papa"],["Espinaca","1 atado","espinaca"],["Cebolla","1","cebolla"],["Queso rallado","2 cdas","queso"]],["Cortá las papas en rodajas finas y hervilas 8 minutos. Escurrí bien.","Saltá la cebolla con la espinaca picada hasta que se reduzca.","Batí los huevos con sal, pimienta y el queso, y mezclá con la papa y la espinaca.","Volcá en una fuente aceitada y horneá a 180 °C unos 20 minutos, hasta que el centro esté firme.","Cortá en porciones y acompañá con ensalada de tomate."]),
RB("Wok de carne con arroz integral",30,560,38,1.5,[["Nalga o peceto","300 g","carne"],["Arroz integral","1 taza","arroz"],["Zanahoria","1","zanahoria"],["Morrón","1","morron"],["Cebolla","1","cebolla"],["Salsa de soja","2 cdas","soja"]],["Poné el arroz a hervir según el paquete (unos 25 minutos).","Cortá la carne en tiras finas y las verduras en bastones.","En sartén bien caliente con poco aceite, dorá la carne en tandas, 2 minutos. Retirá.","Saltá las verduras a fuego fuerte 4 minutos, que queden crocantes.","Volvé la carne, sumá la soja, mezclá un minuto y serví sobre el arroz."]),
RB("Ensalada tibia de atún, huevo y papa",20,450,34,2,[["Atún al natural","2 latas","atun"],["Huevos","3","huevo"],["Papas","2","papa"],["Tomates","2","tomate"],["Lechuga","1/2 planta","lechuga"],["Limón y aceite","a gusto","limon"]],["Hervé las papas en cubos 12 minutos y los huevos 10 minutos.","Pasá los huevos por agua fría, pelalos y cortalos en cuartos.","Lavá y cortá la lechuga y los tomates.","Mezclá todo en una fuente con el atún escurrido.","Aliñá con limón, aceite, sal y pimienta justo antes de servir."]),
RB("Hamburguesas caseras de carne y avena",30,520,40,1,[["Carne picada magra","400 g","picada"],["Avena","3 cdas","avena"],["Huevo","1","huevo"],["Cebolla","1/2","cebolla"],["Tomate y lechuga","para acompañar","tomate"],["Pan integral","2","pan"]],["Rallá o picá fina la cebolla.","Mezclá la carne con la avena, el huevo, la cebolla, sal y pimienta.","Formá 4 hamburguesas y dejalas 10 minutos en la heladera para que se afirmen.","Cocinalas a la plancha 4 a 5 minutos por lado.","Serví 2 por persona con pan integral, tomate y lechuga."]),
RB("Fideos integrales con pollo y brócoli",30,600,42,1.5,[["Fideos integrales","200 g","fideo"],["Pollo","300 g","pollo"],["Brócoli","1","brocoli"],["Ajo","2 dientes","ajo"],["Queso rallado","2 cdas","queso"],["Aceite de oliva","1 cda","aceite"]],["Hervé los fideos en agua con sal. Los últimos 4 minutos sumá el brócoli en ramitos.","Mientras, cortá el pollo en cubos y doralo en sartén con el aceite y el ajo.","Escurrí fideos y brócoli, guardando medio pocillo del agua.","Mezclá todo en la sartén con un poco del agua de cocción.","Serví con queso rallado y pimienta."]),
RB("Boniatos rellenos de pollo y choclo",50,470,32,1,[["Boniatos","2 medianos","boniato"],["Pollo cocido desmenuzado","250 g","pollo"],["Choclo en granos","1/2 lata","choclo"],["Cebolla","1","cebolla"],["Queso magro","60 g","queso"]],["Lavá los boniatos, pinchalos y horneálos a 200 °C unos 40 minutos.","Mientras, rehogá la cebolla y sumá el pollo y el choclo con sal y pimentón.","Abrí los boniatos a lo largo y aplastá un poco la pulpa.","Rellenalos con la mezcla y cubrí con el queso.","Volvé al horno 5 minutos para gratinar."]),
RB("Omelette de verduras con tostadas integrales",15,390,27,1,[["Huevos","5","huevo"],["Queso magro","60 g","queso"],["Tomate","1","tomate"],["Espinaca o cebolla","un puñado","espinaca"],["Pan integral","4 rebanadas","pan"]],["Picá la verdura y saltéala un par de minutos en sartén antiadherente.","Batí los huevos con sal y pimienta y volcalos sobre la verdura.","Cuando los bordes cuajen, poné el queso en una mitad y doblá.","Cociná un minuto más tapado.","Serví con las tostadas y el tomate en rodajas."]),
RB("Guiso de garbanzos con zapallo y espinaca",45,440,20,2,[["Garbanzos cocidos","400 g","garbanzo"],["Zapallo","300 g","zapallo"],["Espinaca","1 atado","espinaca"],["Cebolla","1","cebolla"],["Tomate triturado","1/2 caja","tomate"],["Comino y pimentón","1 cdita",""]],["Rehogá la cebolla picada con las especias 5 minutos.","Sumá el zapallo en cubos y el tomate, y cociná 10 minutos.","Agregá los garbanzos escurridos y un vaso de agua. Cociná 15 minutos más.","Incorporá la espinaca picada al final, hasta que se reduzca.","Probá de sal y serví caliente."]),
RB("Bowl de yogur, avena y fruta",5,350,20,1.5,[["Yogur natural","400 g","yogur"],["Avena","6 cdas","avena"],["Banana","1","banana"],["Manzana","1","manzana"],["Frutos secos o semillas","2 cdas",""]],["Repartí el yogur en dos bowls.","Sumá 3 cucharadas de avena a cada uno.","Cortá la banana y la manzana en cubos y ponelas arriba.","Terminá con los frutos secos o las semillas."])
];

const EJ_ENTRENO={
 mantener:{lun:{tipo:"gimnasio",min:50,desc:"cuerpo completo: sentadilla, remo, press, plancha"},mar:{tipo:"caminar",min:40,desc:"ritmo ágil"},mie:{tipo:"gimnasio",min:50,desc:"cuerpo completo B"},jue:{tipo:"",min:"",desc:""},vie:{tipo:"bici",min:45,desc:"tranquilo"},sab:{tipo:"correr",min:30,desc:"trote suave alternando con caminata"},dom:{tipo:"",min:"",desc:""}},
 musculo:{lun:{tipo:"gimnasio",min:60,desc:"pierna y glúteos"},mar:{tipo:"gimnasio",min:60,desc:"empuje: pecho, hombros, tríceps"},mie:{tipo:"caminar",min:30,desc:"suave, recuperación"},jue:{tipo:"gimnasio",min:60,desc:"tracción: espalda y bíceps"},vie:{tipo:"gimnasio",min:60,desc:"pierna B y core"},sab:{tipo:"bici",min:40,desc:"tranquilo"},dom:{tipo:"",min:"",desc:""}}
};
const EJ_COMIDAS={
 mantener:{
  lun:["Yogur con avena y banana","Milanesa de pollo al horno con ensalada","Café con leche y tostada integral con queso","Lentejas guisadas","Una fruta"],
  mar:["Café con leche y tostadas integrales con queso","Lentejas guisadas con verduras","Fruta y yogur","Tortilla de espinaca y ensalada","Puñado de frutos secos"],
  mie:["Yogur con avena y manzana","Merluza al horno con puré de zapallo","Café con leche y tostada","Wok de verduras con huevo","Una fruta"],
  jue:["Café con leche y tostadas con queso","Pollo al horno con boniato y ensalada","Fruta y yogur","Sopa de verduras y sandwich de jamón y queso","Puñado de frutos secos"],
  vie:["Yogur con avena y banana","Fideos integrales con tuco y carne picada","Café con leche y tostada","Tarta de zapallitos y ensalada","Una fruta"],
  sab:["Café con leche y tostadas","Hamburguesas caseras con ensalada","Mate con fruta","Pizza casera con verduras",""],
  dom:["Café con leche y tostadas","Asado magro con ensalada mixta","Mate con fruta","Ensalada completa con atún y huevo",""]},
 musculo:{
  lun:["Huevos revueltos (3) con tostadas integrales y café con leche","Milanesa de pollo al horno con arroz y ensalada","Licuado de leche, banana y avena","Lentejas guisadas con carne","Yogur con granola"],
  mar:["Yogur con avena, banana y maní","Wok de carne con arroz integral","Tostadas con queso y jamón y una fruta","Tortilla de papa y espinaca con ensalada","Puñado de frutos secos"],
  mie:["Huevos revueltos con tostadas y queso","Merluza al horno con puré de papa y zapallo","Licuado de leche, banana y avena","Fideos integrales con pollo y brócoli","Yogur natural"],
  jue:["Yogur con avena y fruta y 2 huevos duros","Pollo al horno con boniato y ensalada","Sandwich integral de atún","Guiso de garbanzos con carne","Puñado de frutos secos"],
  vie:["Huevos revueltos con tostadas integrales","Fideos con tuco y carne picada","Licuado de leche, banana y avena","Boniatos rellenos de pollo","Yogur con granola"],
  sab:["Café con leche, tostadas con queso y 2 huevos","Hamburguesas caseras con ensalada y papas al horno","Mate con tostadas y fruta","Pizza casera con verduras y huevo",""],
  dom:["Café con leche y tostadas con queso","Asado con ensalada mixta","Mate con fruta y yogur","Ensalada completa con atún, huevo y papa",""]}
};

/* =========================================================
   Estado y guardado
   ========================================================= */
const S={perfiles:{},meses:{},comp:{}};
/* B: capa de datos (nube o demo) · ESP: espacio actual · YO: mi miembro · ETAPA: login | espacios | app */
const PRIV_V="2026-10"; // versión de privacidad.html: si cambia, se vuelve a pedir el consentimiento
let saliendo=false;
let B=null,ESP=null,YO=null,ETAPA="cargando",SESION=null,ESPACIOS=[],MIEMBROS=[],IAEST=null;
let AI="pendiente",FOTO=false;
const GUEST=false;
const estimando=new Set();
const ui={persona:"",tab:lsGet("pp:tab")||"hoy",fechaCom:hoyStr(),semana:lunesDe(hoyStr()),cocina:lsGet("pp:cocina")||"despensa",recVista:"nuevas",rut:"entreno",ent:"historial",gen:null,compraGen:false,reest:false,baseIdeas:null,filtros:new Set(),antojo:"",alertaOk:ssGet("pp:alerta")||""};
const DUENO=()=>"";
const porciones=()=>COMPARTE()?Math.max(1,PERS.length):1;

function perfil(p){const d=S.perfiles[p]||{};return {nombre:NOMBRES[p]||d.nombre||"Persona",objetivo:d.objetivo==="musculo"?"musculo":"mantener",rutEntreno:d.rutEntreno||{},rutComidas:d.rutComidas||{},sexo:d.sexo==="h"||d.sexo==="m"?d.sexo:"",edad:+d.edad||0,peso:+d.peso||0,altura:+d.altura||0,actividad:PAL[d.actividad]?d.actividad:"depie",metaKcal:+d.metaKcal||0,metaProt:+d.metaProt||0,metaAgua:+d.metaAgua||8,pesos:Array.isArray(d.pesos)?d.pesos:[]}}
const mesKey=(p,f)=>p+"_"+f.slice(0,7);
function mesDoc(p,f){return S.meses[mesKey(p,f)]||{persona:p,mes:f.slice(0,7),comidas:{},entrenos:{},extras:{}}}
const comidasDe=(p,f)=>((mesDoc(p,f).comidas||{})[f])||[];
const entrenosDe=(p,f)=>((mesDoc(p,f).entrenos||{})[f])||[];
const extrasDe=(p,f)=>((mesDoc(p,f).extras||{})[f])||{};
const despensa=()=>(S.comp.despensa&&S.comp.despensa.items)||[];
const platos=()=>(S.comp.platos&&S.comp.platos.items)||[];
const compras=()=>(S.comp.compras&&S.comp.compras.items)||[];
const gastos=()=>(S.comp.gastos&&S.comp.gastos.items)||[];
const recetasDoc=()=>S.comp.recetas||{};
const favoritas=()=>recetasDoc().favoritas||[];
const catalogo=()=>(S.comp.catalogo&&S.comp.catalogo.items)||{};
const bloqueado=()=>false;

/* ---------- Guardado: cada cambio se sube a la nube; sin señal, queda pendiente y se reintenta ---------- */
const alcanceCocina=()=>COMPARTE()?"hogar":YO;
function aDoc(path){
  const i=path.indexOf("/"),col=path.slice(0,i),id=path.slice(i+1);
  if(col==="perfiles")return {coleccion:"perfiles",doc_id:id,miembro_id:id};
  if(col==="meses")return {coleccion:"meses",doc_id:id,miembro_id:id.slice(0,36)};
  const sc=alcanceCocina();return {coleccion:"cocina",doc_id:sc+"_"+id,miembro_id:sc==="hogar"?null:sc};
}
const colas={},enVuelo={},pendientes=new Map();
const clavePend=()=>"pp:pend:"+(ESP?ESP.espacio_id:"");
function guardarPendientes(){lsSet(clavePend(),Object.fromEntries(pendientes))}
function guardar(path,data){
  if(!B||!ESP)return;
  const e=ESP.espacio_id,d=aDoc(path);
  enVuelo[path]=(enVuelo[path]||0)+1;
  colas[path]=(colas[path]||Promise.resolve()).then(()=>B.guardarDoc(e,d.coleccion,d.doc_id,d.miembro_id,data))
    .then(()=>{if(pendientes.delete(path))guardarPendientes();estadoRed(true)})
    .catch(err=>{
      if(err&&err.codigo==="red"){pendientes.set(path,data);guardarPendientes();estadoRed(false)}
      else aviso(err&&err.message?err.message:"No se pudo guardar.");
    })
    .finally(()=>{enVuelo[path]--});
}
let enLinea=true;
function estadoRed(ok){if(enLinea!==ok){enLinea=ok;render()}}
function reintentar(){if(!pendientes.size)return;[...pendientes.entries()].forEach(([p,d])=>guardar(p,d))}
window.addEventListener("online",reintentar);
setInterval(reintentar,30000);
function ponerDoc(path,data){const [col,id]=[path.slice(0,path.indexOf("/")),path.slice(path.indexOf("/")+1)];const box=col==="perfiles"?S.perfiles:col==="meses"?S.meses:S.comp;if(data===null)delete box[id];else box[id]=data}
/* Un documento de la nube → su lugar en la app */
function deNube(coleccion,doc_id,data){
  if(coleccion==="perfiles")return "perfiles/"+doc_id;
  if(coleccion==="meses")return "meses/"+doc_id;
  const sc=alcanceCocina();if(!doc_id.startsWith(sc+"_"))return null;
  return "compartido/"+doc_id.slice(sc.length+1);
}
function cambiarMes(p,f,fn,sin){const k=mesKey(p,f);const d=clone(mesDoc(p,f));d.comidas=d.comidas||{};d.entrenos=d.entrenos||{};d.extras=d.extras||{};fn(d);S.meses[k]=d;guardar("meses/"+k,d);if(!sin)render()}
function cambiarPerfil(p,fn){const d=clone(S.perfiles[p]);fn(d);S.perfiles[p]=d;guardar("perfiles/"+p,d);render()}
function cambiarComp(k,fn,sin){const d=clone(S.comp[k]);fn(d);S.comp[k]=d;guardar("compartido/"+k,d);if(!sin)render()}

let desuscribir=null;
function suscribir(){
  if(desuscribir)desuscribir();
  desuscribir=B.suscribir(ESP.espacio_id,(coleccion,doc_id,data)=>{
    const path=deNube(coleccion,doc_id,data);if(!path)return;
    if(enVuelo[path]>0||pendientes.has(path))return; /* mi propio cambio todavía en camino: manda el mío */
    ponerDoc(path,data);pedirRender();
  });
}

/* =========================================================
   Cálculos: referencia diaria, gasto, rachas, semana, progreso
   ========================================================= */
const MET_OF=(t,i)=>((MET[t]||MET.gimnasio)[i||"media"]);
const kcalQ=(p,t,i,min)=>Math.round(MET_OF(t,i)*(perfil(p).peso||70)*(+min||0)/60/10)*10;
const entKcal=(p,e)=>isNum(e.kcalQ)?+e.kcalQ:kcalQ(p,e.tipo,e.int,e.min);
function gastoEntreno(p){let k=0;const h=hoyStr();for(let i=0;i<14;i++)entrenosDe(p,addDays(h,-i)).forEach(e=>k+=entKcal(p,e));return Math.round(k/14)}
function calcRef(d,extra){
  if(!(d.sexo&&d.edad&&d.peso&&d.altura))return null;
  const mus=d.objetivo==="musculo";
  const bmr=10*d.peso+6.25*d.altura-5*d.edad+(d.sexo==="h"?5:-161);
  return {kcal:Math.round((bmr*PAL[d.actividad||"depie"]+(extra||0)+(mus?250:0))/50)*50,prot:Math.round(d.peso*(mus?1.8:1.4)),pmin:Math.round(d.peso*(mus?1.6:1.2)),pmax:Math.round(d.peso*(mus?2.2:1.6)),extra:extra||0};
}
function metas(p){const pf=perfil(p);const r=calcRef(pf,gastoEntreno(p));
  const kcal=pf.metaKcal||(r?r.kcal:0),prot=pf.metaProt||(r?r.prot:0);
  return {ref:r,kcal,prot,manual:!!(pf.metaKcal||pf.metaProt),hay:!!(kcal||prot)}}
function racha(p){let f=hoyStr();if(!comidasDe(p,f).length)f=addDays(f,-1);let n=0;while(n<500&&comidasDe(p,f).length){n++;f=addDays(f,-1)}return n}
function semana(p,ini){
  const hoy=hoyStr();
  const dias=[...Array(7)].map((_,i)=>addDays(ini,i)).map(f=>{const c=comidasDe(p,f),e=entrenosDe(p,f),x=extrasDe(p,f);return {f,fut:f>hoy,n:c.length,kcal:sumBy(c,"kcal"),prot:sumBy(c,"prot"),veg:sumBy(c,"veg"),ultra:c.filter(z=>z.ultra).length,agua:+x.agua||0,alcohol:+x.alcohol||0,conVal:c.some(z=>isNum(z.kcal)),min:e.reduce((a,z)=>a+(+z.min||0),0),quema:e.reduce((a,z)=>a+entKcal(p,z),0),ent:e}});
  const pasados=dias.filter(d=>!d.fut).length;
  const conReg=dias.filter(d=>d.n>0).length;
  const val=dias.filter(d=>d.conVal);
  const avg=k=>val.length?sumBy(val,k)/val.length:0;
  const entrenos=dias.flatMap(d=>d.ent);
  const rut=perfil(p).rutEntreno;
  const porTipo={};entrenos.forEach(x=>porTipo[x.tipo]=(porTipo[x.tipo]||0)+1);
  const conAgua=dias.filter(d=>d.agua>0);
  return {dias,pasados,conReg,avgK:avg("kcal"),avgP:avg("prot"),avgV:conReg?sumBy(dias.filter(d=>d.n),"veg")/conReg:0,dias5:dias.filter(d=>d.veg>=5).length,avgA:conAgua.length?sumBy(conAgua,"agua")/conAgua.length:0,ultra:sumBy(dias,"ultra"),alcohol:sumBy(dias,"alcohol"),nVal:val.length,entrenos,diasEnt:dias.filter(d=>d.ent.length).length,plan:DIAS.filter(k=>rut[k]&&rut[k].tipo).length,porTipo,min:sumBy(entrenos,"min"),quema:sumBy(dias,"quema")};
}
function alertaBaja(p){
  const m=metas(p);const lim=Math.max(1200,m.kcal?m.kcal*.6:0);const h=hoyStr();let n=0,s=0;
  for(let i=1;i<=4;i++){const c=comidasDe(p,addDays(h,-i));if(c.length>=3&&c.every(x=>isNum(x.kcal))){n++;s+=sumBy(c,"kcal")}}
  return n>=3&&s/n<lim;
}
function frecuentes(p,slot){
  const m={};const h=hoyStr();
  for(let i=0;i<=30;i++)comidasDe(p,addDays(h,-i)).forEach(e=>{if(slot&&e.slot!==slot)return;const k=norm(e.texto);if(!k)return;const o=m[k]||(m[k]={k,texto:e.texto,n:0,e});o.n++;});
  return Object.values(m).filter(o=>o.n>=1).sort((a,b)=>b.n-a.n).slice(0,6);
}
const e1rm=s=>{const kg=+s.kg||0,r=+s.r||0;return kg?(r>1?kg*(1+r/30):kg):0};
function progreso(p){
  const h=hoyStr();const m={};
  for(let i=180;i>=0;i--){const f=addDays(h,-i);entrenosDe(p,f).forEach(e=>(e.ejercicios||[]).forEach(x=>{const k=norm(x.n);if(!k)return;const o=m[k]||(m[k]={nombre:x.n,ses:[]});const v=e1rm(x);o.ses.push({f,s:+x.s||0,r:+x.r||0,kg:+x.kg||0,v,score:v||(+x.r||0)})}))}
  return Object.values(m).map(o=>{o.last=o.ses[o.ses.length-1];o.first=o.ses[0];o.best=o.ses.reduce((a,b)=>b.score>a.score?b:a,o.ses[0]);return o}).sort((a,b)=>b.last.f.localeCompare(a.last.f));
}
function nombresEjercicios(p){const s=new Set();progreso(p).forEach(o=>s.add(o.nombre));return [...s]}
function ultimoGimnasio(p,antesDe){const h=antesDe||hoyStr();for(let i=0;i<120;i++){const f=addDays(h,-i);const g=entrenosDe(p,f).filter(e=>e.tipo==="gimnasio"&&(e.ejercicios||[]).length);if(g.length)return {f,e:g[g.length-1]}}return null}

/* =========================================================
   Claude: estimaciones, foto, recetas, compras
   ========================================================= */
/* Llamada a la IA del servidor. Actualiza el estado del cupo y apaga la IA si el plan llegó al tope. */
async function llamarIA(tarea,datos,signal){
  if(!B||AI!=="ok")throw new PPBackend.ErrorApp("sin_ia","La IA no está disponible.");
  try{
    const r=await B.ia(ESP.espacio_id,tarea,datos,signal);
    if(IAEST&&isNum(r.gastado)){IAEST.gastado=+r.gastado}
    return r.resultado;
  }catch(e){
    if(e&&["tope_plan","plan_vencido","espacio_suspendido","sin_permiso"].includes(e.codigo)){AI="off";FOTO=false;render()}
    if(e&&e.codigo==="plan_sin_foto"){FOTO=false;render()}
    throw e;
  }
}
const apagarIA=e=>e&&(e.codigo||e.code);
function estimarLocal(texto,cant){
  let t=" "+norm(texto)+" ";let kcal=0,prot=0,hits=0;
  const veg=Math.min(3,VEG_KEYS.filter(k=>t.includes(k)).length);
  const ultra=ULTRA_KEYS.some(k=>t.includes(k));
  for(const [k,kc,pr] of NUT){
    const re=new RegExp("(?:(\\d+(?:[.,]\\d+)?)\\s+(?:de\\s+)?)?\\b"+k.replace(/ /g,"\\s+")+"(?:e?s)?\\b","g");
    t=t.replace(re,(m,n)=>{const q=n?parseFloat(n.replace(",",".")):1;kcal+=kc*q;prot+=pr*q;hits++;return " ";});
  }
  let mult=1;const c=norm(cant);const mm=c.match(/(\d+(?:[.,]\d+)?)/);
  if(/medi[oa]/.test(c))mult=.5;else if(mm&&!/\bg\b|gr|gramos|ml|cc/.test(c))mult=parseFloat(mm[1].replace(",","."))||1;
  else if(mm&&/\bg\b|gr|gramos/.test(c))mult=Math.max(.3,parseFloat(mm[1])/250);
  if(!hits)return {kcal:400,prot:15,veg,ultra,fuente:"tabla",nota:"No reconocí el plato: corregí los valores si sabés más."};
  return {kcal:Math.round(kcal*mult/10)*10,prot:Math.round(prot*mult),veg,ultra,fuente:"tabla",nota:"Estimado con la tabla base de la app."};
}
const catKey=(texto,cant)=>norm(texto)+(cant?"|"+norm(cant):"");
function catGuardar(key,v){
  if(!key)return;
  cambiarComp("catalogo",d=>{d.items=d.items||{};d.items[key]={kcal:Math.round(+v.kcal||0),prot:Math.round(+v.prot||0),veg:r05(v.veg),ultra:!!v.ultra,t:Date.now()};
    const ks=Object.keys(d.items);if(ks.length>500)ks.sort((a,b)=>d.items[a].t-d.items[b].t).slice(0,ks.length-500).forEach(k=>delete d.items[k]);},true);
}
function normalizarEst(r){return {kcal:Math.max(0,Math.round(+r.kcal||0)),prot:Math.max(0,Math.round(+r.prot||0)),veg:Math.min(5,r05(r.veg)),ultra:r.ultra===true||r.ultra==="true",nota:String(r.nota||"").slice(0,140)}}
async function estimar(texto,cant){
  const key=catKey(texto,cant);
  if(!cant){const pl=platos().find(x=>norm(x.nombre)===norm(texto));if(pl)return {kcal:+pl.kcal||0,prot:+pl.prot||0,veg:+pl.veg||0,ultra:!!pl.ultra,fuente:"plato",nota:"Valores de tu plato guardado."}}
  const c=catalogo()[key];if(c)return {kcal:c.kcal,prot:c.prot,veg:c.veg||0,ultra:!!c.ultra,fuente:"catalogo",nota:"Mismo valor que la vez anterior, así tus números se pueden comparar."};
  if(AI==="ok"){
    try{
      const r=await llamarIA("estimar",{texto,cant:cant||""});
      if(r&&isNum(r.kcal)){const o=normalizarEst(r);o.fuente="claude";catGuardar(key,o);return o}
    }catch(e){if(e&&e.codigo!=="tope_plan")aviso((e.message||"La IA no respondió")+" Estimé con la tabla base.")}
  }
  return estimarLocal(texto,cant);
}
/* Achica la foto en el celular (≈1,2 megapíxeles, JPEG) para que suba rápido y cueste menos. */
async function fotoABase64(file,px=1200000,calidad=.82){
  const img=await new Promise((ok,mal)=>{const u=URL.createObjectURL(file);const i=new Image();i.onload=()=>{URL.revokeObjectURL(u);ok(i)};i.onerror=()=>{URL.revokeObjectURL(u);mal(new PPBackend.ErrorApp("imagen_invalida","No pude leer esa imagen. Probá con otra foto."))};i.src=u});
  const esc_=Math.min(1,Math.sqrt(px/(img.naturalWidth*img.naturalHeight||1)));
  const w=Math.max(1,Math.round(img.naturalWidth*esc_)),h=Math.max(1,Math.round(img.naturalHeight*esc_));
  const cv=document.createElement("canvas");cv.width=w;cv.height=h;cv.getContext("2d").drawImage(img,0,0,w,h);
  return cv.toDataURL("image/jpeg",calidad).split(",")[1];
}
async function estimarFoto(file){
  const imagen=await fotoABase64(file);
  const r=await llamarIA("foto",{imagen,media_type:"image/jpeg"});
  const o=normalizarEst(r||{});o.texto=String((r&&r.texto)||"").slice(0,80);o.fuente="foto";return o;
}
/* Comidas estimadas con la tabla base (por ejemplo desde el celular de una invitada) que se pueden mejorar con Claude */
const keyEst=e=>catKey(e.texto,e.porcion==="x"?e.cant:"");
function pendientesTabla(){const out=[];const h=hoyStr();for(const p of (COMPARTE()?PERS:[YO]))for(let i=0;i<30;i++){const f=addDays(h,-i);comidasDe(p,f).forEach(e=>{if(e.fuente==="tabla"&&e.texto)out.push({p,f,e})})}return out}
async function reestimar(){
  if(ui.reest||AI!=="ok")return;
  const pend=pendientesTabla();if(!pend.length)return;
  ui.reest=true;render();
  const uniq={};pend.forEach(x=>{const k=keyEst(x.e);if(!uniq[k])uniq[k]={texto:x.e.texto,cant:x.e.porcion==="x"?(x.e.cant||""):""}});
  const cat=catalogo(),res={},falta=[];
  Object.entries(uniq).forEach(([k,v])=>{if(cat[k])res[k]=cat[k];else falta.push([k,v])});
  try{
    const lote=falta.slice(0,30);
    if(lote.length){
      const r=await llamarIA("estimar_lote",{items:lote.map(([,v])=>v)});
      (Array.isArray(r)?r:[]).forEach((o,idx)=>{if(!o||!isNum(o.kcal))return;const i=isNum(o.i)?+o.i:idx;const it=lote[i];if(it)res[it[0]]=normalizarEst(o)});
      cambiarComp("catalogo",d=>{d.items=d.items||{};lote.forEach(([k])=>{const v=res[k];if(v)d.items[k]={kcal:v.kcal,prot:v.prot,veg:v.veg,ultra:!!v.ultra,t:Date.now()}})},true);
    }
    const porDoc={};pend.forEach(x=>{if(!res[keyEst(x.e)])return;const mk=mesKey(x.p,x.f);(porDoc[mk]=porDoc[mk]||{p:x.p,f:x.f,items:[]}).items.push(x)});
    let n=0;
    Object.values(porDoc).forEach(g=>cambiarMes(g.p,g.f,d=>{g.items.forEach(x=>{const e=(d.comidas[x.f]||[]).find(y=>y.id===x.e.id);if(!e||e.fuente!=="tabla")return;const v=res[keyEst(e)];const m=e.porcion==="x"?1:pm(e.porcion);
      e.kcal=Math.round(v.kcal*m);e.prot=Math.round(v.prot*m);e.veg=r05((+v.veg||0)*m);e.ultra=!!e.ultra||!!v.ultra;e.fuente="claude";e.nota="Mejorado con IA.";n++})},true));
    ui.reest=false;render();
    aviso(n?`${n} ${n===1?"comida mejorada":"comidas mejoradas"} con IA`:"No pude mejorar esas comidas. Probá de nuevo más tarde.");
  }catch(e){ui.reest=false;render();aviso(e&&e.message?e.message:"No pude mejorarlas ahora. Probá de nuevo.")}
}
function faltantes(ings){const dsp=despensa().map(x=>norm(x.nombre));return ings.filter(i=>i[2]&&!dsp.some(n=>n.includes(i[2])||i[2].includes(n))).map(i=>i[0].toLowerCase())}
function recetasBase(){
  const vistas=new Set((recetasDoc().vistas||[]).concat(ui.vistasBase||[]).map(norm));
  const mus=PERS.some(p=>perfil(p).objetivo==="musculo");
  let pool=RECETAS_BASE.filter(r=>!vistas.has(norm(r.titulo)));
  if(ui.filtros.has("rapida"))pool=pool.filter(r=>r.tiempo_min<=30);
  if(ui.filtros.has("desayuno"))pool=pool.filter(r=>/yogur|omelette/i.test(r.titulo));
  if(pool.length<5)pool=pool.concat(RECETAS_BASE.filter(r=>!pool.includes(r)));
  return pool.map(r=>({r,f:faltantes(r.ingredientes)})).sort((a,b)=>(a.f.length-b.f.length)||(mus?b.r.prot-a.r.prot:0)||Math.random()-.5).slice(0,5)
    .map(({r,f})=>({id:uid(),titulo:r.titulo,tiempo_min:r.tiempo_min,kcal:r.kcal,prot:r.prot,veg:r.veg,ingredientes:r.ingredientes.map(i=>({item:i[0],cant:i[1]})),pasos:r.pasos,faltan:f}));
}
function guardarRecetas(lista,fuente){cambiarComp("recetas",d=>{d.actuales=lista;d.fecha=hoyStr();d.fuente=fuente;d.vistas=(d.vistas||[]).concat(lista.map(r=>r.titulo)).slice(-100)})}
function normalizarReceta(x){return {id:uid(),titulo:String(x.titulo).slice(0,120),tiempo_min:Math.round(+x.tiempo_min)||30,kcal:Math.round(+x.kcal)||0,prot:Math.round(+x.prot)||0,veg:r05(x.veg),ingredientes:(x.ingredientes||[]).map(i=>typeof i==="string"?{item:i,cant:""}:{item:String(i.item||""),cant:String(i.cant||"")}),pasos:(x.pasos||[]).map(String).map(s=>s.replace(/^\d+[.)]\s*/,"")),faltan:(x.faltan||[]).map(String).slice(0,8)}}
async function generar(){
  if(ui.gen)return;
  if(AI!=="ok"){guardarRecetas(recetasBase(),"base");aviso("Recetas elegidas de la base fija");return}
  const ctl=new AbortController();ui.gen={ctl,msg:"Pensando las recetas…"};render();
  const quienes=COMPARTE()?PERS:[ui.persona];
  const datos={
    porciones:porciones(),
    despensa:despensa().map(x=>({nombre:x.nombre,cant:x.cant||""})),
    objetivos:quienes.map(p=>{const m=metas(p);return {nombre:perfil(p).nombre,objetivo:perfil(p).objetivo,kcal:m.kcal||null,prot:m.prot||null}}),
    filtros:[...ui.filtros],antojo:ui.antojo||"",
    evitar:(recetasDoc().vistas||[]).slice(-40).concat(favoritas().map(r=>r.titulo))
  };
  try{
    const r=await llamarIA("recetas",datos,ctl.signal);
    const lista=(Array.isArray(r)?r:[]).filter(x=>x&&x.titulo).slice(0,5).map(normalizarReceta);
    ui.gen=null;
    if(lista.length<3)throw new PPBackend.ErrorApp("respuesta_invalida","La IA no devolvió recetas completas.");
    ui.recVista="nuevas";guardarRecetas(lista,"claude");aviso("Listo: 5 recetas nuevas");
  }catch(e){
    ui.gen=null;
    if(e&&e.codigo==="cancelado"){render();return}
    guardarRecetas(recetasBase(),"base");
    aviso((e&&e.message?e.message+" ":"")+"Te dejo recetas de la base fija.");
  }
}
function agregarACompras(items,origen){
  let n=0;
  cambiarComp("compras",d=>{d.items=d.items||[];items.forEach(it=>{const nm=String(it.nombre||"").trim();if(!nm)return;
    const ya=d.items.find(x=>norm(x.nombre)===norm(nm)&&!x.hecho);
    if(ya){if(origen&&!(ya.origen||"").includes(origen))ya.origen=[ya.origen,origen].filter(Boolean).join(" · ").slice(0,120);return}
    d.items.push({id:uid(),nombre:nm,cant:String(it.cant||"").trim(),cat:CAT_IDS.includes(it.cat)?it.cat:"otr",hecho:false,origen:origen||""});n++;})});
  return n;
}
async function armarCompraSemana(){
  if(ui.compraGen)return;
  if(AI!=="ok"){
    const f=[];(recetasDoc().actuales||[]).forEach(r=>(r.faltan||[]).forEach(x=>f.push({nombre:x})));
    const n=agregarACompras(f,"recetas");aviso(n?`Sumé ${n} faltantes de las recetas actuales`:"Sin IA solo puedo sumar los faltantes de las recetas. No hay faltantes nuevos.");return;
  }
  const quienes=COMPARTE()?PERS:[ui.persona];
  const rutinas=quienes.map(p=>{const pf=perfil(p);return {nombre:pf.nombre,dias:DIAS.map(k=>{const d=pf.rutComidas[k]||{};return {dia:DIAS_L[k],comidas:SLOTS.filter(([s])=>d[s]).map(([s])=>({slot:s,texto:d[s]}))}}).filter(d=>d.comidas.length)}}).filter(r=>r.dias.length);
  if(!rutinas.length){aviso("Primero cargá una rutina de comidas en Rutinas.");return}
  ui.compraGen=true;render();
  try{
    const r=await llamarIA("compra",{rutinas,despensa:despensa().map(x=>({nombre:x.nombre,cant:x.cant||""}))});
    const lista=(Array.isArray(r)?r:[]).filter(x=>x&&x.nombre).slice(0,60);
    ui.compraGen=false;const n=agregarACompras(lista,"semana");aviso(n?`Lista armada: ${n} productos nuevos`:"La lista ya tenía todo eso.");
  }catch(e){ui.compraGen=false;render();aviso(e&&e.message?e.message:"No pude armar la lista ahora. Probá de nuevo.")}
}

/* =========================================================
   Avisos y render general
   ========================================================= */
let tAviso;
function aviso(msg){const t=$("#toast");t.textContent=msg;t.hidden=false;clearTimeout(tAviso);tAviso=setTimeout(()=>t.hidden=true,3800)}
let rq=false;
function pedirRender(){if(rq)return;rq=true;requestAnimationFrame(()=>{rq=false;render()})}
const ICON={
 hoy:'<circle cx="12" cy="12" r="4"/><path d="M12 2.5v2M12 19.5v2M4.6 4.6l1.4 1.4M18 18l1.4 1.4M2.5 12h2M19.5 12h2M4.6 19.4L6 18M18 6l1.4-1.4"/>',
 comidas:'<circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="4"/>',
 entrenos:'<path d="M6.5 7v10M3.5 9.5v5M17.5 7v10M20.5 9.5v5M6.5 12h11"/>',
 semana:'<rect x="3.5" y="5" width="17" height="15.5" rx="2.5"/><path d="M3.5 10h17M8 3v4M16 3v4M7.5 14h3M13.5 14h3M7.5 17.5h3"/>',
 rutinas:'<path d="M4 12a8 8 0 0113.7-5.6L20 8.5M20 4v4.5h-4.5M20 12a8 8 0 01-13.7 5.6L4 15.5M4 20v-4.5h4.5"/>',
 cocina:'<path d="M4.5 10.5h15v5.5a4 4 0 01-4 4h-7a4 4 0 01-4-4zM2.5 10.5h19M9.5 7c0-1 1-1.5 1-2.6M14 7c0-1 1-1.5 1-2.6"/>',
 resumen:'<path d="M5 20v-7M12 20V5M19 20v-10M3 20.5h18"/>'
};
const TABS=[["hoy","Hoy"],["comidas","Comidas"],["semana","Semana"],["entrenos","Entrenos"],["rutinas","Rutinas"],["cocina","Cocina"],["resumen","Resumen"]];
const PERSONALES=["hoy","comidas","entrenos","rutinas","resumen"];

function nombreApp(){return (ESP&&ESP.marca&&ESP.marca.nombre_app)||"Plato y Pulso"}
function aplicarMarca(){
  const c=ESP&&ESP.marca&&/^#[0-9a-f]{6}$/i.test(ESP.marca.color||"")?ESP.marca.color:"";
  document.documentElement.style.setProperty("--marca",c||"");
  if(c){document.documentElement.style.setProperty("--accent",c)}else document.documentElement.style.removeProperty("--accent");
  document.title=nombreApp();
  const n=nombreApp(),k=n.lastIndexOf(" y ");
  $("#logo").innerHTML=k>0?esc(n.slice(0,k))+" <i>y</i> "+esc(n.slice(k+3)):esc(n);
}
function render(){
  if(ETAPA!=="app"){renderEntrada();return}
  document.body.classList.remove("entrada");
  if(!TABS.some(t=>t[0]===ui.tab))ui.tab="hoy";
  if(!PERS.includes(ui.persona))ui.persona=YO;
  $("#who").hidden=PERS.length<2;
  $("#who").innerHTML=PERS.length>3
    ?`<label class="selwho"><span class="small muted">Viendo a</span><select id="selWho" class="inp">${PERS.map(p=>`<option value="${p}" ${ui.persona===p?"selected":""}>${esc(perfil(p).nombre)}${p===YO?" (vos)":""}</option>`).join("")}</select></label>`
    :PERS.map(p=>`<button data-a="persona" data-p="${p}" aria-pressed="${ui.persona===p}">${esc(perfil(p).nombre)}</button>`).join("");
  const sel=$("#selWho");if(sel)sel.onchange=()=>{ui.persona=sel.value;render()};
  $("#tabs").innerHTML=TABS.map(([k,l])=>`<button data-a="tab" data-t="${k}" ${ui.tab===k?'aria-current="page"':""}><svg viewBox="0 0 24 24" aria-hidden="true">${ICON[k]}</svg>${l}</button>`).join("");
  $("#sync").textContent=!enLinea||pendientes.size?`Sin conexión · ${pendientes.size} sin subir`:B.modo==="demo"?"Demo · en este navegador":AI==="off"?"En la nube · sin IA":"Guardado en la nube";
  $("#app").innerHTML=VISTAS[ui.tab]()+`<div class="feedback"><button class="btn sm" data-a="comentario">Enviar comentario</button><span class="small muted">¿Algo no anda o se te ocurre una mejora? Contanos.</span></div><p class="foot">Valores aproximados y orientativos. No reemplazan la consulta con un profesional de la salud.</p>`;
}
const vistaBloqueo=()=>"";

/* =========================================================
   Entrada: iniciar sesión y elegir espacio
   ========================================================= */
const TIPOS_ESP=[["hogar","Hogar"],["personal","Personal"]];
const entrada={email:lsGet("pp:email")||"",paso:"email",ocupado:false,error:""};
/* ---------- Anti-robots al pedir el código (Cloudflare Turnstile), solo si config.js tiene la clave ---------- */
let captchaToken="",captchaId=null,captchaJs=null;
const captchaClave=()=>(window.PP_CONFIG||{}).turnstileSiteKey||"";
function montarCaptcha(){
  const el=$("#cfTs");if(!el||!captchaClave()||!B||B.modo!=="nube")return;
  if(!captchaJs)captchaJs=new Promise((ok,mal)=>{const s=document.createElement("script");s.src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";s.async=true;s.onload=ok;s.onerror=mal;document.head.appendChild(s)});
  captchaJs.then(()=>{const t=window.turnstile;if(!t||!el.isConnected)return;
    if(captchaId!==null){try{t.remove(captchaId)}catch(e){}}
    captchaToken="";
    captchaId=t.render(el,{sitekey:captchaClave(),language:"es",theme:"auto",size:"flexible",callback:v=>{captchaToken=v},"expired-callback":()=>{captchaToken=""},"error-callback":()=>{captchaToken=""}});
  }).catch(()=>{});
}
function renderEntrada(){
  document.body.classList.add("entrada");
  $("#who").hidden=true;$("#tabs").innerHTML="";$("#sync").textContent=B&&B.modo==="demo"?"Demo":"";
  let h="";
  if(ETAPA==="cargando")h=`<div class="loading"><div class="spinner"></div><p>Cargando…</p></div>`;
  else if(ETAPA==="sinconfig")h=`<section class="sec"><h1>Falta configurar la app</h1><p class="muted">Completá <b>config.js</b> con la dirección y la clave pública de Supabase, como indica la guía. Para probarla sin servidor, abrila con <b>?demo</b> al final de la dirección.</p></section>`;
  else if(ETAPA==="sincarga")h=`<section class="sec"><h1>No se pudo cargar la app</h1><p class="muted">Revisá la conexión y volvé a abrirla. Tus datos están guardados en la nube.</p></section>`;
  else if(ETAPA==="login"){
    h=`<section class="sec hero"><p class="eyebrow">Comida, entreno y hábitos</p><h1>${esc(nombreApp())}</h1><p class="muted">Anotá lo que comés y entrenás, con estimaciones de calorías y proteínas y recetas con lo que tenés en casa.</p></section>
    <section class="card sec">${entrada.paso==="email"
      ?`<label class="fld"><span>Tu mail</span><input class="inp" id="lgE" type="email" autocomplete="email" inputmode="email" value="${esc(entrada.email)}" placeholder="nombre@correo.com"></label>
        <div id="cfTs" class="captcha"></div>
        <button class="btn pri wide" data-a="lgEnviar" ${entrada.ocupado?"disabled":""}>${entrada.ocupado?"Enviando…":B.modo==="demo"?"Entrar a la demo":"Enviarme un código"}</button>
        <p class="hint">${B.modo==="demo"?"Modo demo: los datos quedan solo en este navegador.":"Te mandamos un código de 6 números. No hace falta contraseña."}</p>`
      :`<p>Te mandamos un código a <b>${esc(entrada.email)}</b>. Revisá también la carpeta de spam.</p>
        <label class="fld"><span>Código</span><input class="inp" id="lgC" inputmode="numeric" autocomplete="one-time-code" maxlength="8" placeholder="123456"></label>
        <button class="btn pri wide" data-a="lgVerificar" ${entrada.ocupado?"disabled":""}>${entrada.ocupado?"Verificando…":"Entrar"}</button>
        <div id="cfTs" class="captcha"></div>
        <div class="row tight"><button class="link" data-a="lgOtro">Usar otro mail</button><button class="link" data-a="lgEnviar">Reenviar código</button></div>`}
      ${entrada.error?`<p class="alert small">${esc(entrada.error)}</p>`:""}
    </section>`;
  }else if(ETAPA==="privacidad"){
    h=`<section class="sec"><p class="eyebrow">${esc(SESION?SESION.email:"")}</p><h1>Antes de empezar</h1>
      <p class="muted">${esc(nombreApp())} guarda datos de salud: lo que comés, tu peso y medidas, y tus entrenamientos. Por eso necesitamos tu consentimiento expreso.</p></section>
    <section class="card sec">
      <p class="small">Resumen: tus datos se usan solo para que la app funcione. Los ven las personas de tus espacios según cómo esté configurado cada uno (en un hogar, todas las personas del hogar; en un espacio personal, solo vos). Para estimar comidas y armar recetas, el texto o la foto se envía a un servicio de IA. No vendemos tus datos. Podés borrar tu cuenta y todos tus datos cuando quieras desde Ajustes.</p>
      <p class="small"><a href="privacidad" target="_blank" rel="noopener">Leer la política de privacidad completa</a></p>
      <label class="chk"><input type="checkbox" id="pvA"> Leí y acepto la política de privacidad.</label>
      <label class="chk"><input type="checkbox" id="pvB"> Doy mi consentimiento expreso para que se traten mis datos de salud con estos fines.</label>
      <button class="btn pri wide" data-a="privAceptar" ${entrada.ocupado?"disabled":""}>${entrada.ocupado?"Guardando…":"Aceptar y seguir"}</button>
      <button class="link" data-a="salir">No acepto, cerrar sesión</button>
      ${entrada.error?`<p class="alert small">${esc(entrada.error)}</p>`:""}
    </section>`;
  }else if(ETAPA==="espacios"){
    h=`<section class="sec"><p class="eyebrow">${esc(SESION?SESION.email:"")}</p><h1>Tus espacios</h1></section>
    ${ESPACIOS.length?`<section class="pantry">${ESPACIOS.map(e=>`<button class="pitem" data-a="entrarEsp" data-id="${e.espacio_id}"><span><b>${esc(e.nombre)}</b><small style="display:block">${esc((TIPOS_ESP.find(t=>t[0]===e.tipo)||["",""])[1])} · ${e.rol==="dueno"?"dueño":e.rol}${e.estado!=="activo"?" · suspendido":""}</small></span><small>Entrar ›</small></button>`).join("")}</section>`:`<p class="coach">Para empezar, creá tu espacio (por ejemplo, tu hogar) o sumate a uno con el código que te pasaron.</p>`}
    <section class="card sec"><h2>Sumarme con un código</h2>
      <div class="two"><label class="fld"><span>Código</span><input class="inp" id="uCod" autocomplete="off" placeholder="Ej: 7F3A91C2"></label><label class="fld"><span>Tu nombre</span><input class="inp" id="uNom" autocomplete="given-name"></label></div>
      <button class="btn" data-a="unirme">Sumarme</button></section>
    <section class="card sec"><h2>Crear un espacio</h2>
      <label class="fld"><span>Nombre</span><input class="inp" id="nNom" placeholder="Ej: Casa Aldama"></label>
      <div class="fld"><span>Tipo</span><div class="opts" data-g="tipoEsp">${TIPOS_ESP.map(([v,l],i)=>`<button type="button" class="opt" data-v="${v}" aria-pressed="${i===0}">${l}</button>`).join("")}</div></div>
      <label class="fld"><span>Tu nombre</span><input class="inp" id="nYo" autocomplete="given-name"></label>
      <p class="hint">Hogar: varias personas comparten el espacio y todas ven y anotan los datos de todas. Personal: es solo para vos y nadie más se puede sumar.</p>
      <button class="btn pri" data-a="crearEsp">Crear</button></section>
    <button class="link" data-a="cerrarSesion">Cerrar sesión</button>
    ${entrada.error?`<p class="alert small">${esc(entrada.error)}</p>`:""}`;
  }
  $("#app").innerHTML=h;
  const t=$('#app [data-g="tipoEsp"]');if(t)t.addEventListener("click",e=>{const o=e.target.closest(".opt");if(!o)return;t.querySelectorAll(".opt").forEach(b=>b.setAttribute("aria-pressed",String(b===o)))});
  montarCaptcha();
  const foco=$("#lgC")||$("#lgE");if(foco&&!foco.value)setTimeout(()=>foco.focus(),50);
  ["#lgE","#lgC"].forEach(s=>{const i=$(s);if(i)i.addEventListener("keydown",e=>{if(e.key==="Enter")(s==="#lgE"?A.lgEnviar:A.lgVerificar)()})});
}

/* =========================================================
   Componentes
   ========================================================= */
function valComida(e){
  if(!isNum(e.kcal))return `<span class="pend">${estimando.has(e.id)?"estimando…":"sin estimar"}</span>`;
  return `<span class="k">~${fmtN(e.kcal)} kcal</span><span class="pr">~${fmtN(e.prot)} g prot</span><span class="tag">${e.fuente==="manual"?"corregido":e.fuente==="foto"?"por foto":"estimado"}</span>`;
}
function subComida(e){const por=e.porcion&&e.porcion!=="x"&&PORC[e.porcion]?PORC[e.porcion].l.toLowerCase():(e.cant||"");return [e.hora,por,e.grupo?"compartida":"",isNum(e.veg)&&+e.veg>0?nf1.format(e.veg)+" verd./fruta":"",e.ultra?"ultraprocesado":""].filter(Boolean).join(" · ")}
function bloqueComidas(p,f){
  const hoy=hoyStr(),hr=new Date().getHours()+new Date().getMinutes()/60,ayer=addDays(f,-1);
  return SLOTS.map(([k,l])=>{
    const items=comidasDe(p,f).filter(x=>x.slot===k).sort((a,b)=>(a.hora||"").localeCompare(b.hora||""));
    const pend=!items.length&&(f<hoy||(f===hoy&&SLOT_LIM[k]&&hr>SLOT_LIM[k]));
    const rep=!items.length&&comidasDe(p,ayer).some(x=>x.slot===k);
    return `<div class="slot"><div class="slot-h"><b>${l}${pend&&k!=="snacks"?`<span class="pdot">sin anotar</span>`:""}</b><span class="acts">${rep?`<button class="link" data-a="repetir" data-f="${f}" data-s="${k}">Repetir ayer</button>`:""}<button class="link" data-a="nuevaComida" data-f="${f}" data-s="${k}">+ Agregar</button></span></div>
      ${items.map(e=>`<button class="entry" data-a="editComida" data-f="${f}" data-id="${e.id}"><span class="et"><b>${esc(e.texto)}</b><small>${subComida(e)}</small></span><span class="ev">${valComida(e)}</span></button>`).join("")}
    </div>`;
  }).join("");
}
function tiles(p,f){
  const c=comidasDe(p,f);const k=sumBy(c,"kcal"),pr=sumBy(c,"prot");const mus=perfil(p).objetivo==="musculo";const m=metas(p);
  const bar=(v,meta,u)=>`<div class="meter"><i style="width:${Math.min(100,Math.round(v/meta*100))}%"></i></div><span class="small">de ~${fmtN(meta)}${u} · ${Math.round(v/meta*100)}%</span>`;
  const tk=`<div class="tile k"><span class="lab">Calorías</span><span class="num">~${fmtN(k)}</span>${m.kcal?bar(k,m.kcal," kcal"):`<span class="small">kcal en el día</span>`}</div>`;
  const tp=`<div class="tile p"><span class="lab">Proteínas</span><span class="num">~${fmtN(pr)}</span>${m.prot?bar(pr,m.prot," g"):`<span class="small">gramos en el día</span>`}</div>`;
  return `<div class="tiles">${mus?tp+tk:tk+tp}</div>`;
}
function bloqueCalidad(p,f){
  const c=comidasDe(p,f),x=extrasDe(p,f),pf=perfil(p);
  const veg=sumBy(c,"veg"),ul=c.filter(e=>e.ultra).length,agua=+x.agua||0,alc=+x.alcohol||0;
  const st=(k,v)=>`<div class="step"><button data-a="extra" data-k="${k}" data-n="-1" data-f="${f}" aria-label="Restar">−</button><b class="num">${v}</b><button data-a="extra" data-k="${k}" data-n="1" data-f="${f}" aria-label="Sumar">+</button></div>`;
  return `<section class="card"><div class="legend" style="margin-bottom:4px"><h2>Calidad del día</h2><span class="small muted">lo que hace a comer mejor</span></div>
    <div class="qrow"><span class="ql"><span>Verduras y frutas</span><small>se suman solas desde las comidas</small></span><span class="qv"><b class="num vg">${nf1.format(veg)}</b><span class="small muted">de 5</span></span><div class="meter veg"><i style="width:${Math.min(100,veg/5*100)}%"></i></div></div>
    <div class="qrow"><span class="ql"><span>Agua</span><small>vasos de ~250 ml · meta ${pf.metaAgua}</small></span>${st("agua",agua)}<div class="meter agua"><i style="width:${Math.min(100,agua/pf.metaAgua*100)}%"></i></div></div>
    <div class="qrow"><span class="ql"><span>Ultraprocesados</span><small>${ul?"comidas marcadas como ultraprocesadas":"ninguna comida ultraprocesada"}</small></span><span class="qv"><b class="num">${ul}</b></span></div>
    <div class="qrow"><span class="ql"><span>Alcohol</span><small>vasos o tragos</small></span>${st("alcohol",alc)}</div>
  </section>`;
}
function filaEntreno(p,e,f){
  const det=[e.km?nf1.format(e.km)+" km":"",(e.ejercicios||[]).length?(e.ejercicios.length+" ejercicios"):"",INTS.find(i=>i[0]===e.int)?INTS.find(i=>i[0]===e.int)[1].toLowerCase():"","~"+fmtN(entKcal(p,e))+" kcal"].filter(Boolean).join(" · ");
  return `<button class="entry" data-a="editEntreno" data-f="${f}" data-id="${e.id}"><span class="et"><b>${esc(TIPO_N[e.tipo]||e.tipo)}${e.desc?" · "+esc(e.desc):""}</b><small>${fechaCorta(f)} · ${det}</small></span><span class="ev"><span class="num" style="font-size:22px">${fmtN(e.min)}</span><span class="tag">min</span></span></button>`;
}
function spark(vals){
  if(vals.length<2)return "";
  const W=300,H=80,px=8,py=10,mn=Math.min(...vals),mx=Math.max(...vals),rg=Math.max(mx-mn,Math.abs(mx)*.02,.5);
  const pts=vals.map((v,i)=>[px+i*(W-2*px)/(vals.length-1),py+(1-(v-mn)/rg)*(H-2*py)]);
  return `<svg class="spark" viewBox="0 0 ${W} ${H}" aria-hidden="true"><polyline points="${pts.map(q=>q[0].toFixed(1)+","+q[1].toFixed(1)).join(" ")}"/>${pts.map((q,i)=>`<circle class="${i===pts.length-1?"last":""}" cx="${q[0].toFixed(1)}" cy="${q[1].toFixed(1)}" r="${i===pts.length-1?4.5:3}"/>`).join("")}</svg>`;
}

/* =========================================================
   Vistas
   ========================================================= */
const VISTAS={};
/* ---------- Menú semanal: un documento de cocina ("menu") con las semanas por lunes ----------
   semanas[AAAA-MM-DD del lunes][dia][slot] = {id,tipo:"receta"|"plato"|"texto",titulo,kcal,prot,veg,ingredientes,pasos,hecho}
   Las recetas se copian al menú para que no se pierdan al generar recetas nuevas. Se guardan 4 semanas de historia. */
const MENU_SLOTS=[["desayuno","Desayuno"],["almuerzo","Almuerzo"],["merienda","Merienda"],["cena","Cena"]];
const semanaMenu=lun=>((S.comp.menu&&S.comp.menu.semanas)||{})[lun]||{};
const itemMenu=(lun,dia,slot)=>((semanaMenu(lun)[dia]||{})[slot])||null;
const fechaDe=(lun,dia)=>addDays(lun,DIAS.indexOf(dia));
function cambiarMenu(lun,fn){
  cambiarComp("menu",d=>{d.semanas=d.semanas||{};const sem=d.semanas[lun]=d.semanas[lun]||{};fn(sem);
    Object.keys(sem).forEach(k=>{if(!sem[k]||!Object.keys(sem[k]).length)delete sem[k]});
    if(!Object.keys(sem).length)delete d.semanas[lun];
    const limite=addDays(lunesDe(hoyStr()),-28);Object.keys(d.semanas).forEach(k=>{if(k<limite)delete d.semanas[k]});
  });
}
const itemDeReceta=r=>({id:uid(),tipo:"receta",titulo:String(r.titulo||"").slice(0,120),kcal:+r.kcal||0,prot:+r.prot||0,veg:+r.veg||0,tiempo_min:+r.tiempo_min||0,ingredientes:(r.ingredientes||[]).slice(0,25),pasos:(r.pasos||[]).slice(0,12)});
const itemDePlato=x=>({id:uid(),tipo:"plato",titulo:String(x.nombre||"").slice(0,120),kcal:+x.kcal||0,prot:+x.prot||0,veg:+x.veg||0});
const nombreSemana=lun=>{const l0=lunesDe(hoyStr());return lun===l0?"Esta semana":lun===addDays(l0,7)?"La próxima semana":lun===addDays(l0,-7)?"La semana pasada":"Semana del "+fechaCorta(lun)};
function ponerEnMenu(lun,dia,slot,item){cambiarMenu(lun,sem=>{sem[dia]=sem[dia]||{};sem[dia][slot]=item})}
function marcarComido(lun,dia,slot){cambiarMenu(lun,sem=>{const it=(sem[dia]||{})[slot];if(it)it.hecho=true})}
function comerDelMenu(lun,dia,slot){
  const it=itemMenu(lun,dia,slot),f=fechaDe(lun,dia);if(!it||f>hoyStr())return;const fin=()=>marcarComido(lun,dia,slot);
  if(it.tipo==="texto")hojaComida({f,slot,pre:{texto:it.titulo},alGuardar:fin});
  else hojaCocinamos(it,{slot,f,alGuardar:fin});
}
function bloqueMenuHoy(lun,dk,slots){
  return `<section class="sec"><div class="sec-h"><h2>Hoy en el menú</h2><button class="link" data-a="tab" data-t="semana">Ver semana</button></div><div class="card">${slots.map(([k,l])=>{const it=itemMenu(lun,dk,k);
    return `<div class="plan"><div class="pt"><small>${l}</small>${esc(it.titulo)}</div><div class="row tight">${it.tipo==="receta"?`<button class="btn sm" data-a="menuVer" data-l="${lun}" data-d="${dk}" data-s="${k}">Receta</button>`:""}<button class="btn sm pri" data-a="menuComer" data-l="${lun}" data-d="${dk}" data-s="${k}">La comimos</button></div></div>`}).join("")}</div></section>`;
}
function hojaMenu(lun,dia,slot){
  const it=itemMenu(lun,dia,slot),favs=favoritas(),act=recetasDoc().actuales||[],pls=platos();
  const chips=(lista,src,txt)=>lista.length?`<div class="fld"><span>${txt}</span><div class="chips">${lista.map((x,i)=>`<button type="button" class="chip" data-src="${src}" data-i="${i}">${esc(x.titulo||x.nombre)}</button>`).join("")}</div></div>`:"";
  abrir(`<h2>${SLOT_N[slot]} del ${DIAS_L[dia].toLowerCase()}</h2><p class="small muted">${nombreSemana(lun)} · ${fechaCorta(fechaDe(lun,dia))}</p>
   <label class="fld"><span>¿Qué van a comer?</span><input class="inp" id="mnT" maxlength="120" value="${esc(it&&it.tipo==="texto"?it.titulo:"")}" placeholder="Ej: milanesas con puré"></label>
   <button class="btn pri wide" id="mnOk">Guardar</button>
   ${chips(favs,"fav","O elegí una receta favorita")}${chips(act,"act","Recetas generadas")}${chips(pls,"pl","Platos guardados")}
   ${!favs.length&&!act.length&&!pls.length?`<p class="hint">En Cocina › Recetas podés generar recetas y guardar favoritas para elegirlas acá con un toque. Con receta, la compra se arma sola.</p>`:""}
   ${it?`<button class="btn warn wide" id="mnX">Quitar del menú</button>`:""}`,pn=>{
    const q=x=>pn.querySelector(x),t=q("#mnT");
    const listo=item=>{ponerEnMenu(lun,dia,slot,item);cerrar();aviso(`${SLOT_N[slot]} del ${DIAS_L[dia].toLowerCase()}: ${item.titulo}`)};
    q("#mnOk").addEventListener("click",()=>{const v=t.value.trim();if(!v){aviso("Escribí qué van a comer o elegí una receta.");t.focus();return}
      listo({id:uid(),tipo:"texto",titulo:v.slice(0,120)})});
    t.addEventListener("keydown",e=>{if(e.key==="Enter")q("#mnOk").click()});
    pn.querySelectorAll(".chip[data-src]").forEach(b=>b.addEventListener("click",()=>{const i=+b.dataset.i;
      if(b.dataset.src==="pl")listo(itemDePlato(pls[i]));else listo(itemDeReceta(b.dataset.src==="fav"?favs[i]:act[i]))}));
    const x=q("#mnX");if(x)x.addEventListener("click",()=>{cambiarMenu(lun,sem=>{if(sem[dia])delete sem[dia][slot]});cerrar();aviso("Quitado del menú")});
  });
}
function hojaRecMenu(r){
  const l0=lunesDe(hoyStr()),man=addDays(hoyStr(),1),l1=addDays(l0,7);
  abrir(`<h2>Al menú</h2><p class="small muted">${esc(r.titulo)}</p>
   <div class="fld"><span>Semana</span>${opciones("sem",[[l0,"Esta"],[l1,"La próxima"]],man<l1?l0:l1)}</div>
   <div class="fld"><span>Día</span>${opciones("dia",DIAS.map(k=>[k,DIAS_L[k].slice(0,3)]),diaKey(man))}</div>
   <div class="fld"><span>Comida</span>${opciones("slot",MENU_SLOTS,"cena")}</div>
   <button class="btn pri wide" id="rmOk">Agregar</button>`,pn=>{
    pn.querySelector("#rmOk").addEventListener("click",()=>{const lun=valGrupo(pn,"sem"),dia=valGrupo(pn,"dia"),sl=valGrupo(pn,"slot");
      const ya=itemMenu(lun,dia,sl);ponerEnMenu(lun,dia,sl,itemDeReceta(r));cerrar();
      aviso(`${ya?"Reemplazada":"Agregada"}: ${SLOT_N[sl].toLowerCase()} del ${DIAS_L[dia].toLowerCase()}`)});
  });
}
function hojaRecetaMenu(it){
  abrir(`<h2>${esc(it.titulo)}</h2>
   <p class="small muted">${it.tiempo_min?`${it.tiempo_min} min · `:""}~${fmtN(it.kcal)} kcal · ~${fmtN(it.prot)} g de proteína por porción</p>
   ${(it.ingredientes||[]).length?`<div class="fld"><span>Ingredientes</span><ul class="small">${it.ingredientes.map(i=>`<li>${esc(i.item)}${i.cant?` <span class="muted">(${esc(i.cant)})</span>`:""}</li>`).join("")}</ul></div>`:""}
   ${(it.pasos||[]).length?`<div class="fld"><span>Pasos</span><ol class="small">${it.pasos.map(p=>`<li>${esc(p)}</li>`).join("")}</ol></div>`:""}`);
}
function compraDelMenu(lun){
  const sem=semanaMenu(lun),hoy=hoyStr(),dsp=despensa().map(d=>norm(d.nombre)).filter(Boolean);
  const hay=n=>dsp.some(d=>n.includes(d)||d.split(" ").some(w=>w.length>3&&n.includes(w)));
  const items=[],vistos=new Set();let sinReceta=0;
  DIAS.forEach(dia=>{if(fechaDe(lun,dia)<hoy)return;MENU_SLOTS.forEach(([k])=>{const it=(sem[dia]||{})[k];if(!it||it.hecho)return;
    if(!(it.ingredientes||[]).length){sinReceta++;return}
    it.ingredientes.forEach(i=>{const n=norm(i.item);if(!n||vistos.has(n)||hay(n))return;vistos.add(n);items.push({nombre:i.item,cant:i.cant})})})});
  const n=items.length?agregarACompras(items,"menú "+fechaCorta(lun)):0;
  aviso((n?`${n} ${n===1?"ingrediente sumado":"ingredientes sumados"} a la compra`:items.length?"Ya estaba todo en la lista":"No hay ingredientes nuevos para comprar")+(sinReceta?` · ${sinReceta} ${sinReceta===1?"comida no tiene":"comidas no tienen"} receta`:""));
}
VISTAS.semana=function(){
  const hoy=hoyStr(),lun=ui.semMenu||lunesDe(hoy),sem=semanaMenu(lun);
  const slots=MENU_SLOTS.filter(([k])=>ui.menuTodo||k==="almuerzo"||k==="cena"||DIAS.some(d=>(sem[d]||{})[k]));
  const n=DIAS.reduce((a,d)=>a+Object.keys(sem[d]||{}).length,0);
  const btn=(a,lun,dia,k,txt,cls,lab)=>`<button class="btn sm${cls?" "+cls:""}" data-a="${a}" data-l="${lun}" data-d="${dia}" data-s="${k}"${lab?` aria-label="${lab}"`:""}>${txt}</button>`;
  return `<section class="sec">
    <p class="eyebrow">${COMPARTE()&&PERS.length>1?"Menú de la casa":"Tu menú"}</p>
    <div class="datenav"><button class="arrow" data-a="semNav" data-d="-7" aria-label="Semana anterior" ${lun<=addDays(lunesDe(hoy),-28)?"disabled":""}>‹</button>
      <div class="dl"><b>${nombreSemana(lun)}</b><span class="small muted">${fechaCorta(lun)} al ${fechaCorta(addDays(lun,6))}</span></div>
      <button class="arrow" data-a="semNav" data-d="7" aria-label="Semana siguiente">›</button></div>
    <div class="row">${n?`<button class="btn pri" data-a="semCompra">Armar la compra</button>`:""}<button class="btn" data-a="semTodo">${ui.menuTodo?"Solo almuerzo y cena":"+ Desayuno y merienda"}</button></div>
    <p class="hint">${n?`${n} ${n===1?"comida planificada":"comidas planificadas"}. "Armar la compra" suma los ingredientes de las recetas que no están en la despensa.`:lun<lunesDe(hoy)?"¿Te olvidaste de anotar algo? Cargá lo que comieron y tocá \"La comimos\": se anota en ese día.":"Planificá qué van a comer cada día. Con recetas, la lista de compras se arma sola."}</p>
  </section>
  ${DIAS.map(dia=>{const f=fechaDe(lun,dia),esHoy=f===hoy,pasado=f<hoy,dd=sem[dia]||{};
    const llenos=slots.filter(([k])=>dd[k]),vacios=slots.filter(([k])=>!dd[k]);
    return `<section class="card sec menu-dia${esHoy?" hoy":""}${pasado?" pasado":""}">
      <div class="sec-h"><h3>${DIAS_L[dia]} <span class="small muted">${fechaCorta(f)}</span></h3>${esHoy?`<span class="pill">Hoy</span>`:""}</div>
      ${llenos.map(([k,l])=>{const it=dd[k];return `<div class="plan"><div class="pt"><small>${l}${it.kcal?` · ~${fmtN(it.kcal)} kcal`:""}${it.hecho?" · anotada":""}</small>${esc(it.titulo)}</div>
        <div class="row tight">${it.tipo==="receta"?btn("menuVer",lun,dia,k,"Receta"):""}${(esHoy||pasado)&&!it.hecho?btn("menuComer",lun,dia,k,"La comimos","pri"):""}${btn("menuEditar",lun,dia,k,"Cambiar","",`Cambiar ${l.toLowerCase()} del ${DIAS_L[dia].toLowerCase()}`)}</div></div>`}).join("")}
      ${vacios.length?`<div class="chips">${vacios.map(([k,l])=>`<button class="chip add" data-a="menuEditar" data-l="${lun}" data-d="${dia}" data-s="${k}">${l}</button>`).join("")}</div>`:""}
    </section>`}).join("")}`;
};

VISTAS.hoy=function(){
  const p=ui.persona,pf=perfil(p),f=hoyStr(),dk=diaKey(f);
  const c=comidasDe(p,f),e=entrenosDe(p,f),r=racha(p),mt=metas(p);
  const planE=pf.rutEntreno[dk],planC=pf.rutComidas[dk]||{};
  const protHoy=sumBy(c,"prot"),hr=new Date().getHours(),veg=sumBy(c,"veg"),agua=+extrasDe(p,f).agua||0;
  let msg;
  if(!c.length&&!e.length)msg=r>0?`Venís con ${r} ${r===1?"día":"días"} de racha. Anotá la primera comida de hoy y la seguís.`:(FOTO?"Arrancá anotando lo próximo que comas. Con la foto del plato es un toque.":"Arrancá anotando lo próximo que comas. Con eso ya empezás a ver tu semana.");
  else if(mt.prot&&hr>=17&&c.some(x=>isNum(x.prot))&&protHoy<mt.prot*.55)msg=`Vas ~${fmtN(protHoy)} g de proteína de tus ~${fmtN(mt.prot)} g. En la cena sumá una buena fuente: carne, pollo, pescado, huevos o legumbres.`;
  else if(hr>=16&&veg<2&&c.length>=2)msg="Hoy viene flojo de verdura y fruta. Una ensalada en la cena o una fruta en la merienda lo levanta.";
  else if(hr>=15&&agua<3)msg="Acordate del agua: llevás pocos vasos anotados hoy.";
  else if(e.length)msg="Entreno anotado. Ahora que la comida acompañe.";
  else if(planE&&planE.tipo)msg=`Tu rutina de hoy dice ${(TIPO_N[planE.tipo]||"").toLowerCase()}${planE.min?" "+planE.min+" min":""}. Cuando lo hagas, anotalo con un toque.`;
  else msg=`Llevás ${c.length} ${c.length===1?"comida anotada":"comidas anotadas"} hoy${r>1?` y ${r} días de racha`:""}. Buen ritmo.`;
  const lunHoy=lunesDe(f),menuHoy=MENU_SLOTS.filter(([k])=>{const it=itemMenu(lunHoy,dk,k);return it&&!it.hecho});
  const planComidas=SLOTS.filter(([k])=>planC[k]&&planC[k].trim()&&!c.some(x=>x.slot===k)&&!itemMenu(lunHoy,dk,k));
  const alerta=alertaBaja(p)&&ui.alertaOk!==p+hoyStr();
  const pendT=AI==="ok"?pendientesTabla().length:0;
  return `
  <section class="sec">
    <p class="eyebrow">${fechaLarga(f)}</p>
    <div class="sec-h"><h1>Hola, ${esc(pf.nombre)}</h1><button class="link" data-a="perfil">Mis datos</button></div>
    <div class="seg" role="group" aria-label="Objetivo">${Object.entries(OBJ).map(([k,l])=>`<button data-a="objetivo" data-o="${k}" aria-pressed="${pf.objetivo===k}">${l}</button>`).join("")}</div>
    <p class="coach">${esc(msg)}</p>
    ${alerta?`<div class="alert"><b>Los últimos días anotaste bastante poco</b><p class="small">Si es porque te olvidás de anotar algunas cosas, todo bien. Si estás comiendo así, puede dejarte sin energía para el día y el entreno. Si te pasa seguido, vale la pena charlarlo con un profesional.</p><div class="row tight"><button class="btn sm" data-a="alertaOk">Entendido</button></div></div>`:""}
    ${mt.hay?"":`<div class="card sec"><b>Completá tus datos para ver tu referencia diaria</b><p class="small muted">Con sexo, edad, peso, altura y tu actividad calculo cuántas calorías y proteínas te conviene apuntar, de forma aproximada y según tu objetivo.</p><button class="btn pri" data-a="perfil">Completar mis datos</button></div>`}
  </section>
  <section class="sec">${tiles(p,f)}
    <div class="row"><button class="btn pri" data-a="nuevaComida" data-f="${f}">+ Anotar comida</button>${FOTO?`<button class="btn" data-a="nuevaComida" data-f="${f}" data-foto="1">Desde una foto</button>`:""}</div>
    <p class="hint">Estimaciones con "~". Tocá una comida para corregirla.${r?` · Racha de registro: <b>${r} ${r===1?"día":"días"}</b>`:""}</p>
    ${AI==="off"?`<p class="hint">${IAEST&&IAEST.tope>0&&IAEST.gastado>=IAEST.tope?"Este mes se usó todo el cupo de IA del plan: las estimaciones salen de la tabla de la app hasta el mes que viene.":"Sin IA en este momento: las estimaciones salen de la tabla de la app."}</p>`:""}
    ${pendT?`<div class="card sec"><b>${pendT} ${pendT===1?"comida estimada":"comidas estimadas"} con la tabla base</b><p class="small muted">De los últimos 30 días. La IA las puede estimar mejor; las que corregiste a mano no se tocan.</p>${ui.reest?`<button class="btn" disabled><span class="spinner"></span> Mejorando…</button>`:`<button class="btn pri" data-a="reestimar">Mejorar con IA</button>`}</div>`:""}
  </section>
  <section class="card"><div class="sec-h" style="margin-bottom:6px"><h2>Comidas de hoy</h2></div>${bloqueComidas(p,f)}</section>
  ${bloqueCalidad(p,f)}
  <section class="sec">
    <div class="sec-h"><h2>Entreno de hoy</h2><button class="btn sm pri" data-a="nuevoEntreno" data-f="${f}">+ Entreno</button></div>
    ${e.length?e.map(x=>filaEntreno(p,x,f)).join(""):`<p class="empty">${planE&&planE.tipo?"Todavía no lo anotaste.":"Hoy no hay entreno en tu rutina. Si te movés igual, anotalo."}</p>`}
    ${planE&&planE.tipo&&!e.length?`<div class="card plan"><div class="pt"><small>Según tu rutina</small>${esc(TIPO_N[planE.tipo])}${planE.min?" · "+planE.min+" min":""}${planE.desc?" · "+esc(planE.desc):""}</div><button class="btn sm" data-a="hiceRutina">Lo hice</button></div>`:""}
  </section>
  ${menuHoy.length?bloqueMenuHoy(lunHoy,dk,menuHoy):""}
  ${planComidas.length?`<section class="sec"><h2>Tu plan de comidas para hoy</h2><div class="card">${planComidas.map(([k,l])=>`<div class="plan"><div class="pt"><small>${l}</small>${esc(planC[k])}</div><button class="btn sm" data-a="comiPlan" data-s="${k}">Lo comí</button></div>`).join("")}</div></section>`:""}`;
};

VISTAS.comidas=function(){
  const p=ui.persona,f=ui.fechaCom,esHoy=f===hoyStr();const pl=platos();
  return `
  <section class="sec">
    <div class="datenav"><button class="arrow" data-a="diaCom" data-d="-1" aria-label="Día anterior">‹</button>
      <div class="dl"><b>${esHoy?"Hoy":fechaLarga(f)}</b>${esHoy?`<span class="small muted">${fechaLarga(f)}</span>`:`<button class="link" data-a="diaCom" data-d="0" style="justify-self:center;min-height:32px;padding:0">Volver a hoy</button>`}</div>
      <button class="arrow" data-a="diaCom" data-d="1" aria-label="Día siguiente" ${f>=hoyStr()?"disabled":""}>›</button></div>
    ${tiles(p,f)}
    <div class="row"><button class="btn pri" data-a="nuevaComida" data-f="${f}">+ Anotar comida</button>${FOTO?`<button class="btn" data-a="nuevaComida" data-f="${f}" data-foto="1">Desde una foto</button>`:""}</div>
  </section>
  <section class="card">${bloqueComidas(p,f)}</section>
  ${bloqueCalidad(p,f)}
  <section class="sec">
    <div class="sec-h"><h2>Platos guardados</h2><span class="small muted">Compartidos · valores por porción mediana</span></div>
    ${pl.length?`<div class="pantry">${pl.slice().sort((a,b)=>a.nombre.localeCompare(b.nombre)).map(x=>`<button class="pitem" data-a="editPlato" data-id="${x.id}"><span>${esc(x.nombre)}</span><small><span class="k">~${fmtN(x.kcal)}</span> · <span class="pr">~${fmtN(x.prot)} g</span></small></button>`).join("")}</div>`:`<p class="empty">Cuando anotes una comida, marcá "Guardar en mis platos" y la vas a poder elegir con un toque la próxima vez. Las comidas que repetís también aparecen solas como frecuentes.</p>`}
  </section>`;
};

VISTAS.entrenos=function(){
  const p=ui.persona,hoy=hoyStr();
  const head=`<section class="sec"><h1>Entrenos</h1>
    <div class="seg"><button data-a="entSeg" data-e="historial" aria-pressed="${ui.ent==="historial"}">Historial</button><button data-a="entSeg" data-e="progreso" aria-pressed="${ui.ent==="progreso"}">Progreso en el gimnasio</button></div>
    <button class="btn pri wide" data-a="nuevoEntreno" data-f="${hoy}">+ Registrar entreno</button></section>`;
  if(ui.ent==="progreso"){
    const pr=progreso(p);
    return head+(pr.length?`<section class="card">${pr.map(o=>{const L=o.last,F=o.first;const usaKg=o.ses.some(s=>s.kg);const d=usaKg?(L.v-F.v):(L.r-F.r);
      return `<div class="prog"><div class="ph"><b>${esc(o.nombre)}</b><span class="small muted">${o.ses.length} ${o.ses.length===1?"sesión":"sesiones"}</span></div>
      <span class="small">Última (${fechaCorta(L.f)}): <b>${L.s||"?"}×${L.r||"?"}${L.kg?" · "+nf1.format(L.kg)+" kg":" · peso corporal"}</b></span>
      <span class="small">${usaKg?`Mejor marca estimada: <b>~${nf1.format(o.best.v)} kg</b> a 1 repetición`:`Mejor: <b>${o.best.r} repeticiones</b>`}${o.ses.length>1?` · <span class="${d>0?"up":d<0?"down":"muted"}">${d>0?"+":""}${nf1.format(d)} ${usaKg?"kg":"reps"} desde el ${fechaCorta(F.f)}</span>`:""}</span>
      ${spark(o.ses.map(s=>s.score))}</div>`}).join("")}</section><p class="hint">La marca estimada usa la fórmula de Epley a partir de peso y repeticiones. Sirve para comparar tus propias sesiones, no es un test real.</p>`:`<p class="empty">Cuando registres gimnasio con ejercicios (series, repeticiones y kilos), acá vas a ver si vas subiendo en cada uno.</p>`);
  }
  const lista=[];for(let i=0;i<90;i++){const f=addDays(hoy,-i);entrenosDe(p,f).forEach(e=>lista.push([e,f]))}
  const mesF=hoy.slice(0,7);const delMes=lista.filter(([,f])=>f.slice(0,7)===mesF);const mesN=MESES[+mesF.slice(5)-1];
  const porSem={};lista.forEach(([e,f])=>{const w=lunesDe(f);(porSem[w]=porSem[w]||[]).push([e,f])});
  return head+`<section class="tiles">
    <div class="tile g"><span class="lab muted">En ${mesN}</span><span class="num">${delMes.length}</span><span class="small muted">entrenos · ${fmtN(sumBy(delMes.map(x=>x[0]),"min"))} min</span></div>
    <div class="tile g"><span class="lab muted">Gasto en ${mesN}</span><span class="num">~${fmtN(delMes.reduce((a,[e])=>a+entKcal(p,e),0))}</span><span class="small muted">kcal por entrenar (aprox.)</span></div></section>
  ${lista.length?Object.keys(porSem).sort().reverse().map(w=>`<section class="sec"><p class="eyebrow">${w===lunesDe(hoy)?"Esta semana":"Semana del "+fechaCorta(w)}</p>${porSem[w].map(([e,f])=>filaEntreno(p,e,f)).join("")}</section>`).join(""):`<p class="empty">Todavía no hay entrenos anotados. Ejemplo: Gimnasio, 60 min, "pierna y core, me sentí bien".</p>`}`;
};

VISTAS.rutinas=function(){
  const p=ui.persona,pf=perfil(p),hk=diaKey(hoyStr());
  const esE=ui.rut==="entreno";
  const vacia=esE?!DIAS.some(k=>pf.rutEntreno[k]&&pf.rutEntreno[k].tipo):!DIAS.some(k=>pf.rutComidas[k]&&Object.values(pf.rutComidas[k]).some(v=>v&&v.trim()));
  return `
  <section class="sec">
    <h1>Rutinas de ${esc(pf.nombre)}</h1>
    <div class="seg"><button data-a="rutSeg" data-r="entreno" aria-pressed="${esE}">Entrenamiento</button><button data-a="rutSeg" data-r="comidas" aria-pressed="${!esE}">Comidas</button></div>
    ${vacia?`<p class="coach">Tu rutina ${esE?"de entreno":"de comidas"} está vacía. Podés cargar un ejemplo para "${OBJ[pf.objetivo]}" y después ajustarlo día por día.</p>`:""}
    ${!esE&&!vacia?`<p class="hint">Desde Cocina › Compras podés armar la lista del super a partir de estas rutinas.</p>`:""}
  </section>
  <section class="days">
    ${DIAS.map(k=>{
      if(esE){const d=pf.rutEntreno[k]||{};return `<button class="day ${k===hk?"today":""}" data-a="editRutE" data-d="${k}"><span class="dn">${k}</span><span class="dc">${d.tipo?`<b>${esc(TIPO_N[d.tipo])}${d.min?" · "+d.min+" min":""}</b>${d.desc?`<small>${esc(d.desc)}</small>`:""}`:`<span class="muted">Descanso</span>`}</span></button>`}
      const d=pf.rutComidas[k]||{};const fil=SLOTS.filter(([s])=>d[s]&&d[s].trim());
      return `<button class="day ${k===hk?"today":""}" data-a="editRutC" data-d="${k}"><span class="dn">${k}</span><span class="dc">${fil.length?`<span class="meals">${fil.map(([s,l])=>`<span><b>${l}</b>${esc(d[s])}</span>`).join("")}</span>`:`<span class="muted">Sin plan. Tocá para completar.</span>`}</span></button>`;
    }).join("")}
  </section>
  <button class="btn wide" data-a="ejemploRut">Cargar ejemplo para "${OBJ[pf.objetivo]}"</button>`;
};

VISTAS.cocina=function(){
  const pend=compras().filter(x=>!x.hecho).length;
  return `<section class="sec"><h1>Cocina</h1><p class="small muted">Compartida entre los dos</p>
    <div class="seg"><button data-a="cocSeg" data-c="despensa" aria-pressed="${ui.cocina==="despensa"}">Despensa</button><button data-a="cocSeg" data-c="recetas" aria-pressed="${ui.cocina==="recetas"}">Recetas</button><button data-a="cocSeg" data-c="compras" aria-pressed="${ui.cocina==="compras"}">Compras${pend?` (${pend})`:""}</button></div></section>
    ${ui.cocina==="recetas"?vistaRecetas():ui.cocina==="compras"?vistaCompras():vistaDespensa()}`;
};
function vistaDespensa(){
  const it=despensa();const tiene=new Set(it.map(x=>norm(x.nombre)));
  const faltan=BASICOS.filter(([n])=>!tiene.has(norm(n)));
  return `<section class="sec">
    <button class="btn pri wide" data-a="nuevoIng">+ Agregar ingrediente</button>
    ${faltan.length?`<div class="sec"><p class="eyebrow">Básicos para sumar con un toque</p><div class="chips">${faltan.map(([n,c])=>`<button class="chip add" data-a="basico" data-n="${esc(n)}" data-c="${c}">${esc(n)}</button>`).join("")}</div></div>`:""}
  </section>
  <section class="pantry">
    ${it.length?CATS.map(([c,l])=>{const g=it.filter(x=>(x.cat||"otr")===c).sort((a,b)=>a.nombre.localeCompare(b.nombre));return g.length?`<h3>${l}</h3>${g.map(x=>`<button class="pitem" data-a="editIng" data-id="${x.id}"><span>${esc(x.nombre)}</span><small>${esc(x.cant||"")}</small></button>`).join("")}`:""}).join(""):`<p class="empty">La despensa está vacía. Sumá lo que tienen en casa y las recetas se arman con eso. Cuando cocinen una receta, la app les pregunta qué se terminó.</p>`}
    ${it.length?`<p class="small muted" style="margin-top:6px">${it.length} ingredientes</p>`:""}
  </section>`;
}
function tarjetaReceta(r,i,src){
  const fav=favoritas().some(x=>norm(x.titulo)===norm(r.titulo));
  return `<article class="rec">
    <div class="rh"><h3>${esc(r.titulo)}</h3><button class="star" data-a="fav" data-src="${src}" data-i="${i}" aria-pressed="${fav}" aria-label="${fav?"Quitar de favoritas":"Guardar en favoritas"}">${fav?"★":"☆"}</button></div>
    <p class="meta"><b>${fmtN(r.tiempo_min)} min</b> · 2 porciones · <span class="k">~${fmtN(r.kcal)} kcal</span> y <span class="pr">~${fmtN(r.prot)} g prot</span>${r.veg?` · <span class="vg">${nf1.format(r.veg)} verd./fruta</span>`:""} por porción</p>
    ${(r.faltan||[]).length?`<p class="falta">Te falta: ${r.faltan.map(esc).join(", ")}</p>`:`<p class="ok">Tenés todo en la despensa</p>`}
    <details ${i===0&&(src==="act"||src==="base")?"open":""}><summary>Ingredientes y pasos</summary>
      <h4>Ingredientes</h4><ul>${(r.ingredientes||[]).map(x=>`<li>${esc(x.item)}${x.cant?`: ${esc(x.cant)}`:""}</li>`).join("")}</ul>
      <h4>Pasos</h4><ol>${(r.pasos||[]).map(s=>`<li>${esc(s)}</li>`).join("")}</ol>
    </details>
    <div class="row"><button class="btn sm pri" data-a="cocinamos" data-src="${src}" data-i="${i}">La cocinamos</button>${(r.faltan||[]).length?`<button class="btn sm" data-a="faltaCompra" data-src="${src}" data-i="${i}">Faltantes a la compra</button>`:""}</div>
    <div class="row"><button class="btn sm" data-a="recMenu" data-src="${src}" data-i="${i}">Al menú</button><button class="btn sm" data-a="recRutina" data-src="${src}" data-i="${i}">Agregar a la rutina</button><button class="btn sm" data-a="recPlato" data-src="${src}" data-i="${i}">Guardar en platos</button></div>
  </article>`;
}
function vistaRecetas(){
  const rd=recetasDoc();const act=rd.actuales||[];const fv=favoritas();
  const mus=PERS.some(p=>perfil(p).objetivo==="musculo");const g=ui.gen;
  const sub=`<div class="seg"><button data-a="recVista" data-v="nuevas" aria-pressed="${ui.recVista==="nuevas"}">Nuevas</button><button data-a="recVista" data-v="favoritas" aria-pressed="${ui.recVista==="favoritas"}">Favoritas (${fv.length})</button></div>`;
  if(ui.recVista==="favoritas")return `<section class="sec">${sub}${fv.length?fv.map((r,i)=>tarjetaReceta(r,i,"fav")).join(""):`<p class="empty">Tocá la estrella de una receta para guardarla acá. Las favoritas no se borran al generar recetas nuevas.</p>`}</section>`;
  if(AI==="off"){
    const bi=ui.baseIdeas;
    return `<section class="sec">${sub}
      <p class="coach">${B&&B.modo==="demo"?"En la demo no hay IA real.":"Ahora no hay IA disponible (por ejemplo, se usó el cupo del mes)."} Mientras tanto podés ver ideas de una base fija de ${RECETAS_BASE.length} platos, elegidas según la despensa.</p>
      <button class="btn wide" data-a="ideasBase">${bi?"Ver otras ideas de la base":"Ver ideas de la base fija"}</button>
    </section>
    ${bi?`<section class="sec"><div class="legend"><p class="eyebrow">Ideas de la base fija</p><button class="link" data-a="cerrarIdeas">Ocultar</button></div>${bi.map((r,i)=>tarjetaReceta(r,i,"base")).join("")}</section>`:""}
    ${act.length?`<section class="sec">${rd.fecha?`<p class="eyebrow">Generadas ${rd.fecha===hoyStr()?"hoy":"el "+fechaCorta(rd.fecha)}${rd.fuente==="base"?" · base fija":""}</p>`:""}${act.map((r,i)=>tarjetaReceta(r,i,"act")).join("")}</section>`:bi?"":`<p class="empty">Todavía no hay recetas generadas.</p>`}`;
  }
  return `<section class="sec">${sub}
    <p class="hint">${despensa().length} ingredientes en la despensa · para ${porciones()} ${porciones()===1?"persona":"personas"}${mus?" · priorizando proteína":""}${PERS.some(p=>metas(p).kcal)?" · porciones según la referencia de cada uno":""}</p>
    ${g?`<div class="card gen"><div class="row" style="align-items:center"><div class="spinner"></div><b>${esc(g.msg)}</b></div><p class="small muted">Puede tardar alrededor de un minuto.</p><button class="btn sm" data-a="pararGen">Detener</button></div>`
       :`<button class="btn pri wide" data-a="opcionesGen">${act.length?"Generar otras 5":"Generar 5 recetas"}</button>`}
  </section>
  ${act.length?`<section class="sec">${rd.fecha?`<p class="eyebrow">Generadas ${rd.fecha===hoyStr()?"hoy":"el "+fechaCorta(rd.fecha)}${rd.fuente==="base"?" · base fija":""}</p>`:""}${act.map((r,i)=>tarjetaReceta(r,i,"act")).join("")}</section>`:`<p class="empty">Cargá algunos ingredientes en la despensa y tocá "Generar 5 recetas". Podés pedir rápidas, para llevar, de horno o contar un antojo.</p>`}`;
}
/* ---------- Ticket del súper: la IA lee la foto, se revisa y se guarda en despensa, compras y gastos ----------
   La foto no se guarda: se manda a la IA y se descarta. Solo quedan los productos elegidos y el total. */
const fmtPesos=(v,m)=>(m==="USD"?"US$ ":"$ ")+(+v||0).toLocaleString("es-UY",{maximumFractionDigits:0});
function resumenGasto(){
  const mes=hoyStr().slice(0,7),g=gastos().filter(x=>String(x.fecha||"").startsWith(mes)&&x.moneda!=="USD");
  if(!g.length)return "";
  const t=g.reduce((a,x)=>a+(+x.total||0),0);
  return `<div class="card plan"><div class="pt"><small>Súper este mes</small>${fmtPesos(t)} · ${g.length} ${g.length===1?"ticket":"tickets"}</div><button class="btn sm" data-a="verGastos">Ver</button></div>`;
}
function hojaGastos(){
  const g=[...gastos()].sort((a,b)=>String(b.fecha).localeCompare(String(a.fecha)));
  const porMes={};g.forEach(x=>{if(x.moneda==="USD")return;const m=String(x.fecha||"").slice(0,7);porMes[m]=(porMes[m]||0)+(+x.total||0)});
  abrir(`<h2>Gasto en súper</h2>
   ${Object.keys(porMes).length?`<div class="fld"><span>Por mes</span>${Object.entries(porMes).slice(0,6).map(([m,t])=>`<div class="plan"><div class="pt">${esc(MESES[+m.slice(5,7)-1]||m)} ${m.slice(0,4)}</div><b>${fmtPesos(t)}</b></div>`).join("")}</div>`:""}
   <div class="fld"><span>Tickets</span>${g.slice(0,40).map(x=>`<div class="plan"><div class="pt"><small>${esc(fechaCorta(x.fecha))}${x.n?` · ${x.n} productos`:""}</small>${esc(x.comercio||"Ticket")} · ${fmtPesos(x.total,x.moneda)}</div><button class="btn sm warn" data-borrar="${x.id}">Borrar</button></div>`).join("")||`<p class="empty">Todavía no hay tickets.</p>`}</div>`,pn=>{
    pn.querySelectorAll("[data-borrar]").forEach(b=>borrarDoble(b,()=>{cambiarComp("gastos",d=>{d.items=(d.items||[]).filter(x=>x.id!==b.dataset.borrar)});cerrar();hojaGastos()},"¿Seguro?"));
  });
}
/* ---------- Comentarios de quienes prueban la app (van a la base y a una planilla de Google) ---------- */
function dispositivo(){
  const ua=navigator.userAgent;
  const so=/iPhone|iPad|iPod/.test(ua)?"iPhone/iPad":/Android/.test(ua)?"Android":/Windows/.test(ua)?"Windows":/Mac OS X/.test(ua)?"Mac":"Otro";
  const nav=/Edg\//.test(ua)?"Edge":/SamsungBrowser/.test(ua)?"Samsung":/Chrome\//.test(ua)?"Chrome":/Firefox\//.test(ua)?"Firefox":/Safari\//.test(ua)?"Safari":"otro";
  const inst=window.matchMedia&&matchMedia("(display-mode: standalone)").matches||navigator.standalone?" · instalada":"";
  return so+" · "+nav+inst;
}
function hojaComentario(){
  abrir(`<h2>Enviar comentario</h2>
   <p class="small muted">Lo leemos todo. Si algo no anda, contá qué estabas haciendo.</p>
   <div class="fld"><span>Es…</span>${opciones("tipo",[["idea","Una idea"],["problema","Algo no anda"],["otro","Otra cosa"]],"idea")}</div>
   <label class="fld"><span>Tu comentario</span><textarea class="inp" id="fbT" rows="5" maxlength="2000" placeholder="Ej: me gustaría poder…"></textarea></label>
   <button class="btn pri wide" id="fbOk">Enviar</button>`,pn=>{
    const q=x=>pn.querySelector(x),t=q("#fbT");setTimeout(()=>t.focus(),60);
    q("#fbOk").addEventListener("click",async()=>{
      const texto=t.value.trim();if(!texto){aviso("Escribí tu comentario.");t.focus();return}
      const b=q("#fbOk");b.disabled=true;b.innerHTML=`<span class="spinner"></span> Enviando…`;
      try{await B.enviarComentario({tipo:valGrupo(pn,"tipo")||"otro",texto,pantalla:ui.tab,espacio_id:ESP?ESP.espacio_id:null,dispositivo:dispositivo()});cerrar();aviso("¡Gracias! Comentario enviado.")}
      catch(e){b.disabled=false;b.textContent="Enviar";aviso(e.message||"No se pudo enviar.")}
    });
  });
}
function hojaTicket(){
  let fotos=[];
  const pintar=()=>abrir(`<h2>Cargar ticket</h2>
   <p class="small muted">Sacale una foto al ticket del súper. Si es largo, sacá hasta 3 fotos en orden. La foto no se guarda: solo los productos que elijas.</p>
   <label class="btn photo wide">${fotos.length?"Agregar otra foto":"Sacar o elegir foto"}<input type="file" id="tkF" accept="image/*" ${fotos.length?"":"multiple"} aria-label="Foto del ticket"></label>
   ${fotos.length?`<p class="small"><b>${fotos.length} ${fotos.length===1?"foto lista":"fotos listas"}</b> <button class="link" id="tkX">Empezar de nuevo</button></p><button class="btn pri wide" id="tkOk">Leer ticket</button>`:""}`,pn=>{
    const q=x=>pn.querySelector(x);
    q("#tkF").addEventListener("change",e=>{fotos=[...fotos,...e.target.files].slice(0,3);pintar()});
    const x=q("#tkX");if(x)x.addEventListener("click",()=>{fotos=[];pintar()});
    const ok=q("#tkOk");if(ok)ok.addEventListener("click",async()=>{
      ok.disabled=true;ok.innerHTML=`<span class="spinner"></span> Leyendo el ticket…`;
      try{
        const imagenes=[];for(const f of fotos)imagenes.push({imagen:await fotoABase64(f,2400000,.85),media_type:"image/jpeg"});
        const r=await llamarIA("ticket",{imagenes});
        if(!r||!r.legible||!(r.items||[]).length){aviso("No pude leer el ticket. Probá con una foto más cerca, derecha y con buena luz.");pintar();return}
        revisarTicket(r);
      }catch(e){aviso(e.message||"No se pudo leer el ticket.");pintar()}
    });
  });
  pintar();
}
function revisarTicket(r){
  const items=r.items.map((x,i)=>Object.assign({i},x));
  const coinciden=n=>compras().filter(c=>!c.hecho).filter(c=>{const a=norm(c.nombre);return a&&(n.includes(a)||a.includes(n)||a.split(" ").some(w=>w.length>3&&n.includes(w)))});
  abrir(`<h2>Revisá el ticket</h2>
   <p class="small muted">${esc(r.comercio||"Súper")}${r.fecha?` · ${esc(fechaCorta(r.fecha))}`:""}. Destildá lo que no quieras guardar y corregí los nombres si hace falta.</p>
   <div class="fld" id="tkL">${items.map(x=>`<div class="tk"><input type="checkbox" data-i="${x.i}" ${x.comida?"checked":""} aria-label="Guardar ${esc(x.nombre)}"><input class="inp" data-n="${x.i}" value="${esc(x.nombre)}" maxlength="60" aria-label="Nombre"><input class="inp" data-c="${x.i}" value="${esc(x.cant)}" maxlength="30" placeholder="cant." aria-label="Cantidad">${x.precio!==null?`<small>${fmtPesos(x.precio,r.moneda)}</small>`:"<small></small>"}</div>`).join("")}</div>
   <label class="check"><input type="checkbox" id="tkD" checked> Sumar lo marcado a la despensa</label>
   <label class="check"><input type="checkbox" id="tkC" checked> Sacar de la lista de compras lo que ya compré</label>
   <label class="check"><input type="checkbox" id="tkG" ${r.total!==null?"checked":""}> Guardar el gasto del ticket</label>
   <label class="fld"><span>Total del ticket (${r.moneda==="USD"?"US$":"$"})</span><input class="inp" id="tkT" inputmode="decimal" value="${r.total!==null?String(r.total).replace(".",","):""}"></label>
   <button class="btn pri wide" id="tkOk">Guardar</button>`,pn=>{
    const q=x=>pn.querySelector(x);
    q("#tkOk").addEventListener("click",()=>{
      const sel=items.filter(x=>q(`[data-i="${x.i}"]`).checked).map(x=>({nombre:q(`[data-n="${x.i}"]`).value.trim(),cant:q(`[data-c="${x.i}"]`).value.trim(),cat:x.cat})).filter(x=>x.nombre);
      let nD=0,nC=0;
      if(q("#tkD").checked&&sel.length)cambiarComp("despensa",d=>{d.items=d.items||[];sel.forEach(x=>{const ya=d.items.find(y=>norm(y.nombre)===norm(x.nombre));if(ya){if(x.cant)ya.cant=x.cant}else{d.items.push({id:uid(),nombre:x.nombre,cant:x.cant,cat:CAT_IDS.includes(x.cat)?x.cat:"otr"});nD++}})},true);
      if(q("#tkC").checked&&sel.length){const fuera=new Set();sel.forEach(x=>coinciden(norm(x.nombre)).forEach(c=>fuera.add(c.id)));nC=fuera.size;
        if(nC)cambiarComp("compras",d=>{d.items=(d.items||[]).filter(c=>!fuera.has(c.id))},true)}
      const tot=numIn(q("#tkT").value);
      if(q("#tkG").checked&&isNum(tot)&&tot>0)cambiarComp("gastos",d=>{d.items=d.items||[];
        d.items.push({id:uid(),fecha:r.fecha&&r.fecha<=hoyStr()?r.fecha:hoyStr(),comercio:r.comercio||"",total:Math.round(tot*100)/100,moneda:r.moneda||"UYU",n:sel.length});
        const lim=addDays(hoyStr(),-730);d.items=d.items.filter(x=>String(x.fecha)>=lim)},true);
      cerrar();render();
      aviso([nD?`${nD} ${nD===1?"producto nuevo":"productos nuevos"} en la despensa`:sel.length&&q("#tkD").checked?"Despensa actualizada":"",nC?`${nC} ${nC===1?"salió":"salieron"} de la lista de compras`:"",q("#tkG").checked&&isNum(tot)&&tot>0?`gasto de ${fmtPesos(tot,r.moneda)} guardado`:""].filter(Boolean).join(" · ")||"Listo");
    });
  });
}

function vistaCompras(){
  const it=compras();const pend=it.filter(x=>!x.hecho),hechos=it.filter(x=>x.hecho);
  const fila=x=>`<div class="buy ${x.hecho?"hecho":""}"><button class="pitem" data-a="toggleCompra" data-id="${x.id}" aria-pressed="${!!x.hecho}"><span class="box">${x.hecho?"✓":""}</span><span><span class="nm">${esc(x.nombre)}</span>${x.cant?` <small>· ${esc(x.cant)}</small>`:""}${x.origen?`<span class="org">${esc(x.origen)}</span>`:""}</span></button><button class="del" data-a="delCompra" data-id="${x.id}" aria-label="Quitar ${esc(x.nombre)}">×</button></div>`;
  return `<section class="sec">
    ${resumenGasto()}
    <div class="row"><button class="btn pri" data-a="nuevaCompra">+ Agregar</button>${FOTO?`<button class="btn" data-a="ticket">Cargar ticket</button>`:""}${ui.compraGen?`<button class="btn" disabled><span class="spinner"></span> Armando…</button>`:`<button class="btn" data-a="compraSemana">${AI==="off"?"Sumar faltantes de las recetas":"Armar compra de la semana"}</button>`}</div>
    <p class="hint">${AI==="off"?"Sin IA, el botón suma los faltantes de las recetas.":`Lee las rutinas de comidas${COMPARTE()&&PERS.length>1?" de todos":""} y lo que hay en la despensa.`}</p>
  </section>
  ${it.length?`<section class="pantry">
    ${CATS.map(([c,l])=>{const g=pend.filter(x=>(x.cat||"otr")===c);return g.length?`<h3>${l}</h3>${g.map(fila).join("")}`:""}).join("")}
    ${hechos.length?`<h3>En el carrito (${hechos.length})</h3>${hechos.map(fila).join("")}`:""}
  </section>
  <section class="sec">
    ${hechos.length?`<button class="btn pri wide" data-a="comprasADespensa">Pasar ${hechos.length} comprados a la despensa</button>`:""}
    <div class="row"><button class="btn" data-a="copiarCompras">Copiar lista para WhatsApp</button>${hechos.length?`<button class="btn" data-a="borrarHechos">Borrar comprados</button>`:""}</div>
  </section>`:`<p class="empty">La lista está vacía. Sumá cosas a mano, desde los faltantes de una receta o armala con la rutina de la semana.</p>`}`;
}

VISTAS.resumen=function(){
  const p=ui.persona,pf=perfil(p),ini=ui.semana,hoy=hoyStr();
  const s=semana(p,ini),r=racha(p),esActual=ini===lunesDe(hoy),mt=metas(p);
  const fin=addDays(ini,6);
  const etiqueta=esActual?"Esta semana":`${fechaCorta(ini)} al ${fechaCorta(fin)}`;
  const den=esActual?s.pasados:7;
  let msg;
  if(!s.conReg&&!s.entrenos.length)msg=esActual?"Semana en blanco por ahora. Anotar una comida por día ya alcanza para empezar.":"Esta semana no hay registros.";
  else if(s.conReg>=Math.max(5,den-1)&&s.plan&&s.diasEnt>=s.plan)msg="Semana redonda: registro casi diario y el plan de entrenos cumplido.";
  else if(s.plan&&s.diasEnt>=s.plan)msg=`Cumpliste el plan de entrenos (${s.diasEnt} de ${s.plan} días). Si sumás registro de comidas, la foto queda completa.`;
  else if(s.conReg>=den-1&&den>0)msg=`Constancia de primera con el registro: ${s.conReg} de ${den} días.${s.plan?` En entrenos vas ${s.diasEnt} de ${s.plan}.`:""}`;
  else msg=`Vas ${s.conReg} de ${den} días con registro. Un día más ya cambia el promedio.`;
  if(mt.prot&&s.nVal&&s.avgP<mt.prot*.8)msg+=` La proteína promedio (~${fmtN(s.avgP)} g) quedó debajo de tu referencia de ~${fmtN(mt.prot)} g: repartila en las cuatro comidas.`;
  else if(s.conReg>=3&&s.avgV<3)msg+=" Para comer mejor, el próximo paso más fácil es sumar verdura y fruta.";
  const lab=s.dias.map((d,i)=>DIAS_C[i]);
  const chart=(vals,color,meta,fmt)=>{const max=Math.max(...vals,meta||0,1);return `<div class="chart">${vals.map((v,i)=>`<div class="col ${s.dias[i].f===hoy?"hoy":""}"><span class="v">${v?(fmt?fmt(v):fmtN(v)):""}</span><div class="track"><div class="bar" style="height:${Math.round(v/max*100)}%;background:var(--${color})"></div></div><span class="d">${lab[i]}</span></div>`).join("")}${meta?`<div class="goal" style="bottom:${22+Math.round(meta/max*110)}px"><span>ref. ~${fmt?fmt(meta):fmtN(meta)}</span></div>`:""}</div>`};
  const deRef=(v,meta,u)=>meta?`de ~${fmtN(meta)}${u} (${Math.round(v/meta*100)}%)`:u.trim();
  return `
  <section class="sec">
    <h1>Resumen de ${esc(pf.nombre)}</h1>
    <div class="datenav"><button class="arrow" data-a="semana" data-d="-7" aria-label="Semana anterior">‹</button><div class="dl"><b>${etiqueta}</b><span class="small muted">${fechaCorta(ini)} – ${fechaCorta(fin)}</span></div><button class="arrow" data-a="semana" data-d="7" aria-label="Semana siguiente" ${esActual?"disabled":""}>›</button></div>
    <p class="coach">${esc(msg)}</p>
  </section>
  <section class="sec">
    <div class="legend"><h2>Constancia</h2><span class="small muted"><b class="num" style="font-size:20px;color:var(--ink)">${s.conReg}</b> de ${den||7} días con comidas anotadas</span></div>
    <div class="dots">${s.dias.map((d,i)=>`<span class="dot ${d.fut?"fut":d.n?"on":""}" title="${fechaLarga(d.f)}">${DIAS_C[i]}</span>`).join("")}</div>
  </section>
  <section class="tiles">
    <div class="tile g"><span class="lab muted">Racha actual</span><span class="num">${r}</span><span class="small muted">${r===1?"día":"días"} seguidos registrando</span></div>
    <div class="tile g"><span class="lab muted">Entrenos</span><span class="num">${s.entrenos.length}</span><span class="small muted">${fmtN(s.min)} min · ~${fmtN(s.quema)} kcal${s.plan?` · plan ${s.diasEnt}/${s.plan}`:""}</span></div>
    <div class="tile k"><span class="lab">Promedio diario</span><span class="num">~${fmtN(s.avgK)}</span><span class="small">${s.nVal?deRef(s.avgK,mt.kcal," kcal"):"kcal"}</span></div>
    <div class="tile p"><span class="lab">Promedio diario</span><span class="num">~${fmtN(s.avgP)}</span><span class="small">${s.nVal?deRef(s.avgP,mt.prot," g"):"g de proteína"}</span></div>
  </section>
  <p class="hint">Promedios sobre ${s.nVal} ${s.nVal===1?"día":"días"} con comidas estimadas. Si un día anotaste solo una parte, el promedio baja.</p>
  ${Object.keys(s.porTipo).length?`<div class="types">${Object.entries(s.porTipo).map(([t,n])=>`<span>${esc(TIPO_N[t]||t)} × ${n}</span>`).join("")}</div>`:""}
  <section class="card sec"><div class="legend"><h2>Calorías por día</h2><span class="small k">kcal ~</span></div>${chart(s.dias.map(d=>d.kcal),"kcal",mt.kcal)}</section>
  <section class="card sec"><div class="legend"><h2>Proteínas por día</h2><span class="small pr">gramos ~</span></div>${chart(s.dias.map(d=>d.prot),"prot",mt.prot)}</section>
  <section class="sec"><h2>Calidad de la semana</h2>
    <div class="tiles">
      <div class="tile v"><span class="lab">Verduras y frutas</span><span class="num">~${nf1.format(s.avgV)}</span><span class="small">porciones por día · ${s.dias5} ${s.dias5===1?"día":"días"} llegaste a 5</span></div>
      <div class="tile g"><span class="lab muted">Agua</span><span class="num">${nf1.format(s.avgA)}</span><span class="small muted">vasos por día anotado · meta ${pf.metaAgua}</span></div>
      <div class="tile g"><span class="lab muted">Ultraprocesados</span><span class="num">${s.ultra}</span><span class="small muted">comidas en la semana</span></div>
      <div class="tile g"><span class="lab muted">Alcohol</span><span class="num">${s.alcohol}</span><span class="small muted">vasos o tragos</span></div>
    </div></section>
  <section class="card sec"><div class="legend"><h2>Verduras y frutas por día</h2><span class="small vg">porciones</span></div>${chart(s.dias.map(d=>d.veg),"veg",5,v=>nf1.format(v))}</section>
  <section class="card sec"><div class="legend"><h2>Minutos de entreno</h2><span class="small" style="color:var(--accent);font-weight:700">min</span></div>${chart(s.dias.map(d=>d.min),"accent")}</section>
  ${bloquePeso(p)}`;
};
function bloquePeso(p){
  const pf=perfil(p);const ps=pf.pesos.slice().sort((a,b)=>a.f.localeCompare(b.f)).slice(-12);
  const head=`<div class="legend"><h2>Peso</h2><button class="btn sm" data-a="anotarPeso">Anotar peso</button></div>`;
  if(!ps.length)return `<section class="card sec">${head}<p class="empty">Anotá tu peso cada una o dos semanas, a la misma hora del día, y acá vas a ver la tendencia.</p></section>`;
  const last=ps[ps.length-1],first=ps[0],dif=last.kg-first.kg;
  return `<section class="card sec">${head}
    <div class="refrow"><span class="num" style="font-size:36px">${nf1.format(last.kg)} kg</span><span class="small muted">${ps.length>1?`${dif>0?"+":""}${nf1.format(dif)} kg desde el ${fechaCorta(first.f)}`:`anotado el ${fechaCorta(last.f)}`}</span></div>
    ${spark(ps.map(x=>x.kg))}${ps.length>1?`<div class="legend small muted"><span>${fechaCorta(first.f)} · ${nf1.format(first.kg)} kg</span><span>${fechaCorta(last.f)} · ${nf1.format(last.kg)} kg</span></div>`:""}</section>`;
}

/* =========================================================
   Hojas (formularios)
   ========================================================= */
const sheet=$("#sheet"),panel=$("#sheetPanel");
function abrir(html,mount){panel.innerHTML=`<button class="x" data-cerrar aria-label="Cerrar">×</button><div class="sb">${html}</div>`;sheet.hidden=false;document.body.classList.add("lock");panel.scrollTop=0;mount&&mount(panel.querySelector(".sb"))}
function cerrar(){sheet.hidden=true;panel.innerHTML="";document.body.classList.remove("lock")}
sheet.addEventListener("click",e=>{if(e.target===sheet||e.target.closest("[data-cerrar]"))cerrar()});
document.addEventListener("keydown",e=>{if(e.key==="Escape"&&!sheet.hidden)cerrar()});
panel.addEventListener("click",e=>{const o=e.target.closest(".opt");if(!o)return;const g=o.closest(".opts");g.querySelectorAll(".opt").forEach(b=>b.setAttribute("aria-pressed",String(b===o)));g.dispatchEvent(new Event("change",{bubbles:true}))});
const valGrupo=(pn,g)=>{const b=pn.querySelector(`[data-g="${g}"] [aria-pressed="true"]`);return b?b.dataset.v:""};
const setGrupo=(pn,g,v)=>pn.querySelectorAll(`[data-g="${g}"] .opt`).forEach(b=>b.setAttribute("aria-pressed",String(b.dataset.v===v)));
const opciones=(g,lista,sel)=>`<div class="opts" data-g="${g}">${lista.map(([v,l])=>`<button type="button" class="opt" data-v="${v}" aria-pressed="${v===sel}">${l}</button>`).join("")}</div>`;
function borrarDoble(btn,fn,txt){btn.addEventListener("click",()=>{if(btn.dataset.ok){fn()}else{btn.dataset.ok="1";btn.textContent=txt||"Tocá de nuevo para borrar"}})}

/* ---------- Comida ---------- */
function hojaComida({f,slot,id,pre,foto,alGuardar}){
  const p=ui.persona,comp=companeros(p),pf=perfil(p);
  const nomComp=comp.map(x=>perfil(x).nombre).join(" y ");
  const ex=id?comidasDe(p,f).find(x=>x.id===id):null;
  const v=ex?clone(ex):Object.assign({slot:slot||slotPorHora(),hora:f===hoyStr()?horaAhora():"",texto:"",porcion:"m",cant:"",kcal:null,prot:null,veg:null,ultra:false,fuente:"",nota:""},pre||{});
  if(!v.porcion||!PORC[v.porcion])v.porcion=v.cant?"x":"m";
  let base=isNum(v.kcal)?{kcal:v.kcal/pm(v.porcion),prot:(+v.prot||0)/pm(v.porcion),veg:(+v.veg||0)/pm(v.porcion)}:null;
  let fuente=v.fuente,nota=v.nota||"";
  const porOpts=Object.entries(PORC).map(([k,o])=>[k,o.l]);
  abrir(`<h2>${ex?"Editar comida":"Anotar comida"}</h2>
   <p class="small muted">${esc(pf.nombre)} · ${f===hoyStr()?"hoy":fechaLarga(f)}${ex&&ex.grupo?` · comida compartida (este cambio es solo de ${esc(pf.nombre)})`:""}</p>
   ${FOTO?`<label class="btn wide photo" id="mFotoL"><span id="mFotoT">Estimar desde una foto del plato</span><input type="file" id="mFoto" accept="image/*" capture="environment" aria-label="Elegir foto del plato"></label>`:""}
   ${opciones("slot",SLOTS,v.slot)}
   ${ex||!comp.length?"":`<div class="fld"><span>¿Para quién?</span>${opciones("para",[["yo","Solo "+pf.nombre],["dos",comp.length===1?"Para los dos":"Para todos"]],"yo")}</div>`}
   <label class="fld"><span>¿Qué comiste?</span><input class="inp" id="mT" value="${esc(v.texto)}" placeholder="Ej: milanesa de pollo al horno con ensalada" autocomplete="off"></label>
   <div class="chips" id="mChips"></div>
   <div class="fld"><span>Porción de ${esc(pf.nombre)}</span>${opciones("por",porOpts,v.porcion)}</div>
   <label class="fld" id="mCantL" ${v.porcion==="x"?"":"hidden"}><span>Cantidad</span><input class="inp" id="mC" value="${esc(v.cant||"")}" placeholder="Ej: 200 g, 2 unidades, 1 taza"></label>
   <div class="sublist" id="mPor2L" hidden>${comp.map(x=>`<div class="fld"><span>Porción de ${esc(perfil(x).nombre)}</span>${opciones("por2_"+x,porOpts.filter(o=>o[0]!=="x"),"m")}</div>`).join("")}</div>
   <label class="fld"><span>Hora</span><input class="inp" id="mH" type="time" value="${esc(v.hora)}"></label>
   <div class="estbox">
     <div class="sec-h"><b>Estimación</b><button class="btn sm" id="mEst" type="button">${AI==="off"?"Estimar con tabla base":"Estimar con IA"}</button></div>
     <div class="three"><label class="fld"><span class="k">kcal</span><span class="pre"><input class="inp" id="mK" inputmode="numeric" placeholder="—"></span></label>
     <label class="fld"><span class="pr">Prot. (g)</span><span class="pre"><input class="inp" id="mP" inputmode="numeric" placeholder="—"></span></label>
     <label class="fld"><span class="vg">Verd./fruta</span><span class="pre"><input class="inp" id="mV" inputmode="decimal" placeholder="—"></span></label></div>
     <label class="check"><input type="checkbox" id="mU" ${v.ultra?"checked":""}> Es mayormente ultraprocesado</label>
     <p class="otro" id="mOtro"></p>
     <p class="hint" id="mN">${nota?esc(nota):AI==="off"?"Sin IA: se estima con la tabla de la app. Podés corregir los valores.":"Valores aproximados para la porción elegida. Podés corregirlos. Si guardás sin estimar, se estima solo."}</p>
     <p class="hint p" id="mMus" hidden>Para tu objetivo, podés sumarle algo de proteína: huevo, yogur, atún, queso o legumbres.</p>
   </div>
   <label class="check" id="mGuardarL"><input type="checkbox" id="mG"> Guardar en mis platos para reutilizar</label>
   <div class="row"><button class="btn pri" id="mOk">${ex?"Guardar cambios":"Guardar comida"}</button>${ex?`<button class="btn warn" id="mDel">Borrar</button>`:""}</div>`,
  pn=>{
    const q=s=>pn.querySelector(s);
    const t=q("#mT"),c=q("#mC"),k=q("#mK"),pr=q("#mP"),vg=q("#mV"),ul=q("#mU"),n=q("#mN"),est=q("#mEst"),ch=q("#mChips"),gl=q("#mGuardarL"),mus=q("#mMus"),otroBox=q("#mOtro");
    const cur=()=>valGrupo(pn,"por")||"m";
    const dos=()=>valGrupo(pn,"para")==="dos";
    const verMus=()=>{mus.hidden=!(pf.objetivo==="musculo"&&isNum(pr.value)&&+pr.value<15)};
    const prev=()=>{if(!dos()||!base){otroBox.textContent="";return}otroBox.textContent=comp.map(x=>{const m2=pm(valGrupo(pn,"por2_"+x)||"m");return `${perfil(x).nombre}: ~${fmtN(base.kcal*m2)} kcal · ~${fmtN(base.prot*m2)} g prot`}).join(" · ")};
    const setInputs=()=>{if(!base){k.value="";pr.value="";vg.value="";prev();return}const m=pm(cur());k.value=Math.round(base.kcal*m);pr.value=Math.round(base.prot*m);vg.value=nf1.format(r05(base.veg*m));verMus();prev()};
    const aplicar=(r,txt)=>{base={kcal:r.kcal,prot:r.prot,veg:+r.veg||0};ul.checked=!!r.ultra;fuente=r.fuente;nota=r.nota||"";setInputs();
      n.textContent=`~${fmtN(k.value)} kcal, ~${fmtN(pr.value)} g proteína (estimado)${nota?". "+nota:""}`;if(txt)n.textContent=txt};
    const chips=()=>{const qv=norm(t.value);const pl=platos();const exist=pl.some(x=>norm(x.nombre)===qv);gl.hidden=!qv||exist;
      const fr=frecuentes(p,valGrupo(pn,"slot")).filter(o=>!qv||o.k.includes(qv)).filter(o=>o.k!==qv).slice(0,5);
      const pls=pl.filter(x=>(!qv||norm(x.nombre).includes(qv))&&norm(x.nombre)!==qv&&!fr.some(o=>o.k===norm(x.nombre))).slice(0,6);
      ch.innerHTML=(fr.length?`<span class="chiplab">Frecuentes</span>`+fr.map(o=>`<button type="button" class="chip" data-fr="${esc(o.k)}">${esc(o.texto)}${o.n>1?` <small>×${o.n}</small>`:""}</button>`).join(""):"")+(pls.length?`<span class="chiplab">Mis platos</span>`+pls.map(x=>`<button type="button" class="chip" data-id="${x.id}">${esc(x.nombre)}</button>`).join(""):"")};
    setInputs();chips();
    if(nota)n.textContent=nota;
    t.addEventListener("input",chips);
    q('[data-g="slot"]').addEventListener("change",chips);
    q('[data-g="por"]').addEventListener("change",()=>{const x=cur()==="x";q("#mCantL").hidden=!x;if(x){n.textContent="Escribí la cantidad y tocá Estimar."}setInputs()});
    const gPara=q('[data-g="para"]');if(gPara)gPara.addEventListener("change",()=>{q("#mPor2L").hidden=!dos();prev()});
    q("#mPor2L").addEventListener("change",prev);
    ch.addEventListener("click",e=>{const b=e.target.closest(".chip");if(!b)return;
      if(b.dataset.fr){const o=frecuentes(p,"").concat(frecuentes(p,valGrupo(pn,"slot"))).find(z=>z.k===b.dataset.fr);if(!o)return;const E=o.e;t.value=E.texto;
        if(isNum(E.kcal)){const m=pm(E.porcion);aplicar({kcal:E.kcal/m,prot:(+E.prot||0)/m,veg:(+E.veg||0)/m,ultra:E.ultra,fuente:"catalogo",nota:"Mismo valor que la vez anterior."})}
        if(E.porcion&&PORC[E.porcion]&&E.porcion!=="x"){setGrupo(pn,"por",E.porcion);q("#mCantL").hidden=true;setInputs()}}
      else{const x=platos().find(y=>y.id===b.dataset.id);if(!x)return;t.value=x.nombre;aplicar({kcal:+x.kcal||0,prot:+x.prot||0,veg:+x.veg||0,ultra:x.ultra,fuente:"plato",nota:"Valores de tu plato guardado."})}
      chips();
    });
    const desdeInputs=()=>{const m=pm(cur());if(!isNum(k.value)){base=null;prev();return}base={kcal:+k.value/m,prot:(numIn(pr.value)||0)/m,veg:(numIn(vg.value)||0)/m};fuente="manual";verMus();prev()};
    [k,pr,vg].forEach(i=>i.addEventListener("input",desdeInputs));
    est.addEventListener("click",async()=>{
      if(!t.value.trim()){aviso("Escribí qué comiste para poder estimar.");t.focus();return}
      const cant=cur()==="x"?c.value.trim():"";
      est.disabled=true;est.textContent="Estimando…";
      const r=await estimar(t.value.trim(),cant);
      if(!pn.isConnected)return;
      aplicar(r);est.disabled=false;est.textContent="Volver a estimar";
    });
    const fi=q("#mFoto");
    if(fi)fi.addEventListener("change",async()=>{
      const file=fi.files&&fi.files[0];if(!file)return;
      const lt=q("#mFotoT");lt.textContent="Mirando la foto…";est.disabled=true;
      try{const r=await estimarFoto(file);if(!pn.isConnected)return;
        if(!r.texto&&!r.kcal){n.textContent=r.nota||"No se ve comida en la foto.";lt.textContent="Probar con otra foto"}
        else{if(r.texto&&!t.value.trim())t.value=r.texto;setGrupo(pn,"por","m");q("#mCantL").hidden=true;aplicar(r);lt.textContent="Foto analizada · probar con otra";chips()}
      }catch(e){const cd=apagarIA(e);if(pn.isConnected){lt.textContent="Estimar desde una foto del plato";n.textContent=(e&&e.message?e.message+" ":"")+"Escribí el plato y tocá Estimar."}}
      est.disabled=false;fi.value="";
    });
    if(foto&&fi)setTimeout(()=>{try{fi.click()}catch(e){}},60);
    q("#mOk").addEventListener("click",()=>{
      const texto=t.value.trim();if(!texto){aviso("Escribí qué comiste.");t.focus();return}
      const por=cur(),cant=por==="x"?c.value.trim():"";
      const sl=valGrupo(pn,"slot")||"almuerzo",hora=q("#mH").value,ultra=ul.checked;
      const mk=(porc,keep)=>{const m=pm(porc);return Object.assign({},keep||{},{id:keep?keep.id:uid(),slot:sl,hora,texto,porcion:porc,cant:porc==="x"?cant:"",kcal:base?Math.round(base.kcal*m):null,prot:base?Math.round(base.prot*m):null,veg:base?r05(base.veg*m):null,ultra,fuente:base?(fuente||"manual"):"",nota})};
      const grupo=dos()?uid():(ex&&ex.grupo)||"";
      const e1=mk(por,ex);if(grupo)e1.grupo=grupo;
      const extra=dos()?comp.map(x=>[x,Object.assign(mk(valGrupo(pn,"por2_"+x)||"m"),{grupo})]):[];const e2=extra.length?extra:null;
      const guardarPlato=q("#mG").checked&&!gl.hidden;
      if(base&&fuente==="manual"&&por!=="x")catGuardar(catKey(texto,""),{...base,ultra});
      const agregarPlato=b=>cambiarComp("platos",d=>{d.items=d.items||[];if(!d.items.some(x=>norm(x.nombre)===norm(texto)))d.items.push({id:uid(),nombre:texto,kcal:Math.round(b.kcal),prot:Math.round(b.prot),veg:r05(b.veg),ultra})},true);
      if(guardarPlato&&base)agregarPlato(base);
      cambiarMes(p,f,d=>{const a=d.comidas[f]=(d.comidas[f]||[]).filter(x=>x.id!==e1.id);a.push(e1)},!!e2);
      extra.forEach(([x,ee],i)=>cambiarMes(x,f,d=>{(d.comidas[f]=d.comidas[f]||[]).push(ee)},i<extra.length-1));
      if(alGuardar)alGuardar();
      cerrar();
      if(!base){const lista=[[p,e1],...extra];lista.forEach(([,e])=>estimando.add(e.id));render();
        estimar(texto,cant).then(r=>{lista.forEach(([pp,e])=>{estimando.delete(e.id);const m=pm(e.porcion);
          cambiarMes(pp,f,d=>{const x=(d.comidas[f]||[]).find(y=>y.id===e.id);if(x&&!isNum(x.kcal)){x.kcal=Math.round(r.kcal*m);x.prot=Math.round(r.prot*m);x.veg=r05((+r.veg||0)*m);x.ultra=x.ultra||!!r.ultra;x.fuente=r.fuente;x.nota=r.nota}})});
          if(guardarPlato)agregarPlato(r);});}
      aviso(ex?"Comida actualizada":e2?`Guardada para ${pf.nombre} y ${nomComp}`:"Comida guardada");
    });
    const del=q("#mDel");if(del)borrarDoble(del,()=>{cambiarMes(p,f,d=>{d.comidas[f]=(d.comidas[f]||[]).filter(x=>x.id!==ex.id)});cerrar();aviso("Comida borrada")});
  });
}

/* ---------- Entreno ---------- */
function hojaEntreno({f,id,pre}){
  const p=ui.persona,pf=perfil(p);
  const ex=id?entrenosDe(p,f).find(x=>x.id===id):null;
  const v=ex?clone(ex):Object.assign({tipo:"gimnasio",int:"media",min:45,desc:"",km:"",ejercicios:[]},pre||{});
  let ejs=(v.ejercicios||[]).map(x=>({...x}));
  abrir(`<h2>${ex?"Editar entreno":"Registrar entreno"}</h2>
   <p class="small muted">${esc(pf.nombre)}</p>
   ${opciones("tipo",TIPOS,v.tipo)}
   <div class="fld"><span>Intensidad</span>${opciones("int",INTS,v.int||"media")}</div>
   <div class="two"><label class="fld"><span>Duración (min)</span><input class="inp" id="eM" inputmode="numeric" value="${esc(v.min)}"></label>
   <label class="fld"><span>Fecha</span><input class="inp" id="eF" type="date" value="${f}" max="${hoyStr()}"></label></div>
   <div class="chips" id="eChips">${[20,30,45,60,90].map(m=>`<button type="button" class="chip" data-m="${m}">${m} min</button>`).join("")}</div>
   <label class="fld" id="eKmL"><span>Distancia (km, opcional)</span><input class="inp" id="eKm" inputmode="decimal" value="${v.km?nf1.format(v.km):""}" placeholder="Ej: 4,5"></label>
   <label class="fld"><span>Descripción</span><input class="inp" id="eD" value="${esc(v.desc)}" placeholder="Ej: pierna y core, me sentí bien · 4 km tranquilo"></label>
   <div class="sublist" id="eGym">
     <div class="sec-h"><b>Ejercicios</b><button type="button" class="link" id="eCopy">Copiar del último gimnasio</button></div>
     <datalist id="dlEx">${nombresEjercicios(p).map(n=>`<option value="${esc(n)}">`).join("")}</datalist>
     <div class="exlist" id="eList"></div>
     <button type="button" class="btn sm" id="eAdd">+ Ejercicio</button>
     <p class="hint">Series × repeticiones y kilos de tu mejor serie. Con eso la app te muestra el progreso.</p>
   </div>
   <p class="otro" id="eQ"></p>
   <div class="row"><button class="btn pri" id="eOk">${ex?"Guardar cambios":"Guardar entreno"}</button>${ex?`<button class="btn warn" id="eDel">Borrar</button>`:""}</div>`,
  pn=>{
    const q=s=>pn.querySelector(s);const m=q("#eM"),list=q("#eList");
    const leerEjs=()=>{ejs=[...list.querySelectorAll(".ex")].map(r=>({n:r.querySelector(".exn input").value.trim(),s:numIn(r.querySelector("[data-k=s]").value)||"",r:numIn(r.querySelector("[data-k=r]").value)||"",kg:numIn(r.querySelector("[data-k=kg]").value)??""}))};
    const pintarEjs=()=>{list.innerHTML=ejs.map((x,i)=>`<div class="ex"><label class="exn">Ejercicio<input class="inp" list="dlEx" value="${esc(x.n||"")}" placeholder="Ej: sentadilla"></label><label>Series<input class="inp" data-k="s" inputmode="numeric" value="${esc(x.s||"")}"></label><label>Reps<input class="inp" data-k="r" inputmode="numeric" value="${esc(x.r||"")}"></label><label>Kg<input class="inp" data-k="kg" inputmode="decimal" value="${x.kg===""||x.kg===undefined?"":esc(nf1.format(x.kg))}"></label><button type="button" class="rm" data-i="${i}" aria-label="Quitar ejercicio">×</button></div>`).join("")};
    const visib=()=>{const t=valGrupo(pn,"tipo");q("#eGym").hidden=t!=="gimnasio";q("#eKmL").hidden=t==="gimnasio";calc()};
    const calc=()=>{const t=valGrupo(pn,"tipo")||"gimnasio",i=valGrupo(pn,"int")||"media",min=+m.value||0;q("#eQ").textContent=min?`~${fmtN(kcalQ(p,t,i,min))} kcal gastadas en el entreno (estimado${pf.peso?"":", con 70 kg porque no cargaste tu peso"})`:""};
    pintarEjs();visib();
    pn.addEventListener("change",e=>{if(e.target.closest('[data-g="tipo"],[data-g="int"]'))visib()});
    m.addEventListener("input",calc);
    q("#eChips").addEventListener("click",e=>{const b=e.target.closest(".chip");if(b){m.value=b.dataset.m;calc()}});
    q("#eAdd").addEventListener("click",()=>{leerEjs();ejs.push({n:"",s:3,r:10,kg:""});pintarEjs();const ins=list.querySelectorAll(".exn input");ins[ins.length-1].focus()});
    list.addEventListener("click",e=>{const b=e.target.closest(".rm");if(!b)return;leerEjs();ejs.splice(+b.dataset.i,1);pintarEjs()});
    q("#eCopy").addEventListener("click",()=>{const u=ultimoGimnasio(p,ex?addDays(f,-1):null);if(!u){aviso("No encontré un gimnasio anterior con ejercicios.");return}leerEjs();ejs=u.e.ejercicios.map(x=>({...x}));pintarEjs();if(!q("#eD").value)q("#eD").value=u.e.desc||"";aviso("Copiado del "+fechaCorta(u.f)+". Ajustá los kilos de hoy.")});
    q("#eOk").addEventListener("click",()=>{
      leerEjs();const nf2=q("#eF").value||f;const min=Math.round(+m.value);
      if(!min||min<1){aviso("Poné la duración en minutos.");m.focus();return}
      const tipo=valGrupo(pn,"tipo")||"gimnasio",int=valGrupo(pn,"int")||"media";
      const e={id:ex?ex.id:uid(),tipo,int,min,desc:q("#eD").value.trim(),km:tipo!=="gimnasio"?(numIn(q("#eKm").value)||""):"",ejercicios:tipo==="gimnasio"?ejs.filter(x=>x.n):[],kcalQ:kcalQ(p,tipo,int,min)};
      if(ex&&nf2!==f)cambiarMes(p,f,d=>{d.entrenos[f]=(d.entrenos[f]||[]).filter(x=>x.id!==ex.id)},true);
      cambiarMes(p,nf2,d=>{const a=d.entrenos[nf2]=(d.entrenos[nf2]||[]).filter(x=>x.id!==e.id);a.push(e)});
      cerrar();aviso(ex?"Entreno actualizado":"Entreno guardado. Bien ahí.");
    });
    const del=q("#eDel");if(del)borrarDoble(del,()=>{cambiarMes(p,f,d=>{d.entrenos[f]=(d.entrenos[f]||[]).filter(x=>x.id!==ex.id)});cerrar();aviso("Entreno borrado")});
  });
}

/* ---------- Perfil, peso, PIN ---------- */
function agregarPeso(d,f,kg){d.pesos=(Array.isArray(d.pesos)?d.pesos:[]).filter(x=>x.f!==f);d.pesos.push({f,kg});d.pesos.sort((a,b)=>a.f.localeCompare(b.f));d.pesos=d.pesos.slice(-120);d.peso=d.pesos[d.pesos.length-1].kg}
function hojaPerfil(){
  const p=ui.persona,pf=perfil(p),extra=gastoEntreno(p);
  abrir(`<h2>Mis datos</h2>
   <label class="fld"><span>Nombre</span><input class="inp" id="pN" value="${esc(pf.nombre)}"></label>
   <div class="fld"><span>Objetivo</span>${opciones("obj",Object.entries(OBJ),pf.objetivo)}</div>
   <div class="fld"><span>Sexo</span>${opciones("sexo",[["h","Hombre"],["m","Mujer"]],pf.sexo)}</div>
   <div class="three">
     <label class="fld"><span>Edad</span><input class="inp" id="pE" inputmode="numeric" value="${pf.edad||""}" placeholder="años"></label>
     <label class="fld"><span>Peso (kg)</span><input class="inp" id="pP" inputmode="decimal" value="${pf.peso?nf1.format(pf.peso):""}" placeholder="kg"></label>
     <label class="fld"><span>Altura (cm)</span><input class="inp" id="pA" inputmode="numeric" value="${pf.altura||""}" placeholder="cm"></label>
   </div>
   <div class="fld"><span>Actividad fuera del entreno</span>${opciones("act",ACT,pf.actividad)}<span class="hint" style="font-weight:400">Pensá en tu trabajo y tu día normal. Los entrenos se suman aparte, desde lo que anotás.</span></div>
   <div class="ref" id="pRef"></div>
   <label class="fld"><span>Meta de agua (vasos por día)</span><input class="inp" id="pW" inputmode="numeric" value="${pf.metaAgua}"></label>
   <details class="fld"><summary class="link">Ajustar mi referencia a mano (opcional)</summary>
     <p class="hint" style="margin:6px 0">Si un profesional te indicó otros números, ponelos acá y la app usa esos.</p>
     <div class="two"><label class="fld"><span class="k">Calorías por día</span><span class="pre"><input class="inp" id="pMK" inputmode="numeric" value="${pf.metaKcal||""}" placeholder="automático"></span></label>
     <label class="fld"><span class="pr">Proteínas por día (g)</span><span class="pre"><input class="inp" id="pMP" inputmode="numeric" value="${pf.metaProt||""}" placeholder="automático"></span></label></div>
   </details>
   <button class="btn pri wide" id="pOk">Guardar</button>`,pn=>{
    const q=s=>pn.querySelector(s);
    const num=id=>numIn(q(id).value)||0;
    const leer=()=>({objetivo:valGrupo(pn,"obj")||"mantener",sexo:valGrupo(pn,"sexo"),edad:num("#pE"),peso:num("#pP"),altura:num("#pA"),actividad:valGrupo(pn,"act")||"depie"});
    const pintar=()=>{const d=leer(),r=calcRef(d,extra),box=q("#pRef");
      box.innerHTML=r?`<span class="eyebrow">Tu referencia diaria aproximada</span>
        <div class="refrow"><span><span class="num k">~${fmtN(r.kcal)}</span> <span class="small">kcal</span></span><span><span class="num pr">~${fmtN(r.prot)}</span> <span class="small">g proteína</span></span></div>
        <span class="small">Proteína entre ~${r.pmin} y ~${r.pmax} g según el día. ${d.objetivo==="musculo"?"Incluye un extra de energía para ganar músculo.":"Pensada para mantener el peso."} Suma ~${fmtN(extra)} kcal por día de tus entrenos de las últimas 2 semanas.</span>
        <span class="small muted">Fórmula estándar (Mifflin-St Jeor) más tu actividad. Es orientativa, no una indicación médica.</span>`
        :`<span class="small">Completá sexo, edad, peso y altura y te muestro acá la referencia de calorías y proteínas.</span>`};
    pintar();pn.addEventListener("input",pintar);pn.addEventListener("change",pintar);
    q("#pOk").addEventListener("click",async()=>{
      const d=leer();const n=q("#pN").value.trim().slice(0,60)||pf.nombre;
      if(d.edad&&(d.edad<15||d.edad>100)){aviso("Revisá la edad: tiene que estar entre 15 y 100 años.");return}
      if(d.peso&&(d.peso<30||d.peso>300)){aviso("Revisá el peso: poné los kilos, por ejemplo 78,5.");return}
      if(d.altura&&(d.altura<120||d.altura>230)){aviso("Revisá la altura: va en centímetros, por ejemplo 175.");return}
      const mk=Math.round(num("#pMK")),mp=Math.round(num("#pMP")),w=Math.round(num("#pW"));
      cambiarPerfil(p,x=>{x.nombre=n;x.objetivo=d.objetivo;x.sexo=d.sexo;x.actividad=d.actividad;x.edad=Math.round(d.edad)||"";x.altura=Math.round(d.altura)||"";x.metaKcal=mk>0?mk:"";x.metaProt=mp>0?mp:"";x.metaAgua=w>0&&w<30?w:8;
        if(d.peso&&Math.abs(d.peso-(+x.peso||0))>=.05)agregarPeso(x,hoyStr(),Math.round(d.peso*10)/10);});
      if(n!==pf.nombre){NOMBRES[p]=n;B.renombrarMiembro(p,n).catch(e=>aviso(e.message))}
      cerrar();aviso("Datos guardados");
    });
  });
}
function hojaPeso(){
  const p=ui.persona,pf=perfil(p);
  abrir(`<h2>Anotar peso</h2>
   <p class="small muted">${esc(pf.nombre)} · conviene pesarse a la misma hora, por ejemplo en ayunas.</p>
   <div class="two"><label class="fld"><span>Peso (kg)</span><input class="inp" id="wK" inputmode="decimal" value="${pf.peso?nf1.format(pf.peso):""}" placeholder="Ej: 78,5"></label>
   <label class="fld"><span>Fecha</span><input class="inp" id="wF" type="date" value="${hoyStr()}" max="${hoyStr()}"></label></div>
   <button class="btn pri wide" id="wOk">Guardar peso</button>`,pn=>{
    pn.querySelector("#wOk").addEventListener("click",()=>{const kg=numIn(pn.querySelector("#wK").value);const f=pn.querySelector("#wF").value||hoyStr();
      if(!kg||kg<30||kg>300){aviso("Poné el peso en kilos, por ejemplo 78,5.");return}
      cambiarPerfil(p,x=>agregarPeso(x,f,Math.round(kg*10)/10));cerrar();aviso("Peso anotado")});
  });
}
/* ---------- Rutinas ---------- */
function hojaRutE(k){
  const p=ui.persona,d=perfil(p).rutEntreno[k]||{};
  abrir(`<h2>${DIAS_L[k]} · entreno</h2>
   ${opciones("tipo",[["","Descanso"],...TIPOS],d.tipo||"")}
   <label class="fld"><span>Duración (minutos)</span><input class="inp" id="rM" inputmode="numeric" value="${esc(d.min||"")}" placeholder="Ej: 60"></label>
   <label class="fld"><span>Qué vas a hacer</span><input class="inp" id="rD" value="${esc(d.desc||"")}" placeholder="Ej: pierna, 5 ejercicios"></label>
   <button class="btn pri wide" id="rOk">Guardar ${DIAS_L[k].toLowerCase()}</button>`,pn=>{
    pn.querySelector("#rOk").addEventListener("click",()=>{const tipo=valGrupo(pn,"tipo");cambiarPerfil(p,x=>{x.rutEntreno=x.rutEntreno||{};x.rutEntreno[k]=tipo?{tipo,min:Math.round(+pn.querySelector("#rM").value)||"",desc:pn.querySelector("#rD").value.trim()}:{tipo:"",min:"",desc:""}});cerrar()});
  });
}
function hojaRutC(k){
  const p=ui.persona,d=perfil(p).rutComidas[k]||{};
  const sug=[...new Set(favoritas().map(r=>r.titulo).concat(platos().map(x=>x.nombre)))];
  abrir(`<h2>${DIAS_L[k]} · comidas</h2>
   <datalist id="dlFav">${sug.map(s=>`<option value="${esc(s)}">`).join("")}</datalist>
   ${SLOTS.map(([s,l])=>`<label class="fld"><span>${l}</span><input class="inp" data-s="${s}" list="dlFav" value="${esc(d[s]||"")}" placeholder="Opcional"></label>`).join("")}
   ${sug.length?`<p class="hint">Al escribir te sugiere tus recetas favoritas y platos guardados.</p>`:""}
   <button class="btn pri wide" id="rOk">Guardar ${DIAS_L[k].toLowerCase()}</button>`,pn=>{
    pn.querySelector("#rOk").addEventListener("click",()=>{const o={};pn.querySelectorAll("[data-s]").forEach(i=>o[i.dataset.s]=i.value.trim());cambiarPerfil(p,x=>{x.rutComidas=x.rutComidas||{};x.rutComidas[k]=o});cerrar()});
  });
}
function hojaEjemplo(){
  const p=ui.persona,pf=perfil(p),esE=ui.rut==="entreno";
  const ej=esE?EJ_ENTRENO[pf.objetivo]:EJ_COMIDAS[pf.objetivo];
  const prev=esE?DIAS.map(k=>`<li><b>${DIAS_L[k]}:</b> ${ej[k].tipo?esc(TIPO_N[ej[k].tipo])+" "+ej[k].min+" min · "+esc(ej[k].desc):"descanso"}</li>`).join(""):DIAS.map(k=>`<li><b>${DIAS_L[k]}:</b> ${esc(ej[k][1])}</li>`).join("");
  abrir(`<h2>Ejemplo de rutina ${esE?"de entreno":"de comidas"}</h2>
   <p class="small muted">Para "${OBJ[pf.objetivo]}". Es un punto de partida orientativo: después ajustás cada día.${esE?"":" Abajo ves los almuerzos; cada día trae las 5 comidas."}</p>
   <ul style="margin:0;padding-left:20px;display:grid;gap:4px">${prev}</ul>
   <p class="hint">Esto reemplaza la rutina ${esE?"de entreno":"de comidas"} actual de ${esc(pf.nombre)}.</p>
   <button class="btn pri wide" id="xOk">Usar este ejemplo</button>`,pn=>{
    pn.querySelector("#xOk").addEventListener("click",()=>{cambiarPerfil(p,x=>{if(esE)x.rutEntreno=clone(ej);else{x.rutComidas={};DIAS.forEach(k=>{const o={};SLOTS.forEach(([s],i)=>o[s]=ej[k][i]||"");x.rutComidas[k]=o})}});cerrar();aviso("Rutina cargada")});
  });
}

/* ---------- Despensa, platos, compras ---------- */
function hojaIng(id){
  const ex=id?despensa().find(x=>x.id===id):null;
  const v=ex||{nombre:"",cant:"",cat:"prot"};
  abrir(`<h2>${ex?"Editar ingrediente":"Agregar ingrediente"}</h2>
   <label class="fld"><span>Ingrediente</span><input class="inp" id="iN" value="${esc(v.nombre)}" placeholder="Ej: supremas de pollo"></label>
   <label class="fld"><span>Cantidad (opcional)</span><input class="inp" id="iC" value="${esc(v.cant||"")}" placeholder="Ej: 1 kg, 6 unidades, medio paquete"></label>
   <div class="fld"><span>Categoría</span>${opciones("cat",CATS,v.cat||"otr")}</div>
   <div class="row"><button class="btn pri" id="iOk">${ex?"Guardar":"Agregar"}</button>${ex?`<button class="btn warn" id="iDel">Quitar de la despensa</button>`:""}</div>
   ${ex?`<button class="btn wide" id="iBuy">Se está terminando: pasar a la compra</button>`:""}`,pn=>{
    const q=s=>pn.querySelector(s);
    q("#iOk").addEventListener("click",()=>{const n=q("#iN").value.trim();if(!n){aviso("Escribí el ingrediente.");return}
      const it={id:ex?ex.id:uid(),nombre:n,cant:q("#iC").value.trim(),cat:valGrupo(pn,"cat")||"otr"};
      cambiarComp("despensa",d=>{d.items=(d.items||[]).filter(x=>x.id!==it.id);d.items.push(it)});cerrar();aviso(ex?"Ingrediente actualizado":"Agregado a la despensa")});
    const del=q("#iDel");if(del)del.addEventListener("click",()=>{cambiarComp("despensa",d=>{d.items=(d.items||[]).filter(x=>x.id!==ex.id)});cerrar();aviso("Quitado de la despensa")});
    const buy=q("#iBuy");if(buy)buy.addEventListener("click",()=>{agregarACompras([{nombre:ex.nombre,cat:ex.cat}],"se termina");cerrar();aviso("Sumado a la lista de compras")});
  });
}
function hojaPlato(id){
  const x=platos().find(y=>y.id===id);if(!x)return;
  abrir(`<h2>Plato guardado</h2>
   <p class="small muted">Valores para una porción mediana. Al anotarlo elegís chica, mediana o grande.</p>
   <label class="fld"><span>Nombre</span><input class="inp" id="qN" value="${esc(x.nombre)}"></label>
   <div class="three"><label class="fld"><span class="k">kcal</span><span class="pre"><input class="inp" id="qK" inputmode="numeric" value="${esc(x.kcal)}"></span></label>
   <label class="fld"><span class="pr">Prot. (g)</span><span class="pre"><input class="inp" id="qP" inputmode="numeric" value="${esc(x.prot)}"></span></label>
   <label class="fld"><span class="vg">Verd./fruta</span><span class="pre"><input class="inp" id="qV" inputmode="decimal" value="${esc(nf1.format(+x.veg||0))}"></span></label></div>
   <label class="check"><input type="checkbox" id="qU" ${x.ultra?"checked":""}> Es mayormente ultraprocesado</label>
   <div class="row"><button class="btn pri" id="qUse">Anotar como comida</button><button class="btn" id="qOk">Guardar cambios</button></div>
   <button class="btn warn wide" id="qDel">Quitar de la lista</button>`,pn=>{
    const q=s=>pn.querySelector(s);
    const leer=()=>({nombre:q("#qN").value.trim()||x.nombre,kcal:Math.round(numIn(q("#qK").value)||0),prot:Math.round(numIn(q("#qP").value)||0),veg:r05(numIn(q("#qV").value)||0),ultra:q("#qU").checked});
    q("#qOk").addEventListener("click",()=>{const v=leer();cambiarComp("platos",d=>{const y=(d.items||[]).find(z=>z.id===id);if(y)Object.assign(y,v)});cerrar();aviso("Plato actualizado")});
    q("#qUse").addEventListener("click",()=>{const v=leer();cerrar();hojaComida({f:ui.tab==="comidas"?ui.fechaCom:hoyStr(),pre:{texto:v.nombre,porcion:"m",kcal:v.kcal,prot:v.prot,veg:v.veg,ultra:v.ultra,fuente:"plato",nota:"Valores de tu plato guardado."}})});
    borrarDoble(q("#qDel"),()=>{cambiarComp("platos",d=>{d.items=(d.items||[]).filter(z=>z.id!==id)});cerrar();aviso("Plato quitado")},"Tocá de nuevo para quitarlo");
  });
}
function hojaCompra(){
  abrir(`<h2>Agregar a la compra</h2>
   <label class="fld"><span>Producto</span><input class="inp" id="cN" placeholder="Ej: tomates"></label>
   <label class="fld"><span>Cantidad (opcional)</span><input class="inp" id="cC" placeholder="Ej: 1 kg"></label>
   <div class="fld"><span>Categoría</span>${opciones("cat",CATS,"ver")}</div>
   <button class="btn pri wide" id="cOk">Agregar</button>`,pn=>{
    const q=s=>pn.querySelector(s);
    const ok=()=>{const n=q("#cN").value.trim();if(!n){aviso("Escribí el producto.");return}agregarACompras([{nombre:n,cant:q("#cC").value.trim(),cat:valGrupo(pn,"cat")}],"");q("#cN").value="";q("#cC").value="";q("#cN").focus();aviso(n+" agregado")};
    q("#cOk").addEventListener("click",ok);q("#cN").addEventListener("keydown",e=>{if(e.key==="Enter")ok()});
  });
}
function hojaTexto(titulo,texto,ayuda){
  abrir(`<h2>${esc(titulo)}</h2><p class="hint">${esc(ayuda)}</p><textarea class="inp" id="tT" readonly>${esc(texto)}</textarea>`,pn=>{const t=pn.querySelector("#tT");setTimeout(()=>{t.focus();t.select()},80)});
}

/* ---------- Recetas: generar, cocinar, rutina ---------- */
const recDe=(src,i)=>src==="fav"?favoritas()[+i]:src==="base"?(ui.baseIdeas||[])[+i]:(recetasDoc().actuales||[])[+i];
function hojaGenerar(){
  abrir(`<h2>Generar 5 recetas</h2>
   <p class="small muted">Para ${porciones()} ${porciones()===1?"persona":"personas"}, con lo que hay en la despensa${(COMPARTE()?PERS:[ui.persona]).some(p=>perfil(p).objetivo==="musculo")?" y priorizando proteína":""}.</p>
   <div class="fld"><span>Condiciones (opcional)</span><div class="chips" id="gF">${FILTROS.map(([k,l])=>`<button type="button" class="chip" data-k="${k}" aria-pressed="${ui.filtros.has(k)}">${l}</button>`).join("")}</div></div>
   <label class="fld"><span>Idea o antojo (opcional)</span><input class="inp" id="gA" value="${esc(ui.antojo)}" placeholder="Ej: algo con calabaza, comida de olla, pescado"></label>
   <button class="btn pri wide" id="gOk">Generar</button>`,pn=>{
    pn.querySelector("#gF").addEventListener("click",e=>{const b=e.target.closest(".chip");if(!b)return;const on=b.getAttribute("aria-pressed")!=="true";b.setAttribute("aria-pressed",String(on))});
    pn.querySelector("#gOk").addEventListener("click",()=>{ui.filtros=new Set([...pn.querySelectorAll("#gF .chip")].filter(b=>b.getAttribute("aria-pressed")==="true").map(b=>b.dataset.k));ui.antojo=pn.querySelector("#gA").value.trim();cerrar();generar()});
  });
}
function hojaCocinamos(r,opt={}){
  const p=ui.persona,comp=companeros(p),pf=perfil(p);
  const dsp=despensa();const usados=dsp.filter(d=>{const n=norm(d.nombre);return (r.ingredientes||[]).some(i=>{const t=norm(i.item);return t.includes(n)||n.split(" ").some(w=>w.length>3&&t.includes(w))})});
  const porOpts=Object.entries(PORC).filter(([k])=>k!=="x").map(([k,o])=>[k,o.l]);
  abrir(`<h2>${esc(r.titulo)}</h2>
   <p class="small muted">${opt.f&&opt.f!==hoyStr()?`Se anota el ${fechaLarga(opt.f).toLowerCase()}.`:"Anotala como comida y actualizá la despensa en un paso."}</p>
   ${opciones("slot",SLOTS,opt.slot||slotPorHora())}
   ${comp.length?`<div class="fld"><span>¿Quiénes comieron?</span>${opciones("para",[["dos",comp.length===1?"Los dos":"Todos"],["yo","Solo "+pf.nombre]],"dos")}</div>`:""}
   <div class="fld"><span>Porción de ${esc(pf.nombre)}</span>${opciones("por",porOpts,"m")}</div>
   <div class="sublist" id="cP2">${comp.map(x=>`<div class="fld"><span>Porción de ${esc(perfil(x).nombre)}</span>${opciones("por2_"+x,porOpts,"m")}</div>`).join("")}</div>
   <p class="hint">Porción mediana: ~${fmtN(r.kcal)} kcal y ~${fmtN(r.prot)} g de proteína.</p>
   ${usados.length?`<div class="fld"><span>¿Se terminó algo? Lo saco de la despensa</span>${usados.map(d=>`<label class="check"><input type="checkbox" data-id="${d.id}"> ${esc(d.nombre)}${d.cant?` <span class="small muted">(${esc(d.cant)})</span>`:""}</label>`).join("")}<label class="check"><input type="checkbox" id="cBuy" checked> Sumar lo que se terminó a la lista de compras</label></div>`:""}
   <button class="btn pri wide" id="cOk">Guardar</button>`,pn=>{
    const q=s=>pn.querySelector(s);
    const gp=q('[data-g="para"]');if(gp)gp.addEventListener("change",()=>{q("#cP2").hidden=valGrupo(pn,"para")!=="dos"});
    q("#cOk").addEventListener("click",()=>{
      const f=opt.f||hoyStr(),sl=valGrupo(pn,"slot")||"cena",hora=f===hoyStr()?horaAhora():"",todos=comp.length&&valGrupo(pn,"para")==="dos",grupo=todos?uid():"";
      const mk=porc=>{const m=pm(porc);return {id:uid(),slot:sl,hora,texto:r.titulo,porcion:porc,cant:"",kcal:Math.round(r.kcal*m),prot:Math.round(r.prot*m),veg:r05((+r.veg||0)*m),ultra:false,fuente:"receta",nota:"Valores por porción de la receta.",grupo}};
      cambiarMes(p,f,d=>{(d.comidas[f]=d.comidas[f]||[]).push(mk(valGrupo(pn,"por")||"m"))},true);
      if(todos)comp.forEach(x=>cambiarMes(x,f,d=>{(d.comidas[f]=d.comidas[f]||[]).push(mk(valGrupo(pn,"por2_"+x)||"m"))},true));
      const fin=[...pn.querySelectorAll("input[data-id]:checked")].map(i=>i.dataset.id);
      if(fin.length){const items=dsp.filter(d=>fin.includes(d.id));cambiarComp("despensa",d=>{d.items=(d.items||[]).filter(x=>!fin.includes(x.id))},true);if(q("#cBuy")&&q("#cBuy").checked)agregarACompras(items.map(x=>({nombre:x.nombre,cat:x.cat})),"se terminó")}
      if(opt.alGuardar)opt.alGuardar();
      cerrar();render();aviso(`Anotada${todos?(comp.length===1?" para los dos":" para todos"):""}${fin.length?` · ${fin.length} ${fin.length===1?"ingrediente salió":"ingredientes salieron"} de la despensa`:""}`);
    });
  });
}
function hojaRecRutina(r){
  const p=ui.persona,pf=perfil(p),comp=companeros(p);
  const opts=[...(comp.length?[["todos",comp.length===1?"Los dos":"Todos"]]:[]),[p,pf.nombre],...comp.map(x=>[x,perfil(x).nombre])];
  abrir(`<h2>Agregar a la rutina</h2><p class="small muted">${esc(r.titulo)}</p>
   <div class="fld"><span>Día</span>${opciones("dia",DIAS.map(k=>[k,DIAS_L[k].slice(0,3)]),diaKey(addDays(hoyStr(),1)))}</div>
   <div class="fld"><span>Comida</span>${opciones("slot",SLOTS.filter(s=>s[0]!=="snacks"),"almuerzo")}</div>
   <div class="fld"><span>Rutina de</span>${opciones("para",opts,opts[0][0])}</div>
   <button class="btn pri wide" id="rrOk">Agregar</button>`,pn=>{
    pn.querySelector("#rrOk").addEventListener("click",()=>{const dia=valGrupo(pn,"dia"),sl=valGrupo(pn,"slot"),pa=valGrupo(pn,"para");
      const quienes=pa==="todos"?[p,...comp]:[pa];
      quienes.forEach(pp=>{const d=clone(S.perfiles[pp]);d.rutComidas=d.rutComidas||{};d.rutComidas[dia]=d.rutComidas[dia]||{};d.rutComidas[dia][sl]=r.titulo;S.perfiles[pp]=d;guardar("perfiles/"+pp,d)});
      cerrar();render();aviso(`Agregada al ${DIAS_L[dia].toLowerCase()} (${SLOT_N[sl].toLowerCase()})`)});
  });
}

/* ---------- Ajustes: recordatorios, respaldo, privacidad ---------- */
function gcal(rec,hhmm){
  let start=addDays(hoyStr(),1);
  if(rec.r.includes("BYDAY=SU")){while(diaKey(start)!=="dom")start=addDays(start,1)}
  const [h,m]=hhmm.split(":").map(Number);const d=start.replace(/-/g,"");
  const a=`${d}T${pad(h)}${pad(m)}00`;const e2=new Date(2000,0,1,h,m+10);const b=`${d}T${pad(e2.getHours())}${pad(e2.getMinutes())}00`;
  return "https://calendar.google.com/calendar/render?action=TEMPLATE&text="+encodeURIComponent(rec.t)+"&details="+encodeURIComponent("Abrí Plato y Pulso y anotá en un minuto. Constancia antes que perfección.")+"&dates="+a+"/"+b+"&ctz=America/Montevideo&recur="+encodeURIComponent("RRULE:"+rec.r);
}
function exportar(){
  const docs={};Object.entries(S.perfiles).forEach(([k,v])=>docs["perfiles/"+k]=v);Object.entries(S.meses).forEach(([k,v])=>docs["meses/"+k]=v);Object.entries(S.comp).forEach(([k,v])=>docs["compartido/"+k]=v);
  return JSON.stringify({app:"plato-y-pulso",version:3,exportado:new Date().toISOString(),espacio:ESP?ESP.nombre:"",personas:Object.fromEntries(PERS.map(p=>[p,perfil(p).nombre])),docs},null,1);
}
function descargar(nombre,texto){
  try{const u=URL.createObjectURL(new Blob([texto],{type:"application/json"}));const a=document.createElement("a");a.href=u;a.download=nombre;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(u),2000);return true}catch(e){return false}
}
/* Personas que trae un respaldo (del artefacto: "cris"/"pareja"; de la app: ids de miembro) */
function personasDeRespaldo(j){
  const ks=new Set();Object.keys(j.docs).forEach(k=>{const [c,id]=[k.slice(0,k.indexOf("/")),k.slice(k.indexOf("/")+1)];if(c==="perfiles")ks.add(id);else if(c==="meses")ks.add(id.replace(/_\d{4}-\d{2}$/,""))});
  return [...ks].map(k=>({k,nombre:(j.personas&&j.personas[k])||(j.docs["perfiles/"+k]&&j.docs["perfiles/"+k].nombre)||({cris:"Perfil 1 del artefacto",pareja:"Perfil 2 del artefacto"}[k])||k}));
}
/* Importar combina: nunca borra lo que ya está cargado. Se puede repetir sin duplicar (usa los ids). */
const vacio=v=>v===undefined||v===null||v===""||(Array.isArray(v)&&!v.length)||(typeof v==="object"&&!Array.isArray(v)&&!Object.keys(v).length);
function unirPorId(a,b,clave){const ks=new Set((a||[]).map(x=>clave(x)));return (a||[]).concat((b||[]).filter(x=>!ks.has(clave(x))))}
function combinarMes(act,imp){
  const d=clone(act||{});d.comidas=d.comidas||{};d.entrenos=d.entrenos||{};d.extras=d.extras||{};
  Object.entries(imp.comidas||{}).forEach(([f,l])=>{d.comidas[f]=unirPorId(d.comidas[f],l,x=>x.id)});
  Object.entries(imp.entrenos||{}).forEach(([f,l])=>{d.entrenos[f]=unirPorId(d.entrenos[f],l,x=>x.id)});
  Object.entries(imp.extras||{}).forEach(([f,o])=>{if(vacio(d.extras[f]))d.extras[f]=o});
  return d;
}
function combinarPerfil(act,imp){const d=clone(act||{});Object.entries(imp||{}).forEach(([k,v])=>{if(k!=="pin"&&k!=="nombre"&&vacio(d[k]))d[k]=v});if(Array.isArray(imp&&imp.pesos))d.pesos=unirPorId(d.pesos,imp.pesos,x=>x.f).sort((a,b)=>a.f.localeCompare(b.f));return d}
function combinarCocina(id,act,imp){
  const d=clone(act||{});
  if(id==="recetas"){d.favoritas=unirPorId(d.favoritas,imp.favoritas,x=>norm(x.titulo));if(vacio(d.actuales)&&imp.actuales){d.actuales=imp.actuales;d.fecha=imp.fecha;d.fuente=imp.fuente}d.vistas=[...new Set((d.vistas||[]).concat(imp.vistas||[]))].slice(-100);return d}
  if(id==="catalogo"){d.items=Object.assign({},imp.items||{},d.items||{});return d}
  d.items=unirPorId(d.items,imp.items,x=>id==="platos"?norm(x.nombre):x.id);return d;
}
function importarRespaldo(j,mapa){
  let n=0;
  Object.entries(j.docs).forEach(([k,data])=>{
    const c=k.slice(0,k.indexOf("/")),id=k.slice(k.indexOf("/")+1);
    if(c==="perfiles"){const dest=mapa[id];if(!dest)return;const d=combinarPerfil(S.perfiles[dest],data);ponerDoc("perfiles/"+dest,d);guardar("perfiles/"+dest,d);n++}
    else if(c==="meses"){const m=id.match(/^(.*)_(\d{4}-\d{2})$/);if(!m)return;const dest=mapa[m[1]];if(!dest)return;const nk=dest+"_"+m[2];const d=combinarMes(S.meses[nk],data);d.persona=dest;d.mes=m[2];ponerDoc("meses/"+nk,d);guardar("meses/"+nk,d);n++}
    else if(c==="compartido"&&/^(despensa|platos|compras|recetas|catalogo)$/.test(id)){const d=combinarCocina(id,S.comp[id],data);ponerDoc("compartido/"+id,d);guardar("compartido/"+id,d);n++}
  });
  return n;
}
async function hojaAjustes(){
  const rec=lsGet("pp:rec")||{};const hora=r=>rec[r.id]||r.h;
  const rol=ESP.rol,dueno=rol==="dueno",prof=dueno||rol==="profesional";
  const tipoN=(TIPOS_ESP.find(t=>t[0]===ESP.tipo)||["",""])[1];
  const marca=ESP.marca||{};
  abrir(`<h2>Ajustes</h2>
   <section class="sec"><h3>${esc(ESP.nombre)}</h3>
    <p class="small muted">${esc(tipoN)} · ${dueno?"sos dueño":rol==="profesional"?"sos profesional":"sos miembro"}${ESP.tipo==="personal"?" · solo para vos":ESP.datos_compartidos?" · los datos se comparten entre todos":" · cada persona ve solo lo suyo"}</p>
    <div id="ajIA" class="card sec"><span class="small muted">Cargando el consumo de IA…</span></div>
   </section>
   ${prof&&ESP.tipo!=="personal"?`<section class="sec"><h3>Invitar personas</h3><p class="hint">Pasales este código (o el link). Entran con su mail y quedan como miembros.</p><div class="card sec" id="ajCod"><span class="small muted">Cargando…</span></div></section>`:""}
   <section class="sec"><h3>Personas</h3><div class="pantry" id="ajMiem"></div></section>
   ${dueno?`<section class="sec"><h3>Marca de la app</h3><p class="hint">Para gimnasios, entrenadores o consultorios: la app muestra su nombre y su color.</p>
     <div class="two"><label class="fld"><span>Nombre de la app</span><input class="inp" id="mkN" maxlength="40" value="${esc(marca.nombre_app||"")}" placeholder="Plato y Pulso"></label>
     <label class="fld"><span>Color principal</span><input class="inp" id="mkC" type="color" value="${/^#[0-9a-f]{6}$/i.test(marca.color||"")?marca.color:"#2d6a3a"}"></label></div>
     <label class="fld"><span>Nombre del espacio</span><input class="inp" id="mkE" maxlength="80" value="${esc(ESP.nombre)}"></label>
     <button class="btn" id="mkOk">Guardar marca</button></section>`:""}
   <section class="sec"><h3>Recordatorios</h3>
    <p class="hint">Agregá estos recordatorios a tu Google Calendar: se repiten solos y te llegan al celular.</p>
    <div>${RECORD_DEF.map(r=>`<div class="setrow"><span><b class="small">${esc(r.t.replace(" en Plato y Pulso","").replace("Plato y Pulso: ",""))}</b><br><span class="small muted">${r.r.includes("WEEKLY")?"Domingos":"Todos los días"}</span></span><span class="row tight" style="align-items:center"><input class="inp" type="time" data-rec="${r.id}" value="${hora(r)}" aria-label="Hora"><a class="btn sm" target="_blank" rel="noopener" data-recl="${r.id}" href="${gcal(r,hora(r))}">Agregar</a></span></div>`).join("")}</div>
   </section>
   <section class="sec"><h3>Respaldo e importación</h3>
    <p class="hint">Descargá los datos que ves en este espacio en un archivo. También sirve para traer los datos del artefacto de Claude: allá tocá Ajustes › Descargar respaldo, y acá elegí ese archivo.</p>
    <button class="btn" id="aExp">Descargar respaldo</button>
    <label class="btn photo">Importar un respaldo<input type="file" id="aImp" accept=".json,application/json" aria-label="Elegir archivo de respaldo"></label>
    <div id="aImpBox"></div>
   </section>
   <section class="sec"><h3>Cuenta</h3><p class="small muted">${esc(SESION?SESION.email:"")}</p>
    <div class="row"><button class="btn" data-x="cambiarEsp">Cambiar de espacio</button><button class="btn" data-x="cerrarSesion">Cerrar sesión</button></div>
    ${B.modo==="nube"?`<button class="btn" data-x="salirTodos">Cerrar sesión en todos mis dispositivos</button><p class="hint">Usalo si perdiste un celular o entraste en una computadora ajena.</p>`:""}
    ${rol!=="dueno"?`<button class="btn warn" id="ajIrme">Salir de este espacio</button>`:""}
    <button class="btn" data-x="comentario">Enviar un comentario</button>
    <p class="small"><a href="privacidad" target="_blank" rel="noopener">Política de privacidad</a></p>
    ${B.modo==="nube"?`<button class="btn warn" id="ajBorrarCuenta">Eliminar mi cuenta y mis datos</button><p class="hint">Borra tu usuario, tus datos y los espacios donde estás solo. No se puede deshacer: si querés, descargá antes un respaldo.</p>`:""}</section>
   <section class="sec"><h3>Sobre las estimaciones</h3>
    <p class="hint">Las calorías, proteínas y porciones de verdura las estima una IA (o una tabla base cuando no hay IA), siempre aproximadas. Cada plato estimado se recuerda para que el mismo plato dé siempre el mismo número, y tus correcciones a mano pisan ese valor. Nada de esto es consejo médico.</p>
   </section>`,pn=>{
    const q=s=>pn.querySelector(s);
    pn.querySelectorAll("[data-x]").forEach(b=>b.addEventListener("click",()=>{cerrar();A[b.dataset.x]()}));
    pn.querySelectorAll("[data-rec]").forEach(i=>i.addEventListener("input",()=>{const r=RECORD_DEF.find(x=>x.id===i.dataset.rec);if(!i.value)return;rec[r.id]=i.value;lsSet("pp:rec",rec);pn.querySelector(`[data-recl="${r.id}"]`).href=gcal(r,i.value)}));
    /* consumo de IA */
    (async()=>{const box=q("#ajIA");try{const st=await B.estadoIA(ESP.espacio_id);IAEST=st;let det="";
      if(dueno&&B.modo!=="demo"){const u=await B.usoMes(ESP.espacio_id);const por={};u.forEach(x=>{por[x.tarea]=por[x.tarea]||{n:0,c:0};por[x.tarea].n++;por[x.tarea].c+=+x.costo_usd||0});
        const N={estimar:"Estimaciones",estimar_lote:"Mejoras en lote",foto:"Fotos",recetas:"Recetas",compra:"Listas de compra"};
        det=Object.keys(por).length?`<div class="small">${Object.entries(por).map(([k,v])=>`${N[k]||k}: ${v.n} · US$ ${v.c.toFixed(3)}`).join("<br>")}</div>`:`<span class="small muted">Todavía no se usó IA este mes.</span>`}
      if(!box.isConnected)return;
      const dias=st&&st.vence?Math.round((new Date(st.vence+"T23:59:59")-new Date())/864e5):null;
      const venc=dias===null?"":dias>=0?`<p class="small"><b>${dias===0?"Último día":`Quedan ${dias} día${dias===1?"":"s"}`} con IA.</b> Después la app sigue funcionando sin IA.</p>`:`<p class="small"><b>Terminó el período con IA.</b> La app sigue funcionando; las estimaciones salen de la tabla.</p>`;
      box.innerHTML=st?`${venc}<div class="legend"><b>IA de este mes · plan ${esc(st.plan)}</b><span class="small muted">${st.tope>0?`${Math.min(100,Math.round(st.gastado/st.tope*100))}% del cupo`:"sin IA"}</span></div>${st.tope>0?`<div class="meter" style="color:var(--accent)"><i style="width:${Math.min(100,st.gastado/st.tope*100)}%"></i></div>`:""}${dueno&&st.tope>0?`<span class="small muted">US$ ${st.gastado.toFixed(3)} de US$ ${st.tope.toFixed(2)}${st.foto?"":" · el plan no incluye fotos"}</span>`:""}${det}`:`<span class="small muted">Sin datos de IA.</span>`;
    }catch(e){if(box.isConnected)box.innerHTML=`<span class="small muted">No pude leer el consumo de IA.</span>`}})();
    /* código de invitación */
    if(prof&&ESP.tipo!=="personal")(async()=>{const box=q("#ajCod");try{const c=await B.codigo(ESP.espacio_id);const link=location.origin+location.pathname+"?codigo="+encodeURIComponent(c||"");
      if(!box.isConnected)return;
      box.innerHTML=`<div class="refrow"><span class="num" style="font-size:30px;letter-spacing:.06em">${esc(c||"—")}</span></div><p class="small muted" style="overflow-wrap:anywhere">${esc(link)}</p><div class="row"><button class="btn sm" id="cpCod">Copiar link</button>${dueno?`<button class="btn sm" id="rgCod">Cambiar código</button>`:""}</div>`;
      q("#cpCod").addEventListener("click",()=>{try{navigator.clipboard.writeText(link).then(()=>aviso("Link copiado"),()=>hojaTexto("Link de invitación",link,"Copiá este link y mandalo por WhatsApp."))}catch(e){hojaTexto("Link de invitación",link,"Copiá este link y mandalo por WhatsApp.")}});
      const rg=q("#rgCod");if(rg)borrarDoble(rg,async()=>{try{await B.regenerarCodigo(ESP.espacio_id);aviso("Código cambiado: el anterior ya no sirve");cerrar();hojaAjustes()}catch(e){aviso(e.message)}},"Tocá de nuevo: el código viejo deja de servir");
    }catch(e){if(box.isConnected)box.innerHTML=`<span class="small muted">No pude leer el código.</span>`}})();
    /* miembros */
    const pintarMiem=()=>{q("#ajMiem").innerHTML=MIEMBROS.map(m=>`<div class="pitem"><span><b>${esc(m.nombre)}</b>${m.id===YO?" (vos)":""}<small style="display:block">${m.rol==="dueno"?"Dueño":m.rol==="profesional"?"Profesional":"Miembro"}</small></span>${dueno&&m.id!==YO?`<span class="row tight"><select class="inp" data-rol="${m.id}" aria-label="Rol de ${esc(m.nombre)}" style="min-height:40px;width:auto">${[["miembro","Miembro"],["dueno","Dueño"]].map(([v,l])=>`<option value="${v}" ${m.rol===v?"selected":""}>${l}</option>`).join("")}</select><button class="btn sm warn" data-quitar="${m.id}">Quitar</button></span>`:""}</div>`).join("")||`<p class="empty">Solo vos por ahora.</p>`;
      pn.querySelectorAll("[data-rol]").forEach(sl=>sl.addEventListener("change",async()=>{try{await B.cambiarRol(sl.dataset.rol,sl.value);await cargarMiembros();aviso("Rol actualizado");pintarMiem()}catch(e){aviso(e.message)}}));
      pn.querySelectorAll("[data-quitar]").forEach(b=>borrarDoble(b,async()=>{try{await B.quitarMiembro(b.dataset.quitar);await cargarMiembros();aviso("Persona quitada del espacio");pintarMiem();render()}catch(e){aviso(e.message)}},"¿Seguro? Tocá de nuevo"));};
    pintarMiem();
    /* marca */
    const mk=q("#mkOk");if(mk)mk.addEventListener("click",async()=>{const m={nombre_app:q("#mkN").value.trim().slice(0,40),color:q("#mkC").value};const nom=q("#mkE").value.trim().slice(0,80)||ESP.nombre;
      try{await B.actualizarEspacio(ESP.espacio_id,{marca:m,nombre:nom});ESP.marca=m;ESP.nombre=nom;aplicarMarca();render();aviso("Marca guardada")}catch(e){aviso(e.message)}});
    const bc=q("#ajBorrarCuenta");if(bc)borrarDoble(bc,async()=>{try{saliendo=true;await B.borrarCuenta();cerrar();await A.salir();aviso("Tu cuenta y tus datos fueron eliminados")}catch(e){saliendo=false;aviso(e.message)}},"¿Seguro? Se borra todo. Tocá de nuevo");
    const ir=q("#ajIrme");if(ir)borrarDoble(ir,async()=>{try{await B.quitarMiembro(YO);cerrar();await irAEspacios()}catch(e){aviso(e.message)}},"Tocá de nuevo para salir del espacio");
    /* respaldo */
    q("#aExp").addEventListener("click",()=>{const data=exportar();if(descargar(`${nombreApp().toLowerCase().replace(/[^a-z0-9]+/g,"-")}-respaldo-${hoyStr()}.json`,data))aviso("Respaldo descargado");else hojaTexto("Respaldo",data,"Copiá este texto y guardalo en un archivo .json.")});
    q("#aImp").addEventListener("change",async e=>{const file=e.target.files&&e.target.files[0];if(!file)return;const box=q("#aImpBox");
      try{const j=JSON.parse(await file.text());if(!j||j.app!=="plato-y-pulso"||!j.docs)throw 0;
        const pers=personasDeRespaldo(j);const destinos=COMPARTE()||prof?PERS:[YO];
        box.innerHTML=`<div class="alert sec"><b>Respaldo del ${esc(String(j.exportado||"").slice(0,10))}</b>
          <p class="small">Elegí a quién de este espacio corresponde cada perfil del archivo. Se suma a lo que ya hay: no se borra nada y si lo importás dos veces no se duplica.</p>
          ${pers.map((x,i)=>`<label class="fld"><span>${esc(x.nombre)}</span><select class="inp" data-imp="${esc(x.k)}"><option value="">No importar</option>${destinos.map(d=>`<option value="${d}" ${destinos[i]===d?"selected":""}>${esc(perfil(d).nombre)}</option>`).join("")}</select></label>`).join("")}
          <p class="small">También trae la despensa, los platos, las compras, las recetas y el catálogo de estimaciones.</p>
          <button class="btn pri" id="aImpOk">Importar</button></div>`;
        q("#aImpOk").addEventListener("click",()=>{const mapa={};pn.querySelectorAll("[data-imp]").forEach(sl=>{if(sl.value)mapa[sl.dataset.imp]=sl.value});const n=importarRespaldo(j,mapa);cerrar();render();aviso(`Importados ${n} bloques de datos`)});
      }catch(err){box.innerHTML=`<p class="hint" style="color:var(--warn)">Ese archivo no es un respaldo de Plato y Pulso.</p>`}
      e.target.value="";});
  });
}

/* =========================================================
   Acciones
   ========================================================= */
const A={
  persona:d=>{ui.persona=d.p;lsSet("pp:persona",d.p);render()},
  tab:d=>{ui.tab=d.t;lsSet("pp:tab",d.t);render();window.scrollTo(0,0)},
  ajustes:()=>{if(ETAPA==="app")hojaAjustes()},
  lgEnviar:async()=>{const i=$("#lgE");const em=(i?i.value:entrada.email).trim().toLowerCase();
    if(!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(em)){entrada.error="Escribí un mail válido.";render();return}
    if(captchaClave()&&B.modo==="nube"&&!captchaToken){entrada.error="Esperá a que termine la verificación de seguridad (el recuadro de arriba del botón).";render();return}
    const tk=captchaToken;captchaToken="";
    entrada.email=em;lsSet("pp:email",em);entrada.ocupado=true;entrada.error="";render();
    try{await B.enviarCodigo(em,tk);
      if(B.modo==="demo"){await B.verificarCodigo(em,"");SESION=await B.sesion();entrada.ocupado=false;await alEntrar();return}
      entrada.paso="codigo";aviso("Código enviado a "+em)}catch(e){entrada.error=e.message}
    entrada.ocupado=false;render()},
  lgVerificar:async()=>{const c=(($("#lgC")||{}).value||"").replace(/\s/g,"");
    if(!/^\d{6,8}$/.test(c)){entrada.error="El código tiene 6 números.";render();return}
    entrada.ocupado=true;entrada.error="";render();
    try{await B.verificarCodigo(entrada.email,c);SESION=await B.sesion();entrada.ocupado=false;entrada.paso="email";await alEntrar()}
    catch(e){entrada.ocupado=false;entrada.error=e.message;render()}},
  lgOtro:()=>{entrada.paso="email";entrada.error="";render()},
  entrarEsp:d=>{entrada.error="";const e=ESPACIOS.find(x=>x.espacio_id===d.id);if(e)entrarEspacio(e)},
  unirme:async()=>{entrada.error="";const c=$("#uCod").value.trim(),n=$("#uNom").value.trim();
    if(!c||!n){entrada.error="Completá el código y tu nombre.";render();return}
    try{const id=await B.unirse(c,n);limpiarCodigoURL();await irAEspacios();const e=ESPACIOS.find(x=>x.espacio_id===id);if(e)await entrarEspacio(e)}catch(e){entrada.error=e.message;render()}},
  crearEsp:async()=>{entrada.error="";const n=$("#nNom").value.trim(),yo=$("#nYo").value.trim();const t=$('#app [data-g="tipoEsp"] [aria-pressed="true"]');
    if(!n||!yo){entrada.error="Completá el nombre del espacio y el tuyo.";render();return}
    try{const id=await B.crearEspacio(n,t?t.dataset.v:"hogar",yo);await irAEspacios();const e=ESPACIOS.find(x=>x.espacio_id===id);if(e)await entrarEspacio(e)}catch(e){entrada.error=e.message;render()}},
  cambiarEsp:()=>{lsSet("pp:esp","");irAEspacios()},
  privAceptar:async()=>{
    if(!$("#pvA").checked||!$("#pvB").checked){entrada.error="Para usar la app tenés que marcar las dos casillas.";render();return}
    entrada.ocupado=true;entrada.error="";render();
    try{await B.aceptarPrivacidad(PRIV_V);entrada.ocupado=false;await alEntrar()}catch(e){entrada.ocupado=false;entrada.error=e.message;render()}},
  salirTodos:async()=>{saliendo=true;try{await B.salirTodos()}catch(e){aviso(e.message)}await A.salir();aviso("Se cerró la sesión en todos tus dispositivos")},
  cerrarSesion:()=>{if(pendientes.size&&!confirm(`Hay ${pendientes.size} cambio(s) sin subir porque no hay conexión. Si cerrás sesión ahora se pierden. ¿Cerrar igual?`))return;A.salir()},
  salir:async()=>{saliendo=true;try{await B.salir()}catch(e){}saliendo=false;
    pendientes.clear();try{Object.keys(localStorage).filter(k=>k.startsWith("pp:")).forEach(k=>localStorage.removeItem(k))}catch(e){}
    entrada.email="";if(desuscribir){desuscribir();desuscribir=null}SESION=null;ESP=null;YO=null;ETAPA="login";entrada.paso="email";aplicarMarca();render()},
  objetivo:d=>cambiarPerfil(ui.persona,x=>{x.objetivo=d.o}),
  perfil:()=>hojaPerfil(),
  anotarPeso:()=>hojaPeso(),
  alertaOk:()=>{ui.alertaOk=ui.persona+hoyStr();ssSet("pp:alerta",ui.alertaOk);render()},
  nuevaComida:d=>hojaComida({f:d.f,slot:d.s,foto:!!d.foto}),
  editComida:d=>hojaComida({f:d.f,id:d.id}),
  repetir:d=>{const p=ui.persona,ay=addDays(d.f,-1);const its=comidasDe(p,ay).filter(x=>x.slot===d.s);if(!its.length)return;
    cambiarMes(p,d.f,m=>{const a=m.comidas[d.f]=m.comidas[d.f]||[];its.forEach(x=>{const c=clone(x);c.id=uid();delete c.grupo;a.push(c)})});aviso(`${SLOT_N[d.s]} repetido de ayer`)},
  extra:d=>{const p=ui.persona;cambiarMes(p,d.f,m=>{const o=m.extras[d.f]=m.extras[d.f]||{};o[d.k]=Math.max(0,(+o[d.k]||0)+(+d.n))})},
  nuevoEntreno:d=>hojaEntreno({f:d.f||hoyStr()}),
  editEntreno:d=>hojaEntreno({f:d.f,id:d.id}),
  entSeg:d=>{ui.ent=d.e;render()},
  hiceRutina:()=>{const pl=perfil(ui.persona).rutEntreno[diaKey(hoyStr())]||{};const u=pl.tipo==="gimnasio"?ultimoGimnasio(ui.persona):null;hojaEntreno({f:hoyStr(),pre:{tipo:pl.tipo||"gimnasio",int:"media",min:pl.min||45,desc:pl.desc||"",ejercicios:u?clone(u.e.ejercicios):[]}})},
  comiPlan:d=>{const pl=(perfil(ui.persona).rutComidas[diaKey(hoyStr())]||{})[d.s]||"";const pp=platos().find(x=>norm(x.nombre)===norm(pl));const fv=favoritas().find(r=>norm(r.titulo)===norm(pl));
    hojaComida({f:hoyStr(),slot:d.s,pre:pp?{texto:pp.nombre,porcion:"m",kcal:pp.kcal,prot:pp.prot,veg:pp.veg,ultra:pp.ultra,fuente:"plato"}:fv?{texto:fv.titulo,porcion:"m",kcal:fv.kcal,prot:fv.prot,veg:fv.veg,fuente:"receta"}:{texto:pl}})},
  diaCom:d=>{const n=+d.d;ui.fechaCom=n===0?hoyStr():addDays(ui.fechaCom,n);if(ui.fechaCom>hoyStr())ui.fechaCom=hoyStr();render()},
  editPlato:d=>hojaPlato(d.id),
  rutSeg:d=>{ui.rut=d.r;render()},
  editRutE:d=>hojaRutE(d.d),
  editRutC:d=>hojaRutC(d.d),
  ejemploRut:()=>hojaEjemplo(),
  cocSeg:d=>{ui.cocina=d.c;lsSet("pp:cocina",d.c);render()},
  recVista:d=>{ui.recVista=d.v;render()},
  nuevoIng:()=>hojaIng(),
  editIng:d=>hojaIng(d.id),
  basico:d=>{cambiarComp("despensa",x=>{x.items=x.items||[];if(!x.items.some(y=>norm(y.nombre)===norm(d.n)))x.items.push({id:uid(),nombre:d.n,cant:"",cat:d.c})});aviso(d.n+" agregado")},
  opcionesGen:()=>hojaGenerar(),
  ideasBase:()=>{if((ui.vistasBase||[]).length>RECETAS_BASE.length-5)ui.vistasBase=[];ui.baseIdeas=recetasBase();ui.vistasBase=(ui.vistasBase||[]).concat(ui.baseIdeas.map(r=>r.titulo));render();window.scrollTo(0,0)},
  cerrarIdeas:()=>{ui.baseIdeas=null;render()},
  reestimar:()=>reestimar(),
  pararGen:()=>{if(ui.gen){ui.gen.ctl.abort();ui.gen=null;render()}},
  fav:d=>{const r=recDe(d.src,d.i);if(!r)return;cambiarComp("recetas",x=>{x.favoritas=x.favoritas||[];const i=x.favoritas.findIndex(y=>norm(y.titulo)===norm(r.titulo));if(i>=0){x.favoritas.splice(i,1);aviso("Quitada de favoritas")}else{x.favoritas.push(clone(r));aviso("Guardada en favoritas")}})},
  cocinamos:d=>{const r=recDe(d.src,d.i);if(r)hojaCocinamos(r)},
  faltaCompra:d=>{const r=recDe(d.src,d.i);if(!r)return;const n=agregarACompras((r.faltan||[]).map(x=>({nombre:x})),r.titulo);aviso(n?`${n} ${n===1?"producto sumado":"productos sumados"} a la compra`:"Ya estaban en la lista")},
  recMenu:d=>{const r=recDe(d.src,d.i);if(r)hojaRecMenu(r)},
  semNav:d=>{ui.semMenu=addDays(ui.semMenu||lunesDe(hoyStr()),+d.d);render();window.scrollTo(0,0)},
  semTodo:()=>{ui.menuTodo=!ui.menuTodo;render()},
  semCompra:()=>compraDelMenu(ui.semMenu||lunesDe(hoyStr())),
  menuEditar:d=>hojaMenu(d.l,d.d,d.s),
  menuVer:d=>{const it=itemMenu(d.l,d.d,d.s);if(it)hojaRecetaMenu(it)},
  menuComer:d=>comerDelMenu(d.l,d.d,d.s),
  recRutina:d=>{const r=recDe(d.src,d.i);if(r)hojaRecRutina(r)},
  recPlato:d=>{const r=recDe(d.src,d.i);if(!r)return;cambiarComp("platos",x=>{x.items=x.items||[];if(!x.items.some(y=>norm(y.nombre)===norm(r.titulo)))x.items.push({id:uid(),nombre:r.titulo,kcal:r.kcal,prot:r.prot,veg:+r.veg||0,ultra:false})});aviso("Guardado en tus platos")},
  nuevaCompra:()=>hojaCompra(),
  compraSemana:()=>armarCompraSemana(),
  toggleCompra:d=>cambiarComp("compras",x=>{const y=(x.items||[]).find(z=>z.id===d.id);if(y)y.hecho=!y.hecho}),
  delCompra:d=>cambiarComp("compras",x=>{x.items=(x.items||[]).filter(z=>z.id!==d.id)}),
  borrarHechos:()=>{cambiarComp("compras",x=>{x.items=(x.items||[]).filter(z=>!z.hecho)});aviso("Comprados borrados de la lista")},
  ticket:()=>hojaTicket(),
  comentario:()=>hojaComentario(),
  verGastos:()=>hojaGastos(),
  comprasADespensa:()=>{const h=compras().filter(x=>x.hecho);if(!h.length)return;
    cambiarComp("despensa",x=>{x.items=x.items||[];h.forEach(c=>{const ya=x.items.find(y=>norm(y.nombre)===norm(c.nombre));if(ya){if(c.cant)ya.cant=c.cant}else x.items.push({id:uid(),nombre:c.nombre,cant:c.cant||"",cat:c.cat||"otr"})})},true);
    cambiarComp("compras",x=>{x.items=(x.items||[]).filter(z=>!z.hecho)});aviso(`${h.length} productos pasaron a la despensa`)},
  copiarCompras:()=>{const pend=compras().filter(x=>!x.hecho);const txt="Lista de compras\n"+CATS.map(([c,l])=>{const g=pend.filter(x=>(x.cat||"otr")===c);return g.length?`\n${l}:\n`+g.map(x=>`• ${x.nombre}${x.cant?" ("+x.cant+")":""}`).join("\n"):""}).join("")+"\n";
    const fallback=()=>hojaTexto("Lista de compras",txt,"Seleccioná el texto y copialo para mandarlo por WhatsApp.");
    try{navigator.clipboard.writeText(txt).then(()=>aviso("Lista copiada. Pegala en WhatsApp."),fallback)}catch(e){fallback()}},
  semana:d=>{const n=addDays(ui.semana,+d.d);if(n<=lunesDe(hoyStr()))ui.semana=n;render()}
};
document.addEventListener("click",e=>{const b=e.target.closest("[data-a]");if(!b||b.closest("#sheetPanel"))return;const f=A[b.dataset.a];if(f){e.preventDefault();f(b.dataset)}});

/* =========================================================
   Inicio
   ========================================================= */
/* =========================================================
   Inicio: sesión → espacio → datos
   ========================================================= */
function limpiarCodigoURL(){const q=new URLSearchParams(location.search);if(q.has("codigo")){q.delete("codigo");history.replaceState(null,"",location.pathname+(q.toString()?"?"+q:""))}}
async function cargarMiembros(){
  MIEMBROS=await B.miembros(ESP.espacio_id);
  MIEMBROS.forEach(m=>{NOMBRES[m.id]=m.nombre});
  const veoTodos=COMPARTE()||["dueno","profesional"].includes(ESP.rol);
  PERS=[YO,...MIEMBROS.map(m=>m.id).filter(id=>id!==YO&&veoTodos)];
}
let diaMarcado="";
function marcarHoy(){const d=hoyStr();if(B&&B.modo==="nube"&&SESION&&diaMarcado!==d){diaMarcado=d;B.marcarActividad()}}
async function entrarEspacio(e){
  if(desuscribir){desuscribir();desuscribir=null}
  ESP=e;YO=e.miembro_id;lsSet("pp:esp",e.espacio_id);
  S.perfiles={};S.meses={};S.comp={};pendientes.clear();ui.baseIdeas=null;
  ETAPA="cargando";aplicarMarca();render();
  try{
    await cargarMiembros();
    const h=new Date(),desde=fmtD(new Date(h.getFullYear(),h.getMonth()-12,1)).slice(0,7);
    const docs=await B.cargarDocs(e.espacio_id,desde);
    docs.forEach(d=>{const path=deNube(d.coleccion,d.doc_id,d.data);if(path)ponerDoc(path,d.data)});
    Object.entries(lsGet(clavePend())||{}).forEach(([k,v])=>{pendientes.set(k,v);ponerDoc(k,v)});
    IAEST=await B.estadoIA(e.espacio_id).catch(()=>null);
    AI=IAEST&&IAEST.activo&&IAEST.iaActiva!==false&&IAEST.tope>0&&IAEST.gastado<IAEST.tope?"ok":"off";
    marcarHoy();
    FOTO=AI==="ok"&&!!(IAEST&&IAEST.foto);
    suscribir();
    const prev=lsGet("pp:persona");ui.persona=PERS.includes(prev)?prev:YO;
    ETAPA="app";render();reintentar();
    if(e.estado!=="activo")aviso("Este espacio está suspendido: podés ver tus datos pero no cargar nuevos.");
  }catch(err){entrada.error=(err&&err.message)||"No pude abrir el espacio. Revisá la conexión.";await irAEspacios(true)}
}
async function irAEspacios(sinError){
  if(desuscribir){desuscribir();desuscribir=null}
  ESP=null;YO=null;ETAPA="cargando";aplicarMarca();render();
  if(!sinError)entrada.error="";
  try{ESPACIOS=await B.misEspacios()}catch(e){ESPACIOS=[];entrada.error=e.message}
  ETAPA="espacios";render();
  const cod=new URLSearchParams(location.search).get("codigo");if(cod){const i=$("#uCod");if(i)i.value=cod}
}
let entrando=null;
function alEntrar(){if(!entrando)entrando=alEntrar_().finally(()=>{entrando=null});return entrando}
async function alEntrar_(){
  if(B.modo==="nube"){
    let ok=false;try{ok=await B.privacidadAceptada(PRIV_V)}catch(e){}
    if(!ok){ETAPA="privacidad";entrada.error="";render();return}
  }
  await irAEspacios();
  const cod=new URLSearchParams(location.search).get("codigo");
  const ult=lsGet("pp:esp");
  const e=cod?null:(ESPACIOS.find(x=>x.espacio_id===ult)||(ESPACIOS.length===1?ESPACIOS[0]:null));
  if(e)await entrarEspacio(e);
}
async function boot(){
  const cfg=window.PP_CONFIG||{};
  const q=new URLSearchParams(location.search);
  if(!(cfg.supabaseUrl&&cfg.supabaseAnonKey)&&!cfg.demo&&!q.has("demo")){B={modo:"ninguno"};ETAPA="sinconfig";render();return}
  try{B=PPBackend.crear(cfg)}catch(e){B={modo:"ninguno"};ETAPA="sincarga";render();return}
  B.alCambiarSesion(async ev=>{
    if(ev==="SIGNED_IN"&&ETAPA==="login"){SESION=await B.sesion();await alEntrar()}
    if(ev==="SIGNED_OUT"&&!saliendo&&SESION){await A.salir();entrada.error="Tu sesión se cerró. Entrá de nuevo con tu mail.";render()}
  });
  document.addEventListener("visibilitychange",()=>{if(!document.hidden&&SESION&&B.modo==="nube"){B.sesion().catch(()=>{});if(ESP)marcarHoy()}});
  try{SESION=await B.sesion()}catch(e){SESION=null}
  if(!SESION){ETAPA="login";render();return}
  await alEntrar();
}
/* App instalable: el service worker guarda la app para abrir rápido y sin señal; las versiones nuevas se toman al abrir. */
if("serviceWorker" in navigator&&location.protocol==="https:"){
  window.addEventListener("load",()=>{navigator.serviceWorker.register("sw.js").then(reg=>{
    reg.addEventListener("updatefound",()=>{const w=reg.installing;if(!w)return;w.addEventListener("statechange",()=>{if(w.state==="installed"&&navigator.serviceWorker.controller)aviso("Hay una versión nueva: se aplica la próxima vez que abras la app.")})});
  }).catch(()=>{})});
}
if(new URLSearchParams(location.search).has("test")&&/^(localhost|127\.0\.0\.1)$/.test(location.hostname))window.__pp={S,ui,get ESP(){return ESP},get PERS(){return PERS},render,revisarTicket};
boot();
})();
