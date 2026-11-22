-- ============================================================
--  productos_meta — FICHAS REALES de los 41 productos
--
--  Fuente: "Fichas de producto Russitex" (PDF de Paula, 2026-11-21).
--  Reemplaza el primer borrador de productos_contenido.sql.
--
--  Llena: descripcion (corta), descripcion_larga, usos, detalles y
--  cuidados. Los campos que la ficha no trae quedan vacíos a propósito
--  (null o lista vacía): la página de detalle esconde esa sección.
--
--  NO toca categoría, unidad, variantes, precio ni imágenes.
--
--  Ejecutar en: Supabase -> SQL Editor -> New query -> Run
--  Luego: https://russitex-backend.onrender.com/api/productos?refrescar=1
-- ============================================================

begin;

update productos_meta set
  descripcion       = 'Entretela fusionable tejida de punto que da cuerpo a la prenda sin dejarla rígida. Con 70 g es la versión liviana, pensada para prendas femeninas y pequeños refuerzos.',
  descripcion_larga = 'La entretela doble punto está tejida en poliéster texturizado, por eso cede junto con la tela y acompaña el movimiento de la prenda en lugar de endurecerla. Esta referencia de 70 g es la más liviana de las dos que manejamos y se usa en confección femenina y en refuerzos pequeños. Se adhiere con el calor de la plancha. Para prendas masculinas o telas de más peso está la de 90 g.',
  usos              = '["Prendas femeninas","Pequeños refuerzos","Cuellos","Puños","Pretinas","Solapas"]'::jsonb,
  detalles          = '[{"etiqueta":"Composición","valor":"100% poliéster texturizado"},{"etiqueta":"Gramaje","valor":"70 g"},{"etiqueta":"Ancho","valor":"1,50 m"},{"etiqueta":"Textura","valor":"Flexible, tejido de punto"},{"etiqueta":"Adhesión","valor":"Fusionable con plancha"},{"etiqueta":"Colores disponibles","valor":"Negro, Blanco"}]'::jsonb,
  cuidados          = 'Mantener en lugar seco. Hacer una prueba en un retazo antes de fusionar en la prenda definitiva.'
where alegra_id = '1';  -- Entretela doble punto (70 g)

update productos_meta set
  descripcion       = 'Entretela fusionable tejida de punto que da cuerpo a la prenda sin dejarla rígida. Con 90 g es la de más peso y la que más se usa en prendas masculinas.',
  descripcion_larga = 'La entretela doble punto está tejida en poliéster texturizado, por eso cede junto con la tela y acompaña el movimiento de la prenda en lugar de endurecerla. Esta referencia de 90 g tiene más cuerpo que la de 70 g y se usa sobre todo en prendas masculinas, aunque también sirve para prendas femeninas y pequeños refuerzos. Se adhiere con el calor de la plancha.',
  usos              = '["Prendas masculinas","Prendas femeninas","Pequeños refuerzos"]'::jsonb,
  detalles          = '[{"etiqueta":"Composición","valor":"100% poliéster texturizado"},{"etiqueta":"Gramaje","valor":"90 g"},{"etiqueta":"Ancho","valor":"1,50 m"},{"etiqueta":"Textura","valor":"Flexible, tejido de punto"},{"etiqueta":"Adhesión","valor":"Fusionable con plancha"},{"etiqueta":"Colores disponibles","valor":"Negro, Blanco, Natural"}]'::jsonb,
  cuidados          = 'Mantener en lugar seco. Hacer una prueba en un retazo antes de fusionar en la prenda definitiva.'
where alegra_id = '15';  -- Entretela doble punto 90 g

update productos_meta set
  descripcion       = 'Entretela fusionable especial para la pretina de pantalones de dama y caballero. También sirve para entretelar blusas, camisas sport, pecheras y pequeños refuerzos.',
  descripcion_larga = 'La entretela galleta se usa sobre todo en la pretina del pantalón, tanto de dama como de caballero, para que mantenga la forma. Por su peso liviano, de 52,5 g, también funciona en blusas, camisas sport, pecheras y refuerzos pequeños. Es 100% poliéster, viene en color blanco y se adhiere con el calor de la plancha.',
  usos              = '["Pretinas de pantalón","Blusas","Camisas sport","Pecheras","Pequeños refuerzos"]'::jsonb,
  detalles          = '[{"etiqueta":"Composición","valor":"100% poliéster"},{"etiqueta":"Gramaje","valor":"52,5 g"},{"etiqueta":"Ancho","valor":"1,50 m"},{"etiqueta":"Adhesión","valor":"Fusionable con plancha"},{"etiqueta":"Colores disponibles","valor":"Blanco"}]'::jsonb,
  cuidados          = 'Mantener en lugar seco. Hacer una prueba en un retazo antes de fusionar en la prenda definitiva.'
