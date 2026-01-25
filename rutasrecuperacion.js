/**
Gestión de recuperación de contraseñas olvidadas.
Implementa el flujo de recuperación en dos pasos:
 *-Solicitar un código único temporal (OTP) enviado (simulado) al correo.
 *-Validar el código y permitir establecer una nueva contraseña.
 */

const { getDB } = require('./db');
const bcrypt = require('bcryptjs'); // Para cifrar la nueva clave
const { ObjectId } = require('mongodb');

async function recoveryRoutes(req, res, pathname, method) {
    // Utilidad de respuesta JSON
    const sendJSON = (statusCode, data) => {
        res.writeHead(statusCode, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(data));
    };

    const db = getDB();

    // PASO 1: SOLICITAR RECUPERACIÓN 
    if (pathname === '/api/auth/reset-request' && method === 'POST') {
        const { usernameOrEmail } = req.body;

        // Buscamos al usuario por su nombre de usuario O por su correo
        const user = await db.collection('users').findOne({
            $or: [
                { username: usernameOrEmail },
                { email: usernameOrEmail }
            ]
        });

        // Por seguridad, si el usuario no existe, no lo decimos directamente
        // pero en el log del servidor sí generamos el código para pruebas.
        if (!user) {
            return sendJSON(200, { message: 'Si el usuario existe, se ha generado un código.' });
        }

        // GENERACIÓN DEL CÓDIGO (6 dígitos aleatorios)
        const resetToken = Math.floor(100000 + Math.random() * 900000).toString();
        // El código expira en 1 hora (3.600.000 milisegundos)
        const resetExpires = new Date(Date.now() + 3600000);

        // Guardamos el token temporal en el documento del usuario en MongoDB
        await db.collection('users').updateOne(
            { _id: user._id },
            { $set: { resetToken, resetExpires } }
        );

        // SIMULACIÓN DE ENVÍO DE CORREO (Se muestra en la consola del servidor)
        console.log('--------------------------------------------------');
        console.log('📧 CÓDIGO DE RECUPERACIÓN (SIMULADO)');
        console.log(`Para: ${user.email} (${user.name})`);
        console.log(`Código: ${resetToken}`);
        console.log('--------------------------------------------------');

        return sendJSON(200, {
            message: 'Si el usuario existe, se ha generado un código.',
            code: resetToken // Lo enviamos al cliente para facilitar el flujo en el examen
        });
    }

    //PASO 2: VALIDAR CÓDIGO Y CAMBIAR CLAVE
    if (pathname === '/api/auth/reset-password' && method === 'POST') {
        const { username, token, newPassword } = req.body;

        // Buscamos al usuario que coincida con el nombre de usuario, el token
        // y que el token NO haya expirado ($gt: hoy).
        const user = await db.collection('users').findOne({
            username,
            resetToken: token,
            resetExpires: { $gt: new Date() }
        });

        if (!user) {
            return sendJSON(400, { message: 'El código es inválido o ha expirado.' });
        }

        // Si es válido, ciframos la nueva contraseña
        const hashedPassword = await bcrypt.hash(newPassword, 10);

        // Actualizamos la clave y ELIMINAMOS ($unset) el token temporal
        await db.collection('users').updateOne(
            { _id: user._id },
            {
                $set: { password: hashedPassword },
                $unset: { resetToken: "", resetExpires: "" }
            }
        );

        return sendJSON(200, { message: 'Contraseña actualizada con éxito.' });
    }

    sendJSON(404, { message: 'Ruta de recuperación no encontrada' });
}

module.exports = recoveryRoutes;
