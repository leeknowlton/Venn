import OpenAI from 'openai';
export async function POST({ request }) {
	const data = await request.json();
	console.log(data);

	let concepts = data.selectedConcepts;
	// const concept = url.searchParams.get('concept');
	// let concept = 'Random Forests';
	const openai = new OpenAI({ apiKey: import.meta.env.VITE_OPENAI_API_KEY });

	const stream = await openai.chat.completions.create({
		messages: [
			{
				role: 'system',
				content:
					'You are an extremely skilled and helpful quiz game show host that explains what concepts share in common in 60 words or less. Format your reply in markdown, bolding an important concept only the first time it appears.'
			},
			{
				role: 'user',
				content: `Explain the how the first of the three aforementioned concepts links together to the following two. Here are the concepts: ${concepts}. Make sure to include the essential elements of the relationship and each concept's definitions. Start your answer with "Indeed, "`
			}
		],
		model: 'gpt-3.5-turbo',
		stream: true
	});

	return new Response(stream.toReadableStream(), {
		status: 200,
		headers: {
			'Content-Type': 'text/event-stream'
		}
	});
}
