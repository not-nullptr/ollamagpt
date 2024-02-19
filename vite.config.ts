import { sveltekit } from "@sveltejs/kit/vite";
import { defineConfig, type PluginOption } from "vite";
import { nodePolyfills } from "vite-plugin-node-polyfills";

export default defineConfig({
	plugins: [sveltekit(), nodePolyfills()],
	server: {
		proxy: {
			"/api": "http://localhost:11434",
			"/db": "http://localhost:8000",
		},
	},
});