where alegra_id = '35';  -- Entretela galleta

update productos_meta set
  descripcion       = 'Entretela fusionable especial para la pretina del pantalón masculino. Le da firmeza a la cintura para que conserve la forma.',
  descripcion_larga = 'Entretela fusionable especial para la pretina del pantalón masculino. Le da firmeza a la cintura para que conserve la forma.',
  usos              = '["Pretinas de pantalón de caballero"]'::jsonb,
  detalles          = '[{"etiqueta":"Ancho","valor":"1,50 m"},{"etiqueta":"Adhesión","valor":"Fusionable con plancha"},{"etiqueta":"Colores disponibles","valor":"Blanco"}]'::jsonb,
  cuidados          = 'Mantener en lugar seco. Hacer una prueba en un retazo antes de fusionar en la prenda definitiva.'
where alegra_id = '33';  -- Entretela granulada

update productos_meta set
  descripcion       = 'Entretela fusionable para entretelar telas elásticas. Viene en blanco y negro.',
  descripcion_larga = 'Entretela fusionable para entretelar telas elásticas. Viene en blanco y negro.',
  usos              = '["Telas elásticas"]'::jsonb,
  detalles          = '[{"etiqueta":"Ancho","valor":"1,50 m"},{"etiqueta":"Adhesión","valor":"Fusionable con plancha"},{"etiqueta":"Colores disponibles","valor":"Blanco, Negro"}]'::jsonb,
  cuidados          = 'Mantener en lugar seco. Hacer una prueba en un retazo antes de fusionar en la prenda definitiva.'
where alegra_id = '6';  -- Entretela poliestar

update productos_meta set
  descripcion       = 'Entretela fusionable para dar cuerpo y forma a los cuellos camiseros de dama. Es de menor gramaje que la de caballero, así que el cuello queda con estructura pero menos rígido.',
  descripcion_larga = 'Esta entretela va por dentro del cuello camisero y es la que hace que mantenga la forma. Es más liviana que la entretela para cuello de caballero, por eso se recomienda para blusas y camisas de dama, donde se busca un cuello definido pero más suave. Viene en color blanco y se adhiere con el calor de la plancha.',
  usos              = '["Cuellos camiseros de dama","Blusas","Camisas de dama"]'::jsonb,
  detalles          = '[{"etiqueta":"Gramaje","valor":"Liviano, menor que la de caballero"},{"etiqueta":"Ancho","valor":"1,50 m"},{"etiqueta":"Adhesión","valor":"Fusionable con plancha"},{"etiqueta":"Colores disponibles","valor":"Blanco"}]'::jsonb,
  cuidados          = 'Mantener en lugar seco. Hacer una prueba en un retazo antes de fusionar en la prenda definitiva.'
where alegra_id = '44';  -- Entretela cuello camisa dama

update productos_meta set
  descripcion       = 'Entretela fusionable de gramaje grueso para el cuello de la camisa de caballero. Le da la firmeza que necesita para mantenerse armado.',
  descripcion_larga = 'Esta entretela va por dentro del cuello de la camisa y es la que hace que mantenga la forma. Su gramaje grueso da el cuello firme y definido de la camisa de caballero. Para cuellos de dama manejamos una entretela más liviana. Viene en color blanco y se adhiere con el calor de la plancha.',
  usos              = '["Cuellos de camisa de caballero"]'::jsonb,
  detalles          = '[{"etiqueta":"Gramaje","valor":"Grueso"},{"etiqueta":"Ancho","valor":"1,50 m"},{"etiqueta":"Adhesión","valor":"Fusionable con plancha"},{"etiqueta":"Colores disponibles","valor":"Blanco"}]'::jsonb,
  cuidados          = 'Mantener en lugar seco. Hacer una prueba en un retazo antes de fusionar en la prenda definitiva.'
where alegra_id = '7';  -- Entretela para cuello camisa

update productos_meta set
  descripcion       = 'Entretela muy liviana, no fusionable, para blusas, pecheras y pequeños refuerzos. Da estabilidad a la tela sin sumarle peso.',
  descripcion_larga = 'El interlón es la entretela más liviana que manejamos: pesa 28 g. Por eso se usa en telas delgadas, como las de blusa, y en zonas donde solo hace falta un refuerzo suave, como pecheras y detalles pequeños. No es fusionable, así que se fija con costura. Es 100% poliéster y viene en blanco, negro y gris.',
  usos              = '["Blusas","Pecheras","Pequeños refuerzos"]'::jsonb,
  detalles          = '[{"etiqueta":"Composición","valor":"100% poliéster"},{"etiqueta":"Gramaje","valor":"28 g"},{"etiqueta":"Ancho","valor":"1,50 m"},{"etiqueta":"Adhesión","valor":"No fusionable, se fija con costura"},{"etiqueta":"Colores disponibles","valor":"Blanco, Negro, Gris"}]'::jsonb,
  cuidados          = 'Mantener en lugar seco.'
