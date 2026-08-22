/*
 * Body Fuel Flow Explorer — USDA FoodData Central adapter
 * Copyright © 2026 Anthony Adams. All rights reserved.
 */

(function attachBodyFuelUsda(root, factory) {
    const api = factory();

    if (typeof module === "object" && module.exports) {
        module.exports = api;
    }

    root.BodyFuelUsda = api;
}(
    typeof globalThis !== "undefined" ? globalThis : this,
    function createUsdaApi() {
        "use strict";

        const endpoint = "https://api.nal.usda.gov/fdc/v1/foods/search";
        const genericTypes = "Foundation,SR Legacy,Survey (FNDDS)";
        const nutrientIds = Object.freeze({ protein: 1003, fats: 1004, carbs: 1005 });

        function nutrientValue(food, id) {
            const nutrient = (food.foodNutrients || []).find(entry =>
                Number(entry.nutrientId) === id &&
                String(entry.unitName || "").toUpperCase() === "G"
            );
            return Number.isFinite(Number(nutrient?.value)) ? Number(nutrient.value) : 0;
        }

        function chooseMeasure(food) {
            if (Number(food.servingSize) > 0) {
                return {
                    label: food.householdServingFullText ||
                        `${food.servingSize} ${food.servingSizeUnit || "g"}`,
                    grams: String(food.servingSizeUnit || "g").toLowerCase() === "g"
                        ? Number(food.servingSize)
                        : 100
                };
            }

            const measure = (food.foodMeasures || []).find(entry =>
                Number(entry.gramWeight) > 0 &&
                entry.disseminationText &&
                !/quantity not specified/i.test(entry.disseminationText)
            );

            return measure
                ? { label: measure.disseminationText, grams: Number(measure.gramWeight) }
                : { label: "100 g reference portion", grams: 100 };
        }

        function titleCaseDescription(description) {
            const value = String(description || "USDA food").toLocaleLowerCase("en-US");
            return value.replace(/(^|[\s,(/-])([a-z])/g, (_, lead, letter) =>
                `${lead}${letter.toLocaleUpperCase("en-US")}`
            );
        }

        function normalizeFood(food) {
            const measure = chooseMeasure(food);
            const factor = measure.grams / 100;
            const protein = nutrientValue(food, nutrientIds.protein) * factor;
            const carbs = nutrientValue(food, nutrientIds.carbs) * factor;
            const fats = nutrientValue(food, nutrientIds.fats) * factor;

            return Object.freeze({
                id: `usda-${food.fdcId}`,
                fdcId: Number(food.fdcId),
                source: "usda",
                name: titleCaseDescription(food.description),
                portion: measure.label,
                portionGrams: measure.grams,
                dataType: food.dataType || "USDA food",
                art: "◌",
                portionStep: 1,
                estimate: Object.freeze({
                    protein: Math.round(protein * 10) / 10,
                    carbs: Math.round(carbs * 10) / 10,
                    fats: Math.round(fats * 10) / 10
                })
            });
        }

        function resultScore(food, query) {
            const description = String(food.description || "").toLowerCase();
            const needle = String(query || "").trim().toLowerCase();
            let score = Number(food.score) || 0;
            if (description === needle) score += 10000;
            if (description.startsWith(`${needle},`)) score += 5000;
            if (/raw|fresh|cooked/.test(description)) score += 500;
            if (/dehydrated|powder|flour|baby food/.test(description)) score -= 800;
            return score;
        }

        function normalizeResults(payload, query) {
            return (payload?.foods || [])
                .filter(food => Number.isFinite(Number(food.fdcId)))
                .sort((left, right) => resultScore(right, query) - resultScore(left, query))
                .map(normalizeFood)
                .filter(food =>
                    food.estimate.protein + food.estimate.carbs + food.estimate.fats > 0
                );
        }

        function normalizedSearchText(value) {
            return String(value || "")
                .normalize("NFKD")
                .replace(/[\u0300-\u036f]/g, "")
                .toLocaleLowerCase("en-US")
                .replace(/[^a-z0-9]+/g, " ")
                .trim();
        }

        function normalizeIndexRecord(record) {
            const [fdcId, name, portion, portionGrams, protein, carbs, fats, dataType] = record;
            return Object.freeze({
                id: `usda-${fdcId}`,
                fdcId: Number(fdcId),
                source: "usda",
                name,
                portion,
                portionGrams: Number(portionGrams),
                dataType,
                art: "◌",
                portionStep: 1,
                estimate: Object.freeze({
                    protein: Number(protein),
                    carbs: Number(carbs),
                    fats: Number(fats)
                })
            });
        }

        function localResultScore(record, needle, tokens) {
            const description = normalizedSearchText(record[1]);
            if (!tokens.every(token => description.includes(token))) return -Infinity;

            let score = 0;
            if (description === needle) score += 20000;
            if (description.startsWith(`${needle} `) || description.startsWith(needle)) score += 9000;
            if (description.split(" ").includes(needle)) score += 4500;
            score -= Math.max(0, description.length - needle.length) * 3;
            if (/ raw| cooked| fresh/.test(` ${description}`)) score += 350;
            if (/survey \(fndds\)/i.test(String(record[7]))) score += 120;
            if (/dehydrated|powder|flour|baby food|infant formula/.test(description)) score -= 900;
            return score;
        }

        function searchIndex(query, {
            index = globalThis.BodyFuelUsdaIndex,
            pageSize = 12
        } = {}) {
            const needle = normalizedSearchText(query);
            if (needle.length < 2) return [];
            const tokens = needle.split(/\s+/).filter(Boolean);
            const records = Array.isArray(index?.records) ? index.records : [];

            return records
                .map(record => ({ record, score: localResultScore(record, needle, tokens) }))
                .filter(result => Number.isFinite(result.score))
                .sort((left, right) =>
                    right.score - left.score ||
                    String(left.record[1]).localeCompare(String(right.record[1]), "en-US")
                )
                .slice(0, pageSize)
                .map(result => normalizeIndexRecord(result.record));
        }

        async function searchFoods(query, {
            apiKey = "DEMO_KEY",
            fetchImpl = globalThis.fetch,
            pageSize = 12,
            index = globalThis.BodyFuelUsdaIndex
        } = {}) {
            const normalizedQuery = String(query || "").trim();
            if (normalizedQuery.length < 2) return [];
            if (Array.isArray(index?.records)) {
                return searchIndex(normalizedQuery, { index, pageSize });
            }
            if (typeof fetchImpl !== "function") throw new Error("Food search is unavailable.");

            const parameters = new URLSearchParams({
                api_key: apiKey,
                query: normalizedQuery,
                pageSize: String(pageSize),
                dataType: genericTypes
            });
            const response = await fetchImpl(`${endpoint}?${parameters}`);
            if (!response.ok) {
                throw new Error(response.status === 429
                    ? "USDA search is busy. Please wait a moment and try again."
                    : "USDA food search could not be reached.");
            }
            return normalizeResults(await response.json(), normalizedQuery);
        }

        return Object.freeze({
            endpoint,
            normalizeFood,
            normalizeResults,
            normalizeIndexRecord,
            searchIndex,
            searchFoods
        });
    }
));
