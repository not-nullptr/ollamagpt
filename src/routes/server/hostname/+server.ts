import { json } from "@sveltejs/kit";
import os from "os";

export function GET() {
	const hostname = os.userInfo().username;
	return json({ hostname });
}
