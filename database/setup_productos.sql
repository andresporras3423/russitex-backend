-- ============================================================
--  productos_meta
--
--  Guarda SOLO lo que Alegra no puede guardar: la categoría del
--  catálogo web y la imagen del producto.
--
--  Fuente de verdad por campo:
--    nombre, precio  -> Alegra  (no se copian acá)
--    categoría, imagen -> esta tabla
--
--  Se une con Alegra por `alegra_id`.
--  Ejecutar en: Supabase -> SQL Editor -> New query -> Run
-- ============================================================

create table if not exists productos_meta (
  alegra_id    text primary key,

  -- Copia del nombre SOLO para que puedas reconocer la fila al editarla
  -- en el panel de Supabase. El nombre que se muestra en la web siempre
  -- viene de Alegra, nunca de acá.
  nombre_cache text,

  -- Categoría del catálogo web.
  -- Valores válidos = los que filtra la página.
  categoria    text check (categoria in
                 ('forros','entretelas','hombreras','guatas','tizas','cierres','otros')),

  -- Texto que se muestra bajo el nombre ("Por metro", "Por par", ...).
  -- Se usa si Alegra no trae una unidad utilizable.
  unidad       text,

  -- URL pública de la imagen (bucket 'productos' de Supabase Storage).
  imagen_url   text,

  -- Orden de aparición dentro de su categoría (menor primero).
  orden        int default 0,

  actualizado  timestamptz default now()
);

-- Acelera el filtrado por categoría
create index if not exists productos_meta_categoria_idx on productos_meta (categoria);

-- ------------------------------------------------------------
--  Permisos (RLS)
--  El catálogo es público, pero el backend es el único que escribe.
-- ------------------------------------------------------------
alter table productos_meta enable row level security;

-- Lectura pública (el catálogo lo ve cualquiera, sin iniciar sesión)
drop policy if exists "productos_meta lectura publica" on productos_meta;
create policy "productos_meta lectura publica"
  on productos_meta for select
  using (true);

-- Nota: no se crea ninguna política de INSERT/UPDATE a propósito.
-- Con RLS activo y sin política de escritura, la clave publicable NO puede
-- escribir. Para que el script de sincronización pueda hacerlo necesitás
-- usar la clave `service_role` (ver SUPABASE_SERVICE_KEY en el .env), o
-- cargar las filas a mano desde el panel de Supabase.


-- ============================================================
--  IMÁGENES — crear el bucket de Storage
--
--  En Supabase -> Storage -> New bucket
--    Nombre : productos
--    Public : SÍ  (para que las fotos se vean sin autenticación)
--
--  Luego subís cada foto y pegás su URL pública en imagen_url.
--  Conviene nombrar los archivos con el id de Alegra: 18.jpg, 24.jpg...
-- ============================================================


-- ============================================================
--  PASO 2 — Cargar los 39 productos que hay hoy en Alegra
--
--  Los IDs son los reales de Alegra. Las categorias estan
--  sugeridas a partir del nombre: revisalas y corregi lo que
--  haga falta (ver notas al final).
--
--  Si volves a ejecutar esto, NO pisa lo que hayas editado:
--  solo refresca el nombre de referencia.
-- ============================================================
insert into productos_meta (alegra_id, nombre_cache, categoria, unidad)
values
  ('18', 'Banrol', 'otros', 'Por unidad'),
  ('4', 'Bayetilla', 'otros', 'Por metro'),
  ('39', 'Bayetilla en poliester', 'otros', 'Por metro'),
  ('41', 'Bolsillo espiga', 'otros', 'Por metro'),
  ('36', 'Borraflojo', 'otros', 'Por unidad'),
  ('19', 'caja tiza', 'tizas', 'Por caja'),
  ('22', 'caja tiza blanca, 50 unidades', 'tizas', 'Por caja'),
  ('21', 'caja tiza color 50 unidades', 'tizas', 'Por caja'),
  ('38', 'Caja tiza color pequeña', 'tizas', 'Por caja'),
  ('27', 'cremallera cobre 20 cmts', 'cierres', 'Por unidad'),
  ('43', 'Dacrón', 'otros', 'Por metro'),
  ('12', 'Entretela', 'entretelas', 'Por metro'),
  ('1', 'entretela doble punto', 'entretelas', 'Por metro'),
  ('15', 'entretela doble punto 90gr', 'entretelas', 'Por metro'),
  ('35', 'Entretela galleta', 'entretelas', 'Por metro'),
  ('33', 'Entretela granulada', 'entretelas', 'Por metro'),
  ('7', 'entretela para cuello de camisa', 'entretelas', 'Por metro'),
  ('6', 'entretela poliestar', 'entretelas', 'Por metro'),
  ('14', 'Forro arabesco', 'forros', 'Por metro'),
  ('9', 'Forro brioni', 'forros', 'Por metro'),
  ('42', 'Forro brioni 70 gr', 'forros', 'Por metro'),
  ('13', 'Forro estampado', 'forros', 'Por metro'),
  ('32', 'Forro estampado grueso', 'forros', 'Por metro'),
  ('40', 'Forro Poliviscosa', 'forros', 'Por metro'),
  ('23', 'Guata', 'guatas', 'Por metro'),
  ('37', 'Guata fusionable', 'guatas', 'Por metro'),
  ('5', 'Hombrera', 'hombreras', 'Por par'),
  ('17', 'Hombrera algodón 2 capas', 'hombreras', 'Por par'),
  ('2', 'Hombrera en algodón', 'hombreras', 'Por par'),
  ('16', 'Hombrera espuma blanca', 'hombreras', 'Por par'),
  ('3', 'Hombrera negra', 'hombreras', 'Por par'),
  ('8', 'Interlón', 'otros', 'Por metro'),
  ('24', 'Interlón telfor', 'otros', 'Por metro'),
  ('20', 'Liencillo', 'otros', 'Por metro'),
  ('26', 'Lona calima', 'otros', 'Por metro'),
  ('10', 'portavestido', 'otros', 'Por metro'),
  ('25', 'Pretina', 'otros', 'Por metro'),
  ('11', 'Sido', 'otros', 'Por metro'),
  ('34', 'Valencina', 'otros', 'Por metro')
on conflict (alegra_id) do update
  set nombre_cache = excluded.nombre_cache;


-- ============================================================
--  Comprobacion rapida (opcional): deberia devolver 39
-- ============================================================
-- select count(*) from productos_meta;
