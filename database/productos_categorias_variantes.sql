-- ============================================================
--  productos_meta — CATEGORÍAS, UNIDADES Y VARIANTES según el PDF
--  "Fichas de producto Russitex" (Jenny Paola, 2026-11-21), que es la fuente
--  de verdad.
--
--  1. Cambia las categorías de 7 a 8: salen 'guatas' y 'cierres'; entran
--     'refuerzos' (Refuerzos para saco y pantalón), 'telas' (Telas para
--     bolsillo y lonas) y 'botones' (Botones y cremalleras).
--  2. Crea la fila de los 6 productos que no la tenían (botones,
--     cremallera plástica, tizas de 9 y portavestido con ventana) y les
--     carga su ficha.
--  3. Unidad de venta por categoría (Banrol y Borraflojo pasan a "Por
--     metro"; el Portavestido a "Por unidad").
--  4. Variantes de color: una fila por color de cada producto que tiene
--     más de uno. Los colores (hex) son aproximados: se corrigen en el
--     panel de administrador.
--
--  Todo va en una transacción: o se aplica completo o nada.
--  Ejecutar en: Supabase -> SQL Editor -> New query -> Run
--  Luego: https://russitex-backend.onrender.com/api/productos?refrescar=1
-- ============================================================

begin;

-- ── 1. Categorías ────────────────────────────────────────────
alter table productos_meta drop constraint if exists productos_meta_categoria_check;

-- Productos que ya no están activos en Alegra (no salen en la web).
update productos_meta set categoria = 'refuerzos' where categoria = 'guatas';
update productos_meta set categoria = 'botones'   where categoria = 'cierres';

-- ── 2. Filas que faltaban ────────────────────────────────────
insert into productos_meta (alegra_id, nombre_cache, categoria, unidad, peso_unit, volumen_unit)
values ('45', 'Cremallera plástica', 'otros', 'Por unidad', 0.02, 60)
on conflict (alegra_id) do nothing;
insert into productos_meta (alegra_id, nombre_cache, categoria, unidad, peso_unit, volumen_unit)
values ('47', 'Caja tiza color 9 unidades', 'otros', 'Por unidad', 1.4, 7500)
on conflict (alegra_id) do nothing;
insert into productos_meta (alegra_id, nombre_cache, categoria, unidad, peso_unit, volumen_unit)
values ('48', 'Caja tiza blanca 9 unidades', 'otros', 'Por unidad', 1.4, 7500)
on conflict (alegra_id) do nothing;
insert into productos_meta (alegra_id, nombre_cache, categoria, unidad, peso_unit, volumen_unit)
values ('49', 'Portavestidos con ventana', 'otros', 'Por unidad', 0.15, 1500)
on conflict (alegra_id) do nothing;
insert into productos_meta (alegra_id, nombre_cache, categoria, unidad, peso_unit, volumen_unit)
values ('50', 'Botón grande', 'otros', 'Por unidad', 0.005, 10)
on conflict (alegra_id) do nothing;
insert into productos_meta (alegra_id, nombre_cache, categoria, unidad, peso_unit, volumen_unit)
values ('51', 'Botón pequeño', 'otros', 'Por unidad', 0.003, 6)
on conflict (alegra_id) do nothing;

-- ── 3. Categoría, unidad y ficha de los 41 productos ─────────

-- entretelas
update productos_meta set
  nombre_cache = 'Entretela doble punto', categoria = 'entretelas', unidad = 'Por metro',
  descripcion = 'Entretela fusionable tejida de punto que da cuerpo a la prenda sin dejarla rígida. Con 70 g es la versión liviana, pensada para prendas femeninas y pequeños refuerzos.',
  descripcion_larga = 'La entretela doble punto está tejida en poliéster texturizado, por eso cede junto con la tela y acompaña el movimiento de la prenda en lugar de endurecerla. Esta referencia de 70 g es la más liviana de las dos que manejamos y se usa en confección femenina y en refuerzos pequeños. Se adhiere con el calor de la plancha. Para prendas masculinas o telas de más peso está la de 90 g.',
  usos = '["Prendas femeninas","Pequeños refuerzos","Cuellos","Puños","Pretinas","Solapas"]'::jsonb,
  detalles = '[{"etiqueta":"Composición","valor":"100% poliéster texturizado"},{"etiqueta":"Gramaje","valor":"70 g"},{"etiqueta":"Ancho","valor":"1,50 m"},{"etiqueta":"Textura","valor":"Flexible, tejido de punto"},{"etiqueta":"Adhesión","valor":"Fusionable con plancha"},{"etiqueta":"Colores disponibles","valor":"Negro, Blanco"}]'::jsonb,
  cuidados = 'Mantener en lugar seco. Hacer una prueba en un retazo antes de fusionar en la prenda definitiva.'
where alegra_id = '1';
update productos_meta set
  nombre_cache = 'Entretela doble punto 90gr', categoria = 'entretelas', unidad = 'Por metro',
  descripcion = 'Entretela fusionable tejida de punto que da cuerpo a la prenda sin dejarla rígida. Con 90 g es la de más peso y la que más se usa en prendas masculinas.',
  descripcion_larga = 'La entretela doble punto está tejida en poliéster texturizado, por eso cede junto con la tela y acompaña el movimiento de la prenda en lugar de endurecerla. Esta referencia de 90 g tiene más cuerpo que la de 70 g y se usa sobre todo en prendas masculinas, aunque también sirve para prendas femeninas y pequeños refuerzos. Se adhiere con el calor de la plancha.',
  usos = '["Prendas masculinas","Prendas femeninas","Pequeños refuerzos"]'::jsonb,
  detalles = '[{"etiqueta":"Composición","valor":"100% poliéster texturizado"},{"etiqueta":"Gramaje","valor":"90 g"},{"etiqueta":"Ancho","valor":"1,50 m"},{"etiqueta":"Textura","valor":"Flexible, tejido de punto"},{"etiqueta":"Adhesión","valor":"Fusionable con plancha"},{"etiqueta":"Colores disponibles","valor":"Negro, Blanco, Natural"}]'::jsonb,
  cuidados = 'Mantener en lugar seco. Hacer una prueba en un retazo antes de fusionar en la prenda definitiva.'
where alegra_id = '15';
update productos_meta set
  nombre_cache = 'Entretela galleta', categoria = 'entretelas', unidad = 'Por metro',
  descripcion = 'Entretela fusionable especial para la pretina de pantalones de dama y caballero. También sirve para entretelar blusas, camisas sport, pecheras y pequeños refuerzos.',
  descripcion_larga = 'La entretela galleta se usa sobre todo en la pretina del pantalón, tanto de dama como de caballero, para que mantenga la forma. Por su peso liviano, de 52,5 g, también funciona en blusas, camisas sport, pecheras y refuerzos pequeños. Es 100% poliéster, viene en color blanco y se adhiere con el calor de la plancha.',
  usos = '["Pretinas de pantalón","Blusas","Camisas sport","Pecheras","Pequeños refuerzos"]'::jsonb,
  detalles = '[{"etiqueta":"Composición","valor":"100% poliéster"},{"etiqueta":"Gramaje","valor":"52,5 g"},{"etiqueta":"Ancho","valor":"1,50 m"},{"etiqueta":"Adhesión","valor":"Fusionable con plancha"},{"etiqueta":"Colores disponibles","valor":"Blanco"}]'::jsonb,
  cuidados = 'Mantener en lugar seco. Hacer una prueba en un retazo antes de fusionar en la prenda definitiva.'
where alegra_id = '35';
update productos_meta set
  nombre_cache = 'Entretela granulada', categoria = 'entretelas', unidad = 'Por metro',
  descripcion = 'Entretela fusionable especial para la pretina del pantalón masculino. Le da firmeza a la cintura para que conserve la forma.',
  descripcion_larga = 'Entretela fusionable especial para la pretina del pantalón masculino. Le da firmeza a la cintura para que conserve la forma.',
  usos = '["Pretinas de pantalón de caballero"]'::jsonb,
  detalles = '[{"etiqueta":"Ancho","valor":"1,50 m"},{"etiqueta":"Adhesión","valor":"Fusionable con plancha"},{"etiqueta":"Colores disponibles","valor":"Blanco"}]'::jsonb,
  cuidados = 'Mantener en lugar seco. Hacer una prueba en un retazo antes de fusionar en la prenda definitiva.'
where alegra_id = '33';
update productos_meta set
  nombre_cache = 'Entretela poliestar', categoria = 'entretelas', unidad = 'Por metro',
  descripcion = 'Entretela fusionable para entretelar telas elásticas. Viene en blanco y negro.',
  descripcion_larga = 'Entretela fusionable para entretelar telas elásticas. Viene en blanco y negro.',
  usos = '["Telas elásticas"]'::jsonb,
  detalles = '[{"etiqueta":"Ancho","valor":"1,50 m"},{"etiqueta":"Adhesión","valor":"Fusionable con plancha"},{"etiqueta":"Colores disponibles","valor":"Blanco, Negro"}]'::jsonb,
  cuidados = 'Mantener en lugar seco. Hacer una prueba en un retazo antes de fusionar en la prenda definitiva.'
where alegra_id = '6';
update productos_meta set
  nombre_cache = 'Entretela cuello camisa dama', categoria = 'entretelas', unidad = 'Por metro',
  descripcion = 'Entretela fusionable para dar cuerpo y forma a los cuellos camiseros de dama. Es de menor gramaje que la de caballero, así que el cuello queda con estructura pero menos rígido.',
  descripcion_larga = 'Esta entretela va por dentro del cuello camisero y es la que hace que mantenga la forma. Es más liviana que la entretela para cuello de caballero, por eso se recomienda para blusas y camisas de dama, donde se busca un cuello definido pero más suave. Viene en color blanco y se adhiere con el calor de la plancha.',
  usos = '["Cuellos camiseros de dama","Blusas","Camisas de dama"]'::jsonb,
  detalles = '[{"etiqueta":"Gramaje","valor":"Liviano, menor que la de caballero"},{"etiqueta":"Ancho","valor":"1,50 m"},{"etiqueta":"Adhesión","valor":"Fusionable con plancha"},{"etiqueta":"Colores disponibles","valor":"Blanco"}]'::jsonb,
  cuidados = 'Mantener en lugar seco. Hacer una prueba en un retazo antes de fusionar en la prenda definitiva.'
where alegra_id = '44';
update productos_meta set
  nombre_cache = 'Entretela para cuello de camisa', categoria = 'entretelas', unidad = 'Por metro',
  descripcion = 'Entretela fusionable de gramaje grueso para el cuello de la camisa de caballero. Le da la firmeza que necesita para mantenerse armado.',
  descripcion_larga = 'Esta entretela va por dentro del cuello de la camisa y es la que hace que mantenga la forma. Su gramaje grueso da el cuello firme y definido de la camisa de caballero. Para cuellos de dama manejamos una entretela más liviana. Viene en color blanco y se adhiere con el calor de la plancha.',
  usos = '["Cuellos de camisa de caballero"]'::jsonb,
  detalles = '[{"etiqueta":"Gramaje","valor":"Grueso"},{"etiqueta":"Ancho","valor":"1,50 m"},{"etiqueta":"Adhesión","valor":"Fusionable con plancha"},{"etiqueta":"Colores disponibles","valor":"Blanco"}]'::jsonb,
  cuidados = 'Mantener en lugar seco. Hacer una prueba en un retazo antes de fusionar en la prenda definitiva.'
where alegra_id = '7';
update productos_meta set
  nombre_cache = 'Interlón', categoria = 'entretelas', unidad = 'Por metro',
  descripcion = 'Entretela muy liviana, no fusionable, para blusas, pecheras y pequeños refuerzos. Da estabilidad a la tela sin sumarle peso.',
  descripcion_larga = 'El interlón es la entretela más liviana que manejamos: pesa 28 g. Por eso se usa en telas delgadas, como las de blusa, y en zonas donde solo hace falta un refuerzo suave, como pecheras y detalles pequeños. No es fusionable, así que se fija con costura. Es 100% poliéster y viene en blanco, negro y gris.',
  usos = '["Blusas","Pecheras","Pequeños refuerzos"]'::jsonb,
  detalles = '[{"etiqueta":"Composición","valor":"100% poliéster"},{"etiqueta":"Gramaje","valor":"28 g"},{"etiqueta":"Ancho","valor":"1,50 m"},{"etiqueta":"Adhesión","valor":"No fusionable, se fija con costura"},{"etiqueta":"Colores disponibles","valor":"Blanco, Negro, Gris"}]'::jsonb,
  cuidados = 'Mantener en lugar seco.'
where alegra_id = '8';
update productos_meta set
  nombre_cache = 'Interlón telfor', categoria = 'entretelas', unidad = 'Por metro',
  descripcion = 'Material de refuerzo no fusionable para los frentes del saco de hombre. Viene en color camel.',
  descripcion_larga = 'Material de refuerzo no fusionable para los frentes del saco de hombre. Viene en color camel.',
  usos = '["Frentes de saco de caballero"]'::jsonb,
  detalles = '[{"etiqueta":"Ancho","valor":"1,50 m"},{"etiqueta":"Colores disponibles","valor":"Camel"},{"etiqueta":"Adhesión","valor":"No fusionable, se fija con costura"}]'::jsonb,
  cuidados = 'Mantener en lugar seco.'
where alegra_id = '24';

-- forros
update productos_meta set
  nombre_cache = 'Forro arabesco', categoria = 'forros', unidad = 'Por metro',
  descripcion = 'Forro con grabado arabesco para prendas masculinas y femeninas. Le da un acabado más vistoso al interior de sacos, chaquetas y chalecos.',
  descripcion_larga = 'El forro arabesco trae el diseño grabado en la misma tela, un detalle que se nota al abrir la prenda y la hace ver más cuidada por dentro. Es 100% poliéster y sirve para forrar prendas masculinas y femeninas. Viene en ocho colores, desde los clásicos negro, azul y gris hasta tonos como rojo, mostaza y azul petróleo.',
  usos = '["Sacos","Chaquetas","Chalecos","Prendas masculinas","Prendas femeninas"]'::jsonb,
  detalles = '[{"etiqueta":"Composición","valor":"100% poliéster"},{"etiqueta":"Ancho","valor":"1,50 m"},{"etiqueta":"Diseño","valor":"Grabado arabesco"},{"etiqueta":"Colores disponibles","valor":"Negro, Rojo, Azul, Camel, Mostaza, Gris, Azul claro, Azul petróleo"}]'::jsonb,
  cuidados = null
where alegra_id = '14';
update productos_meta set
  nombre_cache = 'Forro brioni', categoria = 'forros', unidad = 'Por metro',
  descripcion = 'Forro liso para prendas masculinas y femeninas, disponible en 22 colores. Es el forro de uso general para sacos, chaquetas y chalecos.',
  descripcion_larga = 'El forro brioni es un forro liso 100% poliéster para prendas masculinas y femeninas. Su carta de 22 colores permite combinarlo con casi cualquier tela, ya sea en el mismo tono o en contraste. Si se necesita un forro más delgado, también manejamos el brioni de 70 g en los mismos colores.',
  usos = '["Sacos","Chaquetas","Chalecos","Prendas masculinas","Prendas femeninas"]'::jsonb,
  detalles = '[{"etiqueta":"Composición","valor":"100% poliéster"},{"etiqueta":"Ancho","valor":"1,50 m"},{"etiqueta":"Colores disponibles","valor":"Negro, Azul, Gris oscuro, Gris medio, Gris claro, Café oscuro, Café claro, Tabaco, Camel, Beige, Blanco, Fucsia, Rosado, Guayaba, Azul claro, Vino tinto, Rojo, Rojo cereza, Berenjena, Verde botella, Verde militar, Amarillo"}]'::jsonb,
  cuidados = null
where alegra_id = '9';
update productos_meta set
  nombre_cache = 'Forro brioni 70 gr', categoria = 'forros', unidad = 'Por metro',
  descripcion = 'Forro liso de 70 g para prendas masculinas y femeninas, más delgado que el brioni tradicional. Disponible en 22 colores.',
  descripcion_larga = 'Es la versión más delgada del forro brioni: 70 g, 100% poliéster. Se recomienda cuando la prenda necesita un forro liviano, que no le sume peso ni volumen a la tela. Viene en los mismos 22 colores del brioni tradicional.',
  usos = '["Sacos","Chaquetas","Chalecos","Prendas livianas","Prendas masculinas","Prendas femeninas"]'::jsonb,
  detalles = '[{"etiqueta":"Composición","valor":"100% poliéster"},{"etiqueta":"Gramaje","valor":"70 g"},{"etiqueta":"Ancho","valor":"1,50 m"},{"etiqueta":"Colores disponibles","valor":"Negro, Azul, Gris oscuro, Gris medio, Gris claro, Café oscuro, Café claro, Tabaco, Camel, Beige, Blanco, Fucsia, Rosado, Guayaba, Azul claro, Vino tinto, Rojo, Rojo cereza, Berenjena, Verde botella, Verde militar, Amarillo"}]'::jsonb,
  cuidados = null
where alegra_id = '42';
update productos_meta set
  nombre_cache = 'Forro estampado', categoria = 'forros', unidad = 'Por metro',
  descripcion = 'Forro estampado de 70 g para prendas masculinas y femeninas. Viene en dos diseños, puntos y rombos, en varios colores.',
  descripcion_larga = 'El forro estampado es 100% poliéster, de 70 g, y sirve para darle un toque distinto al interior de la prenda. El diseño de puntos viene en nueve colores: negro, azul, gris, rojo, camel, fucsia, verde militar, café oscuro y café claro. El de rombos viene en cinco: negro, rojo, azul, café y gris.',
  usos = '["Sacos","Chaquetas","Chalecos","Prendas masculinas","Prendas femeninas"]'::jsonb,
  detalles = '[{"etiqueta":"Composición","valor":"100% poliéster"},{"etiqueta":"Gramaje","valor":"70 g"},{"etiqueta":"Ancho","valor":"1,50 m"},{"etiqueta":"Puntos","valor":"Negro, Azul, Gris, Rojo, Camel, Fucsia, Verde militar, Café oscuro, Café claro"},{"etiqueta":"Rombos","valor":"Negro, Rojo, Azul, Café, Gris"}]'::jsonb,
  cuidados = null
where alegra_id = '13';
update productos_meta set
  nombre_cache = 'Forro poliviscosa', categoria = 'forros', unidad = 'Por metro',
  descripcion = 'Forro en poliviscosa para prendas masculinas. Viene en color negro.',
  descripcion_larga = 'Forro para prendas masculinas en poliviscosa, una mezcla de poliéster y viscosa. Pesa aproximadamente 75 g y viene en color negro.',
  usos = '["Sacos de caballero","Prendas masculinas"]'::jsonb,
  detalles = '[{"etiqueta":"Composición","valor":"Poliviscosa"},{"etiqueta":"Gramaje","valor":"75 g aproximadamente"},{"etiqueta":"Ancho","valor":"1,50 m"},{"etiqueta":"Colores disponibles","valor":"Negro"}]'::jsonb,
  cuidados = null
where alegra_id = '32';
update productos_meta set
  nombre_cache = 'Valencina', categoria = 'forros', unidad = 'Por metro',
  descripcion = 'Forro blanco con rayas negras para la manga del saco de hombre. Es 100% poliéster.',
  descripcion_larga = 'Forro blanco con rayas negras para la manga del saco de hombre. Es 100% poliéster.',
  usos = '["Mangas de saco de caballero"]'::jsonb,
  detalles = '[{"etiqueta":"Composición","valor":"100% poliéster"},{"etiqueta":"Ancho","valor":"1,50 m"},{"etiqueta":"Color","valor":"Blanco con rayas negras"}]'::jsonb,
  cuidados = null
where alegra_id = '34';

-- refuerzos
update productos_meta set
  nombre_cache = 'Banrol', categoria = 'refuerzos', unidad = 'Por metro',
  descripcion = 'Refuerzo para la pretina del pantalón. Le da firmeza a la cintura para que no se doble ni se enrolle con el uso.',
  descripcion_larga = 'Refuerzo para la pretina del pantalón. Le da firmeza a la cintura para que no se doble ni se enrolle con el uso.',
  usos = '["Pretinas de pantalón"]'::jsonb,
  detalles = '[{"etiqueta":"Colores disponibles","valor":"Blanco"}]'::jsonb,
  cuidados = null
where alegra_id = '18';
update productos_meta set
  nombre_cache = 'Pretina', categoria = 'refuerzos', unidad = 'Por metro',
  descripcion = 'Material para armar la pretina del pantalón de hombre. Viene en blanco, negro y beige.',
  descripcion_larga = 'Material para armar la pretina del pantalón de hombre. Viene en blanco, negro y beige.',
  usos = '["Pretinas de pantalón de caballero"]'::jsonb,
  detalles = '[{"etiqueta":"Colores disponibles","valor":"Blanco, Negro, Beige"}]'::jsonb,
  cuidados = null
where alegra_id = '25';
update productos_meta set
  nombre_cache = 'Bayetilla', categoria = 'refuerzos', unidad = 'Por metro',
  descripcion = 'Tela 100% algodón que hace parte de la fuerza de pecho en sacos y prendas masculinas. También se usa para limpieza y pulido.',
  descripcion_larga = 'En sastrería, la bayetilla es una de las capas que forman la fuerza de pecho del saco, la estructura interna que le da forma al frente de la prenda. Es 100% algodón y viene en color blanco. Fuera de la confección, también se usa como paño para limpiar y pulir.',
  usos = '["Fuerza de pecho","Sacos de caballero","Prendas masculinas","Limpieza y pulido"]'::jsonb,
  detalles = '[{"etiqueta":"Composición","valor":"100% algodón"},{"etiqueta":"Ancho","valor":"1,50 m"},{"etiqueta":"Colores disponibles","valor":"Blanco"}]'::jsonb,
  cuidados = 'Mantener en lugar seco.'
where alegra_id = '4';
update productos_meta set
  nombre_cache = 'Borraflojo', categoria = 'refuerzos', unidad = 'Por metro',
  descripcion = 'Material 100% algodón que se pone en la manga del saco de hombre para darle cuerpo. Viene en color blanco.',
  descripcion_larga = 'Material 100% algodón que se pone en la manga del saco de hombre para darle cuerpo. Viene en color blanco y tiene aproximadamente 9 cm de ancho.',
  usos = '["Mangas de saco de caballero"]'::jsonb,
  detalles = '[{"etiqueta":"Composición","valor":"100% algodón"},{"etiqueta":"Colores disponibles","valor":"Blanco"},{"etiqueta":"Ancho","valor":"9 cm aproximadamente"}]'::jsonb,
  cuidados = 'Mantener en lugar seco.'
where alegra_id = '36';
update productos_meta set
  nombre_cache = 'Guata', categoria = 'refuerzos', unidad = 'Por metro',
  descripcion = 'Guata 100% algodón para los frentes de la chaqueta de hombre. Viene en color blanco.',
  descripcion_larga = 'La guata es una de las capas internas del frente de la chaqueta de hombre: le suma cuerpo al delantero para que la prenda arme bien. Es 100% algodón y viene en color blanco.',
  usos = '["Frentes de chaqueta de caballero","Sastrería masculina"]'::jsonb,
  detalles = '[{"etiqueta":"Composición","valor":"100% algodón"},{"etiqueta":"Ancho","valor":"1,50 m"},{"etiqueta":"Colores disponibles","valor":"Blanco"}]'::jsonb,
  cuidados = 'Mantener en lugar seco.'
where alegra_id = '23';
update productos_meta set
  nombre_cache = 'Sido corriente', categoria = 'refuerzos', unidad = 'Por metro',
  descripcion = 'Entretela de sastrería con pelo animal para los frentes de la chaqueta de hombre. Pesa 210 g.',
  descripcion_larga = 'El sido es la entretela que le da estructura al frente de la chaqueta de hombre. Está hecho con una mezcla de algodón (31%), pelo animal (30%), rayón viscosa (21%) y poliéster (18%), y pesa 210 g.',
  usos = '["Frentes de chaqueta de caballero","Sastrería masculina"]'::jsonb,
  detalles = '[{"etiqueta":"Composición","valor":"Algodón 31%, pelo animal 30%, rayón viscosa 21%, poliéster 18%"},{"etiqueta":"Peso","valor":"210 g"},{"etiqueta":"Ancho","valor":"1,50 m"}]'::jsonb,
  cuidados = 'Mantener en lugar seco.'
where alegra_id = '11';

-- telas
update productos_meta set
  nombre_cache = 'Dacrón', categoria = 'telas', unidad = 'Por metro',
  descripcion = 'Tela en polialgodón para los bolsillos del pantalón. Viene en blanco, negro y beige.',
  descripcion_larga = 'El dacrón es una tela de polialgodón, mezcla de poliéster y algodón, que se usa para hacer las bolsas de los bolsillos del pantalón. Viene en blanco, negro y beige, para escoger el tono que mejor vaya con la tela de la prenda.',
  usos = '["Bolsillos de pantalón"]'::jsonb,
  detalles = '[{"etiqueta":"Composición","valor":"Polialgodón"},{"etiqueta":"Ancho","valor":"1,50 m"},{"etiqueta":"Colores disponibles","valor":"Blanco, Negro, Beige"}]'::jsonb,
  cuidados = null
where alegra_id = '43';
update productos_meta set
  nombre_cache = 'Bolsillo espiga', categoria = 'telas', unidad = 'Por metro',
  descripcion = 'Tela para bolsillos con grabado de espiga. Se usa sobre todo en pantalones para caballero.',
  descripcion_larga = 'Tela 100% poliéster para hacer las bolsas de los bolsillos, con un grabado de espiga en el tejido. Es la que se suele usar en los pantalones para caballero. Viene en color negro.',
  usos = '["Bolsillos de pantalón de caballero"]'::jsonb,
  detalles = '[{"etiqueta":"Composición","valor":"100% poliéster"},{"etiqueta":"Ancho","valor":"1,50 m"},{"etiqueta":"Diseño","valor":"Grabado de espiga"},{"etiqueta":"Colores disponibles","valor":"Negro"}]'::jsonb,
  cuidados = null
where alegra_id = '41';
update productos_meta set
  nombre_cache = 'Lona calima', categoria = 'telas', unidad = 'Por metro',
  descripcion = 'Lona 100% algodón en color crudo. Se usa para entretelar el cuello del saco de hombre, como lienzo para pintura al óleo y para el tendido de plancha en sastrería.',
  descripcion_larga = 'La lona calima es una tela de algodón crudo con tres usos principales. En sastrería sirve para entretelar el cuello del saco de hombre y para cubrir la mesa o tabla de planchar. Fuera de la confección, se usa como lienzo para pintar al óleo.',
  usos = '["Cuello de saco de caballero","Tendido de plancha","Lienzo para pintura al óleo"]'::jsonb,
  detalles = '[{"etiqueta":"Composición","valor":"100% algodón"},{"etiqueta":"Ancho","valor":"1,50 m"},{"etiqueta":"Colores disponibles","valor":"Crudo"}]'::jsonb,
  cuidados = 'Mantener en lugar seco.'
where alegra_id = '26';
update productos_meta set
  nombre_cache = 'Liencillo', categoria = 'telas', unidad = 'Por metro',
  descripcion = 'Tela 100% algodón para hacer la prueba de vestidos femeninos antes de cortar la tela definitiva. Viene en color camel.',
  descripcion_larga = 'El liencillo se usa para armar la prueba del vestido: la prenda se confecciona primero en esta tela para revisar el molde y hacer los ajustes, y solo después se corta la tela final. Es 100% algodón y viene en color camel.',
  usos = '["Pruebas de vestidos","Pruebas de moldes"]'::jsonb,
  detalles = '[{"etiqueta":"Composición","valor":"100% algodón"},{"etiqueta":"Ancho","valor":"1,50 m"},{"etiqueta":"Colores disponibles","valor":"Camel"}]'::jsonb,
  cuidados = 'Mantener en lugar seco.'
where alegra_id = '20';

-- hombreras
update productos_meta set
  nombre_cache = 'Hombrera algodón 2 capas', categoria = 'hombreras', unidad = 'Por par',
  descripcion = 'Hombrera 100% algodón de dos capas para sacos de dama y caballero. Se vende por par, en blanco y negro.',
  descripcion_larga = 'Hombrera de algodón de dos capas para darle forma al hombro en sacos de dama y caballero. Es la más delgada de las dos de algodón que manejamos; la otra trae tres capas. Viene en blanco y negro y se vende por par.',
  usos = '["Sacos de dama","Sacos de caballero"]'::jsonb,
  detalles = '[{"etiqueta":"Composición","valor":"100% algodón"},{"etiqueta":"Capas","valor":"2"},{"etiqueta":"Colores disponibles","valor":"Blanco, Negro"}]'::jsonb,
  cuidados = null
where alegra_id = '17';
update productos_meta set
  nombre_cache = 'Hombrera en algodón', categoria = 'hombreras', unidad = 'Por par',
  descripcion = 'Hombrera 100% algodón de tres capas para sacos de dama y caballero. Se vende por par, en blanco y negro.',
  descripcion_larga = 'Hombrera de algodón de tres capas para darle forma al hombro en sacos de dama y caballero. Tiene una capa más que la hombrera de algodón de 2 capas. Viene en blanco y negro y se vende por par.',
  usos = '["Sacos de dama","Sacos de caballero"]'::jsonb,
  detalles = '[{"etiqueta":"Composición","valor":"100% algodón"},{"etiqueta":"Capas","valor":"3"},{"etiqueta":"Colores disponibles","valor":"Blanco, Negro"}]'::jsonb,
  cuidados = null
where alegra_id = '2';
update productos_meta set
  nombre_cache = 'Hombrera espuma blanca', categoria = 'hombreras', unidad = 'Por par',
  descripcion = 'Hombrera de espuma en color blanco para confección femenina. Se vende por par.',
  descripcion_larga = 'Hombrera de espuma en color blanco para confección femenina. Se vende por par.',
  usos = '["Prendas femeninas"]'::jsonb,
  detalles = '[{"etiqueta":"Material","valor":"Espuma"},{"etiqueta":"Color","valor":"Blanco"}]'::jsonb,
  cuidados = null
where alegra_id = '16';
update productos_meta set
  nombre_cache = 'Hombrera espuma negra', categoria = 'hombreras', unidad = 'Por par',
  descripcion = 'Hombrera de espuma en color negro para confección femenina. Se vende por par.',
  descripcion_larga = 'Hombrera de espuma en color negro para confección femenina. Se vende por par.',
  usos = '["Prendas femeninas"]'::jsonb,
  detalles = '[{"etiqueta":"Material","valor":"Espuma"},{"etiqueta":"Color","valor":"Negro"}]'::jsonb,
  cuidados = null
where alegra_id = '3';

-- tizas
update productos_meta set
  nombre_cache = 'Caja tiza blanca 9 unidades', categoria = 'tizas', unidad = 'Por caja',
  descripcion = 'Caja de 9 tizas de sastre blancas para marcar telas. Dejan un trazo visible que se retira con cepillado o lavado.',
  descripcion_larga = 'La tiza de sastre sirve para pasar el molde a la tela y marcar pinzas, dobladillos, ojales y ajustes de prueba. Deja un trazo visible que se retira con cepillado o con el lavado. La blanca es la que más se nota sobre telas oscuras y de color. Esta caja trae 9 unidades.',
  usos = '["Marcar telas","Trazo de moldes","Marcas de ajuste en pruebas","Telas oscuras"]'::jsonb,
  detalles = '[{"etiqueta":"Contenido","valor":"9 unidades"},{"etiqueta":"Color","valor":"Blanco"}]'::jsonb,
  cuidados = 'Guardar en su caja y en lugar seco. Probar primero en un retazo para confirmar que el trazo sale bien de esa tela.'
where alegra_id = '48';
update productos_meta set
  nombre_cache = 'Caja tiza blanca 10 unidades', categoria = 'tizas', unidad = 'Por caja',
  descripcion = 'Caja de 10 tizas de sastre blancas para marcar telas. Dejan un trazo visible que se retira con cepillado o lavado.',
  descripcion_larga = 'La tiza de sastre sirve para pasar el molde a la tela y marcar pinzas, dobladillos, ojales y ajustes de prueba. Deja un trazo visible que se retira con cepillado o con el lavado. La blanca es la que más se nota sobre telas oscuras y de color. Esta caja trae 10 unidades.',
  usos = '["Marcar telas","Trazo de moldes","Marcas de ajuste en pruebas","Telas oscuras"]'::jsonb,
  detalles = '[{"etiqueta":"Contenido","valor":"10 unidades"},{"etiqueta":"Color","valor":"Blanco"}]'::jsonb,
  cuidados = 'Guardar en su caja y en lugar seco. Probar primero en un retazo para confirmar que el trazo sale bien de esa tela.'
where alegra_id = '19';
update productos_meta set
  nombre_cache = 'Caja tiza blanca, 50 unidades', categoria = 'tizas', unidad = 'Por caja',
  descripcion = 'Caja de 50 tizas de sastre blancas para marcar telas, pensada para talleres y uso frecuente. Dejan un trazo visible que se retira con cepillado o lavado.',
  descripcion_larga = 'La tiza de sastre sirve para pasar el molde a la tela y marcar pinzas, dobladillos, ojales y ajustes de prueba. Deja un trazo visible que se retira con cepillado o con el lavado. La blanca es la que más se nota sobre telas oscuras y de color. Esta caja trae 50 unidades, la presentación más grande, para talleres y uso frecuente.',
  usos = '["Marcar telas","Trazo de moldes","Marcas de ajuste en pruebas","Telas oscuras","Talleres de confección"]'::jsonb,
  detalles = '[{"etiqueta":"Contenido","valor":"50 unidades"},{"etiqueta":"Color","valor":"Blanco"}]'::jsonb,
  cuidados = 'Guardar en su caja y en lugar seco. Probar primero en un retazo para confirmar que el trazo sale bien de esa tela.'
where alegra_id = '22';
update productos_meta set
  nombre_cache = 'Caja tiza color 9 unidades', categoria = 'tizas', unidad = 'Por caja',
  descripcion = 'Caja de 9 tizas de sastre en colores surtidos para marcar telas blancas. Dejan un trazo visible que se retira con cepillado o lavado.',
  descripcion_larga = 'La tiza de sastre sirve para pasar el molde a la tela y marcar pinzas, dobladillos, ojales y ajustes de prueba. Deja un trazo visible que se retira con cepillado o con el lavado. La de color se usa en telas blancas, donde la tiza blanca no se ve. Esta caja trae 9 unidades en colores surtidos: rosado, amarillo, azul y verde.',
  usos = '["Marcar telas blancas","Trazo de moldes","Marcas de ajuste en pruebas"]'::jsonb,
  detalles = '[{"etiqueta":"Contenido","valor":"9 unidades"},{"etiqueta":"Colores","valor":"Surtidos: rosado, amarillo, azul y verde"}]'::jsonb,
  cuidados = 'Guardar en su caja y en lugar seco. Probar primero en un retazo para confirmar que el trazo sale bien de esa tela.'
where alegra_id = '47';
update productos_meta set
  nombre_cache = 'Caja tiza color 10 unidades', categoria = 'tizas', unidad = 'Por caja',
  descripcion = 'Caja de 10 tizas de sastre en colores surtidos para marcar telas blancas. Dejan un trazo visible que se retira con cepillado o lavado.',
  descripcion_larga = 'La tiza de sastre sirve para pasar el molde a la tela y marcar pinzas, dobladillos, ojales y ajustes de prueba. Deja un trazo visible que se retira con cepillado o con el lavado. La de color se usa en telas blancas, donde la tiza blanca no se ve. Esta caja trae 10 unidades en colores surtidos: rosado, amarillo, azul y verde.',
  usos = '["Marcar telas blancas","Trazo de moldes","Marcas de ajuste en pruebas"]'::jsonb,
  detalles = '[{"etiqueta":"Contenido","valor":"10 unidades"},{"etiqueta":"Colores","valor":"Surtidos: rosado, amarillo, azul y verde"}]'::jsonb,
  cuidados = 'Guardar en su caja y en lugar seco. Probar primero en un retazo para confirmar que el trazo sale bien de esa tela.'
where alegra_id = '38';
update productos_meta set
  nombre_cache = 'Caja tiza color 50 unidades', categoria = 'tizas', unidad = 'Por caja',
  descripcion = 'Caja de 50 tizas de sastre en colores surtidos para marcar telas blancas, pensada para talleres y uso frecuente. Dejan un trazo visible que se retira con cepillado o lavado.',
  descripcion_larga = 'La tiza de sastre sirve para pasar el molde a la tela y marcar pinzas, dobladillos, ojales y ajustes de prueba. Deja un trazo visible que se retira con cepillado o con el lavado. La de color se usa en telas blancas, donde la tiza blanca no se ve. Esta caja trae 50 unidades en colores surtidos (rosado, amarillo, azul y verde) y es la presentación más grande, para talleres y uso frecuente.',
  usos = '["Marcar telas blancas","Trazo de moldes","Marcas de ajuste en pruebas","Talleres de confección"]'::jsonb,
  detalles = '[{"etiqueta":"Contenido","valor":"50 unidades"},{"etiqueta":"Colores","valor":"Surtidos: rosado, amarillo, azul y verde"}]'::jsonb,
  cuidados = 'Guardar en su caja y en lugar seco. Probar primero en un retazo para confirmar que el trazo sale bien de esa tela.'
where alegra_id = '21';

-- botones
update productos_meta set
  nombre_cache = 'Botón grande', categoria = 'botones', unidad = 'Por unidad',
  descripcion = 'Botón grande para prendas masculinas. Viene en cinco colores sobrios: negro, azul oscuro, gris medio, gris claro y café oscuro.',
  descripcion_larga = 'Botón grande para prendas masculinas, en los colores más usados en sastrería: negro, azul oscuro, gris medio, gris claro y café oscuro. Hace juego con el botón pequeño, que viene en los mismos colores y se usa en la manga.',
  usos = '["Sacos de caballero","Prendas masculinas"]'::jsonb,
  detalles = '[{"etiqueta":"Tamaño","valor":"Grande"},{"etiqueta":"Colores disponibles","valor":"Negro, Azul oscuro, Gris medio, Gris claro, Café oscuro"}]'::jsonb,
  cuidados = null
where alegra_id = '50';
update productos_meta set
  nombre_cache = 'Botón pequeño', categoria = 'botones', unidad = 'Por unidad',
  descripcion = 'Botón pequeño para la manga del saco de caballero y otras prendas masculinas. Viene en negro, azul oscuro, gris medio, gris claro y café oscuro.',
  descripcion_larga = 'Botón pequeño para la manga del saco de caballero, en los colores más usados en sastrería: negro, azul oscuro, gris medio, gris claro y café oscuro. Hace juego con el botón grande, que viene en los mismos colores.',
  usos = '["Mangas de saco de caballero","Prendas masculinas"]'::jsonb,
  detalles = '[{"etiqueta":"Tamaño","valor":"Pequeño"},{"etiqueta":"Colores disponibles","valor":"Negro, Azul oscuro, Gris medio, Gris claro, Café oscuro"}]'::jsonb,
  cuidados = null
where alegra_id = '51';
update productos_meta set
  nombre_cache = 'Cremallera cobre 20 cmts', categoria = 'botones', unidad = 'Por unidad',
  descripcion = 'Cremallera cobre de 20 cm para pantalón de dama y caballero. Viene en colores surtidos y se vende por unidad.',
  descripcion_larga = 'Cremallera cobre de 20 cm para pantalón de dama y caballero. Viene en colores surtidos y se vende por unidad.',
  usos = '["Pantalones de dama","Pantalones de caballero"]'::jsonb,
  detalles = '[{"etiqueta":"Largo","valor":"20 cm"},{"etiqueta":"Colores disponibles","valor":"Surtidos"}]'::jsonb,
  cuidados = null
where alegra_id = '27';
update productos_meta set
  nombre_cache = 'Cremallera plástica', categoria = 'botones', unidad = 'Por unidad',
  descripcion = 'Cremallera plástica de 20 cm para pantalón de dama y caballero. Viene en colores surtidos y se vende por unidad.',
  descripcion_larga = 'Cremallera plástica de 20 cm para pantalón de dama y caballero. Viene en colores surtidos y se vende por unidad.',
  usos = '["Pantalones de dama","Pantalones de caballero"]'::jsonb,
  detalles = '[{"etiqueta":"Material","valor":"Plástica"},{"etiqueta":"Colores disponibles","valor":"Surtidos"},{"etiqueta":"Largo","valor":"20 cm"}]'::jsonb,
  cuidados = null
where alegra_id = '45';

-- otros
update productos_meta set
  nombre_cache = 'Portavestido', categoria = 'otros', unidad = 'Por unidad',
  descripcion = 'Portavestido negro para guardar prendas masculinas y femeninas. Protege la prenda del polvo mientras está colgada o al transportarla.',
  descripcion_larga = 'Portavestido negro para guardar prendas masculinas y femeninas. Protege la prenda del polvo mientras está colgada o al transportarla.',
  usos = '["Guardar vestidos y sacos","Transportar prendas","Entrega de prendas terminadas"]'::jsonb,
  detalles = '[{"etiqueta":"Color","valor":"Negro"}]'::jsonb,
  cuidados = null
where alegra_id = '10';
update productos_meta set
  nombre_cache = 'Portavestidos con ventana', categoria = 'otros', unidad = 'Por unidad',
  descripcion = 'Portavestido negro con ventana para guardar prendas masculinas y femeninas. La ventana deja ver qué prenda hay adentro sin abrirlo.',
  descripcion_larga = 'Portavestido negro para guardar y transportar prendas masculinas y femeninas, protegidas del polvo. Se diferencia del portavestido sencillo por la ventana, que permite identificar la prenda sin abrir la funda: útil cuando hay varias colgadas juntas.',
  usos = '["Guardar vestidos y sacos","Transportar prendas","Entrega de prendas terminadas"]'::jsonb,
  detalles = '[{"etiqueta":"Color","valor":"Negro"},{"etiqueta":"Ventana","valor":"Sí"}]'::jsonb,
  cuidados = null
where alegra_id = '49';

-- Portavestido: ahora se vende por unidad, no por metro.
update productos_meta set peso_unit = 0.15, volumen_unit = 1500 where alegra_id = '10';
-- Banrol y Borraflojo: ahora por metro (pesos provisionales de tela angosta).
update productos_meta set peso_unit = 0.02, volumen_unit = 80 where alegra_id in ('18', '36');

alter table productos_meta add constraint productos_meta_categoria_check
  check (categoria in ('entretelas','forros','refuerzos','telas','hombreras','tizas','botones','otros'));

-- ── 4. Variantes ─────────────────────────────────────────────
-- Sin variantes: los productos de un solo color o surtidos.
update productos_meta set variante_etiqueta = null
where alegra_id not in ('1', '2', '6', '8', '9', '14', '15', '17', '25', '42', '43', '50', '51', '13');

-- Colores que el PDF ya no trae (Beige de la doble punto 70 g) y los
-- diseños viejos del forro estampado (se rehacen como diseño + color).
delete from producto_variantes where alegra_id = '1' and nombre not in ('Negro', 'Blanco');
delete from producto_variantes where alegra_id = '13';

-- Entretela doble punto
update productos_meta set variante_etiqueta = 'Color' where alegra_id = '1';
insert into producto_variantes (alegra_id, nombre, hex, orden) values
  ('1', 'Negro', '#1a1a1a', 0),
  ('1', 'Blanco', '#f5f5f5', 1)
on conflict (alegra_id, nombre) do update set hex = excluded.hex, orden = excluded.orden;

-- Hombrera en algodón
update productos_meta set variante_etiqueta = 'Color' where alegra_id = '2';
insert into producto_variantes (alegra_id, nombre, hex, orden) values
  ('2', 'Blanco', '#f5f5f5', 0),
  ('2', 'Negro', '#1a1a1a', 1)
on conflict (alegra_id, nombre) do update set hex = excluded.hex, orden = excluded.orden;

-- Entretela poliestar
update productos_meta set variante_etiqueta = 'Color' where alegra_id = '6';
insert into producto_variantes (alegra_id, nombre, hex, orden) values
  ('6', 'Blanco', '#f5f5f5', 0),
  ('6', 'Negro', '#1a1a1a', 1)
on conflict (alegra_id, nombre) do update set hex = excluded.hex, orden = excluded.orden;

-- Interlón
update productos_meta set variante_etiqueta = 'Color' where alegra_id = '8';
insert into producto_variantes (alegra_id, nombre, hex, orden) values
  ('8', 'Blanco', '#f5f5f5', 0),
  ('8', 'Negro', '#1a1a1a', 1),
  ('8', 'Gris', '#8a8a8a', 2)
on conflict (alegra_id, nombre) do update set hex = excluded.hex, orden = excluded.orden;

-- Forro brioni
update productos_meta set variante_etiqueta = 'Color' where alegra_id = '9';
insert into producto_variantes (alegra_id, nombre, hex, orden) values
  ('9', 'Negro', '#1a1a1a', 0),
  ('9', 'Azul', '#1f3a8a', 1),
  ('9', 'Gris oscuro', '#4a4a4a', 2),
  ('9', 'Gris medio', '#808080', 3),
  ('9', 'Gris claro', '#c8c8c8', 4),
  ('9', 'Café oscuro', '#4b2e1e', 5),
  ('9', 'Café claro', '#a47551', 6),
  ('9', 'Tabaco', '#71472b', 7),
  ('9', 'Camel', '#c19a6b', 8),
  ('9', 'Beige', '#d4b896', 9),
  ('9', 'Blanco', '#f5f5f5', 10),
  ('9', 'Fucsia', '#d6337f', 11),
  ('9', 'Rosado', '#f4a7b9', 12),
  ('9', 'Guayaba', '#f07c6c', 13),
  ('9', 'Azul claro', '#8fb8de', 14),
  ('9', 'Vino tinto', '#6d1a2a', 15),
  ('9', 'Rojo', '#c62828', 16),
  ('9', 'Rojo cereza', '#9b111e', 17),
  ('9', 'Berenjena', '#4b2142', 18),
  ('9', 'Verde botella', '#0b4d2e', 19),
  ('9', 'Verde militar', '#4b5320', 20),
  ('9', 'Amarillo', '#f2c94c', 21)
on conflict (alegra_id, nombre) do update set hex = excluded.hex, orden = excluded.orden;

-- Forro arabesco
update productos_meta set variante_etiqueta = 'Color' where alegra_id = '14';
insert into producto_variantes (alegra_id, nombre, hex, orden) values
  ('14', 'Negro', '#1a1a1a', 0),
  ('14', 'Rojo', '#c62828', 1),
  ('14', 'Azul', '#1f3a8a', 2),
  ('14', 'Camel', '#c19a6b', 3),
  ('14', 'Mostaza', '#d4a017', 4),
  ('14', 'Gris', '#8a8a8a', 5),
  ('14', 'Azul claro', '#8fb8de', 6),
  ('14', 'Azul petróleo', '#1d4e5f', 7)
on conflict (alegra_id, nombre) do update set hex = excluded.hex, orden = excluded.orden;

-- Entretela doble punto 90gr
update productos_meta set variante_etiqueta = 'Color' where alegra_id = '15';
insert into producto_variantes (alegra_id, nombre, hex, orden) values
  ('15', 'Negro', '#1a1a1a', 0),
  ('15', 'Blanco', '#f5f5f5', 1),
  ('15', 'Natural', '#efe6d2', 2)
on conflict (alegra_id, nombre) do update set hex = excluded.hex, orden = excluded.orden;

-- Hombrera algodón 2 capas
update productos_meta set variante_etiqueta = 'Color' where alegra_id = '17';
insert into producto_variantes (alegra_id, nombre, hex, orden) values
  ('17', 'Blanco', '#f5f5f5', 0),
  ('17', 'Negro', '#1a1a1a', 1)
on conflict (alegra_id, nombre) do update set hex = excluded.hex, orden = excluded.orden;

-- Pretina
update productos_meta set variante_etiqueta = 'Color' where alegra_id = '25';
insert into producto_variantes (alegra_id, nombre, hex, orden) values
  ('25', 'Blanco', '#f5f5f5', 0),
  ('25', 'Negro', '#1a1a1a', 1),
  ('25', 'Beige', '#d4b896', 2)
on conflict (alegra_id, nombre) do update set hex = excluded.hex, orden = excluded.orden;

-- Forro brioni 70 gr
update productos_meta set variante_etiqueta = 'Color' where alegra_id = '42';
insert into producto_variantes (alegra_id, nombre, hex, orden) values
  ('42', 'Negro', '#1a1a1a', 0),
  ('42', 'Azul', '#1f3a8a', 1),
  ('42', 'Gris oscuro', '#4a4a4a', 2),
  ('42', 'Gris medio', '#808080', 3),
  ('42', 'Gris claro', '#c8c8c8', 4),
  ('42', 'Café oscuro', '#4b2e1e', 5),
  ('42', 'Café claro', '#a47551', 6),
  ('42', 'Tabaco', '#71472b', 7),
  ('42', 'Camel', '#c19a6b', 8),
  ('42', 'Beige', '#d4b896', 9),
  ('42', 'Blanco', '#f5f5f5', 10),
  ('42', 'Fucsia', '#d6337f', 11),
  ('42', 'Rosado', '#f4a7b9', 12),
  ('42', 'Guayaba', '#f07c6c', 13),
  ('42', 'Azul claro', '#8fb8de', 14),
  ('42', 'Vino tinto', '#6d1a2a', 15),
  ('42', 'Rojo', '#c62828', 16),
  ('42', 'Rojo cereza', '#9b111e', 17),
  ('42', 'Berenjena', '#4b2142', 18),
  ('42', 'Verde botella', '#0b4d2e', 19),
  ('42', 'Verde militar', '#4b5320', 20),
  ('42', 'Amarillo', '#f2c94c', 21)
on conflict (alegra_id, nombre) do update set hex = excluded.hex, orden = excluded.orden;

-- Dacrón
update productos_meta set variante_etiqueta = 'Color' where alegra_id = '43';
insert into producto_variantes (alegra_id, nombre, hex, orden) values
  ('43', 'Blanco', '#f5f5f5', 0),
  ('43', 'Negro', '#1a1a1a', 1),
  ('43', 'Beige', '#d4b896', 2)
on conflict (alegra_id, nombre) do update set hex = excluded.hex, orden = excluded.orden;

-- Botón grande
update productos_meta set variante_etiqueta = 'Color' where alegra_id = '50';
insert into producto_variantes (alegra_id, nombre, hex, orden) values
  ('50', 'Negro', '#1a1a1a', 0),
  ('50', 'Azul oscuro', '#1b2a4a', 1),
  ('50', 'Gris medio', '#808080', 2),
  ('50', 'Gris claro', '#c8c8c8', 3),
  ('50', 'Café oscuro', '#4b2e1e', 4)
on conflict (alegra_id, nombre) do update set hex = excluded.hex, orden = excluded.orden;

-- Botón pequeño
update productos_meta set variante_etiqueta = 'Color' where alegra_id = '51';
insert into producto_variantes (alegra_id, nombre, hex, orden) values
  ('51', 'Negro', '#1a1a1a', 0),
  ('51', 'Azul oscuro', '#1b2a4a', 1),
  ('51', 'Gris medio', '#808080', 2),
  ('51', 'Gris claro', '#c8c8c8', 3),
  ('51', 'Café oscuro', '#4b2e1e', 4)
on conflict (alegra_id, nombre) do update set hex = excluded.hex, orden = excluded.orden;

-- Forro estampado
update productos_meta set variante_etiqueta = 'Diseño y color' where alegra_id = '13';
insert into producto_variantes (alegra_id, nombre, hex, orden) values
  ('13', 'Puntos — Negro', '#1a1a1a', 0),
  ('13', 'Puntos — Azul', '#1f3a8a', 1),
  ('13', 'Puntos — Gris', '#8a8a8a', 2),
  ('13', 'Puntos — Rojo', '#c62828', 3),
  ('13', 'Puntos — Camel', '#c19a6b', 4),
  ('13', 'Puntos — Fucsia', '#d6337f', 5),
  ('13', 'Puntos — Verde militar', '#4b5320', 6),
  ('13', 'Puntos — Café oscuro', '#4b2e1e', 7),
  ('13', 'Puntos — Café claro', '#a47551', 8),
  ('13', 'Rombos — Negro', '#1a1a1a', 9),
  ('13', 'Rombos — Rojo', '#c62828', 10),
  ('13', 'Rombos — Azul', '#1f3a8a', 11),
  ('13', 'Rombos — Café', '#6f4e37', 12),
  ('13', 'Rombos — Gris', '#8a8a8a', 13);

commit;

-- Para revisar:
--   select categoria, unidad, count(*) from productos_meta group by 1, 2 order by 1;
--   select alegra_id, count(*) from producto_variantes group by 1 order by 1;
