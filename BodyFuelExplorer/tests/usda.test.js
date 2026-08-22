"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const usda = require("../usda.js");
require("../data/usda/foods-index.js");
const localIndex = globalThis.BodyFuelUsdaIndex;

const banana = {
    fdcId: 123,
    description: "BANANAS, RAW",
    dataType: "SR Legacy",
    foodMeasures: [{ disseminationText: "1 medium banana", gramWeight: 118 }],
    foodNutrients: [
        { nutrientId: 1003, unitName: "G", value: 1.1 },
        { nutrientId: 1004, unitName: "G", value: 0.3 },
        { nutrientId: 1005, unitName: "G", value: 22.8 }
    ]
};

test("USDA records become familiar portions without exposing macros in the UI contract", () => {
    const food = usda.normalizeFood(banana);
    assert.equal(food.id, "usda-123");
    assert.equal(food.name, "Bananas, Raw");
    assert.equal(food.portion, "1 medium banana");
    assert.deepEqual(food.estimate, { protein: 1.3, carbs: 26.9, fats: 0.4 });
});

test("generic exact food matches outrank processed keyword matches", () => {
    const results = usda.normalizeResults({ foods: [
        { ...banana, fdcId: 1, description: "Bananas, dehydrated, or banana powder", score: 500 },
        { ...banana, fdcId: 2, description: "Banana", score: 100 }
    ] }, "banana");
    assert.equal(results[0].id, "usda-2");
});

test("search uses the supported USDA endpoint and generic food filter", async () => {
    let requestedUrl = "";
    const results = await usda.searchFoods("banana", {
        index: null,
        fetchImpl: async url => {
            requestedUrl = url;
            return { ok: true, json: async () => ({ foods: [banana] }) };
        }
    });
    assert.equal(results.length, 1);
    assert.match(requestedUrl, /api\.nal\.usda\.gov\/fdc\/v1\/foods\/search/);
    assert.match(requestedUrl, /dataType=Foundation%2CSR\+Legacy%2CSurvey\+%28FNDDS%29/);
});

test("repository index contains the documented generic USDA releases", () => {
    assert.equal(localIndex.schema, 1);
    assert.ok(localIndex.records.length > 13000);
    assert.deepEqual(localIndex.fields, [
        "fdcId", "name", "portion", "portionGrams",
        "protein", "carbs", "fats", "dataType"
    ]);
});

test("local search finds familiar foods without using fetch", async () => {
    let fetched = false;
    const results = await usda.searchFoods("lentils", {
        index: localIndex,
        fetchImpl: async () => {
            fetched = true;
            throw new Error("fetch should not run");
        }
    });
    assert.equal(fetched, false);
    assert.equal(results.length, 12);
    assert.match(results[0].name, /Lentil/i);
    assert.ok(results[0].portion);
    assert.ok(results[0].estimate.protein + results[0].estimate.carbs + results[0].estimate.fats > 0);
});
