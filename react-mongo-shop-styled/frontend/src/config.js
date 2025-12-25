export const API_URL = 'http://192.168.137.65:5000';
import { useEffect, useState } from 'react';
import { API_URL } from './config';

function Products() {
  const [products, setProducts] = useState([]);

  useEffect(() => {
    fetch(`${API_URL}/api/products`)
      .then(res => res.json())
      .then(data => setProducts(data))
      .catch(err => console.error(err));
  }, []);

  return (
    <div>
      {products.map(p => (
        <div key={p._id}>
          <h3>{p.name}</h3>
          <p>{p.price} ₽</p>
          <img src={p.images[0]} alt={p.name} width={200}/>
        </div>
      ))}
    </div>
  );
}

export default Products;
// Конфигурация приложения
export const CONFIG = {
    // URL API бэкенда
    API_URL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api',
    
    // Настройки для мобильного доступа
    MOBILE_ACCESS: {
        // Использовать IP адрес для доступа с мобильных устройств
        USE_IP: true,
        // Ваш локальный IP адрес (замените на свой)
        LOCAL_IP: '192.168.137.65',
        // Порт бэкенда
        PORT: 5000
    },
    
    // Настройки приложения
    APP: {
        NAME: 'TechStore',
        VERSION: '1.0.0',
        CURRENCY: '₸',
        DEFAULT_LANGUAGE: 'ru'
    },
    
    // Настройки API
    API: {
        TIMEOUT: 30000, // 30 секунд
        RETRY_ATTEMPTS: 3,
        CACHE_DURATION: 5 * 60 * 1000 // 5 минут
    },
    
    // Настройки корзины
    CART: {
        MAX_ITEMS: 100,
        LOCAL_STORAGE_KEY: 'techstore_cart'
    },
    
    // Настройки пользователя
    USER: {
        LOCAL_STORAGE_KEY: 'techstore_user',
        TOKEN_KEY: 'techstore_token'
    }
};

// Функция для получения базового URL API
export function getApiBaseUrl() {
    // Если мы на мобильном устройстве и разрешено использовать IP
    if (CONFIG.MOBILE_ACCESS.USE_IP && isMobileDevice()) {
        return `http://${CONFIG.MOBILE_ACCESS.LOCAL_IP}:${CONFIG.MOBILE_ACCESS.PORT}/api`;
    }
    
    // Иначе используем стандартный URL
    return CONFIG.API_URL;
}

// Функция для определения мобильного устройства
export function isMobileDevice() {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
}

// Функция для создания заголовков запроса
export function getHeaders(token = null) {
    const headers = {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
    };
    
    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }
    
    return headers;
}

// Функция для обработки ошибок API
export async function handleApiError(response) {
    if (!response.ok) {
        let errorMessage = 'Ошибка сервера';
        
        try {
            const errorData = await response.json();
            errorMessage = errorData.error || errorData.message || errorMessage;
        } catch (e) {
            // Не удалось распарсить JSON
        }
        
        throw new Error(errorMessage);
    }
    
    return response;
}