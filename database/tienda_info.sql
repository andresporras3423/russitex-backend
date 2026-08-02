-- ============================================================
--  tienda_info
--
--  Fuente única de la información del local: horarios, contacto,
--  envíos, pagos y políticas.
--
--  La consumen:
--    - el prompt del bot Rusti
--    - (a futuro) el footer y el topbar de la web
--
--  Los valores sembrados abajo salieron de lo que la web ya
--  mostraba, que es lo que el dueño definió como verdadero.
--
--  Ejecutar en: Supabase -> SQL Editor -> New query -> Run
-- ============================================================

create table if not exists tienda_info (
  clave        text primary key,

  -- Nombre legible. Se muestra en el panel de Supabase y es
  -- también el rótulo que ve el bot en su prompt.
  etiqueta     text not null,

  valor        text not null,

  -- Agrupa las filas para armar el prompt por secciones.
  grupo        text not null default 'general'
                 check (grupo in ('identidad','horarios','contacto','envios','pagos','politicas','general')),

  orden        int  not null default 0,

  -- Permite excluir un dato de uno de los dos consumidores.
  visible_bot  boolean not null default true,
  visible_web  boolean not null default true,

  actualizado  timestamptz default now()
);

create index if not exists tienda_info_grupo_idx on tienda_info (grupo, orden);

-- ------------------------------------------------------------
--  Permisos: lectura pública, escritura solo desde el panel
-- ------------------------------------------------------------
alter table tienda_info enable row level security;

drop policy if exists "tienda_info lectura publica" on tienda_info;
create policy "tienda_info lectura publica"
  on tienda_info for select
  using (true);


-- ============================================================
--  Datos (tomados de lo que muestra la web)
-- ============================================================
insert into tienda_info (clave, etiqueta, valor, grupo, orden, visible_bot, visible_web) values

  -- Identidad
  ('nombre',            'Nombre del almacén',        'Russitex', 'identidad', 1, true, true),
  ('lema',              'Lema',                      '39 años siendo tu mano amiga en confección.', 'identidad', 2, true, true),
  ('descripcion_corta', 'Descripción',               'Materiales para confección en Bogotá, Colombia.', 'identidad', 3, true, true),

  -- Horarios
  ('horario_semana',    'Horario lunes a viernes',   '10:00 a.m. – 6:00 p.m.', 'horarios', 1, true, true),
  ('horario_sabado',    'Horario sábados',           '10:00 a.m. – 5:00 p.m.', 'horarios', 2, true, true),
  ('horario_domingo',   'Domingos y festivos',       'Cerrado', 'horarios', 3, true, true),
  ('horario_bot',       'Disponibilidad del asistente virtual', 'Disponible 24/7', 'horarios', 4, true, true),

  -- Contacto
  ('whatsapp',          'WhatsApp',                  '+57 313 890 9118', 'contacto', 1, true, true),
  ('whatsapp_link',     'Enlace de WhatsApp',        'https://wa.me/573138909118', 'contacto', 2, true, true),
  ('ciudad',            'Ciudad',                    'Bogotá, Colombia', 'contacto', 3, true, true),
  -- La dirección exacta no aparece en la web. Queda oculta para el bot
  -- hasta que se complete, para que no responda un dato inventado.
  ('direccion',         'Dirección de la tienda',    'PENDIENTE POR DEFINIR', 'contacto', 4, false, false),

  -- Envíos
  ('envio_gratis_desde','Envío gratis desde',        'Compras superiores a $350.000 COP', 'envios', 1, true, true),
  ('envio_mismo_dia',   'Entrega el mismo día',      'En Bogotá, para pedidos hechos antes de las 12:00 p.m.', 'envios', 2, true, true),
  ('cobertura',         'Cobertura de envíos',       'Bogotá', 'envios', 3, true, true),
  ('retiro_en_tienda',  'Retiro en tienda',          'Podés reservar online y pasar a recoger cuando quieras.', 'envios', 4, true, true),

  -- Pagos
  ('formas_pago',       'Formas de pago',            'PSE, Nequi, Daviplata, efectivo, tarjeta de crédito o débito.', 'pagos', 1, true, true),

  -- Políticas / atención
  ('asesoria',          'Asesoría',                  'Gratuita, tanto por el asistente virtual como con un asesor humano por WhatsApp o en la tienda.', 'politicas', 1, true, true),
  ('atencion_presencial','Atención presencial',      'Podés visitar la tienda física para tocar y comparar los materiales antes de comprar.', 'politicas', 2, true, true)

on conflict (clave) do update
  set etiqueta    = excluded.etiqueta,
      valor       = excluded.valor,
      grupo       = excluded.grupo,
      orden       = excluded.orden,
      actualizado = now();


-- ============================================================
--  Comprobación (opcional)
-- ============================================================
-- select grupo, clave, valor from tienda_info order by grupo, orden;
