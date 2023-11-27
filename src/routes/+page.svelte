<script>
	import { marked } from 'marked';
	import DOMPurify from 'dompurify';

	let concept = 'Random Forests';
	let result = '';
	let imageurl = '';
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
		let accumulatedContent = ''; // Accumulate Markdown content here

		while (true) {
			const { value, done } = await reader.read();
			if (done) {
				break;
			}
			accumulatedContent += value;

			// Split accumulated data by newline
			let newlineIndex;
			while ((newlineIndex = accumulatedContent.indexOf('\n')) !== -1) {
				const jsonString = accumulatedContent.substring(0, newlineIndex);
				accumulatedContent = accumulatedContent.substring(newlineIndex + 1);

				try {
					const json = JSON.parse(jsonString);
					if (json.choices && json.choices[0] && json.choices[0].delta) {
						if (!json.choices[0].delta.content) {
							processMarkdown(result); // Process the final content
							break;
						}
						// Append only the content part to the result
						result += json.choices[0].delta.content;
					}
				} catch (error) {
					console.error('Error parsing chunk:', error);
				}
			}
		}
		processMarkdown(result);
	}
	function processMarkdown(markdown) {
		const rawHtml = marked(markdown);
		const safeHtml = DOMPurify.sanitize(rawHtml);
		result = safeHtml; // Update the result with sanitized HTML
	}

	async function getImage() {
		const response = await fetch('/api/dalle', {
			method: 'POST',
			body: JSON.stringify({}),
			headers: {
				'content-type': 'application/json'
			}
		});
		let image = await response.json();
		imageurl = image.data[0].url;
	}
</script>

<div class="w-1/2 m-auto my-4">
	<h1 class="text-2xl my-6">ELI5</h1>
	<div class="flex gap-5">
		<input class="input input-primary" bind:value={concept} />
		<button class="btn btn-primary" type="button" on:click={getStream}> Explain </button>
	</div>
	<div class="my-4 prose">{@html result}</div>

	<br />

	<button on:click={getImage}>Get Image</button>
	<img src={imageurl} alt="Here" />
</div>

<style>
</style>
