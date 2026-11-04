# The 3D designer's library: formats and handoffs

How the three roles from Roy's upgrade brief (research, modeling, integration) hand work to each other. The
plan and audit are in the "3D Designer Upgrade: Audit and Plan" doc; status and decisions are in 3d/PROJECT-RECORD.md.

## Files

| File | What it holds |
| --- | --- |
| `contracts.js` | The formats and their checks: research findings, asset specs, asset records, check results; the event-type and style words everyone uses. |
| `assets.js` | One asset record per library piece (name, description, tags, event types, styles, detail budget, source, version, status), and `searchAssets()`. |
| `research/*.json` | Research findings, one per file, each with the pages it came from. |
| `specs/*.json` | Asset specs: what a new or improved piece should be, pointing at the findings behind it. |
| `../../agents/venue3d_asset_check.py` | The asset check: builds every piece in a real browser and checks it against its record and budget. Part of `agents/check_all.sh`. |

## The handoff

1. **Research** finds a need or trend and saves a finding in `research/` (sources with links and dates; we describe and link, we never copy other people's pictures).
2. **Research** writes the asset spec in `specs/`, pointing at its findings.
3. **Modeling** builds or improves the shape maker in `3d/decor.js`, inside the category's detail budget, with before and after screenshots.
4. **Integration** adds or updates the piece in `CATALOG` (`3d/scene.js`) and its record in `assets.js`, and its settings in the Selected tab.
5. `bash agents/check_all.sh` must pass: the model checks (every record valid, every spec's findings exist) and the asset check (every piece builds and stays within budget).
6. A failure says who it goes back to (`role`: research, modeling or integration). Nothing counts as done because someone says so; it's done when the checks pass in the real designer.

## Status

A piece's status is one of: research, spec, model, integrate, checked, sent-back. On GitHub the same words are issue
labels (`3d: research`, `3d: spec`, …), so the builder queue and the Monday report can track them.

## Detail budgets

Measured Nov 3, 2026 in headless Chrome. The sample room is 57 pieces, about 40,000 triangles and 696 separately drawn
parts. Separately drawn parts (draw calls) are what slow phones, not triangles: a dressed table is up to 32 parts and a
Chiavari chair 14. Drawing repeated parts in one go (instancing) is a Phase 3 goal; until then table and chair budgets sit at
today's numbers, so nothing gets heavier.

## Rules

- Saved designs must keep opening: new fields are optional, and `validateFile()` drops what it doesn't know.
- Every shape and texture is drawn in code, so the library needs no licences. A spec may link real products, but never copies their pictures.
- Event types and styles only use the words in `contracts.js`, so filters stay consistent.
