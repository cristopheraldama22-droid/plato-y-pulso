-- =====================================================================
-- Plato y Pulso · endurecimiento (auditoría de seguridad)
--   1. El rol anónimo (antes de iniciar sesión) no tiene ningún permiso
--      sobre las tablas. Hoy ya no veía nada por las reglas por fila; esto
--      es una segunda barrera por si alguna regla falla en el futuro.
--   2. espacio_activo y puede_comun solo responden sobre espacios propios
--      (antes, sabiendo el id, revelaban si un espacio ajeno existía).
--   3. Borrar la cuenta también borra los comentarios de la persona.
-- =====================================================================

-- ---------- 1. Nada para anon ----------
revoke all on all tables in schema public from anon;
revoke all on all sequences in schema public from anon;
alter default privileges in schema public revoke all on tables from anon;
alter default privileges in schema public revoke all on sequences from anon;

-- ---------- 2. Funciones auxiliares solo sobre espacios propios ----------
create or replace function public.espacio_activo(e uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select public.es_miembro(e) and exists (select 1 from espacios s where s.id = e and s.estado = 'activo')
$$;

create or replace function public.puede_comun(e uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select public.es_miembro(e) and exists (select 1 from espacios s where s.id = e
                 and (s.datos_compartidos or public.rol_en(e) in ('dueno','profesional')))
$$;

-- ---------- 3. Borrar cuenta: también sus comentarios ----------
create or replace function public.borrar_mi_cuenta() returns void
language plpgsql security definer set search_path = public as $$
declare u uuid := auth.uid(); e uuid;
begin
  if u is null then raise exception 'sin_sesion'; end if;
  for e in
    select m.espacio_id from miembros m
    where m.user_id = u and m.rol = 'dueno' and m.activo
      and not exists (select 1 from miembros o where o.espacio_id = m.espacio_id
                      and o.rol = 'dueno' and o.activo and o.user_id is distinct from u)
  loop
    if exists (select 1 from miembros o where o.espacio_id = e and o.activo and o.user_id is distinct from u) then
      raise exception 'transferir_primero';
    end if;
    delete from espacios where id = e;
  end loop;
  delete from miembros where user_id = u;
  update uso_ia set user_id = null where user_id = u;
  update docs set actualizado_por = null where actualizado_por = u;
  delete from intentos_codigo where user_id = u;
  delete from comentarios where user_id = u;
  delete from auth.users where id = u;   -- consentimientos y actividad caen en cascada
end $$;
