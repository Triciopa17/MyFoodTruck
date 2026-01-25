/**
 * ARCHIVO: pantallaventas.js
 * FUNCIÓN: Corazón del Punto de Venta (POS)
 * DESCRIPCIÓN: Este script maneja la caja. Permite elegir productos, sumarlos al carrito, 
 * calcular el vuelto y mandar la venta al servidor para que el jefe vea el reporte.
 */

let allData = []; // Guardará todas las categorías y productos
let cart = []; // Lista de productos seleccionados para la venta actual
let currentCategoryId = null; // ID de la categoría que se está viendo

// Al cargar la página, verificamos sesión e iniciamos la carga de productos
document.addEventListener('DOMContentLoaded', () => {
    const user = checkAuth(); // Verifica que el usuario esté logueado
    if (user) {
        document.getElementById('seller-name').textContent = user.name;
        loadPOSData();
    }
});

/**
Obtiene del servidor el catálogo completo de categorías y productos.
 */
async function loadPOSData() {
    const token = localStorage.getItem('token');
    try {
        const res = await fetch('/api/vendedor/pos-data', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        allData = await res.json();
        renderCategories(); // Dibuja las pestañas de categorías
        if (allData.length > 0) {
            showCategory(allData[0]._id); // Muestra la primera categoría por defecto
        }
    } catch (err) {
        console.error('Error al cargar datos del POS:', err);
    }
}

/**
 * Dibuja las "pestañas" superiores para filtrar por categoría.
 */
function renderCategories() {
    const container = document.getElementById('categories-tabs');
    container.innerHTML = '';
    allData.forEach(cat => {
        const div = document.createElement('div');
        div.className = `tab ${cat._id === currentCategoryId ? 'active' : ''}`;
        div.textContent = cat.name;
        div.onclick = () => showCategory(cat._id);
        div.id = `tab-${cat._id}`;
        container.appendChild(div);
    });
}

/**
Muestra los productos pertenecientes a una categoría específica.
 */
function showCategory(id) {
    currentCategoryId = id;
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    document.getElementById(`tab-${id}`).classList.add('active');

    const grid = document.getElementById('products-grid');
    grid.innerHTML = '';

    const category = allData.find(c => c._id === id);
    category.products.forEach(prod => {
        const div = document.createElement('div');
        div.className = 'product-card';
        div.innerHTML = `
            <h3>${prod.name}</h3>
            <p>$${prod.price}</p>
        `;
        div.onclick = () => addToCart(prod); // Al hacer clic, se agrega al carrito
        grid.appendChild(div);
    });
}

/**
Agrega un producto al carrito o aumenta su cantidad si ya existe.
 */
function addToCart(product) {
    const existing = cart.find(item => item._id === product._id);
    if (existing) {
        existing.quantity += 1;
    } else {
        cart.push({ ...product, quantity: 1 });
    }
    renderCart();
}

function removeFromCart(id) {
    cart = cart.filter(item => item._id !== id);
    renderCart();
}

/**
Aumenta o disminuye la cantidad de un ítem en el carrito (+ o -).
 */
function updateQuantity(id, delta) {
    const item = cart.find(i => i._id === id);
    if (item) {
        item.quantity += delta;
        if (item.quantity <= 0) {
            removeFromCart(id); // Si llega a 0, se elimina del carrito
        } else {
            renderCart();
        }
    }
}

/**
 * Actualiza la visualización lateral del carrito y calcula el TOTAL.
 */
function renderCart() {
    const container = document.getElementById('cart-items');
    container.innerHTML = '';
    let total = 0;

    cart.forEach(item => {
        total += item.price * item.quantity;
        const div = document.createElement('div');
        div.className = 'cart-item';
        div.innerHTML = `
            <div class="cart-item-info">
                <div class="cart-item-name">${item.name}</div>
                <div class="cart-item-details">$${item.price.toLocaleString()} x ${item.quantity}</div>
            </div>
            <div class="cart-item-actions">
                <div class="cart-item-price">$${(item.quantity * item.price).toLocaleString()}</div>
                <div class="btn-group">
                    <button onclick="updateQuantity('${item._id}', -1)" class="btn-qty btn-qty-minus">−</button>
                    <button onclick="updateQuantity('${item._id}', 1)" class="btn-qty btn-qty-plus">+</button>
                    <button onclick="removeFromCart('${item._id}')" class="btn-remove">×</button>
                </div>
            </div>
        `;
        container.appendChild(div);
    });

    document.getElementById('cart-total').textContent = `$${total.toLocaleString()}`;
}

/**
Inicia el proceso de finalización de la venta abriendo el modal de pago.
 */
async function processSale() {
    if (cart.length === 0) return alert('El carrito está vacío');
    const total = cart.reduce((acc, item) => acc + (item.price * item.quantity), 0);
    showPaymentModal(total);
}

/**
Configura y muestra el modal de pago (Efectivo/Tarjeta).
 */
function showPaymentModal(total) {
    const modal = document.getElementById('payment-modal');
    const totalDisplay = document.getElementById('payment-total-amount');
    const cashReceivedInput = document.getElementById('cash-received');
    const confirmBtn = document.getElementById('confirm-sale-btn');

    totalDisplay.textContent = `$${total.toLocaleString()}`;
    cashReceivedInput.value = '';
    document.getElementById('change-display').textContent = '';
    document.getElementById('cash-input-section').style.display = 'none';

    document.querySelectorAll('.payment-method-btn').forEach(btn => btn.classList.remove('selected'));
    selectedPayment = null;
    confirmBtn.disabled = true;

    confirmBtn.onclick = () => confirmSale(total);
    cashReceivedInput.oninput = () => calculateChange(total);

    modal.style.display = 'flex';
    modal.classList.add('active');
}

/**
Selecciona el método de pago y activa el campo de "Efectivo Recibido" en caso de recibir efectivo.
 */
function selectPaymentMethod(method) {
    selectedPayment = method;
    document.querySelectorAll('.payment-method-btn').forEach(btn => btn.classList.remove('selected'));
    document.getElementById(`btn-${method}`).classList.add('selected');

    const cashSection = document.getElementById('cash-input-section');
    const confirmBtn = document.getElementById('confirm-sale-btn');

    if (method === 'efectivo') {
        cashSection.style.display = 'block';
        confirmBtn.disabled = true; // No se puede confirmar hasta recibir el dinero
        setTimeout(() => document.getElementById('cash-received').focus(), 100);
    } else {
        cashSection.style.display = 'none';
        confirmBtn.disabled = false;
    }
}

/**
Calcula en tiempo real el vuelto que debe entregarse al cliente.
 */
function calculateChange(total) {
    const cashReceived = parseFloat(document.getElementById('cash-received').value) || 0;
    const changeDisplay = document.getElementById('change-display');
    const confirmBtn = document.getElementById('confirm-sale-btn');

    if (cashReceived >= total) {
        const change = cashReceived - total;
        changeDisplay.innerHTML = `<span class="total-label">Vuelto:</span> $${change.toLocaleString()}`;
        confirmBtn.disabled = false; // Ya se puede confirmar
    } else if (cashReceived > 0) {
        changeDisplay.innerHTML = `<span style="color: #ef4444;">Faltan: $${(total - cashReceived).toLocaleString()}</span>`;
        confirmBtn.disabled = true;
    } else {
        changeDisplay.textContent = '';
        confirmBtn.disabled = true;
    }
}

/**
Envía la venta final al servidor para que se guarde en la BD y se descuente el Stock.
 */
async function confirmSale(total) {
    if (!selectedPayment) return;

    const token = localStorage.getItem('token');
    const confirmBtn = document.getElementById('confirm-sale-btn');
    confirmBtn.disabled = true;
    confirmBtn.textContent = 'Procesando...';

    try {
        const res = await fetch('/api/vendedor/sales', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                items: cart,
                total,
                paymentMethod: selectedPayment
            })
        });

        const data = await res.json();

        if (res.ok) {
            closePaymentModal();
            showSuccessOverlay(); // Muestra animación de "Venta Exitosa"
            cart = []; // Vacía el carrito
            renderCart();
            await loadPOSData(); // Recarga stock de productos

            // Si algún producto quedó con stock bajo, muestra las alertas
            if (data.alerts && data.alerts.length > 0) {
                setTimeout(() => showStockAlerts(data.alerts), 3500);
            }
        } else {
            alert('Error al procesar la venta');
            confirmBtn.disabled = false;
            confirmBtn.textContent = 'Confirmar Venta';
        }
    } catch (err) {
        alert('Error de conexión');
        confirmBtn.disabled = false;
        confirmBtn.textContent = 'Confirmar Venta';
    }
}

/**
Muestra alertas visuales detalladas de falta de productos (Stock Mínimo).
 */
function showStockAlerts(alerts) {
    const modal = document.getElementById('stock-alert-modal');
    const messages = document.getElementById('stock-alert-messages');

    messages.innerHTML = alerts.map(msg => `<p class="alert-text">${msg}</p>`).join('');

    modal.style.display = 'flex';
    modal.classList.add('active');
}

function closeStockAlerts() {
    const modal = document.getElementById('stock-alert-modal');
    modal.style.display = 'none';
    modal.classList.remove('active');
}

function closePaymentModal() {
    const modal = document.getElementById('payment-modal');
    modal.style.display = 'none';
    modal.classList.remove('active');
    selectedPayment = null;

    const confirmBtn = document.getElementById('confirm-sale-btn');
    confirmBtn.textContent = 'Confirmar Venta';
}

function showSuccessOverlay() {
    const overlay = document.getElementById('success-overlay');
    overlay.style.display = 'flex';

    setTimeout(() => {
        overlay.style.display = 'none';
    }, 3000);
}
