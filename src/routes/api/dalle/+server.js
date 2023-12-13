import OpenAI from 'openai';
import { json } from '@sveltejs/kit';

export async function POST({ request }) {
	const data = await request.json();
	console.log(data);

	let concepts = data.selectedConcepts;
	const openai = new OpenAI({ apiKey: import.meta.env.VITE_OPENAI_API_KEY });

	const image = await openai.images.generate({
		model: 'dall-e-3',
		prompt: `Make a visualization that merges the similarities between the following two concepts: ${concepts}`
	});

	return json(image);
}
