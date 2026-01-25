/**
 * ARCHIVO: rutaslogin.js
 * FUNCIÓN: Manejo de Usuarios y Sesión
 * DESCRIPCIÓN: Acá programé todo lo que tiene que ver con iniciar sesión, 
 * ver mis datos personales y cambiar mi información en "Mi Perfil".
 */

const { getDB } = require('./db'); // Acceso a la base de datos
const { ObjectId } = require('mongodb'); // Para buscar usuarios por su ID único de Mongo
const { verifyToken } = require('./seguridad'); // Validador de sesiones
const bcrypt = require('bcryptjs'); // Para comparar contraseñas cifradas
const jwt = require('jsonwebtoken'); // Para generar tokens de sesión

/**
Función principal que procesa las peticiones de autenticación.
 */
async function authRoutes(req, res, pathname, method) {
    // Utilidad interna para responder con JSON
    const sendJSON = (statusCode, data) => {
        res.writeHead(statusCode, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(data));
    };

    // RUTA: LOGIN 
    if (pathname === '/api/auth/login' && method === 'POST') {
        const { username, password } = req.body;
        const db = getDB();

        // Buscamos al usuario por su nombre de usuario
        const user = await db.collection('users').findOne({ username });

        // Si el usuario existe, comparamos la contraseña enviada con el hash guardado
        if (user && (await bcrypt.compare(password, user.password))) {
            // Si es correcto, generamos un Token JWT que expira en 8 horas
            const token = jwt.sign(
                { id: user._id, username: user.username, role: user.role, name: user.name },
                process.env.JWT_SECRET,
                { expiresIn: '8h' }
            );

            // Devolvemos el token y los datos básicos (sin el password)
            sendJSON(200, {
                token,
                user: {
                    id: user._id,
                    username: user.username,
                    role: user.role,
                    name: user.name
                }
            });
        } else {
            // Error 401: No autorizado
            sendJSON(401, { message: 'Usuario o contraseña incorrectos.' });
        }
    }
    //RUTA: OBTENER MI PERFIL (Datos del usuario actual) 
    else if (pathname === '/api/auth/me' && method === 'GET') {
        // Verificamos que el token sea válido
        const auth = verifyToken(req);
        if (!auth.valid) return sendJSON(401, { message: auth.error });

        const db = getDB();
        // Buscamos los datos actualizados del usuario en la Base de Datos
        const user = await db.collection('users').findOne(
            { _id: new ObjectId(auth.user.id) },
            { projection: { password: 0 } } // Excluimos el password por seguridad
        );

        if (!user) return sendJSON(404, { message: 'Usuario no encontrado.' });
        sendJSON(200, user);
    }
    // RUTA: ACTUALIZAR MI PERFIL
    else if (pathname === '/api/auth/me' && method === 'PUT') {
        // Verificamos el token
        const auth = verifyToken(req);
        if (!auth.valid) return sendJSON(401, { message: auth.error });

        const { name, email, password } = req.body;
        const db = getDB();
        const updateData = { name, email };

        // Si el usuario envió una nueva contraseña, la ciframos antes de guardar
        if (password && password.trim().length >= 6) {
            updateData.password = await bcrypt.hash(password, 10);
        }

        // Actualizamos el documento en MongoDB
        await db.collection('users').updateOne(
            { _id: new ObjectId(auth.user.id) },
            { $set: updateData }
        );

        sendJSON(200, { message: 'Perfil actualizado con éxito.' });
    }
    else {
        sendJSON(404, { message: 'Ruta no encontrada' });
    }
}

module.exports = authRoutes;
