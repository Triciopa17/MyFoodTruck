/**
 * ARCHIVO: rutasventas.js
 * FUNCIÓN: Terminal de Ventas (Backend)
 * DESCRIPCIÓN: Este archivo procesa todo lo que ocurre cuando se hace una venta:
 * descuenta el stock, avisa si queda poco producto y guarda el historial.
 */

const { getDB } = require('./db');
const { requireAuth } = require('./seguridad'); // Seguridad de acceso

async function sellerRoutes(req, res, pathname, method) {
    // Permite el acceso tanto a administradores como a vendedores
    if (!requireAuth(req, res, ['admin', 'vendedor'])) return;

    const sendJSON = (statusCode, data) => {
        res.writeHead(statusCode, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(data));
    };

    const db = getDB();
    const pathParts = pathname.split('/').filter(p => p);
    const resource = pathParts[2];

    try {
        // --- RUTA: OBTENER DATOS DEL POS ---
        // Envía categorías y productos para que el vendedor pueda armar el carrito
        if (resource === 'pos-data' && method === 'GET') {
            const categories = await db.collection('categories').find().toArray();
            const products = await db.collection('products').find().toArray();

            // Mapeamos los datos para que cada categoría contenga sus propios productos
            const data = categories.map(cat => ({
                ...cat,
                products: products.filter(p => p.categoryId.toString() === cat._id.toString())
            }));

            return sendJSON(200, data);
        }

        // --- RUTA: REGISTRAR UNA VENTA ---
        if (resource === 'sales' && method === 'POST') {
            const { items, total, paymentMethod } = req.body;
            const alerts = [];

            // Procesamos cada producto vendido uno por uno
            for (const item of items) {
                const product = await db.collection('products').findOne({ _id: new (require('mongodb').ObjectId)(item._id) });
                if (product) {
                    // DESCUENTO DE STOCK AUTOMÁTICO
                    const newStock = (product.stock || 0) - item.quantity;
                    await db.collection('products').updateOne(
                        { _id: product._id },
                        { $set: { stock: Math.max(0, newStock) } } // No permitimos stock negativo
                    );

                    // VERIFICACIÓN DE ALERTA DE STOCK CRÍTICO
                    if (newStock <= (product.minStock || 0)) {
                        alerts.push(`¡Alerta! ${product.name} ha alcanzado el stock mínimo (${Math.max(0, newStock)} restantes).`);
                    }
                }
            }

            // CREACIÓN DEL REGISTRO DE VENTA (HISTORIAL)
            const sale = {
                items,
                total: parseFloat(total),
                paymentMethod,
                date: new Date(),
                sellerId: req.user.id, // ID del usuario que hizo la venta (desde el Token)
                sellerName: req.user.name // Nombre del usuario
            };

            // Insertamos la venta en la colección 'sales'
            const result = await db.collection('sales').insertOne(sale);

            // Devolvemos éxito y las alertas de stock si las hubiera
            return sendJSON(201, { result, alerts });
        }

        sendJSON(404, { message: 'Ruta de ventas no encontrada' });
    } catch (error) {
        console.error('Error en rutas de venta:', error);
        sendJSON(500, { message: 'Error interno del servidor de ventas' });
    }
}

module.exports = sellerRoutes;
