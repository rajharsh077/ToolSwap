const apiBaseUrl = import.meta.env.VITE_API_URL || "http://localhost:3000";
const socketUrl = import.meta.env.VITE_SOCKET_URL || apiBaseUrl;

export { apiBaseUrl, socketUrl };
