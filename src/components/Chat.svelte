<script lang="ts">
	import {
		type ListResponse,
		type Message,
		type ModelResponse,
	} from "ollama";
	import ModelSelector from "./ModelSelector.svelte";
	import { SvelteComponent, getContext, onMount, tick } from "svelte";
	import { getModelName } from "$lib/util";
	import { ollama } from "$lib/util";
	import ollamaIcon from "$lib/image/icon/ollama.png";
	import sohne from "$lib/font/sohne/sohne.woff2";
	import sohneKraftig from "$lib/font/sohne/sohne-kraftig.woff2";
	import sohneHalbfett from "$lib/font/sohne/sohne-halbfett.woff2";
	import type { IContextMenu, SavedChats } from "$lib/types";
	import { v4 } from "uuid";
	import UpArrow from "./icons/UpArrow.svelte";
	import SvelteMarkdown from "svelte-markdown";
	import { useModels } from "$lib/util/store";
	import Attachment from "./icons/Attachment.svelte";
	import mammoth from "mammoth";
	import DeleteFile from "./icons/DeleteFile.svelte";
	import { RAG, RAGTemplate } from "$lib/util/rag";
	import YouTube from "./icons/YouTube.svelte";
	import File from "./icons/File.svelte";

	export let selectedChat: string | null = null;
	export let updateHistory: (newHistory: SavedChats) => void = () => {};
	let models = useModels();
	export let selectedModel = $models.length > 0 ? 0 : null;
	let hostname: string = getContext("hostname") || "";
	let messages: (Message & {
		unfinished?: boolean;
		attachments?: string[];
	})[] = [];
	let textArea: HTMLTextAreaElement;
	let messagesContainer: HTMLDivElement;
	let value: string = "";
	let attachments: {
		name: string;
		data: string;
		type: keyof typeof RAG | "image";
	}[] = [];
	let videoURLs: string[] = [];
	let videos: {
		title: string;
		transcript: string;
		url: string;
	}[] = [];

	let genericURLs: string[] = [];
	let sites: {
		title: string;
		url: string;
		content: string;
	}[] = [];

	let streaming = false;
	let attachmentsOpen = false;

	// const youtubeButtons: typeof defaultButtons = [
	// 	{
	// 		type: "input",
	// 		text: "Video link",
	// 		onsubmit: attachVideo,
	// 	},
	// ];

	const defaultButtons: {
		icon?: any;
		text: string;
		type: "input" | "button";
		onsubmit?: (val: string) => void | Promise<void>;
		followUp?: typeof defaultButtons;
		doesntHide?: boolean;
	}[] = [
		{
			text: "File (image or document)",
			type: "button",
			onsubmit: attachFile,
			icon: File,
		},
	];

	let buttons: typeof defaultButtons = defaultButtons;

	$: if (
		selectedModel !== null &&
		messages.length === 1 &&
		typeof selectedModel === "number" &&
		typeof $models[selectedModel] !== "undefined"
	) {
		messages = [
			{
				role: "system",
				content: `You are ${getModelName($models[selectedModel])}, a helpful AI assistant. Keep responses short and to the point. If you need to, you can ask for more information.`,
			},
		];
	}

	const showContextMenu: (options: IContextMenu) => void =
		getContext("showContextMenu");

	onMount(() => {
		messages = JSON.parse(localStorage.getItem("history") || "{}")[
			selectedChat || ""
		]?.messages || [
			{
				role: "system",
				content: `You are ${typeof selectedModel !== "number" || typeof $models[selectedModel] === "undefined" ? "" : getModelName($models[selectedModel])}, a helpful AI assistant. Keep responses short and to the point. If you need to, you can ask for more information.`,
			},
		];
	});

	async function generateName(messages: Message[]) {
		if (
			!selectedChat ||
			selectedModel === null ||
			typeof selectedModel === "undefined" ||
			typeof $models[selectedModel] === "undefined"
		)
			return;
		// do stuff relating to localstorage, etc
		console.log("generating summary");
		const res = await ollama.chat({
			messages: [
				{
					role: "system",
					content:
						"Do not include anything else. Describe the content of the provided paragraph in 5 words or less. End with two newlines. Do not include any additional information or context.",
				},
				{
					role: "user",
					content: "Hello, world!",
				},
				{
					role: "assistant",
					content: "Greeting",
				},
				{
					role: "user",
					content: "Why is the sky blue?",
				},
				{
					role: "assistant",
					content: "Sky Color Inquiry",
				},
				{
					role: "user",
					content: "What is the meaning of life?",
				},
				{
					role: "assistant",
					content: "Purpose Of Life",
				},
				{
					role: "user",
					content: messages[1].content + " " + messages[2].content,
				},
			],
			model: $models[selectedModel].name,
			stream: false,
		});
		console.log(res.message.content.split("\n")[0].replaceAll("[", ""));
		const history: SavedChats = JSON.parse(
			localStorage.getItem("history") || "{}",
		);
		history[selectedChat].name = res.message.content
			.split("\n")[0]
			.replaceAll("[", "");
		updateHistory(history);
	}

	function getNewInputValue(e: any) {
		let newValue = e.target.value;
		let valueArray = newValue.split("");
		const selectionLength = e.target.selectionEnd - e.target.selectionStart;
		if (e.key === "Backspace") {
			if (selectionLength === 0 && e.target.selectionStart > 0) {
				valueArray.splice(
					e.target.selectionStart - 1,
					selectionLength + 1,
				);
			} else {
				valueArray.splice(e.target.selectionStart, selectionLength);
			}
		} else if (e.key === "Delete") {
			if (selectionLength === 0) {
				valueArray.splice(e.target.selectionStart, selectionLength + 1);
			} else {
				valueArray.splice(e.target.selectionStart, selectionLength);
			}
		} else {
			valueArray.splice(e.target.selectionStart, selectionLength, e.key);
		}
		newValue = valueArray.join("");
		return newValue;
	}

	function setSelectedChat(id: string | null) {
		if (!id) {
			selectedChat = null;
			messages = [messages[0]];
			return;
		}
		const history = JSON.parse(localStorage.getItem("history") || "{}");
		if (!history[id]) return;
		selectedChat = id;
		messages = history[id].messages;
		tick().then(() => {
			messagesContainer.scrollTop = messagesContainer.scrollHeight;
		});
	}

	async function sendMessage(message: { content: string }) {
		if (
			selectedModel === null ||
			typeof selectedModel === "undefined" ||
			typeof $models[selectedModel] === "undefined"
		)
			return;
		let newMessages: typeof messages = [
			...messages,
			...attachments
				.filter((a) => a.type !== "image")
				.map((a) => ({
					role: "system",
					content: RAGTemplate(a.data, a.type as keyof typeof RAG),
				})),
			...videos.map((v) => ({
				role: "system",
				content: RAGTemplate(
					`Title: ${v.title}\nTranscript: ${v.transcript}`,
					"youtube",
				),
			})),
			...sites.map((s) => ({
				role: "system",
				content: RAGTemplate(
					`Title: ${s.title}\nContent: ${s.content}`,
					"site",
				),
			})),
			{
				role: "user",
				...message,
				images: attachments
					.filter((a) => a.type === "image")
					.map((a) => a.data),
				attachments: [
					...attachments
						.filter((a) => a.type !== "image")
						.map((a) => a.name),
					...videos.map((v) => v.url),
					...genericURLs,
				],
			},
			{ role: "assistant", content: "", unfinished: true },
		];
		console.log(newMessages);
		if (messages.length === 1) {
			const id = v4();
			updateHistory({
				...JSON.parse(localStorage.getItem("history") || "{}"),
				[id]: {
					name:
						attachments?.length > 0
							? attachments.map((a) => a.name).join(", ")
							: "New chat",
					messages: newMessages,
				},
			});
			console.log("!!!");
			selectedChat = id;
		}
		attachments = [];
		messages = [...newMessages];
		streaming = true;
		await tick();
		messagesContainer.scrollTop = messagesContainer.scrollHeight;
		let chatResponse = "";

		const res = await ollama.chat({
			messages: newMessages.map((m) => ({
				...m,
				images: m.images?.map((i) => (i as string).split(",")[1]),
			})),
			model: $models[selectedModel].name,
			stream: true,
		});

		for await (const part of res) {
			await tick();
			// get last element of class .message-body
			const el = Array.from(
				messagesContainer.querySelectorAll(".message-body"),
			).at(-1) as HTMLDivElement;
			function getRecursiveLastChild(el: Element) {
				if (el.lastElementChild) {
					return getRecursiveLastChild(el.lastElementChild);
				}
				return el as HTMLElement;
			}
			const lastChild = getRecursiveLastChild(el);
			console.log(lastChild);
			// remove "unfinished" from all children of el
			Array.from(el.querySelectorAll("*")).forEach((el) =>
				el.classList.remove("unfinished"),
			);
			lastChild.classList.add("unfinished");
			el.classList.remove("unfinished");
			messagesContainer.scrollTop = messagesContainer.scrollHeight;
			chatResponse += part.message.content;
			newMessages[newMessages.length - 1].content = chatResponse.trim();
			newMessages[newMessages.length - 1].unfinished = !part.done;
			messages = [...newMessages];
			const history = JSON.parse(localStorage.getItem("history") || "{}");
			history[selectedChat!].messages = newMessages;
			updateHistory(history);
		}
		chatResponse = chatResponse.trim();
		newMessages[newMessages.length - 1].content = chatResponse;
		newMessages[newMessages.length - 1].unfinished = false;
		messages = [...newMessages];
		if (newMessages.length === 3 + attachments.length) {
			generateName(newMessages);
		}

		const el = Array.from(
			messagesContainer.querySelectorAll(".message-body"),
		).at(-1) as HTMLDivElement;
		el.querySelectorAll(".unfinished").forEach((el) =>
			el.classList.remove("unfinished"),
		);
		streaming = false;
	}

	function countLines(textarea: HTMLTextAreaElement) {
		var _buffer = document.createElement("textarea");
		_buffer = document.createElement("textarea");
		_buffer.style.border = "none";
		_buffer.style.height = "0";
		_buffer.style.overflow = "hidden";
		_buffer.style.padding = "0";
		_buffer.style.position = "absolute";
		_buffer.style.left = "0";
		_buffer.style.top = "0";
		_buffer.style.zIndex = "-1";
		document.body.appendChild(_buffer);

		var cs = window.getComputedStyle(textarea);
		var pl = parseInt(cs.paddingLeft);
		var pr = parseInt(cs.paddingRight);
		var lh = parseInt(cs.lineHeight);

		// [cs.lineHeight] may return 'normal', which means line height = font size.
		if (isNaN(lh)) lh = parseInt(cs.fontSize);

		// Copy content width.
		_buffer.style.width = textarea.clientWidth - pl - pr + "px";

		// Copy text properties.
		_buffer.style.font = cs.font;
		_buffer.style.letterSpacing = cs.letterSpacing;
		_buffer.style.whiteSpace = cs.whiteSpace;
		_buffer.style.wordBreak = cs.wordBreak;
		_buffer.style.wordSpacing = cs.wordSpacing;
		_buffer.style.wordWrap = cs.wordWrap;

		// Copy value.
		_buffer.value = textarea.value;

		var result = Math.floor(_buffer.scrollHeight / lh);
		if (result == 0) result = 1;
		_buffer.remove();
		return result;
	}

	function autoGrow(e: Event) {
		const inputVideos = Array.from(
			getNewInputValue(e).matchAll(
				/(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\/(watch\?v=)?([a-zA-Z0-9_-]{11})/g,
			),
		).map((m) => (m as RegExpMatchArray)[5]);
		videoURLs = inputVideos.map(
			(v) => `https://www.youtube.com/watch?v=${v}`,
		);
		(async () => {
			videos = await Promise.all(
				videoURLs
					.map(async (v) => ({
						...((await getVideoData(v)) as any),
						url: v,
					}))
					.filter(Boolean),
			);
		})();
		// get all urls which aren't in videoURLs
		let regUrls = Array.from(
			getNewInputValue(e).matchAll(
				/(https?:\/\/(?:www\.|(?!www))[a-zA-Z0-9][a-zA-Z0-9-]+[a-zA-Z0-9]\.[^\s]{2,}|www\.[a-zA-Z0-9][a-zA-Z0-9-]+[a-zA-Z0-9]\.[^\s]{2,}|https?:\/\/(?:www\.|(?!www))[a-zA-Z0-9]+\.[^\s]{2,}|www\.[a-zA-Z0-9]+\.[^\s]{2,})/gm,
			),
		)
			.map((m) => (m as RegExpMatchArray)[0])
			.filter((url) => !videoURLs.includes(url));
		genericURLs = regUrls;
		(async () => {
			sites = await Promise.all(
				regUrls.map(async (url) => {
					// if the url is already in sites, return it
					if (sites.map((s) => s.url).includes(url)) {
						return sites.find((s) => s.url === url)!;
					}
					const res = await fetch(`/server/scrape?url=${url}`);
					const json = await res.json();
					return {
						title: json.title,
						url,
						content: json.textContent,
					};
				}),
			);
		})();
		const target = e.target as HTMLTextAreaElement;
		const cards = document.getElementById("cards");
		const lines = countLines(target);
		target.style.height = "auto";
		if (lines === 1) {
			target.style.height = "";
			if (cards) {
				cards.style.bottom = "";
			}
		}
		target.style.height = `${target.scrollHeight + 2}px`;
		if (!cards) return;
		cards.style.bottom = `${target.scrollHeight + 16}px`;
	}

	function keyDown(e: KeyboardEvent) {
		if (e.key === "Enter" && !e.shiftKey) {
			if (streaming) return;
			textArea.style.height = "";
			e.preventDefault();
			if (textArea.value.trim() === "") return;
			sendMessage({ content: (e.target as HTMLTextAreaElement).value });
			textArea.value = "";
			value = "";
		}
	}

	async function fileUpload(
		mimes: string,
	): Promise<{ name: string; data: string }[]> {
		return new Promise((resolve) => {
			const input = document.createElement("input");
			// allow multiple
			input.multiple = true;
			input.type = "file";
			input.accept = mimes;
			input.onchange = async () => {
				// const file = input.files?.[0];
				// if (!file) return;
				// const reader = new FileReader();
				// reader.onload = async (e) => {
				// 	const data = e.target?.result;
				// 	if (typeof data !== "string") return;
				// 	resolve({ name: file.name, data });
				// };
				// reader.readAsDataURL(file);

				const files = Array.from(input.files || []);
				const results = await Promise.all(
					files.map(
						(file) =>
							new Promise<{ name: string; data: string }>(
								(resolve) => {
									const reader = new FileReader();
									reader.onload = (e) => {
										const data = e.target?.result;
										if (typeof data !== "string") return;
										resolve({ name: file.name, data });
									};
									reader.readAsDataURL(file);
								},
							),
					),
				);
				resolve(results);
			};
			input.click();
		});
	}

	function isImage(fileName: string) {
		return fileName.match(/\.(png|jpg|jpeg|webp)$/);
	}

	async function attachFile() {
		if (
			selectedModel === null ||
			typeof selectedModel === "undefined" ||
			typeof $models[selectedModel] === "undefined"
		)
			return;
		const mimes = [".doc", ".docx", ".txt", ".pdf"];
		if ($models[selectedModel].details.families?.includes("clip")) {
			mimes.push(".jpg", ".jpeg", ".png", ".webp");
		}
		const files = await fileUpload(mimes.join(","));
		// sendMessage({
		// 	content: value,
		// 	images: [file.data],
		// });
		// value = "";
		// textArea.value = "";
		// if the file is an image
		let modifiedAttachments = [...attachments];
		for await (const file of files) {
			const isImage = file.name.match(/\.(png|jpg|jpeg|webp)$/);
			let text = "";
			const extension = file.name.split(".").pop();
			if (!extension) continue;
			// if (file.name.match(/\.(doc|docx)$/)) {
			// 	// convert base64 to arraybuffer
			// 	const arrayBuffer = atob(file.data.split(",")[1]);
			// 	const byteArray = new Uint8Array(arrayBuffer.length);
			// 	for (let i = 0; i < arrayBuffer.length; i++) {
			// 		byteArray[i] = arrayBuffer.charCodeAt(i);
			// 	}
			// 	const blob = new Blob([byteArray], {
			// 		type: "application/octet-stream",
			// 	});
			// 	const result = await mammoth.extractRawText({
			// 		arrayBuffer: blob as unknown as ArrayBuffer,
			// 	});
			// 	text = result.value;
			// } else {
			// 	text = isImage ? file.data : atob(file.data.split(",")[1]);
			// }

			switch (extension) {
				case "doc":
				case "docx": {
					const arrayBuffer = atob(file.data.split(",")[1]);
					const byteArray = new Uint8Array(arrayBuffer.length);
					for (let i = 0; i < arrayBuffer.length; i++) {
						byteArray[i] = arrayBuffer.charCodeAt(i);
					}
					const blob = new Blob([byteArray], {
						type: "application/octet-stream",
					});
					const result = await mammoth.extractRawText({
						arrayBuffer: blob as unknown as ArrayBuffer,
					});
					text = result.value;
					break;
				}
				case "pdf": {
					// get UInt8Array from base64
					const body = atob(file.data.split(",")[1]);
					const data = new Uint8Array(body.length);
					for (let i = 0; i < body.length; i++) {
						data[i] = body.charCodeAt(i);
					}
					const pdf = await (window as any).pdfLib.getDocument(data)
						.promise;
					for (let i = 1; i <= pdf.numPages; i++) {
						const page = await pdf.getPage(i);
						const content = await page.getTextContent();
						const strings = content.items.map(
							(item: any) => item.str,
						);
						text += strings.join("\n");
					}
					break;
				}
				default: {
					text = isImage ? file.data : atob(file.data.split(",")[1]);
				}
			}
			modifiedAttachments.push({
				name: file.name,
				data: text,
				type: isImage ? "image" : "document",
			});
		}
		attachments = [...modifiedAttachments];
		const lines = countLines(textArea);
		tick().then(() => {
			const cards = document.getElementById("cards");
			if (lines === 1) {
				cards!.style.bottom = "";
			} else {
				cards!.style.bottom = `${textArea.scrollHeight + 16}px`;
			}
		});
	}

	async function getVideoData(
		videoUrl: string,
	): Promise<{ title: string; transcript: string } | undefined> {
		if (videoUrl.trim() === "") return;
		const url = new URL(videoUrl);
		const videoId =
			url.searchParams.get("v") || url.pathname.split("/").pop();
		const data = await fetch(`/server/transcript/${videoId}`);
		const json = (await data.json()) as {
			title: string;
			transcript: string;
		};
		return json;
	}

	export { setSelectedChat };
</script>

<svelte:head>
	<link rel="preload" href={sohne} as="font" type="font/woff2" />
	<link rel="preload" href={sohneKraftig} as="font" type="font/woff2" />
	<link rel="preload" href={sohneHalbfett} as="font" type="font/woff2" />
</svelte:head>

<div class="chat">
	<div class="header">
		<ModelSelector bind:selectedModel />
	</div>
	<div class="content-container">
		<div class="messages-container" bind:this={messagesContainer}>
			<div class="messages">
				{#if messages.length <= 1}
					<div class="center">
						<img src={ollamaIcon} alt="ollama" />
						<h1>How can I help you today?</h1>
					</div>
				{/if}
				{#if messages}
					{#each messages.filter((m) => m.role !== "system") as message, i}
						<div
							class={`message ${
								message.role === "user" ? "user" : "assistant"
							}`}>
							<div class="pfp">
								{#if message.role === "user"}
									<span>{hostname.slice(0, 1)}</span>
								{:else}
									<img
										height={48}
										width={48}
										src={ollamaIcon}
										alt="ollama" />
								{/if}
							</div>
							<div class="content">
								<div class="username">
									{message.role === "user"
										? "You"
										: selectedModel === null ||
											  typeof selectedModel ===
													"undefined" ||
											  typeof $models[selectedModel] ===
													"undefined"
											? "Assistant"
											: getModelName(
													$models[selectedModel],
												)}
								</div>
								<div class={`message-body`}>
									{#if typeof message.images !== "undefined"}
										{#each message.images as image}
											<div class="image-frame">
												<img
													src={`${image}`}
													alt="unknown"
													class="msg-image" />
											</div>
										{/each}
									{/if}
									<SvelteMarkdown
										options={{ mangle: false }}
										source={message.content
											.replaceAll(
												/(https?:\/\/(?:www\.|(?!www))[a-zA-Z0-9][a-zA-Z0-9-]+[a-zA-Z0-9]\.[^\s]{2,}|www\.[a-zA-Z0-9][a-zA-Z0-9-]+[a-zA-Z0-9]\.[^\s]{2,}|https?:\/\/(?:www\.|(?!www))[a-zA-Z0-9]+\.[^\s]{2,}|www\.[a-zA-Z0-9]+\.[^\s]{2,})/gm,
												"",
											)
											.trim()} />
								</div>
								<div class="message-attachments">
									{#each message.attachments || [] as attachment}
										{#if attachment?.match(/(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\/(watch\?v=)?([a-zA-Z0-9_-]{11})/)}
											<iframe
												width="560"
												height="315"
												src={`https://www.youtube.com/embed/${new URL(attachment).searchParams.get("v")}`}
												title="YouTube video player"
												frameborder="0"
												allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
												allowfullscreen>
											</iframe>
											<br />
										{:else if attachment?.match(/(https?:\/\/(?:www\.|(?!www))[a-zA-Z0-9][a-zA-Z0-9-]+[a-zA-Z0-9]\.[^\s]{2,}|www\.[a-zA-Z0-9][a-zA-Z0-9-]+[a-zA-Z0-9]\.[^\s]{2,}|https?:\/\/(?:www\.|(?!www))[a-zA-Z0-9]+\.[^\s]{2,}|www\.[a-zA-Z0-9]+\.[^\s]{2,})/gm)}
											<div class="message-attachment">
												<a
													target="_blank"
													href={attachment}>
													{attachment || "Unknown"}
												</a>
											</div>
										{:else}
											<div class="message-attachment">
												<span>
													{attachment || "Unknown"}
												</span>
											</div>
										{/if}
									{/each}
								</div>
							</div>
						</div>
					{/each}
				{/if}
			</div>
		</div>
		<div class="footer">
			<div class="textarea-container-container">
				<div class="textarea-container">
					{#if attachments.length > 0}
						<div id="cards" class="attachment-cards">
							{#each attachments as attachment}
								<div class="attachment-card">
									<div class="attachment-name">
										{attachment.name}
									</div>
									<div
										class="delete"
										on:click={() => {
											attachments = attachments.filter(
												(a) => a !== attachment,
											);
										}}>
										<DeleteFile />
									</div>
								</div>
							{/each}
						</div>
					{/if}
					<div class="attachments">
						{#if attachmentsOpen}
							<div class="attachment-picker">
								<!-- <button
									class="attachment-btn"
									on:click={attachFile}>
									<span class="attachment-btn-contents">
										<File size={20} />
										<span>File (image or document)</span>
									</span>
								</button>
								<button class="attachment-btn" on:click={attachVideo}>
									<span class="attachment-btn-contents">
										<YouTube size={20} />
										<span>YouTube Video</span>
									</span>
								</button> -->
								{#each buttons as button}
									{#if button.type === "button"}
										<button
											class="attachment-btn"
											on:click={async (e) => {
												// @ts-ignore
												e.target.disabled = true;
												await button.onsubmit?.("");
												// @ts-ignore
												e.target.disabled = false;
												if (
													!button.doesntHide &&
													!button.followUp
												)
													attachmentsOpen = false;
												buttons =
													button.followUp ||
													defaultButtons;
											}}>
											<span
												class="attachment-btn-contents">
												{#if button.icon}
													<svelte:component
														this={button.icon}
														size={20} />
												{/if}
												<span>{button.text}</span>
											</span>
										</button>
									{:else}
										<input
											class="attachment-input"
											type="text"
											on:keydown={async (e) => {
												if (e.key === "Enter") {
													// @ts-ignore
													e.target.disabled = true;
													await button.onsubmit?.(
														// @ts-ignore
														e.target.value,
													);
													// @ts-ignore
													e.target.disabled = false;

													buttons =
														button.followUp ||
														defaultButtons;
													if (
														!button.doesntHide &&
														!button.followUp
													)
														attachmentsOpen = false;
												}
											}}
											on:blur={() => {
												buttons = defaultButtons;
											}}
											placeholder={button.text} />
									{/if}
								{/each}
							</div>
						{/if}
						<div
							class="picker-btn"
							on:click={() => {
								attachmentsOpen = !attachmentsOpen;
							}}>
							<Attachment />
						</div>
					</div>
					{#key selectedModel}
						<textarea
							bind:this={textArea}
							on:input={autoGrow}
							on:keydown={keyDown}
							bind:value
							placeholder={typeof selectedModel === "number" &&
							typeof $models[selectedModel] !== "undefined"
								? `Message ${getModelName($models[selectedModel])}...`
								: "Download a model to begin..."}
							disabled={typeof selectedModel !== "number" ||
								typeof $models[selectedModel] === "undefined"}
							class="messageBox" />
					{/key}
					<div
						class={`send ${value.trim() === "" ? "disabled" : ""}`}
						on:click={() => {
							if (value.trim() === "") return;
							sendMessage({ content: value });
							value = "";
							textArea.value = "";
						}}>
						<UpArrow color="white" />
					</div>
				</div>
			</div>
			<div class="disclaimer">
				AI makes no mistakes. Bow down to your new overlord.
			</div>
		</div>
	</div>
</div>

<style>
	.attachment-input {
		appearance: none;
		border-radius: 16px;
		border: solid thin #ccc;
		padding: 6px 12px;
		outline: none;
	}

	.picker-btn {
		cursor: pointer;
	}

	.attachment-picker {
		position: absolute;
		bottom: 60px;
		display: flex;
		flex-direction: column;
		background-color: white;
		border-radius: 16px;
		overflow: hidden;
		border: solid thin #ccc;
		left: -12px;
	}

	.attachment-btn {
		appearance: none;
		white-space: nowrap;
		padding: 12px 16px;
		text-align: left;
		background-color: white;
		border: none;
		cursor: pointer;
	}

	.attachment-btn-contents {
		display: flex;
		align-items: center;
		gap: 6px;
		font-size: 14px;
	}

	.attachment-btn:hover {
		background-color: #ececec;
	}

	.message-attachments {
		display: flex;
		gap: 8px;
		max-width: 100%;
	}

	.message-attachment {
		border-radius: 16px;
		padding: 8px;
		display: flex;
		align-items: center;
		gap: 8px;
		padding: 12px 18px;
		background-color: white;
		border: solid thin #ccc;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
		max-width: 100%;
	}

	.message-attachment > * {
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.delete {
		cursor: pointer;
	}

	.delete:hover > :global(*) {
		fill: rgb(216, 92, 92);
	}

	.attachment-cards {
		position: absolute;
		bottom: 68px;
		border-radius: 16px;
		left: -4px;
		display: flex;
		gap: 8px;
		width: 100%;
	}

	.attachment-card {
		padding: 12px 18px;
		padding-bottom: 6px;
		padding-right: 12px;
		display: flex;
		border-radius: 16px;
		border: solid thin #ccc;
		display: flex;
		gap: 8px;
		max-width: 30%;
	}

	.attachment-name {
		margin-top: 1px;
		box-sizing: border-box;
		width: 100%;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.attachments {
		position: absolute;
		left: 8px;
		top: 15px;
		z-index: 5;
		cursor: pointer;
	}

	.header {
		position: absolute;
		background-color: white;
		top: 0;
		left: 0;
		width: calc(100% - 8px);
		padding: 4px 2px;
	}

	.image-frame {
		background-color: black;
		outline: solid thin #ccc;
		overflow: hidden;
		border-radius: 12px;
		margin-top: 32px;
		width: fit-content;
		height: fit-content;
	}

	.image-frame > img {
		width: 100%;
		height: 100%;
		max-width: 200px;
		max-height: 200px;
		margin-bottom: -3px;
	}

	.chat {
		flex-grow: 1;
		position: relative;
		display: flex;
		flex-direction: column;
		align-items: center;
		max-height: calc(100vh - 87px);
	}

	.content-container {
		width: 100%;
		max-height: 100%;
		display: flex;
		flex-direction: column;
		flex-grow: 1;
	}

	.messages {
		flex-grow: 1;
		width: 100%;
		min-height: 100%;
		box-sizing: border-box;
		padding-top: 72px;
		max-width: 776px;
	}

	.messages-container {
		flex-grow: 1;
		width: 100%;
		min-height: 100%;
		box-sizing: border-box;
		overflow-y: auto;
		display: flex;
		justify-content: center;
	}

	.disclaimer {
		position: absolute;
		bottom: 6px;
		font-size: 12px;
		color: rgb(103, 103, 103);
	}

	.footer {
		width: 100%;
		height: 87px;
		flex-shrink: 0;
		display: flex;
		justify-content: center;
		position: relative;
	}

	.center {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		box-sizing: border-box;
		padding-bottom: 236px;
		height: 100%;
	}

	.center > h1 {
		font-size: 24px;
		font-weight: 500;
		font-family: "Sohne Kraftig";
	}

	.center > img {
		width: 48px;
		height: 48px;
		object-fit: contain;
		border-radius: 50%;
		border: solid thin rgba(227, 227, 227);
	}

	.textarea-container-container {
		width: 100%;
		height: 54px;
		display: flex;
		align-items: center;
		justify-content: center;
		position: absolute;
		bottom: 32px;
	}

	.textarea-container {
		width: 100%;
		height: 54px;
		display: flex;
		align-items: center;
		justify-content: center;
		position: absolute;
		max-width: 768px;
		bottom: 0;
	}

	.send {
		position: absolute;
		bottom: 12px;
		right: 16px;
		width: 30px;
		height: 30px;
		background-color: black;
		display: flex;
		align-items: center;
		justify-content: center;
		border-radius: 8px;
		user-select: none;
		cursor: pointer;
	}

	.send.disabled {
		background-color: #e6e6e6;
		cursor: default;
	}

	.messageBox {
		resize: none;
		border: solid thin #cccccc;
		flex-grow: 1;
		width: 100%;
		height: 54px;
		max-width: 768px;
		border-radius: 16px;
		margin-right: 8px;
		box-sizing: border-box;
		padding: 16px;
		padding-bottom: 16px;
		padding-left: 46px;
		padding-right: 46px;
		position: absolute;
		bottom: 0;
		overflow: hidden;
	}

	.messageBox:focus {
		outline: none;
	}

	.message {
		display: flex;
		line-height: 24px;
		padding-bottom: 48px;
	}

	.content,
	.username {
		line-height: 24px;
	}

	.message > .content {
		box-sizing: border-box;
		padding-right: 32px;
		white-space: pre-wrap;
		max-width: 776px;
	}

	.message.assistant .message-body :global(*) {
		line-height: 28px;
	}

	.message.assistant .message-body {
		margin-top: -40px;
	}

	.message.assistant .message-body :global(p) {
		margin: 0;
	}

	.message.user .message-body :global(p) {
		margin-top: 4px;
		margin-bottom: 0;
	}

	.pfp {
		background-color: #19c37d;
		display: flex;
		align-items: center;
		justify-content: center;
		box-sizing: border-box;
		border-radius: 50%;
		padding-bottom: 4px;
		overflow: hidden;
	}

	.message-body {
		margin-top: -44px;
	}

	:global(.unfinished)::after {
		content: "⬤";
	}

	.message.user > .pfp {
		background-color: #7f8c8d;
		color: white;
	}

	.message.assistant > .pfp {
		background-color: #19c37d;
	}

	.pfp > img {
		width: 32px;
		object-fit: contain;
		filter: invert(1);
	}

	.username {
		margin-top: -2px;
	}

	.username {
		font-family: "Sohne Halbfett";
	}

	.pfp {
		width: 24px;
		height: 24px;
		background-color: #19c37d;
		border-radius: 50%;
		flex-shrink: 0;
		margin-left: 24px;
		margin-right: 12px;
	}

	@media (max-width: 1280px) {
		.content-container {
			max-width: 680px;
		}
	}

	.message-body :global(code) {
		background-color: black;
		display: block;
		padding: 4px;
		border-radius: 4px;
		font-family: "Sohne Mono", monospace;
		color: white;
		font-size: 14px;
		line-height: 24px;
		box-sizing: border-box;
		padding: 16px;
	}
</style>
