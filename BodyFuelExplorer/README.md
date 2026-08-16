# Body Fuel Flow Explorer

Body Fuel Flow Explorer is a standalone educational webpage for exploring how
one conceptual human system responds to different fuel inputs, activity demand,
routing priorities, storage, release, and repeated patterns over time.

It is designed to run entirely in the browser with no server, account, or
runtime dependency. Open `index.html` in Safari or another modern browser.

`learn.html` is the visual-first companion guide. It explains the shared fuel
pool, demand, destination routing, storage/release, and planning controls with
short animated diagrams. The main explorer links to it directly and its info
spots can open the matching anchored section.

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
