const express = require('express')
const cors = require('cors')
const dotenv = require('dotenv')
const OpenAI = require('openai')

dotenv.config()
const app = express()
app.use(cors())
app.use(express.json())


// Rutas
app.use('/chat',        require('./routes/chat'));     // 🤖 Bot Rusti
app.use('/api/auth',    require('./routes/auth'));     // 🔐 Autenticación
app.use('/api/pagos',   require('./routes/pagos'));    // 💳 Wompi
app.use('/api/webhook', require('./routes/webhook')); // 🔔 Wompi webhooks
app.use("/api/mercadolibre", require('./routes/publicacion'));
 

app.listen(3001, () => console.log('Backend en http://localhost:3001'))
