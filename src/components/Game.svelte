<script lang="ts">
	import { fade } from "svelte/transition";
	import Header from "./Header.svelte";
	import KioskComplete from "./KioskComplete.svelte";
	import { newKioskGame, kioskWord, kioskCopy } from "../kiosk";
	import { Board } from "./board";
	import Keyboard from "./keyboard";
	import Modal from "./Modal.svelte";
	import { getContext, onDestroy, onMount, setContext } from "svelte";
	import Settings from "./settings";
	import {
		Share,
		Separator,
		Definition,
		Tutorial,
		Statistics,
		Distribution,
		Timer,
		Toaster,
		ShareGame,
		Tips,
		Historical,
	} from "./widgets";
	import {
		contractNum,
		DELAY_INCREMENT,
		modeData,
		ROWS,
		COLS,
		newSeed,
		GameState,
		seededRandomInt,
		LetterStates,
		Stats,
	} from "../utils";
	import { language, letterStates, settings, mode } from "../stores";
	import { Language, formatGameHash, gameStorageKey, supportsDefinitions, type WordList } from "../language";

	export let word: string;
	export let wordList: WordList;
	export let stats: Stats;
	export let game: GameState;
	export let toaster: Toaster;

	setContext("toaster", toaster);
	const version = getContext<string>("version");

	// implement transition delay on keys
	const delay = DELAY_INCREMENT * ROWS + 800;

	let showTutorial = !$settings.kiosk && $settings.tutorial === 3;
	$: if ($settings.kiosk) showTutorial = false;
	$: copy = kioskCopy($settings.kiosk ? $language : Language.English);
	$: document.title = $settings.kiosk ? copy.title : "JOSERDLE";
	let showSettings = false;
	let showStats = false;
	let showHistorical = false;
	let showRefresh = false;

	let board: Board;
	let timer: Timer;
	let boardWidth = 0;
	let boardHeight = 0;

	function submitWord() {
		if (game.latestWord.length !== COLS) {
			toaster.pop(copy.notEnough);
			board.shake(game.guesses);
		} else if (wordList.contains(game.latestWord)) {
			if (game.guesses > 0) {
				const hm = game.checkHardMode();
				if ($settings.hard[$mode]) {
					if (hm.type === "🟩") {
						toaster.pop(
							copy.mustMatch($settings.kiosk && $language === Language.French ? `${hm.pos + 1}` : contractNum(hm.pos + 1), hm.char.toUpperCase())
						);
						board.shake(game.guesses);
						return;
					} else if (hm.type === "🟨") {
						toaster.pop(copy.mustContain(hm.char.toUpperCase()));
						board.shake(game.guesses);
						return;
					}
				} else if (hm.type !== "⬛") {
					game.validHard = false;
				}
			}
			game.board.state[game.guesses] = game.guess(word);
			++game.guesses;
			$letterStates.update(game.lastState, game.lastWord);
			$letterStates = $letterStates;
			if (game.lastWord === word) win();
			else if (game.guesses === ROWS) lose();
		} else {
			toaster.pop(copy.notInList);
			board.shake(game.guesses);
		}
	}

	let roundTimers: ReturnType<typeof setTimeout>[] = [];
	function clearRoundTimers() {
		roundTimers.forEach(clearTimeout);
		roundTimers = [];
	}
	function afterRound(callback: () => void, timeout: number) {
		const round = game;
		roundTimers.push(setTimeout(() => {
			if (game === round) callback();
		}, timeout));
	}
	onDestroy(clearRoundTimers);
	// A mode or language change must cancel callbacks from the previous board.
	let previousGame: GameState;
	let boardVersion = 0;
	$: if (game !== previousGame) {
		clearRoundTimers();
		previousGame = game;
		boardVersion += 1;
	}

	function resetGame() {
		clearRoundTimers();
		showTutorial = showSettings = showStats = showHistorical = showRefresh = false;
		$settings.tutorial = 0;
		if ($settings.kiosk) {
			game = newKioskGame();
		} else {
			modeData.modes[$mode].historical = false;
			modeData.modes[$mode].seed = newSeed($mode);
			game = new GameState($mode);
		}
		word = $settings.kiosk ? kioskWord() : wordList.words[seededRandomInt(0, wordList.words.length, modeData.modes[$mode].seed)];
		$letterStates = new LetterStates();
		window.location.hash = formatGameHash($settings.kiosk ? Language.English : $language, $mode, $settings.kiosk ? game.wordNumber : undefined);
		timer?.reset($mode);
	}

	function win() {
		board.bounce(game.guesses - 1);
		game.active = false;
		afterRound(
			() => toaster.pop(copy.praise[game.guesses - 1]),
			DELAY_INCREMENT * COLS + DELAY_INCREMENT
		);
		afterRound(setShowStatsTrue, delay * 1.4);
		if (!modeData.modes[$mode].historical) {
			stats.addWin(game.guesses, modeData.modes[$mode]);
			stats = stats;
			localStorage.setItem(gameStorageKey("stats", $language, $mode), stats.toString());
		}
	}

	function lose() {
		game.active = false;
		afterRound(setShowStatsTrue, delay);
		if (!modeData.modes[$mode].historical) {
			stats.addLoss(modeData.modes[$mode]);
			stats = stats;
			localStorage.setItem(gameStorageKey("stats", $language, $mode), stats.toString());
		}
	}

	function concede() {
		showSettings = false;
		afterRound(setShowStatsTrue, DELAY_INCREMENT);
		lose();
	}

	function reload() {
		if ($settings.kiosk) return resetGame();
		clearRoundTimers();
		modeData.modes[$mode].historical = false;
		modeData.modes[$mode].seed = newSeed($mode);
		game = new GameState(
			$mode,
			localStorage.getItem(gameStorageKey("state", $language, $mode))
		);
		word = wordList.words[
			seededRandomInt(0, wordList.words.length, modeData.modes[$mode].seed)
		];
		$letterStates = new LetterStates();
		showStats = false;
		showRefresh = false;
		timer.reset($mode);
	}

	function setShowStatsTrue() {
		if (!game.active) showStats = true;
	}

	function onSwipe(e: Swipe) {
		if ($settings.kiosk) return;
		switch (e.detail.direction) {
			case "left":
				$mode = ($mode + 1) % modeData.modes.length;
				toaster.pop(modeData.modes[$mode].name);
				break;
			case "right":
				$mode = ($mode - 1 + modeData.modes.length) % modeData.modes.length;
				toaster.pop(modeData.modes[$mode].name);
				break;
		}
	}

	onMount(() => {
		if (!game.active) afterRound(setShowStatsTrue, delay);
	});
	// $: toaster.pop(word);
