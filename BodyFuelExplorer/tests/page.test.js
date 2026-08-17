"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const model = require("../model.js");

const projectRoot =
    path.resolve(__dirname, "..");

const html = fs.readFileSync(
    path.join(projectRoot, "index.html"),
    "utf8"
);

const app = fs.readFileSync(
    path.join(projectRoot, "app.js"),
    "utf8"
);

const css = fs.readFileSync(
    path.join(projectRoot, "style.css"),
    "utf8"
);

const copyrightNotice = fs.readFileSync(
    path.join(projectRoot, "COPYRIGHT.md"),
    "utf8"
);


test("the shared model loads before the interface script", () => {
    const modelPosition =
        html.indexOf('<script src="model.js"></script>');

    const appPosition =
        html.indexOf('<script src="app.js"></script>');

    assert.ok(modelPosition >= 0);
    assert.ok(appPosition >= 0);
    assert.ok(modelPosition < appPosition);
});


test("all local page resources exist", () => {
    const references = [
        ...html.matchAll(/\b(?:src|href)="([^"]+)"/g)
    ].map(match => match[1]);

    const localReferences = references.filter(reference =>
        !reference.startsWith("#") &&
        !reference.startsWith("http:") &&
        !reference.startsWith("https:") &&
        !reference.startsWith("data:")
    );

    localReferences
        .map(reference => reference.split(/[?#]/)[0])
        .forEach(reference => {
        assert.equal(
            fs.existsSync(path.join(projectRoot, reference)),
            true,
            `Missing local resource: ${reference}`
        );
        });
});


test("HTML IDs are unique and route links resolve", () => {
    const ids = [
        ...html.matchAll(/\bid="([^"]+)"/g)
    ].map(match => match[1]);

    const uniqueIds =
        new Set(ids);

    assert.equal(uniqueIds.size, ids.length);

    const routeLinks = [
        ...html.matchAll(/<mpath[^>]+href="#([^"]+)"/g)
    ].map(match => match[1]);

    routeLinks.forEach(routeId => {
        assert.equal(
            uniqueIds.has(routeId),
            true,
            `Route points to missing path: ${routeId}`
        );
    });
});


test("every model preset has one matching interface button", () => {
    const buttonPresets = [
        ...html.matchAll(/\bdata-preset="([^"]+)"/g)
    ].map(match => match[1]).sort();

    const modelPresets =
        Object.keys(model.presets).sort();

    assert.deepEqual(buttonPresets, modelPresets);
});


test("the Approximate Fuel In readout is sourced from the master target", () => {
    const displayFunction = app.match(
        /function updateCalorieTargetDisplay\(\) \{[\s\S]*?\n\}/
    );

    assert.ok(displayFunction, "Missing calorie-target display function");
    assert.match(displayFunction[0], /planner\.calorieTarget/);
    assert.match(displayFunction[0], /getElementById\("calories"\)/);
    assert.doesNotMatch(
        displayFunction[0],
        /macroCalories|calculateMacroCalories|actualCalories/
    );
});


test("manual planner actions cancel a pending goal proposal", () => {
    assert.match(
        app,
        /function cancelGoalPlanTimer\(\) \{[\s\S]*?goalPlanTimer = null;[\s\S]*?\}/
    );

    const presetFunction = app.match(
        /function applyPreset\(name, options = \{\}\) \{[\s\S]*?\n\}/
    );

    assert.ok(presetFunction, "Missing preset function");
    assert.match(presetFunction[0], /cancelGoalPlanTimer\(\)/);

    const manualActionCancellations = [
        ...app.matchAll(/cancelGoalPlanTimer\(\);/g)
    ];

    assert.ok(
        manualActionCancellations.length >= 9,
        "Every manual planner path should cancel a delayed goal proposal"
    );
});


test("the interface uses four horizons without the redundant footer timeline", () => {
    const horizonLabels = [
        ...html.matchAll(/data-horizon="(\d)"[^>]*>([^<]+)</g)
    ].map(match => match[2].trim());

    assert.deepEqual(
        horizonLabels,
        ["Today", "Days", "Weeks", "Months"]
    );
    assert.doesNotMatch(html, /class="adaptation-bar"/);
    assert.doesNotMatch(html, /id="timelineMarker"/);
});


test("the interface exposes four understandable activity profiles", () => {
    const activityLabels = [
        ...html.matchAll(/data-activity="(\d)"[^>]*>([^<]+)</g)
    ].map(match => match[2].trim());

    assert.deepEqual(
        activityLabels,
        ["Rest", "Everyday", "Active", "High"]
    );
    assert.match(html, /id="activityDemandValue"/);
    assert.match(html, /Model reference: ≈ 2,320 kcal\/day/);
    assert.match(html, /not estimates of personal calorie burn/);
});


