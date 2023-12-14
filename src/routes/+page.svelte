<script>
	import { writable } from 'svelte/store';
	import { marked } from 'marked';
	import DOMPurify from 'dompurify';

	import P5 from 'p5-svelte';

	import Modal from '$lib/components/modal.svelte';

	// Interactive UI Vars
	const PRIMARY_CONCEPTS = ['Stochastic Gradient Descent', 'Bhagavad Gita'];
	const CHOICE_CONCEPTS = [
		'Determinism',
		'Optimization',
		'Conflict Resolution',
		'Moral Decision Making',
		'Iterative Progress'
	];
	const CORRECT_ANSWER = 'Iterative Progress';
	const userName = 'Andi';

	let userAnswer = '';

	let newConcept = writable('');
	let inputConcept = '';
	let selectedConcepts = [];
	let showModal = false;

	// API Result Vars
	let vennStreamResult = '';
	let imageurl = '';
	let explosionInput = '';

	// Other Initial
	const today = new Date();
	const options = { month: 'short', day: 'numeric', year: 'numeric' };
	const formattedDate = today.toLocaleDateString('en-US', options);

	// ------------- UI Functions -------------
	function handleModalClosed() {
		selectedConcepts = [];
		imageurl = '';
	}

	function handleAddSubmission() {
		newConcept.set(inputConcept); // Update the store only on form submission
		inputConcept = ''; // Reset the input field
	}

	// ------------- OpenAI API Calls -------------
	async function getDalleImage() {
		imageurl = '';
		const response = await fetch('/api/dalle', {
			method: 'POST',
			body: JSON.stringify({ selectedConcepts }),
			headers: {
				'content-type': 'application/json'
			}
		});
		let imageResponse = await response.json();
		imageurl = imageResponse.data[0].url;
	}

	async function getVennStream() {
		vennStreamResult = '';
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
							processMarkdown(vennStreamResult); // Process the final content
							break;
						}
						// Append only the content part to the vennStreamResult
						vennStreamResult += json.choices[0].delta.content;
					}
				} catch (error) {
					console.error('Error parsing chunk:', error);
				}
			}
		}
		processMarkdown(vennStreamResult);
	}
	async function getVennGameStream() {
		// TODO: Hack variable, need to clean up later
		selectedConcepts = [CORRECT_ANSWER, PRIMARY_CONCEPTS[0], PRIMARY_CONCEPTS[1]];

		vennStreamResult = '';
		const response = await fetch('/api/game', {
			method: 'POST',
			body: JSON.stringify({ selectedConcepts, userName }),
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
							processMarkdown(vennStreamResult); // Process the final content
							break;
						}
						// Append only the content part to the vennStreamResult
						vennStreamResult += json.choices[0].delta.content;
					}
				} catch (error) {
					console.error('Error parsing chunk:', error);
				}
			}
		}
		processMarkdown(vennStreamResult);
	}

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

	// ------------- Utility Functions -------------
	function processMarkdown(markdown) {
		const rawHtml = marked(markdown);
		const safeHtml = DOMPurify.sanitize(rawHtml);
		vennStreamResult = safeHtml; // Update the vennStreamResult with sanitized HTML
	}

	// ------------- P5 -------------

	const sketch = (p5) => {
		let bubbles = [];
		let particles = [];

		// Wall Positions
		const adjustedScreenHeight = p5.windowHeight - 64;
		const topWallY = adjustedScreenHeight / 4.5;
		const bottomWallY = (2 * adjustedScreenHeight) / 2.5;
		const wallHeight = 5;

		p5.setup = () => {
			p5.createCanvas(p5.windowWidth, adjustedScreenHeight);
			p5.textFont('Helvetica');
			p5.textSize(10);
			bubbles.push(new PrimaryBubble(p5.width / 2, 80, PRIMARY_CONCEPTS[0], 0, 0, p5, true));
			// Top static bubble
			bubbles.push(
				new PrimaryBubble(p5.width / 2, p5.height - 80, PRIMARY_CONCEPTS[1], 0, 0, p5, true)
			); // Bottom static bubble
			for (let i = 0; i < CHOICE_CONCEPTS.length; i++) {
				let x = p5.random(p5.width);
				// Note: Extra minus integer so it doesn't get stuck in the wall
				let y = p5.random(topWallY + wallHeight + 10, bottomWallY - wallHeight - 10);
				let noiseOffsetX = p5.random(5000);
				let noiseOffsetY = p5.random(1000);
				bubbles.push(new Bubble(x, y, CHOICE_CONCEPTS[i], noiseOffsetX, noiseOffsetY, p5));
			}
		};

		p5.windowResized = () => {
			resizeCanvas(windowWidth, windowHeight);
		};

		p5.draw = () => {
			p5.background(255);

			p5.fill(0); // Black color for walls
			p5.rect(0, topWallY, p5.width, wallHeight); // Top wall
			p5.rect(0, bottomWallY, p5.width, wallHeight); // Bottom wall

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
					userAnswer = bubbles[i].text;
					clickedBubbleIndex = i;
					break;
				}
			}

			if (clickedBubbleIndex !== null) {
				if (userAnswer == CORRECT_ANSWER) {
					bubbles.forEach((bubble) => {
						particles.push(new Particle(bubble.x, bubble.y, p5));
						bubbles = bubbles.filter((b) => b.correctAnswer || b.primary);
					});
					getVennGameStream();
					getDalleImage();
					showModal = true;
				} else {
					console.log(clickedBubbleIndex);
					bubbles[clickedBubbleIndex].toggleSelected();
					particles.push(
						new Particle(bubbles[clickedBubbleIndex].x, bubbles[clickedBubbleIndex].y, p5)
					);
					bubbles = bubbles.filter((b) => !b.selected);
				}
				console.log('Correct Answer?: ' + (userAnswer == CORRECT_ANSWER));
				// Toggle selection state of the clicked bubble
				// bubbles[clickedBubbleIndex].toggleSelected();

				// Check if two bubbles are selected
				// const selectedBubbles = bubbles.filter((b) => b.selected);
				// if (selectedBubbles.length === 2) {
				// 	// Create explosion for both selected bubbles
				// 	selectedBubbles.forEach((bubble) => {
				// 		for (let j = 0; j < 10; j++) {
				// 			particles.push(new Particle(bubble.x, bubble.y, p5));
				// 		}
				// 	});
				// 	getVennStream();
				// 	getDalleImage();
				// 	showModal = true;
				// 	// Remove both bubbles
				// 	bubbles = bubbles.filter((b) => !b.selected);
				// }
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
			constructor(x, y, text, noiseOffsetX, noiseOffsetY, p5, isStatic = false) {
				this.isStatic = isStatic;
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
				this.correctAnswer = this.text == CORRECT_ANSWER;
				this.primary = false;
			}

			toggleSelected() {
				this.selected = !this.selected;
			}

			move() {
				if (!this.isStatic) {
					this.x += this.dx;
					this.y += this.dy;
				}
			}

			changeDirection() {
				this.dx *= -1;
				this.dy *= -1;
			}

			checkEdges() {
				if (this.x - this.radius <= 0 || this.x + this.radius >= this.p5.width) {
					this.dx *= -1;
				}

				if (this.y - this.radius <= topWallY + wallHeight || this.y + this.radius >= bottomWallY) {
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

			drawEyes() {
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
			}

			drawText() {
				// Draw the text
				this.p5.fill(0); // Black for the text
				this.p5.noStroke();
				this.p5.textAlign(this.p5.CENTER, this.p5.CENTER);
				this.p5.text(this.text, this.x, this.y + this.eyeOffsetY + this.eyeSize * 2);
			}

			display() {
				// Draw the squiggly blob
				this.p5.push();
				if (this.isStatic) {
					p5.color(255, 223, 0);
				}
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

				this.drawEyes();
				this.drawText();
			}
		}

		class PrimaryBubble extends Bubble {
			constructor(x, y, text, noiseOffsetX, noiseOffsetY, p5, isStatic = false, blobColor) {
				super(x, y, text, noiseOffsetX, noiseOffsetY, p5, isStatic);
				this.blobColor = blobColor || p5.color(255, 223, 0); // Default to yellow if no color provided
				this.primary = true;
			}
			display() {
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
				this.p5.fill(this.blobColor); // Use the blobColor for fill
				this.p5.endShape(this.p5.CLOSE);
				this.p5.pop();

				super.drawEyes();
				super.drawText();
			}
		}
	};
</script>

<nav class="navbar bg-base-100 gap-5">
	<div class="border-r border-gray-700 pr-5 gap-3">
		<h1>VENN</h1>
		<svg width="46" height="29" viewBox="0 0 46 29" fill="none" xmlns="http://www.w3.org/2000/svg">
			<circle cx="14.5" cy="14.5" r="14" stroke="gray" />
			<circle cx="31.5" cy="14.5" r="14" stroke="gray" />
		</svg>
	</div>
	<div class="text-neutral-content gap-2 pr-5 border-r border-gray-700">
		<h2 class="text-neutral uppercase text-xs">Level</h2>
		<h2 class="text-primary font-bold">1</h2>
		<h2>2</h2>
		<h2>3</h2>
		<h2>4</h2>
		<h2>5</h2>
		<h2>6</h2>
	</div>
	<button
		class="btn btn-ghost normal-case"
		on:click={() => {
			showModal = true;
		}}>Show Modal</button
	>

	<form class="gap-2" on:submit|preventDefault={handleAddSubmission}>
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

<div class="flex">
	<P5 {sketch} />
</div>

<Modal bind:showModal on:closed={handleModalClosed}>
	<div class="prose">
		<p class="mb-2 font-bold">
			What do {selectedConcepts[1] || 'Concept 1'} and {selectedConcepts[2] || 'Concept 2'} have in common?
		</p>
		{#if imageurl}
			<img class="m-auto rounded" src={imageurl} alt="Dall-e" />
		{:else}
			<div class="relative block h-96 w-96">
				<span class="loader m-auto"></span>
			</div>
		{/if}
		<div class="text-sm mt-4">{@html vennStreamResult}</div>

		<div class="flex justify-between mt-5">
			<div class="flex border border-gray-400 rounded-md text-xs items-center py-1">
				<div class="border-r border-gray-400 px-2 flex gap-1">
					VENN
					<svg
						width="23"
						height="14.5"
						viewBox="0 0 23 14.5"
						fill="none"
						xmlns="http://www.w3.org/2000/svg"
					>
						<circle cx="7.25" cy="7.25" r="7" stroke="gray" />
						<circle cx="15.75" cy="7.25" r="7" stroke="gray" />
					</svg>
				</div>
				<div class="px-2 border-r border-gray-400">{userName}</div>
				<div class="px-2">{formattedDate}</div>
			</div>
		</div>
	</div>
</Modal>

<style>
</style>
