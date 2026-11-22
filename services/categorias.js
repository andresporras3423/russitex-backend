// ============================================================
//  services/categorias.js
//
//  Las 8 categorías del catálogo, en el orden del menú. Salen de las
//  fichas de producto de Paula (2026-11-21). La base de datos solo
//  acepta estas claves (ver database/productos_categorias_variantes.sql).
//
//  Si se agrega una, hay que agregarla también en el frontend:
//  src/lib/categorias.js.
// ============================================================
const CATEGORIAS = {
  entretelas: 'Entretelas',
  forros:     'Forros',
  refuerzos:  'Refuerzos para saco y pantalón',
  telas:      'Telas para bolsillo y lonas',
  hombreras:  'Hombreras',
  tizas:      'Tizas',
  botones:    'Botones y cremalleras',
  otros:      'Otros materiales',
}

module.exports = { CATEGORIAS, CLAVES_CATEGORIA: Object.keys(CATEGORIAS) }
