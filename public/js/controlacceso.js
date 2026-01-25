/**
 * ARCHIVO: controlacceso.js
 * FUNCIÓN: Llave Maestra (Login y Seguridad)
 * DESCRIPCIÓN: Este script es el que maneja todo el inicio de sesión y se asegura 
 * de que cada usuario entre a la página que le corresponde según su rol.
 */

//EVENTO: ENVÍO DEL FORMULARIO DE LOGIN 
document.getElementById('loginForm')?.addEventListener('submit', async (e) => {
    e.preventDefault(); // Evita que la página se recargue (petición asíncrona)
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    const messageEl = document.getElementById('loginMessage');

    try {
        // Enviar credenciales al servidor
        const response = await fetch('/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });

        const data = await response.json();

        if (response.ok) {
            // SI EL LOGIN ES CORRECTO:
            // Guardamos el Token (JWT) y los datos del usuario en localStorage
            // El token es lo que nos autentica en cada clic futuro.
            localStorage.setItem('token', data.token);
            localStorage.setItem('user', JSON.stringify(data.user));

            messageEl.textContent = 'Ingreso exitoso. Redirigiendo...';
            messageEl.className = 'message success';

            // Redirigir según el ROL del usuario después de 1 segundo
            setTimeout(() => {
                if (data.user.role === 'admin') {
                    window.location.href = '/admin.html';
                } else {
                    window.location.href = '/vendedor.html';
                }
            }, 1000);
        } else {
            // SI HAY ERROR (Credenciales mal escritas)
            messageEl.textContent = data.message || 'Error al iniciar sesión';
            messageEl.className = 'message error';
        }
    } catch (error) {
        messageEl.textContent = 'Error de conexión con el servidor';
        messageEl.className = 'message error';
    }
});

/**
Función para cerrar la sesión del usuario.
Borra los tokens guardados y devuelve al usuario a la pantalla de inicio.
 */
function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = '/index.html';
}

/**
Función de seguridad que se ejecuta al cargar cada página (Admin o Vendedor).
Verifica si el usuario tiene permiso para estar ahí.
 */
function checkAuth(requiredRole) {
    const token = localStorage.getItem('token');
    const user = JSON.parse(localStorage.getItem('user'));

    // Si no hay token, el usuario NO ha iniciado sesión (lo echamos al login)
    if (!token || !user) {
        window.location.href = '/index.html';
        return null;
    }

    // Si la página requiere un rol específico (ej: admin) y el usuario no lo tiene,
    // lo redirigimos a su página correspondiente.
    if (requiredRole && user.role !== requiredRole) {
        if (user.role === 'admin') {
            window.location.href = '/admin.html';
        } else {
            window.location.href = '/vendedor.html';
        }
        return null;
    }

    return user; // Si todo está bien, devuelve los datos del usuario
}

// Lógica de recuperación de contraseña (Modal y Código temporal)
let recoveryUser = '';

/**
Muestra el modal de recuperación (paso 1: ingrese usuario/email)
 */
function showRecoveryModal(e) {
    if (e) e.preventDefault();
    document.getElementById('recovery-modal').style.display = 'flex';
    document.getElementById('recovery-step-1').style.display = 'block';
    document.getElementById('recovery-step-2').style.display = 'none';
    document.getElementById('recovery-username').value = '';
    document.getElementById('recovery-message').textContent = '';
}

function closeRecoveryModal() {
    document.getElementById('recovery-modal').style.display = 'none';
}

/**
Paso 1: Solicita un código de recuperación al servidor
 */
async function submitRecoveryRequest() {
    const username = document.getElementById('recovery-username').value;
    const msg = document.getElementById('recovery-message');

    if (!username) return;

    msg.style.color = 'white';
    msg.textContent = 'Procesando...';

    try {
        const res = await fetch('/api/auth/reset-request', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ usernameOrEmail: username })
        });

        const data = await res.json();

        if (res.ok) {
            // El servidor nos da un código
            recoveryUser = username;
            document.getElementById('recovery-step-1').style.display = 'none';
            document.getElementById('recovery-step-2').style.display = 'block';
            document.getElementById('display-code').textContent = data.code;
            msg.textContent = '';
        } else {
            msg.style.color = '#ef4444';
            msg.textContent = 'Usuario no encontrado.';
        }
    } catch (err) {
        msg.style.color = '#ef4444';
        msg.textContent = 'Error de conexión.';
    }
}

/**
Paso 2: Envía el código y la nueva contraseña para validarlos
 */
async function submitPasswordReset() {
    const code = document.getElementById('recovery-code').value;
    const pass = document.getElementById('recovery-new-password').value;
    const msg = document.getElementById('recovery-message');

    if (!code || !pass) return;
    if (pass.length < 6) {
        msg.style.color = '#ef4444';
        msg.textContent = 'La contraseña debe tener al menos 6 caracteres.';
        return;
    }

    try {
        const res = await fetch('/api/auth/reset-password', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: recoveryUser, token: code, newPassword: pass })
        });

        if (res.ok) {
            msg.style.color = '#10b981';
            msg.textContent = '¡Contraseña actualizada! Ya puedes iniciar sesión.';
            setTimeout(closeRecoveryModal, 2000);
        } else {
            msg.style.color = '#ef4444';
            msg.textContent = 'Código inválido o expirado.';
        }
    } catch (err) {
        msg.style.color = '#ef4444';
        msg.textContent = 'Error de conexión.';
    }
}

