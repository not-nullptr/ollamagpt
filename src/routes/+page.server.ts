import { ollama } from "$lib/util";

export async function load({ fetch }) {
	const list = await ollama.list();
	const hostname = (await (await fetch("/server/hostname")).json())
		.hostname as string;
	return {
		list,
		hostname,
	};
}
