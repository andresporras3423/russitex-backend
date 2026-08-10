-- ============================================================
--  productos_meta — DESCRIPCIÓN Y USOS de los 39 productos
--
--  Requiere haber corrido antes productos_meta_detalle.sql
--  (ese crea las columnas; este las llena).
--
--  OJO: este contenido es un PRIMER BORRADOR redactado a partir del
--  nombre y la categoría de cada producto. Sirve para que la ficha y el
--  bot dejen de estar vacíos, pero hay que revisarlo con quien conoce
--  el almacén: puede haber imprecisiones sobre composición, gramaje o
--  usos concretos. Editá las filas directamente en Supabase.
--
--  Ejecutar en: Supabase -> SQL Editor -> New query -> Run
-- ============================================================

-- ── FORROS ───────────────────────────────────────────────────
update productos_meta set
  descripcion = 'Forro liviano de tacto suave que permite que la prenda se deslice bien al ponerla y quitarla. Se usa en el interior de chaquetas, sacos y faldas para dar un acabado limpio y ocultar costuras.',
  usos = '["Interior de chaquetas","Forrar faldas","Forrar sacos","Acabado interno de prendas","Ocultar costuras"]'::jsonb
where alegra_id = '9';   -- Forro brioni

update productos_meta set
  descripcion = 'Versión de mayor gramaje del forro brioni. Al ser un poco más cuerpo, cae mejor y aporta algo más de abrigo en prendas de invierno.',
  usos = '["Chaquetas de invierno","Abrigos","Sacos formales","Prendas que necesitan más caída"]'::jsonb
where alegra_id = '42';  -- Forro brioni 70 gr

update productos_meta set
  descripcion = 'Forro con diseño arabesco. Aporta un interior decorado a la prenda, ideal cuando el forro se ve al abrirla o al doblar solapas.',
  usos = '["Interior visible de chaquetas","Chalecos","Solapas con vista","Prendas de sastrería"]'::jsonb
where alegra_id = '14';  -- Forro arabesco

update productos_meta set
  descripcion = 'Forro estampado para darle personalidad al interior de la prenda. Muy usado cuando se busca un contraste con la tela exterior.',
  usos = '["Interior de chaquetas","Chalecos","Detalles decorativos","Prendas juveniles"]'::jsonb
where alegra_id = '13';  -- Forro estampado

update productos_meta set
  descripcion = 'Forro estampado de mayor cuerpo que el estándar. Al ser más grueso resiste mejor el uso y aporta algo de abrigo.',
  usos = '["Chaquetas de invierno","Abrigos","Interior de prendas de trabajo","Forros resistentes"]'::jsonb
where alegra_id = '32';  -- Forro estampado grueso

update productos_meta set
  descripcion = 'Forro en poliviscosa, mezcla que combina la suavidad de la viscosa con la resistencia del poliéster. Buen equilibrio entre caída, durabilidad y precio.',
  usos = '["Interior de sacos","Chaquetas","Faldas","Uniformes","Prendas de uso diario"]'::jsonb
where alegra_id = '40';  -- Forro Poliviscosa

-- ── ENTRETELAS ───────────────────────────────────────────────
update productos_meta set
  descripcion = 'Entretela de uso general para dar estructura y cuerpo a las zonas de la prenda que lo necesitan, sin que se sienta rígida.',
  usos = '["Cuellos","Puños","Pretinas","Refuerzos internos","Vistas y solapas"]'::jsonb
where alegra_id = '12';  -- Entretela

update productos_meta set
  descripcion = 'Material de refuerzo que da estructura interna a la prenda sin hacerla rígida. Su tejido de punto le da elasticidad en ambos sentidos, así que acompaña bien telas con movimiento. Se adhiere con calor a través de plancha.',
  descripcion_larga = 'La entretela doble punto es un material de refuerzo que da estructura interna a una prenda sin hacerla rígida. Su tejido de punto le otorga elasticidad en ambos sentidos, haciéndola compatible con telas de mayor movimiento. Se adhiere con calor a través de plancha.',
  usos = '["Cuellos de camisa","Puños","Pretinas","Solapas","Refuerzos internos","Acabados de confección"]'::jsonb,
  cuidados = 'Mantener en lugar seco. Hacer prueba en retazo antes de fusionar en la prenda definitiva.'
