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
