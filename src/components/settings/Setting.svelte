<script lang="ts">
	import Switch from "./Switch.svelte";
	import DropDown from "./DropDown.svelte";
	let title: HTMLElement;
	export let value: any;
	export let type: SettingType;
	export let options: (string | number)[] = [];
	export let disabled = false;
</script>

<div class="setting">
	<div>
		<div class="title" bind:this={title}><slot name="title" /></div>
		<div class="desc"><slot name="desc" /></div>
	</div>
	{#if type === "custom"}
		<slot name="custom" />
	{:else if type === "switch"}
		<Switch bind:value {disabled} label={title?.textContent || "Setting"} />
	{:else}
		<DropDown bind:value {options} {disabled} />
	{/if}
</div>

<style>
	.setting {
		/* border-bottom: 1px solid var(--border-primary); */
		display: flex;
		justify-content: space-between;
		align-items: center;
	}
	.title {
		font-size: var(--fs-medium);
		font-weight: 500;
	}
	.desc {
		font-size: var(--fs-tiny);
		color: var(--fg-secondary);
	}
</style>
