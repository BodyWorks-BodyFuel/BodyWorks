"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");

const foods = require("../foods.js");
const guideScenarios = require("../guide-scenarios.js");


test("guide scenario selection is bounded, deterministic, and stable on ties", () => {
    const first = guideScenarios.buildScenarios();
    const second = guideScenarios.buildScenarios();

    assert.deepEqual(first, second);
    assert.ok(guideScenarios.wellCandidates.length <= 6);
    assert.ok(guideScenarios.aboveAdditionCandidates.length <= 10);
    assert.ok(guideScenarios.belowCandidates.length <= 6);
    assert.equal(first.wellMatched.id, "familiar-varied-a");
    assert.equal(first.aboveReference.additionFoodId, "steak");
    assert.equal(first.belowReference.id, "small-mixed-set");
    assert.deepEqual(guideScenarios.validateScenarios(first), {
        valid: true,
        problems: []
    });
});


test("well-matched teaching day stays near the canonical reference with distributed signals", () => {
    const { reference, wellMatched } = guideScenarios.buildScenarios();
    const totals = foods.aggregateFoods(wellMatched.lines);

    assert.equal(reference.label, "Everyday Movement");
    assert.equal(reference.energy, 2150);
    assert.equal(totals.calories, wellMatched.totalEnergy);
    assert.ok(Math.abs(wellMatched.differenceFromReference) <= 220);
    assert.ok(wellMatched.distribution.meaningfulResponses >= 5);
    assert.ok(wellMatched.distribution.topGap <= 20);
    assert.equal(wellMatched.label, "Well-matched example");
    assert.ok(totals.protein >= 45);
    assert.ok(totals.carbs >= 45);
    assert.ok(totals.fats >= 45);
});


test("above-reference contrast is one plausible addition with a multi-signal visual delta", () => {
    const { wellMatched, aboveReference } = guideScenarios.buildScenarios();
    const added = aboveReference.lines.slice(wellMatched.lines.length);

    assert.deepEqual(added, [{
        foodId: aboveReference.additionFoodId,
        quantity: 1
    }]);
    assert.ok(foods.catalogById[aboveReference.additionFoodId]);
    assert.ok(aboveReference.differenceFromReference >= 400);
    assert.ok(aboveReference.changedSignals >= 3);
    assert.ok(aboveReference.visualDeltaScore >= 45);
    assert.ok(aboveReference.largestChanges.some(change => change.key === "storage"));
    assert.ok(aboveReference.largestChanges.some(change => change.key === "liver"));
});


test("below-reference contrast uses real portions and strongly exposes reserve release", () => {
    const { belowReference } = guideScenarios.buildScenarios();

    assert.ok(belowReference.lines.length >= 1);
    belowReference.lines.forEach(entry => {
        assert.ok(foods.catalogById[entry.foodId]);
        assert.ok(entry.quantity > 0);
    });
    assert.ok(belowReference.differenceFromReference <= -1000);
    assert.ok(belowReference.strengths.release >= 65);
    assert.ok(belowReference.strengths.fatUse >= 60);
    assert.equal(belowReference.label, "Much less than the model reference");
});


test("scenario metadata remains complete and testable", () => {
    const scenarios = guideScenarios.buildScenarios();

    [scenarios.wellMatched, scenarios.aboveReference, scenarios.belowReference]
        .forEach(scenario => {
            assert.ok(Array.isArray(scenario.lines));
            assert.equal(Number.isFinite(scenario.totalEnergy), true);
            assert.equal(Number.isFinite(scenario.differenceFromReference), true);
            assert.equal(Number.isFinite(scenario.visualDeltaScore), true);
            assert.ok(scenario.explanationKeys.length > 0);
            guideScenarios.responseKeys.forEach(key =>
                assert.equal(Number.isFinite(scenario.strengths[key]), true)
            );
        });
});
