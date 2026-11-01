<script lang="ts">
	import { createEventDispatcher, onMount } from "svelte";
	import { kioskCopy, IdleReset, ScreenAwake, type WakeLockAPI } from "../kiosk";

	const dispatch = createEventDispatcher();
	import { language } from "../stores";
	$: copy = kioskCopy($language);
	let fullscreen = false;
	let fullscreenAvailable = false;
	let fullscreenError = false;

	async function toggleFullscreen() {
		try {
			if (document.fullscreenElement) await document.exitFullscreen();
			else await document.documentElement.requestFullscreen();
			fullscreenError = false;
		} catch {
			fullscreenError = true;
		}
	}

	onMount(() => {
		const idle = new IdleReset(() => dispatch("reset"));
		const awake = new ScreenAwake(
			(navigator as Navigator & { wakeLock?: WakeLockAPI }).wakeLock,
			() => {}
		);
		const activity = () => {
			idle.activity();
			if (document.visibilityState === "visible") void awake.request();
		};
		const visibility = () => {
			if (document.visibilityState === "visible") {
				idle.check();
				void awake.request();
			}
		};
		const fullscreenChange = () => (fullscreen = !!document.fullscreenElement);
		fullscreenAvailable = !!document.fullscreenEnabled;
		fullscreenChange();
		const events = ["pointerdown", "touchstart", "keydown"];
		for (const event of events) window.addEventListener(event, activity, { capture: true, passive: true });
		document.addEventListener("visibilitychange", visibility);
		document.addEventListener("fullscreenchange", fullscreenChange);
		const interval = window.setInterval(() => idle.check(), 1000);
		visibility();
		return () => {
			window.clearInterval(interval);
			for (const event of events) window.removeEventListener(event, activity, true);
			document.removeEventListener("visibilitychange", visibility);
			document.removeEventListener("fullscreenchange", fullscreenChange);
			awake.stop();
		};
	});
</script>

<div class="controls">
	<button
		type="button"
		aria-label={fullscreen ? copy.exitFullscreen : copy.fullscreen}
		title={fullscreenError ? copy.fullscreenBlocked : (!fullscreenAvailable ? copy.fullscreenUnavailable : fullscreen ? copy.exitFullscreen : copy.fullscreen)}
		on:click={toggleFullscreen}
		on:keydown|stopPropagation
		disabled={!fullscreenAvailable}
	>
		<svg viewBox="0 0 24 24" aria-hidden="true">
			{#if fullscreen}
				<path d="M5 16h3v3h2v-5H5v2zm3-8H5v2h5V5H8v3zm6 11h2v-3h3v-2h-5v5zm2-11V5h-2v5h5V8h-3z" />
			{:else}
				<path d="M3 3h7v2H5v5H3V3zm11 0h7v7h-2V5h-5V3zM3 14h2v5h5v2H3v-7zm16 0h2v7h-7v-2h5v-5z" />
			{/if}
		</svg>
	</button>
	<button type="button" aria-label={copy.reset} title={copy.reset} on:keydown|stopPropagation on:click={() => dispatch("reset")}>
		<svg viewBox="0 0 24 24" aria-hidden="true">
			<path d="M12 4a8 8 0 1 1-7.75 10h2.1A6 6 0 1 0 12 6c-1.66 0-3.16.67-4.24 1.76L11 11H3V3l3.34 3.34A7.97 7.97 0 0 1 12 4z" />
		</svg>
	</button>
</div>

<style>
	.controls { display: flex; align-items: center; gap: 2px; }
	button { display: grid; place-items: center; width: 40px; height: 44px; padding: 8px; border: 0; border-radius: 8px; background: transparent; color: var(--icon-color); cursor: pointer; }
	svg { width: 24px; height: 24px; fill: currentColor; }
	button:hover { color: var(--fg-primary); background: var(--bg-secondary); }
	button:disabled { opacity: 0.35; cursor: default; }
	button:focus-visible { outline: 2px solid var(--fg-primary); outline-offset: 2px; }
</style>
