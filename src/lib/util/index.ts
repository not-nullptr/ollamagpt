import { Ollama, type ModelResponse } from "ollama";
import { getContext, hasContext, setContext } from "svelte";
import { writable } from "svelte/store";

export function sentenceCase(str: string) {
	return str
		.split(":")[0]
		.replace(
			/(^\w|\s\w)(\S*)/g,
			(_, m1, m2) => m1.toUpperCase() + m2.toLowerCase(),
		);
}

export function getModelDetails(model: ModelResponse) {
	let details = "";
	if (model.details.families) {
		if (model.details.families?.length > 1) {
			details += `Part of the ${model.details.families
				.map((family) => sentenceCase(family))
				// replace the last comma with an "and"
				.join(", ")
				.replace(/,([^,]*)$/, " and$1")} families. `;
		} else
			details += `Part of the ${sentenceCase(model.details.family)} family. `;
	}
	if (model.details.parameter_size) {
		details += `Has ${model.details.parameter_size} parameters, totalling ${formatBytes(model.size, true)}. `;
	}
	if (model.details.families?.includes("clip")) {
		details += "This model includes vision features. ";
	}
	return details || "No details available.";
}

export function getModelName(model: ModelResponse) {
	return sentenceCase(model.name.split(":")[0].replaceAll("-", " "));
}

const ollama = new Ollama({
	host:
		typeof window !== "undefined"
			? `${window.location.protocol}//${window.location.host.split(":")[0]}:${!!window.location.host.split(":")[1] ? window.location.host.split(":")[1] : window.location.protocol.startsWith("https") ? 443 : 80}`
			: undefined,
});

export { ollama };

export const useSharedStore = <T, A>(
	name: string,
	fn: (value?: A) => T,
	defaultValue?: A,
) => {
	if (hasContext(name)) {
		return getContext<T>(name);
	}
	const _value = fn(defaultValue);
	setContext(name, _value);
	return _value;
};

export const useWritable = <T>(name: string, value: T) =>
	useSharedStore(name, writable, value);

export function formatBytes(bytes: number, showDecimals?: boolean) {
	if (bytes === 0) return "0 Bytes";

	const k = 1024;
	const sizes = ["Bytes", "KB", "MB", "GB", "TB", "PB", "EB", "ZB", "YB"];

	const i = Math.floor(Math.log(bytes) / Math.log(k));
	const decimals = i === 0 ? 0 : 2; // Use 0 decimals for Bytes, 2 for other units
	let res = parseFloat((bytes / Math.pow(k, i)).toFixed(decimals));
	if (!showDecimals) res = Math.round(res);
	return res + " " + sizes[i];
}