where alegra_id = '8';  -- Interlón

update productos_meta set
  descripcion       = 'Material de refuerzo no fusionable para los frentes del saco de hombre. Viene en color camel.',
  descripcion_larga = 'Material de refuerzo no fusionable para los frentes del saco de hombre. Viene en color camel.',
  usos              = '["Frentes de saco de caballero"]'::jsonb,
  detalles          = '[{"etiqueta":"Ancho","valor":"1,50 m"},{"etiqueta":"Colores disponibles","valor":"Camel"},{"etiqueta":"Adhesión","valor":"No fusionable, se fija con costura"}]'::jsonb,
  cuidados          = 'Mantener en lugar seco.'
where alegra_id = '24';  -- Interlón telfor

update productos_meta set
  descripcion       = 'Forro con grabado arabesco para prendas masculinas y femeninas. Le da un acabado más vistoso al interior de sacos, chaquetas y chalecos.',
  descripcion_larga = 'El forro arabesco trae el diseño grabado en la misma tela, un detalle que se nota al abrir la prenda y la hace ver más cuidada por dentro. Es 100% poliéster y sirve para forrar prendas masculinas y femeninas. Viene en ocho colores, desde los clásicos negro, azul y gris hasta tonos como rojo, mostaza y azul petróleo.',
  usos              = '["Sacos","Chaquetas","Chalecos","Prendas masculinas","Prendas femeninas"]'::jsonb,
  detalles          = '[{"etiqueta":"Composición","valor":"100% poliéster"},{"etiqueta":"Ancho","valor":"1,50 m"},{"etiqueta":"Diseño","valor":"Grabado arabesco"},{"etiqueta":"Colores disponibles","valor":"Negro, Rojo, Azul, Camel, Mostaza, Gris, Azul claro, Azul petróleo"}]'::jsonb,
  cuidados          = null
where alegra_id = '14';  -- Forro arabesco

update productos_meta set
  descripcion       = 'Forro liso para prendas masculinas y femeninas, disponible en 22 colores. Es el forro de uso general para sacos, chaquetas y chalecos.',
  descripcion_larga = 'El forro brioni es un forro liso 100% poliéster para prendas masculinas y femeninas. Su carta de 22 colores permite combinarlo con casi cualquier tela, ya sea en el mismo tono o en contraste. Si se necesita un forro más delgado, también manejamos el brioni de 70 g en los mismos colores.',
  usos              = '["Sacos","Chaquetas","Chalecos","Prendas masculinas","Prendas femeninas"]'::jsonb,
  detalles          = '[{"etiqueta":"Composición","valor":"100% poliéster"},{"etiqueta":"Ancho","valor":"1,50 m"},{"etiqueta":"Colores disponibles","valor":"Negro, Azul, Gris oscuro, Gris medio, Gris claro, Café oscuro, Café claro, Tabaco, Camel, Beige, Blanco, Fucsia, Rosado, Guayaba, Azul claro, Vino tinto, Rojo, Rojo cereza, Berenjena, Verde botella, Verde militar, Amarillo"}]'::jsonb,
  cuidados          = null
where alegra_id = '9';  -- Forro brioni

update productos_meta set
  descripcion       = 'Forro liso de 70 g para prendas masculinas y femeninas, más delgado que el brioni tradicional. Disponible en 22 colores.',
  descripcion_larga = 'Es la versión más delgada del forro brioni: 70 g, 100% poliéster. Se recomienda cuando la prenda necesita un forro liviano, que no le sume peso ni volumen a la tela. Viene en los mismos 22 colores del brioni tradicional.',
  usos              = '["Sacos","Chaquetas","Chalecos","Prendas livianas","Prendas masculinas","Prendas femeninas"]'::jsonb,
  detalles          = '[{"etiqueta":"Composición","valor":"100% poliéster"},{"etiqueta":"Gramaje","valor":"70 g"},{"etiqueta":"Ancho","valor":"1,50 m"},{"etiqueta":"Colores disponibles","valor":"Negro, Azul, Gris oscuro, Gris medio, Gris claro, Café oscuro, Café claro, Tabaco, Camel, Beige, Blanco, Fucsia, Rosado, Guayaba, Azul claro, Vino tinto, Rojo, Rojo cereza, Berenjena, Verde botella, Verde militar, Amarillo"}]'::jsonb,
  cuidados          = null
where alegra_id = '42';  -- Forro brioni de 70 g

