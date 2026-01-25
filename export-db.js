/**
 * ARCHIVO: export-db.js
 * DESCRIPCIÓN: Este script me sirve para sacar una copia de seguridad de toda la base de datos
 * en archivos JSON.
 */
const fs = require('fs');
const path = require('path');
const { connectDB, getDB } = require('./db');
require('dotenv').config();

async function exportData() {
    try {
        await connectDB();
        const db = getDB();

        // Crear carpeta de exportación si no existe
        const exportDir = path.join(__dirname, 'base_de_datos_respaldo');
        if (!fs.existsSync(exportDir)) {
            fs.mkdirSync(exportDir);
        }

        const collections = ['users', 'products', 'categories', 'sales'];

        console.log('📦 Iniciando exportación de base de datos...');

        for (const colName of collections) {
            const data = await db.collection(colName).find({}).toArray();
            const filePath = path.join(exportDir, `${colName}.json`);

            fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
            console.log(`✅ ${colName}: ${data.length} documentos exportados a ${colName}.json`);
        }

        console.log('\n✨ Exportación completada. Sube la carpeta "base_de_datos_respaldo" a GitHub.');
        process.exit(0);

    } catch (error) {
        console.error('❌ Error exportando:', error);
        process.exit(1);
    }
}

exportData();
