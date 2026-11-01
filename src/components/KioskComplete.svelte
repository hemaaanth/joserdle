<script lang="ts">
	import { createEventDispatcher } from "svelte";
	import { kioskCopy } from "../kiosk";

	import { language } from "../stores";
	$: copy = kioskCopy($language);
	export let won: boolean;
	const dispatch = createEventDispatcher();
</script>

<div class="completion">
	<div class="heading">
		<h2>{won ? copy.wellDone : copy.thanks}</h2>
		<p>{copy.scan}</p>
	</div>
	<div class="qr">
		<img src="/img/joserdle-qr.svg" width="264" height="264" alt={copy.qrAlt} />
	</div>
	<button type="button" on:click={() => dispatch("return")}>
		<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M19 12H5m6-6-6 6 6 6" /></svg>
		{copy.return}
	</button>
</div>

<style>
	.completion { display: flex; flex-direction: column; align-items: center; gap: clamp(12px, 2vh, 24px); text-align: center; }
	h2 { font-size: clamp(28px, 4vh, 42px); letter-spacing: -0.04em; line-height: 1.15; }
	p { margin-top: 10px; font-size: clamp(16px, 2.2vh, 22px); color: var(--fg-secondary); }
	.qr { display: block; padding: 4px; background: white; border-radius: 16px; line-height: 0; }
	img { width: clamp(160px, 27vh, 280px); max-width: 65vw; height: auto; border-radius: 12px; }
	button { display: flex; align-items: center; justify-content: center; gap: 10px; width: 100%; min-height: 52px; margin-top: 4px; border: 0; border-radius: 12px; background: var(--color-correct); color: white; font: inherit; font-size: 17px; font-weight: 600; cursor: pointer; }
	button svg { width: 20px; height: 20px; }
	button:hover { filter: brightness(1.1); }
	button:focus-visible { outline: 2px solid var(--fg-primary); outline-offset: 4px; }
</style>
