/**
 * ARCHIVO: seguridad.js
 * FUNCIÓN: Escudo del Sistema (JWT)
 * DESCRIPCIÓN: Este archivo es el encargado de verificar que nadie entre sin autorizacion.
 * Revisa que cada petición traiga su Token válido y que el usuario tenga el permiso (rol) necesario.
 */

const jwt = require('jsonwebtoken');

/**
 * Extrae el Token de la cabecera 'Authorization' y verifica si es válido.
 * @param {Object} req - Objeto de petición HTTP.
 * @returns {Object} { valid: boolean, user?: Object, error?: string }
 */
function verifyToken(req) {
    const authHeader = req.headers.authorization;
    // El token viene usualmente como "Bearer [TOKEN]"
    const token = authHeader?.split(' ')[1];

    if (!token) {
        return { valid: false, error: 'No se proporcionó un token de acceso.' };
    }

    try {
        // Compara el token con nuestra LLAVE SECRETA definida en el archivo .env
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        return { valid: true, user: decoded };
    } catch (error) {
        return { valid: false, error: 'Token inválido o expirado.' };
    }
}

/**
 * Middleware para obligar a que una petición esté autenticada y tenga el Rol necesario.
 * @param {Object} req - Petición.
 * @param {Object} res - Respuesta.
 * @param {Array} roles - Lista de roles permitidos (ej: ['admin']).
 * @returns {boolean} True si permite el paso, False si bloquea con error.
 */
function requireAuth(req, res, roles = []) {
    const auth = verifyToken(req);

    if (!auth.valid) {
        res.writeHead(401, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ message: auth.error }));
        return false;
    }

    // RBAC: Control de Acceso Basado en Roles
    // Si la ruta pide 'admin' y el usuario es 'vendedor', le negamos el paso (Forbidden 403).
    if (roles.length && !roles.includes(auth.user.role)) {
        res.writeHead(403, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ message: 'No tiene permisos para acceder a este recurso.' }));
        return false;
    }

    // Inyectamos los datos del usuario en la petición para que las rutas los usen
    req.user = auth.user;
    return true;
}

module.exports = { verifyToken, requireAuth };
