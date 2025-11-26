const mongoose = require('mongoose');

const connectDB = async () => {
    try {
        const conn = await mongoose.connect(process.env.MONGODB_URI, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
        });

        console.log(`✅ MongoDB Conectado: ${conn.connection.host}`);
        console.log(`🏢 Database: ${conn.connection.name}`);
    } catch (error) {
        console.error('❌ Erro MongoDB:', error.message);
        process.exit(1);
    }
};

module.exports = connectDB;
