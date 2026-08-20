/*
 * Body Fuel Flow Explorer — deterministic guide scenarios
 * Copyright © 2026 Anthony Adams. All rights reserved.
 *
 * The guide evaluates a small curated set against the canonical food and model
 * layers. The bounded search is intentionally easy to inspect and replace.
 */

(function attachBodyFuelGuideScenarios(root, factory) {
    const foods = typeof module === "object" && module.exports
        ? require("./foods.js")
        : root.BodyFuelFoods;
    const model = typeof module === "object" && module.exports
        ? require("./model.js")
        : root.BodyFuelModel;
    const scenarios = factory(foods, model);

    if (typeof module === "object" && module.exports) {
        module.exports = scenarios;
    }

    root.BodyFuelGuideScenarios = scenarios;
}(
    typeof globalThis !== "undefined" ? globalThis : this,
    function createGuideScenarios(foods, model) {
        "use strict";

        const reference = Object.freeze(model.getActivityProfile(1));
        const responseKeys = Object.freeze([
            "fuel", "liver", "muscle", "repair", "glycogen", "storage", "fatUse", "release"
        ]);

        const line = (foodId, quantity = 1) => Object.freeze({ foodId, quantity });

        const wellCandidates = Object.freeze([
            Object.freeze({
                id: "familiar-varied-a",
                lines: Object.freeze([
                    line("oatmeal"), line("milk"), line("fruit-cup"),
                    line("chicken-turkey"), line("rice"), line("side-salad"),
                    line("turkey-cheese-sandwich"), line("soup"), line("nuts"),
                    line("cookies"), line("peanut-butter")
                ])
            }),
            Object.freeze({
                id: "familiar-varied-b",
                lines: Object.freeze([
                    line("eggs"), line("toast"), line("orange-juice"), line("yogurt"),
                    line("hamburger"), line("mixed-vegetables"), line("fish"),
                    line("rice"), line("nuts"), line("milk", 0.5)
                ])
            }),
            Object.freeze({
                id: "familiar-varied-c",
                lines: Object.freeze([
                    line("eggs"), line("oatmeal"), line("fruit-cup"),
                    line("coffee-cream-sugar"), line("chicken-turkey"), line("rice"),
                    line("mixed-vegetables"), line("yogurt"), line("nuts"),
                    line("turkey-cheese-sandwich"), line("soup"), line("avocado")
                ])
            })
        ]);

        const aboveAdditionCandidates = Object.freeze([
            "steak", "pizza", "burrito", "stir-fry", "hamburger", "french-fries"
        ]);

        const belowCandidates = Object.freeze([
            Object.freeze({
                id: "small-breakfast",
                lines: Object.freeze([line("oatmeal"), line("fruit-cup"), line("milk")])
            }),
            Object.freeze({
                id: "small-mixed-set",
                lines: Object.freeze([line("eggs"), line("oatmeal"), line("fruit-cup"), line("soup")])
            }),
            Object.freeze({
                id: "single-bowl",
                lines: Object.freeze([line("oatmeal")])
            })
        ]);

        function cloneScenarioLines(lines) {
            return lines.map(entry => ({
                foodId: entry.foodId,
                quantity: Number(entry.quantity)
            }));
        }

        function evaluate(lines, timeline = 0) {
            const foodLines = cloneScenarioLines(lines);
            const totals = foods.aggregateFoods(foodLines);
            const state = model.calculateBodyState({
                ...totals,
                activity: reference.index,
                time: timeline
            });
            const routes = model.calculateRouteSignals(state);
            const strengths = Object.freeze(Object.fromEntries(
                responseKeys.map(key => [key, Number(routes.strengths[key] || 0)])
            ));

            return Object.freeze({
                foodLines: Object.freeze(foodLines.map(Object.freeze)),
                totalEnergy: totals.calories,
                referenceEnergy: state.energyDemand,
                differenceFromReference: totals.calories - state.energyDemand,
                strengths,
                state: Object.freeze({
                    balance: state.balance,
                    classification: model.classifyEnergyBalance(state.balance)
                })
            });
        }

        function distributionMetadata(strengths) {
            const values = [
                strengths.fuel, strengths.liver, strengths.muscle,
                strengths.repair, strengths.glycogen, strengths.storage,
                strengths.fatUse
            ];
            const ordered = [...values].sort((left, right) => right - left);
            return Object.freeze({
                range: Math.max(...values) - Math.min(...values),
                topGap: ordered[0] - ordered[1],
                meaningfulResponses: values.filter(value => value >= 38).length
            });
        }

        function visualDelta(from, to) {
            const changes = responseKeys.map(key => Object.freeze({
                key,
                before: from.strengths[key],
                after: to.strengths[key],
                delta: to.strengths[key] - from.strengths[key]
            }));
            const ranked = [...changes].sort((left, right) =>
                Math.abs(right.delta) - Math.abs(left.delta) ||
                responseKeys.indexOf(left.key) - responseKeys.indexOf(right.key)
            );
            return Object.freeze({
                score: changes.reduce((sum, change) => sum + Math.abs(change.delta), 0),
                changedSignals: changes.filter(change => Math.abs(change.delta) >= 5).length,
                changes: Object.freeze(changes),
                largestChanges: Object.freeze(ranked.slice(0, 3))
            });
        }

        function pickWellMatched() {
            return wellCandidates
                .map(candidate => {
                    const result = evaluate(candidate.lines);
                    const distribution = distributionMetadata(result.strengths);
                    const macroKinds = ["protein", "carbs", "fats"].filter(key =>
                        foods.aggregateFoods(candidate.lines)[key] >= 45
                    ).length;
                    const score =
                        Math.abs(result.differenceFromReference) * 1.2 +
                        distribution.topGap * 4 +
                        Math.max(0, 6 - distribution.meaningfulResponses) * 18 +
                        Math.max(0, 3 - macroKinds) * 120;
                    return { candidate, result, distribution, score };
                })
                .sort((left, right) => left.score - right.score ||
                    left.candidate.id.localeCompare(right.candidate.id)
                )[0];
        }

        function pickAboveReference(well) {
            return aboveAdditionCandidates
                .map(foodId => {
                    const result = evaluate([
                        ...well.result.foodLines,
                        line(foodId)
                    ]);
                    const delta = visualDelta(well.result, result);
                    const energyAbove = result.differenceFromReference;
                    const score =
                        delta.score +
                        delta.changedSignals * 8 +
                        Math.min(energyAbove, 850) * 0.025;
                    return { foodId, result, delta, score };
                })
                .filter(candidate =>
                    candidate.result.differenceFromReference >= 400 &&
                    candidate.delta.changedSignals >= 3
                )
                .sort((left, right) => right.score - left.score ||
                    aboveAdditionCandidates.indexOf(left.foodId) - aboveAdditionCandidates.indexOf(right.foodId)
                )[0];
        }

        function pickBelowReference() {
            return belowCandidates
                .map(candidate => {
                    const result = evaluate(candidate.lines);
                    const variety = new Set(candidate.lines.map(entry =>
                        foods.catalogById[entry.foodId]?.groups[0]
                    )).size;
                    const score =
                        result.strengths.release * 1.4 +
                        result.strengths.fatUse * 0.45 +
                        Math.min(candidate.lines.length, 3) * 5 +
                        variety * 3;
                    return { candidate, result, score };
                })
                .filter(candidate =>
                    candidate.result.differenceFromReference <= -1000 &&
                    candidate.result.strengths.release >= 65
                )
                .sort((left, right) => right.score - left.score ||
                    left.candidate.id.localeCompare(right.candidate.id)
                )[0];
        }

        function buildScenarios() {
            const well = pickWellMatched();
            const above = pickAboveReference(well);
            const below = pickBelowReference();

            if (!well || !above || !below) {
                throw new Error("The guide scenario contract could not be satisfied.");
            }

            const scenarioSet = {
                reference: Object.freeze({
                    profileIndex: reference.index,
                    label: reference.label,
                    energy: reference.demand
                }),
                wellMatched: Object.freeze({
                    id: well.candidate.id,
                    label: "Well-matched example",
                    lines: well.result.foodLines,
                    totalEnergy: well.result.totalEnergy,
                    differenceFromReference: well.result.differenceFromReference,
                    strengths: well.result.strengths,
                    distribution: well.distribution,
                    visualDeltaScore: 0,
                    explanationKeys: Object.freeze(["energy-context", "relative-emphasis"])
                }),
                aboveReference: Object.freeze({
                    id: `above-with-${above.foodId}`,
                    label: "Much more than the model reference",
                    lines: above.result.foodLines,
                    totalEnergy: above.result.totalEnergy,
                    differenceFromReference: above.result.differenceFromReference,
                    strengths: above.result.strengths,
                    visualDeltaScore: above.delta.score,
                    changedSignals: above.delta.changedSignals,
                    largestChanges: above.delta.largestChanges,
                    additionFoodId: above.foodId,
                    explanationKeys: Object.freeze(["processing", "storage", "relative-emphasis"])
                }),
                belowReference: Object.freeze({
                    id: below.candidate.id,
                    label: "Much less than the model reference",
                    lines: below.result.foodLines,
                    totalEnergy: below.result.totalEnergy,
                    differenceFromReference: below.result.differenceFromReference,
                    strengths: below.result.strengths,
                    visualDeltaScore: below.result.strengths.release + below.result.strengths.fatUse,
                    explanationKeys: Object.freeze(["stored-reserves", "fat-as-fuel", "teaching-contrast"])
                })
            };

            return Object.freeze(scenarioSet);
        }

        function validateScenarios(scenarios = buildScenarios()) {
            const problems = [];
            const well = scenarios.wellMatched;
            const above = scenarios.aboveReference;
            const below = scenarios.belowReference;

            if (Math.abs(well.differenceFromReference) > 220) {
                problems.push("Well-matched energy is outside the model-reference tolerance.");
            }
            if (well.distribution.meaningfulResponses < 5 || well.distribution.topGap > 20) {
                problems.push("Well-matched responses are no longer sufficiently distributed.");
            }
            if (above.differenceFromReference < 400 || above.changedSignals < 3 || above.visualDeltaScore < 45) {
                problems.push("Above-reference contrast is no longer visually strong enough.");
            }
            if (below.differenceFromReference > -1000 || below.strengths.release < 65) {
                problems.push("Below-reference contrast no longer emphasizes reserve release.");
            }

            return Object.freeze({ valid: problems.length === 0, problems: Object.freeze(problems) });
        }

        return Object.freeze({
            responseKeys,
            wellCandidates,
            aboveAdditionCandidates,
            belowCandidates,
            evaluate,
            visualDelta,
            buildScenarios,
            validateScenarios
        });
    }
));
