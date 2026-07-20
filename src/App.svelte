<script context="module" lang="ts">
	import {
		modeData,
		seededRandomInt,
		Stats,
		GameState,
		Settings,
		LetterStates,
		getWordNumber,
	} from "./utils";
	import Game from "./components/Game.svelte";
	import { language, letterStates, settings, mode } from "./stores";
	import { GameMode } from "./enums";
	import {
		formatGameHash,
		gameStorageKey,
		Language,
		parseGameHash,
		wordListFor,
		type WordList,
	} from "./language";
	import { Toaster } from "./components/widgets";
	import { setContext } from "svelte";

	document.title = "JOSERDLE";
</script>

<script lang="ts">
	export let version: string;
	setContext("version", version);
	localStorage.setItem("version", version);
	let stats: Stats;
	let word: string;
	let wordList: WordList;
	let state: GameState;
	let toaster: Toaster;

	settings.set(new Settings(localStorage.getItem("settings")));
	settings.subscribe((s) => localStorage.setItem("settings", JSON.stringify(s)));

	const storedMode = Number(localStorage.getItem("mode"));
	const fallbackMode = Number.isInteger(storedMode) && modeData.modes[storedMode]
		? storedMode
		: modeData.default;
	const fallbackLanguage = localStorage.getItem("language") === Language.French
		? Language.French
		: Language.English;
	const route = parseGameHash(window.location.hash, fallbackMode, fallbackLanguage);
	let currentMode = route.mode;
	let currentLanguage = route.language;

	mode.set(currentMode);
	language.set(currentLanguage);
	// If this is a link to a specific word make sure that that is the word.
	if (route.wordNumber && route.wordNumber < getWordNumber(currentMode)) {
		modeData.modes[currentMode].seed =
			(route.wordNumber - 1) * modeData.modes[currentMode].unit + modeData.modes[currentMode].start;
		modeData.modes[currentMode].historical = true;
	}

	function loadGame() {
		localStorage.setItem("mode", `${currentMode}`);
		localStorage.setItem("language", currentLanguage);
		wordList = wordListFor(currentLanguage);
		stats = new Stats(
			localStorage.getItem(gameStorageKey("stats", currentLanguage, currentMode)) || currentMode
		);
		word = wordList.words[
			seededRandomInt(0, wordList.words.length, modeData.modes[currentMode].seed)
		];
		const historical = modeData.modes[currentMode].historical;
		state = new GameState(
			currentMode,
			localStorage.getItem(gameStorageKey("state", currentLanguage, currentMode, historical))
		);
		window.location.hash = formatGameHash(
			currentLanguage,
			currentMode,
			historical ? state.wordNumber : undefined
		);
		// Set the letter states when data for a new game mode or language is loaded.
		letterStates.set(new LetterStates(state.board));
	}

	mode.subscribe((newMode) => {
		currentMode = newMode;
		loadGame();
	});
	language.subscribe((newLanguage) => {
		currentLanguage = newLanguage;
		loadGame();
	});

	$: if (state) saveState(state);
	function saveState(gameState: GameState) {
		localStorage.setItem(
			gameStorageKey(
				"state",
				currentLanguage,
				currentMode,
				modeData.modes[currentMode].historical
			),
			gameState.toString()
		);
	}
</script>

<Toaster bind:this={toaster} />
{#if toaster}
	<Game {stats} {wordList} bind:word {toaster} bind:game={state} />
{/if}
