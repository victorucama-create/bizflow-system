require('dotenv').config();
const app = require('./src/app');
const connectDB = require('./src/config/database'); // <-- CORRETO

const PORT = process.env.PORT || 5000;

// Conectar ao banco de dados
connectDB();

app.listen(PORT, () => {
    console.log(`🚀 Servidor BizFlow rodando na porta ${PORT}`);
});
