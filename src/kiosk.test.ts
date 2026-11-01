import assert from "node:assert/strict";
import { test } from "node:test";
import { IdleReset, KIOSK_IDLE_MS, ScreenAwake, newKioskGame, KIOSK_MODE, KIOSK_WORD_NUMBER, KIOSK_STATE_KEY, kioskWord, kioskWordList, kioskLanguage, kioskCopy, type ScreenLock } from "./kiosk";
import { Settings, GameState, LetterStates, modeData, getWordNumber, seededRandomInt } from "./utils";
import { GameMode } from "./enums";
import { Language, wordListFor, historicalSeed, gameStorageKey } from "./language";

test("kiosk defaults off for existing settings and persists when enabled", () => {
	assert.equal(new Settings().kiosk, false);
	assert.equal(new Settings('{"dark":true,"tutorial":0}').kiosk, false);
	const settings = new Settings();
	settings.kiosk = true;
	assert.equal(new Settings(settings.toString()).kiosk, true);
});

test("idle reset uses 15 minutes since last input, including a suspended tab", () => {
	let now = 0;
	let resets = 0;
	const idle = new IdleReset(() => resets++, () => now);
	now = KIOSK_IDLE_MS - 1;
	idle.check();
	assert.equal(resets, 0);
	idle.activity();
	now += KIOSK_IDLE_MS - 1;
	idle.check();
	assert.equal(resets, 0);
	now++;
	idle.check();
	assert.equal(resets, 1);
	idle.check();
	assert.equal(resets, 1);
	now += KIOSK_IDLE_MS + 30_000;
	idle.activity();
	assert.equal(resets, 2);
	idle.check();
	assert.equal(resets, 2);
});

test("a fresh game clears completed state and keyboard clues in every mode", () => {
	for (const mode of [GameMode.daily, GameMode.hourly, GameMode.infinite]) {
		const old = new GameState(mode);
		old.active = false;
		old.guesses = 1;
		old.board.words[0] = "cigar";
		old.board.state[0].fill("🟩");
		assert.equal(new GameState(mode, old.toString()).active, false);
		const fresh = new GameState(mode);
		assert.equal(fresh.active, true);
		assert.equal(fresh.guesses, 0);
		assert.deepEqual(fresh.board.words, Array(6).fill(""));
		assert.equal(new LetterStates().c, "🔳");
	}
});

function screenLock() {
	let onRelease = () => {};
	const lock: ScreenLock = {
		released: false,
		async release() { lock.released = true; onRelease(); },
		addEventListener(_type, listener) { onRelease = listener; },
	};
	return lock;
}

test("wake lock is reused, reacquired after release, and released on disable", async () => {
	let calls = 0;
	const locks: ScreenLock[] = [];
	const statuses: string[] = [];
	const awake = new ScreenAwake({ async request() {
		calls++;
		const lock = screenLock();
		locks.push(lock);
		return lock;
	} }, (s) => statuses.push(s));
	await Promise.all([awake.request(), awake.request()]);
	assert.equal(calls, 1);
	await awake.request();
	assert.equal(calls, 1);
	await locks[0].release();
	assert.match(statuses.at(-1)!, /paused/);
	await awake.request();
	assert.equal(calls, 2);
	awake.stop();
	assert.equal(locks[1].released, true);
	await awake.request();
	assert.equal(calls, 2);
});

test("disabling kiosk during a pending wake request releases its eventual lock", async () => {
	let resolve: (lock: ScreenLock) => void;
	const awake = new ScreenAwake({ request: () => new Promise((r) => { resolve = r; }) }, () => {});
	const pending = awake.request();
	awake.stop();
	const lock = screenLock();
	resolve!(lock);
	await pending;
	assert.equal(lock.released, true);
});

test("unsupported and denied wake locks report status without breaking gameplay", async () => {
	let status = "";
	await new ScreenAwake(undefined, (s) => status = s).request();
	assert.match(status, /unavailable/);
	await new ScreenAwake({ async request() { throw new Error("denied"); } }, (s) => status = s).request();
	assert.match(status, /blocked/);
});


test("kiosk always pins English Hourly #37896 and resets to the same answer", () => {
	const original = { ...modeData.modes[KIOSK_MODE] };
	try {
		const old = newKioskGame();
		const seed = historicalSeed(original.start, original.unit, KIOSK_WORD_NUMBER);
		assert.equal(old.wordNumber, 37896);
		assert.equal(getWordNumber(KIOSK_MODE), 37896);
		assert.equal(old.time, seed);
		assert.equal(modeData.modes[KIOSK_MODE].historical, true);
		old.active = false;
		old.guesses = 4;
		assert.equal(newKioskGame(old.toString()).active, false);
		modeData.modes[KIOSK_MODE].seed += 100000000;
		const fresh = newKioskGame();
		assert.equal(fresh.time, seed);
		assert.equal(fresh.wordNumber, old.wordNumber);
		assert.equal(fresh.active, true);
		assert.equal(fresh.guesses, 0);
		const words = wordListFor(Language.English).words;
		assert.equal(words[seededRandomInt(0, words.length, fresh.time)], words[seededRandomInt(0, words.length, old.time)]);
		assert.notEqual(KIOSK_STATE_KEY, gameStorageKey("state", Language.English, KIOSK_MODE, true));
	} finally {
		Object.assign(modeData.modes[KIOSK_MODE], original);
	}
});


test("kiosk defaults to French and retains an explicit English choice", () => {
	assert.equal(kioskLanguage(null), Language.French);
	assert.equal(kioskLanguage("invalid"), Language.French);
	assert.equal(kioskLanguage("fr"), Language.French);
	assert.equal(kioskLanguage("en"), Language.English);
});

test("both kiosk languages keep the original answer and accept it as a guess", () => {
	assert.equal(kioskWord(), "blimp");
	for (const language of [Language.French, Language.English]) {
		const list = kioskWordList(language);
		assert.equal(list.contains(kioskWord()), true);
		assert.equal(list.words.includes(kioskWord()), true);
		assert.equal(list.contains("xxxxx"), false);
		const copy = kioskCopy(language);
		assert.equal(copy.title, copy.title.toUpperCase());
	}
	assert.equal(kioskWordList(Language.French).contains("ecole"), true);
	assert.equal(kioskWordList(Language.English).contains("ecole"), false);
	assert.equal(kioskWordList(Language.English).contains("cigar"), true);
	assert.equal(kioskCopy(Language.French).return, "Retour");
	assert.equal(kioskCopy(Language.English).return, "Return");
});
