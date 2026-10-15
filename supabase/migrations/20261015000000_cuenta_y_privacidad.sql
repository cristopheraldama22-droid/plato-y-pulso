-- =====================================================================
-- Plato y Pulso · cuenta, consentimiento y permisos (Ley 18.331)
--
--   1. Consentimiento expreso para tratar datos de salud, con la versión
--      de la política aceptada y la fecha.
--   2. "Eliminar mi cuenta y mis datos": borra a la persona, sus datos y
--      los espacios donde estaba sola. Si es la única dueña de un espacio
--      con otras personas, primero tiene que pasar el rol de dueño.
--   3. rls_auto_enable (la crea Supabase al marcar "RLS automático") no
--      tiene que poder llamarse desde la app.
-- =====================================================================

-- ---------- 1. Consentimiento ----------
create table public.consentimientos (
  user_id      uuid not null references auth.users(id) on delete cascade,
  version      text not null check (char_length(version) between 1 and 20),
  aceptado_en  timestamptz not null default now(),
  primary key (user_id, version)
);
alter table public.consentimientos enable row level security;
create policy consentimientos_lectura on public.consentimientos for select to authenticated
  using (user_id = (select auth.uid()));
revoke insert, update, delete, truncate on public.consentimientos from anon, authenticated;

create or replace function public.aceptar_privacidad(p_version text) returns void
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'sin_sesion'; end if;
  insert into consentimientos (user_id, version) values (auth.uid(), p_version)
  on conflict (user_id, version) do nothing;
end $$;

-- ---------- 2. Eliminar mi cuenta ----------
create or replace function public.borrar_mi_cuenta() returns void
language plpgsql security definer set search_path = public as $$
declare u uuid := auth.uid(); e uuid;
begin
  if u is null then raise exception 'sin_sesion'; end if;

  -- Espacios donde soy el único dueño activo
  for e in
    select m.espacio_id from miembros m
    where m.user_id = u and m.rol = 'dueno' and m.activo
      and not exists (select 1 from miembros o where o.espacio_id = m.espacio_id
                      and o.rol = 'dueno' and o.activo and o.user_id is distinct from u)
  loop
    if exists (select 1 from miembros o where o.espacio_id = e and o.activo and o.user_id is distinct from u) then
      raise exception 'transferir_primero';
    end if;
    delete from espacios where id = e;   -- estaba solo: se borra con todos sus documentos
  end loop;

  delete from miembros where user_id = u;                        -- sus documentos personales caen en cascada
  update uso_ia set user_id = null where user_id = u;            -- el gasto queda para facturar, sin la persona
  update docs set actualizado_por = null where actualizado_por = u;
  delete from intentos_codigo where user_id = u;
  delete from auth.users where id = u;                           -- consentimientos caen en cascada
end $$;

revoke execute on function public.aceptar_privacidad(text), public.borrar_mi_cuenta() from anon, public;
grant execute on function public.aceptar_privacidad(text), public.borrar_mi_cuenta() to authenticated;

-- ---------- 3. Función de Supabase que no es para la app ----------
do $$
begin
  if exists (select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
             where n.nspname = 'public' and p.proname = 'rls_auto_enable') then
    execute 'revoke execute on function public.rls_auto_enable() from anon, authenticated, public';
  end if;
end $$;
