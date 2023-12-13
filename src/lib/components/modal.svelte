<script>
	export let showModal; // boolean

	import { createEventDispatcher } from 'svelte';

	const dispatch = createEventDispatcher();

	function closeModal() {
		dispatch('closed', {});
		dialog.close();
	}

	let dialog; // HTMLDialogElement

	$: if (dialog && showModal) dialog.showModal();
</script>

<!-- svelte-ignore a11y-click-events-have-key-events a11y-no-noninteractive-element-interactions -->
<dialog
	bind:this={dialog}
	on:close={() => (showModal = false)}
	on:click|self={() => dialog.close()}
	class="modal modal-bottom sm:modal-middle"
>
	<!-- svelte-ignore a11y-no-static-element-interactions -->
	<div on:click|stopPropagation class="modal-box">
		<button
			class="btn btn-xs text-xs btn-circle btn-ghost absolute right-2 top-2"
			on:click={closeModal}>✕</button
		>
		<slot name="header" />
		<!-- <hr /> -->
		<slot />
		<!-- <hr /> -->
		<!-- svelte-ignore a11y-autofocus -->
	</div>
</dialog>

<style>
</style>
