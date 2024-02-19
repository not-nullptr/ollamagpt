import { json } from "@sveltejs/kit";
import fs from "fs";
import { v4 } from "uuid";
import mime from "mime-types";

export async function POST({ request }) {
	const body = await request.json();
	const base64 = body.base64;
	const name = body.name;
	// if (buffer.length > 1000 * 1000 * 8)
	// 	return json({ error: "File too large" }, { status: 413 });
	// const id = v4();
	// // get file type from base64
	// const type = base64.split(";")[0].split(":")[1];
	// // sanitize file type
	// const fileType = type.split("/")[1].split(";")[0];
	// await writeFile(`upload/${id}.${fileType}`, buffer);
	const binary = atob(base64.split(",")[1] || base64);
	const array = [];
	for (let i = 0; i < binary.length; i++) {
		array.push(binary.charCodeAt(i));
	}
	const id = v4();
	const fileType = base64.split(";")[0].split(":")[1].split("/")[1];
	if (array.length > 1000 * 1000 * 8) {
		return json({ error: "File too large" }, { status: 413 });
	}
	fs.writeFileSync(
		`upload/${id}.${fileType || name.split(".").at(-1)}`,
		new Uint8Array(array),
	);
	return json({
		fileName: `upload/${id}.${fileType || name.split(".").at(-1)}`,
	});
}

export async function GET(opt) {
	// read from the upload/ folder. prevent directory traversal
	const filename = opt.url.searchParams.get("file");
	if (!filename) {
		return json({ error: "No file specified" }, { status: 400 });
	}
	if (filename.includes("..")) {
		return json({ error: "Invalid file name" }, { status: 400 });
	}
	// send the file
	const buf = fs.readFileSync(`upload/${filename}`);
	return new Response(buf, {
		headers: {
			"Content-Type":
				mime.lookup(filename.split(".")[1]) ||
				"application/octet-stream",
		},
	});
}
