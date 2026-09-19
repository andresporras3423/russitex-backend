-- ============================================================
--  pedidos
--
--  Reemplaza el Map en memoria de services/pedidos.js por una tabla
--  real. Antes, si el backend se reiniciaba entre que el cliente iba a
--  pagar y el webhook de Wompi confirmaba, el pedido se perdía y la
--  venta quedaba sin registro ("Pedido no encontrado").
--
--  La referencia (generada por services/wompi.generarReferencia) es la
--  clave: es lo que viaja a Wompi y vuelve en el webhook.
--
--  Ejecutar en: Supabase -> SQL Editor -> New query -> Run
-- ============================================================

create table if not exists pedidos (
  -- Referencia única del pedido (la que se manda a Wompi).
  referencia      text primary key,

  estado          text not null default 'PENDIENTE'
                    check (estado in ('PENDIENTE','APROBADO','RECHAZADO','ANULADO','ERROR')),

  -- Datos del comprador: { nombre, email, telefono, ... }
  cliente         jsonb,

  -- Envío: { ciudad, direccion, departamento, codigoDane, costo, transportadora }
  envio           jsonb,

  -- Líneas compradas: [{ productoId, nombre, cantidad, precio, variante }]
  carrito         jsonb,

  -- Total en pesos (producto + envío) que se cobró.
  total_pesos     numeric,

  -- Datos que llegan con el webhook cuando el pago se aprueba.
  transaccion_id  text,          -- id de la transacción en Wompi
  metodo_pago     text,          -- CARD | NEQUI | PSE | ...
  fecha_pago      timestamptz,

  creado_en       timestamptz not null default now(),
  actualizado_en  timestamptz not null default now()
);

create index if not exists pedidos_estado_idx on pedidos (estado);
create index if not exists pedidos_creado_idx on pedidos (creado_en desc);

-- ------------------------------------------------------------
--  Permisos (RLS)
--  Un pedido guarda datos personales del cliente (nombre, correo,
--  teléfono, dirección). Igual que avisos_disponibilidad, la tabla queda
--  CERRADA: RLS activo y SIN políticas, así la clave publicable no puede
--  tocarla. Solo el backend, con la clave service_role, lee y escribe.
-- ------------------------------------------------------------
alter table pedidos enable row level security;
