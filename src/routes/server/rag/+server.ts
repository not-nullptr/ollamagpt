import { StreamingTextResponse} from "ai";

export async function POST(opt) {
	const stream = new ReadableStream();
	const res = new StreamingTextResponse(stream);
	
	return res;
}