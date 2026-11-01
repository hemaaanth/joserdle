<script lang="ts">
	import { createEventDispatcher, onMount } from "svelte";
	import { IdleReset, ScreenAwake, type WakeLockAPI } from "../kiosk";

	const dispatch = createEventDispatcher();
	let fullscreen = false;
	let fullscreenAvailable = false;
	let wakeStatus = "Requesting keep awake…";
	let fullscreenError = "";

	async function toggleFullscreen() {
		try {
			if (document.fullscreenElement) await document.exitFullscreen();
			else await document.documentElement.requestFullscreen();
			fullscreenError = "";
		} catch {
			fullscreenError = "Full screen blocked by this browser.";
		}
	}

	onMount(() => {
		const idle = new IdleReset(() => dispatch("reset"));
		const awake = new ScreenAwake(
			(navigator as Navigator & { wakeLock?: WakeLockAPI }).wakeLock,
			(message) => (wakeStatus = message)
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

<div class="kiosk">
	<div class="controls">
		<button type="button" on:click={toggleFullscreen} disabled={!fullscreenAvailable}>
			{fullscreen ? "Exit full screen" : "Full screen"}
		</button>
		<button type="button" on:click={() => dispatch("reset")}>Reset game</button>
	</div>
	<p role="status">{fullscreenError || (!fullscreenAvailable ? "Full screen unavailable in this browser. " : "")}{wakeStatus}</p>
</div>

<style>
	.kiosk { width: 100%; padding: 4px 8px; text-align: center; }
	.controls { display: flex; gap: 8px; justify-content: center; }
	button { font: inherit; color: var(--fg-primary); background: var(--bg-secondary); border: 1px solid var(--border-primary); border-radius: 4px; min-height: 40px; padding: 6px 16px; cursor: pointer; }
	button:disabled { opacity: 0.5; cursor: default; }
	p { font-size: 0.75rem; color: var(--fg-secondary); margin: 4px 0; }
</style>