where alegra_id = '1';   -- entretela doble punto

update productos_meta set
  descripcion = 'La misma entretela doble punto pero en 90 gramos: un poco más firme, para cuando se busca más soporte sin llegar a una entretela rígida.',
  usos = '["Cuellos con más cuerpo","Pretinas","Solapas de sastrería","Refuerzos que exigen firmeza"]'::jsonb,
  cuidados = 'Hacer prueba en retazo antes de fusionar: al ser más firme, marca más en telas delgadas.'
where alegra_id = '15';  -- entretela doble punto 90gr

update productos_meta set
  descripcion = 'Entretela de textura tipo galleta, liviana y económica. Se usa cuando se necesita dar un poco de cuerpo sin sumar peso ni rigidez.',
  usos = '["Refuerzos livianos","Vistas","Bolsillos","Prendas ligeras"]'::jsonb
where alegra_id = '35';  -- Entretela galleta

update productos_meta set
  descripcion = 'Entretela con superficie granulada que agarra muy bien al fusionar. Es la más firme de la línea, para zonas que deben mantener su forma.',
  usos = '["Cuellos rígidos","Pretinas firmes","Estructuras de sastrería","Zonas de mucho uso"]'::jsonb,
  cuidados = 'Al ser firme, probar siempre en retazo: puede marcar el derecho en telas delgadas.'
where alegra_id = '33';  -- Entretela granulada

update productos_meta set
  descripcion = 'Entretela específica para cuellos de camisa. Mantiene el cuello parado y con buena forma después de varios lavados.',
  usos = '["Cuellos de camisa","Puños de camisa","Portezuelas","Botonaduras"]'::jsonb
where alegra_id = '7';   -- entretela para cuello de camisa

update productos_meta set
  descripcion = 'Entretela de poliéster, resistente y estable. Aguanta bien los lavados y no se deforma con el uso.',
  usos = '["Uniformes","Ropa de trabajo","Refuerzos duraderos","Prendas de lavado frecuente"]'::jsonb
where alegra_id = '6';   -- entretela poliestar

-- ── HOMBRERAS ────────────────────────────────────────────────
update productos_meta set
  descripcion = 'Hombrera estándar para dar forma y caída al hombro. Se cose en el interior de la prenda, a la altura de la sisa.',
  usos = '["Sacos","Chaquetas","Blazers","Vestidos estructurados"]'::jsonb,
  presentacion = 'Se vende por par'
where alegra_id = '5';   -- Hombrera

update productos_meta set
  descripcion = 'Hombrera de algodón en dos capas. Al ser doble da más volumen y una línea de hombro más marcada.',
  usos = '["Sacos de sastrería","Chaquetas estructuradas","Abrigos","Uniformes formales"]'::jsonb,
  presentacion = 'Se vende por par'
where alegra_id = '17';  -- Hombrera algodón 2 capas

update productos_meta set
  descripcion = 'Hombrera en algodón, de tacto natural y transpirable. Buena opción para prendas donde se busca comodidad.',
  usos = '["Sacos","Blazers","Prendas de algodón","Confección a la medida"]'::jsonb,
  presentacion = 'Se vende por par'
where alegra_id = '2';   -- Hombrera en algodón

update productos_meta set
  descripcion = 'Hombrera de espuma blanca, liviana y económica. Da forma sin agregar peso, ideal para prendas ligeras.',
  usos = '["Blusas","Vestidos livianos","Prendas de verano","Confección económica"]'::jsonb,
  presentacion = 'Blanca — se vende por par'
where alegra_id = '16';  -- Hombrera espuma blanca

update productos_meta set
  descripcion = 'Hombrera negra, pensada para prendas oscuras donde no debe transparentarse ni notarse por el derecho.',
  usos = '["Prendas oscuras","Sacos negros","Telas delgadas de color oscuro","Chaquetas formales"]'::jsonb,
  presentacion = 'Negra — se vende por par'
where alegra_id = '3';   -- Hombrera negra

