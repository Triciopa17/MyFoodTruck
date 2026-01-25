/**
 * ARCHIVO: db.js
 * FUNCIÓN: Conexión con MongoDB Atlas
 * DESCRIPCIÓN: Este archivo se encarga de conectar mi aplicación con la nube 
 * de MongoDB usando la URI que tengo en el archivo secreto .env.
 */

const { MongoClient } = require('mongodb'); // Importa el cliente oficial de MongoDB
require('dotenv').config(); // Carga la URI desde el archivo .env

// La URI es la dirección de conexión a la base de datos en la nube
const uri = process.env.MONGODB_URI;
const client = new MongoClient(uri);

let db; // Variable para almacenar la conexión una vez establecida

/**
Función para establecer la conexión inicial.
 */
async function connectDB() {
    if (db) return db; // Si ya estamos conectados, no hacemos nada más
    try {
        await client.connect(); // Intenta la conexión física
        console.log(' Conexión exitosa a MongoDB');
        db = client.db(); // Selecciona la base de datos (por defecto la de la URI)
        return db;
    } catch (error) {
        console.error(' Error de conexión a MongoDB:', error);
        process.exit(1); // Si no hay base de datos, el sistema no puede funcionar
    }
}

/**
Función para obtener la instancia de la base de datos desde otros archivos.
 */
function getDB() {
    if (!db) {
        throw new Error('La base de datos no ha sido inicializada. Llama a connectDB primero.');
    }
    return db;
}

// Exportamos las funciones para usarlas en el servidor y las rutas
module.exports = { connectDB, getDB };
