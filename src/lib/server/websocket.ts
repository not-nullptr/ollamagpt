import type { ViteDevServer } from "vite";
import { WebSocketServer } from "ws";

export const configureServer = (server: ViteDevServer) => {
	const webSocketServer = new WebSocketServer({
		server: server.httpServer as any,
	});

	webSocketServer.on("connection", (socket, request) => {
		socket.on("message", (data, isBinary) => {
			console.log(`Recieved ${data}`);
		});

		socket.send("test from server");
	});
};

export const webSocketServer = {
	name: "webSocketServer",
	configureServer,
};
