<script>
	export let label;
	export let placeholder;
	export let value;
</script>

<div class="form-control">
	<label class="label" for="concept">
		<span class="label-text">{label}</span>
	</label>
	<input type="text" {placeholder} class="input input-bordered" bind:value name="concept" />
</div>
