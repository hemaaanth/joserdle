![Wordle+](https://raw.githubusercontent.com/MikhaD/wordle/main/public/img/og_1200x630.png)
<div align="center">
  <a href="https://mikhad.github.io/wordle/" ><img src="https://github.com/MikhaD/wordle/workflows/Publish/badge.svg?branch=main" alt="Publish workflow"/></a>
  <img src="https://img.shields.io/github/package-json/v/MikhaD/wordle" alt="GitHub package.json version" />
</div>

---
A recreation of the popular game [Wordle](https://www.nytimes.com/games/wordle/) by Josh Wardle (now purchased by the New York Times), with additional modes and features.
Hosted on GitHub pages [here](https://mikhad.github.io/wordle/).

# Additional Features
- Words are chosen from the list of words at random instead of in sequence, and the solution is not stored in localStorage, making it harder to cheat. The seed for the random number is created from the date, ensuring that everyone gets the same random number, so people can still compare answers.
- When you complete a game the definition of the word is shown on the end of game modal.
- In addition to the other statistics, your average guesses and your losses are also displayed on the win modal.
- When the timer reaches 0 for a given game mode it changes into a refresh button instead of just staying at 00:00:00.
- When the timer reaches 0 for a given game mode a refresh button appears in the top left corner.
- A tips widget in the settings menu with useful information about the functionality of the game.
- Right clicking a submitted word on the board will tell you its definition.
- Right clicking a submitted word on the board will tell you how many possible words could have been played there, taking all previous information into account.
- Right clicking the row below the last submitted word will tell you how many possibilities there are taking all previous information into account.
- The game mode is reflected in the url, allowing you to share a game mode directly.
- English and French are separate word languages, independent from Daily, Hourly, and Infinite modes. Switch with the EN/FR control in Settings. French answers are entered without accents (for example, `ECOLE` and `FORET`).
- The French word language includes 1,000 possible answers and 5,224 additional accepted guesses.
- You can share a link to a specific game number, allowing you to play historical games, and share specific rounds of the faster changing modes with your friends.
- You can access previous games from the settings menu by inputting a game number or link.
- Service worker which allows the game to be easily downloaded as a progressive web app and run offline.
- Give Up button.

## Additional modes
The game mode can be changed by clicking WORDLE+ at the top of the screen or swiping the board in either direction.

**Hourly mode**: A new word every hour.

**Infinite mode**: A new word every time you refresh, for the true addicts.

# Technical details
This is written with Svelte in Typescript. This is my first Svelte project, and is intended as an exercise to help me learn and become proficient in Svelte. It also uses some basic scss for styling.

The project was initialized using `npm init vite@latest` and selecting the Svelte template.

# Forking this project
Anybody is welcome to fork this repository and do what they like with it, provided they follow the accompanying license (GPL-3.0).
I would also appreciate if you could link back to this repository and credit me in your project.

Have fun :)

# Analytics
This project contains basic google analytics which log the following information:
- Number of visitors
- Visitor's Country
- Whether they arrived via a direct link or a search engine
- Total number of people on site

This information cannot be linked back to individual users. It is for my own personal use and is not shared with anyone else. This is my first "major" public facing project and being able to see how many people are playing from all over the world is a big factor in my motivation to continue working on it.

<details>
<summary>How to create a new mode</summary>

- Add the mode name to the **end** of the GameMode enum in `enums.ts`
- Add a case for that mode in the newSeed function in `utils.ts`
- Add a ModeData object to the modeData modes array in `utils.ts`
</details>
                        
## Stargazers over time
[![Stargazers over time](https://starchart.cc/MikhaD/wordle.svg?variant=adaptive)](https://starchart.cc/MikhaD/wordle)

                    

## Kiosk mode

Turn on **Settings → Kiosk Mode** for a shared tablet. The setting is saved on that browser.

- The bundled QR SVG includes its white quiet zone and works offline. Regenerate with `npx --package qrcode qrcode -t svg -o public/img/joserdle-qr.svg -q 4 -e M https://joserdle.com/` if the destination changes.
- The full-screen and reset icons sit beside Help in the top-left corner. **Full screen** enters or exits browser full screen when supported.
- **Reset game** clears the board and keyboard clues and returns to the same Hourly #37896 answer. Kiosk progress is saved separately from normal games and does not change normal statistics. Turning kiosk mode off restores the prior normal selection.
- Kiosk mode always plays [Hourly #37896](https://joserdle.com/#hourly/37896), with an all-caps headline. French is the default kiosk language; choose FR or EN in Settings. This changes the interface and accepted guess dictionary, while keeping the exact original English answer in both languages. The answer is accepted in either dictionary. Kiosk language is saved separately from normal games. Mode, historical selection, title taps, and swipes cannot change this puzzle.
- After a win, a completion screen says “Scannez pour continuer à jouer” (French) or “Scan to play more” (English) and displays a QR code for `https://joserdle.com/`. It stays open until **Return**, close, or the idle reset. Return clears the game for the next visitor. Losses also offer Return.
- The board and keyboard scale to the available screen size in portrait or landscape.
- After 15 minutes without a tap, touch, or key press, the game resets and closes open dialogs. It also checks elapsed time when a suspended tab becomes visible again.
- Kiosk mode requests a screen wake lock, retries when the page becomes visible or receives input, and releases the lock when kiosk mode is turned off. Keep awake runs silently in the background.

### Fire tablets and keep awake

Keep awake uses the browser's [Screen Wake Lock API](https://developer.mozilla.org/en-US/docs/Web/API/Screen_Wake_Lock_API). Serve the game over HTTPS (localhost also works for development). The page must stay visible, and browser permissions or battery saving can block or release the lock.

Fire OS/Silk versions vary. The app checks for the API on the actual tablet and continues without a wake lock if the browser does not support it or blocks it. A website cannot force a wake lock on an unsupported browser. In that case, use a tablet browser or kiosk app with a native keep-screen-on setting. Full screen alone does not keep the screen awake. Actual Fire tablet hardware still needs to be checked.
