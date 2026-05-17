const express = require('express')
const cors = require('cors')
const dotenv = require('dotenv')
const OpenAI = require('openai')

dotenv.config()
const app = express()
app.use(cors())
app.use(express.json())


app.use('/api/chat',        require('./routes/chat'))     // 🤖 El bot de Rusti
app.use('/api/pagos',   require('./routes/pagos'))    // 💳 Wompi
app.use('/api/webhook', require('./routes/webhook'))  // 🔔 Wompi webhooks


app.listen(3001, () => console.log('Backend en http://localhost:3001'))