update productos_meta set
  descripcion       = 'Forro estampado de 70 g para prendas masculinas y femeninas. Viene en dos diseños, puntos y rombos, en varios colores.',
  descripcion_larga = 'El forro estampado es 100% poliéster, de 70 g, y sirve para darle un toque distinto al interior de la prenda. El diseño de puntos viene en nueve colores: negro, azul, gris, rojo, camel, fucsia, verde militar, café oscuro y café claro. El de rombos viene en cinco: negro, rojo, azul, café y gris.',
  usos              = '["Sacos","Chaquetas","Chalecos","Prendas masculinas","Prendas femeninas"]'::jsonb,
  detalles          = '[{"etiqueta":"Composición","valor":"100% poliéster"},{"etiqueta":"Gramaje","valor":"70 g"},{"etiqueta":"Ancho","valor":"1,50 m"},{"etiqueta":"Puntos","valor":"Negro, Azul, Gris, Rojo, Camel, Fucsia, Verde militar, Café oscuro, Café claro"},{"etiqueta":"Rombos","valor":"Negro, Rojo, Azul, Café, Gris"}]'::jsonb,
  cuidados          = null
where alegra_id = '13';  -- Forro estampado

update productos_meta set
  descripcion       = 'Forro en poliviscosa para prendas masculinas. Viene en color negro.',
  descripcion_larga = 'Forro para prendas masculinas en poliviscosa, una mezcla de poliéster y viscosa. Pesa aproximadamente 75 g y viene en color negro.',
  usos              = '["Sacos de caballero","Prendas masculinas"]'::jsonb,
  detalles          = '[{"etiqueta":"Composición","valor":"Poliviscosa"},{"etiqueta":"Gramaje","valor":"75 g aproximadamente"},{"etiqueta":"Ancho","valor":"1,50 m"},{"etiqueta":"Colores disponibles","valor":"Negro"}]'::jsonb,
  cuidados          = null
where alegra_id = '32';  -- Forro poliviscosa

update productos_meta set
  descripcion       = 'Forro blanco con rayas negras para la manga del saco de hombre. Es 100% poliéster.',
  descripcion_larga = 'Forro blanco con rayas negras para la manga del saco de hombre. Es 100% poliéster.',
  usos              = '["Mangas de saco de caballero"]'::jsonb,
  detalles          = '[{"etiqueta":"Composición","valor":"100% poliéster"},{"etiqueta":"Ancho","valor":"1,50 m"},{"etiqueta":"Color","valor":"Blanco con rayas negras"}]'::jsonb,
  cuidados          = null
where alegra_id = '34';  -- Valencina

update productos_meta set
  descripcion       = 'Refuerzo para la pretina del pantalón. Le da firmeza a la cintura para que no se doble ni se enrolle con el uso.',
  descripcion_larga = 'Refuerzo para la pretina del pantalón. Le da firmeza a la cintura para que no se doble ni se enrolle con el uso.',
  usos              = '["Pretinas de pantalón"]'::jsonb,
  detalles          = '[{"etiqueta":"Colores disponibles","valor":"Blanco"}]'::jsonb,
  cuidados          = null
where alegra_id = '18';  -- Banrol

update productos_meta set
  descripcion       = 'Material para armar la pretina del pantalón de hombre. Viene en blanco, negro y beige.',
  descripcion_larga = 'Material para armar la pretina del pantalón de hombre. Viene en blanco, negro y beige.',
  usos              = '["Pretinas de pantalón de caballero"]'::jsonb,
  detalles          = '[{"etiqueta":"Colores disponibles","valor":"Blanco, Negro, Beige"}]'::jsonb,
  cuidados          = null
where alegra_id = '25';  -- Pretina

update productos_meta set
  descripcion       = 'Tela 100% algodón que hace parte de la fuerza de pecho en sacos y prendas masculinas. También se usa para limpieza y pulido.',
  descripcion_larga = 'En sastrería, la bayetilla es una de las capas que forman la fuerza de pecho del saco, la estructura interna que le da forma al frente de la prenda. Es 100% algodón y viene en color blanco. Fuera de la confección, también se usa como paño para limpiar y pulir.',
  usos              = '["Fuerza de pecho","Sacos de caballero","Prendas masculinas","Limpieza y pulido"]'::jsonb,
  detalles          = '[{"etiqueta":"Composición","valor":"100% algodón"},{"etiqueta":"Ancho","valor":"1,50 m"},{"etiqueta":"Colores disponibles","valor":"Blanco"}]'::jsonb,
  cuidados          = 'Mantener en lugar seco.'
where alegra_id = '4';  -- Bayetilla

update productos_meta set
  descripcion       = 'Material 100% algodón que se pone en la manga del saco de hombre para darle cuerpo. Viene en color blanco.',
  descripcion_larga = 'Material 100% algodón que se pone en la manga del saco de hombre para darle cuerpo. Viene en color blanco y tiene aproximadamente 9 cm de ancho.',
  usos              = '["Mangas de saco de caballero"]'::jsonb,
  detalles          = '[{"etiqueta":"Composición","valor":"100% algodón"},{"etiqueta":"Colores disponibles","valor":"Blanco"},{"etiqueta":"Ancho","valor":"9 cm aproximadamente"}]'::jsonb,
  cuidados          = 'Mantener en lugar seco.'
