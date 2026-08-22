"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const foodFlowApi = require("../food-flow.js");
const projectRoot = path.resolve(__dirname, "..");
const read = name => fs.readFileSync(path.join(projectRoot, name), "utf8");
const html = read("index.html");
const app = read("app.js");
const guide = read("guide.js");
const foodFlow = read("food-flow.js");
const css = read("style.css");


test("learning links form a visible, named queue", () => {
    assert.match(html, /<nav class="learning-queue" aria-label="Learning center">/);
    assert.match(html, /class="learning-queue-label">Learn</);
    assert.match(html, /id="introReopenButton"[\s\S]*?Explorer basics/);
    assert.match(html, /id="foodFlowReopenButton"[\s\S]*?My Food flow/);
    assert.match(html, /id="guideReplayButton"[\s\S]*?Guided body tour/);
    assert.match(css, /\.learning-queue \{[\s\S]*?border:[\s\S]*?background:[\s\S]*?box-shadow:/);
    assert.match(css, /\.learning-queue-label \{[\s\S]*?text-transform: uppercase/);
});


test("food-flow overview explains the shelf-to-body path", () => {
    assert.match(html, /id="foodFlowIntro"/);
    assert.match(html, /How My Foods Works/);
    assert.match(html, /Find My Food[\s\S]*?My Pantry[\s\S]*?My Foods[\s\S]*?Body responds/);
    assert.match(html, /Pantry means saved\. My Foods means active\./);
    assert.match(html, /id="foodFlowStartButton">Show me the food flow/);
    assert.match(html, /guided example is temporary[\s\S]*?restored when it ends/i);
});


test("food-flow state machine gates saving and activation", () => {
    const machine = new foodFlowApi.FoodFlowGuideStateMachine();
    const snapshot = { savedUsdaFoods: [{ food: { id: "keep" }, quantity: 1 }] };

    machine.start(snapshot);
    assert.equal(machine.step, 1);
    assert.equal(machine.next(), 2);
    assert.equal(machine.next(), 2);
    machine.demoFood = { id: "demo", name: "Banana, Raw" };
    assert.equal(machine.next(), 3);
    assert.equal(machine.next(), 3);
    machine.saved = true;
    assert.equal(machine.next(), 4);
    assert.equal(machine.next(), 4);
    machine.activated = true;
    assert.equal(machine.next(), 5);
    assert.equal(machine.snapshot, snapshot);
});


test("guided food example uses real controls and restores the visitor's shelf", () => {
    assert.match(foodFlow, /bridge\.capture\(\)/);
    assert.match(foodFlow, /bridge\.restore\(machine\.snapshot\)/);
    assert.match(foodFlow, /bridge\.loadScenario\(\[\], \{ timeline: 0, preserveBrowser: true \}\)/);
    assert.match(foodFlow, /prepareFoodFlowSearch\(\)/);
    assert.match(foodFlow, /\.save-pantry-food/);
    assert.match(foodFlow, /\.move-saved-food/);
    assert.doesNotMatch(foodFlow, /\.click\(\)/);

    const bridge = app.match(/window\.BodyFuelExplorerGuideBridge = Object\.freeze\(\{[\s\S]*?\n\}\);/)[0];
    ["savedUsdaFoods", "usdaQuery", "usdaResults", "browserSource"]
        .forEach(field => assert.match(bridge, new RegExp(field)));
    assert.match(bridge, /persistMyFoods\(\)/);
    assert.match(bridge, /getSavedLocation\(foodId\)/);
    assert.doesNotMatch(foodFlow, /\bhero\b/i);
});


test("the two guided tours exit one another before starting", () => {
    assert.match(foodFlow, /BodyFuelGuideController\?\.exit\?\.\(\)/);
    assert.match(guide, /BodyFuelFoodFlowController\?\.exit\?\.\(\)/);
    assert.match(html, /id="foodFlowGuideCoach" role="dialog" aria-modal="false"/);
    assert.match(foodFlow, /event\.key !== "Escape"/);
    assert.match(css, /\.food-flow-guide-coach \{/);
});
