-- =====================================================================
-- Plato y Pulso · prueba gratis y panel de uso
--
--   1. Plan inicial configurable (tabla "ajustes"): durante la beta los
--      espacios nuevos nacen en "beta" (gratis, con IA); después, en
--      "prueba": 7 días con IA y al vencer la app sigue andando sin IA.
--   2. estado_ia informa el vencimiento para que la app apague la IA.
--   3. Actividad diaria por persona (solo el día, sin contenido), para
--      medir cuántos usan la app.
--   4. panel_uso(): métricas para el administrador.
-- =====================================================================

-- ---------- 1. Planes y plan inicial ----------
insert into public.planes (id, nombre, max_miembros, ia_tope_usd, ia_foto, precio_usd_mes) values
  ('beta', 'Beta (gratis)', 6, 1.00, true, 0)
on conflict (id) do nothing;
update public.planes set nombre = 'Prueba gratis', ia_tope_usd = 0.50, ia_foto = true where id = 'prueba';

create table public.ajustes (
  clave  text primary key,
  valor  text not null
);
alter table public.ajustes enable row level security;   -- sin políticas: solo el panel de Supabase y las funciones
revoke all on public.ajustes from anon, authenticated;
insert into public.ajustes (clave, valor) values
  ('plan_inicial', 'beta'),   -- cambiar a 'prueba' cuando empiece el cobro
  ('dias_prueba',  '7');

create or replace function public.crear_espacio(p_nombre text, p_tipo text, p_mi_nombre text)
returns uuid language plpgsql security definer set search_path = public as $$
declare e uuid; plan text; dias int;
begin
  if auth.uid() is null then raise exception 'sin_sesion'; end if;
  if p_tipo not in ('hogar','personal') then raise exception 'tipo_invalido'; end if;
  if (select count(*) from miembros where user_id = auth.uid() and rol = 'dueno' and activo) >= 2 then
    raise exception 'limite_espacios';
  end if;
  plan := coalesce((select valor from ajustes where clave = 'plan_inicial'), 'prueba');
  if not exists (select 1 from planes where id = plan) then plan := 'prueba'; end if;
  dias := coalesce((select valor::int from ajustes where clave = 'dias_prueba'), 7);
  insert into espacios (nombre, tipo, datos_compartidos, creado_por, plan_id, plan_vence)
  values (trim(p_nombre), p_tipo, true, auth.uid(), plan,
          case when plan = 'prueba' then current_date + dias end)
  returning id into e;
  insert into miembros (espacio_id, user_id, rol, nombre) values (e, auth.uid(), 'dueno', trim(p_mi_nombre));
  insert into espacio_codigos (espacio_id) values (e);
  return e;
end $$;

-- ---------- 2. Estado de IA con vencimiento ----------
drop function public.estado_ia(uuid);
create function public.estado_ia(e uuid)
returns table (gastado_usd numeric, tope_usd numeric, foto boolean, plan text, activo boolean,
               plan_id text, vence date, ia_activa boolean)
language sql stable security definer set search_path = public as $$
  select coalesce((select sum(u.costo_usd) from uso_ia u
                   where u.espacio_id = e and u.creado_en >= date_trunc('month', now())), 0),
         p.ia_tope_usd, p.ia_foto, p.nombre, s.estado = 'activo',
         s.plan_id, s.plan_vence,
         s.estado = 'activo' and (s.plan_vence is null or s.plan_vence >= current_date)
  from espacios s join planes p on p.id = s.plan_id
  where s.id = e and public.es_miembro(e)
$$;
revoke execute on function public.estado_ia(uuid) from anon, public;
grant execute on function public.estado_ia(uuid) to authenticated;

-- ---------- 3. Actividad diaria ----------
create table public.actividad (
  user_id  uuid not null references auth.users(id) on delete cascade,
  dia      date not null,
  primary key (user_id, dia)
);
create index actividad_dia_idx on public.actividad(dia);
alter table public.actividad enable row level security;  -- sin políticas: nadie la lee desde la app
revoke all on public.actividad from anon, authenticated;

create or replace function public.marcar_actividad() returns void
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then return; end if;
  insert into actividad (user_id, dia) values (auth.uid(), (now() at time zone 'America/Montevideo')::date)
  on conflict do nothing;
end $$;
revoke execute on function public.marcar_actividad() from anon, public;
grant execute on function public.marcar_actividad() to authenticated;

-- ---------- 4. Panel del administrador ----------
create table public.administradores (
  user_id  uuid primary key references auth.users(id) on delete cascade
);
alter table public.administradores enable row level security;
revoke all on public.administradores from anon, authenticated;