where alegra_id = '36';  -- Borraflojo

update productos_meta set
  descripcion       = 'Guata 100% algodón para los frentes de la chaqueta de hombre. Viene en color blanco.',
  descripcion_larga = 'La guata es una de las capas internas del frente de la chaqueta de hombre: le suma cuerpo al delantero para que la prenda arme bien. Es 100% algodón y viene en color blanco.',
  usos              = '["Frentes de chaqueta de caballero","Sastrería masculina"]'::jsonb,
  detalles          = '[{"etiqueta":"Composición","valor":"100% algodón"},{"etiqueta":"Ancho","valor":"1,50 m"},{"etiqueta":"Colores disponibles","valor":"Blanco"}]'::jsonb,
  cuidados          = 'Mantener en lugar seco.'
where alegra_id = '23';  -- Guata

update productos_meta set
  descripcion       = 'Entretela de sastrería con pelo animal para los frentes de la chaqueta de hombre. Pesa 210 g.',
  descripcion_larga = 'El sido es la entretela que le da estructura al frente de la chaqueta de hombre. Está hecho con una mezcla de algodón (31%), pelo animal (30%), rayón viscosa (21%) y poliéster (18%), y pesa 210 g.',
  usos              = '["Frentes de chaqueta de caballero","Sastrería masculina"]'::jsonb,
  detalles          = '[{"etiqueta":"Composición","valor":"Algodón 31%, pelo animal 30%, rayón viscosa 21%, poliéster 18%"},{"etiqueta":"Peso","valor":"210 g"},{"etiqueta":"Ancho","valor":"1,50 m"}]'::jsonb,
  cuidados          = 'Mantener en lugar seco.'
where alegra_id = '11';  -- Sido corriente

update productos_meta set
  descripcion       = 'Lona 100% algodón en color crudo. Se usa para entretelar el cuello del saco de hombre, como lienzo para pintura al óleo y para el tendido de plancha en sastrería.',
  descripcion_larga = 'La lona calima es una tela de algodón crudo con tres usos principales. En sastrería sirve para entretelar el cuello del saco de hombre y para cubrir la mesa o tabla de planchar. Fuera de la confección, se usa como lienzo para pintar al óleo.',
  usos              = '["Cuello de saco de caballero","Tendido de plancha","Lienzo para pintura al óleo"]'::jsonb,
  detalles          = '[{"etiqueta":"Composición","valor":"100% algodón"},{"etiqueta":"Ancho","valor":"1,50 m"},{"etiqueta":"Colores disponibles","valor":"Crudo"}]'::jsonb,
  cuidados          = 'Mantener en lugar seco.'
where alegra_id = '26';  -- Lona calima

update productos_meta set
  descripcion       = 'Tela 100% algodón para hacer la prueba de vestidos femeninos antes de cortar la tela definitiva. Viene en color camel.',
  descripcion_larga = 'El liencillo se usa para armar la prueba del vestido: la prenda se confecciona primero en esta tela para revisar el molde y hacer los ajustes, y solo después se corta la tela final. Es 100% algodón y viene en color camel.',
  usos              = '["Pruebas de vestidos","Pruebas de moldes"]'::jsonb,
  detalles          = '[{"etiqueta":"Composición","valor":"100% algodón"},{"etiqueta":"Ancho","valor":"1,50 m"},{"etiqueta":"Colores disponibles","valor":"Camel"}]'::jsonb,
  cuidados          = 'Mantener en lugar seco.'
where alegra_id = '20';  -- Liencillo

update productos_meta set
  descripcion       = 'Tela para bolsillos con grabado de espiga. Se usa sobre todo en pantalones para caballero.',
  descripcion_larga = 'Tela 100% poliéster para hacer las bolsas de los bolsillos, con un grabado de espiga en el tejido. Es la que se suele usar en los pantalones para caballero. Viene en color negro.',
  usos              = '["Bolsillos de pantalón de caballero"]'::jsonb,
  detalles          = '[{"etiqueta":"Composición","valor":"100% poliéster"},{"etiqueta":"Ancho","valor":"1,50 m"},{"etiqueta":"Diseño","valor":"Grabado de espiga"},{"etiqueta":"Colores disponibles","valor":"Negro"}]'::jsonb,
  cuidados          = null
where alegra_id = '41';  -- Bolsillo espiga

