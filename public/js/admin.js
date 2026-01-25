/**
 * ARCHIVO: admin.js
 * FUNCIÓN: Centro de Control para el Administrador
 * DESCRIPCIÓN: Este código maneja todas las tablas y formularios del panel admin. 
 * Permite que el administrador pueda crear usuarios, ver cuánto se ha vendido y gestionar el stock.
 */

let currentSection = 'users'; // Sección activa por defecto
let modalType = ''; // Para saber si el modal es de Usuario, Producto o Categoría
let editId = null; // ID del elemento que estamos editando (null si es nuevo)

// Al cargar la página, verificamos autenticación e iniciamos con la lista de usuarios
document.addEventListener('DOMContentLoaded', () => {
    const user = checkAuth('admin'); // Solo admin puede entrar aquí
    if (user) {
        document.getElementById('admin-name').textContent = user.name;
        loadSectionData('users');
    }
});

/**
 * Cambia la vista activa del panel administrativo.
 */
function showSection(section) {
    const titles = {
        'users': 'Usuarios',
        'categories': 'Categorías',
        'products': 'Productos',
        'sales': 'Ventas'
    };
    currentSection = section;
    // Ocultar todas las secciones
    document.querySelectorAll('.admin-section').forEach(s => s.style.display = 'none');
    // Mostrar la seleccionada
    document.getElementById(`${section}-section`).style.display = 'block';
    // Actualizar el título de la página
    document.getElementById('section-title').textContent = titles[section] || section;
    // Cargar los datos desde el servidor
    loadSectionData(section);
}

/**
Pide al servidor los datos de la sección seleccionada.
 */
async function loadSectionData(section) {
    const token = localStorage.getItem('token');
    const headers = { 'Authorization': `Bearer ${token}` };

    try {
        if (section === 'users') {
            const res = await fetch('/api/admin/users', { headers });
            const users = await res.json();
            renderTable('users', users);
        } else if (section === 'categories') {
            const res = await fetch('/api/admin/categories', { headers });
            const categories = await res.json();
            renderTable('categories', categories);
        } else if (section === 'products') {
            const res = await fetch('/api/admin/products', { headers });
            const products = await res.json();
            renderTable('products', products);
        } else if (section === 'sales') {
            // Configura fechas por defecto (Hoy) para el reporte de ventas
            const now = new Date();
            const year = now.getFullYear();
            const month = String(now.getMonth() + 1).padStart(2, '0');
            const day = String(now.getDate()).padStart(2, '0');
            const today = `${year}-${month}-${day}`;
            const startInput = document.getElementById('sale-start');
            const endInput = document.getElementById('sale-end');
            if (!startInput.value) startInput.value = today;
            if (!endInput.value) endInput.value = today;
            loadSalesReport();
        }
    } catch (err) {
        console.error('Error al cargar datos:', err);
    }
}

/**
Genera el contenido HTML de las tablas basándose en los datos recibidos.
 */
function renderTable(type, data) {
    const body = document.getElementById(`${type}-body`);
    body.innerHTML = '';

    data.forEach(item => {
        const tr = document.createElement('tr');
        if (type === 'users') {
            tr.innerHTML = `
                <td>${item.name}</td>
                <td>${item.username}</td>
                <td>${item.role}</td>
                <td>
                    <button class="btn btn-action btn-edit" onclick="editItem('user', '${item._id}')"> Editar</button>
                    <button class="btn btn-action btn-delete" onclick="deleteItem('user', '${item._id}')"> Eliminar</button>
                </td>
            `;
        } else if (type === 'categories') {
            tr.innerHTML = `
                <td>${item.name}</td>
                <td>
                    <button class="btn btn-action btn-edit" onclick="editItem('category', '${item._id}')"> Editar</button>
                    <button class="btn btn-action btn-delete" onclick="deleteItem('category', '${item._id}')"> Eliminar</button>
                </td>
            `;
        } else if (type === 'products') {
            const stockClass = item.stock <= item.minStock ? 'low-stock' : '';
            tr.innerHTML = `
                <td>${item.name}</td>
                <td>${item.categoryName}</td>
                <td>$${item.price}</td>
                <td class="${stockClass}">${item.stock || 0}</td>
                <td>${item.minStock || 0}</td>
                <td>
                    <button class="btn btn-action btn-edit" onclick="editItem('product', '${item._id}')"> Editar</button>
                    <button class="btn btn-action btn-delete" onclick="deleteItem('product', '${item._id}')"> Eliminar</button>
                </td>
            `;
        }
        body.appendChild(tr);
    });
}


/**
Abre el formulario (Modal) para crear o editar un elemento.
 */
