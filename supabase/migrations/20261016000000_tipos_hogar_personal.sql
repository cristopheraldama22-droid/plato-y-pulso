-- =====================================================================
-- Plato y Pulso · tipos de espacio: Hogar y Personal
--
-- La app hoy sirve para uso personal y de hogar; los tipos para
-- profesionales (gimnasio, entrenador, nutricionista) no tenían funciones
-- propias y se dejan de ofrecer. Se mantienen en el check para no romper
-- datos viejos, pero ya no se pueden crear.
--   - Hogar: varias personas, todas ven y anotan los datos de todas.
--   - Personal: una sola persona; nadie más se puede sumar.
-- =====================================================================

alter table public.espacios drop constraint if exists espacios_tipo_check;
alter table public.espacios add constraint espacios_tipo_check
  check (tipo in ('hogar','personal','gimnasio','entrenador','nutricionista'));

create or replace function public.crear_espacio(p_nombre text, p_tipo text, p_mi_nombre text)
returns uuid language plpgsql security definer set search_path = public as $$
declare e uuid;
begin
  if auth.uid() is null then raise exception 'sin_sesion'; end if;
  if p_tipo not in ('hogar','personal') then raise exception 'tipo_invalido'; end if;
  if (select count(*) from miembros where user_id = auth.uid() and rol = 'dueno') >= 5 then
    raise exception 'limite_espacios';
  end if;
  insert into espacios (nombre, tipo, datos_compartidos, creado_por)
  values (trim(p_nombre), p_tipo, true, auth.uid())
  returning id into e;
  insert into miembros (espacio_id, user_id, rol, nombre) values (e, auth.uid(), 'dueno', trim(p_mi_nombre));
  insert into espacio_codigos (espacio_id) values (e);
  return e;
end $$;

-- Igual que la versión anterior, más: a un espacio personal no se suma nadie.
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
  if (select tipo from espacios where id = e) = 'personal' then raise exception 'espacio_personal'; end if;

  select p.max_miembros into maxm from espacios s join planes p on p.id = s.plan_id where s.id = e for update of s;
  select count(*) into n from miembros where espacio_id = e and activo;
  if n >= maxm then raise exception 'espacio_lleno'; end if;

  if existe then
    update miembros set activo = true, rol = 'miembro' where id = yo.id;
  else
    insert into miembros (espacio_id, user_id, rol, nombre) values (e, auth.uid(), 'miembro', trim(p_mi_nombre));
  end if;
  return e;
end $$;

-- El rol "profesional" ya no se asigna (sin tipos profesionales no tiene sentido)
create or replace function public.cambiar_rol(m uuid, p_rol text) returns void
language plpgsql security definer set search_path = public as $$
declare e uuid; u uuid; act boolean;
begin
  select espacio_id, user_id, activo into e, u, act from miembros where id = m;
  if e is null or public.rol_en(e) is distinct from 'dueno' then raise exception 'sin_permiso'; end if;
  if not act then raise exception 'no_existe'; end if;
  if p_rol not in ('dueno','miembro') then raise exception 'rol_invalido'; end if;
  if u = auth.uid() and p_rol <> 'dueno'
     and (select count(*) from miembros where espacio_id = e and rol = 'dueno' and activo) <= 1 then
    raise exception 'ultimo_dueno';
  end if;
  update miembros set rol = p_rol where id = m;
end $$;
