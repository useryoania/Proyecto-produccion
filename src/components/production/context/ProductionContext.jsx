import React, { createContext, useContext, useReducer} from 'react';
import { mockOrders, mockMachines } from '../../../data/mockData';

const ProductionContext = createContext();

const initialState = {
  orders: mockOrders,
  selectedOrders: [],
  currentRollFilter: 'ALL',
  isLoading: false,
  error: null
};

function productionReducer(state, action) {
  switch (action.type) {
    case 'SET_ORDERS':
      return { ...state, orders: action.payload };
    case 'TOGGLE_ORDER_SELECTION':
      const isSelected = state.selectedOrders.includes(action.payload);
      return {
        ...state,
        selectedOrders: isSelected
          ? state.selectedOrders.filter(id => id !== action.payload)
          : [...state.selectedOrders, action.payload]
      };
    case 'DESELECT_ALL_ORDERS':
      return { ...state, selectedOrders: [] };
    case 'SET_ROLL_FILTER':
      return { ...state, currentRollFilter: action.payload };
    default:
      return state;
  }
}

export const ProductionProvider = ({ children }) => {
  const [state, dispatch] = useReducer(productionReducer, initialState);

  const toggleOrderSelection = (orderId) => {
    dispatch({ type: 'TOGGLE_ORDER_SELECTION', payload: orderId });
  };

  const deselectAllOrders = () => {
    dispatch({ type: 'DESELECT_ALL_ORDERS' });
  };

  const setRollFilter = (rollId) => {
    dispatch({ type: 'SET_ROLL_FILTER', payload: rollId });
  };

  const createRoll = (selectedOrderIds) => {
    console.log('Creando rollo con órdenes:', selectedOrderIds);
    // Lógica para crear rollo
  };

  const value = {
    ...state,
    toggleOrderSelection,
    deselectAllOrders,
    setRollFilter,
    createRoll
  };

  return (
    <ProductionContext.Provider value={value}>
      {children}
    </ProductionContext.Provider>
  );
};

export const useProduction = () => {
  const context = useContext(ProductionContext);
  if (!context) {
    throw new Error('useProduction must be used within a ProductionProvider');
  }
  return context;
};