-- ── GUATAS ───────────────────────────────────────────────────
update productos_meta set
  descripcion = 'Guata para dar volumen y abrigo. Se coloca entre la tela exterior y el forro, y se puede acolchar con pespuntes.',
  usos = '["Chaquetas acolchadas","Cobijas","Abrigos","Trabajos de acolchado","Manualidades"]'::jsonb
where alegra_id = '23';  -- Guata

update productos_meta set
  descripcion = 'Guata con adhesivo en una cara: se pega a la tela con plancha, así que no se corre mientras se cose. Ahorra bastante tiempo de armado.',
  usos = '["Acolchados","Chaquetas","Bolsos y accesorios","Proyectos donde la guata no debe moverse"]'::jsonb,
  cuidados = 'Fusionar con plancha a temperatura media, sin vapor excesivo. Probar primero en un retazo.'
where alegra_id = '37';  -- Guata fusionable

-- ── TIZAS ────────────────────────────────────────────────────
update productos_meta set
  descripcion = 'Tiza de sastre para marcar telas. Deja un trazo visible que se retira con cepillado o lavado.',
  usos = '["Marcar líneas de corte","Transferir patrones","Señalar pinzas","Marcar dobladillos"]'::jsonb
where alegra_id = '19';  -- caja tiza

update productos_meta set
  descripcion = 'Tiza de sastre blanca para marcar telas claras y oscuras con trazos nítidos. Ideal para transferir patrones, marcar líneas de corte y señalar ajustes. Se retira fácilmente con cepillado o lavado. Caja con 50 unidades.',
  descripcion_larga = 'La tiza de sastre blanca es un clásico para marcar telas con precisión. Se desliza con facilidad sobre la mayoría de los tejidos, deja una línea visible y nítida, y se retira sin dejar rastro con un cepillado o lavado suave. Cada caja trae 50 unidades, ideal para taller o uso continuo.',
  usos = '["Marcar líneas de corte","Transferir patrones","Señalar pinzas y dobladillos","Marcar ajustes de prueba","Trazos sobre telas oscuras","Uso continuo en taller"]'::jsonb,
  cuidados = 'Mantener en lugar seco. Probar en un retazo si la tela es muy clara o delicada.',
  presentacion = 'Blanco — 50 tizas por caja'
where alegra_id = '22';  -- caja tiza blanca, 50 unidades

update productos_meta set
  descripcion = 'Caja de tizas de sastre en varios colores, para marcar sobre telas de distintos tonos sin que el trazo se pierda. 50 unidades.',
  usos = '["Marcar telas de colores","Transferir patrones","Distinguir marcas por color","Uso continuo en taller"]'::jsonb,
  presentacion = 'Surtido de colores — 50 tizas por caja'
where alegra_id = '21';  -- caja tiza color 50 unidades

update productos_meta set
  descripcion = 'Presentación pequeña de tizas de colores. Buena opción para uso ocasional o para tener a mano sin comprar la caja grande.',
  usos = '["Marcar telas de colores","Arreglos puntuales","Uso doméstico","Costura ocasional"]'::jsonb,
  presentacion = 'Surtido de colores — caja pequeña'
where alegra_id = '38';  -- Caja tiza color pequeña

-- ── CIERRES ──────────────────────────────────────────────────
update productos_meta set
  descripcion = 'Cremallera de 20 cm con acabado en tono cobre. El diente metálico le da un aspecto resistente y decorativo a la vez.',
  usos = '["Bolsillos","Chaquetas cortas","Bolsos y accesorios","Detalles decorativos"]'::jsonb,
  presentacion = '20 cm — acabado cobre'
where alegra_id = '27';  -- cremallera cobre 20 cmts

-- ── OTROS MATERIALES ─────────────────────────────────────────
update productos_meta set
  descripcion = 'Banda de refuerzo para pretinas. Evita que la pretina se doble o se arrugue con el uso.',
  usos = '["Pretinas de pantalón","Pretinas de falda","Refuerzo de cinturas"]'::jsonb
where alegra_id = '18';  -- Banrol

update productos_meta set
  descripcion = 'Tela de algodón suave y absorbente. Se usa tanto en confección como para limpieza y pulido en el taller.',
  usos = '["Forros internos","Bolsillos","Limpieza de taller","Paños absorbentes"]'::jsonb
where alegra_id = '4';   -- Bayetilla

