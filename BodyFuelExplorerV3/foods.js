/*
 * Body Fuel Flow Explorer — representative food layer
 * Copyright © 2026 Anthony Adams. All rights reserved.
 *
 * Estimates are fixed teaching references for familiar portions. They are not
 * restaurant, brand, recipe, or individual nutrition measurements. The routing
 * engine remains canonical: protein and carbohydrate contribute about 4 kcal/g
 * and fat about 9 kcal/g.
 */

(function attachBodyFuelFoods(root, factory) {
    const foods = factory();

    if (typeof module === "object" && module.exports) {
        module.exports = foods;
    }

    root.BodyFuelFoods = foods;
}(
    typeof globalThis !== "undefined" ? globalThis : this,
    function createBodyFuelFoods() {
        "use strict";

        const catalogVersion = 1;

        const categories = Object.freeze([
            Object.freeze({ id: "all", label: "All" }),
            Object.freeze({ id: "breakfast", label: "Breakfast" }),
            Object.freeze({ id: "main", label: "Main meals" }),
            Object.freeze({ id: "sides", label: "Sides" }),
            Object.freeze({ id: "snacks", label: "Snacks & sweets" }),
            Object.freeze({ id: "drinks", label: "Drinks" })
        ]);

        function food(id, name, portion, groups, art, protein, carbs, fats) {
            return Object.freeze({
                id,
                name,
                portion,
                groups: Object.freeze(groups),
                art,
                portionStep: 0.5,
                estimate: Object.freeze({ protein, carbs, fats })
            });
        }

        const catalog = Object.freeze([
            food("eggs", "Eggs", "2 eggs", ["breakfast"], "◉", 12, 1, 10),
            food("bacon", "Bacon", "2 strips", ["breakfast"], "≈", 6, 0, 7),
            food("breakfast-sausage", "Breakfast sausage", "2 links or patties", ["breakfast"], "••", 10, 2, 18),
            food("oatmeal", "Oatmeal", "1 bowl", ["breakfast"], "∷", 6, 30, 4),
            food("toast", "Toast", "2 slices", ["breakfast", "sides"], "▱", 6, 30, 2),
            food("bagel", "Bagel", "1 bagel", ["breakfast"], "◎", 10, 55, 2),
            food("yogurt", "Yogurt", "1 single-serve cup", ["breakfast", "snacks"], "∪", 12, 18, 4),
            food("fruit-cup", "Fruit cup", "1 cup", ["breakfast", "sides", "snacks"], "✦", 1, 25, 0),

            food("chicken-turkey", "Chicken or turkey", "1 palm-sized piece", ["main"], "◇", 35, 0, 5),
            food("fish", "Fish", "1 fillet", ["main"], "◁", 32, 0, 10),
            food("steak", "Steak", "12-ounce steak", ["main"], "◆", 78, 0, 58),
            food("hamburger", "Hamburger", "1 basic ⅓-pound burger", ["main"], "≡", 32, 34, 26),
            food("turkey-cheese-sandwich", "Turkey and cheese sandwich", "1 sandwich", ["main"], "▰", 28, 32, 16),
            food("soup", "Soup", "1 bowl", ["main", "sides"], "∿", 8, 20, 6),
            food("pizza", "Pizza", "2 slices", ["main"], "△", 24, 60, 22),
            food("burrito", "Burrito", "1 medium burrito", ["main"], "▭", 25, 70, 22),
            food("stir-fry", "Stir-fry", "1 bowl", ["main"], "⌁", 28, 60, 18),
            food("beans-lentils", "Beans or lentils", "1 bowl", ["main", "sides"], "●", 16, 40, 4),
            food("tofu", "Tofu", "1 cup", ["main", "sides"], "□", 20, 8, 12),

            food("rice", "Rice", "1 cup", ["sides"], "∴", 4, 45, 0),
            food("pasta", "Pasta", "1 bowl", ["main", "sides"], "〰", 10, 65, 5),
            food("mashed-potatoes", "Mashed potatoes", "1 cup", ["sides"], "◒", 4, 35, 9),
            food("mixed-vegetables", "Mixed vegetables", "1 cup", ["sides"], "✣", 4, 18, 1),
            food("side-salad", "Side salad with dressing", "1 bowl with vinaigrette", ["sides"], "❖", 3, 12, 14),
            food("french-fries", "French fries", "1 medium serving", ["sides", "snacks"], "▥", 5, 60, 18),
            food("cheese", "Cheese", "2 slices", ["sides", "snacks"], "▧", 14, 2, 18),
            food("nuts", "Nuts", "1 handful", ["snacks", "sides"], "✺", 6, 6, 15),
            food("avocado", "Avocado", "½ avocado", ["sides"], "◐", 2, 9, 15),
            food("peanut-butter", "Peanut butter", "2 spoonfuls", ["breakfast", "sides", "snacks"], "∞", 7, 7, 16),

            food("potato-chips", "Potato chips", "1 small bag", ["snacks"], "◈", 3, 22, 10),
            food("cookies", "Cookies", "2 cookies", ["snacks"], "✤", 2, 28, 10),
            food("ice-cream", "Ice cream", "1 bowl", ["snacks"], "♢", 5, 35, 16),
            food("candy-chocolate", "Candy or chocolate", "1 regular package", ["snacks"], "▦", 3, 35, 12),

            food("coffee-cream-sugar", "Coffee with cream and sugar", "1 mug", ["breakfast", "drinks"], "◡", 1, 12, 4),
            food("orange-juice", "Orange juice", "1 glass", ["breakfast", "drinks"], "◍", 2, 26, 0),
            food("unsweetened-iced-tea", "Unsweetened iced tea", "1 glass", ["drinks"], "⌇", 0, 0, 0),
            food("milk", "Milk", "1 glass", ["breakfast", "drinks"], "▽", 8, 12, 8)
        ]);

        const catalogById = Object.freeze(Object.fromEntries(
            catalog.map(item => [item.id, item])
        ));

        const familiarMealsExample = Object.freeze([
            Object.freeze({ foodId: "eggs", quantity: 1, exampleMeals: ["Breakfast"] }),
            Object.freeze({ foodId: "bacon", quantity: 1, exampleMeals: ["Breakfast"] }),
            Object.freeze({ foodId: "fruit-cup", quantity: 1, exampleMeals: ["Breakfast"] }),
            Object.freeze({ foodId: "coffee-cream-sugar", quantity: 1, exampleMeals: ["Breakfast"] }),
            Object.freeze({ foodId: "orange-juice", quantity: 1, exampleMeals: ["Breakfast"] }),
            Object.freeze({ foodId: "toast", quantity: 1, exampleMeals: ["Breakfast"] }),
            Object.freeze({ foodId: "soup", quantity: 1, exampleMeals: ["Lunch"] }),
            Object.freeze({ foodId: "turkey-cheese-sandwich", quantity: 1, exampleMeals: ["Lunch"] }),
            Object.freeze({ foodId: "unsweetened-iced-tea", quantity: 2, exampleMeals: ["Lunch", "Dinner"] }),
            Object.freeze({ foodId: "steak", quantity: 1, exampleMeals: ["Dinner"] }),
            Object.freeze({ foodId: "mashed-potatoes", quantity: 1, exampleMeals: ["Dinner"] }),
            Object.freeze({ foodId: "mixed-vegetables", quantity: 1, exampleMeals: ["Dinner"] })
        ]);

        function cloneLines(lines) {
            return lines.map(line => ({
                foodId: line.foodId,
                quantity: Number(line.quantity),
                ...(line.food
                    ? {
                        food: {
                            ...line.food,
                            estimate: { ...line.food.estimate }
                        }
                    }
                    : {}),
                ...(line.exampleMeals
                    ? { exampleMeals: [...line.exampleMeals] }
                    : {})
            }));
        }

        function createExampleDay() {
            return cloneLines(familiarMealsExample);
        }

        function aggregateFoods(lines) {
            const totals = { protein: 0, carbs: 0, fats: 0, calories: 0 };

            lines.forEach(line => {
                const item = catalogById[line.foodId] || line.food;
                const quantity = Number(line.quantity);

                if (!item || !Number.isFinite(quantity) || quantity <= 0) {
                    return;
                }

                totals.protein += item.estimate.protein * quantity;
                totals.carbs += item.estimate.carbs * quantity;
                totals.fats += item.estimate.fats * quantity;
            });

            totals.protein = Math.round(totals.protein * 10) / 10;
            totals.carbs = Math.round(totals.carbs * 10) / 10;
            totals.fats = Math.round(totals.fats * 10) / 10;
            totals.calories = Math.round(
                totals.protein * 4 + totals.carbs * 4 + totals.fats * 9
            );

            return totals;
        }

        function itemCount(lines) {
            return lines.reduce((sum, line) => sum + Number(line.quantity || 0), 0);
        }

        function formatEnergyEstimate(calories, timeline = 0) {
            const rounded = Number.isFinite(Number(calories))
                ? Math.max(0, Math.round(Number(calories)))
                : 0;
            const repeatedDay = Number(timeline) > 0;
            const formatted = rounded.toLocaleString("en-US");

            return Object.freeze({
                text: `≈ ${formatted} ${repeatedDay ? "kcal/day" : "kcal"}`,
                ariaLabel: `Estimated food energy approximately ${formatted} ${repeatedDay ? "kilocalories per day" : "kilocalories"}`
            });
        }

        function filteredCatalog(category) {
            if (category === "all") return [...catalog];
            return catalog.filter(item => item.groups.includes(category));
        }

        return Object.freeze({
            catalogVersion,
            categories,
            catalog,
            catalogById,
            familiarMealsExample,
            createExampleDay,
            cloneLines,
            aggregateFoods,
            itemCount,
            formatEnergyEstimate,
            filteredCatalog
        });
    }
));