update productos_meta set
  descripcion       = 'Tela en polialgodón para los bolsillos del pantalón. Viene en blanco, negro y beige.',
  descripcion_larga = 'El dacrón es una tela de polialgodón, mezcla de poliéster y algodón, que se usa para hacer las bolsas de los bolsillos del pantalón. Viene en blanco, negro y beige, para escoger el tono que mejor vaya con la tela de la prenda.',
  usos              = '["Bolsillos de pantalón"]'::jsonb,
  detalles          = '[{"etiqueta":"Composición","valor":"Polialgodón"},{"etiqueta":"Ancho","valor":"1,50 m"},{"etiqueta":"Colores disponibles","valor":"Blanco, Negro, Beige"}]'::jsonb,
  cuidados          = null
where alegra_id = '43';  -- Dacrón

update productos_meta set
  descripcion       = 'Hombrera 100% algodón de dos capas para sacos de dama y caballero. Se vende por par, en blanco y negro.',
  descripcion_larga = 'Hombrera de algodón de dos capas para darle forma al hombro en sacos de dama y caballero. Es la más delgada de las dos de algodón que manejamos; la otra trae tres capas. Viene en blanco y negro y se vende por par.',
  usos              = '["Sacos de dama","Sacos de caballero"]'::jsonb,
  detalles          = '[{"etiqueta":"Composición","valor":"100% algodón"},{"etiqueta":"Capas","valor":"2"},{"etiqueta":"Colores disponibles","valor":"Blanco, Negro"}]'::jsonb,
  cuidados          = null
where alegra_id = '17';  -- Hombrera algodón 2 capas

update productos_meta set
  descripcion       = 'Hombrera 100% algodón de tres capas para sacos de dama y caballero. Se vende por par, en blanco y negro.',
  descripcion_larga = 'Hombrera de algodón de tres capas para darle forma al hombro en sacos de dama y caballero. Tiene una capa más que la hombrera de algodón de 2 capas. Viene en blanco y negro y se vende por par.',
  usos              = '["Sacos de dama","Sacos de caballero"]'::jsonb,
  detalles          = '[{"etiqueta":"Composición","valor":"100% algodón"},{"etiqueta":"Capas","valor":"3"},{"etiqueta":"Colores disponibles","valor":"Blanco, Negro"}]'::jsonb,
  cuidados          = null
where alegra_id = '2';  -- Hombrera en algodón

update productos_meta set
  descripcion       = 'Hombrera de espuma en color blanco para confección femenina. Se vende por par.',
  descripcion_larga = 'Hombrera de espuma en color blanco para confección femenina. Se vende por par.',
  usos              = '["Prendas femeninas"]'::jsonb,
  detalles          = '[{"etiqueta":"Material","valor":"Espuma"},{"etiqueta":"Color","valor":"Blanco"}]'::jsonb,
  cuidados          = null
where alegra_id = '16';  -- Hombrera espuma blanca

update productos_meta set
  descripcion       = 'Hombrera de espuma en color negro para confección femenina. Se vende por par.',
  descripcion_larga = 'Hombrera de espuma en color negro para confección femenina. Se vende por par.',
  usos              = '["Prendas femeninas"]'::jsonb,
  detalles          = '[{"etiqueta":"Material","valor":"Espuma"},{"etiqueta":"Color","valor":"Negro"}]'::jsonb,
  cuidados          = null
where alegra_id = '3';  -- Hombrera espuma negra

update productos_meta set
  descripcion       = 'Botón grande para prendas masculinas. Viene en cinco colores sobrios: negro, azul oscuro, gris medio, gris claro y café oscuro.',
  descripcion_larga = 'Botón grande para prendas masculinas, en los colores más usados en sastrería: negro, azul oscuro, gris medio, gris claro y café oscuro. Hace juego con el botón pequeño, que viene en los mismos colores y se usa en la manga.',
  usos              = '["Sacos de caballero","Prendas masculinas"]'::jsonb,
  detalles          = '[{"etiqueta":"Tamaño","valor":"Grande"},{"etiqueta":"Colores disponibles","valor":"Negro, Azul oscuro, Gris medio, Gris claro, Café oscuro"}]'::jsonb,
  cuidados          = null
where alegra_id = '50';  -- Botón grande

update productos_meta set
  descripcion       = 'Botón pequeño para la manga del saco de caballero y otras prendas masculinas. Viene en negro, azul oscuro, gris medio, gris claro y café oscuro.',
  descripcion_larga = 'Botón pequeño para la manga del saco de caballero, en los colores más usados en sastrería: negro, azul oscuro, gris medio, gris claro y café oscuro. Hace juego con el botón grande, que viene en los mismos colores.',
  usos              = '["Mangas de saco de caballero","Prendas masculinas"]'::jsonb,
  detalles          = '[{"etiqueta":"Tamaño","valor":"Pequeño"},{"etiqueta":"Colores disponibles","valor":"Negro, Azul oscuro, Gris medio, Gris claro, Café oscuro"}]'::jsonb,
  cuidados          = null
