<script lang="ts">
	import type { IContextMenu } from "$lib/types";
	import { onMount, setContext } from "svelte";

	let contextMenu: IContextMenu | null = null;

	function showContextMenu(options: IContextMenu) {
		contextMenu = options;
	}

	function hideContextMenu() {
		contextMenu = null;
	}

	setContext("showContextMenu", showContextMenu);
	setContext("hideContextMenu", hideContextMenu);

	onMount(() => {
		function windowClick(e: MouseEvent) {
			const target = e.target as HTMLElement;
			if (target.closest(".context-menu")) return;
			hideContextMenu();
		}
		window.addEventListener("mousedown", windowClick);
		return () => window.removeEventListener("mousedown", windowClick);
	});
</script>

{#if contextMenu}
	<div
		class="context-menu"
		style={`top: ${contextMenu.y}px; left: ${contextMenu.x}px;`}>
		{#each contextMenu.buttons as button}
			<button
				on:click={() => {
					button.action();
					hideContextMenu();
				}}>
				{button.label}
			</button>
		{/each}
	</div>
{/if}
<slot />

<style>
	.context-menu {
		position: fixed;
		top: 0;
		left: 0;
		width: fit-content;
		height: fit-content;
		z-index: 100;
		background-color: white;
		border: solid thin #ccc;
		border-radius: 8px;
		overflow: hidden;
		box-shadow: 0px 8px 24px 0px rgba(0, 0, 0, 0.25);
	}
	.context-menu > button {
		border-radius: 8px;
		border: none;
		font-size: 14px;
		padding: 6px 12px 6px 12px;
		text-align: left;
		cursor: pointer;
		background-color: transparent;
	}

	.context-menu > button:hover {
		background-color: #ececec;
	}

	.context-menu > button:first-child {
		border-radius: 8px 8px 0 0;
	}

	.context-menu > button:last-child {
		border-radius: 0 0 8px 8px;
	}
</style>
