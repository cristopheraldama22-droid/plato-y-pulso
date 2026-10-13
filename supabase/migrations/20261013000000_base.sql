-- =====================================================================
-- Plato y Pulso · esquema base (multi-espacio)
--
-- Un "espacio" es la unidad que paga: un hogar, un gimnasio, un
-- entrenador o una nutricionista. Cada espacio tiene miembros con rol
-- (dueno, profesional, miembro) y un plan con tope mensual de IA.
--
-- Los datos de la app se guardan como documentos JSON (igual que en el
-- artefacto original), con seguridad por persona:
--   perfiles/<miembro>          datos y rutinas de una persona
--   meses/<miembro>_<AAAA-MM>   comidas, entrenos y extras de un mes
--   cocina/<alcance>_<nombre>   despensa, platos, compras, recetas, catálogo
--       alcance = "hogar" (compartida por todo el espacio) o <miembro> (personal)
--
-- Las actualizaciones de la app no tocan estas tablas: el código y los
-- datos viven en lugares distintos.
-- =====================================================================

-- Sin extensiones: gen_random_uuid() viene con Postgres.

-- ---------------------------------------------------------------------
-- Planes (los edita el administrador desde el panel de Supabase)
-- ---------------------------------------------------------------------
create table public.planes (
  id             text primary key,
  nombre         text not null,
  max_miembros   int  not null check (max_miembros > 0),
  ia_tope_usd    numeric(10,4) not null check (ia_tope_usd >= 0),   -- gasto máximo de IA por mes
  ia_foto        boolean not null default true,                     -- permite estimar desde foto
  precio_usd_mes numeric(10,2),                                     -- referencia comercial (no cobra solo)
  activo         boolean not null default true
);

insert into public.planes (id, nombre, max_miembros, ia_tope_usd, ia_foto, precio_usd_mes) values
  ('piloto',       'Piloto',        6,   3.00, true,  0),
  ('hogar',        'Hogar',         4,   1.00, true,  4),
  ('profesional',  'Profesional',  40,   8.00, true, 19),
  ('gimnasio',     'Gimnasio',    300,  40.00, true, 59);

-- ---------------------------------------------------------------------
-- Espacios y miembros
-- ---------------------------------------------------------------------
create table public.espacios (
  id                 uuid primary key default gen_random_uuid(),
  nombre             text not null check (char_length(nombre) between 1 and 80),
  tipo               text not null default 'hogar'
                     check (tipo in ('hogar','gimnasio','entrenador','nutricionista')),
  datos_compartidos  boolean not null default true,   -- hogar: todos ven y anotan a todos
  plan_id            text not null default 'piloto' references public.planes(id),
  plan_vence         date,
  estado             text not null default 'activo' check (estado in ('activo','suspendido')),
  marca              jsonb not null default '{}'::jsonb, -- {"nombre_app": "...", "color": "#2D6A3A"}
  creado_por         uuid references auth.users(id) on delete set null,
  creado_en          timestamptz not null default now()
);

create table public.miembros (
  id          uuid primary key default gen_random_uuid(),
  espacio_id  uuid not null references public.espacios(id) on delete cascade,
  user_id     uuid references auth.users(id) on delete set null,
  rol         text not null default 'miembro' check (rol in ('dueno','profesional','miembro')),
  nombre      text not null check (char_length(nombre) between 1 and 60),
  activo      boolean not null default true,
  creado_en   timestamptz not null default now(),
  unique (espacio_id, user_id)
);
create index miembros_user_idx on public.miembros(user_id);

-- Código para sumarse a un espacio (solo lo ven dueño y profesionales)
create table public.espacio_codigos (
  espacio_id  uuid primary key references public.espacios(id) on delete cascade,
  codigo      text not null unique default upper(left(replace(gen_random_uuid()::text,'-',''),8))
);

-- ---------------------------------------------------------------------
-- Documentos de la app
-- ---------------------------------------------------------------------
create table public.docs (
  espacio_id      uuid not null references public.espacios(id) on delete cascade,
  coleccion       text not null check (coleccion in ('perfiles','meses','cocina')),
  doc_id          text not null check (doc_id ~ '^[A-Za-z0-9_.:-]{1,120}$'),
  miembro_id      uuid references public.miembros(id) on delete cascade,
  data            jsonb not null,
  mes             text generated always as (case when coleccion = 'meses' then right(doc_id, 7) end) stored,
  version         int  not null default 1,
  actualizado_en  timestamptz not null default now(),
  actualizado_por uuid,
  primary key (espacio_id, coleccion, doc_id),
  -- cada documento personal apunta a su persona y su id lo refleja
  check (coleccion = 'cocina' or miembro_id is not null),
  check (coleccion <> 'perfiles' or doc_id = miembro_id::text),
  check (coleccion <> 'meses'    or (left(doc_id, 36) = miembro_id::text and doc_id ~ '_[0-9]{4}-[0-9]{2}$')),
  check (coleccion <> 'cocina'   or (miembro_id is null and doc_id like 'hogar\_%')
                                 or (miembro_id is not null and left(doc_id, 36) = miembro_id::text)),
  check (pg_column_size(data) < 900000)
);
create index docs_mes_idx on public.docs(espacio_id, coleccion, mes);

