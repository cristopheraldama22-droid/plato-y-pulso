-- =====================================================================
-- Plato y Pulso · ajustes de seguridad antes de publicar
--
-- Solo agrega o reemplaza funciones y permisos; no toca datos existentes.
--   1. Los espacios nuevos nacen en el plan "prueba" (sin IA). El
--      administrador los pasa a un plan con IA desde el panel.
--   2. Quien fue quitado de un espacio vuelve como "miembro" (nunca con
--      su rol anterior) y respetando el cupo del plan.
--   3. Al quitar a otra persona se cambia el código de invitación.
--   4. Códigos de invitación más largos y tope de intentos fallidos.
--   5. El dueño no puede cambiar "tipo" ni "datos_compartidos" (en un
--      gimnasio expondría los datos de salud de todos los socios).
--   6. En un espacio suspendido tampoco se puede borrar.
--   7. Permisos: sin TRUNCATE para la app y las funciones nuevas no
--      quedan abiertas a anon.
-- =====================================================================

-- ---------- 1. Plan de prueba, sin IA ----------
insert into public.planes (id, nombre, max_miembros, ia_tope_usd, ia_foto, precio_usd_mes)
values ('prueba', 'Prueba (sin IA)', 6, 0, false, 0)
on conflict (id) do nothing;

alter table public.espacios alter column plan_id set default 'prueba';

-- ---------- 4. Intentos de unirse con código ----------
create table public.intentos_codigo (
  id         bigint generated always as identity primary key,
  user_id    uuid not null,
  creado_en  timestamptz not null default now()
);
create index intentos_codigo_user_idx on public.intentos_codigo(user_id, creado_en);
alter table public.intentos_codigo enable row level security;  -- sin políticas: solo las funciones
revoke all on public.intentos_codigo from anon, authenticated;

alter table public.espacio_codigos
  alter column codigo set default upper(left(replace(gen_random_uuid()::text,'-',''),12));

-- ---------- 2 y 4. Unirse con código ----------
-- Un código inválido devuelve null (en vez de error) para que el intento
-- quede registrado; la app lo muestra como "código inválido".
create or replace function public.unirse_con_codigo(p_codigo text, p_mi_nombre text)
returns uuid language plpgsql security definer set search_path = public as $$
declare e uuid; maxm int; n int; yo miembros%rowtype; existe boolean;
begin
  if auth.uid() is null then raise exception 'sin_sesion'; end if;
  if (select count(*) from intentos_codigo
      where user_id = auth.uid() and creado_en > now() - interval '1 hour') >= 10 then
    raise exception 'muchos_intentos';
  end if;
  select c.espacio_id into e from espacio_codigos c where c.codigo = upper(trim(p_codigo));
  if e is null then
    insert into intentos_codigo (user_id) values (auth.uid());
    return null;
  end if;

  select * into yo from miembros where espacio_id = e and user_id = auth.uid();
  existe := found;
  if existe and yo.activo then return e; end if;

  -- cupo del plan (bloquea el espacio para que dos ingresos simultáneos no lo pasen)
  select p.max_miembros into maxm from espacios s join planes p on p.id = s.plan_id where s.id = e for update of s;
  select count(*) into n from miembros where espacio_id = e and activo;
  if n >= maxm then raise exception 'espacio_lleno'; end if;

  if existe then
    -- vuelve alguien que había sido quitado: entra como miembro común
    update miembros set activo = true, rol = 'miembro' where id = yo.id;
  else
    insert into miembros (espacio_id, user_id, rol, nombre) values (e, auth.uid(), 'miembro', trim(p_mi_nombre));
  end if;
  return e;
end $$;

create or replace function public.regenerar_codigo(e uuid) returns text
language plpgsql security definer set search_path = public as $$
declare c text;
begin
  if public.rol_en(e) is distinct from 'dueno' then raise exception 'sin_permiso'; end if;
  update espacio_codigos set codigo = upper(left(replace(gen_random_uuid()::text,'-',''),12))
  where espacio_id = e returning codigo into c;
  return c;
end $$;

-- ---------- 3. Quitar miembro cambia el código ----------
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
  if u is distinct from auth.uid() then
    update espacio_codigos set codigo = upper(left(replace(gen_random_uuid()::text,'-',''),12)) where espacio_id = e;
  end if;
end $$;

-- cambiar_rol solo sobre miembros activos
create or replace function public.cambiar_rol(m uuid, p_rol text) returns void
language plpgsql security definer set search_path = public as $$
declare e uuid; u uuid; act boolean;
begin
  select espacio_id, user_id, activo into e, u, act from miembros where id = m;
  if e is null or public.rol_en(e) is distinct from 'dueno' then raise exception 'sin_permiso'; end if;
  if not act then raise exception 'no_existe'; end if;
  if p_rol not in ('dueno','profesional','miembro') then raise exception 'rol_invalido'; end if;
  if u = auth.uid() and p_rol <> 'dueno'
     and (select count(*) from miembros where espacio_id = e and rol = 'dueno' and activo) <= 1 then
    raise exception 'ultimo_dueno';
  end if;
  update miembros set rol = p_rol where id = m;
end $$;

-- ---------- 5. Columnas que el dueño puede cambiar ----------
revoke update on public.espacios from authenticated;
grant  update (nombre, marca) on public.espacios to authenticated;

-- ---------- 6. Borrar solo en espacios activos ----------
drop policy docs_baja on public.docs;
create policy docs_baja on public.docs for delete to authenticated
  using (public.es_miembro(espacio_id) and public.espacio_activo(espacio_id)
         and (case when miembro_id is null then public.puede_comun(espacio_id) else public.puede_escribir_miembro(espacio_id, miembro_id) end));

-- ---------- 7. Permisos ----------
revoke truncate on all tables in schema public from anon, authenticated;
alter default privileges in schema public revoke execute on functions from anon, public;

revoke execute on function public.unirse_con_codigo(text,text), public.regenerar_codigo(uuid),
  public.quitar_miembro(uuid), public.cambiar_rol(uuid,text) from anon, public;
grant execute on function public.unirse_con_codigo(text,text), public.regenerar_codigo(uuid),
  public.quitar_miembro(uuid), public.cambiar_rol(uuid,text) to authenticated;
