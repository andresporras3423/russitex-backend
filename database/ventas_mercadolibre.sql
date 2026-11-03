-- ============================================================
--  Ventas de Mercado Libre -> facturas en Alegra
--
--  ml_publicaciones: qué producto de Alegra vende cada publicación de
--  Mercado Libre y de a cuántas unidades (paquete mínimo de $2.900).
--  La llena el programa que publica; a mano solo para publicaciones
--  hechas fuera de él.
--
--  ventas_mercadolibre: una fila por compra (pack) de Mercado Libre, con
--  la factura de Alegra que se le hizo y el PDF subido a la venta. Con
--  ella las notificaciones repetidas no crean facturas dobles.
--
--  Ejecutar en: Supabase -> SQL Editor -> New query -> Run
-- ============================================================

create table if not exists ml_publicaciones (
  item_id           text primary key,          -- MCO2341201931
  alegra_id         text not null,             -- id del producto en Alegra
  unidades_paquete  integer not null default 1 check (unidades_paquete >= 1),
  creado_en         timestamptz not null default now()
);

create table if not exists ventas_mercadolibre (
  pack_id         text primary key,            -- pack de Mercado Libre (o la orden si no tiene pack)
  ordenes         text[] not null default '{}',
  estado          text not null,               -- pagada | pendiente | cancelada | error
  total           numeric,
  factura         jsonb,                       -- { id, numero, estado, estadoDian, creadaEn } (igual que pedidos.factura)
  factura_subida  jsonb,                       -- { ids, subidaEn }: PDF cargado en la venta de Mercado Libre
  error           text,
  creado_en       timestamptz not null default now(),
  actualizado_en  timestamptz not null default now()
);

-- Solo el backend (service_role) toca estas tablas: guardan datos del comprador.
alter table ml_publicaciones enable row level security;
alter table ventas_mercadolibre enable row level security;

-- Publicación de prueba creada el 2026-11-02 (tiza de sastre blanca, de a 1).
insert into ml_publicaciones (item_id, alegra_id, unidades_paquete)
values ('MCO2341201931', '22', 1)
on conflict (item_id) do nothing;
