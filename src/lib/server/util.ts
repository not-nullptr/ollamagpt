import fs from "fs";

const { stat, readFile, writeFile } = (fs || { promises: {} }).promises;

interface URLAttachment {
	url: string;
	type: "url";
}

interface FileAttachment {
	file: string;
	type: "file";
}

type Attachment = URLAttachment | FileAttachment;

export function numberFromFormatted(number: string) {
	var base = parseFloat(number);
	if (number.toLowerCase().match(/k/)) {
		return Math.round(base * 1000);
	} else if (number.toLowerCase().match(/m/)) {
		return Math.round(base * 1000000);
	} else if (number.toLowerCase().match(/b/)) {
		return Math.round(base * 1000000000);
	}
	return base;
}

export async function getChatAttachments(id: string): Promise<Attachment[]> {
	if (
		!stat(
			"chat_attachments/" +
				id.replaceAll("/", "_").replaceAll("\\", "_") +
				".json",
		)
	) {
		return [];
	}
	const file = await readFile(
		"chat_attachments/" +
			id.replaceAll("/", "_").replaceAll("\\", "_") +
			".json",
		"utf-8",
	);
	return JSON.parse(file);
}

export async function saveChatAttachments(
	id: string,
	attachments: Attachment[],
) {
	await writeFile(
		"chat_attachments/" +
			id.replaceAll("/", "_").replaceAll("\\", "_") +
			".json",
		JSON.stringify(attachments),
	);
}
