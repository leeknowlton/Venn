<script>
	import { onMount } from 'svelte';
	import { marked } from 'marked';
	import DOMPurify from 'dompurify';

	let concept = 'Random Forests';
	let explanation = '';
	let answer;

	let result = '';

	async function getStream() {
		result = '';
		const response = await fetch('/api/openai', {
			method: 'POST',
			body: JSON.stringify({ concept }),
			headers: {
				'content-type': 'application/json'
			}
		});
		const reader = response.body.pipeThrough(new TextDecoderStream()).getReader();
		let accumulated = ''; // Accumulate chunks here

		while (true) {
			const { value, done } = await reader.read();
			if (done) break;

			accumulated += value;

			// Split accumulated data by newline
			let newlineIndex;
			while ((newlineIndex = accumulated.indexOf('\n')) !== -1) {
				const jsonString = accumulated.substring(0, newlineIndex);
				accumulated = accumulated.substring(newlineIndex + 1);

				try {
					const json = JSON.parse(jsonString);
					if (json.choices && json.choices[0] && json.choices[0].delta) {
						result += json.choices[0].delta.content;
					}
				} catch (error) {
					console.error('Error parsing chunk:', error);
				}
			}
		}
	}
</script>

<div class="w-1/2 m-auto my-4">
	<h1 class="text-2xl my-6">ELI5</h1>
	<div class="flex gap-5">
		<input class="input input-primary" bind:value={concept} />
		<button class="btn btn-primary" type="button" on:click={getStream}> Explain </button>
	</div>
	<div class="my-4 prose">{result}</div>

	<br />
</div>

<style>
</style>
