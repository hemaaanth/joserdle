<script lang="ts">
	export let value: boolean;
	export let disabled = false;
	export let label = "Setting";
</script>

<button type="button" role="switch" aria-label={label} aria-checked={value}
	on:click={() => (value = !value)} class:checked={value} {disabled} />

<style lang="scss">
	button:disabled {
		opacity: 0.5;
		cursor: unset;
	}
	button {
		padding: 0;
		border: 0;
		flex-shrink: 0;
		width: 32px;
		height: 20px;
		border-radius: 10px;
		background: var(--icon-color);
		position: relative;
		cursor: pointer;
		transition: background-color 0.3s ease;
		&::before {
			content: "";
			position: absolute;
			top: 0;
			width: 16px;
			aspect-ratio: 1;
			background: white;
			border-radius: 50%;
			margin: 2px;
			left: 0;
			transition: left 0.3s ease;
		}
	}
	button:focus-visible { outline: 2px solid var(--fg-primary); outline-offset: 3px; }
	.checked {
		background: var(--color-correct);
		&::before {
			left: 12px;
		}
	}
</style>
