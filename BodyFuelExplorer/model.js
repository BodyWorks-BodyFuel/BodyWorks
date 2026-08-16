/*
 * Body Fuel Flow Explorer
 * Copyright © 2026 Anthony Adams. All rights reserved.
 * Public visibility does not grant permission to reuse this work. See COPYRIGHT.md.
 */

(function attachBodyFuelModel(root, factory) {
    const model = factory();

    if (typeof module === "object" && module.exports) {
        module.exports = model;
    }

    root.BodyFuelModel = model;
}(
    typeof globalThis !== "undefined" ? globalThis : this,
    function createBodyFuelModel() {
        "use strict";

        const macroKeys = ["protein", "carbs", "fats"];

        const macroEnergy = {
            protein: 4,
            carbs: 4,
            fats: 9
        };

        const proposedShares = {
            protein: 0.25,
            carbs: 0.45,
            fats: 0.30
        };

        const defaultMacroLimits = {
            protein: { min: 40, max: 250 },
            carbs: { min: 40, max: 500 },
            fats: { min: 20, max: 180 }
        };

        const horizonPeriods = Object.freeze([
            Object.freeze({
                label: "Today",
                phrase: "today",
                description: "Emphasizing immediate routing from today's inputs and activity demand.",
                influence: 0.38,
                repairBoost: 0.4
            }),
            Object.freeze({
                label: "Days",
                phrase: "across several days",
                description: "Showing how the current daily pattern begins to repeat across several days.",
                influence: 0.55,
                repairBoost: 2.4
            }),
            Object.freeze({
                label: "Weeks",
                phrase: "across several weeks",
                description: "Showing how repeated inputs and demand can strengthen patterns across several weeks.",
                influence: 0.72,
                repairBoost: 4.4
            }),
            Object.freeze({
                label: "Months",
                phrase: "across several months",
                description: "Showing the strongest long-term pattern signal without predicting an outcome.",
                influence: 0.92,
                repairBoost: 7.2
            })
        ]);

        const activityProfiles = Object.freeze([
            Object.freeze({
                label: "Rest / Recovery",
                shortLabel: "Rest",
                description: "A mostly seated or deliberately low-demand recovery day.",
                demand: 1800,
                signal: 20
            }),
            Object.freeze({
                label: "Everyday Movement",
                shortLabel: "Everyday",
                description: "Normal walking, errands and everyday movement without prolonged training.",
                demand: 2150,
                signal: 45
            }),
            Object.freeze({
                label: "Active / Training",
                shortLabel: "Active",
                description: "A workout or physically active day with sustained demand from working tissue.",
                demand: 2320,
                signal: 75
            }),
            Object.freeze({
                label: "High Demand",
                shortLabel: "High",
                description: "Prolonged intense training or physical work with much stronger fuel demand.",
                demand: 3000,
                signal: 95
            })
        ]);

        const presets = Object.freeze({
            matched: Object.freeze({
                protein: 150,
                carbs: 250,
                fats: 80,
                activity: 2,
                time: 2
            }),
            under: Object.freeze({
                protein: 90,
                carbs: 130,
                fats: 45,
                activity: 3,
                time: 2
            }),
            carb: Object.freeze({
                protein: 130,
                carbs: 420,
                fats: 55,
                activity: 2,
                time: 2
            }),
            fat: Object.freeze({
                protein: 130,
                carbs: 120,
                fats: 150,
                activity: 1,
                time: 2
            }),
            protein: Object.freeze({
                protein: 220,
                carbs: 210,
                fats: 65,
                activity: 2,
                time: 2
            }),
            oversupplied: Object.freeze({
                protein: 220,
                carbs: 450,
                fats: 155,
                activity: 0,
                time: 3
            })
        });


        function clamp(value, min = 0, max = 100) {
            return Math.min(max, Math.max(min, value));
        }


        function macroCalories(macros) {
            return macroKeys.reduce(
                (total, key) =>
                    total + Number(macros[key]) * macroEnergy[key],
                0
            );
        }


        function modeledEnergyDemand(activity) {
            return getActivityProfile(activity).demand;
        }


        function getActivityProfile(value) {
            const numericValue =
                Number(value);

            const index = clamp(
                Number.isFinite(numericValue)
                    ? Math.round(numericValue)
                    : 0,
                0,
                activityProfiles.length - 1
            );

            return {
                index,
                ...activityProfiles[index]
            };
        }


        function classifyEnergyBalance(balance, threshold = 200) {
            const difference =
                Number(balance);

            if (difference < -threshold) return "deficit";
            if (difference > threshold) return "surplus";
            return "matched";
        }


        function getHorizonPeriod(value) {
            const numericValue =
                Number(value);

            const index = clamp(
                Number.isFinite(numericValue)
                    ? Math.round(numericValue)
                    : 0,
                0,
                horizonPeriods.length - 1
            );

            return {
                index,
                ...horizonPeriods[index]
            };
        }


        function outputTone(id, value) {
            const signal =
                clamp(Number(value));

            if (["fuel", "glycogen", "repair"].includes(id)) {
                if (signal < 30) return "alert";
                if (signal < 60) return "caution";
                return "good";
            }

            if (id === "muscle") {
                if (signal < 50) return "good";
                if (signal < 75) return "caution";
                return "alert";
            }

            if (id === "storage") {
                if (signal < 30) return "good";
                if (signal < 60) return "caution";
                return "alert";
            }

            if (id === "fatUse") {
                if (signal < 30) return "good";
                if (signal < 60) return "caution";
                return "alert";
            }

            return "caution";
        }


        function normalizeLimits(limits = defaultMacroLimits) {
            return Object.fromEntries(
                macroKeys.map(key => [
                    key,
                    {
                        min: Number(limits[key]?.min ?? defaultMacroLimits[key].min),
                        max: Number(limits[key]?.max ?? defaultMacroLimits[key].max)
                    }
                ])
            );
        }


        function reconcileRoundedMacros(
            target,
            macros,
            adjustableKeys,
            limits
        ) {
            if (adjustableKeys.length === 0) {
                return { ...macros };
            }

            const adjustableSet =
                new Set(adjustableKeys);

            const fixedCalories = macroKeys
                .filter(key => !adjustableSet.has(key))
                .reduce(
                    (total, key) =>
                        total + macros[key] * macroEnergy[key],
                    0
                );

            const startingValues = Object.fromEntries(
                adjustableKeys.map(key => [key, macros[key]])
            );

            let best = {
                difference: Number.POSITIVE_INFINITY,
                movement: Number.POSITIVE_INFINITY,
                values: { ...startingValues }
            };

            function search(index, calories, movement, values) {
                if (index === adjustableKeys.length) {
                    const difference =
                        Math.abs(target - calories);

                    if (
                        difference < best.difference ||
                        (
                            difference === best.difference &&
                            movement < best.movement
                        )
                    ) {
                        best = {
                            difference,
                            movement,
                            values: { ...values }
                        };
                    }

                    return;
                }

                const key =
                    adjustableKeys[index];

                const start =
                    startingValues[key];

                const minimum = Math.max(
                    limits[key].min,
                    start - 8
                );

                const maximum = Math.min(
                    limits[key].max,
                    start + 8
                );

                for (let grams = minimum; grams <= maximum; grams += 1) {
                    values[key] = grams;

                    search(
                        index + 1,
                        calories + grams * macroEnergy[key],
                        movement + Math.abs(grams - start),
                        values
                    );
                }
            }

            search(0, fixedCalories, 0, {});

            return {
                ...macros,
                ...best.values
            };
        }


        function redistributeMacros({
            target,
            macros,
            locks = {},
            fixedKey = null,
            limits = defaultMacroLimits,
            tolerance = 4
        }) {
            const requestedTarget =
                Number(target);

            const normalizedLimits =
                normalizeLimits(limits);

            let nextMacros = Object.fromEntries(
                macroKeys.map(key => [
                    key,
                    clamp(
                        Math.round(Number(macros[key])),
                        normalizedLimits[key].min,
                        normalizedLimits[key].max
                    )
                ])
            );

            const adjustableKeys = macroKeys.filter(key =>
                !locks[key] && key !== fixedKey
            );

            const adjustableSet =
                new Set(adjustableKeys);

            const fixedCalories = macroKeys
                .filter(key => !adjustableSet.has(key))
                .reduce(
                    (total, key) =>
                        total + nextMacros[key] * macroEnergy[key],
                    0
                );

            const minimumCalories = adjustableKeys.reduce(
                (total, key) =>
                    total + normalizedLimits[key].min * macroEnergy[key],
                0
            );

            const maximumCalories = adjustableKeys.reduce(
                (total, key) =>
                    total + normalizedLimits[key].max * macroEnergy[key],
                0
            );

            let remainingCalories = clamp(
                requestedTarget - fixedCalories,
                minimumCalories,
                maximumCalories
            );

            const pending =
                new Set(adjustableKeys);

            while (pending.size > 0) {
                const pendingKeys =
                    Array.from(pending);

                const shareTotal = pendingKeys.reduce(
                    (total, key) => total + proposedShares[key],
                    0
                );

                let constrainedKey = null;

                pendingKeys.some(key => {
                    const desiredCalories =
                        remainingCalories *
                        (proposedShares[key] / shareTotal);

                    const minimum =
                        normalizedLimits[key].min * macroEnergy[key];

                    const maximum =
                        normalizedLimits[key].max * macroEnergy[key];

                    if (desiredCalories < minimum) {
                        nextMacros[key] =
                            normalizedLimits[key].min;

                        remainingCalories -=
                            minimum;

                        constrainedKey = key;
                        return true;
                    }

                    if (desiredCalories > maximum) {
                        nextMacros[key] =
                            normalizedLimits[key].max;

                        remainingCalories -=
                            maximum;

                        constrainedKey = key;
                        return true;
                    }

                    return false;
                });

                if (constrainedKey) {
                    pending.delete(constrainedKey);
                    continue;
                }

                pendingKeys.forEach(key => {
                    const desiredCalories =
                        remainingCalories *
                        (proposedShares[key] / shareTotal);

                    nextMacros[key] =
                        Math.round(desiredCalories / macroEnergy[key]);
                });

                pending.clear();
            }

            nextMacros = reconcileRoundedMacros(
                requestedTarget,
                nextMacros,
                adjustableKeys,
                normalizedLimits
            );

            const actualCalories =
                macroCalories(nextMacros);

            return {
                macros: nextMacros,
                requestedTarget,
                actualCalories,
                difference: actualCalories - requestedTarget,
                constrained:
                    Math.abs(actualCalories - requestedTarget) > tolerance,
                adjustableKeys
            };
        }


        function calculateBodyState({
            protein,
            carbs,
            fats,
            activity,
            time
        }) {
            const horizon =
                getHorizonPeriod(time);

            const activityProfile =
                getActivityProfile(activity);

            const activitySignal =
                activityProfile.signal;

            const calories =
                macroCalories({ protein, carbs, fats });

            const energyDemand =
                activityProfile.demand;

            const balance =
                calories - energyDemand;

            const availableFuel = clamp(
                48 +
                carbs * 0.07 +
                fats * 0.04 -
                activitySignal * 0.12
            );

            const glycogen = clamp(
                20 +
                carbs * 0.15 -
                activitySignal * 0.20
            );

            const muscleDemand =
                clamp(activitySignal);

            const repair = clamp(
                12 +
                protein * 0.20 +
                activitySignal * 0.22 +
                availableFuel * 0.10 +
                horizon.repairBoost
            );

            const fatUse = clamp(
                42 +
                activitySignal * 0.32 -
                carbs * 0.035 +
                fats * 0.05
            );

            const storage = clamp(
                34 +
                (balance / 35) *
                    (0.60 + horizon.influence * 0.55) -
                activitySignal * 0.12
            );

            return {
                protein,
                carbs,
                fats,
                activity: activitySignal,
                activityIndex: activityProfile.index,
                activityProfile,
                time: horizon.index,
                horizon,
                calories,
                energyDemand,
                balance,
                availableFuel,
                glycogen,
                muscleDemand,
                repair,
                fatUse,
                storage
            };
        }


        function proposeGoalSettings({
            current,
            target,
            unit = "lb",
            calorieMin = 800,
            calorieMax = 4500
        }) {
            if (
                !Number.isFinite(current) ||
                !Number.isFinite(target) ||
                current <= 0 ||
                target <= 0
            ) {
                return { valid: false };
            }

            const weightTolerance =
                unit === "kg" ? 0.25 : 0.5;

            const difference =
                target - current;

            const direction =
                Math.abs(difference) <= weightTolerance
                    ? 0
                    : Math.sign(difference);

            const activity =
                direction > 0
                    ? 1
                    : direction < 0
                        ? 3
                        : 2;

            const demand =
                modeledEnergyDemand(activity);

            const directionalTarget =
                direction === 0
                    ? demand
                    : demand * (1 + direction * 0.10);

            return {
                valid: true,
                direction,
                activity,
                calorieTarget: Math.round(
                    clamp(
                        directionalTarget,
                        calorieMin,
                        calorieMax
                    )
                )
            };
        }


        function calculateTrajectory({
            current,
            target,
            unit = "lb",
            balance,
            time
        }) {
            if (
                !Number.isFinite(current) ||
                !Number.isFinite(target) ||
                current <= 0 ||
                target <= 0
            ) {
                return {
                    state: "setup",
                    label: "Add weights to see direction",
                    icon: "○",
                    supplyPhrase: "near"
                };
            }

            const weightTolerance =
                unit === "kg" ? 0.25 : 0.5;

            const goalDifference =
                target - current;

            const timeInfluence =
                getHorizonPeriod(time).influence;

            const effectiveBalance =
                balance * timeInfluence;

            const goalDirection =
                Math.abs(goalDifference) <= weightTolerance
                    ? 0
                    : Math.sign(goalDifference);

            const supplyDirection =
                Math.abs(effectiveBalance) <= 75
                    ? 0
                    : Math.sign(effectiveBalance);

            let state = "maintaining";
            let label = "Maintaining";
            let icon = "≈";

            if (goalDirection === 0) {
                if (supplyDirection !== 0) {
                    state = "away";
                    label = "Moving away from target";
                    icon = "↗";
                }
            } else if (supplyDirection === goalDirection) {
                state = "toward";
                label = "Moving toward target";
                icon = "→";
            } else if (supplyDirection !== 0) {
                state = "away";
                label = "Moving away from target";
                icon = "↗";
            }

            return {
                state,
                label,
                icon,
                supplyPhrase:
                    supplyDirection < 0
                        ? "below"
                        : supplyDirection > 0
                            ? "above"
                            : "near"
            };
        }


        function calculateRouteSignals(state) {
            const {
                protein,
                carbs,
                fats,
                activity,
                availableFuel,
                repair,
                fatUse,
                storage,
                glycogen,
                balance,
                horizon
            } = state;

            const caloriesByMacro = {
                protein: protein * 4,
                carbs: carbs * 4,
                fat: fats * 9
            };

            const totalCalories = Math.max(
                1,
                caloriesByMacro.protein +
                caloriesByMacro.carbs +
                caloriesByMacro.fat
            );

            const absoluteSignals = {
                protein: clamp(((protein - 40) / 210) * 100),
                carbs: clamp(((carbs - 40) / 460) * 100),
                fat: clamp(((fats - 20) / 160) * 100)
            };

            const strengths = {};

            Object.entries(caloriesByMacro)
                .forEach(([name, calories]) => {
                    const shareSignal = clamp(
                        (calories / totalCalories) / 0.45 * 100
                    );

                    strengths[name] = clamp(
                        absoluteSignals[name] * 0.48 +
                        shareSignal * 0.52
                    );
                });

            const destinations = {
                fuel: availableFuel,
                fatUse,
                muscle: activity,
                repair,
                glycogen,
                storage
            };

            const destinationValues =
                Object.values(destinations);

            const lowest =
                Math.min(...destinationValues);

            const highest =
                Math.max(...destinationValues);

            const spread =
                highest - lowest;

            Object.entries(destinations)
                .forEach(([name, value]) => {
                    const relativePriority =
                        spread < 10
                            ? 50
                            : clamp(
                                (value - lowest) / spread * 100
                            );

                    strengths[name] = clamp(
                        value + relativePriority * 0.22
                    );
                });

            const release =
                clamp((-balance - 150) / 12);

            strengths.release =
                release > 0
                    ? clamp(
                        (18 + release * 0.82) *
                        (0.78 + (horizon?.influence ?? 0.72) * 0.30)
                    )
                    : 0;

            return {
                strengths,
                destinations,
                release
            };
        }


        function flowPresentation(value, particleCount = 3, release = false) {
            const intensity =
                clamp(value) / 100;

            const contrast =
                intensity * intensity * (3 - 2 * intensity);

            const visible =
                !release || intensity > 0.02;

            const level =
                intensity < 0.28
                    ? "low"
                    : intensity < 0.58
                        ? "moderate"
                        : intensity < 0.82
                            ? "high"
                            : "dominant";

            const thresholds =
                [0.03, 0.28, 0.64];

            const particles = Array.from(
                { length: particleCount },
                (_, index) => {
                    const threshold =
                        thresholds[index] ?? 0.82;

                    const reveal = clamp(
                        (intensity - threshold) / 0.16,
                        0,
                        1
                    );

                    return {
                        opacity:
                            reveal *
                            (0.42 + contrast * 0.58) *
                            (1 - index * 0.14),
                        radius: Math.max(
                            2.2,
                            2.8 + contrast * 5.2 - index * 0.9
                        )
                    };
                }
            );

            return {
                intensity,
                contrast,
                visible,
                level,
                channelOpacity:
                    visible ? 0.16 + contrast * 0.84 : 0,
                pathWidth:
                    0.9 + contrast * 7.1,
                pathOpacity:
                    0.65 + contrast * 0.35,
                duration:
                    6.6 - contrast * 5,
                particles
            };
        }


        return Object.freeze({
            macroKeys,
            macroEnergy,
            proposedShares,
            defaultMacroLimits,
            horizonPeriods,
            activityProfiles,
            presets,
            clamp,
            macroCalories,
            modeledEnergyDemand,
            getActivityProfile,
            classifyEnergyBalance,
            getHorizonPeriod,
            outputTone,
            redistributeMacros,
            calculateBodyState,
            proposeGoalSettings,
            calculateTrajectory,
            calculateRouteSignals,
            flowPresentation
        });
    }
));
