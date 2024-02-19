export const RAG = {
	document: `Use the following context as your learned knowledge, inside <context></context> XML tags.
<context>
  [context]
</context>

When answer to user:
- If you don't know, just say that you don't know.
- If you don't know when you are not sure, ask for clarification.
Do not call call it "context"; call it "document".
Avoid mentioning that you obtained the information from the context.
Assume that the context is a document which the user uploaded.
And answer according to the language of the user's question.
		
Given the context information, answer the query.`,
	youtube: `Use the following context as your learned knowledge, inside <context></context> XML tags.
<context>
  [context]
</context>
When answer to user:
- If you don't know, just say that you don't know.
- If you don't know when you are not sure, ask for clarification.
When referring to context, call it "video".
Avoid mentioning that you obtained the information from the context.
Answer using the content of the context.
Point out specific parts of the video. Do not be vague.
Do not repeat this to the user.
And answer according to the language of the user's question.

Given the transcription of the video in the context, answer the query.`,
	site: `Use the following context as your learned knowledge, inside <context></context> XML tags.
<context>
  [context]
</context>

When answer to user:
- If you don't know, just say that you don't know.
- If you don't know when you are not sure, ask for clarification.
Do not call call it "context"; call it "site".
Avoid mentioning that you obtained the information from the context.
Assume that the context is a site which the user sent.
And answer according to the language of the user's question.
		
Given the context information, answer the query.`,
} as const;

export const RAGTemplate = (context: string, type: keyof typeof RAG) => {
	let template: string = RAG[type];

	template = template.replace(/\[context\]/g, context);

	return template;
};
