/* =========================================================
   Plato y Pulso · capa de datos
   - Nube: Supabase (login por código al mail, base de datos, tiempo real, IA en el servidor)
   - Demo: todo en este navegador, sin servidor (sirve para mostrar la app a clientes)
   La app usa siempre la misma interfaz, así se puede cambiar de proveedor sin tocarla.
   ========================================================= */
(function(){
"use strict";

class ErrorApp extends Error{constructor(codigo,mensaje){super(mensaje||codigo);this.codigo=codigo}}
const MSG={
  sin_sesion:"Volvé a iniciar sesión.",codigo_invalido:"Ese código no existe. Revisalo con quien te invitó.",espacio_lleno:"Ese espacio llegó al máximo de personas de su plan.",
  limite_espacios:"Llegaste al máximo de espacios que podés crear.",sin_permiso:"No tenés permiso para hacer eso.",ultimo_dueno:"El espacio tiene que tener al menos un dueño.",
  tope_plan:"Se usó todo el cupo de IA del plan este mes.",plan_sin_foto:"Tu plan no incluye estimar desde fotos.",muchas_llamadas:"Muchas consultas seguidas. Esperá unos minutos.",
  ia_ocupada:"La IA está ocupada. Probá en un rato.",ia_no_disponible:"No se pudo contactar a la IA.",red:"Sin conexión. Se guarda cuando vuelva la señal."
};
const errDe=(e)=>{const m=String((e&&(e.message||e.msg))||e||"");const c=Object.keys(MSG).find(k=>m.includes(k));return new ErrorApp(c||"error",MSG[c]||m||"Ocurrió un error.")};
const esRed=(e)=>!e||!e.code&&/fetch|network|Load failed|NetworkError|timeout/i.test(String(e.message||e));

/* ---------------- Nube (Supabase) ---------------- */
function nube(cfg){
  const sb=window.supabase.createClient(cfg.supabaseUrl,cfg.supabaseAnonKey,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
  const rpc=async(fn,args)=>{const {data,error}=await sb.rpc(fn,args);if(error)throw errDe(error);return data};
  return {
    modo:"nube",
    async sesion(){const {data}=await sb.auth.getSession();return data.session?{email:data.session.user.email,id:data.session.user.id}:null},
    alCambiarSesion(cb){sb.auth.onAuthStateChange((ev)=>{if(ev==="SIGNED_IN"||ev==="SIGNED_OUT")cb(ev)})},
    async enviarCodigo(email){const {error}=await sb.auth.signInWithOtp({email,options:{shouldCreateUser:true,emailRedirectTo:location.origin+location.pathname}});if(error)throw new ErrorApp("auth",/rate|seconds/i.test(error.message)?"Esperá un minuto antes de pedir otro código.":error.message)},
    async verificarCodigo(email,token){const {error}=await sb.auth.verifyOtp({email,token,type:"email"});if(error)throw new ErrorApp("auth","El código no es correcto o venció. Pedí uno nuevo.")},
    async salir(){await sb.auth.signOut()},
    misEspacios:()=>rpc("mis_espacios"),
    crearEspacio:(nombre,tipo,miNombre)=>rpc("crear_espacio",{p_nombre:nombre,p_tipo:tipo,p_mi_nombre:miNombre}),
    unirse:(codigo,miNombre)=>rpc("unirse_con_codigo",{p_codigo:codigo,p_mi_nombre:miNombre}),
    async miembros(e){const {data,error}=await sb.from("miembros").select("id,nombre,rol,activo,user_id").eq("espacio_id",e).eq("activo",true).order("creado_en");if(error)throw errDe(error);return data},
    codigo:(e)=>rpc("codigo_de",{e}),
    regenerarCodigo:(e)=>rpc("regenerar_codigo",{e}),
    cambiarRol:(m,rol)=>rpc("cambiar_rol",{m,p_rol:rol}),
    quitarMiembro:(m)=>rpc("quitar_miembro",{m}),
    async actualizarEspacio(e,cambios){const {error}=await sb.from("espacios").update(cambios).eq("id",e);if(error)throw errDe(error)},
    async renombrarMiembro(m,nombre){const {error}=await sb.from("miembros").update({nombre}).eq("id",m);if(error)throw errDe(error)},
    async cargarDocs(e,desdeMes){
      const out=[];
      for(let desde=0;;desde+=1000){
        const {data,error}=await sb.from("docs").select("coleccion,doc_id,data").eq("espacio_id",e).or(`coleccion.neq.meses,mes.gte.${desdeMes}`).order("doc_id").range(desde,desde+999);
        if(error)throw errDe(error);out.push(...data);if(data.length<1000)break;
      }
      return out;
    },
    async guardarDoc(e,coleccion,doc_id,miembro_id,data){
      const {error}=await sb.from("docs").upsert({espacio_id:e,coleccion,doc_id,miembro_id,data},{onConflict:"espacio_id,coleccion,doc_id"});
      if(error){if(esRed(error))throw new ErrorApp("red",MSG.red);throw new ErrorApp(error.code==="42501"?"sin_permiso":"error",error.code==="42501"?"No tenés permiso para guardar esto (¿el espacio está suspendido?).":error.message)}
    },
    suscribir(e,cb,alEstado){
      const ch=sb.channel("docs-"+e).on("postgres_changes",{event:"*",schema:"public",table:"docs",filter:`espacio_id=eq.${e}`},(p)=>{
        const fila=p.eventType==="DELETE"?p.old:p.new;if(!fila)return;cb(fila.coleccion,fila.doc_id,p.eventType==="DELETE"?null:fila.data);
      }).subscribe((st)=>alEstado&&alEstado(st));
      return ()=>sb.removeChannel(ch);
    },
    async estadoIA(e){const d=await rpc("estado_ia",{e});const r=(d&&d[0])||null;return r?{gastado:+r.gastado_usd,tope:+r.tope_usd,foto:!!r.foto,plan:r.plan,activo:!!r.activo}:null},
    async usoMes(e){const ini=new Date();ini.setDate(1);ini.setHours(0,0,0,0);const {data,error}=await sb.from("uso_ia").select("tarea,costo_usd,ok").eq("espacio_id",e).gte("creado_en",ini.toISOString());if(error)throw errDe(error);return data},
    async ia(e,tarea,datos,signal){
      const {data:s}=await sb.auth.getSession();if(!s.session)throw new ErrorApp("sin_sesion",MSG.sin_sesion);
      let r;
      try{r=await fetch(cfg.supabaseUrl.replace(/\/$/,"")+"/functions/v1/ia",{method:"POST",signal,headers:{"Content-Type":"application/json",Authorization:"Bearer "+s.session.access_token,apikey:cfg.supabaseAnonKey},body:JSON.stringify({espacio_id:e,tarea,datos})})}
      catch(err){if(err&&err.name==="AbortError")throw new ErrorApp("cancelado","Cancelado");throw new ErrorApp("ia_no_disponible",MSG.ia_no_disponible)}
      const j=await r.json().catch(()=>({}));
      if(!r.ok)throw new ErrorApp(j.error||"error",j.mensaje||MSG[j.error]||"La IA no pudo responder.");
      return {resultado:j.resultado,gastado:j.gastado_usd,tope:j.tope_usd};
    }
  };
}

/* ---------------- Demo (navegador) ---------------- */
function demo(){
  const K="pyp-demo:";
  const get=(k,d)=>{try{const v=JSON.parse(localStorage.getItem(K+k));return v??d}catch(e){return d}};
  const set=(k,v)=>{try{localStorage.setItem(K+k,JSON.stringify(v))}catch(e){}};
  const uid=()=>([1e7]+-1e3+-4e3+-8e3+-1e11).replace(/[018]/g,c=>(c^Math.random()*16>>c/4).toString(16));
  const yo=get("yo",null);
  const oyentes=new Set();
  return {
    modo:"demo",
    async sesion(){const y=get("yo",null);return y?{email:y.email,id:y.id}:null},
    alCambiarSesion(){},
    async enviarCodigo(){},
    async verificarCodigo(email){set("yo",{email,id:uid()})},
    async salir(){localStorage.removeItem(K+"yo")},
    async misEspacios(){const y=get("yo",null);return get("espacios",[]).filter(e=>e.miembros.some(m=>m.user_id===y.id)).map(e=>{const m=e.miembros.find(x=>x.user_id===y.id);return {espacio_id:e.id,nombre:e.nombre,tipo:e.tipo,datos_compartidos:e.datos_compartidos,marca:e.marca||{},plan_id:"demo",estado:"activo",miembro_id:m.id,rol:m.rol,mi_nombre:m.nombre}})},
    async crearEspacio(nombre,tipo,miNombre){const y=get("yo",null);const es=get("espacios",[]);const id=uid();es.push({id,nombre,tipo,datos_compartidos:tipo==="hogar",marca:{},codigo:Math.random().toString(16).slice(2,10).toUpperCase(),miembros:[{id:uid(),user_id:y.id,rol:"dueno",nombre:miNombre,activo:true}]});set("espacios",es);return id},
    async unirse(codigo,miNombre){const y=get("yo",null);const es=get("espacios",[]);const e=es.find(x=>x.codigo===String(codigo).trim().toUpperCase());if(!e)throw new ErrorApp("codigo_invalido",MSG.codigo_invalido);if(!e.miembros.some(m=>m.user_id===y.id))e.miembros.push({id:uid(),user_id:y.id,rol:"miembro",nombre:miNombre,activo:true});set("espacios",es);return e.id},
    async miembros(id){const e=get("espacios",[]).find(x=>x.id===id);return e?e.miembros.filter(m=>m.activo):[]},
    async codigo(id){return (get("espacios",[]).find(x=>x.id===id)||{}).codigo||null},
    async regenerarCodigo(id){const es=get("espacios",[]);const e=es.find(x=>x.id===id);e.codigo=Math.random().toString(16).slice(2,10).toUpperCase();set("espacios",es);return e.codigo},
    async cambiarRol(m,rol){const es=get("espacios",[]);es.forEach(e=>e.miembros.forEach(x=>{if(x.id===m)x.rol=rol}));set("espacios",es)},
    async quitarMiembro(m){const es=get("espacios",[]);es.forEach(e=>e.miembros.forEach(x=>{if(x.id===m)x.activo=false}));set("espacios",es)},
    async actualizarEspacio(id,c){const es=get("espacios",[]);Object.assign(es.find(x=>x.id===id)||{},c);set("espacios",es)},
    async renombrarMiembro(m,nombre){const es=get("espacios",[]);es.forEach(e=>e.miembros.forEach(x=>{if(x.id===m)x.nombre=nombre}));set("espacios",es)},
    async cargarDocs(id){return Object.entries(get("docs:"+id,{})).map(([k,data])=>{const [coleccion,doc_id]=k.split("/");return {coleccion,doc_id,data}})},
    async guardarDoc(id,coleccion,doc_id,miembro_id,data){const d=get("docs:"+id,{});d[coleccion+"/"+doc_id]=data;set("docs:"+id,d)},
    suscribir(id,cb){const f=(ev)=>{if(ev.key&&ev.key===K+"docs:"+id){const d=JSON.parse(ev.newValue||"{}");Object.entries(d).forEach(([k,v])=>{const [c,i]=k.split("/");cb(c,i,v)})}};window.addEventListener("storage",f);oyentes.add(f);return ()=>window.removeEventListener("storage",f)},
    async estadoIA(){return {gastado:0,tope:0,foto:false,plan:"Demo",activo:true}},
    async usoMes(){return []},
    async ia(){throw new ErrorApp("tope_plan","La demo no usa IA real.")}
  };
}

window.PPBackend={
  crear(cfg){
    const q=new URLSearchParams(location.search);
    if(q.has("demo")||cfg.demo||!cfg.supabaseUrl||!cfg.supabaseAnonKey||!window.supabase)return demo();
    return nube(cfg);
  },
  ErrorApp
};
})();
