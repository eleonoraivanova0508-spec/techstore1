// src/components/Products.jsx
import React, { useEffect, useState } from 'react';

// Здесь указываем IP компьютера с backend и порт 5000
const API_URL = 'http://192.168.1.105:5000'; // твой IP и порт backend

fetch(`${API_URL}/api/products`)
  .then(res => res.json())
  .then(data => setProducts(data))
  .catch(err => console.error(err));


  if (loading) return <p>Загрузка товаров...</p>;

  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '20px' }}>
      {products.map(p => (
        <div 
          key={p._id} 
          style={{ 
            border: '1px solid #ccc', 
            borderRadius: '8px', 
            padding: '10px', 
            width: '200px' 
          }}
        >
          <img 
            src={p.images[0]} 
            alt={p.name} 
            style={{ width: '100%', borderRadius: '5px' }} 
          />
          <h3 style={{ fontSize: '16px', margin: '10px 0 5px' }}>{p.name}</h3>
          <p style={{ fontWeight: 'bold' }}>{p.price} ₽</p>
        </div>
      ))}
    </div>
  );


export default Products;
