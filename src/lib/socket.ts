import { io, type Socket } from "socket.io-client";

/**
 * Cliente WebSocket (Socket.IO) como singleton a nivel de módulo.
 *
 * Mismo criterio de precaución que `failedQueue` / `isRefreshing` en
 * `axios.client.ts`: una única instancia compartida evita conexiones
 * duplicadas cuando React remonta efectos (StrictMode) o si el hook se
 * registrara desde más de un sitio.
 *
 * El WebSocket es ADITIVO: si no conecta, la app sigue funcionando por
 * REST/polling. Nada aquí debe lanzar ni bloquear la UI.
 */

const WS_BASE =
  process.env.NEXT_PUBLIC_WS_URL ||
  process.env.NEXT_PUBLIC_API_URL?.replace("/api/v1", "") ||
  "http://localhost:8001";

/** namespace confirmado por backend, mismo puerto HTTP, sin puerto extra */
const NAMESPACE = "/realtime";
const URL = `${WS_BASE}${NAMESPACE}`;

let socket: Socket | null = null;

/** Instancia actual (o null si nunca se conectó / se desconectó). */
export function getSocket(): Socket | null {
  return socket;
}

/**
 * Abre la conexión autenticada con el JWT. Si ya hay una conexión activa
 * no crea una segunda: solo devuelve la existente.
 */
export function connectSocket(token: string): Socket {
  if (socket?.connected) return socket;

  if (socket) {
    // Instancia previa desconectada: reutilizar con el token vigente.
    socket.auth = { token };
    socket.connect();
    return socket;
  }

  socket = io(URL, {
    auth: { token },
    transports: ["websocket"],
    autoConnect: true,
  });

  return socket;
}

/** Cierra y descarta la instancia (logout / unmount del hook). */
export function disconnectSocket(): void {
  if (!socket) return;
  socket.removeAllListeners();
  socket.disconnect();
  socket = null;
}

/**
 * Tras renovar el access token: mismo socket, credencial nueva.
 * `disconnect()` + `connect()` fuerza el handshake con el token fresco.
 */
export function reconnectWithToken(token: string): void {
  if (!socket) return;
  socket.auth = { token };
  socket.disconnect();
  socket.connect();
}
