-- ============================================================
--  AVISOS DE DISPONIBILIDAD — "avísame cuando esté disponible"
--
--  Cuando un producto (o una variante) está agotado, la ficha ofrece
--  dejar un correo. Acá se guarda ese pedido, y cuando el producto
--  vuelve a estar disponible se manda el aviso.
--
--  DECISIONES (con Oscar, 2026-08-30):
--
--  1) Se guarda el CORREO, no el usuario.
--     Casi nadie que pide el aviso tiene cuenta. Exigir login haría
--     perder la mayoría de los registros. `usuario_id` se llena solo
--     si además estaba logueado, y sirve para que más adelante pueda
--     ver sus avisos desde "Mi cuenta".
--
--  2) Se guarda la VARIANTE.
--     Quien espera el Beige no puede recibir un correo porque volvió
--     el Negro. `variante_id` NULL = pidió el producto en general.
--
--  3) NO se borra al enviar; se marca `avisado_en`.
--     - la fila dice cuánta gente esperaba qué (sirve para reponer)
--     - si el correo falla se puede reintentar
--     - si el producto va y viene, no se avisa dos veces
--
--  4) No hay disparador automático todavía.
--     Hoy la disponibilidad se marca a mano en Supabase y ahí no corre
--     código nuestro. La rutina de envío es AUTÓNOMA: consulta qué
--     avisos pendientes corresponden a algo que YA está disponible.
--     Por eso da igual quién la dispare (la pantalla de administración,
--     un webhook de Supabase cuando el backend esté desplegado, o a
--     mano con scripts/enviar-avisos.js). No hay instante que capturar.
--
--  Ejecutar en: Supabase -> SQL Editor -> New query -> Run
-- ============================================================

create table if not exists avisos_disponibilidad (
  id          bigint generated always as identity primary key,

  correo      text not null,

  alegra_id   text not null references productos_meta(alegra_id) on delete cascade,

  -- NULL = el producto entero. Un id = ese color/estampado en concreto.
  variante_id bigint references producto_variantes(id) on delete cascade,

  -- Solo si estaba logueado al pedirlo. No es obligatorio.
  usuario_id  uuid,

  creado_en   timestamptz not null default now(),

  -- NULL = todavía no se le ha avisado. Con fecha = ya se le escribió.
  avisado_en  timestamptz
);

create index if not exists avisos_disponibilidad_pendientes_idx
  on avisos_disponibilidad (alegra_id)
  where avisado_en is null;


-- ------------------------------------------------------------
--  Sin duplicados ENTRE LOS PENDIENTES
--
--  Si alguien hace clic dos veces, o desde el celular y el computador,
--  no debe recibir dos correos. Pero sí puede volver a pedir el aviso
--  más adelante, cuando el producto se agote de nuevo: por eso el
--  índice solo mira las filas con avisado_en NULL.
--
--  Van DOS índices porque en SQL `variante_id = NULL` nunca es cierto,
--  así que un índice único no detectaría dos pedidos del producto
--  entero. El segundo cubre ese caso.
-- ------------------------------------------------------------
create unique index if not exists avisos_disponibilidad_unico_variante
  on avisos_disponibilidad (lower(correo), alegra_id, variante_id)
  where avisado_en is null and variante_id is not null;

create unique index if not exists avisos_disponibilidad_unico_producto
  on avisos_disponibilidad (lower(correo), alegra_id)
  where avisado_en is null and variante_id is null;


-- ------------------------------------------------------------
--  Permisos (RLS) — cerrada por completo
--
--  A diferencia de productos_meta, esta tabla NO lleva política de
--  lectura pública: guarda correos de clientes. Sin políticas, la
--  clave publicable no puede ni leer ni escribir, y solo el backend
--  (que usa SUPABASE_SERVICE_KEY) la toca.
-- ------------------------------------------------------------
alter table avisos_disponibilidad enable row level security;


-- ------------------------------------------------------------
--  Revisar cómo va
--
--  Cuánta gente espera cada cosa (esto es la señal de qué reponer):
--
--    select m.nombre_cache,
--           coalesce(v.nombre, '(el producto)') as variante,
--           count(*) filter (where a.avisado_en is null) as esperando,
--           count(*) filter (where a.avisado_en is not null) as avisados
--      from avisos_disponibilidad a
--      join productos_meta m on m.alegra_id = a.alegra_id
--      left join producto_variantes v on v.id = a.variante_id
--     group by m.nombre_cache, v.nombre
--     order by esperando desc;
-- ------------------------------------------------------------


-- ------------------------------------------------------------
--  DESHACER
-- ------------------------------------------------------------
--  drop table if exists avisos_disponibilidad;
