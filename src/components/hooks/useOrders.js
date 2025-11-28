import { useState, useEffect } from 'react';
import { ordersService } from '../services/ordersService';

export const useOrders = (filters = {}) => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadOrders();
  }, [filters]);

  const loadOrders = async () => {
    try {
      setLoading(true);
      const data = await ordersService.getByFilters(filters);
      setOrders(data);
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const createOrder = async (orderData) => {
    try {
      const newOrder = await ordersService.create(orderData);
      setOrders(prev => [...prev, newOrder]);
      return newOrder;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  };

  const updateOrder = async (orderId, updates) => {
    try {
      const updatedOrder = await ordersService.update(orderId, updates);
      setOrders(prev => prev.map(order => 
        order.id === orderId ? updatedOrder : order
      ));
      return updatedOrder;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  };

  const deleteOrder = async (orderId) => {
    try {
      await ordersService.delete(orderId);
      setOrders(prev => prev.filter(order => order.id !== orderId));
    } catch (err) {
      setError(err.message);
      throw err;
    }
  };

  return {
    orders,
    loading,
    error,
    createOrder,
    updateOrder,
    deleteOrder,
    reload: loadOrders
  };
};