create or replace function public.panel_uso() returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare hoy date := (now() at time zone 'America/Montevideo')::date; r jsonb;
begin
  if not exists (select 1 from administradores where user_id = auth.uid()) then raise exception 'sin_permiso'; end if;

  with comidas as (
    select d.espacio_id, c.key::date as dia, jsonb_array_length(c.value) as n
    from docs d, jsonb_each(case when jsonb_typeof(d.data->'comidas') = 'object' then d.data->'comidas' else '{}' end) c
    where d.coleccion = 'meses' and jsonb_typeof(c.value) = 'array' and c.key ~ '^\d{4}-\d{2}-\d{2}$'
  ), entrenos as (
    select d.espacio_id, c.key::date as dia, jsonb_array_length(c.value) as n
    from docs d, jsonb_each(case when jsonb_typeof(d.data->'entrenos') = 'object' then d.data->'entrenos' else '{}' end) c
    where d.coleccion = 'meses' and jsonb_typeof(c.value) = 'array' and c.key ~ '^\d{4}-\d{2}-\d{2}$'
  ), ia_mes as (
    select * from uso_ia where creado_en >= date_trunc('month', now())
  )
  select jsonb_build_object(
    'generado', now(),
    'usuarios', jsonb_build_object(
      'total', (select count(*) from auth.users),
      'nuevos_7', (select count(*) from auth.users where created_at >= now() - interval '7 days'),
      'nuevos_30', (select count(*) from auth.users where created_at >= now() - interval '30 days'),
      'con_consentimiento', (select count(distinct user_id) from consentimientos)),
    'activos', jsonb_build_object(
      'hoy', (select count(*) from actividad where dia = hoy),
      'd7', (select count(distinct user_id) from actividad where dia > hoy - 7),
      'd30', (select count(distinct user_id) from actividad where dia > hoy - 30),
      'retencion_7', (select case when count(*) = 0 then null else round(100.0 * count(*) filter (
                        where exists (select 1 from actividad a where a.user_id = u.id and a.dia > hoy - 7)) / count(*)) end
                      from auth.users u where u.created_at < now() - interval '7 days')),
    'serie_activos', (select coalesce(jsonb_agg(jsonb_build_object('dia', g.dia, 'n',
                        (select count(*) from actividad a where a.dia = g.dia)) order by g.dia), '[]')
                      from (select generate_series(hoy - 29, hoy, interval '1 day')::date as dia) g),
    'serie_registros', (select coalesce(jsonb_agg(jsonb_build_object('semana', w.semana, 'n',
                        (select count(*) from auth.users u where date_trunc('week', u.created_at)::date = w.semana)) order by w.semana), '[]')
                      from (select generate_series(date_trunc('week', hoy - 49), date_trunc('week', hoy), interval '7 days')::date as semana) w),
    'carga', jsonb_build_object(
      'comidas_7', (select coalesce(sum(n), 0) from comidas where dia > hoy - 7),
      'comidas_30', (select coalesce(sum(n), 0) from comidas where dia > hoy - 30),
      'entrenos_30', (select coalesce(sum(n), 0) from entrenos where dia > hoy - 30)),
    'espacios', (select coalesce(jsonb_agg(jsonb_build_object('tipo', tipo, 'plan', plan_id, 'n', n)), '[]')
                 from (select tipo, plan_id, count(*) n from espacios group by 1, 2) x),
    'ia', jsonb_build_object(
      'consultas_mes', (select count(*) from ia_mes),
      'costo_mes', (select coalesce(sum(costo_usd), 0) from ia_mes),
      'fallidas_mes', (select count(*) from ia_mes where not ok),
      'por_tarea', (select coalesce(jsonb_agg(jsonb_build_object('tarea', tarea, 'n', n, 'costo', c)), '[]')
                    from (select tarea, count(*) n, sum(costo_usd) c from ia_mes group by 1) x)),
    'detalle', (select coalesce(jsonb_agg(x order by x->>'ultima' desc nulls last), '[]') from (
      select jsonb_build_object(
        'nombre', s.nombre, 'tipo', s.tipo, 'plan', s.plan_id, 'vence', s.plan_vence, 'estado', s.estado,
        'creado', s.creado_en::date,
        'personas', (select count(*) from miembros m where m.espacio_id = s.id and m.activo),
        'comidas_30', (select coalesce(sum(n), 0) from comidas c where c.espacio_id = s.id and c.dia > hoy - 30),
        'costo_ia_mes', (select coalesce(sum(costo_usd), 0) from ia_mes i where i.espacio_id = s.id),
        'ultima', (select max(a.dia) from actividad a join miembros m on m.user_id = a.user_id
                   where m.espacio_id = s.id and m.activo)) as x
      from espacios s) t)
  ) into r;
  return r;
end $$;
revoke execute on function public.panel_uso() from anon, public;
grant execute on function public.panel_uso() to authenticated;   -- adentro controla que seas administrador
