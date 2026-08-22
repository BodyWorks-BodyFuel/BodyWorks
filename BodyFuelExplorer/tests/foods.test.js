"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const foods = require("../foods.js");


test("catalog contains the approved representative collection and no cola", () => {
    assert.equal(foods.catalog.length, 37);
    assert.equal(new Set(foods.catalog.map(item => item.id)).size, 37);

    const names = foods.catalog.map(item => item.name);
    [
        "Eggs", "Bacon", "Breakfast sausage", "Oatmeal", "Toast", "Bagel",
        "Yogurt", "Fruit cup", "Chicken or turkey", "Fish", "Steak", "Hamburger",
        "Turkey and cheese sandwich", "Soup", "Pizza", "Burrito", "Stir-fry",
        "Beans or lentils", "Tofu", "Rice", "Pasta", "Mashed potatoes",
        "Mixed vegetables", "Side salad with dressing", "French fries", "Cheese",
        "Nuts", "Avocado", "Peanut butter", "Potato chips", "Cookies", "Ice cream",
        "Candy or chocolate", "Coffee with cream and sugar", "Orange juice",
        "Unsweetened iced tea", "Milk"
    ].forEach(name => assert.ok(names.includes(name), name));

    assert.equal(names.some(name => name.toLowerCase() === "cola"), false);
});


test("catalog estimates and portions are valid, documented model inputs", () => {
    const categoryIds = new Set(foods.categories.map(category => category.id));
    assert.deepEqual([...categoryIds], ["all", "breakfast", "main", "sides", "snacks", "drinks"]);

    foods.catalog.forEach(item => {
        assert.ok(item.portion.length > 0);
        assert.ok(item.groups.length > 0);
        item.groups.forEach(group => assert.ok(categoryIds.has(group)));
        ["protein", "carbs", "fats"].forEach(key => {
            assert.equal(Number.isFinite(item.estimate[key]), true);
            assert.ok(item.estimate[key] >= 0);
        });
        assert.equal(item.portionStep, 0.5);
    });
});


test("category filters swap overlapping food sets in the same catalog", () => {
    assert.equal(foods.filteredCatalog("all").length, 37);
    ["breakfast", "main", "sides", "snacks", "drinks"].forEach(category => {
        assert.ok(foods.filteredCatalog(category).length > 0);
        foods.filteredCatalog(category).forEach(item => assert.ok(item.groups.includes(category)));
    });
    assert.ok(foods.catalogById.milk.groups.includes("breakfast"));
    assert.ok(foods.catalogById.milk.groups.includes("drinks"));
    assert.deepEqual(foods.catalogById.nuts.groups, ["snacks", "sides"]);
    assert.equal(foods.catalogById.nuts.portion, "1 handful");
    assert.equal(foods.filteredCatalog("snacks").filter(item => item.id === "nuts").length, 1);
});


test("Familiar Meals Example matches the approved day and whole-day totals", () => {
    const example = foods.createExampleDay();
    assert.equal(example.length, 12);
    assert.equal(foods.itemCount(example), 13);
    assert.equal(example.find(line => line.foodId === "unsweetened-iced-tea").quantity, 2);

    assert.deepEqual(foods.aggregateFoods(example), {
        protein: 150,
        carbs: 199,
        fats: 113,
        calories: 2413
    });

    example[0].quantity = 99;
    assert.equal(foods.createExampleDay()[0].quantity, 1, "example factory must clone state");
});


test("aggregation supports understandable half portions and ignores invalid lines", () => {
    const result = foods.aggregateFoods([
        { foodId: "oatmeal", quantity: 1.5 },
        { foodId: "eggs", quantity: 0.5 },
        { foodId: "missing", quantity: 3 },
        { foodId: "rice", quantity: 0 }
    ]);

    assert.deepEqual(result, {
        protein: 15,
        carbs: 45.5,
        fats: 11,
        calories: 341
    });
});


test("estimated food energy formatting stays daily across every timeline lens", () => {
    assert.deepEqual(foods.formatEnergyEstimate(1840, 0), {
        text: "≈ 1,840 kcal",
        ariaLabel: "Estimated food energy approximately 1,840 kilocalories"
    });

    [1, 2, 3].forEach(timeline => {
        assert.deepEqual(foods.formatEnergyEstimate(1840, timeline), {
            text: "≈ 1,840 kcal/day",
            ariaLabel: "Estimated food energy approximately 1,840 kilocalories per day"
        });
    });

    assert.equal(foods.formatEnergyEstimate(341, 3).text, "≈ 341 kcal/day");
    assert.equal(foods.formatEnergyEstimate(Number.NaN, 0).text, "≈ 0 kcal");
});


test("near-zero tea stays in the tray while contributing no invented physiology", () => {
    const tea = foods.catalogById["unsweetened-iced-tea"];
    assert.deepEqual(tea.estimate, { protein: 0, carbs: 0, fats: 0 });
    assert.deepEqual(foods.aggregateFoods([{ foodId: tea.id, quantity: 2 }]), {
        protein: 0,
        carbs: 0,
        fats: 0,
        calories: 0
    });
});


test("USDA and familiar foods aggregate through the same line-item contract", () => {
    const result = foods.aggregateFoods([
        { foodId: "eggs", quantity: 1 },
        {
            foodId: "usda-123",
            quantity: 2,
            food: {
                source: "usda",
                estimate: { protein: 1.3, carbs: 26.9, fats: 0.4 }
            }
        }
    ]);

    assert.deepEqual(result, {
        protein: 14.6,
        carbs: 54.8,
        fats: 10.8,
        calories: 375
    });

    const clone = foods.cloneLines([{
        foodId: "usda-123",
        quantity: 1,
        food: { source: "usda", estimate: { protein: 1, carbs: 2, fats: 3 } }
    }]);
    clone[0].food.estimate.carbs = 99;
    assert.equal(foods.cloneLines([{
        foodId: "usda-123",
        quantity: 1,
        food: { source: "usda", estimate: { protein: 1, carbs: 2, fats: 3 } }
    }])[0].food.estimate.carbs, 2);
});
