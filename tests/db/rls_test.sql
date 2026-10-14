-- Pruebas de seguridad por filas. Cada bloque actúa como un usuario distinto.
\set ON_ERROR_STOP on
\set cris  '11111111-1111-1111-1111-111111111111'
\set clara '22222222-2222-2222-2222-222222222222'
\set profe '33333333-3333-3333-3333-333333333333'
\set socio1 '44444444-4444-4444-4444-444444444444'
\set socio2 '55555555-5555-5555-5555-555555555555'
\set extra '66666666-6666-6666-6666-666666666666'

insert into auth.users values (:'cris','c@x'),(:'clara','cl@x'),(:'profe','p@x'),(:'socio1','s1@x'),(:'socio2','s2@x'),(:'extra','e@x');

create temp table r (k text primary key, v text);
grant all on r to authenticated;

-- ---------- Hogar: Cris crea, Clara se une ----------
set role authenticated;
select set_config('request.jwt.claim.sub', :'cris', false);
insert into r select 'hogar', public.crear_espacio('Casa Aldama','hogar','Cristopher')::text;
insert into r select 'codigo_hogar', public.codigo_de((select v from r where k='hogar')::uuid);
insert into r select 'm_cris', miembro_id::text from public.mis_espacios();

select set_config('request.jwt.claim.sub', :'clara', false);
insert into r select 'hogar2', public.unirse_con_codigo((select v from r where k='codigo_hogar'),'Clara')::text;
insert into r select 'm_clara', miembro_id::text from public.mis_espacios();
\echo '-- Clara no ve el código de invitación (es miembro):'
select coalesce(public.codigo_de((select v from r where k='hogar')::uuid),'(nulo)') as codigo_para_clara;

-- Clara anota una comida para Cris (hogar compartido)
insert into public.docs (espacio_id, coleccion, doc_id, miembro_id, data)
select (select v from r where k='hogar')::uuid, 'meses', (select v from r where k='m_cris')||'_2026-10',
       (select v from r where k='m_cris')::uuid, '{"comidas":{"2026-10-13":[{"texto":"milanesa"}]}}';
insert into public.docs (espacio_id, coleccion, doc_id, miembro_id, data)
select (select v from r where k='hogar')::uuid, 'cocina', 'hogar_despensa', null, '{"items":[{"nombre":"Huevos"}]}';
\echo '-- Clara ve en el hogar (esperado 2 docs):'
select coleccion, doc_id like '%_2026-10' as es_mes from public.docs order by 1;

select set_config('request.jwt.claim.sub', :'cris', false);
update public.docs set data = '{"items":[{"nombre":"Huevos"},{"nombre":"Pollo"}]}' where doc_id='hogar_despensa';
\echo '-- Cris editó la despensa; versión esperada 2:'
select version, actualizado_por = :'cris'::uuid as autor_ok from public.docs where doc_id='hogar_despensa';

-- Cris intenta cambiarse el plan (no debe poder)
do $$ begin
  begin
    update public.espacios set plan_id = 'gimnasio';
    raise exception 'FALLO: pudo cambiar el plan';
  exception when insufficient_privilege then raise notice 'OK: no puede cambiar el plan';
  end;
end $$;
-- Cris no puede escribir uso de IA
do $$ begin
  begin
    insert into public.uso_ia (espacio_id, tarea, modelo) values (gen_random_uuid(),'x','y');
    raise exception 'FALLO: pudo registrar uso de IA';
  exception when insufficient_privilege then raise notice 'OK: no puede registrar uso de IA';
  end;
end $$;

-- ---------- Gimnasio: profe crea; dos socios se unen ----------
select set_config('request.jwt.claim.sub', :'profe', false);
insert into r select 'gym', public.crear_espacio('Gimnasio Punto','gimnasio','Profe')::text;
insert into r select 'codigo_gym', public.codigo_de((select v from r where k='gym')::uuid);

