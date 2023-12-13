import OpenAI from 'openai';
import { json } from '@sveltejs/kit';

export async function POST({ request }) {
	const data = await request.json();
	console.log(data);

	let concept = data.concept;
	const openai = new OpenAI({ apiKey: import.meta.env.VITE_OPENAI_API_KEY });

	const completion = await openai.chat.completions.create({
		messages: [
			{
				role: 'system',
				content: `Return a simple definition or explanation of the concept provided by the user. Use 50 words or less.`
			},
			{
				role: 'user',
				content: `Here is the topic: ${concept}`
			}
		],
		model: 'gpt-3.5-turbo'
	});
	let definition = completion.choices[0].message.content;
	return new json(definition);
}