update productos_meta set
  descripcion = 'Bayetilla en poliéster: más resistente y de secado más rápido que la de algodón, y más económica.',
  usos = '["Bolsillos","Forros internos","Limpieza","Uso general de taller"]'::jsonb
where alegra_id = '39';  -- Bayetilla en poliester

update productos_meta set
  descripcion = 'Tela específica para armar bolsillos, con tejido en espiga que le da resistencia al roce del uso diario.',
  usos = '["Bolsillos de pantalón","Bolsillos de chaqueta","Refuerzos internos"]'::jsonb
where alegra_id = '41';  -- Bolsillo espiga

update productos_meta set
  descripcion = 'Material de relleno y refuerzo, blando al tacto. Se usa para acolchar y para dar cuerpo en zonas puntuales.',
  usos = '["Rellenos","Acolchados","Refuerzos blandos","Manualidades"]'::jsonb
where alegra_id = '36';  -- Borraflojo

update productos_meta set
  descripcion = 'Fibra sintética de relleno, liviana y con buena recuperación: vuelve a su forma después de comprimirse.',
  usos = '["Chaquetas acolchadas","Cojines","Cobijas","Rellenos en general"]'::jsonb
where alegra_id = '43';  -- Dacrón

update productos_meta set
  descripcion = 'Material de refuerzo para dar cuerpo a la prenda. Es una alternativa económica a la entretela en trabajos donde no se necesita fusionar.',
  usos = '["Refuerzos internos","Vistas","Pretinas","Confección económica"]'::jsonb
where alegra_id = '8';   -- Interlón

update productos_meta set
  descripcion = 'Versión telfor del interlón, con un acabado distinto que le da mejor caída y algo más de suavidad.',
  usos = '["Refuerzos internos","Vistas","Prendas que necesitan caída","Confección general"]'::jsonb
where alegra_id = '24';  -- Interlón telfor

update productos_meta set
  descripcion = 'Tela de algodón sin blanquear, económica y de buen cuerpo. Muy usada para hacer pruebas de patrón antes de cortar la tela definitiva.',
  usos = '["Prototipos de patrón","Bolsillos","Forros internos","Prácticas de confección"]'::jsonb
where alegra_id = '20';  -- Liencillo

update productos_meta set
  descripcion = 'Tela gruesa y resistente, pensada para prendas y artículos que reciben mucho uso.',
  usos = '["Bolsos","Delantales","Ropa de trabajo","Tapicería liviana"]'::jsonb
where alegra_id = '26';  -- Lona calima

update productos_meta set
  descripcion = 'Banda para armar la cintura de pantalones y faldas. Mantiene la pretina firme y con la forma correcta.',
  usos = '["Pretinas de pantalón","Pretinas de falda","Cinturas de uniforme"]'::jsonb
where alegra_id = '25';  -- Pretina

update productos_meta set
  descripcion = 'Material para forrar y proteger prendas colgadas, muy usado para portavestidos y fundas de sastrería.',
  usos = '["Portavestidos","Fundas de prenda","Protección en el armario","Traslado de ropa"]'::jsonb
where alegra_id = '10';  -- portavestido

update productos_meta set
  descripcion = 'Tela de gama alta con buena caída y acabado fino. Se usa en prendas donde el resultado final importa más que el costo.',
  usos = '["Sastrería fina","Prendas de ocasión","Confección a la medida"]'::jsonb
where alegra_id = '11';  -- Sido

update productos_meta set
  descripcion = 'Material de refuerzo tradicional en sastrería, para dar estructura a zonas que deben mantener la forma con el tiempo.',
  usos = '["Solapas","Delanteros de saco","Estructuras de sastrería","Refuerzos duraderos"]'::jsonb
where alegra_id = '34';  -- Valencina


-- ------------------------------------------------------------
--  Revisar qué quedó cargado:
--
--    select alegra_id, nombre_cache,
--           left(descripcion, 40) as descripcion,
--           jsonb_array_length(usos) as n_usos
--    from productos_meta
--    order by categoria, nombre_cache;
--
--  Y ver si falta alguno:
--    select alegra_id, nombre_cache from productos_meta where descripcion is null;
-- ------------------------------------------------------------
