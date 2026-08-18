"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const model = require("../model.js");

const baseMacros = {
    protein: 150,
    carbs: 250,
    fats: 80
};

const outputKeys = [
    "availableFuel",
    "glycogen",
    "muscleDemand",
    "repair",
    "fatUse",
    "storage"
];

const presets =
    model.presets;


function assertNear(actual, expected, tolerance = 0.0001) {
    assert.ok(
        Math.abs(actual - expected) <= tolerance,
        `Expected ${actual} to be within ${tolerance} of ${expected}`
    );
}


function assertMacrosWithinLimits(macros) {
    model.macroKeys.forEach(key => {
        const limits =
            model.defaultMacroLimits[key];

        assert.ok(
            macros[key] >= limits.min && macros[key] <= limits.max,
            `${key} ${macros[key]} g is outside ${limits.min}-${limits.max} g`
        );

        assert.equal(
            Number.isInteger(macros[key]),
            true,
            `${key} should resolve to whole grams`
        );
    });
}


test("4 / 4 / 9 calorie relationship remains exact", () => {
    const origin =
        model.macroCalories({ protein: 0, carbs: 0, fats: 0 });

    assert.equal(origin, 0);
    assert.equal(
        model.macroCalories({ protein: 1, carbs: 0, fats: 0 }),
        4
    );
    assert.equal(
        model.macroCalories({ protein: 0, carbs: 1, fats: 0 }),
        4
    );
    assert.equal(
        model.macroCalories({ protein: 0, carbs: 0, fats: 1 }),
        9
    );
    assert.equal(model.macroCalories(baseMacros), 2320);
});


test("Everyday Baseline exactly matches the Everyday Movement reference", () => {
    const preset =
        presets.everyday;

    const state =
        model.calculateBodyState(preset);

    assert.deepEqual(preset, {
        protein: 134,
        carbs: 246,
        fats: 70,
        activity: 1,
        time: 0
    });
    assert.equal(state.calories, 2150);
    assert.equal(state.energyDemand, 2150);
    assert.equal(state.balance, 0);

    const resetMix = model.redistributeMacros({
        target: 2150,
        macros: preset
    });

    assert.deepEqual(resetMix.macros, {
        protein: 134,
        carbs: 246,
        fats: 70
    });
    assert.equal(resetMix.constrained, false);
});


test("Well-Matched Active remains a calibrated separate example", () => {
    const state =
        model.calculateBodyState(presets.matched);

    assert.equal(state.calories, 2320);
    assert.equal(state.energyDemand, 2320);
    assert.equal(state.balance, 0);
    assertNear(state.availableFuel, 59.7);
    assertNear(state.glycogen, 42.5);
    assertNear(state.muscleDemand, 75);
    assertNear(state.repair, 68.87);
    assertNear(state.fatUse, 61.25);
    assertNear(state.storage, 25);
});


test("activity profiles expose transparent demand anchors", () => {
    assert.deepEqual(
        model.activityProfiles.map(profile => profile.shortLabel),
        ["Rest", "Everyday", "Active", "High"]
    );

    assert.deepEqual(
        model.activityProfiles.map(profile => profile.demand),
        [1800, 2150, 2320, 3000]
    );

    const macros = {
        protein: 165,
        carbs: 304,
        fats: 92
    };

    assert.equal(model.macroCalories(macros), 2704);

    const states = model.activityProfiles.map((profile, activity) =>
        model.calculateBodyState({
            ...macros,
            activity,
            time: 1
        })
    );

    assert.deepEqual(
        states.map(state => state.energyDemand),
        [1800, 2150, 2320, 3000]
    );

    assert.deepEqual(
        states.map(state => model.classifyEnergyBalance(state.balance)),
        ["surplus", "surplus", "surplus", "deficit"]
    );

    assert.equal(model.classifyEnergyBalance(-201), "deficit");
    assert.equal(model.classifyEnergyBalance(-200), "matched");
    assert.equal(model.classifyEnergyBalance(200), "matched");
    assert.equal(model.classifyEnergyBalance(201), "surplus");
});


