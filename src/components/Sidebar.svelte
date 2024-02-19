<script lang="ts">
	import { createEventDispatcher, onMount, setContext } from "svelte";
	import ollamaIcon from "$lib/image/icon/ollama.png";
	import Edit from "./icons/Edit.svelte";
	import ollama, { type Message } from "ollama";
	import { v4 } from "uuid";
	import Ellipsis from "./icons/Ellipsis.svelte";
	import type { SavedChats } from "$lib/types";
	import DeleteFile from "./icons/DeleteFile.svelte";
	let history: SavedChats = {};

	const dispatch = createEventDispatcher<{ newchat: undefined }>();

	onMount(() => {
		const localHistory = localStorage.getItem("history");
		if (!localHistory) localStorage.setItem("history", "{}");
		history = JSON.parse(localHistory || "{}");
	});

	function updateHistory(newHistory: SavedChats) {
		localStorage.setItem("history", JSON.stringify(newHistory));
		history = newHistory;
	}

	export let setSelectedChat: (id: string) => void = () => {};
	export let selectedChat: string | null = null;

	export { updateHistory };
</script>

<div class="sidebar">
	<div class="chats">
		<button
			on:click={() => dispatch("newchat")}
			class="btn-sidebar new-chat">
			<img src={ollamaIcon} alt="ollama" />
			<span>New chat</span>
			<Edit width={18} height={18} />
		</button>
		<h1 class="chat-header">Chats</h1>
		{#each Object.entries(history).reverse() as [id, { name, messages }]}
			<button
				class={`btn-sidebar chat-btn ${selectedChat === id ? "selected" : ""}`}
				on:click={() => setSelectedChat(id)}>
				<span>{name}</span>
				<div class="btn-sidebar-actions">
					<Ellipsis hoverEffect width={18} height={18} />
				</div>
			</button>
		{/each}
	</div>
	<div class="footer">
		<button
			on:click={() => {
				localStorage.setItem("history", "{}");
				history = {};
			}}
			class="btn-sidebar new-chat">
			<span>Clear chats</span>
			<DeleteFile size={18} />
		</button>
	</div>
</div>

<style>
	.sidebar {
		width: 260px;
		height: 100vh;
		background-color: #f9f9f9;
		box-sizing: border-box;
		display: flex;
		flex-direction: column;
		padding: 0.875rem 0.75rem;
		display: flex;
		flex-direction: column;
	}

	.chat-header {
		color: rgb(155, 155, 155);
		font-size: 12px;
		font-weight: 500;
		font-family: "Sohne Kraftig";
		padding: 0.5rem;
		padding-bottom: 0;
	}

	.chats {
		flex-grow: 1;
		overflow-y: auto;
	}

	.footer {
		flex-shrink: 0;
		margin-top: 8px;
		height: fit-content;
	}

	.btn-sidebar.new-chat {
		height: 40px;
		transition: 0.1s transform ease;
		margin-bottom: 25px;
	}

	.new-chat:active {
		transform: scale(0.98);
	}

	.new-chat > img {
		width: 28px;
		height: 28px;
		object-fit: contain;
		background-color: white;
		border-radius: 999px;
		border: solid thin rgb(227, 227, 227);
	}

	.new-chat > span {
		font-family: "Sohne Kraftig";
		margin-left: 6px;
	}

	.btn-sidebar > span {
		font-size: 14px;
		flex-grow: 1;
		white-space: nowrap;
		text-overflow: ellipsis;
		overflow: hidden;
	}

	.btn-sidebar {
		border-radius: 0.5rem;
		text-align: left;
		display: flex;
		align-items: center;
		background-color: transparent;
		border: none;
		cursor: pointer;
		width: 100%;
		height: 36px;
	}

	.btn-sidebar-actions {
		margin-right: 2px;
		margin-top: 2px;
		padding-left: 4px;
		display: none;
	}

	.btn-sidebar:hover > .btn-sidebar-actions,
	.btn-sidebar.selected > .btn-sidebar-actions {
		display: block;
	}

	.btn-sidebar:hover,
	.btn-sidebar.selected {
		background-color: #ececec;
	}

	@media (max-width: 768px) {
		.sidebar {
			display: none;
		}
	}
</style>
