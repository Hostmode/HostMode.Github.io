---
name: spanish-check
description: Use when a new or changed Host Mode screen, message or game needs Spanish, or to check that existing Spanish is complete and natural. Covers guest screens now and planner screens as they are translated.
---

# Spanish check

Host Mode is bilingual for guests, and planners are next. Every screen a guest can see must read naturally in Spanish.

## How Spanish works in the code

- Screen text goes through `t("English text")`. The Spanish lives in the `ES` table in `js/01-content.js`, keyed by the exact English text.
  Variables use braces: `t("Hi {name}",{name})` with `"Hi {name}":"Hola {name}"`.
- Game content (trivia, hunt clues, crossword words, "who's most likely") carries an `es` field on each item. `loc(item,field)` picks it.
- Planner screens are English today. When one is translated, use the same `t()` and `ES` pattern; never build a second copy of the screen.

## Steps

1. Find new English text: `git diff` the js/ files and list every new string a guest or host can see (buttons, labels, toasts, empty states, errors).
2. For each one, check it is wrapped in `t()` and has an `ES` entry. Add what's missing.
3. Check game content: every new trivia question has 4 Spanish options in the same order as English, so the right answer stays right.
4. Read the Spanish as a native speaker would:
   - Use "tú" for guests (friendly), "usted" only in formal business wording for planners.
   - Neutral Latin American Spanish that works in Charlotte's Mexican, Central American and Caribbean communities. Avoid regional slang.
   - Keep accents and ñ: está, sesión, niña, ¿…?, ¡…!.
   - Keep it about the same length as the English so buttons don't overflow on a phone.
5. Open the guest demo in Spanish (`games.html?e=demo`, switch language) on a phone-sized screen and look for English left behind or text that spills out of a button.
6. Run `node agents/syntax_check.js` (a stray quote in `ES` breaks everything).

## Report

List what you added, anything you weren't sure how to say (with two options), and any screen that still shows English.

## Host Mode rules that always apply

- Plain, friendly words written for planners and hosts. No technical jargon.
- Never name a competitor or another app in anything public. Say "other apps". Unfinished features are "coming soon".
- Host Mode only tracks money. It never takes or sends payments.
- Never put customer data in the repo (it is public). Use the demos for examples.
