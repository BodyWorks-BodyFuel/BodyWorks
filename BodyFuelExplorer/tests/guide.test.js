"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const guideApi = require("../guide.js");

const projectRoot = path.resolve(__dirname, "..");
const read = name => fs.readFileSync(path.join(projectRoot, name), "utf8");
const html = read("index.html");
const app = read("app.js");
const guide = read("guide.js");
const scenarios = read("guide-scenarios.js");
const css = read("style.css");


test("guide state machine gates real food and Weeks actions", () => {
    const machine = new guideApi.GuideStateMachine();
    const snapshot = { foodLines: [] };

    assert.equal(machine.start(snapshot), 1);
    assert.equal(machine.next(), 2);
    assert.equal(machine.next(), 2);
    machine.markWellLoaded();
    assert.equal(machine.next(), 3);
    assert.equal(machine.next(), 3);
    machine.markRealAddition();
    assert.equal(machine.next(), 4);
    assert.equal(machine.next(), 5);
    machine.markEdgeViewed("above");
    machine.markEdgeViewed("below");
    assert.deepEqual([...machine.viewedEdges], ["above", "below"]);
    assert.equal(machine.next(), 6);
    assert.equal(machine.next(), 6);
    machine.markWeeks();
    assert.equal(machine.next(), 7);
    machine.finish();
    assert.equal(machine.active, false);
    assert.equal(machine.snapshot, snapshot);
});


