-- ============================================================
--  direcciones
--
--  Direcciones de envío guardadas por cada cuenta (Mi cuenta ->
--  Mis direcciones). El checkout las ofrece para no volver a escribirlas.
--
--  Guarda el código DANE del municipio: es lo que necesita Envia para
--  cotizar el envío.
--
--  Ejecutar en: Supabase -> SQL Editor -> New query -> Run
-- ============================================================

create table if not exists direcciones (
  id              uuid primary key default gen_random_uuid(),
  usuario_id      uuid not null references auth.users(id) on delete cascade,

  destinatario    text not null,          -- quién recibe
  direccion       text not null,          -- calle, número, apartamento
  indicaciones    text,                   -- "torre B, timbre 3" (opcional)
  codigo_dane     text not null,          -- municipio (8 dígitos)
  ciudad          text not null,
  departamento    text not null,

  principal       boolean not null default false,

  creado_en       timestamptz not null default now(),
  actualizado_en  timestamptz not null default now()
);

create index if not exists direcciones_usuario_idx on direcciones (usuario_id);

-- Una sola dirección principal por cuenta.
create unique index if not exists direcciones_una_principal
  on direcciones (usuario_id) where principal;

-- ------------------------------------------------------------
--  Permisos (RLS)
--  Datos personales: la tabla queda CERRADA (RLS sin políticas), igual
--  que pedidos. Solo el backend, con la clave service_role, la usa, y
--  siempre filtrando por el usuario que inició sesión.
-- ------------------------------------------------------------
alter table direcciones enable row level security;
