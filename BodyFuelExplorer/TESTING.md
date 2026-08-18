# Testing Body Fuel Flow Explorer

The webpage remains dependency-free at runtime. Its calculation model lives in
`model.js`, which is shared by Safari and the automated tests.

## Automated checks

With Node.js available, run:

```sh
npm test
```

The suite covers calorie arithmetic, slider limits, macro redistribution,
every lock combination, repeated macro movement, weight-context isolation, trajectory,
the four activity profiles, the four viewing horizons, presets, output bounds,
routing values, local page resources, companion-guide anchors and interactions,
and preset/manual scenario state safety.

On a clean load, the selected model example should be **Everyday Baseline**:
2,150 kcal from 134 g protein, 246 g carbohydrate and 70 g fat, paired with
Everyday Movement and Today. These are model reference values, not a personal
recommendation. Reset should restore this complete state and clear both weights.

## Safari debugging

1. Open `index.html` in Safari.
2. Open Web Inspector with Option-Command-I.
3. Keep Inspector in a separate window so it does not compress the dashboard.
4. Select Console and refresh the page with Command-R.

The Console should remain free of errors. For a quick interaction check, move
the Fat slider up and back: Protein and Carbohydrates should redistribute while
the master calorie target remains stable within four calories of integer-gram
rounding. Then move Pattern Duration through Today, Days, Weeks, and Months;
the selected label, explanatory sentence, repair/storage signals, and central
fuel-pool state should update without Console errors.

Finally, hold Approximate Fuel In near 2,700 kcal and move Activity Pattern
from Rest through High. The visible model reference should step from about
1,800 to 3,000 kcal/day, and the stage should move from supply above demand to
demand above supply at the High profile.

For the weight-context check, select each preset—including Everyday Baseline—and
enter current and target weights in higher, lower and equal directions. Only the
trajectory comparison should change: the preset selection, fuel, macros,
activity and Pattern Duration must remain untouched. Clear either weight and
confirm the trajectory returns to setup without changing the scenario. Repeat
after manually changing each slider.

When fuel is near modeled demand, the trajectory should say **Scenario near
modeled balance**, even when the entered target is lower or higher. Directional
scenarios should say **Scenario points toward target** or **Scenario points away
from target** without claiming a personal outcome.

## Responsive layout check

Resize Safari across the layout thresholds at approximately 1,250, 900, 650,
and 460 pixels wide.

- Above 1,250 pixels, the complete dashboard should remain fitted to the
  window while the two information rails scroll independently when needed.
- Between 901 and 1,250 pixels, controls and the routing stage should share the
  first row, with Body Outputs arranged below them.
- Between 651 and 900 pixels, controls, routing, and outputs should form a
  readable single-column page without horizontal scrolling.
- At 650 pixels and below, the SVG network intentionally gives way to a compact
  learning view: Inputs, the anatomy, and Destinations occupy separate rows.
- In a very short desktop window, the compact-height rules should keep the
  stage message and flow control visible without covering the route cards.

## Keyboard and accessibility check

Press Tab from the address bar. A **Skip to explorer** link should appear and
move focus directly to the dashboard. Continue tabbing through presets,
planner fields, locks, sliders, information buttons, and Flow Motion; every
focused control should have a bright blue outline.

- Use the arrow keys on each slider and confirm its visible value updates.
- Focus an information button to open its explanation; press Escape to close
  it.
- Select a preset and confirm only that preset remains visually selected.
- Pause Flow Motion and confirm the button changes to Play.
- With macOS Reduce Motion enabled, refresh and confirm particles begin
  paused while all calculations and controls continue to work.

## Visual learning guide check

Open `learn.html` directly or choose **How This Works →** in the explorer.

- Switch the fuel-pool example among Everyday, Training, and More Supply. The
  pool fill, muscle pull, route strength, value, and one-sentence explanation
  should change together.
- Switch the storage cycle between Store Fuel and Release Fuel. The direction
  of motion and reserve label should reverse.
- Return to the explorer, select an info button, and choose **See it →**. The
  guide should open at the matching highlighted concept. Change several
  explorer controls before leaving, then use the always-visible **Back to Your
  Explorer** link. Weights, calorie target, macros, locks, activity, Pattern
  Duration, selected preset, and Flow Motion should match the scenario you
  left.
- At narrow widths, all guide sections should stack without horizontal
  scrolling. With Reduce Motion enabled, diagrams remain readable without
  moving particles.
