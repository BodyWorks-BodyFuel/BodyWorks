"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fuel = require("../fuel-input.js");

test("one canonical fuel input separates sources from the body model", () => {
    const input = fuel.createFuelInput({
        source: "mixed",
        totals: { protein: 20.04, carbs: 30.06, fats: 10 },
        activity: 1,
        timeline: 2,
        items: [
            { foodId: "eggs", quantity: 1, source: "familiar" },
            { foodId: "usda-123", quantity: 2, source: "usda" }
        ]
    });

    assert.deepEqual(input.nutrients, {
        protein: 20,
        carbs: 30.1,
        fats: 10,
        calories: 290
    });
    assert.deepEqual(fuel.toModelInput(input), {
        protein: 20,
        carbs: 30.1,
        fats: 10,
        activity: 1,
        time: 2
    });
    assert.equal(input.items[1].source, "usda");
});
