import { json } from "@sveltejs/kit";
import { YoutubeTranscript, type TranscriptResponse } from "youtube-transcript";
import { JSDOM } from "jsdom";

export async function GET({ params }) {
	const id = params.id;
	const transcript: TranscriptResponse[] = (
		await YoutubeTranscript.fetchTranscript(id)
	).map((t) => ({
		text: t.text,
		offset: t.offset / 1000,
		duration: t.duration / 1000,
	}));
	// get minutes and second for each, in mm:ss
	const res = await fetch(`https://www.youtube.com/watch?v=${id}`);
	const html = await res.text();
	const dom = new JSDOM(html);
	const title = dom.window.document
		.querySelector("title")!
		.textContent!.replace(" - YouTube", "");
	const formattedTranscript = transcript.map((t) => {
		const minutes = Math.floor(t.offset / 60)
			.toString()
			.padStart(2, "0");
		const seconds = Math.floor(t.offset % 60)
			.toString()
			.padStart(2, "0");
		return `${minutes}:${seconds} - ${t.text}`;
	});
	return json({
		title,
		transcript: formattedTranscript.join("\n"),
	});
}
