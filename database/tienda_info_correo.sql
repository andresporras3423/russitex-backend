-- ============================================================
--  tienda_info — agrega el correo del almacén
--
--  Lo pide la página de contacto (/contacto). Mientras no exista
--  esta fila, la página muestra el valor por defecto del código.
--
--  El valor es contacto@russitex.com: un ALIAS creado en Zoho el
--  2026-08-23, con nombre visible "Russitex", que entra al buzón de
--  oscarrussi@russitex.com. Se publica el alias y no la cuenta
--  personal, para que si mañana atiende otra persona se redirija el
--  alias sin tocar la web.
--
--  Ejecutar en: Supabase -> SQL Editor -> New query -> Run
-- ============================================================

insert into tienda_info (clave, etiqueta, valor, grupo, orden, visible_bot, visible_web)
values (
  'correo',
  'Correo electrónico',
  'contacto@russitex.com',
  'contacto',
  3,
  true,   -- el bot puede darlo si se lo piden
  true    -- se muestra en la web
)
on conflict (clave) do update
  set valor = excluded.valor,
      etiqueta = excluded.etiqueta,
      visible_bot = excluded.visible_bot,
      visible_web = excluded.visible_web;


-- ------------------------------------------------------------
--  Revisar cómo quedó el grupo de contacto:
--
--    select clave, valor, visible_web
--    from tienda_info
--    where grupo = 'contacto'
--    order by orden;
-- ------------------------------------------------------------
