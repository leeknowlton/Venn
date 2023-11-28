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
					'You are a quiz show host. You will be given two concepts that the contestant will need to guess. You should give a hint that describes the relationship between the concepts without saying what they are.  Your hint should be 100 words or less. Format your reply in markdown.'
			},
			{
				role: 'user',
				content: `Create a hint for ${concepts}. Include a clear explanation of each concept. The question should be such that a junior high school student familiar with the concepts could guess the answer. Make sure to emphasize what they share in common, using metaphors if necessary. DO NOT include the name of the concept.`
			}
		],
		model: 'gpt-4-1106-preview',
		stream: true
	});

	return new Response(stream.toReadableStream(), {
		status: 200,
		headers: {
			'Content-Type': 'text/event-stream'
		}
	});
}
