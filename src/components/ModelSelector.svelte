<script lang="ts">
	import type { ListResponse, ModelResponse, ProgressResponse } from "ollama";
	import { getContext, onMount, setContext, tick } from "svelte";
	import Dropdown from "./icons/Dropdown.svelte";
	import Sparkle from "./icons/Sparkle.svelte";
	import Check from "./icons/Check.svelte";
	import {
		formatBytes,
		getModelDetails,
		getModelName,
		sentenceCase,
	} from "$lib/util";
	import { ollama } from "$lib/util";
	import { type IContextMenu } from "$lib/types";
	import FuzzySearch from "fuzzy-search";
	import type { Writable } from "svelte/store";
	import { useModels } from "$lib/util/store";
	import ProgressRing from "./ProgressRing.svelte";
	import Download from "./icons/Download.svelte";
	import ProgressBar from "@okrad/svelte-progressbar";
	import moment from "moment";

	let value = "";
	let models = useModels();
	export let selectedModel: number | null = $models.length > 0 ? 0 : null;
	onMount(() => {
		if ($models.length > 0) {
			// selectedModel = localStorage.getItem("selectedModel")
			// 	? parseInt(localStorage.getItem("selectedModel") || "0")
			// 	: 0;
			if (localStorage.getItem("selectedModel")) {
				selectedModel = parseInt(
					localStorage.getItem("selectedModel") || "0",
				);
			} else {
				selectedModel = 0;
				localStorage.setItem("selectedModel", "0");
			}
		} else {
			selectedModel = null;
			localStorage.removeItem("selectedModel");
		}
	});
	let dropdownOpen = false;
	let progress:
		| (ProgressResponse & {
				name: string;
		  })
		| null = null;
	let gettableModels: {
		name: string;
		description: string;
		downloads: number;
		tagCount: number;
		lastUpdate: Date;
	}[] = [];
	let tags: {
		name: string;
		size: string;
		hash: string;
		date: Date;
	}[] = [];
	let searchResults: typeof gettableModels = [];
	let target: HTMLInputElement;

	const showContextMenu: (options: IContextMenu) => void =
		getContext("showContextMenu");
	const hideContextMenu: () => void = getContext("hideContextMenu");

	function findParentWithClass(element: HTMLElement, className: string) {
		if (element.classList.contains(className)) return element;
		if (element.parentElement)
			return findParentWithClass(element.parentElement, className);
		return null;
	}

	onMount(async () => {
		const res = await (await fetch("/server/library")).json();
		gettableModels = res;
		console.log(gettableModels);
	});

	onMount(() => {
		function windowClick(e: MouseEvent) {
			maybeToggle(e, true);
		}
		window.addEventListener("mousedown", windowClick);
		return () => window.removeEventListener("mousedown", windowClick);
	});

	function maybeToggle(e: MouseEvent, closing?: boolean) {
		if (!closing) {
			if (!dropdownOpen) return (dropdownOpen = true);
		}
		const _target = e.target as HTMLElement;
		// if the element has a parent with class "dropdown", don't close
		if (
			findParentWithClass(_target, "dropdown") ||
			findParentWithClass(_target, "model-container") ||
			findParentWithClass(_target, "context-menu")
		)
			return;
		if (closing) {
			if (findParentWithClass(_target, "selector")) return;
		}
		dropdownOpen = false;
		searchResults = [];
		tags = [];
		target.value = "";
	}

	function setModels(newModels: ListResponse) {
		models.set(newModels.models);
	}

	function runAutocomplete(value: string) {
		if (value.trim() === "") {
			searchResults = [];
			return;
		}
		const searcher = new FuzzySearch(
			gettableModels,
			["name", "description"],
			{
				caseSensitive: false,
			},
		);
		searchResults = searcher.search(value);
	}

	function getNewInputValue(e: KeyboardEvent) {
		let newValue = (e.target as HTMLInputElement).value;
		const target = e.target as any;
		let valueArray = newValue.split("");
		const selectionLength = target.selectionEnd - target.selectionStart;
		if (e.key === "Backspace") {
			if (selectionLength === 0 && target.selectionStart > 0) {
				valueArray.splice(
					target.selectionStart - 1,
					selectionLength + 1,
				);
			} else {
				valueArray.splice(target.selectionStart, selectionLength);
			}
		} else if (e.key === "Delete") {
			if (selectionLength === 0) {
				valueArray.splice(target.selectionStart, selectionLength + 1);
			} else {
				valueArray.splice(target.selectionStart, selectionLength);
			}
		} else if (e.key.length === 1 && !e.ctrlKey && !e.metaKey) {
			valueArray.splice(target.selectionStart, selectionLength, e.key);
		}
		newValue = valueArray.join("");
		return newValue;
	}

	async function keyDown(e: KeyboardEvent) {
		const target = e.target as HTMLInputElement;
		if (e.key !== "Enter" || target.value.trim() === "") {
			tags = [];
			return runAutocomplete(getNewInputValue(e));
		}
	}

	async function downloadModel(name: string) {
		target.disabled = true;
		searchResults = [];
		tags = [];
		const res = await ollama.pull({
			model: name.trim(),
			stream: true,
		});
		target.value = "";
		for await (const chunk of res) {
			progress = {
				...chunk,
				name,
			};
		}
		target.disabled = false;
		const oldModels = $models;
		const newModels = await ollama.list();
		setModels(newModels);
		progress = null;
		// get the index of the model which is in the new models but not in the old models
		const newModelIndex = newModels.models.findIndex(
			(newModel) =>
				!oldModels.some((oldModel) => oldModel.name === newModel.name),
		);
		setModel(newModelIndex);
	}

	function setModel(modelIndex: number) {
		selectedModel = modelIndex;
		localStorage.setItem("selectedModel", modelIndex.toString());
	}

	async function showTags(name: string) {
		const names = $models.map((m) => m.name);
		const namesWithTags = $models.map(
			(model) =>
				`${model.name.split(":")[0]}:${model.details.parameter_size.toLowerCase()}`,
		);
		const res: typeof tags = await (
			await fetch(`/server/tags/${name}`)
		).json();
		tags = res
			.map((tag) => ({
				...tag,
				name: `${name}:${tag.name}`,
				date: new Date(tag.date),
			}))
			.filter(
				(tag) =>
					!names.includes(tag.name) &&
					!namesWithTags.includes(tag.name.toLowerCase()),
			);
		value = sentenceCase(name);
		target.value = sentenceCase(name);
	}

	async function contextMenu(e: MouseEvent, selModel: number) {
		e.preventDefault();
		showContextMenu({
			x: e.clientX,
			y: e.clientY,
			buttons: [
				{
					label: `Delete ${getModelName($models[selModel])}`,
					action: async () => {
						await ollama.delete({
							model: $models[selModel].name,
						});
						if (selectedModel === selModel) {
							if (selectedModel === 0 || $models.length === 1) {
								setModel(0);
							} else {
								setModel(selModel - 1);
							}
						}
						setModels(await ollama.list());
					},
				},
			],
		});
	}
