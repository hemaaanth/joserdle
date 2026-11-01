import { GameMode } from "./enums";
import { historicalSeed, Language, wordListFor } from "./language";
import { GameState, modeData, seededRandomInt } from "./utils";

export const KIOSK_MODE = GameMode.hourly;
export const KIOSK_LANGUAGE = Language.French;
export const KIOSK_LANGUAGE_KEY = "kiosk-language";
export const KIOSK_WORD_NUMBER = 37896;
export const KIOSK_STATE_KEY = "state-kiosk-hourly-37896";
export const KIOSK_TITLE = "JOSEE'S LAST JOSERDLE";
export const PLAY_MORE_URL = "https://joserdle.com/";

// The puzzle stays English Hourly #37896, regardless of the interface language.
export function kioskWord() {
	const mode = modeData.modes[KIOSK_MODE];
	const words = wordListFor(Language.English).words;
	return words[seededRandomInt(0, words.length, historicalSeed(mode.start, mode.unit, KIOSK_WORD_NUMBER))];
}

export function kioskWordList(language: Language) {
	const list = wordListFor(language);
	const answer = kioskWord();
	return {
		...list,
		words: list.words.includes(answer) ? list.words : [...list.words, answer],
		contains: (word: string) => word === answer || list.contains(word),
	};
}

export function kioskLanguage(saved: string | null) {
	return saved === Language.English ? Language.English : KIOSK_LANGUAGE;
}

export function kioskCopy(language: Language) {
	return language === Language.French ? {
		title: "LE DERNIER JOSERDLE DE JOSEE",
		wellDone: "Bravo !", thanks: "Merci d'avoir joué", scan: "Scannez pour continuer à jouer",
		return: "Retour", playMore: "Jouer sur joserdle.com", qrAlt: "Code QR vers https://joserdle.com/",
		fullscreen: "Plein écran", exitFullscreen: "Quitter le plein écran", reset: "Recommencer",
		fullscreenBlocked: "Le plein écran est bloqué par ce navigateur.", fullscreenUnavailable: "Le plein écran n'est pas disponible dans ce navigateur.",
		settings: "Réglages", kiosk: "Mode kiosque", hard: "Mode difficile",
		hardDesc: "Réutilisez tous les indices révélés dans vos propositions.", hardViolated: "Cette partie ne respecte déjà plus le mode difficile.",
		kioskDesc: "La dernière partie de Josee : Hourly nº 37896. Le mot reste identique en français et en anglais. Retour pour recommencer, ou réinitialisation après 15 minutes sans activité.",
		dark: "Thème sombre", colorblind: "Mode daltonien", contrast: "Couleurs à contraste élevé",
		language: "Langue", languageDesc: "Change l'interface et le dictionnaire. Le mot à trouver reste identique.",
		round: "Partie", giveUp: "Abandonner", enter: "ENTRÉE", notEnough: "Pas assez de lettres", notInList: "Mot absent du dictionnaire",
		mustMatch: (pos: string, char: string) => `La lettre nº ${pos} doit être ${char}.`,
		mustContain: (char: string) => `Le mot doit contenir ${char}.`,
		praise: ["Génial !", "Magnifique !", "Impressionnant !", "Splendide !", "Bravo !", "Ouf !"],
		help: "Comment jouer", helpIntro: "Trouvez le mot de cinq lettres en six essais.",
		helpClues: "Vert : la lettre est bien placée. Jaune : elle est dans le mot, mais ailleurs. Gris : elle n'est pas dans le mot.",
		helpEnd: "Validez avec ENTRÉE. Après la partie, scannez le code QR pour continuer sur votre téléphone, puis appuyez sur Retour pour le prochain joueur.",
	} : {
		title: KIOSK_TITLE,
		wellDone: "Well done!", thanks: "Thanks for playing", scan: "Scan to play more",
		return: "Return", playMore: "Play more at joserdle.com", qrAlt: "QR code linking to https://joserdle.com/",
		fullscreen: "Full screen", exitFullscreen: "Exit full screen", reset: "Reset game",
		fullscreenBlocked: "Full screen blocked by this browser.", fullscreenUnavailable: "Full screen unavailable in this browser.",
		settings: "Settings", kiosk: "Kiosk Mode", hard: "Hard Mode",
		hardDesc: "Any revealed hints must be used in subsequent guesses", hardViolated: "Game has already violated hard mode",
		kioskDesc: "Josee's last game: Hourly #37896. The answer stays the same in French and English. Use Return after playing, or reset after 15 minutes without input.",
		dark: "Dark Theme", colorblind: "Color Blind Mode", contrast: "High contrast colors",
		language: "Language", languageDesc: "Changes the interface and dictionary. The answer stays the same.",
		round: "Game", giveUp: "Give up", enter: "ENTER", notEnough: "Not enough letters", notInList: "Not in word list",
		mustMatch: (pos: string, char: string) => `${pos} letter must be ${char}`,
		mustContain: (char: string) => `Guess must contain ${char}`,
		praise: ["Genius", "Magnificent", "Impressive", "Splendid", "Great", "Phew"],
		help: "How to play", helpIntro: "Guess the five-letter word in six tries.",
		helpClues: "Green: the letter is in the right place. Yellow: it is in the word, but elsewhere. Gray: it is not in the word.",
		helpEnd: "Press ENTER to submit. After playing, scan the QR code to keep playing on your phone, then press Return for the next player.",
	};
}

export function pinKioskGame() {
	const mode = modeData.modes[KIOSK_MODE];
	mode.seed = historicalSeed(mode.start, mode.unit, KIOSK_WORD_NUMBER);
	mode.historical = true;
}

export function newKioskGame(savedState?: string) {
	pinKioskGame();
	return new GameState(KIOSK_MODE, savedState);
}

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