select set_config('request.jwt.claim.sub', :'socio1', false);
select public.unirse_con_codigo(lower((select v from r where k='codigo_gym')),'Socio Uno') is not null as unido1;
insert into r select 'm_s1', miembro_id::text from public.mis_espacios();
insert into public.docs (espacio_id, coleccion, doc_id, miembro_id, data)
select (select v from r where k='gym')::uuid, 'perfiles', (select v from r where k='m_s1'), (select v from r where k='m_s1')::uuid, '{"peso":80}';
insert into public.docs (espacio_id, coleccion, doc_id, miembro_id, data)
select (select v from r where k='gym')::uuid, 'cocina', (select v from r where k='m_s1')||'_despensa', (select v from r where k='m_s1')::uuid, '{"items":[]}';

select set_config('request.jwt.claim.sub', :'socio2', false);
select public.unirse_con_codigo((select v from r where k='codigo_gym'),'Socio Dos') is not null as unido2;
insert into r select 'm_s2', miembro_id::text from public.mis_espacios();
\echo '-- Socio 2 NO ve datos del Socio 1 (esperado 0):'
select count(*) as docs_visibles from public.docs;
\echo '-- Socio 2 ve solo a sí mismo en la lista de miembros (esperado 1):'
select count(*) as miembros_visibles from public.miembros;
do $$ begin
  insert into public.docs (espacio_id, coleccion, doc_id, miembro_id, data)
  select (select v from r where k='gym')::uuid, 'perfiles', (select v from r where k='m_s1'), (select v from r where k='m_s1')::uuid, '{"hack":true}'
  on conflict (espacio_id, coleccion, doc_id) do update set data = excluded.data;
  raise exception 'FALLO: socio 2 escribió el perfil del socio 1';
exception when insufficient_privilege then raise notice 'OK: socio 2 no puede escribir datos del socio 1';
end $$;
do $$ begin
  insert into public.docs (espacio_id, coleccion, doc_id, miembro_id, data)
  select (select v from r where k='gym')::uuid, 'cocina', 'hogar_despensa', null, '{"x":1}';
  raise exception 'FALLO: socio creó cocina común en un gimnasio';
exception when insufficient_privilege then raise notice 'OK: un socio no puede crear cocina común en un gimnasio';
end $$;

select set_config('request.jwt.claim.sub', :'profe', false);
\echo '-- El profe ve los datos de sus socios (esperado >=2):'
select count(*) as docs_que_ve_el_profe from public.docs where espacio_id = (select v from r where k='gym')::uuid;
\echo '-- El profe no ve nada del hogar de Cris (esperado 0):'
select count(*) from public.docs where espacio_id = (select v from r where k='hogar')::uuid;
\echo '-- El profe asciende al socio 1 a profesional:'
select public.cambiar_rol((select v from r where k='m_s1')::uuid,'profesional');
select rol from public.miembros where id = (select v from r where k='m_s1')::uuid;

-- ---------- Alguien de afuera ----------
select set_config('request.jwt.claim.sub', :'extra', false);
\echo '-- Usuario externo no ve espacios ni docs (esperado 0 / 0):'
select (select count(*) from public.espacios) as espacios, (select count(*) from public.docs) as docs;
do $$ begin
  if public.unirse_con_codigo('NOEXISTE','X') is not null then raise exception 'FALLO: código inválido aceptado'; end if;
  raise notice 'OK: código inválido rechazado';
end $$;
-- Tope de intentos fallidos (10 por hora)
do $$ declare i int; begin
  for i in 1..9 loop perform public.unirse_con_codigo('NOEXISTE' || i, 'X'); end loop;
  begin
    perform public.unirse_con_codigo('OTRO', 'X');
    raise exception 'FALLO: sin tope de intentos';
  exception when others then
    if sqlerrm = 'muchos_intentos' then raise notice 'OK: tope de intentos de código'; else raise; end if;
  end;
