# Testing Body Fuel Flow Explorer

The webpage remains dependency-free at runtime. Its stable calculation model
lives in `model.js`; food catalog, narration, concise explanations, and UI state
remain separate layers.

## Automated checks

With Node.js available, run:

```sh
npm test
```

The suite covers the stable model, food catalog and aggregation, empty-state
guard, first-food awakening, relative route emphasis, all Pattern Timeline
lenses, partial-day wording, food tabs and tile portion editing, in-place
explanations, hidden advanced controls, responsive structure, reduced motion,
local resources, and root/subpath hosting.

The optional guided example adds model-backed contracts for scenario energy
distance, response distribution, multi-signal contrast, reserve-release
emphasis, stable tie-breaking, snapshot safety, action gates, and educational
wording. Manual browser checks must use the requested real food `+` and real
`Weeks` controls; programmatically advancing those gates is not equivalent.

## Core interaction check

1. Open `index.html` in Safari with Web Inspector’s Console visible and refresh.
2. Confirm the page starts empty: the full anatomical figure glows softly,
   nutrient routes do not flow, destination cards are extremely subdued, and
   the prompt asks for a food. No model result should be presented.
3. Add a food. The current category must remain selected, the selected-food
   count and estimated energy update, routes and destination cards appear, and
   one short sentence explains the combined-pattern change.
4. Add that food again and confirm its tile reads `2`. Test its minus and plus
   controls, then use **Clear foods** and **Undo clear**. Counts, selected
   styling, hero state, and the current Pattern Timeline must stay synchronized.
5. Try Today, Days, Weeks, and Months. With a partial day, every option beyond
   Today must state that the selections are treated as the complete repeated
   daily pattern. Confirm Today shows `kcal`; the other lenses show the same
   selected-day estimate as `kcal/day`, never a multiplied cumulative total.
6. Open a food, input, destination, timeline, and estimated-energy explanation. Confirm each is
   concise and dismissible, Escape closes it, and focus returns to its trigger.
7. Confirm the Console remains free of warnings and errors.

## Physical iPad check

Test Safari in portrait and landscape at 100%, 125%, and 150% browser zoom or
text enlargement:

- The hero and food workspace remain the primary pair; Pattern Timeline follows
  the complete food workspace as the repeated-pattern exploration.
- The document itself does not scroll; only the current category’s food tiles
  scroll internally.
- The anatomical figure stays centered, and no route, card, tab, or food tile
  is clipped horizontally.
- The response sentence sits below the artwork in normal flow. Confirm the
  figure from head through feet, all three input cards, and all seven
  destination cards remain inside the hero artwork without touching the
  response strip, motion control, or Pattern Timeline.
- Tap targets remain comfortable, filter tabs wrap cleanly, and adjusting
  several tile steppers never changes the active category unexpectedly.
- The visible `−  quantity  +` chrome stays compact inside each tile while the
  minus and plus hit areas remain about 44×44 CSS pixels. Long names may wrap
  to two lines, and every tile in the same row should share one compact height.
  The tile surface should read as flat information chrome rather than a large
  button, with a restrained selected tint and the nonzero count always visible.
- Every tile starts at `0`; only its explicit minus and plus buttons change the
  count. The info control and tile body must not modify quantity.
- Slowly scroll and quickly flick each category. Proximity snapping should
  settle on a complete visual row without feeling locked. Tiles sharing a row
  must share one snap position; the final row must remain fully reachable.
- Switch categories after scrolling and confirm the new category begins on its
  first complete row. Adjusting quantities must retain both category and scroll
  position. Keyboard focus entering an offscreen tile should reveal its entire
  row immediately.
- **Clear foods** stays visually distinct from category tabs, keeps focus after
  clearing, announces the empty result, and offers Undo without changing the
  Pattern Timeline.
- The first food creates visible flow; later portions change relative emphasis;
  and the one-sentence response remains readable without covering the figure.
- Estimated energy remains legible and neutral, updates for half portions made
  through preserved backstage logic, and restores exactly after Clear/Undo.
- VoiceOver announces tabs, portions, stepper actions, timeline choices, and
  explanations meaningfully. Rapid quantity changes should produce one settled
  live announcement rather than a stream.
- A dialog closes by its close button, tapping the backdrop, and Escape on a
  hardware keyboard; focus returns to the original control.
- With **Settings → Accessibility → Motion → Reduce Motion** enabled, route and
  card emphasis remains understandable through brightness, outline, and text
  without animated flow.
- Safari’s top and bottom bars and device safe areas do not cover controls or
  the scientific guardrail. In portrait, the disclaimer and copyright form a
  tight 11–12px row or stack with no extra blank band below the safe-area inset.
- The hero, Pattern Timeline, food workspace, and energy inset read as four
  related but distinct dark surfaces. Resting help controls remain secondary;
  keyboard focus rings remain unmistakable. Footer copy should read at roughly
  12px with comfortable line spacing and remain visually subordinate.

Also check 1440×900 desktop and 390×844 narrow-mobile layouts. Desktop/iPad
landscape should use a food-and-hero split; portrait/mobile should keep hero,
food, and then timeline in reading order with no horizontal overflow.
At 1024×768, the workspace should extend from beneath the header to the footer
without the large unused lower band seen in the original iPad capture; the food
catalog scrolls inside its available left-column height. Narrower effective
widths may reduce the catalog to two or one column so labels stay readable
instead of shrinking text or clipping the inline stepper.

## Preserved backstage behavior

The older example-day, movement, weight, technical controls, presets, gauges,
narration, suggested experiments, and learning-guide hooks remain in the code.
They must stay hidden, inert, and absent from the visual and accessibility flow
of the simplified core while their existing regression tests continue to pass.
