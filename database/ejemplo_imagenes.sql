-- ============================================================
--  EJEMPLO: cargar varias imágenes a un producto
--
--  Para PROBAR cómo se ve la galería. Apunta a fotos que YA existen
--  en el bucket, así no hay que subir nada todavía. Cuando tengas las
--  fotos de verdad, cambiás las URLs por las reales.
--
--  Recordá la regla:
--    variante_id = NULL  -> la imagen es del producto (vale para todas)
--    variante_id = <id>  -> la imagen es de esa variante
--
--  La imagen GRANDE es la de menor `orden`; las demás bajan como
--  miniaturas.
--
--  Para deshacerlo todo, al final del archivo hay un delete.
--
--  Ejecutar en: Supabase -> SQL Editor -> New query -> Run
-- ============================================================


-- ------------------------------------------------------------
--  CASO A — producto SIN variantes
--  "caja tiza blanca, 50 unidades" (alegra_id 22)
--
--  Tres fotos del producto. Todas con variante_id NULL.
-- ------------------------------------------------------------
delete from producto_imagenes where alegra_id = '22';

-- OJO: 22/27/12/9 son cuatro archivos DISTINTOS del bucket. Muchas de las
-- 39 fotos actuales son el mismo archivo repetido, así que si eligieras
-- otras al azar verías la misma imagen cuatro veces.
insert into producto_imagenes (alegra_id, variante_id, url, alt, orden) values
  ('22', null, 'https://yggxhnpcjxemwjnwxibc.supabase.co/storage/v1/object/public/productos_russitex/22.jpg',
   'Caja de tiza blanca cerrada', 0),
  ('22', null, 'https://yggxhnpcjxemwjnwxibc.supabase.co/storage/v1/object/public/productos_russitex/27.jpg',
   'Tizas sueltas fuera de la caja', 1),
  ('22', null, 'https://yggxhnpcjxemwjnwxibc.supabase.co/storage/v1/object/public/productos_russitex/12.jpg',
   'Detalle de una tiza', 2),
  ('22', null, 'https://yggxhnpcjxemwjnwxibc.supabase.co/storage/v1/object/public/productos_russitex/9.jpg',
   'La caja abierta mostrando el contenido', 3);


-- ------------------------------------------------------------
--  CASO B — producto CON variantes
--  "entretela doble punto" (alegra_id 1), colores Negro/Blanco/Beige
--
--  Una foto genérica del producto + una foto por color.
--  Al elegir un color en la ficha, la galería cambia a la suya.
--
--  Los ids de las variantes no se escriben a mano: se buscan por
--  nombre, así el script sirve aunque los ids sean otros.
-- ------------------------------------------------------------
delete from producto_imagenes where alegra_id = '1';

-- Foto del producto (se ve mientras no hayas elegido color)
insert into producto_imagenes (alegra_id, variante_id, url, alt, orden) values
  ('1', null, 'https://yggxhnpcjxemwjnwxibc.supabase.co/storage/v1/object/public/productos_russitex/1.jpg',
   'Rollo de entretela doble punto', 0);

-- Una foto por color
insert into producto_imagenes (alegra_id, variante_id, url, alt, orden)
select '1', v.id,
       'https://yggxhnpcjxemwjnwxibc.supabase.co/storage/v1/object/public/productos_russitex/'
         || case v.nombre when 'Negro' then '27' when 'Blanco' then '17' else '11' end || '.jpg',
       'Entretela doble punto en ' || v.nombre,
       0
from producto_variantes v
where v.alegra_id = '1';

-- Y una segunda foto para el Negro, para ver la miniatura aparecer
insert into producto_imagenes (alegra_id, variante_id, url, alt, orden)
select '1', v.id,
       'https://yggxhnpcjxemwjnwxibc.supabase.co/storage/v1/object/public/productos_russitex/13.jpg',
       'Detalle del tejido en negro',
       1
from producto_variantes v
where v.alegra_id = '1' and v.nombre = 'Negro';


-- ------------------------------------------------------------
--  Revisar cómo quedó
-- ------------------------------------------------------------
--  select i.alegra_id, coalesce(v.nombre, '(todo el producto)') as variante,
--         i.orden, i.alt
--    from producto_imagenes i
--    left join producto_variantes v on v.id = i.variante_id
--   order by i.alegra_id, v.nombre nulls first, i.orden;


-- ------------------------------------------------------------
--  DESHACER (borra solo las imágenes de estos dos productos)
-- ------------------------------------------------------------
--  delete from producto_imagenes where alegra_id in ('1','22');
