/* Panel de uso para el administrador. Usa la misma sesión de la app; la base
   solo devuelve datos si el usuario está en la tabla "administradores". */
(function(){
"use strict";
const $=s=>document.querySelector(s);
const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const n=v=>new Intl.NumberFormat("es-UY").format(+v||0);
const usd=v=>"US$ "+(+v||0).toLocaleString("es-UY",{minimumFractionDigits:2,maximumFractionDigits:(+v||0)<1?3:2});
const fecha=d=>d?new Date(d+"T12:00:00").toLocaleDateString("es-UY",{day:"numeric",month:"short"}):"—";
const TAREAS={estimar:"Estimar comida",estimar_lote:"Mejoras en lote",foto:"Foto",recetas:"Recetas",compra:"Lista de compras"};
const TIPOS={hogar:"Hogar",personal:"Personal"};

const cfg=window.PP_CONFIG||{};
const sb=window.supabase.createClient(cfg.supabaseUrl,cfg.supabaseAnonKey,{auth:{persistSession:true,autoRefreshToken:true}});

function aviso(html){$("#contenido").innerHTML=`<div class="card aviso">${html}</div>`;$("#gen").textContent=""}

function barras(serie,campo,etiqueta){
  const max=Math.max(1,...serie.map(x=>x.n));
  return `<div class="bars">${serie.map(x=>`<div style="height:${Math.round(x.n/max*100)}%" data-t="${esc(etiqueta(x))}: ${x.n}"></div>`).join("")}</div>
    <div class="eje"><span>${esc(etiqueta(serie[0]||{}))}</span><span>${esc(etiqueta(serie[serie.length-1]||{}))}</span></div>`;
}

function pintar(d){
  const u=d.usuarios,a=d.activos,c=d.carga,ia=d.ia;
  const kpi=(t,v,sub)=>`<div class="card kpi"><span class="muted">${t}</span><b>${v}</b>${sub?`<span class="muted">${sub}</span>`:""}</div>`;
  const espacios=d.espacios.reduce((m,x)=>{const k=(TIPOS[x.tipo]||x.tipo)+" · "+x.plan;m[k]=(m[k]||0)+x.n;return m},{});
  $("#contenido").innerHTML=`
  <div class="grid">
    ${kpi("Usuarios",n(u.total),`+${n(u.nuevos_7)} en 7 días · +${n(u.nuevos_30)} en 30`)}
    ${kpi("Activos hoy",n(a.hoy))}
    ${kpi("Activos 7 días",n(a.d7),u.total?`${Math.round(a.d7/u.total*100)}% de los usuarios`:"")}
    ${kpi("Activos 30 días",n(a.d30))}
    ${kpi("Retención 7 días",a.retencion_7===null?"—":a.retencion_7+"%","de quienes llevan más de una semana")}
    ${kpi("Comidas cargadas",n(c.comidas_7),`en 7 días · ${n(c.comidas_30)} en 30`)}
    ${kpi("Entrenos (30 días)",n(c.entrenos_30))}
    ${kpi("IA este mes",usd(ia.costo_mes),`${n(ia.consultas_mes)} consultas${ia.fallidas_mes?` · ${n(ia.fallidas_mes)} fallidas`:""}`)}
  </div>
  <div class="two">
    <div class="card"><h2>Personas activas por día (30 días)</h2>${barras(d.serie_activos,"n",x=>fecha(x.dia))}</div>
    <div class="card"><h2>Registros nuevos por semana</h2>${barras(d.serie_registros,"n",x=>"sem. "+fecha(x.semana))}</div>
  </div>
  <div class="two">
    <div class="card"><h2>IA por tarea (este mes)</h2>${ia.por_tarea.length?ia.por_tarea.map(x=>`<div class="fila"><span>${esc(TAREAS[x.tarea]||x.tarea)}</span><span>${n(x.n)} · ${usd(x.costo)}</span></div>`).join(""):`<span class="muted">Sin uso este mes.</span>`}</div>
    <div class="card"><h2>Espacios por tipo y plan</h2>${Object.keys(espacios).length?Object.entries(espacios).map(([k,v])=>`<div class="fila"><span>${esc(k)}</span><span>${n(v)}</span></div>`).join(""):`<span class="muted">Sin espacios.</span>`}</div>
  </div>
  <div class="card"><h2>Espacios</h2><div class="scroll"><table>
    <tr><th>Nombre</th><th>Tipo</th><th>Plan</th><th>Vence</th><th class="n">Personas</th><th class="n">Comidas 30 d</th><th class="n">IA mes</th><th>Última actividad</th><th>Creado</th></tr>
    ${d.detalle.map(x=>`<tr><td>${esc(x.nombre)}${x.estado!=="activo"?" (suspendido)":""}</td><td>${esc(TIPOS[x.tipo]||x.tipo)}</td><td>${esc(x.plan)}</td><td>${fecha(x.vence)}</td><td class="n">${n(x.personas)}</td><td class="n">${n(x.comidas_30)}</td><td class="n">${usd(x.costo_ia_mes)}</td><td>${fecha(x.ultima)}</td><td>${fecha(x.creado)}</td></tr>`).join("")}
  </table></div></div>`;
  $("#gen").textContent="Actualizado "+new Date(d.generado).toLocaleString("es-UY",{dateStyle:"short",timeStyle:"short"});
}

// Datos de ejemplo para revisar el diseño en local: ?muestra (solo en localhost)
function muestra(){
  const hoy=new Date(),dia=i=>new Date(hoy-i*864e5).toISOString().slice(0,10);
  return {generado:hoy.toISOString(),usuarios:{total:23,nuevos_7:5,nuevos_30:14,con_consentimiento:22},
    activos:{hoy:7,d7:15,d30:21,retencion_7:68},carga:{comidas_7:312,comidas_30:1180,entrenos_30:96},
    serie_activos:Array.from({length:30},(_,i)=>({dia:dia(29-i),n:Math.round(4+i/3+Math.sin(i)*2)})),
    serie_registros:Array.from({length:8},(_,i)=>({semana:dia(49-i*7),n:[1,0,2,3,2,4,5,6][i]})),
    espacios:[{tipo:"hogar",plan:"beta",n:9},{tipo:"personal",plan:"beta",n:5},{tipo:"hogar",plan:"piloto",n:1}],
    ia:{consultas_mes:640,costo_mes:0.84,fallidas_mes:3,por_tarea:[{tarea:"estimar",n:520,costo:0.05},{tarea:"recetas",n:80,costo:0.12},{tarea:"foto",n:40,costo:0.01}]},
    detalle:[{nombre:"Casa Pérez",tipo:"hogar",plan:"beta",vence:null,estado:"activo",creado:dia(20),personas:3,comidas_30:240,costo_ia_mes:0.12,ultima:dia(0)},
             {nombre:"Lo de Ana",tipo:"personal",plan:"prueba",vence:dia(-3),estado:"activo",creado:dia(4),personas:1,comidas_30:31,costo_ia_mes:0.02,ultima:dia(1)}]};
}

async function cargar(){
  $("#gen").textContent="Cargando…";
  if(new URLSearchParams(location.search).has("muestra")&&/^(localhost|127\.0\.0\.1)$/.test(location.hostname))return pintar(muestra());
  const {data:s}=await sb.auth.getSession();
  if(!s.session)return aviso(`Entrá primero a la app con tu mail y volvé a esta página.<br><br><a href="./">Ir a la app</a>`);
  const {data,error}=await sb.rpc("panel_uso");
  if(error)return aviso(/sin_permiso/.test(error.message)?"Tu usuario no tiene acceso al panel.":"No se pudo cargar el panel: "+esc(error.message));
  pintar(data);
}
$("#recargar").addEventListener("click",cargar);
cargar();
})();
