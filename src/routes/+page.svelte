<script>
	import P5 from 'p5-svelte';
	import Modal from '$lib/components/modal.svelte';
	import { marked } from 'marked';
	import DOMPurify from 'dompurify';
	import { writable } from 'svelte/store';

	let newConcept = writable(''); // Svelte store to hold the new concept
	let inputConcept = ''; // Local variable for form input

	let result = '';

	let showModal = false;
	let imageurl = '';
	let explosionInput = '';

	let selectedConcepts = [];

	const concepts = ['Stochastic Gradient Descent', 'Bhagavad Gita'];

	function handleClosed(event) {
		selectedConcepts = [];
		imageurl = '';
		console.log('Empty concepts array');
	}

	async function getImage() {
		const response = await fetch('/api/dalle', {
			method: 'POST',
			body: JSON.stringify({ selectedConcepts }),
			headers: {
				'content-type': 'application/json'
			}
		});
		let image = await response.json();
		imageurl = image.data[0].url;
	}

	async function getStream() {
		result = '';
		const response = await fetch('/api/double', {
			method: 'POST',
			body: JSON.stringify({ selectedConcepts }),
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

	const sketch = (p5) => {
		let bubbles = [];
		let particles = [];

		p5.setup = () => {
			p5.createCanvas(p5.windowWidth, p5.windowHeight);
			p5.textFont('Helvetica');
			p5.textSize(12);

			concepts.forEach((concept, index) => {
				let x = p5.random(p5.width);
				let y = p5.random(p5.height);
				let noiseOffsetX = p5.random(1000);
				let noiseOffsetY = p5.random(1000);
				bubbles.push(new Bubble(x, y, concept, noiseOffsetX, noiseOffsetY, p5));
			});
		};

		p5.draw = () => {
			p5.background(255);

			for (let i = particles.length - 1; i >= 0; i--) {
				particles[i].update();
				particles[i].show();
				if (particles[i].finished()) {
					particles.splice(i, 1);
				}
			}

			for (let i = 0; i < bubbles.length; i++) {
				for (let j = 0; j < bubbles.length; j++) {
					if (i !== j && bubbles[i].intersects(bubbles[j])) {
						bubbles[i].changeDirection();
						bubbles[j].changeDirection();
					}
				}

				bubbles[i].move();
				bubbles[i].display();
				bubbles[i].checkEdges();
			}
		};

		p5.mousePressed = () => {
			let clickedBubbleIndex = null;

			// Check if a bubble was clicked
			for (let i = bubbles.length - 1; i >= 0; i--) {
				if (bubbles[i].contains(p5.mouseX, p5.mouseY)) {
					selectedConcepts = [...selectedConcepts, bubbles[i].text];
					clickedBubbleIndex = i;
					break;
				}
			}

			if (clickedBubbleIndex !== null) {
				// Toggle selection state of the clicked bubble
				bubbles[clickedBubbleIndex].toggleSelected();

				// Check if two bubbles are selected
				const selectedBubbles = bubbles.filter((b) => b.selected);
				if (selectedBubbles.length === 2) {
					// Create explosion for both selected bubbles
					selectedBubbles.forEach((bubble) => {
						for (let j = 0; j < 10; j++) {
							particles.push(new Particle(bubble.x, bubble.y, p5));
						}
					});
					getStream();
					// getImage();
					showModal = true;
					// Remove both bubbles
					bubbles = bubbles.filter((b) => !b.selected);
				}
			} else {
				// Clicked outside a bubble, reset selections
				bubbles.forEach((b) => (b.selected = false));
			}
		};

		p5.windowResized = () => {
			p5.resizeCanvas(p5.windowWidth, p5.windowHeight);
		};

		newConcept.subscribe((concept) => {
			if (concept.trim() !== '') {
				let x = p5.random(p5.windowWidth);
				let y = p5.random(p5.windowHeight);
				let noiseOffsetX = p5.random(1000);
				let noiseOffsetY = p5.random(1000);
				bubbles.push(new Bubble(x, y, concept, noiseOffsetX, noiseOffsetY, p5));
				newConcept.set(''); // Reset the store
			}
		});

		class Particle {
			constructor(x, y, p5) {
				this.x = x;
				this.y = y;
				this.p5 = p5;
				this.vx = p5.random(-1, 1);
				this.vy = p5.random(-1, 1);
				this.alpha = 255;
			}

			update() {
				this.x += this.vx;
				this.y += this.vy;
				this.alpha -= 5;
			}

			show() {
				this.p5.noStroke();
				this.p5.fill(100, this.alpha);
				this.p5.ellipse(this.x, this.y, 16);
			}

			finished() {
				return this.alpha < 0;
			}
		}

		class Bubble {
			constructor(x, y, text, noiseOffsetX, noiseOffsetY, p5) {
				this.x = x;
				this.y = y;
				this.text = text;
				this.noiseOffsetX = noiseOffsetX;
				this.noiseOffsetY = noiseOffsetY;
				this.p5 = p5;
				this.radius = Math.max(60, p5.textWidth(text) / 2 + 10);
				this.dx = p5.random(-1, 1);
				this.dy = p5.random(-1, 1);
				this.selected = false;
				this.squiggleAmplitude = p5.random(5, 15);
				this.eyeSize = this.radius / 5;
				this.eyeOffsetX = this.radius / 3; // Horizontal offset for the eyes
				this.eyeOffsetY = -this.eyeSize; // Vertical offset for the eyes
				this.pupilSize = this.eyeSize / 2;
				this.blobColor = p5.color(255, 223, 0); // Yellow color for the blob
			}

			toggleSelected() {
				this.selected = !this.selected;
			}

			move() {
				this.x += this.dx;
				this.y += this.dy;
			}

			changeDirection() {
				this.dx *= -1;
				this.dy *= -1;
			}

			checkEdges() {
				if (this.x - this.radius <= 0 || this.x + this.radius >= this.p5.width) {
					this.dx *= -1;
				}
				if (this.y - this.radius <= 0 || this.y + this.radius >= this.p5.height) {
					this.dy *= -1;
				}
			}

			intersects(other) {
				let d = this.p5.dist(this.x, this.y, other.x, other.y);
				return d < this.radius + other.radius;
			}
			contains(x, y) {
				let d = this.p5.dist(x, y, this.x, this.y);
				return d < this.radius;
			}

			display() {
				// Draw the squiggly blob
				this.p5.push();
				this.p5.translate(this.x, this.y);
				this.p5.beginShape();
				const numPoints = 100;
				const angleStep = this.p5.TWO_PI / numPoints;
				for (let i = 0; i <= numPoints; i++) {
					let angle = i * angleStep;
					let radiusOffset =
						this.squiggleAmplitude * this.p5.sin(6 * angle + this.p5.millis() / 500);
					let x = (this.radius + radiusOffset) * this.p5.cos(angle);
					let y = (this.radius + radiusOffset) * this.p5.sin(angle);
					this.p5.vertex(x, y);
				}
				if (this.selected) {
					this.p5.fill(255, 182, 193);
				} else {
					this.p5.fill(173, 216, 230);
				}
				this.p5.endShape(this.p5.CLOSE);
				this.p5.pop();

				// Draw the eyes
				this.p5.fill(255); // White for the eyes
				this.p5.ellipse(
					this.x - this.eyeOffsetX,
					this.y + this.eyeOffsetY,
					this.eyeSize * 2,
					this.eyeSize * 2
				);
				this.p5.ellipse(
					this.x + this.eyeOffsetX,
					this.y + this.eyeOffsetY,
					this.eyeSize * 2,
					this.eyeSize * 2
				);

				// Calculate pupil direction based on mouse position
				let angleToMouse = this.p5.atan2(this.p5.mouseY - this.y, this.p5.mouseX - this.x);
				let pupilOffset = this.p5.map(
					this.p5.dist(this.p5.mouseX, this.p5.mouseY, this.x, this.y),
					0,
					500,
					0,
					this.eyeSize / 2
				);
				let pupilX = this.p5.cos(angleToMouse) * pupilOffset;
				let pupilY = this.p5.sin(angleToMouse) * pupilOffset;

				// Draw the pupils
				this.p5.fill(0); // Black for the pupils
				this.p5.ellipse(
					this.x - this.eyeOffsetX + pupilX,
					this.y + this.eyeOffsetY + pupilY,
					this.pupilSize,
					this.pupilSize
				);
				this.p5.ellipse(
					this.x + this.eyeOffsetX + pupilX,
					this.y + this.eyeOffsetY + pupilY,
					this.pupilSize,
					this.pupilSize
				);

				// Draw the text
				this.p5.fill(0); // Black for the text
				this.p5.noStroke();
				this.p5.textAlign(this.p5.CENTER, this.p5.CENTER);
				this.p5.text(this.text, this.x, this.y + this.eyeOffsetY + this.eyeSize * 2);
			}
		}
	};

	async function getExplosion() {
		const response = await fetch('/api/explosion', {
			method: 'POST',
			body: JSON.stringify({ explosionInput }),
			headers: {
				'content-type': 'application/json'
			}
		});
		let explosionOutput = await response.json();
		let explosionArray = JSON.parse(explosionOutput);
		console.log(explosionArray);

		var delayInMilliseconds = 100; // base delay
		for (let i = 0; i < explosionArray.length; i++) {
			setTimeout(function () {
				newConcept.set(explosionArray[i]); // Update the store
			}, i * delayInMilliseconds); // multiply by index for staggered delay
		}
	}

	function handleSubmit() {
		newConcept.set(inputConcept); // Update the store only on form submission
		inputConcept = ''; // Reset the input field
	}
</script>

<nav class="navbar bg-base-100 gap-5">
	<div class="border-r border-gray-700 pr-5 gap-3">
		<h1>VENN</h1>
		<svg width="46" height="29" viewBox="0 0 46 29" fill="none" xmlns="http://www.w3.org/2000/svg">
			<circle cx="14.5" cy="14.5" r="14" stroke="gray" />
			<circle cx="31.5" cy="14.5" r="14" stroke="gray" />
		</svg>
	</div>
	<!-- <button
		class="btn btn-ghost normal-case"
		on:click={() => {
			showModal = true;
		}}>Show Modal</button
	> -->

	<form class="gap-2" on:submit|preventDefault={handleSubmit}>
		<input
			class="input input-primary input-sm"
			type="text"
			placeholder="Concept"
			bind:value={inputConcept}
		/>
		<button class="btn btn-primary btn-sm normal-case">Add Concept</button>
	</form>
	<form class="gap-2" on:submit|preventDefault={getExplosion}>
		<input
			class="input input-primary input-sm"
			type="text"
			placeholder="Topic"
			bind:value={explosionInput}
		/>
		<button class="btn btn-primary btn-sm normal-case">Explode Topic</button>
	</form>
</nav>

<P5 {sketch} />

<Modal bind:showModal on:closed={handleClosed}>
	<h2 slot="header">Venn</h2>
	<div class="flex">
		<div class="my-4 prose">{@html result}</div>
		{#if imageurl}
			<img src={imageurl} alt="Dall-e" />
		{/if}
	</div>
</Modal>
