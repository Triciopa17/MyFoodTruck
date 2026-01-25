/**
 * ARCHIVO: perfil.js
 * FUNCIÓN: Mi Cuenta (Perfil de Usuario)
 * DESCRIPCIÓN: Acá programé la parte de "Mi Perfil". Sirve para que cualquier usuario 
 * pueda cambiar su nombre, su correo o su contraseña de forma segura.
 */

/**
Abre el modal de perfil y carga los datos actuales desde el servidor.
 */
async function openProfileModal() {
    const token = localStorage.getItem('token');
    try {
        // Pedimos los datos del usuario al servidor usando el Token de sesión
        const res = await fetch('/api/auth/me', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const user = await res.json();

        let modal = document.getElementById('profile-modal');
        // Si el modal no existe en el HTML, lo creamos dinámicamente
        if (!modal) {
            modal = document.createElement('div');
            modal.id = 'profile-modal';
            modal.className = 'modal';
            modal.innerHTML = `
                <div class="modal-content" style="max-width: 450px;">
                    <div class="modal-header">
                        <h2>Mi Perfil</h2>
                        <button onclick="closeProfileModal()" class="btn-close-modal">×</button>
                    </div>
                    <form id="profile-form" class="modal-form">
                        <label>Nombre Completo</label>
                        <input type="text" id="p-name" class="input-styled" value="${user.name}" required>
                        
                        <label>Usuario (No editable)</label>
                        <input type="text" class="input-styled" value="${user.username}" disabled style="opacity: 0.6;">
                        
                        <label>Correo Electrónico</label>
                        <input type="email" id="p-email" class="input-styled" value="${user.email || ''}" required>
                        
                        <label>Nueva Contraseña</label>
                        <input type="password" id="p-password" class="input-styled" placeholder="Mínimo 6 caracteres">
                        
                        <div class="modal-buttons" style="margin-top: 1rem;">
                            <button type="submit" class="btn btn-primary" style="width: 100%;">Guardar Cambios</button>
                        </div>
                    </form>
                    <div id="profile-message" style="margin-top: 1rem; text-align: center; font-size: 0.9rem;"></div>
                </div>
            `;
            document.body.appendChild(modal);

            // Escuchamos el envío del formulario para guardar los cambios
            document.getElementById('profile-form').addEventListener('submit', saveProfile);
        } else {
            // Si el modal ya existe, solo actualizamos los valores de los inputs
            document.getElementById('p-name').value = user.name;
            document.getElementById('p-email').value = user.email || '';
            document.getElementById('p-password').value = '';
        }

        modal.style.display = 'flex';
    } catch (err) {
        console.error('Error al cargar perfil:', err);
    }
}

function closeProfileModal() {
    const modal = document.getElementById('profile-modal');
    if (modal) modal.style.display = 'none';
}

/**
Recoge los datos del formulario y los envía al servidor para actualizar el perfil.
 */
async function saveProfile(e) {
    e.preventDefault();
    const token = localStorage.getItem('token');
    const name = document.getElementById('p-name').value;
    const email = document.getElementById('p-email').value;
    const password = document.getElementById('p-password').value;
    const msg = document.getElementById('profile-message');

    msg.style.color = 'white';
    msg.textContent = 'Guardando...';

    try {
        // Petición PUT (Actualización) al servidor
        const res = await fetch('/api/auth/me', {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ name, email, password })
        });

        if (res.ok) {
            msg.style.color = '#10b981';
            msg.textContent = 'Perfil actualizado con éxito.';

            // Actualizamos también los datos en el localStorage para que el UI cambie de inmediato
            const userData = JSON.parse(localStorage.getItem('user'));
            userData.name = name;
            localStorage.setItem('user', JSON.stringify(userData));

            // Actualizamos el nombre que sale en la barra lateral/superior
            const userDisplay = document.querySelector('.user-info span');
            if (userDisplay) userDisplay.textContent = name;

            // Cerramos el modal después de 2 segundos
            setTimeout(closeProfileModal, 2000);
        } else {
            const data = await res.json();
            msg.style.color = '#ef4444';
            msg.textContent = data.message || 'Error al actualizar.';
        }
    } catch (err) {
        msg.style.color = '#ef4444';
        msg.textContent = 'Error de conexión.';
    }
}