where alegra_id = '51';  -- Botón pequeño

update productos_meta set
  descripcion       = 'Cremallera cobre de 20 cm para pantalón de dama y caballero. Viene en colores surtidos y se vende por unidad.',
  descripcion_larga = 'Cremallera cobre de 20 cm para pantalón de dama y caballero. Viene en colores surtidos y se vende por unidad.',
  usos              = '["Pantalones de dama","Pantalones de caballero"]'::jsonb,
  detalles          = '[{"etiqueta":"Largo","valor":"20 cm"},{"etiqueta":"Colores disponibles","valor":"Surtidos"}]'::jsonb,
  cuidados          = null
where alegra_id = '27';  -- Cremallera cobre 20 cm

update productos_meta set
  descripcion       = 'Cremallera plástica de 20 cm para pantalón de dama y caballero. Viene en colores surtidos y se vende por unidad.',
  descripcion_larga = 'Cremallera plástica de 20 cm para pantalón de dama y caballero. Viene en colores surtidos y se vende por unidad.',
  usos              = '["Pantalones de dama","Pantalones de caballero"]'::jsonb,
  detalles          = '[{"etiqueta":"Material","valor":"Plástica"},{"etiqueta":"Colores disponibles","valor":"Surtidos"},{"etiqueta":"Largo","valor":"20 cm"}]'::jsonb,
  cuidados          = null
where alegra_id = '45';  -- Cremallera plástica

update productos_meta set
  descripcion       = 'Caja de 9 tizas de sastre blancas para marcar telas. Dejan un trazo visible que se retira con cepillado o lavado.',
  descripcion_larga = 'La tiza de sastre sirve para pasar el molde a la tela y marcar pinzas, dobladillos, ojales y ajustes de prueba. Deja un trazo visible que se retira con cepillado o con el lavado. La blanca es la que más se nota sobre telas oscuras y de color. Esta caja trae 9 unidades.',
  usos              = '["Marcar telas","Trazo de moldes","Marcas de ajuste en pruebas","Telas oscuras"]'::jsonb,
  detalles          = '[{"etiqueta":"Contenido","valor":"9 unidades"},{"etiqueta":"Color","valor":"Blanco"}]'::jsonb,
  cuidados          = 'Guardar en su caja y en lugar seco. Probar primero en un retazo para confirmar que el trazo sale bien de esa tela.'
where alegra_id = '48';  -- Caja tiza blanca 9 unidades

update productos_meta set
  descripcion       = 'Caja de 10 tizas de sastre blancas para marcar telas. Dejan un trazo visible que se retira con cepillado o lavado.',
  descripcion_larga = 'La tiza de sastre sirve para pasar el molde a la tela y marcar pinzas, dobladillos, ojales y ajustes de prueba. Deja un trazo visible que se retira con cepillado o con el lavado. La blanca es la que más se nota sobre telas oscuras y de color. Esta caja trae 10 unidades.',
  usos              = '["Marcar telas","Trazo de moldes","Marcas de ajuste en pruebas","Telas oscuras"]'::jsonb,
  detalles          = '[{"etiqueta":"Contenido","valor":"10 unidades"},{"etiqueta":"Color","valor":"Blanco"}]'::jsonb,
  cuidados          = 'Guardar en su caja y en lugar seco. Probar primero en un retazo para confirmar que el trazo sale bien de esa tela.'
where alegra_id = '19';  -- Caja tiza blanca 10 unidades

update productos_meta set
  descripcion       = 'Caja de 50 tizas de sastre blancas para marcar telas, pensada para talleres y uso frecuente. Dejan un trazo visible que se retira con cepillado o lavado.',
  descripcion_larga = 'La tiza de sastre sirve para pasar el molde a la tela y marcar pinzas, dobladillos, ojales y ajustes de prueba. Deja un trazo visible que se retira con cepillado o con el lavado. La blanca es la que más se nota sobre telas oscuras y de color. Esta caja trae 50 unidades, la presentación más grande, para talleres y uso frecuente.',
  usos              = '["Marcar telas","Trazo de moldes","Marcas de ajuste en pruebas","Telas oscuras","Talleres de confección"]'::jsonb,
  detalles          = '[{"etiqueta":"Contenido","valor":"50 unidades"},{"etiqueta":"Color","valor":"Blanco"}]'::jsonb,
  cuidados          = 'Guardar en su caja y en lugar seco. Probar primero en un retazo para confirmar que el trazo sale bien de esa tela.'
where alegra_id = '22';  -- Caja tiza blanca 50 unidades