function openModal(type, item = null) {
    const typeNames = {
        'user': 'Usuario',
        'category': 'Categoría',
        'product': 'Producto'
    };
    modalType = type;
    editId = item ? item._id : null; // Si hay item, estamos EDITANDO, si no, CREANDO
    const modal = document.getElementById('modal');
    const title = document.getElementById('modal-title');
    const form = document.getElementById('modal-form');

    title.textContent = (editId ? 'Editar ' : 'Nuevo ') + (typeNames[type] || type);
    form.innerHTML = ''; // Limpiamos el formulario anterior

    // Construcción dinámica de los campos según el tipo de recurso
    if (type === 'user') {
        form.innerHTML = `
            <label>Nombre Completo</label>
            <input type="text" id="m-name" class="input-styled" placeholder="Ej: Patricio Cáceres Pavez" value="${item ? item.name : ''}" required>
            
            <label>Nombre de Usuario</label>
            <input type="text" id="m-username" class="input-styled" placeholder="Ej: Patricio" value="${item ? item.username : ''}" required>
            
            <label>Correo Electrónico</label>
            <input type="email" id="m-email" class="input-styled" placeholder="Ej: patricio@ejemplo.cl" value="${item ? item.email || '' : ''}" required>
            
            <label>Contraseña</label>
            <input type="password" id="m-password" class="input-styled" placeholder="${editId ? 'Vacio para mantener' : 'Min 6 carac.'}" ${editId ? '' : 'required'}>
            
            <label>Rol</label>
            <select id="m-role" class="input-styled">
                <option value="vendedor" ${item?.role === 'vendedor' ? 'selected' : ''}>Vendedor</option>
                <option value="admin" ${item?.role === 'admin' ? 'selected' : ''}>Administrador</option>
            </select>
        `;
    } else if (type === 'category') {
        form.innerHTML = `
            <label>Nombre de la Categoría</label>
            <input type="text" id="m-name" class="input-styled" placeholder="Ej: Bebidas..." value="${item ? item.name : ''}" required>
        `;
    } else if (type === 'product') {
        // Los productos requieren cargar primero las categorías para el select
        loadCategoriesForProduct(item);
    }

    modal.classList.add('active');
    modal.style.display = 'flex';
}

/**
Carga las categorías disponibles para el selector de productos.
 */
async function loadCategoriesForProduct(product = null) {
    const res = await fetch('/api/admin/categories', { headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` } });
    const cats = await res.json();
    const form = document.getElementById('modal-form');
    form.innerHTML = `
        <label>Nombre del Producto</label>
        <input type="text" id="m-name" class="input-styled" placeholder="Ej: Hamburguesa" value="${product ? product.name : ''}" required>
        
        <label>Precio</label>
        <input type="number" id="m-price" class="input-styled" placeholder="Ej: $1990" value="${product ? product.price : ''}" required step="1">
        
        <label>Categoría</label>
        <select id="m-category" class="input-styled" required>
            <option value="" disabled ${!product ? 'selected' : ''}>Seleccione...</option>
            ${cats.map(c => `<option value="${c._id}" data-name="${c.name}" ${product?.categoryId === c._id ? 'selected' : ''}>${c.name}</option>`).join('')}
        </select>
        
        <div style="display: flex; gap: 1rem;">
            <div style="flex: 1;">
                <label>Stock</label>
                <input type="number" id="m-stock" class="input-styled" value="${product ? product.stock : 0}" required>
            </div>
            <div style="flex: 1;">
                <label>Mínimo</label>
                <input type="number" id="m-minStock" class="input-styled" value="${product ? product.minStock : 0}" required>
            </div>
        </div>
        
        <label>Descripción</label>
        <textarea id="m-description" class="input-styled" placeholder="Detalles..." rows="3">${(product && product.description && product.description !== 'undefined') ? product.description : ''}</textarea>
    `;
}

function closeModal() {
    const modal = document.getElementById('modal');
    modal.style.display = 'none';
    modal.classList.remove('active');
}

/**
Recolecta los datos del modal y los envía al servidor (POST para nuevo, PUT para editar).
 */
document.getElementById('modal-save').addEventListener('click', async () => {
    const token = localStorage.getItem('token');
    const headers = {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
    };

    let body = {};
    // Extraemos datos según el tipo de modal activo
    if (modalType === 'user') {
        body = {
            name: document.getElementById('m-name').value,
            username: document.getElementById('m-username').value,
            email: document.getElementById('m-email').value,
            password: document.getElementById('m-password').value,
            role: document.getElementById('m-role').value
        };
    } else if (modalType === 'category') {
        body = { name: document.getElementById('m-name').value };
    } else if (modalType === 'product') {
        const catSelect = document.getElementById('m-category');
        body = {
            name: document.getElementById('m-name').value,
            price: document.getElementById('m-price').value,
            categoryId: catSelect.value,
            categoryName: catSelect.options[catSelect.selectedIndex].getAttribute('data-name'),
            stock: document.getElementById('m-stock').value,
            minStock: document.getElementById('m-minStock').value,
            description: document.getElementById('m-description').value
        };
    }

    const method = editId ? 'PUT' : 'POST';
    const plural = modalType === 'category' ? 'categories' : modalType + 's';
    const url = `/api/admin/${plural}${editId ? '/' + editId : ''}`;

    const res = await fetch(url, { method, headers, body: JSON.stringify(body) });
    if (res.ok) {
        closeModal();
        loadSectionData(currentSection); // Recargar la tabla para mostrar cambios
    } else {
        const err = await res.json();
        showAlert('Error', err.message || 'Error al guardar');
    }
});

/**
Elimina un registro previa confirmación.
 */
async function deleteItem(type, id) {
    const confirm = await showConfirm('¿Seguro que desea eliminar?', 'Esta acción borrará el registro de forma permanente.');
    if (!confirm) return;

    const plural = type === 'category' ? 'categories' : type + 's';
    const res = await fetch(`/api/admin/${plural}/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
    });
    if (res.ok) {
        loadSectionData(currentSection);
    } else {
        showAlert('Error', 'No se pudo eliminar el elemento.');
    }
}

