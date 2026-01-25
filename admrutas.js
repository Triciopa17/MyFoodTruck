/**
 * ARCHIVO: admrutas.js
 * FUNCIÓN: Centro de Mandos (Administración)
 * DESCRIPCIÓN: En este archivo creé toda la lógica para que el administrador 
 * pueda gestionar usuarios, productos y categorías, además de ver los reportes.
 */

const { getDB } = require('./db');
const { ObjectId } = require('mongodb'); // Para convertir IDs de texto a objetos de Mongo
const bcrypt = require('bcryptjs'); // Para cifrar claves de nuevos usuarios
const { requireAuth } = require('./seguridad'); // Middleware de seguridad

async function adminRoutes(req, res, pathname, method) {
    // SEGURIDAD: Verifica que el usuario esté logueado y sea ADMIN
    // Si no lo es, requireAuth envía error 403 y devuelve false.
    if (!requireAuth(req, res, ['admin'])) return;

    // Utilidad para responder rápido en formato JSON
    const sendJSON = (statusCode, data) => {
        res.writeHead(statusCode, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(data));
    };

    const db = getDB();
    const pathParts = pathname.split('/').filter(p => p);
    const resource = pathParts[2]; // Parte de la URL: /api/admin/[resource]/[id]
    const id = pathParts[3];

    try {
        //SECCIÓN: USUARIOS
        if (resource === 'users') {
            // Obtener lista de todos los usuarios (sin el password)
            if (method === 'GET' && !id) {
                const users = await db.collection('users').find({}, { projection: { password: 0 } }).toArray();
                return sendJSON(200, users);
            }
            // Crear un nuevo usuario (Vendedor o Administrador)
            if (method === 'POST') {
                const { username, password, role, name, email } = req.body;
                const existing = await db.collection('users').findOne({ username });
                if (existing) return sendJSON(400, { message: 'El usuario ya existe.' });
                // Ciframos la clave antes de guardarla
                const hashedPassword = await bcrypt.hash(password, 10);
                const result = await db.collection('users').insertOne({
                    username,
                    password: hashedPassword,
                    role,
                    name,
                    email: email || ''
                });
                return sendJSON(201, result);
            }
            // Actualizar datos de un usuario existente
            if (method === 'PUT' && id) {
                const { username, password, role, name, email } = req.body;
                const updateData = { username, role, name, email };
                // Si se envía una nueva clave, se cifra, si no, se mantiene la actual
                if (password) updateData.password = await bcrypt.hash(password, 10);
                await db.collection('users').updateOne({ _id: new ObjectId(id) }, { $set: updateData });
                return sendJSON(200, { message: 'Usuario actualizado.' });
            }
            // Eliminar un usuario
            if (method === 'DELETE' && id) {
                await db.collection('users').deleteOne({ _id: new ObjectId(id) });
                return sendJSON(200, { message: 'Usuario eliminado.' });
            }
        }

        //  SECCIÓN: CATEGORÍAS 
        if (resource === 'categories') {
            if (method === 'GET' && !id) {
                const categories = await db.collection('categories').find().toArray();
                return sendJSON(200, categories);
            }
            if (method === 'POST') {
                const { name } = req.body;
                const result = await db.collection('categories').insertOne({ name });
                return sendJSON(201, result);
            }
            if (method === 'PUT' && id) {
                const { name } = req.body;
                await db.collection('categories').updateOne({ _id: new ObjectId(id) }, { $set: { name } });
                return sendJSON(200, { message: 'Categoría actualizada.' });
            }
            if (method === 'DELETE' && id) {
                await db.collection('categories').deleteOne({ _id: new ObjectId(id) });
                return sendJSON(200, { message: 'Categoría eliminada.' });
            }
        }

        //SECCIÓN: PRODUCTOS 
        if (resource === 'products') {
            if (method === 'GET' && !id) {
                const products = await db.collection('products').find().toArray();
                return sendJSON(200, products);
            }
            if (method === 'POST') {
                const { name, price, categoryId, categoryName, stock, minStock, description } = req.body;
                // Guardamos tipos de datos correctos (float/int) para cálculos futuros
                const result = await db.collection('products').insertOne({
                    name,
                    price: parseFloat(price),
                    categoryId: new ObjectId(categoryId),
                    categoryName,
                    stock: parseInt(stock) || 0,
                    minStock: parseInt(minStock) || 0,
                    description: description || ''
                });
                return sendJSON(201, result);
            }
            if (method === 'PUT' && id) {
                const { name, price, categoryId, categoryName, stock, minStock, description } = req.body;
                await db.collection('products').updateOne({ _id: new ObjectId(id) }, {
                    $set: {
                        name,
                        price: parseFloat(price),
                        categoryId: new ObjectId(categoryId),
                        categoryName,
                        stock: parseInt(stock) || 0,
                        minStock: parseInt(minStock) || 0,
                        description: description || ''
                    }
                });
                return sendJSON(200, { message: 'Producto actualizado.' });
            }
            if (method === 'DELETE' && id) {
                await db.collection('products').deleteOne({ _id: new ObjectId(id) });
                return sendJSON(200, { message: 'Producto eliminado.' });
            }
        }

        // SECCIÓN: REPORTE DE VENTAS
        if (resource === 'sales-report' && method === 'GET') {
            const { start, end } = req.query;
            const query = {};
            // Si hay filtro de fechas, creamos el rango de búsqueda para MongoDB
            if (start && end) {
                const startDate = new Date(start + 'T00:00:00');
                const endDate = new Date(end + 'T23:59:59.999');
                query.date = {
                    $gte: startDate,
                    $lte: endDate
                };
            }
            // Buscamos las ventas y las ordenamos por fecha descendente (la más nueva primero)
            const sales = await db.collection('sales').find(query).sort({ date: -1 }).toArray();
            return sendJSON(200, sales);
        }

        sendJSON(404, { message: 'Sub-ruta administrativa no encontrada' });
    } catch (error) {
        console.error('Error en rutas admin:', error);
        sendJSON(500, { message: 'Error interno del servidor admin' });
    }
}

module.exports = adminRoutes;
