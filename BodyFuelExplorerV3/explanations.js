/*
 * Body Fuel Flow Explorer — concise core explanations
 * Copyright © 2026 Anthony Adams. All rights reserved.
 */

(function attachBodyFuelExplanations(root, factory) {
    const explanations = factory();

    if (typeof module === "object" && module.exports) {
        module.exports = explanations;
    }

    root.BodyFuelExplanations = explanations;
}(
    typeof globalThis !== "undefined" ? globalThis : this,
    function createBodyFuelExplanations() {
        "use strict";

        return Object.freeze({
            protein: Object.freeze({
                title: "Protein input",
                body: "Protein-containing foods—including eggs, yogurt, chicken or turkey, fish, and beans—provide amino acids used throughout the body. A brighter pathway means protein is a more prominent part of the selected food pattern—not that a specific food travels to one destination."
            }),
            carbohydrates: Object.freeze({
                title: "Carbohydrate input",
                body: "Carbohydrate-containing foods—including oatmeal, toast, fruit, rice, and potatoes—contribute readily available fuel and support glycogen in this model. A brighter pathway shows relative emphasis within the combined pattern, not a measured blood or tissue value."
            }),
            fats: Object.freeze({
                title: "Fat input",
                body: "Fat provides concentrated energy, supplies essential fatty acids, supports cell membranes and hormone production, and helps the body absorb vitamins A, D, E, and K. It can be used for current energy needs or stored for later use. Familiar examples include nuts, avocado, peanut butter, bacon, and cheese.\n\nA brighter fat pathway means fat contributes more prominently to this model’s selected food pattern—not that the food has been measured going directly into body-fat storage.",
                detailsTitle: "Potential roles",
                details: Object.freeze([
                    "Current energy",
                    "Essential fatty acids",
                    "Cell membranes and hormone production",
                    "Absorption of fat-soluble vitamins",
                    "Nervous-system structures",
                    "Insulation and protection",
                    "Longer-term reserves"
                ])
            }),
            brain: Object.freeze({
                title: "Brain & Essential Fuel",
                body: "The body continuously supports the brain and other essential needs. A brighter card means this model gives those needs stronger relative emphasis—not that their activity has been measured."
            }),
            liver: Object.freeze({
                title: "Liver Processing",
                body: "The liver helps process, store, and release fuels as the whole system adjusts. A brighter card represents stronger conceptual processing emphasis, not a liver measurement."
            }),
            muscle: Object.freeze({
                title: "Working Muscles",
                body: "Working tissue draws on available fuel according to the model’s fixed Everyday Movement reference. Brightness shows relative routing tendency, not personal exercise use or calorie burn."
            }),
            repair: Object.freeze({
                title: "Repair & Rebuilding",
                body: "Protein provides amino acids used throughout the body for maintenance and repair. A brighter card means this model currently shows stronger support for those processes—not that repair has been measured."
            }),
            glycogen: Object.freeze({
                title: "Glycogen Storage",
                body: "Glycogen is a carbohydrate-based fuel reserve in muscle and liver. Brighter emphasis reflects the model’s relative use-and-refill tendency, not an estimate of actual glycogen stores."
            }),
            "fat-as-fuel": Object.freeze({
                title: "Fat as Fuel",
                body: "Fat contributing to current energy needs, from dietary fat or released reserves. Stored reserves released means stored energy being mobilized toward current use. A brighter card shows relative model emphasis—not measured fat oxidation, direct conversion of dietary fat to body fat, or a predicted personal outcome."
            }),
            "fat-storage": Object.freeze({
                title: "Fat Storage",
                body: "Energy routed toward longer-term reserve in this conceptual model. A brighter card shows relative storage emphasis—not measured body-fat change or a predicted personal outcome. Eating fat does not mean it travels directly into body-fat storage."
            }),
            timeline: Object.freeze({
                title: "Pattern Timeline",
                body: "The timeline asks what the model emphasizes if the selected foods repeat as one complete day. It changes the viewing lens; it does not advance time instantly or predict an individual outcome."
            }),
            "estimated-energy": Object.freeze({
                title: "Estimated food energy",
                body: "A calorie is a unit of food energy. Nutrition Calories are kilocalories (kcal). This estimate combines representative portions using approximate protein, carbohydrate, and fat content. Actual calories vary by portion, recipe, preparation, and brand. It is not a personal target and does not predict exactly how much energy your body will use or store.\n\nThe hero compares the selected daily food pattern with a fixed Everyday Movement model reference of approximately 2,150 kcal/day. This reference represents a general scenario—not your calorie need, target, or measured energy use. Food energy above, near, or below that reference helps the model decide whether storage or stored-reserve contribution should become more prominent.",
                detailsTitle: "How to read this estimate",
                details: Object.freeze([
                    "Selected foods may represent only part of a day.",
                    "Pattern Timeline treats the selected foods as the same repeated daily pattern.",
                    "Days, Weeks, and Months keep showing the selected day’s estimate in kcal/day; they do not multiply it into a cumulative total."
                ])
            }),
            "food-portions": Object.freeze({
                title: "Representative food portions",
                body: "Each tile uses one familiar portion and a fixed approximate estimate under the surface. It is a playful teaching example—not a measurement of a particular recipe, brand, restaurant meal, or person."
            })
        });
    }
));