end $$;
-- El dueño no puede abrir los datos de un gimnasio
select set_config('request.jwt.claim.sub', :'profe', false);
do $$ begin
  begin
    update public.espacios set datos_compartidos = true;
    raise exception 'FALLO: el dueño pudo compartir los datos del gimnasio';
  exception when insufficient_privilege then raise notice 'OK: no se puede cambiar datos_compartidos';
  end;
end $$;
-- Quitado y de vuelta: entra como miembro, no con su rol anterior (socio 1 era profesional)
select public.quitar_miembro((select v from r where k='m_s1')::uuid);
\echo '-- Al quitar a alguien cambia el código (esperado true):'
select public.codigo_de((select v from r where k='gym')::uuid) <> (select v from r where k='codigo_gym') as codigo_nuevo;
insert into r select 'codigo_gym2', public.codigo_de((select v from r where k='gym')::uuid);
select set_config('request.jwt.claim.sub', :'socio1', false);
do $$ begin
  if public.unirse_con_codigo((select v from r where k='codigo_gym'), 'Socio Uno') is not null then
    raise exception 'FALLO: entró con el código viejo';
  end if;
  raise notice 'OK: el código viejo ya no sirve';
end $$;
select public.unirse_con_codigo((select v from r where k='codigo_gym2'), 'Socio Uno') is not null as volvio;
\echo '-- Socio 1 volvió como miembro (esperado miembro):'
select rol from public.miembros where id = (select v from r where k='m_s1')::uuid;
select set_config('request.jwt.claim.sub', :'extra', false);
\echo '-- Estado de IA no se revela a externos (esperado 0 filas):'
select count(*) from public.estado_ia((select v from r where k='hogar')::uuid);

-- ---------- Uso de IA y tope (simula la función del servidor) ----------
reset role;
insert into public.uso_ia (espacio_id, user_id, tarea, modelo, tokens_entrada, tokens_salida, costo_usd)
select (select v from r where k='hogar')::uuid, :'cris', 'recetas', 'claude-sonnet-5-5', 1500, 2500, 0.028;
set role authenticated;
select set_config('request.jwt.claim.sub', :'clara', false);
\echo '-- Clara ve el estado de IA del hogar:'
select gastado_usd, tope_usd, foto, plan from public.estado_ia((select v from r where k='hogar')::uuid);
\echo '-- Clara (no dueña) no ve el detalle de uso (esperado 0):'
select count(*) from public.uso_ia;
select set_config('request.jwt.claim.sub', :'cris', false);
\echo '-- Cris (dueño) ve el detalle de uso (esperado 1):'
select count(*) from public.uso_ia;

-- ---------- Espacio suspendido: no se puede escribir ----------
reset role;
update public.espacios set estado = 'suspendido' where id = (select v from r where k='hogar')::uuid;
set role authenticated;
select set_config('request.jwt.claim.sub', :'cris', false);
do $$ begin
  update public.docs set data = '{}' where doc_id = 'hogar_despensa';
  if found then raise exception 'FALLO: escribió en un espacio suspendido'; end if;
  raise notice 'OK: sin cambios en espacio suspendido';
exception when insufficient_privilege then raise notice 'OK: no puede escribir en un espacio suspendido';
end $$;
do $$ begin
  delete from public.docs where doc_id = 'hogar_despensa';
  if found then raise exception 'FALLO: borró en un espacio suspendido'; end if;
  raise notice 'OK: no puede borrar en un espacio suspendido';
end $$;
\echo '-- Pero puede seguir leyendo sus datos (esperado 2):'
select count(*) from public.docs where espacio_id = (select v from r where k='hogar')::uuid;

reset role;
\echo '-- Vista de administrador:'
select nombre, plan_id, miembros_activos, costo_ia_mes_usd from public.admin_resumen order by nombre;
\echo 'TODAS LAS PRUEBAS TERMINARON'
