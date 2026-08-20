"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const explanations = require("../explanations.js");

test("core explanation content covers every interactive concept", () => {
    const expected = [
        "protein", "carbohydrates", "fats", "brain", "liver", "muscle",
        "repair", "glycogen", "fat-as-fuel", "fat-storage", "timeline",
        "estimated-energy", "food-portions"
    ];

    assert.deepEqual(Object.keys(explanations).sort(), expected.sort());
    Object.values(explanations).forEach(explanation => {
        assert.equal(typeof explanation.title, "string");
        assert.ok(explanation.title.length > 0);
        assert.equal(typeof explanation.body, "string");
        assert.ok(explanation.body.length > 40);
    });
});

test("input explanations use familiar foods and distinguish dietary fat from storage", () => {
    assert.match(explanations.protein.body, /eggs, yogurt, chicken or turkey, fish, and beans/);
    assert.match(explanations.carbohydrates.body, /oatmeal, toast, fruit, rice, and potatoes/);
    assert.match(explanations.fats.body, /nuts, avocado, peanut butter, bacon, and cheese/);
    assert.match(explanations.fats.body, /essential fatty acids/);
    assert.match(explanations.fats.body, /vitamins A, D, E, and K/);
    assert.match(explanations.fats.body, /not that the food has been measured going directly into body-fat storage/);
    assert.ok(explanations.fats.details.includes("Nervous-system structures"));
    assert.ok(explanations.fats.details.includes("Longer-term reserves"));
});

test("estimated energy help explains units, variability, partial days, and timeline use", () => {
    const energy = explanations["estimated-energy"];
    const allCopy = [energy.body, ...energy.details].join(" ");

    assert.match(allCopy, /unit of food energy/);
    assert.match(allCopy, /kilocalories \(kcal\)/);
    assert.match(allCopy, /protein, carbohydrate, and fat/);
    assert.match(allCopy, /portion, recipe, preparation, and brand/);
    assert.match(allCopy, /only part of a day/);
    assert.match(allCopy, /same repeated daily pattern/);
    assert.match(allCopy, /do not multiply it into a cumulative total/);
    assert.match(allCopy, /not a personal target/);
    assert.match(allCopy, /does not predict exactly how much energy your body will use or store/);
    assert.match(allCopy, /fixed Everyday Movement model reference of approximately 2,150 kcal\/day/);
    assert.match(allCopy, /general scenario—not your calorie need, target, or measured energy use/);
    assert.match(allCopy, /above, near, or below that reference/);
});

test("explanations teach brightness without claiming measurement or direct routing", () => {
    const allCopy = Object.values(explanations)
        .map(explanation => `${explanation.title} ${explanation.body}`)
        .join(" ");

    assert.match(explanations.repair.body, /not that repair has been measured/);
    assert.match(explanations["fat-storage"].body, /Energy routed toward longer-term reserve in this conceptual model/);
    assert.match(explanations["fat-storage"].body, /not measured body-fat change or a predicted personal outcome/);
    assert.match(explanations["fat-storage"].body, /does not mean it travels directly into body-fat storage/);
    assert.match(explanations["fat-as-fuel"].body, /Fat contributing to current energy needs, from dietary fat or released reserves/);
    assert.match(explanations["fat-as-fuel"].body, /Stored reserves released means stored energy being mobilized toward current use/);
    assert.match(explanations["fat-as-fuel"].body, /relative model emphasis/);
    assert.match(explanations.protein.body, /not that a specific food travels to one destination/);
    assert.match(explanations.timeline.body, /selected foods repeat as one complete day/);
    assert.match(explanations["food-portions"].body, /fixed approximate estimate under the surface/);
    assert.doesNotMatch(allCopy, /will (?:lose|gain)|pounds|diagnos|healthy|unhealthy/i);
});
