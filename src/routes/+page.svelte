<script>
	import { marked } from 'marked';
	import DOMPurify from 'dompurify';

	let concept = 'Random Forests';
	let renderedExplanation = '';

	async function explain() {
		const response = await fetch('/api/openai', {
			method: 'POST',
			body: JSON.stringify({ concept }),
			headers: {
				'content-type': 'application/json'
			}
		});

		const explanation = await response.json();
		console.log(explanation);
		const unsafeExplanation = marked(explanation);
		renderedExplanation = DOMPurify.sanitize(unsafeExplanation);
	}
</script>

<div class="w-1/2 m-auto my-4">
	<div class="flex gap-5">
		<input class="input input-primary" bind:value={concept} />
		<button class="btn btn-primary" type="button" on:click={explain}> Explain </button>
	</div>
	<div class="my-4 prose">{@html renderedExplanation}</div>

	<br />
</div>

<style>
</style>
