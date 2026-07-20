# Third-party notices

## French Wordle word data

`src/french_words_5.ts` is derived from the following files in
[`LouanBen/wordle-fr`](https://github.com/LouanBen/wordle-fr) at commit
`28f66be79b4e2a8d41f9b01b8e631dc64a03e1a8`:

- `src/assets/json/drawable-words.json`
- `src/assets/json/playable-words.json`

The source project is Copyright © its contributors and distributed under the
GNU General Public License v3.0. JOSERDLE is also distributed under GPL-3.0;
see [`LICENSE`](LICENSE) for the full license text.

For this project, words were lowercased, French diacritics were removed,
non-five-letter ASCII results were excluded, and duplicate normalized forms
were removed. The first 1,000 normalized drawable words form the answer pool;
the remaining drawable words and playable words form the additional accepted
guess pool.
