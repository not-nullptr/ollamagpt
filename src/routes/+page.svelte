<script lang="ts">
	import { ollama } from "$lib/util";
	import type { PageData } from "./$types";
	import Sidebar from "../components/Sidebar.svelte";
	import Chat from "../components/Chat.svelte";
	import { setContext } from "svelte";
	import type { SavedChats } from "$lib/types";
	import { useModels } from "$lib/util/store";
	export let data: PageData;
	let selectedChat: string | null = null;

	const models = useModels();
	models.set(data.list.models);
	setContext("hostname", data.hostname);

	let updateHistory: (newHistory: SavedChats) => void = () => {};
	let setSelectedChat: (id: string | null) => void = () => {};

	function newChat(e: CustomEvent) {
		setSelectedChat(null);
	}
</script>

<div class="page">
	<Sidebar
		{selectedChat}
		on:newchat={newChat}
		bind:updateHistory
		{setSelectedChat} />
	<Chat {updateHistory} bind:setSelectedChat bind:selectedChat />
</div>

<style>
	.page {
		display: flex;
		width: 100%;
		height: 100%;
	}
</style>
