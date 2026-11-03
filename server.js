const express = require('express')
const cors = require('cors')
const dotenv = require('dotenv')
const OpenAI = require('openai')

dotenv.config()
const app = express()
app.use(cors())

// OJO con el orden: esta ruta va ANTES del express.json() general, porque
// el primer parser que corre es el que manda. Si quedara después, el
// límite de 100 kb del general rechazaría la imagen con un 413 y este
// parser de 15 MB nunca llegaría a actuar.
// 10 MB de imagen -> ~13.4 MB en base64, más el resto del formulario.
app.use('/api/asesoria', express.json({ limit: '15mb' }), require('./routes/asesoria')); // ✉️ Formulario de asesoría
// Mismo motivo: el panel de administrador sube imágenes (máx. 6 MB -> ~8 MB en base64).
app.use('/api/admin', express.json({ limit: '10mb' }), require('./routes/admin')); // 🛠️ Panel de administrador

// Se guarda también el cuerpo tal cual llegó: la firma de los avisos de
// Envia se calcula sobre esos bytes exactos, no sobre el JSON re-armado.
app.use(express.json({ verify: (req, res, buf) => { req.cuerpoCrudo = buf } }))


// Rutas
app.use('/chat',        require('./routes/chat'));     // 🤖 Bot Rusti
app.use('/api/auth',    require('./routes/auth'));     // 🔐 Autenticación
app.use('/api/productos', require('./routes/productos')); // 📦 Catálogo (Alegra + Supabase)
app.use('/api/tienda',  require('./routes/tienda'));   // 🏪 Info del local (horarios, contacto, envíos)
app.use('/api/avisos',  require('./routes/avisos'));   // 🔔 "Avísame cuando esté disponible"
app.use('/api/pagos',   require('./routes/pagos'));    // 💳 Wompi
app.use('/api/pedidos', require('./routes/pedidos'));  // 🧾 Mis pedidos (Mi cuenta)
app.use('/api/cuenta',  require('./routes/cuenta'));   // 👤 Datos, contraseña y direcciones (Mi cuenta)
app.use('/api/webhook', require('./routes/webhook')); // 🔔 Wompi webhooks
app.use('/api/envios',  require('./routes/envios'));   // 🚚 Cotización de envío (MiPaquete)
// 🛒 Mercado Libre: solo administradores (publican en la cuenta de la tienda y guardan sus tokens).
const mlAdmin = [require('./middleware/verificarAuth'), require('./middleware/soloAdmin')]
app.use('/api/mercadolibre', ...mlAdmin, require('./routes/publicacion'));
app.use('/api/mercadolibre', ...mlAdmin, require('./routes/mercadolibre_token'));
app.use('/api/webhook/mercadolibre', require('./routes/webhookMercadoLibre')); // 🛒 Ventas de Mercado Libre -> factura en Alegra


// El host de producción (Render, etc.) asigna el puerto por la variable PORT.
// En local, si no está, usa 3001.
const PORT = process.env.PORT || 3001
app.listen(PORT, () => console.log(`Backend escuchando en el puerto ${PORT}`))

// Red de seguridad de los avisos de reingreso. Apagada salvo que
// AVISOS_CRON_MINUTOS esté en el .env.
require('./services/cronAvisos').iniciarCronAvisos()

// Red de seguridad de las facturas de Mercado Libre. Apagada salvo que
// ML_CRON_MINUTOS esté en el .env.
require('./services/ventasMercadoLibre').iniciarCronVentas()
