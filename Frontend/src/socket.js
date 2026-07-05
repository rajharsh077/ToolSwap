// src/socket.js
import { io } from "socket.io-client";
import { socketUrl } from "./config";

const socket = io(socketUrl, {
  autoConnect: false,
});

export const connectSocket = (token) => {
  if (!socket.connected) {
    socket.auth = { token };
    socket.connect();
  }
};

export default socket;
