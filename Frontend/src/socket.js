// src/socket.js
import { io } from "socket.io-client";

// ✅ Make ONE socket for the whole app
const socket = io("http://localhost:3000", {
  autoConnect: false, // don't connect until we attach auth
});

// optional helper to connect with auth token
export const connectSocket = (token) => {
  if (!socket.connected) {
    socket.auth = { token }; // will be sent in handshake
    socket.connect();
  }
};

export default socket;
