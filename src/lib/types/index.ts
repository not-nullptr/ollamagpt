import type { Message } from "ollama";

export interface SavedChats {
	[id: string]: { name: string; messages: Message[]; docs?: string[] };
}

export interface ContextMenuButton {
	label: string;
	action: () => void;
}

export interface IContextMenu {
	x: number;
	y: number;
	buttons: ContextMenuButton[];
}
