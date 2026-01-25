/**
 * ARCHIVO: init-db.js
 * DESCRIPCIÓN: Este script lo uso para la primera vez que quiero llenar la base de datos. 
 * Crea los usuarios base (Admin y Mi Usuario) para poder entrar al sistema de inmediato.
 */
const { connectDB, getDB } = require('./db');
const bcrypt = require('bcryptjs');

async function init() {
    await connectDB();
    const db = getDB();

    const users = db.collection('users');
    const categories = db.collection('categories');
    const products = db.collection('products');
    const sales = db.collection('sales');

    const adminExists = await users.findOne({ username: 'admin' });
    if (!adminExists) {
        const hashedPassword = await bcrypt.hash('admin123', 10);
        await users.insertOne({
            username: 'admin',
            password: hashedPassword,
            role: 'admin',
            name: 'Administrador'
        });
        console.log('Admin user created: admin / admin123');
    } else {
        console.log('Admin user (admin) already exists');
    }

    const sellerExists = await users.findOne({ username: 'Patricio' });
    if (!sellerExists) {
        const hashedPassword = await bcrypt.hash('123456', 10);
        await users.insertOne({
            username: 'Patricio',
            password: hashedPassword,
            role: 'vendedor',
            name: 'Vendedor Patricio'
        });
        console.log('Seller user created: Patricio / 123456');
    }

    await sales.createIndex({ date: 1 });

    console.log('Database initialized successfully');
    process.exit(0);
}

init().catch(err => {
    console.error(err);
    process.exit(1);
});
