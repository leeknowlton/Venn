import OpenAI from 'openai';
import { json } from '@sveltejs/kit';

export async function POST({ request }) {
	const data = await request.json();
	console.log(data);

	let concept = data.explosionInput;
	const openai = new OpenAI({ apiKey: import.meta.env.VITE_OPENAI_API_KEY });

	const completion = await openai.chat.completions.create({
		messages: [
			{
				role: 'system',
				content: `Return an array containing five items or concepts related to the topic provided by the user. Do not include any other text, just the array.`
			},
			{
				role: 'user',
				content: `Here is the topic: ${concept}`
			}
		],
		model: 'gpt-3.5-turbo'
	});
	let explodedConcepts = completion.choices[0].message.content;
	return new json(explodedConcepts);
}
