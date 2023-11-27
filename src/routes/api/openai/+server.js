import OpenAI from 'openai';
export async function POST({ request }) {
	const data = await request.json();
	console.log(data);

	let concept = data.concept;
	// const concept = url.searchParams.get('concept');
	// let concept = 'Random Forests';
	const openai = new OpenAI({ apiKey: import.meta.env.VITE_OPENAI_API_KEY });

	const stream = await openai.chat.completions.create({
		messages: [
			{
				role: 'system',
				content:
					'You are a helpful teacher that breaks concepts down into extremely simple language (ELI5). Format your reply in markdown, bolding an important concept only the first time it appears.'
			},
			{ role: 'user', content: `Explain ${concept}` }
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