</script>

<div class="model-selector">
	<div
		on:click={maybeToggle}
		class={`selector ${dropdownOpen ? "open" : ""}`}>
		{#if selectedModel !== null && typeof $models[selectedModel] !== "undefined"}
			<span class="model-name">
				{getModelName($models[selectedModel])}
			</span>
			<span class="model-version">
				{$models[selectedModel].details.parameter_size}
			</span>
		{:else}
			<span class="model-version">Select a model</span>
		{/if}
		<Dropdown color="#9b9b9b" width={16} height={17} />
		<div
			class="dropdown"
			style={`display: ${dropdownOpen ? "block" : "none"}`}>
			<div class="models-container">
				{#each $models as model, i}
					<div
						class="model-container"
						on:click={() => setModel(i)}
						on:contextmenu={(e) => contextMenu(e, i)}>
						<Sparkle width={18} height={18} />
						<div class="dropdown-model-info">
							<div class="dropdown-model-name">
								{getModelName(model)}
								{model.details.parameter_size}
							</div>

							<div class="dropdown-model-details">
								{getModelDetails(model)}
							</div>
						</div>
						<Check
							width={18}
							height={18}
							checked={selectedModel === i} />
					</div>
				{/each}
				{#if progress}
					<div class="progress model-container">
						<Download width={16} height={16} />
						<div class="dropdown-model-info">
							<div class="dropdown-model-name">
								{sentenceCase(progress.name)}
							</div>
							<div class="dropdown-model-details">
								{progress.status}...
								<br />
								({formatBytes(progress.completed || 0)} / {formatBytes(
									progress.total || 0,
								)})
							</div>
						</div>
						<ProgressBar
							width={20}
							series={[
								{
									perc:
										(progress.completed / progress.total ||
											0) * 100,
									color: "#000000",
								},
							]}
							style="radial"
							showProgressValue={false}
							thickness={12}
							bgColor="#d6d6d6" />
					</div>
				{/if}
			</div>
			<input
				type="text"
				on:keydown={keyDown}
				bind:this={target}
				class={`download ${searchResults.length > 0 ? "search" : ""}`}
				placeholder="Download a model..." />
			{#if tags.length > 0}
				<div class="selector-autocomplete">
					<div class="model-container" on:click={() => (tags = [])}>
						<div class="dropdown-model-info">
							<div class="dropdown-model-name">Go back</div>
							<div class="dropdown-model-details">
								Go back and view all models
							</div>
						</div>
					</div>
					{#each tags as tag}
						<div
							class="model-container"
							on:click={() => downloadModel(tag.name)}>
							<div class="dropdown-model-info">
								<div class="dropdown-model-name">
									{tag.name}
								</div>
								<div class="dropdown-model-details">
									{tag.hash} • {tag.size} • {moment(
										tag.date,
									).fromNow()}
								</div>
							</div>
						</div>
					{/each}
				</div>
			{:else if searchResults.length > 0}
				<div class="selector-autocomplete">
					{#each searchResults as model, i}
						<div
							class="model-container"
							on:click={() => showTags(model.name)}>
							<div class="dropdown-model-info">
								<div class="dropdown-model-name">
									{model.name}
								</div>
								<div class="dropdown-model-details">
									{model.description}
								</div>
							</div>
						</div>
					{/each}
				</div>
			{/if}
		</div>
	</div>
</div>

<style>
	.progress > .dropdown-model-info {
		width: 100%;
	}

	.selector-autocomplete {
		z-index: 6;
		position: absolute;
		top: calc(100% - 14px);
		left: 14px;
		width: calc(100% - 30px);
		height: fit-content;
		max-height: calc(100vh - 150%);
		overflow-y: auto;
		border: solid thin #cccccc;
		border-top: none;
		border-radius: 0 0 4px 4px;
		background-color: white;
		box-shadow: 0 8px 24px 0 rgba(0, 0, 0, 0.25);
	}

	.selector-autocomplete > .model-container:first-child {
		border-radius: 0 0 4px 4px;
	}

	.model-container > :global(svg) {
		flex-shrink: 0;
	}

	.selector {
		z-index: 5;
		position: relative;
		top: 0;
		left: 0;
		font-size: 1.125rem;
		line-height: 1.75rem;
		width: fit-content;
		height: fit-content;
		user-select: none;
		margin: 6px 8px;
		padding: 0.5rem 0.75rem;
		border-radius: 0.75rem;
		gap: 0.25rem;
		cursor: pointer;
		display: flex;
		align-items: center;
		background-color: white;
	}

	.selector:hover,
	.selector.open {
		background-color: #f9f9f9;
	}

	.model-name {
		font-family: "Sohne Kraftig";
	}

	.model-version {
		font-family: "Sohne Kraftig";
		color: #676767;
	}

	.models-container {
		max-height: 40vh;
		overflow-y: auto;
	}

	.dropdown {
		gap: 6px;
		padding: 6px;
		box-sizing: border-box;
		position: absolute;
		top: calc(100% + 8px);
		left: 0;
		width: 340px;
		height: fit-content;
		box-shadow:
			rgba(0, 0, 0, 0) 0px 0px 0px 0px,
			rgba(0, 0, 0, 0) 0px 0px 0px 0px,
			rgba(0, 0, 0, 0.1) 0px 10px 15px -3px,
			rgba(0, 0, 0, 0.1) 0px 4px 6px -4px;
		border-radius: 8px;
		border: solid thin rgba(0, 0, 0, 0.1);
		line-height: 20px;
		background-color: white;
		cursor: default;
	}

	.dropdown-model-info {
		font-size: 14px;
		margin-left: 12px;
		box-sizing: border-box;
		padding-right: 12px;
	}

	.dropdown-model-details {
		color: #9b9b9b;
	}

	.model-container {
		border-radius: 4px;
		box-sizing: border-box;
		padding: 0.625rem;
		padding-right: 0.75rem;
		display: flex;
		align-items: center;
		min-height: 60px;
		cursor: pointer;
	}

	.model-container:hover {
		background-color: #ececec;
	}

	.download {
		font-size: 14px;
		border: solid thin #ccc;
		border-radius: 4px;
		padding: 8px 10px;
		width: calc(100% - 38px);
		margin: 8px;
		margin-top: 14px;
		position: relative;
		z-index: 50;
	}

	.download.search {
		border-radius: 4px 4px 0 0;
		border-bottom: none;
	}

	.download:focus {
		outline: none;
	}
</style>
