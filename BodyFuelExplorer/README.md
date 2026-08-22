# Body Fuel Flow Explorer

Body Fuel Flow Explorer is a standalone educational webpage for exploring how
familiar foods contribute nutrient and energy resources to one conceptual
living body and how repeated food patterns take shape over time.

The current product direction, scope boundaries, and decision filter are
documented in the [BodyWorks Experience North Star](../docs/EXPERIENCE_NORTH_STAR.md).

The primary experience has three parts: familiar foods and portions, a Pattern
Timeline, and the animated body response. A small, versioned catalog translates
food selections into approximate model inputs under the surface. Technical
totals, direct model controls, legacy activity and weight context, presets,
example days, and the earlier multi-view experience remain preserved backstage
for historical and technical reference. They are not part of the current
forward-facing direction.

It is designed to run entirely in the browser with no server, account, or
runtime dependency. Open `index.html` in Safari or another modern browser.

`learn.html` remains the visual-first companion guide. The simplified explorer
now teaches its primary concepts with concise in-place explanations so visitors
do not need to leave the core interaction.

## Optional guided example

The header’s **Show me how this works** control opens a seven-step wrapper around
the real explorer. `guide.js` owns the small guide state machine, focus and
snapshot lifecycle; `guide-scenarios.js` evaluates a bounded list of familiar
candidate days with the canonical `foods.js` and `model.js` calculations.

Teaching scenarios are never selected from an unbounded combination search.
When food estimates or routing formulas change, update the curated candidates
in `guide-scenarios.js` only when needed, then run the scenario validator and the
full tests. The validator intentionally fails if the near-reference example is
no longer near and distributed, the above-reference addition no longer changes
several signals, or the below-reference example no longer emphasizes released
reserves. Guide preference storage records only invitation dismissal/completion;
food selections are not written to local storage.

## Project structure

This project is intended to live at `BodyWorks/BodyFuelExplorer` when the
BodyWorks collection is published. BodyWorks will provide the shared home for
this explorer and future related projects while each project remains
self-contained.

## Testing

The browser and calculation model share the dependency-free logic in
`model.js`. See `TESTING.md` for automated and Safari interaction checks.

## Educational scope

The interface illustrates simplified biological relationships and general
tendencies. It does not provide medical advice, measurement, diagnosis,
nutrition prescription, or an individual prediction.

## Ownership and use

Copyright © 2026 Anthony Adams. All rights reserved. This repository does not
carry an open-source license. See `COPYRIGHT.md` for the permitted-use notice.
