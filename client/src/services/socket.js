import { io } from 'socket.io-client';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || window.location.origin;

let socket = null;

export const getSocket = () => {
  if (!socket) {
    socket = io(SOCKET_URL, { autoConnect: false, transports: ['websocket', 'polling'] });
  }
  return socket;
};

export const connectSocket = () => {
  const s = getSocket();
  if (!s.connected) s.connect();
  return s;
};

export const disconnectSocket = () => {
  if (socket?.connected) socket.disconnect();
};

export const joinRestaurant = (slug) => {
  const s = connectSocket();
  s.emit('join-restaurant', slug);
};

export const joinKitchen = (slug) => {
  const s = connectSocket();
  s.emit('join-kitchen', slug);
};

export const joinTable = (slug, tableNumber) => {
  const s = connectSocket();
  s.emit('join-table', { restaurantSlug: slug, tableNumber });
};