test("all slider boundary combinations stay finite and bounded", () => {
    const values = {
        protein: [40, 145, 250],
        carbs: [40, 270, 500],
        fats: [20, 100, 180],
        activity: [0, 1, 2, 3],
        time: [0, 1, 2, 3]
    };

    let scenarios = 0;

    for (const protein of values.protein) {
        for (const carbs of values.carbs) {
            for (const fats of values.fats) {
                for (const activity of values.activity) {
                    for (const time of values.time) {
                        const state = model.calculateBodyState({
                            protein,
                            carbs,
                            fats,
                            activity,
                            time
                        });

                        outputKeys.forEach(key => {
                            assert.equal(Number.isFinite(state[key]), true);
                            assert.ok(
                                state[key] >= 0 && state[key] <= 100,
                                `${key} escaped 0-100 at scenario ${scenarios}`
                            );
                        });

                        const routes =
                            model.calculateRouteSignals(state);

                        Object.values(routes.strengths)
                            .forEach(strength => {
                                assert.equal(Number.isFinite(strength), true);
                                assert.ok(strength >= 0 && strength <= 100);

                                const visual =
                                    model.flowPresentation(strength);

                                assert.equal(
                                    [
                                        visual.channelOpacity,
                                        visual.pathWidth,
                                        visual.pathOpacity,
                                        visual.duration,
                                        ...visual.particles.flatMap(
                                            particle => [
                                                particle.opacity,
                                                particle.radius
                                            ]
                                        )
                                    ].every(Number.isFinite),
                                    true
                                );
                            });

                        scenarios += 1;
                    }
                }
            }
        }
    }

    assert.equal(scenarios, 432);
});


test("viewing horizons are discrete and amplify repeated patterns", () => {
    assert.deepEqual(
        model.horizonPeriods.map(period => period.label),
        ["Today", "Days", "Weeks", "Months"]
    );
    assert.equal(model.getHorizonPeriod(Number.NaN).label, "Today");

    const matchedToday = model.calculateBodyState({
        ...presets.matched,
        time: 0
    });

    const matchedMonths = model.calculateBodyState({
        ...presets.matched,
        time: 3
    });

    assert.ok(matchedMonths.repair > matchedToday.repair);
    assert.equal(matchedMonths.storage, matchedToday.storage);

    const surplusToday = model.calculateBodyState({
        protein: 200,
        carbs: 400,
        fats: 120,
        activity: 0,
        time: 0
    });

    const surplusMonths = model.calculateBodyState({
        protein: 200,
        carbs: 400,
        fats: 120,
        activity: 0,
        time: 3
    });

    assert.ok(surplusMonths.storage > surplusToday.storage);

    const deficitToday = model.calculateBodyState({
        protein: 150,
        carbs: 200,
        fats: 60,
        activity: 2,
        time: 0
    });

    const deficitMonths = model.calculateBodyState({
        protein: 150,
        carbs: 200,
        fats: 60,
        activity: 2,
        time: 3
    });

    assert.ok(deficitMonths.storage < deficitToday.storage);
    assert.ok(
        model.calculateRouteSignals(deficitMonths).strengths.release >
        model.calculateRouteSignals(deficitToday).strengths.release
    );
});


test("output status tones follow each signal's meaning", () => {
    assert.equal(model.outputTone("fuel", 20), "alert");
    assert.equal(model.outputTone("fuel", 65), "good");
    assert.equal(model.outputTone("glycogen", 45), "caution");
    assert.equal(model.outputTone("repair", 72), "good");
    assert.equal(model.outputTone("muscle", 40), "good");
    assert.equal(model.outputTone("muscle", 80), "alert");
    assert.equal(model.outputTone("fatUse", 45), "caution");
    assert.equal(model.outputTone("fatUse", 65), "alert");
    assert.equal(model.outputTone("storage", 20), "good");
    assert.equal(model.outputTone("storage", 70), "alert");
});


test("unlocked macros resolve across the complete calorie-slider range", () => {
    [800, 1200, 2320, 3500, 4500]
        .forEach(target => {
            const result = model.redistributeMacros({
                target,
                macros: baseMacros
            });

            assertMacrosWithinLimits(result.macros);
            assert.equal(result.requestedTarget, target);
            assert.ok(Math.abs(result.difference) <= 4);
            assert.equal(result.constrained, false);
        });
});


