import type { ModelResponse } from "ollama";
import { writable, type Writable } from "svelte/store";
import { useWritable } from ".";

export const useModels = () => useWritable<ModelResponse[]>("models", []);
export const useNewModel = () => useWritable<boolean>("newModel", false);
