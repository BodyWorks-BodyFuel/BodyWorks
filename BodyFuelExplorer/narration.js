/*
 * Body Fuel Flow Explorer — plain-English teaching layer
 * Copyright © 2026 Anthony Adams. All rights reserved.
 */

(function attachBodyFuelNarration(root, factory) {
    const narration = factory();

    if (typeof module === "object" && module.exports) {
        module.exports = narration;
    }

    root.BodyFuelNarration = narration;
}(
    typeof globalThis !== "undefined" ? globalThis : this,
    function createBodyFuelNarration() {
        "use strict";

        function dominantFuel(item) {
            if (!item) return "mixed";

            const energy = {
                protein: item.estimate.protein * 4,
                carbohydrates: item.estimate.carbs * 4,
                fat: item.estimate.fats * 9
            };

            const [dominant, value] = Object.entries(energy)
                .sort((a, b) => b[1] - a[1])[0];

            return value === 0 ? "minimal" : dominant;
        }

        function tendencySentence(state, horizon) {
            if (!state) return "";

            if (state.balance < -200) {
                if (Number(horizon?.index) >= 2) {
                    return "If this same supply-to-reference relationship repeats across weeks, reserve-use, repair, and storage tendencies become easier to see.";
                }

                return "This selected day supplies less energy than the Everyday Movement model reference, so reserve contribution becomes more visible.";
            }

            if (state.balance > 200) {
                return "This selected day supplies more energy than the Everyday Movement model reference, so storage tendency becomes more prominent.";
            }

            return "Incoming fuel sits near the Everyday Movement model reference, so the model’s priorities remain more distributed.";
        }

        function foodChangeSentence(change, item) {
            if (!item) return "Today’s food collection changed.";

            if (dominantFuel(item) === "minimal") {
                return `${item.name} remains in Today’s foods, but this model focuses on energy-providing inputs, so it may show little routing change.`;
            }

            const direction = change.type === "food-remove" || change.type === "food-decrease"
                ? "reduced"
                : "added";

            const tendency = dominantFuel(item);
            const phrase = tendency === "carbohydrates"
                ? "carbohydrate-derived fuel and glycogen support"
                : tendency === "protein"
                    ? "protein available to the model’s repair and rebuilding signal"
                    : tendency === "fat"
                        ? "fat’s contribution to the modeled fuel mix"
                        : "the day’s combined fuel mix";

            return `You ${direction} ${item.name.toLowerCase()}. That changes ${phrase}.`;
        }

        function buildNarration({ change, state, item, activity, horizon, source }) {
            if (!state) {
                return {
                    title: "Add foods to begin",
                    body: "Choose familiar foods and portions. The model will interpret their combined daily inputs without simulating meal timing.",
                    context: "Everyday Movement and Today are ready when you are."
                };
            }

            let body;

            if (source === "manual") {
                body = "The technical fuel controls are adjusted from the food estimates, so the routing map is responding to those laboratory values.";
            } else if (change?.type?.startsWith("food")) {
                body = foodChangeSentence(change, item);
            } else if (change?.type === "activity") {
                body = `You changed the activity reference to ${activity.label}. Working-tissue demand now pulls with a different modeled intensity.`;
            } else if (change?.type === "horizon") {
                body = `You changed the viewing horizon to ${horizon.label}. This changes how strongly the model displays a repeated pattern; it does not advance time or predict an outcome.`;
            } else if (change?.type === "experiment") {
                body = "The suggested experiment changed one model variable so you can compare how the routing emphasis responds.";
            } else {
                body = "This example combines familiar meals into one day of approximate inputs. It is for exploring the model, not a suggested menu or nutrition recommendation.";
            }

            return {
                title: source === "manual" ? "Adjusted from foods" : "The day’s combined pattern",
                body,
                context: `${tendencySentence(state, horizon)} Activity: ${activity.label}. Horizon: ${horizon.label}.`
            };
        }

        function suggestExperiment({ change, activity, horizon, item }) {
            if (!change || change.type === "empty") {
                return null;
            }

            if (item && dominantFuel(item) === "minimal") {
                return {
                    label: "Add one bowl of oatmeal and compare the routes",
                    action: { type: "add-food", foodId: "oatmeal" }
                };
            }

            if (change.type === "activity") {
                const nextTime = horizon.index === 0 ? 1 : 0;
                return {
                    label: `View the same pattern across ${nextTime === 0 ? "Today" : "Days"}`,
                    action: { type: "horizon", value: nextTime }
                };
            }

            if (change.type === "horizon") {
                const nextActivity = activity.index === 2 ? 1 : 2;
                return {
                    label: `Change movement to ${nextActivity === 2 ? "Active / Training" : "Everyday Movement"}`,
                    action: { type: "activity", value: nextActivity }
                };
            }

            const nextActivity = activity.index === 1 ? 2 : 1;
            return {
                label: `Keep the foods and change movement to ${nextActivity === 2 ? "Active / Training" : "Everyday Movement"}`,
                action: { type: "activity", value: nextActivity }
            };
        }

        return Object.freeze({
            dominantFuel,
            buildNarration,
            suggestExperiment
        });
    }
));
