import assert from "node:assert/strict";
import { describe, test } from "node:test";

import { GameMode } from "./enums";
import frenchWords from "./french_words_5";
import {
	Language,
	formatGameHash,
	formatGameUrl,
	gameStorageKey,
	normalizeFrenchWord,
	parseGameHash,
	wordListFor,
} from "./language";

describe("language routes", () => {
	test("keeps legacy English mode links backward compatible", () => {
		assert.deepEqual(parseGameHash("#daily/42", GameMode.infinite, Language.French), {
			language: Language.English,
			mode: GameMode.daily,
			wordNumber: 42,
		});
	});

	test("parses explicit French links independently of game mode", () => {
		assert.deepEqual(parseGameHash("#fr/hourly/17", GameMode.daily, Language.English), {
			language: Language.French,
			mode: GameMode.hourly,
			wordNumber: 17,
		});
	});

	test("uses saved choices when no route is present", () => {
		assert.deepEqual(parseGameHash("", GameMode.infinite, Language.French), {
			language: Language.French,
			mode: GameMode.infinite,
		});
	});

	test("formats English and French links without mixing language into game modes", () => {
		assert.equal(formatGameHash(Language.English, GameMode.daily), "#daily");
		assert.equal(formatGameHash(Language.French, GameMode.daily), "#fr/daily");
		assert.equal(formatGameHash(Language.French, GameMode.hourly, 17), "#fr/hourly/17");
	});

	test("creates canonical historical share URLs without duplicate route segments", () => {
		assert.equal(
			formatGameUrl("https://joserdle.com/#fr/daily/12", Language.French, GameMode.daily, 12),
			"https://joserdle.com/#fr/daily/12"
		);
		assert.equal(
			formatGameUrl("https://example.com/joserdle/#daily", Language.English, GameMode.hourly, 7),
			"https://example.com/joserdle/#hourly/7"
		);
	});
});

describe("language-specific persistence", () => {
	test("preserves existing English keys and isolates French state", () => {
		assert.equal(gameStorageKey("stats", Language.English, GameMode.daily), "stats-0");
		assert.equal(gameStorageKey("state", Language.English, GameMode.hourly), "state-1");
		assert.equal(gameStorageKey("stats", Language.French, GameMode.daily), "stats-fr-0");
		assert.equal(gameStorageKey("state", Language.French, GameMode.hourly, true), "state-fr-1-h");
	});
});

describe("French words", () => {
	test("normalizes accents without requiring accented keyboard input", () => {
		assert.equal(normalizeFrenchWord("École"), "ecole");
		assert.equal(normalizeFrenchWord("forêt"), "foret");
		assert.equal(normalizeFrenchWord("reçu"), "recu");
	});

	test("ships substantial accentless five-letter answer and guess lists", () => {
		assert.ok(frenchWords.words.length >= 300);
		assert.ok(frenchWords.valid.length >= 5000);
		assert.equal(new Set(frenchWords.words).size, frenchWords.words.length);
		assert.equal(new Set(frenchWords.valid).size, frenchWords.valid.length);
		for (const word of [...frenchWords.words, ...frenchWords.valid]) {
			assert.match(word, /^[a-z]{5}$/);
		}
		for (const word of ["amour", "ecole", "foret", "merci", "rouge"]) {
			assert.equal(frenchWords.words.includes(word), true, `${word} should be a possible answer`);
		}
	});

	test("selects word lists by language", () => {
		assert.equal(wordListFor(Language.French), frenchWords);
		assert.equal(wordListFor(Language.French).contains("ecole"), true);
		assert.equal(wordListFor(Language.English).contains("cigar"), true);
		assert.equal(wordListFor(Language.English).contains("ecole"), false);
	});
});
