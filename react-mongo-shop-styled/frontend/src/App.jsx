// src/App.jsx
import React, { useEffect, useState } from 'react';
import Products from './components/Products';
import './App.css';

const API_URL = 'http://192.168.0.101:5000'; // Твой локальный IP

function App() {
  const [cart, setCart] = useState({});
  const [total, setTotal] = useState(0);

  // Подсчет общей суммы корзины
  useEffect(() => {
    const totalSum = Object.values(cart).reduce((sum, item) => {
      return sum + (item.price * item.qty);
    }, 0);
    setTotal(totalSum);
  }, [cart]);

  // Функция добавления в корзину
  const addToCart = (product) => {
    setCart(prevCart => ({
      ...prevCart,
      [product._id]: {
        ...product,
        qty: (prevCart[product._id]?.qty || 0) + 1
      }
    }));
  };

  // Функция удаления из корзины
  const removeFromCart = (productId) => {
    setCart(prevCart => {
      const updatedCart = { ...prevCart };
      if (updatedCart[productId].qty > 1) {
        updatedCart[productId].qty -= 1;
      } else {
        delete updatedCart[productId];
      }
      return updatedCart;
    });
  };

  return (
    <div className="app-container">
      <header className="header">
        <h1>🏪 Магазин TechStore</h1>
        <div className="cart-summary">
          🛒 Корзина: {Object.values(cart).length} товара(ов) - {total} ₽
        </div>
      </header>

      <main className="main-content">
        <Products addToCart={addToCart} />
      </main>

      {/* Боковая панель корзины */}
      <div className="cart-sidebar">
        <h2>🛒 Ваша корзина</h2>
        {Object.values(cart).length === 0 ? (
          <p className="empty-cart">Корзина пуста</p>
        ) : (
          <>
            <div className="cart-items">
              {Object.values(cart).map(item => (
                <div key={item._id} className="cart-item">
                  <div className="cart-item-info">
                    <span className="cart-item-name">{item.name}</span>
                    <span className="cart-item-price">{item.price} ₽ × {item.qty} = {item.price * item.qty} ₽</span>
                  </div>
                  <div className="cart-item-actions">
                    <button 
                      className="btn-minus"
                      onClick={() => removeFromCart(item._id)}
                    >
                      ➖
                    </button>
                    <button 
                      className="btn-plus"
                      onClick={() => addToCart(item)}
                    >
                      ➕
                    </button>
                  </div>
                </div>
              ))}
            </div>
            <div className="cart-total">
              <strong>Итого: {total} ₽</strong>
            </div>
            <button className="checkout-btn">💳 Оформить заказ</button>
          </>
        )}
      </div>
    </div>
  );
}

export default App;