---
name: accessibility-check
description: Use before shipping a new or changed Host Mode screen to check it works with large text, good contrast, keyboards and screen readers, on a phone.
---

# Accessibility check

Every screen should work for older relatives at a baby shower and for planners with low vision.

## Checklist

1. **Labels:** every input has a visible label or `aria-label`. Icon-only buttons (×, ‹, ›) have `aria-label`.
2. **Buttons, not divs:** anything you tap is a `<button>`, `<a>` or form control, so keyboards and screen readers can reach it.
3. **Focus:** tabbing through the screen shows the focus ring (the `:focus-visible` style) and goes in a sensible order.
4. **Contrast:** text on its background is at least 4.5 to 1 (3 to 1 for large text). Check muted grey text and text on brand colors in both light and dark themes.
5. **Large text:** set the phone or browser to 200% text; nothing overlaps or gets cut off. Buttons may wrap but stay usable.
6. **Touch targets:** at least about 28px tall for small buttons (`.btn.xs`), bigger for main actions.
7. **Not color alone:** overdue, short or blocked states also say it in words ("Overdue", "short 2").
8. **Live updates:** toasts use the `#toast` region (`role="status"`); don't add pop-ups that steal focus.
9. **Motion:** nothing flashes; animations stay gentle.
10. **Spanish:** the same checks in Spanish, where text is often longer.

## How to test

- Open the screen in a headless browser at 390px wide and at desktop size; take screenshots in light and dark.
- Tab through with the keyboard.
- Fix what you find, then note anything that needs a bigger change.

## Host Mode rules that always apply

- Plain, friendly words written for planners and hosts. No technical jargon.
- Never name a competitor or another app in anything public. Say "other apps". Unfinished features are "coming soon".
- Host Mode only tracks money. It never takes or sends payments.
- Never put customer data in the repo (it is public). Use the demos for examples.
