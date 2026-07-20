import { GameMode } from "./enums";
import frenchWords from "./french_words_5";
import englishWordList from "./words_5";

export enum Language {
	English = "en",
	French = "fr",
}

export type WordList = {
	words: string[];
	valid: string[];
	contains: (word: string) => boolean;
};

const englishWords: WordList = {
	...englishWordList,
	contains: (word: string) =>
		englishWordList.words.includes(word) || englishWordList.valid.includes(word),
};

export const languageData = {
	default: Language.English,
	languages: [
		{ code: Language.English, name: "English", shortName: "EN" },
		{ code: Language.French, name: "French", shortName: "FR" },
	],
};

export function normalizeFrenchWord(word: string) {
	return word
		.toLocaleLowerCase("fr")
		.replaceAll("œ", "oe")
		.replaceAll("æ", "ae")
		.normalize("NFD")
		.replace(/[\u0300-\u036f]/g, "");
}

export function supportsDefinitions(language: Language) {
	return language === Language.English;
}

export function wordListFor(language: Language): WordList {
	return language === Language.French ? frenchWords : englishWords;
}

function parseMode(value: string | undefined, fallback: GameMode) {
	if (!value) return fallback;
	const parsed = GameMode[value as keyof typeof GameMode];
	return typeof parsed === "number" ? parsed : fallback;
}

export type GameRoute = {
	language: Language;
	mode: GameMode;
	wordNumber?: number;
};

export function parseGameHash(
	hash: string,
	fallbackMode: GameMode,
	fallbackLanguage: Language
): GameRoute {
	const parts = hash.replace(/^#/, "").split("/").filter(Boolean);
	if (parts.length === 0) {
		return { language: fallbackLanguage, mode: fallbackMode };
	}

	let language = Language.English;
	let modeIndex = 0;
	if (parts[0] === Language.French || parts[0] === Language.English) {
		language = parts[0] as Language;
		modeIndex = 1;
	}

	const mode = parseMode(parts[modeIndex], fallbackMode);
	const rawWordNumber = parts[modeIndex + 1];
	const wordNumber = rawWordNumber && /^\d+$/.test(rawWordNumber) ? Number(rawWordNumber) : undefined;
	return wordNumber && wordNumber > 0
		? { language, mode, wordNumber }
		: { language, mode };
}

export function historicalSeed(start: number, unit: number, wordNumber: number) {
	return start + (wordNumber - 1) * unit;
}

export function parseHistoricalGameLink(
	link: string,
	currentWordNumber: (mode: GameMode) => number
): GameRoute | null {
	const hashIndex = link.indexOf("#");
	if (hashIndex < 0) return null;
	const hash = link.slice(hashIndex).toLowerCase();
	const route = parseGameHash(hash, GameMode.daily, Language.English);
	if (!route.wordNumber || hash !== formatGameHash(route.language, route.mode, route.wordNumber)) {
		return null;
	}
	return route.wordNumber < currentWordNumber(route.mode) ? route : null;
}

export function formatGameHash(language: Language, mode: GameMode, wordNumber?: number) {
	const parts = language === Language.French
		? [Language.French, GameMode[mode]]
		: [GameMode[mode]];
	if (wordNumber) parts.push(`${wordNumber}`);
	return `#${parts.join("/")}`;
}

export function formatGameUrl(
	currentUrl: string,
	language: Language,
	mode: GameMode,
	wordNumber?: number
) {
	const url = new URL(currentUrl);
	url.hash = formatGameHash(language, mode, wordNumber);
	return url.toString();
}

export function gameStorageKey(
	kind: "state" | "stats",
	language: Language,
	mode: GameMode,
	historical = false
) {
	const languageSegment = language === Language.French ? "-fr" : "";
	const historicalSegment = historical ? "-h" : "";
	return `${kind}${languageSegment}-${mode}${historicalSegment}`;
}
