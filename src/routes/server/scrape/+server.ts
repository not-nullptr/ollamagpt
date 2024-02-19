import { json } from "@sveltejs/kit";
import { Readability } from "@mozilla/readability";
import { JSDOM } from "jsdom";

export async function GET({ request }) {
	const url = new URL(request.url).searchParams.get("url");
	if (!url || typeof url !== "string") {
		return json({ error: "Invalid URL" }, { status: 400 });
	}
	const res = await fetch(url);
	const html = await res.text();
	const document = new JSDOM(html).window.document;
	const reader = new Readability(document);
	const article = reader.parse();
	return json({
		...article,
	});
}