test("entry is optional, persistent, and permanently replayable", () => {
    assert.match(html, /id="guideReplayButton"[\s\S]*?Show me how this works/);
    assert.match(html, /id="guideInvitation"[\s\S]*?Want a 90-second guided example/);
    assert.match(html, /id="guideInvitationStart">Show me/);
    assert.match(html, /id="guideInvitationDismiss">Explore myself/);
    assert.match(guide, /const preferenceKey = "bodyFuelExplorerGuideV1"/);
    assert.match(guide, /localStorage\.setItem\(preferenceKey, value\)/);
    assert.doesNotMatch(guide, /localStorage\.setItem\([^)]*(?:food|line|quantity|timeline)/i);
    const invitationOffer = guide.match(/const offerInvitation = \(\) => \{[\s\S]*?browserRoot\.setTimeout\(offerInvitation, 550\)/)[0];
    assert.match(invitationOffer, /!doc\.querySelector\("dialog\[open\]"\)/);
    assert.match(invitationOffer, /addEventListener\("bodyfuel:intro-closed", offerInvitation\)/);
    assert.doesNotMatch(invitationOffer, /focus\(/);
});


test("guide snapshots and restores complete explorer state without Clear history mutations", () => {
    const bridge = app.match(/window\.BodyFuelExplorerGuideBridge = Object\.freeze\(\{[\s\S]*?\n\}\);/)[0];
    [
        "foodLines", "filter", "scrollTop", "dayKind", "source",
        "lastClearedLines", "undoClearHidden", "flowMotionPaused", "motionUserOverride"
    ].forEach(field => assert.match(`${bridge}\n${app}`, new RegExp(field)));
    assert.match(bridge, /restore\(snapshot\)/);
    assert.match(bridge, /foodExperience\.lastClearedLines = snapshot\.lastClearedLines/);
    assert.match(bridge, /foodElements\.grid\.scrollTop = Number\(snapshot\.scrollTop\)/);
    assert.match(guide, /closeGuide\(\{ restore = true/);
    assert.match(guide, /if \(restore\) bridge\.restore\(machine\.snapshot\)/);
    assert.doesNotMatch(bridge.match(/loadScenario\(lines,[\s\S]*?\n    \},/)[0], /clearFoodDay\(|lastClearedLines = cloneLines\(foodExperience\.lines\)/);
});


test("completion exposes clear, keep, and restore choices", () => {
    assert.match(guide, /Clear lesson and build my day/);
    assert.match(guide, /Keep this example/);
    assert.match(guide, /Restore what I had/);
    assert.match(guide, /if \(choice === "clear"\) bridge\.clearLesson\(\)/);
    assert.match(guide, /if \(choice === "restore"\) bridge\.restore\(machine\.snapshot\)/);
    assert.match(guide, /if \(choice === "keep"\) bridge\.persist\(\)/);
    assert.match(app, /clearLesson\(\)[\s\S]*?foodExperience\.lines = \[\][\s\S]*?controls\.time\.value = "0"/);
});


test("guide uses real controls for the food change and Weeks gates", () => {
    assert.match(guide, /bridge\.revealFood\(food\.id\)/);
    assert.match(guide, /event\.target\.closest\("\.catalog-portion-increase"\)/);
    assert.match(guide, /bridge\.getQuantity\(scenarios\.aboveReference\.additionFoodId\) >= 1/);
    assert.match(guide, /spotlight\('\[data-timeline="2"\]'/);
    assert.match(guide, /timeline\?\.dataset\.timeline === "2"/);
    assert.match(guide, /machine\.markWeeks\(\)/);
    assert.doesNotMatch(guide, /\.click\(\)/);
});


test("edge examples, held emphasis, and cleanup use the real explorer", () => {
    assert.match(guide, /bridge\.loadScenario\(scenarios\.aboveReference\.lines/);
    assert.match(guide, /bridge\.loadScenario\(scenarios\.belowReference\.lines/);
    assert.match(guide, /holdEmphasis\(\["release", "fatUse"\]\)/);
    assert.match(guide, /clearHeldEmphasis\(\)/);
    assert.match(css, /body-stage\.guide-held-emphasis \.guide-held-target\.destination-card/);
    assert.match(css, /body-stage\.guide-held-emphasis \.guide-held-target\.route-channel/);
});


test("docked coach supports keyboard exit, focus return, and reduced motion", () => {
    assert.match(html, /id="guideCoach" role="dialog" aria-modal="false"/);
    assert.match(html, /id="guideActionStatus" role="status" aria-live="polite"/);
    assert.match(guide, /event\.key !== "Escape"/);
    assert.match(guide, /event\.defaultPrevented \|\| doc\.getElementById\("coreExplanationDialog"\)\?\.open/);
    assert.match(guide, /closeGuide\(\)/);
    assert.match(guide, /elements\.replay \|\| previousFocus/);
    assert.match(guide, /activeHighlight = focus[\s\S]*?catalog-portion-stepper, \.timeline-options/);
    assert.match(guide, /activeTarget\.setAttribute\("aria-describedby", "guideBody"\)/);
    assert.match(guide, /prefersReducedMotion\(\) \|\| state\.motionPaused \? "auto" : "smooth"/);
    assert.match(guide, /grid\.scrollTo\(\{ top: grid\.scrollTop \+ delta, behavior \}\)/);
    assert.match(guide, /browserRoot\.scrollBy\(\{ top: delta, behavior \}\)/);
    assert.match(guide, /instant \? "auto" : guideScrollBehavior\(\)/);
    assert.match(guide, /activeTarget\.focus\(\{ preventScroll: true \}\)/);
    assert.doesNotMatch(guide, /positionCoach|dataset\.placement|scrollIntoView/);
    assert.match(css, /@media \(prefers-reduced-motion: reduce\)[\s\S]*?\.guide-coach/);
    assert.match(css, /guide-invitation button,[\s\S]*?guide-coach button \{[\s\S]*?min-height: 44px/);
});


test("guide is a measured bottom dock with temporary document reservation", () => {
    assert.match(css, /\.guide-coach \{[\s\S]*?position: fixed;[\s\S]*?bottom: calc\(8px \+ env\(safe-area-inset-bottom/);
    assert.match(css, /html\.guide-active \{[\s\S]*?overflow-y: auto !important/);
    assert.match(css, /body\.core-mode\.guide-active \{[\s\S]*?padding-bottom: calc\(var\(--guide-dock-height/);
    assert.match(css, /scroll-padding-bottom: calc\(var\(--guide-dock-height/);
    assert.match(guide, /getBoundingClientRect\(\)\.height/);
    assert.match(guide, /setProperty\("--guide-dock-height", `\$\{height\}px`\)/);
    assert.match(guide, /new browserRoot\.ResizeObserver\(syncDockReservation\)/);
    assert.match(guide, /addEventListener\("orientationchange", handleViewportChange\)/);
    assert.match(guide, /removeProperty\("--guide-dock-height"\)/);
    assert.match(guide, /doc\.documentElement\.classList\.remove\("guide-active"\)/);
    assert.doesNotMatch(guide, /pointerdown|pointermove|pointerup|drag(?:ging|Handle)|manualCoordinates/i);
});


test("target positioning uses the unobstructed region and refreshes spotlight geometry", () => {
    assert.match(guide, /const safeTop = 8[\s\S]*?safeBottom = Math\.max\(safeTop \+ 44, dock\.top - 18\)/);
    assert.match(guide, /visibilityElementFor\(target\)[\s\S]*?\.routing-stage[\s\S]*?#patternTimelineSection/);
    assert.match(guide, /revealFoodTargetInsideCatalog\(behavior\)[\s\S]*?browserRoot\.scrollBy/);
    assert.match(guide, /data-guide-target-active/);
    assert.match(guide, /data-guide-visibility-target/);
    assert.match(guide, /elements\.coach\.scrollTop = 0/);
    assert.match(guide, /scheduleTargetVisibility\(\{ delay: 120 \}\)/);
    assert.match(guide, /doc\.fonts\?\.ready\?\.then\(\(\) => scheduleTargetVisibility\(\)\)/);
    assert.doesNotMatch(guide, /addEventListener\("scroll",/);
});


test("feedback suppression and dialog stacking restore exactly", () => {
    assert.match(guide, /feedbackSnapshots = \[\.\.\.doc\.querySelectorAll/);
    assert.match(guide, /inert: node\.inert[\s\S]*?ariaHidden: node\.getAttribute/);
    assert.match(guide, /node\.classList\.add\("guide-feedback-suppressed"\)/);
    assert.match(guide, /node\.inert = inert/);
    assert.match(guide, /if \(ariaHidden === null\) node\.removeAttribute\("aria-hidden"\)/);
    assert.match(css, /\.guide-feedback-suppressed \{[\s\S]*?visibility: hidden !important/);
    const guideZ = Number(css.match(/\.guide-coach \{[\s\S]*?z-index: (\d+)/)[1]);
    const popoverZ = Number(css.match(/\.info-popover \{[\s\S]*?z-index: (\d+)/)[1]);
    assert.match(html, /<dialog class="core-explanation-dialog"/);
    assert.ok(popoverZ > guideZ, `help layer ${popoverZ} must remain above guide ${guideZ}`);
});


test("guide copy follows the educational language contract", () => {
    const forbidden = [
        ["hea", "lthy"], ["unhea", "lthy"], ["good", " food"],
        ["bad", " food"], ["ideal", " diet"], ["personal", " calorie need"],
        ["guaranteed", " storage"], ["predicted", " weight"]
    ].map(parts => parts.join(""));
    const copy = `${guide}\n${scenarios}`.toLowerCase();
    forbidden.forEach(phrase => assert.equal(copy.includes(phrase), false, phrase));
    assert.match(guide, /relative emphasis/);
    assert.match(guide, /conceptual model/);
    assert.match(guide, /not literal glowing flow/);
    assert.match(guide, /demonstrations—not suggested eating patterns or predictions/);
});


test("base explorer stays unchanged until a visitor starts the guide", () => {
    const initTail = guide.match(/const offerInvitation = \(\) => \{[\s\S]*?setTimeout\(offerInvitation, 550\)/)[0];
    assert.doesNotMatch(initTail, /loadScenario|clearLesson|restore\(/);
    assert.match(guide, /elements\.replay\.addEventListener\("click", \(\) => startGuide/);
    assert.match(guide, /elements\.invitationStart\.addEventListener\("click", \(\) => startGuide/);
    assert.match(app, /loadScenario\(lines, options = \{\}\)/);
});
