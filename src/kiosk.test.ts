import assert from "node:assert/strict";
import { test } from "node:test";
import { IdleReset, KIOSK_IDLE_MS, ScreenAwake, type ScreenLock } from "./kiosk";
import { Settings, GameState, LetterStates } from "./utils";
import { GameMode } from "./enums";

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
