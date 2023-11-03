<script lang="ts">
	import { COLS, ROWS } from "../../utils";

	import { Tile } from "../board";
	export let visible: boolean;
</script>

<h3>how to play</h3>
<div>Guess the <strong>JOSERDLE</strong> in {ROWS} tries.</div>
<div>Each guess must be a valid {COLS} letter word. Hit the enter button to submit.</div>
<div>
	After each guess, the color of the tiles will change to show how close your guess was to the
	word.
</div>
<div class:complete={visible} class="examples">
	<div><strong>Examples</strong></div>
	<div class="row">
		<Tile value="a" state="🟩" />
		<Tile value="d" state="🔳" />
		<Tile value="i" state="🔳" />
		<Tile value="e" state="🔳" />
		<Tile value="u" state="🔳" />
	</div>
	<div>The letter <strong>A</strong> is in the word and in the correct spot.</div>
	<div class="row">
		<Tile value="s" state="🔳" />
		<Tile value="p" state="🟨" />
		<Tile value="i" state="🔳" />
		<Tile value="l" state="🔳" />
		<Tile value="l" state="🔳" />
	</div>
	<div>The letter <strong>P</strong> is in the word but in the wrong spot.</div>
	<div class="row">
		<Tile value="v" state="🔳" />
		<Tile value="a" state="🔳" />
		<Tile value="g" state="🔳" />
		<Tile value="u" state="⬛" />
		<Tile value="e" state="🔳" />
	</div>
	<div>The letter <strong>U</strong> is not in the word in any spot.</div>
</div>

<style lang="scss">
	div {
		margin: 14px 0;
	}
	.examples {
		border-top: 1px solid var(--border-primary);
		border-bottom: 1px solid var(--border-primary);
		:global(.row > *) {
			height: 100%;
			aspect-ratio: 1;
		}
		&:not(.complete) :global(.row .back) {
			transition-delay: 0.3s;
		}
	}
	.row {
		height: 40px;
		display: flex;
		gap: 4px;
	}
</style>
