"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const model = require("../model.js");
const foods = require("../foods.js");
const narration = require("../narration.js");

const state = model.calculateBodyState({
    ...foods.aggregateFoods(foods.createExampleDay()),
    activity: 1,
    time: 0
});


test("food narration explains change, tendency, activity, and horizon neutrally", () => {
    const result = narration.buildNarration({
        change: { type: "food-add", foodId: "oatmeal" },
        item: foods.catalogById.oatmeal,
        state,
        activity: model.getActivityProfile(1),
        horizon: model.getHorizonPeriod(0),
        source: "foods"
    });

    assert.match(result.body, /You added oatmeal/);
    assert.match(result.body, /carbohydrate-derived fuel and glycogen support/);
    assert.match(result.context, /Everyday Movement/);
    assert.match(result.context, /Today/);
    assert.doesNotMatch(`${result.body} ${result.context}`, /good|bad|healthy|unhealthy/i);
});


test("near-zero item narration limits itself to energy-providing inputs", () => {
    const result = narration.buildNarration({
        change: { type: "food-add", foodId: "unsweetened-iced-tea" },
        item: foods.catalogById["unsweetened-iced-tea"],
        state,
        activity: model.getActivityProfile(1),
        horizon: model.getHorizonPeriod(0),
        source: "foods"
    });

    assert.match(result.body, /focuses on energy-providing inputs/);
    assert.match(result.body, /may show little routing change/);
    assert.doesNotMatch(result.body, /hydration|caffeine/i);
});


test("low-supply narration discloses the fixed reference and repeated-pattern relationship", () => {
    const oatmealState = model.calculateBodyState({
        ...foods.aggregateFoods([{ foodId: "oatmeal", quantity: 1 }]),
        activity: 1,
        time: 3
    });
    const result = narration.buildNarration({
        change: { type: "food-add", foodId: "oatmeal" },
        item: foods.catalogById.oatmeal,
        state: oatmealState,
        activity: model.getActivityProfile(1),
        horizon: model.getHorizonPeriod(3),
        source: "foods"
    });

    assert.match(result.context, /same supply-to-reference relationship repeats across weeks/);
    assert.match(result.context, /reserve-use, repair, and storage tendencies/);
});


test("below, near, and above narration stays neutral across Today, Weeks, and Months", () => {
    const everyday = model.getActivityProfile(1);
    const scenarios = [
        {
            label: "below Today",
            state: model.calculateBodyState({ protein: 20, carbs: 40, fats: 10, activity: 1, time: 0 }),
            horizon: model.getHorizonPeriod(0),
            expected: /supplies less energy than the Everyday Movement model reference/
        },
        {
            label: "below Weeks",
            state: model.calculateBodyState({ protein: 20, carbs: 40, fats: 10, activity: 1, time: 2 }),
            horizon: model.getHorizonPeriod(2),
            expected: /same supply-to-reference relationship repeats across weeks/
        },
        {
            label: "below Months",
            state: model.calculateBodyState({ protein: 20, carbs: 40, fats: 10, activity: 1, time: 3 }),
            horizon: model.getHorizonPeriod(3),
            expected: /same supply-to-reference relationship repeats across weeks/
        },
        {
            label: "near Today",
            state: model.calculateBodyState(model.presets.everyday),
            horizon: model.getHorizonPeriod(0),
            expected: /sits near the Everyday Movement model reference/
        },
        {
            label: "above Months",
            state: model.calculateBodyState({ protein: 200, carbs: 400, fats: 100, activity: 1, time: 3 }),
            horizon: model.getHorizonPeriod(3),
            expected: /storage tendency becomes more prominent/
        }
    ];

    scenarios.forEach(({ label, state: scenarioState, horizon, expected }) => {
        const result = narration.buildNarration({
            change: { type: "horizon" },
            state: scenarioState,
            activity: everyday,
            horizon,
            source: "foods"
        });
        assert.match(result.context, expected, label);
        assert.doesNotMatch(result.context, /your requirement|your recommendation|maintenance calories|measured burn/i, label);
    });
});


test("empty and manual modes have explicit teaching copy", () => {
    const empty = narration.buildNarration({
        change: { type: "empty" },
        state: null,
        activity: model.getActivityProfile(1),
        horizon: model.getHorizonPeriod(0),
        source: "foods"
    });
    assert.match(empty.title, /Add foods/);
    assert.match(empty.body, /without simulating meal timing/);

    const manual = narration.buildNarration({
        change: { type: "technical" },
        state,
        activity: model.getActivityProfile(1),
        horizon: model.getHorizonPeriod(0),
        source: "manual"
    });
    assert.equal(manual.title, "Adjusted from foods");
    assert.match(manual.body, /laboratory values/);
});


test("suggested experiments change one variable and special-case near-zero items", () => {
    const activity = model.getActivityProfile(1);
    const horizon = model.getHorizonPeriod(0);

    const afterFood = narration.suggestExperiment({
        change: { type: "food-add" }, activity, horizon, item: foods.catalogById.eggs
    });
    assert.deepEqual(afterFood.action, { type: "activity", value: 2 });

    const afterActivity = narration.suggestExperiment({
        change: { type: "activity" }, activity, horizon
    });
    assert.deepEqual(afterActivity.action, { type: "horizon", value: 1 });

    const tea = narration.suggestExperiment({
        change: { type: "food-add" }, activity, horizon,
        item: foods.catalogById["unsweetened-iced-tea"]
    });
    assert.deepEqual(tea.action, { type: "add-food", foodId: "oatmeal" });
});
