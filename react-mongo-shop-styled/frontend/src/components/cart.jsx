// Оформление заказа
async function submitOrder(event) {
    event.preventDefault();
    
    if (!validateOrderForm()) {
        showNotification('Исправьте ошибки в форме', 'error');
        return;
    }

    const paymentMethodValue = document.getElementById('payment-method').value;
    
    // Собираем данные формы
    const orderData = {
        customer: {
            fullName: document.getElementById('full-name').value.trim(),
            phone: document.getElementById('phone').value.trim(),
            email: document.getElementById('order-email').value.trim(),
            address: document.getElementById('address').value.trim(),
            comment: document.getElementById('comment').value.trim(),
            userId: currentUser?._id || null
        },
        payment: {
            method: paymentMethodValue
        },
        order: {
            items: cart.map(item => ({
                name: item.name,
                price: item.price,
                quantity: item.quantity,
                productId: item.id
            })),
            total: total,
            date: new Date().toISOString()
        },
        status: 'processing',
        createdAt: new Date().toISOString(),
        orderNumber: Math.floor(100000 + Math.random() * 900000),
        _id: 'order_' + Date.now()
    };

    // Если оплата картой, добавляем данные карты
    if (paymentMethodValue === 'card') {
        const cardNumber = document.getElementById('card-number').value;
        orderData.payment.cardNumber = '**** **** **** ' + cardNumber.replace(/\s/g, '').slice(-4);
        orderData.payment.cardHolder = document.getElementById('card-holder').value.trim();
        orderData.payment.cardExpiry = document.getElementById('card-month').value + '/' + document.getElementById('card-year').value;
    }

    // Показываем загрузку
    const submitOrderBtn = document.getElementById('submit-order-btn');
    submitOrderBtn.disabled = true;
    submitOrderBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Обработка заказа...';

    try {
        // Сохраняем заказ локально
        orders.push(orderData);
        saveToLocalStorage();
        
        // ВСЕГДА отправляем заказ на ваш сервер (localhost:5000) независимо от способа оплаты
        try {
            const serverResponse = await sendOrderToServer(orderData);
            console.log('Ответ сервера:', serverResponse);
            showNotification(`Заказ №${orderData.orderNumber} отправлен на сервер! ID: ${serverResponse._id || serverResponse.id || 'неизвестен'}`);
        } catch (serverError) {
            console.error('Ошибка отправки на сервер:', serverError);
            // Заказ все равно сохраняется локально
            showNotification(`Заказ №${orderData.orderNumber} сохранен локально. Ошибка соединения с сервером.`, 'error');
        }
        
        // Очищаем корзину
        cart = [];
        updateCart();
        
        // Сбрасываем форму
        orderForm.reset();
        document.getElementById('card-details').style.display = 'none';
        
        // Закрываем модалку
        setTimeout(() => {
            hideOrderModal();
            submitOrderBtn.disabled = false;
            submitOrderBtn.innerHTML = '<i class="fas fa-check-circle"></i> Подтвердить заказ';
            
            // Переключаем на страницу покупок если пользователь авторизован
            if (currentUser) {
                switchPage('purchases');
            }
        }, 1000);
        
    } catch (error) {
        showNotification(error.message || 'Ошибка при оформлении заказа', 'error');
        submitOrderBtn.disabled = false;
        submitOrderBtn.innerHTML = '<i class="fas fa-check-circle"></i> Подтвердить заказ';
    }
}

// ============================================
// ДОБАВЛЯЕМ ВАШУ КНОПКУ ДЛЯ ТЕСТА СЕРВЕРА
// ============================================

// Добавляем кнопку теста сервера в HTML после инициализации
function addServerTestButton() {
    // Проверяем, есть ли уже такая кнопка
    if (document.getElementById('serverTestBtn')) return;
    
    // Находим контейнер корзины
    const cartContainer = document.querySelector('.cart-container');
    if (!cartContainer) return;
    
    // Создаем кнопку
    const testBtn = document.createElement('button');
    testBtn.id = 'serverTestBtn';
    testBtn.innerHTML = `
        <i class="fas fa-server"></i> Тест сервера
    `;
    testBtn.style.cssText = `
        background-color: #3b82f6;
        color: white;
        border: none;
        padding: 0.75rem 1.5rem;
        border-radius: 8px;
        cursor: pointer;
        font-family: 'Segoe UI', 'Inter', sans-serif;
        font-weight: 600;
        transition: background-color 0.15s ease;
        width: 100%;
        margin-top: 0.5rem;
        font-size: 1rem;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 0.5rem;
    `;
    
    // Добавляем эффект при наведении
    testBtn.onmouseenter = () => {
        testBtn.style.backgroundColor = '#2563eb';
    };
    testBtn.onmouseleave = () => {
        testBtn.style.backgroundColor = '#3b82f6';
    };
    
    // Обработчик клика
    testBtn.addEventListener('click', async () => {
        if (cart.length === 0) {
            showNotification('Корзина пуста!', 'error');
            return;
        }

        // Создаем тестовый заказ на основе текущей корзины
        const cartItems = cart.map(item => ({
            title: item.name,
            price: item.price,
            count: item.quantity,
            productId: item.id
        }));

        const totalPrice = cartItems.reduce((sum, item) => sum + item.price * item.count, 0);

        const order = { 
            items: cartItems, 
            totalPrice,
            customer: currentUser ? {
                email: currentUser.email,
                name: currentUser.name
            } : null,
            timestamp: new Date().toISOString()
        };

        // Показываем загрузку
        testBtn.disabled = true;
        testBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Отправка...';

        try {
            const res = await fetch('http://localhost:5000/api/orders', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(order)
            });

            if (!res.ok) {
                throw new Error(`HTTP error! status: ${res.status}`);
            }

            const data = await res.json();
            showNotification(`Заказ отправлен! ID: ${data._id || data.id || 'неизвестен'}`);
            
        } catch (err) {
            console.error('Ошибка теста сервера:', err);
            
            if (err.message.includes('Failed to fetch')) {
                showNotification('Сервер localhost:5000 не найден', 'error');
            } else if (err.message.includes('HTTP error')) {
                showNotification(`Ошибка сервера: ${err.message}`, 'error');
            } else {
                showNotification('Ошибка при оформлении заказа: ' + err.message, 'error');
            }
            
            // Показываем данные которые пытались отправить
            console.log('Тестовые данные заказа:', order);
        } finally {
            testBtn.disabled = false;
            testBtn.innerHTML = '<i class="fas fa-server"></i> Тест сервера';
        }
    });
    
    // Вставляем кнопку после тестовой кнопки
    const existingTestBtn = document.getElementById('test-order-btn');
    if (existingTestBtn) {
        cartContainer.insertBefore(testBtn, existingTestBtn.nextSibling);
    } else {
        cartContainer.appendChild(testBtn);
    }
}

// Добавляем кнопку при загрузке
document.addEventListener('DOMContentLoaded', function() {
    // После небольшой задержки добавляем кнопку
    setTimeout(addServerTestButton, 500);
});