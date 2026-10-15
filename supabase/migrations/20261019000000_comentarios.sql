-- =====================================================================
-- Plato y Pulso · comentarios de quienes prueban la app
-- Los escribe solo la función "comentarios" (con la clave de servidor),
-- que además los reenvía a una planilla de Google. Nadie los lee desde
-- la app; el administrador los ve en el panel.
-- =====================================================================

create table public.comentarios (
  id          bigint generated always as identity primary key,
  user_id     uuid references auth.users(id) on delete set null,
  espacio_id  uuid references public.espacios(id) on delete set null,
  tipo        text not null check (tipo in ('idea','problema','otro')),
  texto       text not null check (char_length(texto) between 1 and 2000),
  pantalla    text,
  dispositivo text,
  version     text,
  creado_en   timestamptz not null default now()
);
create index comentarios_fecha_idx on public.comentarios(creado_en desc);
create index comentarios_user_idx on public.comentarios(user_id, creado_en);
alter table public.comentarios enable row level security;   -- sin políticas: solo la función y el panel
revoke all on public.comentarios from anon, authenticated;

-- El panel de uso suma los últimos comentarios
create or replace function public.panel_comentarios() returns jsonb
language plpgsql stable security definer set search_path = public as $$
begin
  if not exists (select 1 from administradores where user_id = auth.uid()) then raise exception 'sin_permiso'; end if;
  return (select coalesce(jsonb_agg(x order by x->>'fecha' desc), '[]') from (
    select jsonb_build_object('fecha', c.creado_en, 'tipo', c.tipo, 'texto', c.texto, 'pantalla', c.pantalla,
                              'email', u.email, 'espacio', s.nombre) as x
    from comentarios c left join auth.users u on u.id = c.user_id left join espacios s on s.id = c.espacio_id
    order by c.creado_en desc limit 50) t);
end $$;
revoke execute on function public.panel_comentarios() from anon, public;
grant execute on function public.panel_comentarios() to authenticated;