</script>

<svelte:body on:click={board.hideCtx} on:contextmenu={board.hideCtx} />

<main class:guesses={game.guesses !== 0} style="--rows: {ROWS}; --cols: {COLS}; --board-size: {Math.min(boardWidth, boardHeight * COLS / ROWS)}px">
	<div class="game-header">
		<Header
			bind:showRefresh
			tutorial={!$settings.kiosk && $settings.tutorial === 2}
			on:closeTutPopUp|once={() => ($settings.tutorial = 1)}
			showStats={$settings.kiosk ? !game.active : stats.played > 0 || (modeData.modes[$mode].historical && !game.active)}
			on:stats={() => (showStats = true)}
			on:tutorial={() => (showTutorial = true)}
			on:settings={() => (showSettings = true)}
			on:reload={reload}
			on:reset={resetGame}
		/>
	</div>
	<div class="board-space" bind:clientWidth={boardWidth} bind:clientHeight={boardHeight}>
		{#key boardVersion}
			<Board
				bind:this={board}
				bind:value={game.board.words}
				tutorial={!$settings.kiosk && $settings.tutorial === 1}
				on:closeTutPopUp|once={() => ($settings.tutorial = 0)}
				board={game.board}
				{wordList}
				guesses={game.guesses}
				icon={$settings.kiosk ? undefined : modeData.modes[$mode].icon}
				on:swipe={onSwipe}
			/>
		{/key}
	</div>
	<Keyboard
		enterLabel={copy.enter}
		on:keystroke={() => {
			if ($settings.tutorial) $settings.tutorial = 0;
			board.hideCtx();
		}}
		bind:value={game.board.words[game.guesses === ROWS ? 0 : game.guesses]}
		on:submitWord={submitWord}
		on:esc={() => {
			showTutorial = false;
			if ($settings.kiosk && showStats && !game.active) resetGame();
			showStats = false;
			showSettings = false;
		}}
		disabled={!game.active || (!$settings.kiosk && $settings.tutorial === 3) || showHistorical || showSettings || showStats || showTutorial}
	/>
</main>

<Modal
	bind:visible={showTutorial}
	on:close|once={() => $settings.tutorial === 3 && --$settings.tutorial}
	fullscreen={$settings.tutorial === 0}
>
	{#if $settings.kiosk}
		<div class="kiosk-help">
			<h2>{copy.help}</h2>
			<p>{copy.helpIntro}</p>
			<p>{copy.helpClues}</p>
			<p>{copy.helpEnd}</p>
		</div>
	{:else}
		<Tutorial visible={showTutorial} />
	{/if}
</Modal>

<Modal completion={$settings.kiosk} bind:visible={showStats} on:close={() => { if ($settings.kiosk && !game.active) resetGame(); }}>
	{#if $settings.kiosk}
		<KioskComplete won={game.lastWord === word} on:return={resetGame} />
	{:else}
		{#if modeData.modes[$mode].historical}
			<h2 class="historical">Statistics not available for historical games</h2>
		{:else}
			<Statistics data={stats} />
			<Distribution distribution={stats.guesses} {game} />
		{/if}
		<Separator visible={!game.active}>
			<Timer
				slot="1"
				bind:this={timer}
				on:timeup={() => (showRefresh = true)}
				on:reload={reload}
			/>
			<Share slot="2" state={game} />
		</Separator>
		<ShareGame wordNumber={game.wordNumber} />
		{#if !game.active}
			{#if supportsDefinitions($language)}
				<Definition {word} alternates={2} />
			{:else}
				<div>Your word was <strong>{word}</strong>.</div>
			{/if}
		{:else}
			<!-- Fade with delay is to prevent a bright red button from appearing as soon as refresh is pressed -->
			<div
				in:fade={{ delay: 300 }}
				class="button concede"
				on:click={concede}
				on:keydown={concede}
			>
				give up
			</div>
		{/if}
	{/if}
</Modal>

<Modal fullscreen={true} bind:visible={showSettings}>
	<Settings state={game} on:historical={() => (showHistorical = true)} />
	{#if $settings.kiosk}
		<button type="button" class="button" on:click={resetGame}>{copy.reset}</button>
	{/if}
	{#if game.active}
		<div class="button concede" on:click={concede} on:keydown={concede}>{copy.giveUp}</div>
	{/if}
	{#if !$settings.kiosk}<Tips change={showSettings} />{/if}

	<svelte:fragment slot="footer">
		<div>
			<div
				title="double click to reset your stats"
				class="word"
				on:dblclick={() => {
					localStorage.clear();
					toaster.pop("localStorage cleared");
				}}
			>
			v{version}, {$settings.kiosk ? copy.round : `${modeData.modes[$mode].name} word`} #{game.wordNumber}
			</div>
		</div>
	</svelte:fragment>
</Modal>

<Modal bind:visible={showHistorical}>
	<Historical bind:showSettings />
</Modal>

<style lang="scss">
	main {
		--key-height: clamp(42px, 6.5vh, 104px);
		--key-font: clamp(13px, 2.1vh, 28px);
		--key-gap: clamp(5px, 0.8vh, 12px);
		display: grid;
		grid-template-rows: auto minmax(0, 1fr) auto;
		gap: clamp(10px, 1.5vh, 24px);
		align-items: center;
		height: 100%;
		width: min(100%, 100vh);
		margin: auto;
		padding: 0 clamp(8px, 2vw, 28px) max(8px, env(safe-area-inset-bottom));
		position: relative;
	}
	.board-space {
		min-height: 0;
		height: 100%;
		min-width: 0;
		display: flex;
		align-items: center;
		justify-content: center;
	}
	@supports (height: 100dvh) {
		main { width: min(100%, 100dvh); --key-height: clamp(42px, 6.5dvh, 104px); }
	}
	.game-header {
		width: 100%;
		flex-shrink: 0;
	}
	.kiosk-help { line-height: 1.6; padding-top: 24px; }
	.kiosk-help p { margin-top: 16px; }
	.historical {
		text-align: center;
		margin-top: 10px;
		padding: 0 20px;
		text-transform: uppercase;
	}
	button.button {
		border: 0;
		background: var(--color-correct);
		font: inherit;
	}
	.concede {
		background-color: var(--red);
	}
</style>
