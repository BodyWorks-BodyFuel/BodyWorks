/*
 * Body Fuel Flow Explorer — canonical fuel-input contract
 * Copyright © 2026 Anthony Adams. All rights reserved.
 */

(function attachBodyFuelInput(root, factory) {
    const api = factory();

    if (typeof module === "object" && module.exports) {
        module.exports = api;
    }

    root.BodyFuelInput = api;
}(
    typeof globalThis !== "undefined" ? globalThis : this,
    function createBodyFuelInputApi() {
        "use strict";

        const validSources = new Set(["familiar", "usda", "mixed", "manual"]);

        function finiteNonNegative(value) {
            const number = Number(value);
            return Number.isFinite(number) ? Math.max(0, number) : 0;
        }

        function roundTenth(value) {
            return Math.round(finiteNonNegative(value) * 10) / 10;
        }

        function createFuelInput({
            source = "familiar",
            totals = {},
            activity = 1,
            timeline = 0,
            items = []
        } = {}) {
            const protein = roundTenth(totals.protein);
            const carbs = roundTenth(totals.carbs);
            const fats = roundTenth(totals.fats);
            const calculatedCalories = Math.round(protein * 4 + carbs * 4 + fats * 9);

            return Object.freeze({
                version: 1,
                source: validSources.has(source) ? source : "mixed",
                nutrients: Object.freeze({
                    protein,
                    carbs,
                    fats,
                    calories: Number.isFinite(Number(totals.calories))
                        ? Math.max(0, Math.round(Number(totals.calories)))
                        : calculatedCalories
                }),
                context: Object.freeze({
                    activity: finiteNonNegative(activity),
                    timeline: finiteNonNegative(timeline)
                }),
                items: Object.freeze(items.map(item => Object.freeze({
                    id: String(item.id || item.foodId || ""),
                    quantity: finiteNonNegative(item.quantity),
                    source: item.source === "usda" ? "usda" : "familiar"
                })))
            });
        }

        function toModelInput(fuelInput) {
            return Object.freeze({
                protein: fuelInput.nutrients.protein,
                carbs: fuelInput.nutrients.carbs,
                fats: fuelInput.nutrients.fats,
                activity: fuelInput.context.activity,
                time: fuelInput.context.timeline
            });
        }

        return Object.freeze({ createFuelInput, toModelInput });
    }
));
