/**
 * ARCHIVO: server.js
 * FUNCIÓN: Corazón del servidor Node.js
 * DESCRIPCIÓN: Acá configuramos el servidor desde cero para que maneje todas las peticiones,
 * cargue los archivos de la app y conecte con las rutas de datos de la API.
 */

const http = require('http'); // Servidor web nativo de Node.js
const fs = require('fs'); // Sistema de archivos para leer imágenes, CSS, etc.
const path = require('path'); // Manejo de rutas de archivos
const url = require('url'); // Parsear URLs de las peticiones
const { connectDB } = require('./db'); // Importa la conexión a MongoDB
const authRoutes = require('./rutaslogin'); // Rutas de login y perfil
const adminRoutes = require('./admrutas'); // Rutas administrativas (Usuarios, Productos)
const sellerRoutes = require('./rutasventas'); // Rutas de ventas (POS)
const recoveryRoutes = require('./rutasrecuperacion'); // Rutas de recuperación de clave
require('dotenv').config(); // Carga las variables del archivo .env

// Configura el puerto desde .env o usa el 3000 por defecto
const PORT = process.env.PORT || 3000;

// Tipos de contenido (MIME) para que el navegador sepa qué tipo de archivo recibe
const mimeTypes = {
    '.html': 'text/html',
    '.css': 'text/css',
    '.js': 'text/javascript',
    '.json': 'application/json',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon'
};

/**
 * Función para extraer los datos de una petición POST/PUT.
 * Node.js recibe los datos en "chunks" (trozos), así que los unimos y convertimos a JSON.
 */
function parseBody(req) {
    return new Promise((resolve, reject) => {
        let body = '';
        req.on('data', chunk => body += chunk.toString()); // Recibe pedazos de datos
        req.on('end', () => { // Cuando termina de recibir
            try {
                resolve(body ? JSON.parse(body) : {}); // Convierte texto a objeto JSON
            } catch (e) {
                resolve({}); // Si no es JSON válido, envía objeto vacío
            }
        });
        req.on('error', reject);
    });
}

/**
 * Utilidad para enviar respuestas en formato JSON de forma estandarizada.
 */
function sendJSON(res, statusCode, data) {
    res.writeHead(statusCode, {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*' // Permite peticiones desde cualquier origen (CORS)
    });
    res.end(JSON.stringify(data));
}

/**
 * Función para servir archivos físicos (HTML, CSS, JS) desde la carpeta /public.
 */
function serveStatic(res, filePath) {
    fs.readFile(filePath, (err, content) => {
        if (err) {
            if (err.code === 'ENOENT') {
                res.writeHead(404);
                res.end('Archivo no encontrado');
            } else {
                res.writeHead(500);
                res.end('Error interno del servidor');
            }
        } else {
            const ext = path.extname(filePath);
            const contentType = mimeTypes[ext] || 'application/octet-stream';
            res.writeHead(200, { 'Content-Type': contentType });
            res.end(content);
        }
    });
}

/**
 * Función principal que maneja TODAS las peticiones que llegan al servidor.
 */
async function handleRequest(req, res) {
    const parsedUrl = url.parse(req.url, true);
    const pathname = parsedUrl.pathname;
    const method = req.method;

    // Configuración de cabeceras CORS para permitir la interacción con el frontend
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    // El navegador envía OPTIONS antes de peticiones complejas; respondemos éxito siempre.
    if (method === 'OPTIONS') {
        res.writeHead(200);
        res.end();
        return;
    }

    // SI LA RUTA EMPIEZA CON /api/, significa que el frontend está pidiendo datos
    if (pathname.startsWith('/api/')) {
        req.body = await parseBody(req); // Extrae el JSON enviado
        req.query = parsedUrl.query; // Extrae los parámetros de la URL (?id=123)
        req.params = {}; // Espacio para parámetros dinámicos

        try {
            // ENRUTAMIENTO DE LAS APIs
            if (pathname.startsWith('/api/auth/')) {
                // Rutas de login y perfil
                if (pathname.includes('/reset-')) {
                    await recoveryRoutes(req, res, pathname, method);
                } else {
                    await authRoutes(req, res, pathname, method);
                }
            } else if (pathname.startsWith('/api/admin/')) {
                // Rutas de administración (Productos, Usuarios)
                await adminRoutes(req, res, pathname, method);
            } else if (pathname.startsWith('/api/vendedor/')) {
                // Rutas exclusivas del vendedor (Ventas)
                await sellerRoutes(req, res, pathname, method);
            } else {
                sendJSON(res, 404, { message: 'Ruta de API no encontrada' });
            }
        } catch (error) {
            console.error('Error en la API:', error);
            sendJSON(res, 500, { message: 'Error interno del servidor' });
        }
        return;
    }

    // SI NO ES API, BUSCAMOS EL ARCHIVO EN /public
    let filePath = path.join(__dirname, 'public', pathname === '/' ? 'index.html' : pathname);

    // Si el archivo no existe físicamente, redirige al index.html (esto soporta SPAs básicas)
    if (!fs.existsSync(filePath) && !pathname.startsWith('/api/')) {
        filePath = path.join(__dirname, 'public', 'index.html');
    }

    serveStatic(res, filePath);
}

// Crea el servidor y le asigna la función de manejo de peticiones
const server = http.createServer(handleRequest);

// Acá se conecta a la base de datos de MongoDB Atlas y si todo sale bien, prende el servidor
connectDB().then(() => {
    server.listen(PORT, () => {
        console.log(`Aplicación MyFoodTruck corriendo en: http://localhost:${PORT}`);
    });
}).catch(err => {
    console.error('Error al conectar la Base de Datos:', err);
    process.exit(1); // Detiene el programa si no hay base de datos
});