/**
Carga los datos de un elemento específico y abre el modal de edición.
 */
async function editItem(type, id) {
    const token = localStorage.getItem('token');
    const plural = type === 'category' ? 'categories' : type + 's';
    // Buscamos en la lista ya cargada para no hacer otra petición extra al servidor
    const res = await fetch(`/api/admin/${plural}`, { headers: { 'Authorization': `Bearer ${token}` } });
    const items = await res.json();
    const item = items.find(i => i._id === id);
    openModal(type, item);
}

/**
Consulta el reporte de ventas usando el rango de fechas seleccionado.
 */
async function loadSalesReport() {
    const start = document.getElementById('sale-start').value;
    const end = document.getElementById('sale-end').value;

    const res = await fetch(`/api/admin/sales-report?start=${start}&end=${end}`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
    });

    if (!res.ok) return;

    const sales = await res.json();
    const body = document.getElementById('sales-body');
    body.innerHTML = '';

    if (sales.length === 0) {
        body.innerHTML = '<tr><td colspan="5" class="empty-table-message">No se encontraron ventas en este rango.</td></tr>';
    }

    let total = 0;
    let totalCash = 0;
    let totalTransfer = 0;

    // Resumen de totales por método de pago
    sales.forEach(s => {
        const saleTotal = parseFloat(s.total) || 0;
        total += saleTotal;
        if (s.paymentMethod === 'efectivo') {
            totalCash += saleTotal;
        } else if (s.paymentMethod === 'tarjeta' || s.paymentMethod === 'transferencia') {
            totalTransfer += saleTotal;
        }

        const saleDate = new Date(s.date);
        const dateStr = saleDate.toLocaleDateString('es-CL');
        const timeStr = saleDate.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' });

        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${dateStr}</td>
            <td>${timeStr}</td>
            <td>${s.sellerName}</td>
            <td><span class="payment-badge ${s.paymentMethod}">${s.paymentMethod}</span></td>
            <td class="bold-column">$${saleTotal.toLocaleString('es-CL')}</td>
        `;
        body.appendChild(tr);
    });

    // Actualizamos las tarjetas de resumen en el UI
    document.getElementById('total-amount').textContent = `$${total.toLocaleString('es-CL')}`;
    document.getElementById('total-cash').textContent = `$${totalCash.toLocaleString('es-CL')}`;
    document.getElementById('total-transfer').textContent = `$${totalTransfer.toLocaleString('es-CL')}`;
    document.getElementById('total-sales-count').textContent = sales.length;
}

// LÓGICA DE MODALES PERSONALIZADOS (CONFIRMACIÓN Y ALERTA)
let confirmResolver = null;

function showConfirm(title, message) {
    return new Promise((resolve) => {
        const modal = document.getElementById('confirm-modal');
        document.getElementById('confirm-title').textContent = title;
        document.getElementById('confirm-message').textContent = message;

        const buttons = modal.querySelector('.modal-buttons');
        const okBtn = buttons.querySelector('.btn-danger'); // Usar la clase global btn-danger
        okBtn.textContent = 'Eliminar';

        modal.style.display = 'flex';
        modal.classList.add('active');
        confirmResolver = resolve;
    });
}

function resolveConfirm(value) {
    const modal = document.getElementById('confirm-modal');
    modal.style.display = 'none';
    modal.classList.remove('active');
    if (confirmResolver) confirmResolver(value);
}

function showAlert(title, message) {
    const modal = document.getElementById('confirm-modal');
    document.getElementById('confirm-title').textContent = title;
    document.getElementById('confirm-message').textContent = message;

    const buttons = modal.querySelector('.modal-buttons');
    const cancelBtn = buttons.querySelector('.btn-modal-secondary');
    const okBtn = buttons.querySelector('.btn-modal-primary');

    cancelBtn.style.display = 'none';
    okBtn.textContent = 'Entendido';
    // Nota: El botón ya hereda btn-primary global

    modal.style.display = 'flex';
    modal.classList.add('active');

    confirmResolver = () => {
    };
}
