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
	import { onDestroy, setContext } from "svelte";
	import { get } from "svelte/store";
	import { KIOSK_MODE, KIOSK_LANGUAGE_KEY, kioskLanguage, kioskWord, kioskWordList, KIOSK_STATE_KEY, newKioskGame, pinKioskGame } from "./kiosk";

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
	// The kiosk hash must not replace the user's normal saved selection on reload.
	const route = parseGameHash(get(settings).kiosk ? "" : window.location.hash, fallbackMode, fallbackLanguage);
	let kiosk = false;
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
		if (!kiosk) {
			localStorage.setItem("mode", `${currentMode}`);
			localStorage.setItem("language", currentLanguage);
		}
		wordList = kiosk ? kioskWordList(currentLanguage) : wordListFor(currentLanguage);
		stats = new Stats(
			localStorage.getItem(gameStorageKey("stats", currentLanguage, currentMode)) || currentMode
		);
		word = kiosk ? kioskWord() : wordList.words[
			seededRandomInt(0, wordList.words.length, modeData.modes[currentMode].seed)
		];
		const historical = modeData.modes[currentMode].historical;
		state = kiosk ? newKioskGame(localStorage.getItem(KIOSK_STATE_KEY)) : new GameState(
			currentMode,
			localStorage.getItem(gameStorageKey("state", currentLanguage, currentMode, historical))
		);
		window.location.hash = formatGameHash(
			kiosk ? Language.English : currentLanguage,
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
		if (kiosk) localStorage.setItem(KIOSK_LANGUAGE_KEY, newLanguage);
		loadGame();
	});

	let normalSelection: { mode: GameMode; language: Language; hourlySeed: number; hourlyHistorical: boolean };
	onDestroy(settings.subscribe((s) => {
		if (s.kiosk === kiosk) return;
		kiosk = s.kiosk;
		if (kiosk) {
			normalSelection = {
				mode: currentMode, language: currentLanguage,
				hourlySeed: modeData.modes[KIOSK_MODE].seed,
				hourlyHistorical: modeData.modes[KIOSK_MODE].historical,
			};
			pinKioskGame();
			currentMode = KIOSK_MODE;
			currentLanguage = kioskLanguage(localStorage.getItem(KIOSK_LANGUAGE_KEY));
		} else {
			modeData.modes[KIOSK_MODE].seed = normalSelection.hourlySeed;
			modeData.modes[KIOSK_MODE].historical = normalSelection.hourlyHistorical;
			currentMode = normalSelection.mode;
			currentLanguage = normalSelection.language;
		}
		mode.set(currentMode);
		language.set(currentLanguage);
	}));

	$: if (state) saveState(state);
	function saveState(gameState: GameState) {
		localStorage.setItem(
			kiosk ? KIOSK_STATE_KEY : gameStorageKey(
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
