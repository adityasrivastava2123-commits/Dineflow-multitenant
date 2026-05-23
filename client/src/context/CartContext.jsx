import { createContext, useContext, useReducer, useEffect } from 'react';

const CartContext = createContext(null);

const cartReducer = (state, action) => {
  switch (action.type) {
    case 'ADD_ITEM': {
      const existing = state.items.find((i) => i._id === action.item._id);
      if (existing) {
        return {
          ...state,
          items: state.items.map((i) =>
            i._id === action.item._id ? { ...i, quantity: i.quantity + 1 } : i
          ),
        };
      }
      return { ...state, items: [...state.items, { ...action.item, quantity: 1, specialInstructions: '' }] };
    }
    case 'REMOVE_ITEM': {
      const existing = state.items.find((i) => i._id === action.id);
      if (existing?.quantity > 1) {
        return {
          ...state,
          items: state.items.map((i) =>
            i._id === action.id ? { ...i, quantity: i.quantity - 1 } : i
          ),
        };
      }
      return { ...state, items: state.items.filter((i) => i._id !== action.id) };
    }
    case 'DELETE_ITEM':
      return { ...state, items: state.items.filter((i) => i._id !== action.id) };
    case 'UPDATE_INSTRUCTIONS':
      return {
        ...state,
        items: state.items.map((i) =>
          i._id === action.id ? { ...i, specialInstructions: action.instructions } : i
        ),
      };
    case 'CLEAR_CART':
      return { ...state, items: [] };
    case 'SET_RESTAURANT':
      return { ...state, restaurantSlug: action.slug, tableNumber: action.tableNumber };
    default:
      return state;
  }
};

const CART_KEY = 'dineflow_cart';

export const CartProvider = ({ children }) => {
  const [state, dispatch] = useReducer(cartReducer, { items: [], restaurantSlug: null, tableNumber: null }, (init) => {
    try {
      const saved = localStorage.getItem(CART_KEY);
      return saved ? JSON.parse(saved) : init;
    } catch {
      return init;
    }
  });

  useEffect(() => {
    localStorage.setItem(CART_KEY, JSON.stringify(state));
  }, [state]);

  const itemCount = state.items.reduce((sum, i) => sum + i.quantity, 0);
  const subtotal = state.items.reduce((sum, i) => sum + i.price * i.quantity, 0);

  const getQuantity = (id) => state.items.find((i) => i._id === id)?.quantity || 0;

  return (
    <CartContext.Provider value={{ ...state, itemCount, subtotal, dispatch, getQuantity }}>
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used within CartProvider');
  return ctx;
};
