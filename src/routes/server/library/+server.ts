import { json } from "@sveltejs/kit";
import { JSDOM } from "jsdom";
import moment from "moment";
import FuzzySearch from "fuzzy-search";
import { numberFromFormatted } from "$lib/server/util";

export async function GET() {
	const dom = new JSDOM(
		await (await fetch("https://ollama.com/library")).text(),
	);
	const document = dom.window.document;
	const repo = document.getElementById("repo")?.querySelector("ul")!;
	const list = Array.from(repo.children)
		.map((li) => li.querySelector("a")!)
		.map((a) => {
			const relDate = a
				.querySelectorAll("span")[2]!
				.textContent!.split("\n")[2]
				.trim()
				.split(" ");
			let [num, unit] = relDate as [
				string,
				moment.unitOfTime.DurationConstructor,
			];
			return {
				name: a.querySelector("h2")!.textContent!.trim(),
				description: a.querySelector("p")!.textContent!.trim(),
				downloads: numberFromFormatted(
					a.querySelector("span")!.textContent!.trim().split("\n")[0],
				),
				tagCount: numberFromFormatted(
					a
						.querySelectorAll("span")[1]!
						.textContent!.trim()
						.split(" ")[0],
				),
				lastUpdate: moment().subtract(num, unit).toISOString(),
			};
		});
	return json(list);
}