test("Body Outputs explains that its signals are conceptual", () => {
    assert.match(html, /data-tooltip-title="Body Outputs"/);
    assert.match(html, /relative comparisons within this explorer/);
    assert.match(html, /not measurements/);
});


test("the first-visit invitation is concise, persistent and reopenable", () => {
    assert.match(html, /<dialog class="welcome-dialog" id="welcomeDialog"/);
    assert.match(html, /id="welcomeOpenButton">Start Here/);
    assert.match(html, /id="welcomeExploreButton">Start Exploring/);
    assert.match(html, /learn\.html\?from=explorer#machine/);
    assert.equal(
        [...html.matchAll(/class="welcome-step-number"/g)].length,
        3
    );
    assert.match(app, /const welcomeStorageKey/);
    assert.match(app, /localStorage\.getItem\(welcomeStorageKey\)/);
    assert.match(app, /localStorage\.setItem\(welcomeStorageKey, "seen"\)/);
    assert.match(app, /welcomeDialog\.showModal\(\)/);
    assert.match(app, /plannerElements\.calorieTarget\.focus\(\)/);
    assert.match(css, /\.welcome-dialog::backdrop/);
});


test("hover tooltips allow the cursor to reach visual-guide links", () => {
    assert.match(css, /\.info-popover\.visible \{[\s\S]*?pointer-events: auto;/);
    assert.match(app, /function scheduleInfoPopoverHide\(\)/);
    assert.match(app, /infoPopover\.addEventListener\("pointerenter"/);
    assert.match(app, /infoPopover\.addEventListener\("pointerleave"/);
    assert.doesNotMatch(
        css,
        /\.info-popover:not\(\.pinned\) \.info-popover-link[\s\S]*?pointer-events: none;/
    );
});


test("the explorer preserves its complete scenario in browser history", () => {
    assert.match(app, /function createExplorerSnapshot\(\)/);
    assert.match(app, /function persistExplorerSnapshot\(\)/);
    assert.match(app, /function restoreExplorerSnapshot\(\)/);
    assert.match(app, /history\.replaceState\(/);

    [
        "calorieTarget",
        "weightUnit",
        "currentWeight",
        "targetWeight",
        "macros",
        "activity",
        "time",
        "locks",
        "activePreset",
        "flowMotionPaused",
        "motionUserOverride"
    ].forEach(key => {
        assert.match(
            app,
            new RegExp(`\\b${key}\\b`),
            `History snapshot should preserve ${key}`
        );
    });

    assert.match(html, /learn\.html\?from=explorer/);
    assert.match(app, /learn\.html\?from=explorer#/);
});


test("keyboard and assistive-technology landmarks are explicit", () => {
    assert.match(html, /class="skip-link" href="#explorerMain"/);
    assert.match(html, /<main class="workspace" id="explorerMain" tabindex="-1">/);
    assert.match(html, /class="presets" role="group" aria-label="Example fuel and demand scenarios"/);
    assert.match(html, /class="body-stage" aria-labelledby="routingMapTitle"/);
    assert.match(html, /class="human" role="img" aria-label=/);
    assert.match(html, /class="stage-message"[^>]*role="status"[^>]*aria-live="polite"[^>]*aria-atomic="true"/);
    assert.match(html, /class="panel output-panel" aria-labelledby="bodyOutputsHeading"/);
    assert.match(css, /\.preset:focus-visible,[\s\S]*?input\[type="range"\]:focus-visible/);
});


test("interactive controls expose state, units and button intent", () => {
    const buttonsWithoutType = [
        ...html.matchAll(/<button\b(?![^>]*\btype=)[^>]*>/g)
    ];

    assert.equal(buttonsWithoutType.length, 0);

    const presetStates = [
        ...html.matchAll(/<button[^>]+data-preset="[^"]+"[^>]+aria-pressed="(true|false)"/g)
    ];

    assert.equal(presetStates.length, Object.keys(model.presets).length);
    assert.equal(
        presetStates.filter(match => match[1] === "true").length,
        1
    );

    [
        "calorieTarget",
        "protein",
        "carbs",
        "fats",
        "activity",
        "time"
    ].forEach(id => {
        const input = html.match(
            new RegExp(`<input(?=[^>]*\\bid="${id}")[^>]*>`)
        );

        assert.ok(input, `Missing ${id} input`);
        assert.match(
            input[0],
            /aria-valuetext=/,
            `${id} should include an initial accessible value`
        );
    });

    assert.match(app, /setAttribute\(\s*"aria-valuetext"/);
    assert.match(app, /selectedPreset\.setAttribute\("aria-pressed", "true"\)/);
    assert.match(app, /Play animated fuel flow/);
    assert.match(app, /Pause animated fuel flow/);
});


test("conceptual outputs use semantic output elements", () => {
    const semanticOutputs = [
        ...html.matchAll(/<output class="output-value"[^>]+>/g)
    ];

    assert.equal(semanticOutputs.length, 6);
    semanticOutputs.forEach(output => {
        assert.match(output[0], /for="protein carbs fats activity time"/);
    });

    assert.match(html, /not literal vessels or one-to-one metabolic pathways/);
});


test("the center uses an interconnected circulation web instead of a text orb", () => {
    const sharedRoutes = [
        ...html.matchAll(/class="[^"]*\broute-share\b[^"]*"/g)
    ];

    assert.match(html, /class="circulation-web"/);
    assert.match(html, /class="circulation-core"/);
    assert.match(html, /data-balance-state="matched"/);
    assert.match(html, /id="balanceSummary"/);
    assert.ok(sharedRoutes.length >= 6);
    assert.doesNotMatch(html, /class="fuel-pool/);
    assert.doesNotMatch(html, /id="fuelPoolState"/);
});


test("primary routes use layered luminous flow lanes", () => {
    const envelopes = [
        ...html.matchAll(/class="[^\"]*\broute-envelope\b[^\"]*"/g)
    ];

    const filaments = [
        ...html.matchAll(/class="[^\"]*\broute-filament\b[^\"]*"/g)
    ];

    const terminals = [
        ...html.matchAll(/class="[^\"]*\broute-terminal\b[^\"]*"/g)
    ];

    assert.equal(envelopes.length, 10);
    assert.equal(filaments.length, 10);
    assert.ok(terminals.length >= 9);
    assert.match(app, /presentation\.contrast \* 0\.29/);
    assert.match(app, /presentation\.contrast \* 0\.58/);
});


test("route anchors follow the rendered cards and anatomical regions", () => {
    assert.match(app, /function updateRouteGeometry\(\)/);
    assert.match(app, /getBoundingClientRect\(\)/);
    assert.match(app, /routeElementAnchor\("\.route-protein", "right"\)/);
    assert.match(app, /routeElementAnchor\("\.destination-brain", "left"\)/);
    assert.match(app, /routeElementAnchor\("\.human \.brain"\)/);
    assert.match(app, /routeElementAnchor\("\.human \.liver"\)/);
    assert.match(app, /routeElementAnchor\("\.human \.leg-muscle-right"\)/);
    assert.match(app, /routeElementAnchor\("\.human \.glycogen-reserve"\)/);
    assert.match(app, /routeElementAnchor\("\.human \.fat-reserve"\)/);
    assert.match(app, /new ResizeObserver\(scheduleRouteGeometryUpdate\)/);
});


test("the published project keeps an explicit ownership notice", () => {
    assert.match(html, /© 2026 Anthony Adams\. All rights reserved\./);
    assert.match(html, /class="site-footer"/);
    assert.match(copyrightNotice, /Public access does not/);
    assert.match(copyrightNotice, /does not make it open source/);
});


test("responsive layouts preserve a real mobile anatomy row", () => {
    assert.match(css, /@media \(min-width: 1251px\) and \(max-height: 720px\)/);
    assert.match(css, /@media \(max-width: 900px\)/);
    assert.match(css, /@media \(max-width: 650px\)/);
    assert.match(css, /@media \(max-width: 460px\)/);
    assert.match(
        css,
        /\.routing-stage \.body-container \{\s*position: relative;\s*inset: auto;\s*grid-row: 2;/
    );
    assert.match(css, /\.routing-network \{\s*display: none;/);
});


test("tablet layouts keep controls and the live machine visible together", () => {
    assert.match(
        css,
        /@media \(min-width: 651px\) and \(max-width: 1250px\)/
    );
    assert.match(
        css,
        /\.controls-panel \{[\s\S]*?grid-row: 1 \/ 3;[\s\S]*?overflow-y: auto;/
    );
    assert.match(
        css,
        /\.body-stage \{[\s\S]*?grid-column: 2;[\s\S]*?height: 100%;/
    );
    assert.match(
        css,
        /\.output-panel \{[\s\S]*?grid-column: 2;[\s\S]*?overflow-x: auto;/
    );
    assert.match(
        css,
        /\.routing-stage \.input-stack,[\s\S]*?\.routing-stage \.destination-stack \{[\s\S]*?display: flex;/
    );
    assert.match(
        css,
        /\.routing-stage \.input-stack \{[\s\S]*?width: clamp\(96px, 23%, 108px\);/
    );
    assert.match(
        css,
        /\.routing-stage \.destination-stack \{[\s\S]*?width: clamp\(116px, 29%, 136px\);/
    );
});
