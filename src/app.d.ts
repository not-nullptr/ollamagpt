// See https://kit.svelte.dev/docs/types#app
// for information about these interfaces
declare global {
	namespace App {
		// interface Error {}
		// interface Locals {}
		// interface PageData {}
		// interface PageState {}
		// interface Platform {}
	}
}

declare module "ollama" {
	export interface ModelResponse {
		name: string;
		model: string;
		modified_at: Date;
		size: number;
		digest: string;
		details: {
			parent_model: string;
			format: string;
			family: string;
			families: string[];
			parameter_size: string;
			quantization_level: string;
		};
	}
}

export {};
