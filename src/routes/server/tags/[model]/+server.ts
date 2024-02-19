import { json } from "@sveltejs/kit";
import { JSDOM } from "jsdom";
import moment from "moment";

export async function GET({ request, params }) {
	const model = params.model;
	const res = await (
		await fetch(`https://ollama.com/library/${model}/tags`)
	).text();
	const dom = new JSDOM(res);
	const document = dom.window.document;
	const main = document.querySelector("section.w-full.max-w-full")!;
	const tagEls = Array.from(
		main.querySelectorAll(".flex-1.ext-sm.font-medium.text-gray-900"),
	).map((el) => el.querySelector("a")!);
	const tags = tagEls.map((el) => {
		const divs = Array.from(el.querySelectorAll("div"));
		const info = divs[1]
			.textContent!.replaceAll("\n", "")
			.replace(/\s+/g, " ")
			.trim();
		const [size, hash, dateStr] = info.split(" • ");
		const [num, unit] = dateStr.split(" ") as [
			string,
			moment.unitOfTime.DurationConstructor,
		];
		return {
			name: divs[0].textContent?.trim(),
			size,
			hash,
			date: moment().subtract(num, unit).toDate(),
		};
	});
	return json(
		tags
			.sort((a, b) => a.name!.length - b.name!.length)
			.map((tag) => ({
				...tag,
				date: tag.date.toISOString(),
				// push the "latest" tag to the top
			}))
			.sort((a, b) =>
				a.name === "latest" ? -1 : b.name === "latest" ? 1 : 0,
			),
	);
}
