export const KIOSK_IDLE_MS = 15 * 60 * 1000;

export class IdleReset {
	private lastActivity: number;
	constructor(private reset: () => void, private now = Date.now) {
		this.lastActivity = now();
	}
	check() {
		if (this.now() - this.lastActivity >= KIOSK_IDLE_MS) {
			this.lastActivity = this.now();
			this.reset();
		}
	}
	activity() {
		// Check first so the first tap after a suspended tab cannot keep an old game.
		this.check();
		this.lastActivity = this.now();
	}
}

export interface ScreenLock {
	released: boolean;
	release(): Promise<void>;
	addEventListener(type: "release", listener: () => void): void;
}
export interface WakeLockAPI {
	request(type: "screen"): Promise<ScreenLock>;
}

export class ScreenAwake {
	private lock: ScreenLock;
	private pending = false;
	private stopped = false;
	constructor(private api: WakeLockAPI, private status: (message: string) => void) {}
	async request() {
		if (this.stopped || this.pending || (this.lock && !this.lock.released)) return;
		if (!this.api) {
			this.status("Keep awake unavailable. On Fire tablets, use a browser or kiosk app that can keep the screen on.");
			return;
		}
		this.pending = true;
		try {
			const lock = await this.api.request("screen");
			if (this.stopped) {
				await lock.release();
				return;
			}
			this.lock = lock;
			this.status(lock.released ? "Keep awake paused. Tap to retry." : "Keeping screen awake");
			lock.addEventListener("release", () => {
				if (!this.stopped && this.lock === lock) this.status("Keep awake paused. Tap to retry.");
			});
		} catch {
			if (!this.stopped) this.status("Keep awake blocked. Tap to retry; check browser and battery settings.");
		} finally {
			this.pending = false;
		}
	}
	stop() {
		this.stopped = true;
		if (this.lock && !this.lock.released) void this.lock.release().catch(() => {});
	}
}