test("fat dragging does not rebase or accumulate the master budget", () => {
    const target = 2320;
    let macros = { ...baseMacros };
    let scenarios = 0;

    const fatPath = [
        ...Array.from({ length: 101 }, (_, index) => 80 + index),
        ...Array.from({ length: 160 }, (_, index) => 179 - index),
        ...Array.from({ length: 60 }, (_, index) => 21 + index)
    ];

    fatPath.forEach(fats => {
        const result = model.redistributeMacros({
            target,
            macros: { ...macros, fats },
            fixedKey: "fats"
        });

        macros = result.macros;
        scenarios += 1;

        assert.equal(result.requestedTarget, target);
        assert.equal(result.macros.fats, fats);
        assert.ok(
            Math.abs(result.actualCalories - target) <= 4,
            `Budget drifted to ${result.actualCalories} kcal at ${fats} g fat`
        );
        assert.equal(result.constrained, false);
    });

    assert.equal(scenarios, 321);
    assert.equal(macros.fats, 80);
    assert.ok(Math.abs(model.macroCalories(macros) - target) <= 4);
});


test("whole-gram fat rounding never changes the requested master target", () => {
    [63, 64, 65, 66, 67, 68, 69].forEach(fats => {
        const result = model.redistributeMacros({
            target: 2320,
            macros: { ...baseMacros, fats },
            fixedKey: "fats"
        });

        assert.equal(result.requestedTarget, 2320);
        assert.equal(result.macros.fats, fats);
        assert.ok(Math.abs(result.actualCalories - 2320) <= 2);
    });
});


test("each macro can be held while the others preserve the budget", () => {
    const heldValues = {
        protein: 205,
        carbs: 360,
        fats: 145
    };

    model.macroKeys.forEach(fixedKey => {
        const result = model.redistributeMacros({
            target: 3000,
            macros: {
                ...baseMacros,
                [fixedKey]: heldValues[fixedKey]
            },
            fixedKey
        });

        assert.equal(result.macros[fixedKey], heldValues[fixedKey]);
        assert.ok(Math.abs(result.difference) <= 4);
        assert.equal(result.constrained, false);
    });
});


test("interleaved targets, macro drags and locks keep one master budget", () => {
    const target = 2704;
    let macros = model.redistributeMacros({
        target,
        macros: baseMacros
    }).macros;

    let result = model.redistributeMacros({
        target,
        macros: {
            ...macros,
            protein: 200
        },
        fixedKey: "protein"
    });

    macros = result.macros;
    assert.equal(macros.protein, 200);
    assert.equal(result.requestedTarget, target);
    assert.ok(Math.abs(result.difference) <= 4);

    result = model.redistributeMacros({
        target,
        macros: {
            ...macros,
            carbs: 300
        },
        locks: {
            protein: true
        },
        fixedKey: "carbs"
    });

    macros = result.macros;
    assert.equal(macros.protein, 200);
    assert.equal(macros.carbs, 300);
    assert.equal(result.requestedTarget, target);
    assert.ok(Math.abs(result.difference) <= 4);

    result = model.redistributeMacros({
        target,
        macros,
        locks: {
            protein: true,
            carbs: false,
            fats: true
        }
    });

    assert.equal(result.macros.protein, 200);
    assert.equal(result.macros.fats, macros.fats);
    assert.equal(result.requestedTarget, target);
    assert.ok(Math.abs(result.difference) <= 4);
});


test("all macro-lock combinations respect locks and report constraints", () => {
    const targets = [800, 2320, 4500];
    let scenarios = 0;

    for (let mask = 0; mask < 8; mask += 1) {
        const locks = Object.fromEntries(
            model.macroKeys.map((key, index) => [
                key,
                Boolean(mask & (1 << index))
            ])
        );

        targets.forEach(target => {
            const result = model.redistributeMacros({
                target,
                macros: baseMacros,
                locks
            });

            assertMacrosWithinLimits(result.macros);

            model.macroKeys.forEach(key => {
                if (locks[key]) {
                    assert.equal(result.macros[key], baseMacros[key]);
                }
            });

            if (!result.constrained) {
                assert.ok(Math.abs(result.difference) <= 4);
            }

            scenarios += 1;
        });
    }

    assert.equal(scenarios, 24);
});


