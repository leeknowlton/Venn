import OpenAI from 'openai';

/** @type {import('./$types').RequestHandler} */
export async function POST({ request }) {
	const data = await request.json();
	console.log(data);

	let concept = data.concept;

	const openai = new OpenAI({ apiKey: import.meta.env.VITE_OPENAI_API_KEY });

	const completion = await openai.chat.completions.create({
		messages: [
			{
				role: 'system',
				content:
					'You are a helpful teacher that breaks concepts down into extremely simple langauge (ELI5). Format your answer in markdown'
			},
			{ role: 'user', content: `Explain ${concept}` }
		],
		model: 'gpt-3.5-turbo'
	});

	console.log(completion.choices[0]);

	return new Response(JSON.stringify(completion.choices[0].message.content));
}
