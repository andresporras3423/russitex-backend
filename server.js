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

app.use(express.json())


// Rutas
app.use('/chat',        require('./routes/chat'));     // 🤖 Bot Rusti
app.use('/api/auth',    require('./routes/auth'));     // 🔐 Autenticación
app.use('/api/productos', require('./routes/productos')); // 📦 Catálogo (Alegra + Supabase)
app.use('/api/tienda',  require('./routes/tienda'));   // 🏪 Info del local (horarios, contacto, envíos)
app.use('/api/pagos',   require('./routes/pagos'));    // 💳 Wompi
app.use('/api/webhook', require('./routes/webhook')); // 🔔 Wompi webhooks
app.use("/api/mercadolibre", require('./routes/publicacion'));
app.use('/api/mercadolibre', require('./routes/mercadolibre_token'));


app.listen(3001, () => console.log('Backend en http://localhost:3001'))
