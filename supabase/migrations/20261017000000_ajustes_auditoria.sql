-- =====================================================================
-- Plato y Pulso · ajustes de la auditoría
--   1. Cada persona puede ser dueña de hasta 2 espacios (un hogar y uno
--      personal alcanzan); antes eran 5.
--   2. docs_tocar con search_path fijo (aviso del revisor de Supabase).
--   3. Políticas de miembros que evalúan auth.uid() una sola vez por
--      consulta y no por fila (más rápido, mismo resultado).
-- =====================================================================

-- ---------- 1. Hasta 2 espacios propios ----------
create or replace function public.crear_espacio(p_nombre text, p_tipo text, p_mi_nombre text)
returns uuid language plpgsql security definer set search_path = public as $$
declare e uuid;
begin
  if auth.uid() is null then raise exception 'sin_sesion'; end if;
  if p_tipo not in ('hogar','personal') then raise exception 'tipo_invalido'; end if;
  if (select count(*) from miembros where user_id = auth.uid() and rol = 'dueno' and activo) >= 2 then
    raise exception 'limite_espacios';
  end if;
  insert into espacios (nombre, tipo, datos_compartidos, creado_por)
  values (trim(p_nombre), p_tipo, true, auth.uid())
  returning id into e;
  insert into miembros (espacio_id, user_id, rol, nombre) values (e, auth.uid(), 'dueno', trim(p_mi_nombre));
  insert into espacio_codigos (espacio_id) values (e);
  return e;
end $$;

-- ---------- 2. search_path fijo ----------
alter function public.docs_tocar() set search_path = '';

-- ---------- 3. Políticas de miembros ----------
drop policy miembros_lectura on public.miembros;
create policy miembros_lectura on public.miembros for select to authenticated
  using (user_id = (select auth.uid()) or public.puede_ver_miembro(espacio_id, id));

drop policy miembros_edicion on public.miembros;
create policy miembros_edicion on public.miembros for update to authenticated
  using (user_id = (select auth.uid()) or public.rol_en(espacio_id) = 'dueno')
  with check (user_id = (select auth.uid()) or public.rol_en(espacio_id) = 'dueno');
