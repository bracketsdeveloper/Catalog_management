// context/CartContext.js
'use client';
import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';

const CartContext = createContext(null);

// Custom hook to use CartContext
export function useCart() {
  return useContext(CartContext);
}

export function CartProvider({ children }) {
  const [cartItems, setCartItems] = useState([]);

  // Optionally load cart on mount, if there's a token
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      fetchCartItems();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Fetch cart items from backend
  const fetchCartItems = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      const response = await axios.get('http://localhost:5000/api/cart', {
        headers: { Authorization: `Bearer ${token}` },
      });
      setCartItems(response.data);
    } catch (error) {
      console.error('Error fetching cart items:', error);
    }
  };

  // Example: remove from cart
  const removeFromCart = async (itemId) => {
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`http://localhost:5000/api/cart/${itemId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      // After deletion, refetch cart
      fetchCartItems();
    } catch (error) {
      console.error('Error removing item from cart:', error);
    }
  };

  // Example: add to cart
  const addToCart = async (payload) => {
    try {
      const token = localStorage.getItem('token');
      await axios.post('http://localhost:5000/api/cart', payload, {
        headers: { Authorization: `Bearer ${token}` },
      });
      // After addition, refetch cart
      fetchCartItems();
    } catch (error) {
      console.error('Error adding item to cart:', error);
    }
  };

  // Provide cart data and actions to children
  const value = {
    cartItems,
    fetchCartItems,
    addToCart,
    removeFromCart,
  };

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}