update productos_meta set
  descripcion       = 'Caja de 9 tizas de sastre en colores surtidos para marcar telas blancas. Dejan un trazo visible que se retira con cepillado o lavado.',
  descripcion_larga = 'La tiza de sastre sirve para pasar el molde a la tela y marcar pinzas, dobladillos, ojales y ajustes de prueba. Deja un trazo visible que se retira con cepillado o con el lavado. La de color se usa en telas blancas, donde la tiza blanca no se ve. Esta caja trae 9 unidades en colores surtidos: rosado, amarillo, azul y verde.',
  usos              = '["Marcar telas blancas","Trazo de moldes","Marcas de ajuste en pruebas"]'::jsonb,
  detalles          = '[{"etiqueta":"Contenido","valor":"9 unidades"},{"etiqueta":"Colores","valor":"Surtidos: rosado, amarillo, azul y verde"}]'::jsonb,
  cuidados          = 'Guardar en su caja y en lugar seco. Probar primero en un retazo para confirmar que el trazo sale bien de esa tela.'
where alegra_id = '47';  -- Caja tiza color 9 unidades

update productos_meta set
  descripcion       = 'Caja de 10 tizas de sastre en colores surtidos para marcar telas blancas. Dejan un trazo visible que se retira con cepillado o lavado.',
  descripcion_larga = 'La tiza de sastre sirve para pasar el molde a la tela y marcar pinzas, dobladillos, ojales y ajustes de prueba. Deja un trazo visible que se retira con cepillado o con el lavado. La de color se usa en telas blancas, donde la tiza blanca no se ve. Esta caja trae 10 unidades en colores surtidos: rosado, amarillo, azul y verde.',
  usos              = '["Marcar telas blancas","Trazo de moldes","Marcas de ajuste en pruebas"]'::jsonb,
  detalles          = '[{"etiqueta":"Contenido","valor":"10 unidades"},{"etiqueta":"Colores","valor":"Surtidos: rosado, amarillo, azul y verde"}]'::jsonb,
  cuidados          = 'Guardar en su caja y en lugar seco. Probar primero en un retazo para confirmar que el trazo sale bien de esa tela.'
where alegra_id = '38';  -- Caja tiza color 10 unidades

update productos_meta set
  descripcion       = 'Caja de 50 tizas de sastre en colores surtidos para marcar telas blancas, pensada para talleres y uso frecuente. Dejan un trazo visible que se retira con cepillado o lavado.',
  descripcion_larga = 'La tiza de sastre sirve para pasar el molde a la tela y marcar pinzas, dobladillos, ojales y ajustes de prueba. Deja un trazo visible que se retira con cepillado o con el lavado. La de color se usa en telas blancas, donde la tiza blanca no se ve. Esta caja trae 50 unidades en colores surtidos (rosado, amarillo, azul y verde) y es la presentación más grande, para talleres y uso frecuente.',
  usos              = '["Marcar telas blancas","Trazo de moldes","Marcas de ajuste en pruebas","Talleres de confección"]'::jsonb,
  detalles          = '[{"etiqueta":"Contenido","valor":"50 unidades"},{"etiqueta":"Colores","valor":"Surtidos: rosado, amarillo, azul y verde"}]'::jsonb,
  cuidados          = 'Guardar en su caja y en lugar seco. Probar primero en un retazo para confirmar que el trazo sale bien de esa tela.'
where alegra_id = '21';  -- Caja tiza color 50 unidades

update productos_meta set
  descripcion       = 'Portavestido negro para guardar prendas masculinas y femeninas. Protege la prenda del polvo mientras está colgada o al transportarla.',
  descripcion_larga = 'Portavestido negro para guardar prendas masculinas y femeninas. Protege la prenda del polvo mientras está colgada o al transportarla.',
  usos              = '["Guardar vestidos y sacos","Transportar prendas","Entrega de prendas terminadas"]'::jsonb,
  detalles          = '[{"etiqueta":"Color","valor":"Negro"}]'::jsonb,
  cuidados          = null
where alegra_id = '10';  -- Portavestido

update productos_meta set
  descripcion       = 'Portavestido negro con ventana para guardar prendas masculinas y femeninas. La ventana deja ver qué prenda hay adentro sin abrirlo.',
  descripcion_larga = 'Portavestido negro para guardar y transportar prendas masculinas y femeninas, protegidas del polvo. Se diferencia del portavestido sencillo por la ventana, que permite identificar la prenda sin abrir la funda: útil cuando hay varias colgadas juntas.',
  usos              = '["Guardar vestidos y sacos","Transportar prendas","Entrega de prendas terminadas"]'::jsonb,
  detalles          = '[{"etiqueta":"Color","valor":"Negro"},{"etiqueta":"Ventana","valor":"Sí"}]'::jsonb,
  cuidados          = null
where alegra_id = '49';  -- Portavestido con ventana

commit;

-- Para revisar: deben salir 41 filas con descripción.
--   select alegra_id, nombre_cache, left(descripcion, 60), jsonb_array_length(usos) as usos
--   from productos_meta where descripcion is not null order by nombre_cache;