test("a single unlocked macro balances achievable budgets", () => {
    const result = model.redistributeMacros({
        target: 2500,
        macros: baseMacros,
        locks: {
            protein: true,
            carbs: true,
            fats: false
        }
    });

    assert.equal(result.macros.protein, 150);
    assert.equal(result.macros.carbs, 250);
    assert.equal(result.macros.fats, 100);
    assert.equal(result.actualCalories, 2500);
    assert.equal(result.constrained, false);
});


test("impossible locked budgets are explicit rather than silently drifting", () => {
    const result = model.redistributeMacros({
        target: 4500,
        macros: baseMacros,
        locks: {
            protein: true,
            carbs: true,
            fats: true
        }
    });

    assert.deepEqual(result.macros, baseMacros);
    assert.equal(result.actualCalories, 2320);
    assert.equal(result.requestedTarget, 4500);
    assert.equal(result.constrained, true);
});


test("weight context does not alter fuel, demand or routing calculations", () => {
    const scenario = model.presets.everyday;

    assert.deepEqual(
        model.calculateBodyState({
            ...scenario,
            current: 150,
            target: 180,
            unit: "lb"
        }),
        model.calculateBodyState(scenario)
    );
});


test("trajectory states agree with goal and supply direction", () => {
    assert.deepEqual(
        model.calculateTrajectory({
            current: Number.NaN,
            target: Number.NaN,
            balance: 0,
            time: 2
        }),
        {
            state: "setup",
            label: "Add weights to see direction",
            icon: "○",
            supplyPhrase: "near"
        }
    );

    const toward = model.calculateTrajectory({
        current: 150,
        target: 180,
        balance: 300,
        time: 2
    });

    assert.equal(toward.state, "toward");
    assert.equal(toward.label, "Scenario points toward target");

    const away = model.calculateTrajectory({
        current: 150,
        target: 180,
        balance: -300,
        time: 2
    });

    assert.equal(away.state, "away");
    assert.equal(away.label, "Scenario points away from target");

    const near = model.calculateTrajectory({
        current: 180,
        target: 150,
        balance: 0,
        time: 0
    });

    assert.equal(near.state, "maintaining");
    assert.equal(near.label, "Scenario near modeled balance");
});


test("presets produce distinct, valid routing stories", () => {
    const states = Object.fromEntries(
        Object.entries(presets).map(([name, preset]) => [
            name,
            model.calculateBodyState(preset)
        ])
    );

    const routes = Object.fromEntries(
        Object.entries(states).map(([name, state]) => [
            name,
            model.calculateRouteSignals(state)
        ])
    );

    assert.ok(
        routes.under.strengths.muscle >
        routes.under.strengths.glycogen
    );

    assert.ok(routes.under.release > 12);
    assert.equal(routes.oversupplied.release, 0);

    assert.ok(
        routes.oversupplied.strengths.storage >
        routes.oversupplied.strengths.muscle
    );

    assert.ok(
        routes.carb.strengths.glycogen >
        routes.fat.strengths.glycogen
    );

    assert.ok(
        states.protein.repair >
        states.matched.repair
    );
});


test("flow styling strongly differentiates low and dominant routes", () => {
    const low =
        model.flowPresentation(10);

    const dominant =
        model.flowPresentation(95);

    assert.equal(low.level, "low");
    assert.equal(dominant.level, "dominant");
    assert.ok(dominant.pathWidth > low.pathWidth * 5);
    assert.ok(dominant.channelOpacity > low.channelOpacity * 4);
    assert.ok(dominant.duration < low.duration / 2);

    const lowParticles =
        low.particles.filter(particle => particle.opacity > 0.05).length;

    const dominantParticles =
        dominant.particles.filter(particle => particle.opacity > 0.05).length;

    assert.ok(dominantParticles > lowParticles);
});