-- ---------------------------------------------------------------------
-- Uso de IA (para topes por plan y para facturar)
-- ---------------------------------------------------------------------
create table public.uso_ia (
  id              bigint generated always as identity primary key,
  espacio_id      uuid not null references public.espacios(id) on delete cascade,
  user_id         uuid,
  tarea           text not null,
  modelo          text not null,
  tokens_entrada  int not null default 0,
  tokens_salida   int not null default 0,
  costo_usd       numeric(12,6) not null default 0,
  ok              boolean not null default true,
  creado_en       timestamptz not null default now()
);
create index uso_ia_espacio_fecha_idx on public.uso_ia(espacio_id, creado_en);
create index uso_ia_user_fecha_idx on public.uso_ia(user_id, creado_en);

-- ---------------------------------------------------------------------
-- Funciones auxiliares (security definer para evitar recursión en RLS)
-- ---------------------------------------------------------------------
create or replace function public.rol_en(e uuid) returns text
language sql stable security definer set search_path = public as $$
  select m.rol from miembros m
  where m.espacio_id = e and m.user_id = auth.uid() and m.activo
  limit 1
$$;

create or replace function public.es_miembro(e uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select public.rol_en(e) is not null
$$;

-- ¿Puedo ver los datos de la persona m dentro del espacio e?
create or replace function public.puede_ver_miembro(e uuid, m uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1
    from miembros t
    join espacios s on s.id = t.espacio_id
    join miembros yo on yo.espacio_id = t.espacio_id and yo.user_id = auth.uid() and yo.activo
    where t.id = m and t.espacio_id = e
      and (yo.id = t.id or s.datos_compartidos or yo.rol in ('dueno','profesional'))
  )
$$;

-- Escribir: uno mismo; en espacios compartidos (hogar), cualquiera;
-- dueños y profesionales pueden cargar rutinas o comidas de sus miembros.
create or replace function public.puede_escribir_miembro(e uuid, m uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select public.puede_ver_miembro(e, m)
     and exists (select 1 from espacios s where s.id = e and s.estado = 'activo')
$$;

-- Documentos comunes del espacio (cocina del hogar): solo donde los datos se comparten,
-- o para dueños y profesionales. En un gimnasio, un socio no puede leer ni crear nada común.
create or replace function public.puede_comun(e uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from espacios s where s.id = e
                 and (s.datos_compartidos or public.rol_en(e) in ('dueno','profesional')))
$$;

create or replace function public.espacio_activo(e uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from espacios s where s.id = e and s.estado = 'activo')
$$;

-- ---------------------------------------------------------------------
-- Seguridad por filas
-- ---------------------------------------------------------------------
alter table public.planes          enable row level security;
alter table public.espacios        enable row level security;
alter table public.miembros        enable row level security;
alter table public.espacio_codigos enable row level security;
alter table public.docs            enable row level security;
alter table public.uso_ia          enable row level security;

create policy planes_lectura on public.planes for select to authenticated using (activo);

create policy espacios_lectura on public.espacios for select to authenticated
  using (public.es_miembro(id));
create policy espacios_edicion on public.espacios for update to authenticated
  using (public.rol_en(id) = 'dueno') with check (public.rol_en(id) = 'dueno');

create policy miembros_lectura on public.miembros for select to authenticated
  using (user_id = auth.uid() or public.puede_ver_miembro(espacio_id, id));
create policy miembros_edicion on public.miembros for update to authenticated
  using (user_id = auth.uid() or public.rol_en(espacio_id) = 'dueno')
  with check (user_id = auth.uid() or public.rol_en(espacio_id) = 'dueno');

create policy codigos_lectura on public.espacio_codigos for select to authenticated
  using (public.rol_en(espacio_id) in ('dueno','profesional'));

create policy docs_lectura on public.docs for select to authenticated
  using (public.es_miembro(espacio_id)
         and (case when miembro_id is null then public.puede_comun(espacio_id) else public.puede_ver_miembro(espacio_id, miembro_id) end));
create policy docs_alta on public.docs for insert to authenticated
  with check (public.es_miembro(espacio_id) and public.espacio_activo(espacio_id)
              and (case when miembro_id is null then public.puede_comun(espacio_id) else public.puede_escribir_miembro(espacio_id, miembro_id) end));
create policy docs_cambio on public.docs for update to authenticated
  using (public.es_miembro(espacio_id)
         and (case when miembro_id is null then public.puede_comun(espacio_id) else public.puede_escribir_miembro(espacio_id, miembro_id) end))
  with check (public.es_miembro(espacio_id) and public.espacio_activo(espacio_id)
              and (case when miembro_id is null then public.puede_comun(espacio_id) else public.puede_escribir_miembro(espacio_id, miembro_id) end));
create policy docs_baja on public.docs for delete to authenticated
  using (public.es_miembro(espacio_id)
         and (case when miembro_id is null then public.puede_comun(espacio_id) else public.puede_escribir_miembro(espacio_id, miembro_id) end));

create policy uso_lectura on public.uso_ia for select to authenticated
  using (public.rol_en(espacio_id) = 'dueno');

-- Columnas que un dueño puede cambiar desde la app (el plan y el estado
-- solo los cambia el administrador desde el panel).
revoke update on public.espacios from authenticated;
grant  update (nombre, tipo, datos_compartidos, marca) on public.espacios to authenticated;
revoke update on public.miembros from authenticated;
grant  update (nombre) on public.miembros to authenticated;
revoke insert, delete on public.espacios, public.miembros, public.espacio_codigos, public.uso_ia, public.planes from authenticated;
revoke update on public.uso_ia, public.planes, public.espacio_codigos from authenticated;

-- ---------------------------------------------------------------------
-- Mantenimiento de versión y autor de cada documento
-- ---------------------------------------------------------------------
create or replace function public.docs_tocar() returns trigger
language plpgsql as $$
begin
  new.actualizado_en := now();
  new.actualizado_por := auth.uid();
  if tg_op = 'UPDATE' then
    new.version := old.version + 1;
  end if;
  return new;
end $$;
create trigger docs_tocar before insert or update on public.docs
  for each row execute function public.docs_tocar();

-- ---------------------------------------------------------------------
-- Operaciones (RPC) que usa la app
-- ---------------------------------------------------------------------
create or replace function public.crear_espacio(p_nombre text, p_tipo text, p_mi_nombre text)
returns uuid language plpgsql security definer set search_path = public as $$
declare e uuid;
begin
  if auth.uid() is null then raise exception 'sin_sesion'; end if;
  if (select count(*) from miembros where user_id = auth.uid() and rol = 'dueno') >= 5 then
    raise exception 'limite_espacios';
  end if;
  insert into espacios (nombre, tipo, datos_compartidos, creado_por)
  values (trim(p_nombre), p_tipo, p_tipo = 'hogar', auth.uid())
  returning id into e;
  insert into miembros (espacio_id, user_id, rol, nombre) values (e, auth.uid(), 'dueno', trim(p_mi_nombre));
  insert into espacio_codigos (espacio_id) values (e);
  return e;
end $$;

create or replace function public.unirse_con_codigo(p_codigo text, p_mi_nombre text)
returns uuid language plpgsql security definer set search_path = public as $$
declare e uuid; maxm int; n int;
begin
  if auth.uid() is null then raise exception 'sin_sesion'; end if;
  select c.espacio_id into e from espacio_codigos c where c.codigo = upper(trim(p_codigo));
  if e is null then raise exception 'codigo_invalido'; end if;
  if exists (select 1 from miembros where espacio_id = e and user_id = auth.uid()) then
    update miembros set activo = true where espacio_id = e and user_id = auth.uid();
    return e;
  end if;
  select p.max_miembros into maxm from espacios s join planes p on p.id = s.plan_id where s.id = e;
  select count(*) into n from miembros where espacio_id = e and activo;
  if n >= maxm then raise exception 'espacio_lleno'; end if;
  insert into miembros (espacio_id, user_id, rol, nombre) values (e, auth.uid(), 'miembro', trim(p_mi_nombre));
  return e;
end $$;

create or replace function public.mis_espacios()
returns table (espacio_id uuid, nombre text, tipo text, datos_compartidos boolean, marca jsonb,
               plan_id text, estado text, miembro_id uuid, rol text, mi_nombre text)
language sql stable security definer set search_path = public as $$
  select s.id, s.nombre, s.tipo, s.datos_compartidos, s.marca, s.plan_id, s.estado, m.id, m.rol, m.nombre
  from miembros m join espacios s on s.id = m.espacio_id
  where m.user_id = auth.uid() and m.activo
  order by s.creado_en
$$;

create or replace function public.codigo_de(e uuid) returns text
language sql stable security definer set search_path = public as $$
  select c.codigo from espacio_codigos c
  where c.espacio_id = e and public.rol_en(e) in ('dueno','profesional')
$$;

create or replace function public.regenerar_codigo(e uuid) returns text
language plpgsql security definer set search_path = public as $$
declare c text;
begin
  if public.rol_en(e) <> 'dueno' or public.rol_en(e) is null then raise exception 'sin_permiso'; end if;
  update espacio_codigos set codigo = upper(left(replace(gen_random_uuid()::text,'-',''),8)) where espacio_id = e returning codigo into c;
  return c;
end $$;

create or replace function public.cambiar_rol(m uuid, p_rol text) returns void
language plpgsql security definer set search_path = public as $$
declare e uuid; u uuid;
begin
  select espacio_id, user_id into e, u from miembros where id = m;
  if e is null or public.rol_en(e) is distinct from 'dueno' then raise exception 'sin_permiso'; end if;
  if p_rol not in ('dueno','profesional','miembro') then raise exception 'rol_invalido'; end if;
  if u = auth.uid() and p_rol <> 'dueno'
     and (select count(*) from miembros where espacio_id = e and rol = 'dueno' and activo) <= 1 then
    raise exception 'ultimo_dueno';
  end if;
  update miembros set rol = p_rol where id = m;
end $$;

create or replace function public.quitar_miembro(m uuid) returns void
language plpgsql security definer set search_path = public as $$
declare e uuid; u uuid;
begin
  select espacio_id, user_id into e, u from miembros where id = m;
  if e is null then raise exception 'no_existe'; end if;
  if u is distinct from auth.uid() and public.rol_en(e) is distinct from 'dueno' then raise exception 'sin_permiso'; end if;
  if (select rol from miembros where id = m) = 'dueno'
     and (select count(*) from miembros where espacio_id = e and rol = 'dueno' and activo) <= 1 then
    raise exception 'ultimo_dueno';
  end if;
  update miembros set activo = false where id = m;
end $$;

-- Lo que la app necesita saber de la IA: cuánto se gastó, el tope y si hay foto.
create or replace function public.estado_ia(e uuid)
returns table (gastado_usd numeric, tope_usd numeric, foto boolean, plan text, activo boolean)
language sql stable security definer set search_path = public as $$
  select coalesce((select sum(u.costo_usd) from uso_ia u
                   where u.espacio_id = e and u.creado_en >= date_trunc('month', now())), 0),
         p.ia_tope_usd, p.ia_foto, p.nombre, s.estado = 'activo'
  from espacios s join planes p on p.id = s.plan_id
  where s.id = e and public.es_miembro(e)
$$;

revoke execute on all functions in schema public from anon, public;
grant execute on function public.crear_espacio(text,text,text), public.unirse_con_codigo(text,text),
  public.mis_espacios(), public.codigo_de(uuid), public.regenerar_codigo(uuid),
  public.cambiar_rol(uuid,text), public.quitar_miembro(uuid), public.estado_ia(uuid),
  public.rol_en(uuid), public.es_miembro(uuid), public.puede_ver_miembro(uuid,uuid),
  public.puede_escribir_miembro(uuid,uuid), public.puede_comun(uuid), public.espacio_activo(uuid)
  to authenticated;

-- ---------------------------------------------------------------------
-- Vista para el administrador (solo desde el panel de Supabase)
-- ---------------------------------------------------------------------
create or replace view public.admin_resumen with (security_invoker = true) as
select s.id, s.nombre, s.tipo, s.plan_id, p.precio_usd_mes, s.estado, s.plan_vence, s.creado_en,
       (select count(*) from miembros m where m.espacio_id = s.id and m.activo) as miembros_activos,
       (select coalesce(sum(u.costo_usd),0) from uso_ia u
         where u.espacio_id = s.id and u.creado_en >= date_trunc('month', now())) as costo_ia_mes_usd,
       (select max(d.actualizado_en) from docs d where d.espacio_id = s.id) as ultima_actividad
from espacios s join planes p on p.id = s.plan_id;
revoke all on public.admin_resumen from anon, authenticated;

-- ---------------------------------------------------------------------
-- Tiempo real para los documentos (sincroniza los celulares al instante)
-- ---------------------------------------------------------------------
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    execute 'alter publication supabase_realtime add table public.docs';
  end if;
end $$;
alter table public.docs replica identity full;
