/*
 * Body Fuel Flow Explorer
 * Copyright © 2026 Anthony Adams. All rights reserved.
 * Public visibility does not grant permission to reuse this work. See COPYRIGHT.md.
 */

const controls = {
    protein: document.getElementById("protein"),
    carbs: document.getElementById("carbs"),
    fats: document.getElementById("fats"),
    activity: document.getElementById("activity"),
    time: document.getElementById("time")
};


const {
    macroKeys,
    macroCalories: calculateMacroCalories,
    redistributeMacros: redistributeMacroValues,
    calculateBodyState,
    proposeGoalSettings,
    calculateTrajectory,
    calculateRouteSignals,
    flowPresentation,
    getHorizonPeriod,
    getActivityProfile,
    classifyEnergyBalance,
    outputTone,
    presets
} = window.BodyFuelModel;

const macroLabels = {
    protein: "Protein",
    carbs: "Carbohydrates",
    fats: "Fats"
};

const plannerElements = {
    currentWeight: document.getElementById("currentWeight"),
    targetWeight: document.getElementById("targetWeight"),
    weightUnit: document.getElementById("weightUnit"),
    calorieTarget: document.getElementById("calorieTarget"),
    resetMixButton: document.getElementById("resetMixButton"),
    calorieStatus: document.getElementById("calorieStatus"),
    trajectoryCard: document.getElementById("trajectoryCard"),
    trajectoryIcon: document.getElementById("trajectoryIcon"),
    trajectoryLabel: document.getElementById("trajectoryLabel"),
    trajectoryDetail: document.getElementById("trajectoryDetail")
};

const planner = {
    calorieTarget: 2320,
    weightUnit: "lb",
    locks: {
        protein: false,
        carbs: false,
        fats: false
    }
};

let goalPlanTimer = null;
const explorerHistoryKey = "bodyFuelExplorer";


function createExplorerSnapshot() {

    const activePreset =
        document.querySelector(".preset.active")?.dataset.preset || null;

    return {
        version: 1,
        calorieTarget: Number(planner.calorieTarget),
        weightUnit: planner.weightUnit,
        currentWeight: plannerElements.currentWeight.value,
        targetWeight: plannerElements.targetWeight.value,
        macros: Object.fromEntries(
            macroKeys.map(key => [
                key,
                Number(controls[key].value)
            ])
        ),
        activity: Number(controls.activity.value),
        time: Number(controls.time.value),
        locks: { ...planner.locks },
        activePreset,
        calorieStatus: plannerElements.calorieStatus.textContent,
        calorieStatusConstrained:
            plannerElements.calorieStatus.classList.contains("is-constrained"),
        flowMotionPaused,
        motionUserOverride
    };
}


function persistExplorerSnapshot() {

    try {
        const currentHistoryState =
            history.state && typeof history.state === "object"
                ? history.state
                : {};

        history.replaceState(
            {
                ...currentHistoryState,
                [explorerHistoryKey]: createExplorerSnapshot()
            },
            ""
        );
    } catch (error) {
        // The explorer remains functional if a browser restricts History API writes.
    }
}


function restoreRangeValue(control, value) {

    const number = Number(value);

    if (!Number.isFinite(number)) {
        return;
    }

    control.value = Math.min(
        Number(control.max),
        Math.max(Number(control.min), number)
    );
}


function restoreExplorerSnapshot() {

    const snapshot =
        history.state?.[explorerHistoryKey];

    if (!snapshot || snapshot.version !== 1) {
        return null;
    }

    macroKeys.forEach(key => {
        restoreRangeValue(
            controls[key],
            snapshot.macros?.[key]
        );

        planner.locks[key] =
            snapshot.locks?.[key] === true;
    });

    restoreRangeValue(
        controls.activity,
        snapshot.activity
    );

    restoreRangeValue(
        controls.time,
        snapshot.time
    );

    const requestedCalories =
        Number(snapshot.calorieTarget);

    if (Number.isFinite(requestedCalories)) {
        planner.calorieTarget = Math.min(
            Number(plannerElements.calorieTarget.max),
            Math.max(
                Number(plannerElements.calorieTarget.min),
                requestedCalories
            )
        );
    }

    planner.weightUnit =
        snapshot.weightUnit === "kg" ? "kg" : "lb";

    plannerElements.weightUnit.value =
        planner.weightUnit;

    const weightMaximum =
        planner.weightUnit === "kg" ? "550" : "1200";

    [
        plannerElements.currentWeight,
        plannerElements.targetWeight
    ].forEach(input => {
        input.max = weightMaximum;
    });

    plannerElements.currentWeight.value =
        snapshot.currentWeight || "";

    plannerElements.targetWeight.value =
        snapshot.targetWeight || "";

    clearActivePreset();

    if (
        snapshot.activePreset &&
        Object.prototype.hasOwnProperty.call(
            presets,
            snapshot.activePreset
        )
    ) {
        const presetButton = document.querySelector(
            `[data-preset="${snapshot.activePreset}"]`
        );

        presetButton?.classList.add("active");
        presetButton?.setAttribute("aria-pressed", "true");
    }

    if (typeof snapshot.calorieStatus === "string") {
        setCalorieStatus(
            snapshot.calorieStatus,
            snapshot.calorieStatusConstrained === true
        );
    }

    updateCalorieTargetDisplay();

    return snapshot;
}


function cancelGoalPlanTimer() {
    window.clearTimeout(goalPlanTimer);
    goalPlanTimer = null;
}


function labelLevel(value) {

    if (value < 25) return "Low";

    if (value < 50) return "Moderate";

    if (value < 75) return "High";

    return "Very High";
}


function timeLabel(value) {
    return getHorizonPeriod(value).label;
}


function macroCalories() {
    return calculateMacroCalories(
        Object.fromEntries(
            macroKeys.map(key => [
                key,
                Number(controls[key].value)
            ])
        )
    );
}


function clearActivePreset() {
    document
        .querySelectorAll(".preset")
        .forEach(button => {
            button.classList.remove("active");
            button.setAttribute("aria-pressed", "false");
        });
}


function setCalorieStatus(message, constrained = false) {
    plannerElements.calorieStatus.textContent = message;
    plannerElements.calorieStatus.classList.toggle(
        "is-constrained",
        constrained
    );
}


function updateCalorieTargetDisplay() {
    const requestedTarget =
        Math.round(Number(planner.calorieTarget));

    plannerElements.calorieTarget.value =
        requestedTarget;

    document.getElementById("calories").textContent =
        requestedTarget.toLocaleString();

    plannerElements.calorieTarget.setAttribute(
        "aria-valuetext",
        `${requestedTarget.toLocaleString()} kilocalories`
    );
}


function updateWeightUnitAccessibility() {
    const unitLabel =
        planner.weightUnit === "kg"
            ? "kilograms"
            : "pounds";

    plannerElements.currentWeight.setAttribute(
        "aria-label",
        `Current weight in ${unitLabel}`
    );

    plannerElements.targetWeight.setAttribute(
        "aria-label",
        `Target weight in ${unitLabel}`
    );
}


function redistributeMacros(requestedTarget, fixedKey = null) {
    const macros = Object.fromEntries(
        macroKeys.map(key => [
            key,
            Number(controls[key].value)
        ])
    );

    const limits = Object.fromEntries(
        macroKeys.map(key => [
            key,
            {
                min: Number(controls[key].min),
                max: Number(controls[key].max)
            }
        ])
    );

    const result = redistributeMacroValues({
        target: Number(requestedTarget),
        macros,
        locks: planner.locks,
        fixedKey,
        limits
    });

    Object.entries(result.macros)
        .forEach(([key, grams]) => {
            controls[key].value = grams;
        });

    planner.calorieTarget =
        result.requestedTarget;

    updateCalorieTargetDisplay();

    return result;
}


function updateMacroLockUI() {
    const unlockedKeys = macroKeys.filter(key =>
        !planner.locks[key]
    );

    document
        .querySelectorAll(".macro-lock")
        .forEach(button => {
            const key = button.dataset.macro;
            const locked = planner.locks[key];
            const budgetBound =
                !locked && unlockedKeys.length === 1;

            button.setAttribute(
                "aria-pressed",
                String(locked)
            );

            button.setAttribute(
                "aria-label",
                `${macroLabels[key]} lock at ${controls[key].value} grams`
            );

            button.querySelector(".lock-label").textContent =
                locked ? "Locked" : "Lock";

            const controlContainer =
                controls[key].closest(".control");

            controlContainer.classList.toggle(
                "is-locked",
                locked
            );

            controlContainer.classList.toggle(
                "is-budget-bound",
                budgetBound
            );

            controls[key].disabled =
                locked || budgetBound;
        });

    const allLocked =
        unlockedKeys.length === 0;

    plannerElements.calorieTarget.disabled =
        allLocked;

    plannerElements.resetMixButton.disabled =
        allLocked;
}


function clearMacroLocks() {
    macroKeys.forEach(key => {
        planner.locks[key] = false;
    });

    updateMacroLockUI();
}


function goalWeights() {
    const current =
        Number(plannerElements.currentWeight.value);

    const target =
        Number(plannerElements.targetWeight.value);

    if (
        !Number.isFinite(current) ||
        !Number.isFinite(target) ||
        current <= 0 ||
        target <= 0
    ) {
        return null;
    }

    return { current, target };
}


function proposeFuelForGoal() {
    const weights =
        goalWeights();

    if (!weights) return false;

    const proposal = proposeGoalSettings({
        ...weights,
        unit: planner.weightUnit,
        calorieMin: Number(plannerElements.calorieTarget.min),
        calorieMax: Number(plannerElements.calorieTarget.max)
    });

    const {
        direction,
        activity: proposedActivity,
        calorieTarget: requestedTarget
    } = proposal;

    controls.activity.value =
        proposedActivity;

    clearActivePreset();

    const result =
        redistributeMacros(requestedTarget);

    const directionLabel =
        direction > 0
            ? "above"
            : direction < 0
                ? "below"
                : "near";

    if (result.constrained) {
        setCalorieStatus(
            `Goal direction proposed, but locks or macro limits set the closest available mix at ${result.actualCalories.toLocaleString()} kcal.`,
            true
        );
    } else {
        setCalorieStatus(
            `Directional starting plan: activity shifts to ${getActivityProfile(proposedActivity).label}, and fuel sits modestly ${directionLabel} modeled demand.`
        );
    }

    calculate();

    return true;
}


function updateTrajectory(balance, time) {
    const currentWeight =
        Number(plannerElements.currentWeight.value);

    const targetWeight =
        Number(plannerElements.targetWeight.value);

    const trajectory = calculateTrajectory({
        current: currentWeight,
        target: targetWeight,
        unit: planner.weightUnit,
        balance,
        time
    });

    if (trajectory.state === "setup") {
        plannerElements.trajectoryCard.dataset.state =
            "setup";

        plannerElements.trajectoryIcon.textContent =
            "○";

        plannerElements.trajectoryLabel.textContent =
            "Add weights to see direction";

        plannerElements.trajectoryDetail.textContent =
            "Enter both weights to generate a directional starting plan.";

        return;
    }

    plannerElements.trajectoryCard.dataset.state =
        trajectory.state;

    plannerElements.trajectoryIcon.textContent =
        trajectory.icon;

    plannerElements.trajectoryLabel.textContent =
        trajectory.label;

    plannerElements.trajectoryDetail.textContent =
        `Fuel supply is ${trajectory.supplyPhrase} modeled demand ${getHorizonPeriod(time).phrase}.`;
}


function calculate() {

    const protein = Number(controls.protein.value);
    const carbs = Number(controls.carbs.value);
    const fats = Number(controls.fats.value);

    const activity = Number(controls.activity.value);
    const time = Number(controls.time.value);

    const state = calculateBodyState({
        protein,
        carbs,
        fats,
        activity,
        time
    });

    const {
        balance,
        energyDemand,
        availableFuel,
        glycogen,
        muscleDemand,
        repair,
        fatUse,
        storage
    } = state;


    updateText(
        protein,
        carbs,
        fats,
        activity,
        time,
        energyDemand
    );


    updateOutput("fuel", availableFuel);
    updateOutput("glycogen", glycogen);
    updateOutput("muscle", muscleDemand);
    updateOutput("repair", repair);
    updateOutput("fatUse", fatUse);
    updateOutput("storage", storage);


    updateVisuals(state);


    updateState(balance, muscleDemand, repair);

    updateTrajectory(balance, time);

    updateMacroLockUI();

    persistExplorerSnapshot();

    scheduleRouteGeometryUpdate();

}


function updateText(
    protein,
    carbs,
    fats,
    activity,
    time,
    energyDemand
) {

    document.getElementById("proteinValue").textContent =
        protein;

    document.getElementById("carbsValue").textContent =
        carbs;

    document.getElementById("fatsValue").textContent =
        fats;

    document.getElementById("stageProteinValue").textContent =
        protein;

    document.getElementById("stageCarbsValue").textContent =
        carbs;

    document.getElementById("stageFatsValue").textContent =
        fats;

    controls.protein.setAttribute(
        "aria-valuetext",
        `${protein} grams`
    );

    controls.carbs.setAttribute(
        "aria-valuetext",
        `${carbs} grams`
    );

    controls.fats.setAttribute(
        "aria-valuetext",
        `${fats} grams`
    );

    const activityProfile =
        getActivityProfile(activity);

    document.getElementById("activityLabel").textContent =
        activityProfile.label;

    document.getElementById("activityDemandValue").textContent =
        `Model reference: ≈ ${Math.round(energyDemand).toLocaleString()} kcal/day`;

    document.getElementById("activityDescription").textContent =
        activityProfile.description;

    controls.activity.setAttribute(
        "aria-valuetext",
        `${activityProfile.label}, model reference approximately ${Math.round(energyDemand).toLocaleString()} kilocalories per day`
    );

    document
        .querySelectorAll(".activity-scale [data-activity]")
        .forEach(label => {
            label.classList.toggle(
                "is-active",
                Number(label.dataset.activity) === Number(activity)
            );
        });

    document.getElementById("timeLabel").textContent =
        timeLabel(time);

    document.getElementById("horizonDescription").textContent =
        getHorizonPeriod(time).description;

    controls.time.setAttribute(
        "aria-valuetext",
        timeLabel(time)
    );

    document
        .querySelectorAll(".horizon-scale [data-horizon]")
        .forEach(label => {
            label.classList.toggle(
                "is-active",
                Number(label.dataset.horizon) === Number(time)
            );
        });
}


function outputStatus(id, value) {

    if (id === "fuel") {
        if (value < 30) return "Constrained";
        if (value < 55) return "Limited";
        if (value < 80) return "Good";
        return "Abundant";
    }

    if (id === "glycogen") {
        if (value < 30) return "Low";
        if (value < 60) return "Moderate";
        if (value < 80) return "High";
        return "Full";
    }

    if (id === "fatUse") {
        if (value < 30) return "Low";
        if (value < 60) return "Moderate";
        if (value < 80) return "High";
        return "Dominant";
    }

    return labelLevel(value);
}


function updateOutput(id, value) {

    const rounded =
        Math.round(value);

    document.getElementById(
        `${id}Output`
    ).textContent =
        `${rounded}%`;

    const gauge =
        document.getElementById(`${id}Gauge`);

    gauge.setAttribute(
        "stroke-dasharray",
        `${rounded} 100`
    );

    const needle =
        document.getElementById(`${id}Needle`);

    const angle =
        -90 + rounded * 1.8;

    needle.setAttribute(
        "transform",
        `rotate(${angle} 70 68)`
    );

    const status =
        document.getElementById(`${id}Status`);

    status.textContent =
        outputStatus(id, rounded);

    status.classList.remove(
        "status-good",
        "status-caution",
        "status-alert"
    );

    status.classList.add(
        `status-${outputTone(id, rounded)}`
    );

    const destinationValue =
        document.getElementById(
            `destination${id.charAt(0).toUpperCase()}${id.slice(1)}Value`
        );

    if (destinationValue) {
        destinationValue.textContent = `${rounded}%`;
    }
}


function updateRouteChannel(name, value) {

    const channel =
        document.querySelector(`[data-route="${name}"]`);

    if (!channel) return;

    const isRelease =
        name === "release";

    const particles =
        [...channel.querySelectorAll(".route-particle")];

    const presentation = flowPresentation(
        value,
        particles.length,
        isRelease
    );

    channel.style.opacity =
        presentation.channelOpacity;

    channel.dataset.flowLevel =
        presentation.level;

    const paths =
        [...channel.querySelectorAll(".route-path")];

    paths.forEach(path => {
        const widthScale =
            path.classList.contains("route-share")
                ? 0.46
                : isRelease
                    ? 0.58
                    : 1;

        path.style.strokeWidth =
            `${(presentation.pathWidth * widthScale).toFixed(2)}px`;

        path.style.opacity =
            path.classList.contains("route-share")
                ? Math.max(0.20, presentation.pathOpacity * 0.64)
                : presentation.pathOpacity * (isRelease ? 0.72 : 1);
    });

    const envelopes =
        [...channel.querySelectorAll(".route-envelope")];

    envelopes.forEach(envelope => {
        envelope.style.strokeWidth =
            `${(
                isRelease
                    ? 2.4 + presentation.pathWidth * 1.35
                    : 3.2 + presentation.pathWidth * 2.65
            ).toFixed(2)}px`;

        envelope.style.opacity =
            (
                isRelease
                    ? 0.02 + presentation.contrast * 0.14
                    : 0.035 + presentation.contrast * 0.29
            ).toFixed(2);
    });

    const filaments =
        [...channel.querySelectorAll(".route-filament")];

    filaments.forEach(filament => {
        filament.style.strokeWidth =
            `${Math.max(
                0.45,
                presentation.pathWidth * (isRelease ? 0.11 : 0.22)
            ).toFixed(2)}px`;

        filament.style.opacity =
            (
                isRelease
                    ? 0.02 + presentation.contrast * 0.26
                    : 0.04 + presentation.contrast * 0.58
            ).toFixed(2);
    });

    const terminals =
        [...channel.querySelectorAll(".route-terminal")];

    terminals.forEach(terminal => {
        terminal.setAttribute(
            "r",
            (2.4 + presentation.contrast * 5.4).toFixed(1)
        );

        terminal.style.opacity =
            (0.14 + presentation.contrast * 0.78).toFixed(2);
    });

    particles.forEach((particle, index) => {
        const particleState =
            presentation.particles[index];

        particle.style.opacity =
            (
                particleState.opacity * (isRelease ? 0.62 : 1)
            ).toFixed(2);

        particle.setAttribute(
            "r",
            (
                particleState.radius * (isRelease ? 0.68 : 1)
            ).toFixed(1)
        );
    });

    const animations =
        [...channel.querySelectorAll("animateMotion")];

    animations.forEach((animation, index) => {
        const duration =
            presentation.duration * (isRelease ? 1.28 : 1);

        animation.setAttribute(
            "dur",
            `${duration.toFixed(2)}s`
        );

        animation.setAttribute(
            "begin",
            index === 0
                ? "0s"
                : `${(-(duration / animations.length) * index).toFixed(2)}s`
        );
    });
}


function updateVisuals(state) {

    const {
        activity,
        availableFuel,
        repair,
        fatUse,
        storage,
        glycogen,
        balance
    } = state;

    const routeSignals =
        calculateRouteSignals(state);

    Object.entries(routeSignals.strengths)
        .forEach(([name, strength]) => {
            updateRouteChannel(name, strength);
        });

    const routingStage =
        document.querySelector(".routing-stage");

    routingStage.classList.toggle(
        "is-releasing",
        routeSignals.release > 12
    );

    updateBalanceAura(balance);

    Object.entries(routeSignals.destinations)
        .forEach(([name, value]) => {
            const card = document.querySelector(
                `.destination-${name === "fuel" ? "brain" : name === "fatUse" ? "liver" : name}`
            );

            if (card) {
                card.classList.toggle(
                    "is-prioritized",
                    value >= 68
                );
            }
        });


    /*
        Organ and storage signals stay independent of the body artwork.
    */

    const brainRegion =
        document.querySelector(".brain");

    brainRegion.style.opacity =
        0.04 + availableFuel / 320;

    const liverRegion =
        document.querySelector(".liver");

    liverRegion.style.opacity =
        0.03 + fatUse / 300;

    const glycogenRegion =
        document.querySelector(".glycogen-reserve");

    glycogenRegion.style.opacity =
        0.02 + glycogen / 320;

    glycogenRegion.style.transform =
        `scale(${0.9 + glycogen / 1000})`;


    /*
        Working muscle glow
    */

    document
        .querySelectorAll(".muscle, .leg-muscle")
        .forEach(region => {

            region.style.opacity =
                0.03 + activity / 420;

            region.style.transform =
                `scale(${0.94 + activity / 1200})`;
        });


    /*
        Repair glow
    */

    const repairRegion =
        document.querySelector(".repair");

    repairRegion.style.opacity =
        0.03 + Math.min(0.24, repair / 420);


    /*
        Storage visually grows
    */

    const fatReserve =
        document.querySelector(".fat-reserve");

    const storageScale =
        0.75 +
        storage / 180;

    fatReserve.style.transform =
        `scale(${storageScale})`;

    fatReserve.style.opacity =
        0.02 +
        storage / 360;

}


function updateBalanceAura(balance) {
    const state =
        classifyEnergyBalance(balance);

    document.querySelector(".routing-stage").dataset.balanceState =
        state;

    const stageMessage =
        document.querySelector(".stage-message");

    const labels = {
        deficit: "Drawing from stores",
        matched: "Supply near demand",
        surplus: "Supply above demand"
    };

    stageMessage.dataset.balanceState =
        state;

    document.getElementById("balanceSummary").textContent =
        labels[state];
}


function updateState(balance, activity, repair) {

    const title =
        document.getElementById("stateTitle");

    const description =
        document.getElementById("stateDescription");


    const balanceState =
        classifyEnergyBalance(balance);


    if (balanceState === "deficit") {

        title.textContent =
            "Demand exceeds incoming fuel";

        description.textContent =
            "The machine increasingly relies on stored resources while prioritizing essential function and active tissue.";

        return;
    }


    if (balanceState === "surplus") {

        title.textContent =
            "Fuel supply exceeds current demand";

        description.textContent =
            "Incoming fuel is above this activity profile's reference demand, leaving more energy available for storage over time.";

        return;
    }


    if (activity > 70 && repair > 60) {

        title.textContent =
            "Active tissue is asking for resources";

        description.textContent =
            "Movement and rebuilding create strong demand, increasing routing toward working muscle and repair.";

        return;
    }


    title.textContent =
        "Fuel matches demand";

    description.textContent =
        "Incoming energy supports activity, repair, organ function and normal storage while the system continuously adjusts.";

}


function applyPreset(name, options = {}) {

    const preset =
        presets[name];

    const clearGoals =
        options.clearGoals === true;

    cancelGoalPlanTimer();

    clearMacroLocks();

    Object.keys(preset).forEach(key => {

        controls[key].value =
            preset[key];

    });


    clearActivePreset();

    const selectedPreset = document.querySelector(
        `[data-preset="${name}"]`
    );

    selectedPreset.classList.add("active");
    selectedPreset.setAttribute("aria-pressed", "true");


    if (clearGoals) {
        plannerElements.currentWeight.value = "";
        plannerElements.targetWeight.value = "";
        plannerElements.currentWeight.max = "1200";
        plannerElements.targetWeight.max = "1200";
        plannerElements.weightUnit.value = "lb";
        planner.weightUnit = "lb";
    }

    updateWeightUnitAccessibility();


    planner.calorieTarget =
        macroCalories();

    updateCalorieTargetDisplay();

    setCalorieStatus(
        clearGoals
            ? "Planner reset. Move the calorie target or reset the mix to the proposed starting balance."
            : "Preset fuel mix loaded. Locks were cleared so the full preset can be shown."
    );


    calculate();
}


/*
    Slider listeners
*/

macroKeys.forEach(key => {
    controls[key].addEventListener(
        "input",
        () => {
            cancelGoalPlanTimer();
            clearActivePreset();

            const requestedTarget =
                planner.calorieTarget;

            const result =
                redistributeMacros(requestedTarget, key);

            if (result.constrained) {
                setCalorieStatus(
                    `${macroLabels[key]} is held at ${controls[key].value} g. Locks or slider limits set the closest available budget at ${result.actualCalories.toLocaleString()} kcal.`,
                    true
                );
            } else {
                setCalorieStatus(
                    `${macroLabels[key]} is held at ${controls[key].value} g while the other unlocked macros share the remaining budget.`
                );
            }

            calculate();
        }
    );
});


["activity", "time"]
    .forEach(key => {
        controls[key].addEventListener(
            "input",
            () => {
                cancelGoalPlanTimer();
                clearActivePreset();
                calculate();
            }
        );
    });


plannerElements.calorieTarget.addEventListener(
    "input",
    () => {
        cancelGoalPlanTimer();
        clearActivePreset();

        const requestedTarget =
            Number(plannerElements.calorieTarget.value);

        const result =
            redistributeMacros(requestedTarget);

        if (result.constrained) {
            setCalorieStatus(
                `Locks or macro limits set the closest available budget at ${result.actualCalories.toLocaleString()} kcal.`,
                true
            );
        } else {
            setCalorieStatus(
                `Unlocked macros were redistributed within an approximately ${result.actualCalories.toLocaleString()} kcal budget.`
            );
        }

        calculate();
    }
);


plannerElements.resetMixButton.addEventListener(
    "click",
    () => {
        cancelGoalPlanTimer();
        clearActivePreset();

        const result =
            redistributeMacros(planner.calorieTarget);

        if (result.constrained) {
            setCalorieStatus(
                `The mix was reset as closely as the current locks and limits allow: ${result.actualCalories.toLocaleString()} kcal.`,
                true
            );
        } else {
            setCalorieStatus(
                "Unlocked macros returned to the proposed starting balance while keeping the current calorie target."
            );
        }

        calculate();
    }
);


document
    .querySelectorAll(".macro-lock")
    .forEach(button => {
        button.addEventListener(
            "click",
            () => {
                cancelGoalPlanTimer();
                const key =
                    button.dataset.macro;

                planner.locks[key] =
                    !planner.locks[key];

                clearActivePreset();
                updateMacroLockUI();

                const unlockedKeys = macroKeys.filter(
                    macro => !planner.locks[macro]
                );

                if (unlockedKeys.length === 0) {
                    setCalorieStatus(
                        "All macros are locked. Unlock at least one macro to change the calorie target.",
                        true
                    );
                } else if (unlockedKeys.length === 1) {
                    setCalorieStatus(
                        `${macroLabels[unlockedKeys[0]]} now balances the calorie budget. Unlock another macro to adjust it directly.`
                    );
                } else {
                    setCalorieStatus(
                        planner.locks[key]
                            ? `${macroLabels[key]} is locked at ${controls[key].value} g.`
                            : `${macroLabels[key]} is unlocked and can share the calorie budget.`
                    );
                }

                calculate();
            }
        );
    });


[
    plannerElements.currentWeight,
    plannerElements.targetWeight
].forEach(input => {
    input.addEventListener("input", () => {
        calculate();

        cancelGoalPlanTimer();

        goalPlanTimer = window.setTimeout(
            proposeFuelForGoal,
            400
        );
    });

    input.addEventListener("change", () => {
        cancelGoalPlanTimer();
        proposeFuelForGoal();
    });
});


plannerElements.weightUnit.addEventListener(
    "change",
    () => {
        cancelGoalPlanTimer();

        const nextUnit =
            plannerElements.weightUnit.value;

        const conversion =
            nextUnit === "kg"
                ? 0.453592
                : 2.20462;

        [
            plannerElements.currentWeight,
            plannerElements.targetWeight
        ].forEach(input => {
            const value =
                Number(input.value);

            if (Number.isFinite(value) && value > 0) {
                input.value =
                    (value * conversion).toFixed(1);
            }

            input.max =
                nextUnit === "kg" ? "550" : "1200";
        });

        planner.weightUnit =
            nextUnit;

        updateWeightUnitAccessibility();

        calculate();
    }
);


/*
    Preset listeners
*/

document
    .querySelectorAll(".preset")
    .forEach(button => {

        button.addEventListener(
            "click",
            () => {

                applyPreset(
                    button.dataset.preset
                );

            }
        );

    });


document
    .getElementById("resetButton")
    .addEventListener("click", () => {
        applyPreset("matched", { clearGoals: true });
    });


/*
    Educational info popover
*/

const infoPopover =
    document.getElementById("infoPopover");

const infoPopoverTitle =
    document.getElementById("infoPopoverTitle");

const infoPopoverText =
    document.getElementById("infoPopoverText");

const infoPopoverLink =
    document.getElementById("infoPopoverLink");

let activeInfoButton = null;
let infoPopoverPinned = false;
let infoPopoverHideTimer = null;


function clearInfoPopoverHideTimer() {

    window.clearTimeout(infoPopoverHideTimer);
    infoPopoverHideTimer = null;
}


function scheduleInfoPopoverHide() {

    clearInfoPopoverHideTimer();

    infoPopoverHideTimer = window.setTimeout(() => {

        const triggerIsHovered =
            activeInfoButton?.matches(":hover");

        const popoverIsHovered =
            infoPopover.matches(":hover");

        if (
            !infoPopoverPinned &&
            !triggerIsHovered &&
            !popoverIsHovered &&
            document.activeElement !== activeInfoButton
        ) {
            hideInfoPopover();
        }

    }, 260);
}


function positionInfoPopover(trigger) {

    const triggerRect =
        trigger.getBoundingClientRect();

    const popoverRect =
        infoPopover.getBoundingClientRect();

    const gap = 10;
    const edge = 12;

    let left =
        triggerRect.right + gap;

    if (left + popoverRect.width > window.innerWidth - edge) {
        left = triggerRect.left - popoverRect.width - gap;
    }

    left = Math.max(
        edge,
        Math.min(left, window.innerWidth - popoverRect.width - edge)
    );

    let top =
        triggerRect.top +
        triggerRect.height / 2 -
        popoverRect.height / 2;

    top = Math.max(
        edge,
        Math.min(top, window.innerHeight - popoverRect.height - edge)
    );

    infoPopover.style.left = `${left}px`;
    infoPopover.style.top = `${top}px`;
}


function showInfoPopover(trigger, pinned = false, focusLink = false) {

    clearInfoPopoverHideTimer();

    if (activeInfoButton && activeInfoButton !== trigger) {
        activeInfoButton.setAttribute("aria-expanded", "false");
        activeInfoButton.removeAttribute("aria-describedby");
    }

    activeInfoButton = trigger;
    infoPopoverPinned = pinned;

    infoPopoverTitle.textContent =
        trigger.dataset.tooltipTitle;

    infoPopoverText.textContent =
        trigger.dataset.tooltip;

    const learnTarget =
        trigger.dataset.learnTarget;

    infoPopoverLink.hidden = !learnTarget;
    infoPopoverLink.href = learnTarget
        ? `learn.html?from=explorer#${learnTarget}`
        : "learn.html?from=explorer";
    infoPopoverLink.tabIndex =
        pinned && learnTarget ? 0 : -1;

    trigger.setAttribute("aria-expanded", "true");
    trigger.setAttribute("aria-describedby", "infoPopover");

    infoPopover.setAttribute(
        "role",
        pinned ? "dialog" : "tooltip"
    );

    if (pinned) {
        infoPopover.setAttribute(
            "aria-labelledby",
            "infoPopoverTitle"
        );
        infoPopover.setAttribute(
            "aria-describedby",
            "infoPopoverText"
        );
    } else {
        infoPopover.removeAttribute("aria-labelledby");
        infoPopover.removeAttribute("aria-describedby");
    }

    infoPopover.setAttribute("aria-hidden", "false");
    infoPopover.classList.toggle("pinned", pinned);
    infoPopover.classList.add("visible");

    positionInfoPopover(trigger);

    if (focusLink && learnTarget) {
        window.requestAnimationFrame(() => {
            infoPopoverLink.focus();
        });
    }
}


function hideInfoPopover({ restoreFocus = false } = {}) {

    clearInfoPopoverHideTimer();

    const triggerToRestore = activeInfoButton;

    if (activeInfoButton) {
        activeInfoButton.setAttribute("aria-expanded", "false");
        activeInfoButton.removeAttribute("aria-describedby");
    }

    activeInfoButton = null;
    infoPopoverPinned = false;
    infoPopover.setAttribute("aria-hidden", "true");
    infoPopover.setAttribute("role", "tooltip");
    infoPopover.removeAttribute("aria-labelledby");
    infoPopover.removeAttribute("aria-describedby");
    infoPopover.classList.remove("visible", "pinned");
    infoPopoverLink.tabIndex = -1;

    if (
        restoreFocus &&
        triggerToRestore &&
        infoPopover.contains(document.activeElement)
    ) {
        triggerToRestore.focus();
    }
}


document
    .querySelectorAll(".info-button")
    .forEach(button => {

        button.setAttribute("aria-expanded", "false");

        button.addEventListener("pointerenter", () => {
            clearInfoPopoverHideTimer();

            if (!infoPopoverPinned) {
                showInfoPopover(button);
            }
        });

        button.addEventListener("pointerleave", () => {
            if (
                !infoPopoverPinned &&
                document.activeElement !== button
            ) {
                scheduleInfoPopoverHide();
            }
        });

        button.addEventListener("focus", () => {
            if (!infoPopoverPinned) {
                showInfoPopover(button);
            }
        });

        button.addEventListener("blur", () => {
            if (!infoPopoverPinned) {
                hideInfoPopover();
            }
        });

        button.addEventListener("click", event => {
            if (
                infoPopoverPinned &&
                activeInfoButton === button
            ) {
                hideInfoPopover();
                return;
            }

            showInfoPopover(
                button,
                true,
                event.detail === 0
            );
        });
    });


infoPopover.addEventListener("pointerenter", () => {
    clearInfoPopoverHideTimer();
});


infoPopover.addEventListener("pointerleave", () => {
    if (!infoPopoverPinned) {
        scheduleInfoPopoverHide();
    }
});


document.addEventListener("pointerdown", event => {
    if (
        activeInfoButton &&
        !event.target.closest(".info-button") &&
        !event.target.closest("#infoPopover")
    ) {
        hideInfoPopover();
    }
});


document.addEventListener("keydown", event => {
    if (event.key === "Escape") {
        hideInfoPopover({ restoreFocus: true });
    }
});


window.addEventListener("resize", () => {
    if (activeInfoButton) {
        positionInfoPopover(activeInfoButton);
    }
});


window.addEventListener("scroll", () => {
    if (activeInfoButton) {
        positionInfoPopover(activeInfoButton);
    }
}, { passive: true });


/*
    Flow motion control and reduced-motion support
*/

const routingNetwork =
    document.querySelector(".routing-network");

const bodyStage =
    document.querySelector(".body-stage");

const routingStage =
    document.querySelector(".routing-stage");

const bodyAnatomy =
    document.querySelector(".body-anatomy");


/*
    Route geometry follows the rendered interface instead of assuming one
    desktop-sized canvas. This keeps every lane attached to its card and its
    related anatomical region when the explorer changes size or orientation.
*/

const ROUTE_VIEWBOX_WIDTH = 1000;
const ROUTE_VIEWBOX_HEIGHT = 600;

/*
    These are landmarks in the anatomy artwork itself, not the larger CSS glow
    regions layered above it. Keeping them in image-relative coordinates makes
    the routes land on the same tissues in Safari, regardless of orientation.
*/
const BODY_ROUTE_POINTS = Object.freeze({
    brain: { x: 0.50, y: 0.075 },
    liver: { x: 0.445, y: 0.325 },
    repair: { x: 0.585, y: 0.245 },
    muscle: { x: 0.615, y: 0.59 },
    glycogen: { x: 0.56, y: 0.375 },
    storage: { x: 0.55, y: 0.47 },
    pool: { x: 0.50, y: 0.405 }
});

let routeGeometryFrame = 0;


function routeNumber(value) {
    return Number(value.toFixed(1));
}


function clientPointToRouteSpace(clientX, clientY) {

    const networkRect =
        routingNetwork.getBoundingClientRect();

    return {
        x: routeNumber(
            (clientX - networkRect.left) /
            networkRect.width * ROUTE_VIEWBOX_WIDTH
        ),
        y: routeNumber(
            (clientY - networkRect.top) /
            networkRect.height * ROUTE_VIEWBOX_HEIGHT
        )
    };
}


function routeElementAnchor(selector, edge = "center") {

    const element =
        document.querySelector(selector);

    if (!element) return null;

    const rect =
        element.getBoundingClientRect();

    const clientX =
        edge === "left"
            ? rect.left
            : edge === "right"
                ? rect.right
                : rect.left + rect.width / 2;

    return clientPointToRouteSpace(
        clientX,
        rect.top + rect.height / 2
    );
}


function bodyRoutePoint(name) {

    const point =
        BODY_ROUTE_POINTS[name];

    if (!point || !bodyAnatomy) return null;

    const rect =
        bodyAnatomy.getBoundingClientRect();

    return clientPointToRouteSpace(
        rect.left + rect.width * point.x,
        rect.top + rect.height * point.y
    );
}


function horizontalRoute(from, to, firstPull = 0.42, secondPull = 0.30) {

    const distance =
        to.x - from.x;

    return [
        `M ${from.x} ${from.y}`,
        `C ${routeNumber(from.x + distance * firstPull)} ${from.y},`,
        `${routeNumber(to.x - distance * secondPull)} ${to.y},`,
        `${to.x} ${to.y}`
    ].join(" ");
}


function directRoute(from, to) {

    const middleX =
        routeNumber((from.x + to.x) / 2);

    return [
        `M ${from.x} ${from.y}`,
        `C ${middleX} ${from.y},`,
        `${middleX} ${to.y},`,
        `${to.x} ${to.y}`
    ].join(" ");
}


function setRoutePath(id, pathData) {

    const path =
        document.getElementById(id);

    if (path) {
        path.setAttribute("d", pathData);
    }
}


function setRouteTerminal(routeName, point, terminalClass) {

    const terminal =
        document.querySelector(
            `[data-route="${routeName}"] .${terminalClass}`
        );

    if (!terminal) return;

    terminal.setAttribute("cx", point.x);
    terminal.setAttribute("cy", point.y);
}


function setRouteNode(node, point) {

    if (!node || !point) return;

    node.setAttribute("cx", point.x);
    node.setAttribute("cy", point.y);
}


function updateRouteGeometry() {

    const networkRect =
        routingNetwork.getBoundingClientRect();

    if (!networkRect.width || !networkRect.height) return;

    const anchors = {
        proteinCard: routeElementAnchor(".route-protein", "right"),
        carbsCard: routeElementAnchor(".route-carbs", "right"),
        fatCard: routeElementAnchor(".route-fat", "right"),
        brainCard: routeElementAnchor(".destination-brain", "left"),
        liverCard: routeElementAnchor(".destination-liver", "left"),
        muscleCard: routeElementAnchor(".destination-muscle", "left"),
        repairCard: routeElementAnchor(".destination-repair", "left"),
        glycogenCard: routeElementAnchor(".destination-glycogen", "left"),
        storageCard: routeElementAnchor(".destination-storage", "left"),
        brain: bodyRoutePoint("brain"),
        liver: bodyRoutePoint("liver"),
        muscle: bodyRoutePoint("muscle"),
        repair: bodyRoutePoint("repair"),
        glycogen: bodyRoutePoint("glycogen"),
        storage: bodyRoutePoint("storage"),
        pool: bodyRoutePoint("pool")
    };

    if (Object.values(anchors).some(anchor => !anchor)) return;

    setRoutePath(
        "routeProteinIn",
        horizontalRoute(anchors.proteinCard, anchors.pool)
    );
    setRoutePath(
        "routeCarbsIn",
        horizontalRoute(anchors.carbsCard, anchors.pool)
    );
    setRoutePath(
        "routeFatIn",
        horizontalRoute(anchors.fatCard, anchors.liver, 0.48, 0.26)
    );

    setRoutePath(
        "routeBrainOut",
        horizontalRoute(anchors.brain, anchors.brainCard, 0.38, 0.34)
    );
    setRoutePath(
        "routeLiverOut",
        horizontalRoute(anchors.liver, anchors.liverCard, 0.36, 0.30)
    );
    setRoutePath(
        "routeMuscleOut",
        horizontalRoute(anchors.muscle, anchors.muscleCard, 0.32, 0.28)
    );
    setRoutePath(
        "routeRepairOut",
        horizontalRoute(anchors.repair, anchors.repairCard, 0.34, 0.28)
    );
    setRoutePath(
        "routeGlycogenOut",
        horizontalRoute(anchors.glycogen, anchors.glycogenCard, 0.36, 0.28)
    );
    setRoutePath(
        "routeStorageOut",
        horizontalRoute(anchors.storage, anchors.storageCard, 0.38, 0.26)
    );

    const releaseToStorage =
        horizontalRoute(anchors.storageCard, anchors.storage, 0.34, 0.28);

    const storageToPool =
        directRoute(anchors.storage, anchors.pool)
            .replace(/^M [^C]+/, "");

    setRoutePath(
        "routeStoredRelease",
        `${releaseToStorage} ${storageToPool}`
    );

    const sourceTerminals = {
        protein: anchors.proteinCard,
        carbs: anchors.carbsCard,
        fat: anchors.fatCard
    };

    Object.entries(sourceTerminals).forEach(([name, point]) => {
        setRouteTerminal(name, point, "route-terminal-source");
    });

    const targetTerminals = {
        fuel: anchors.brainCard,
        fatUse: anchors.liverCard,
        muscle: anchors.muscleCard,
        repair: anchors.repairCard,
        glycogen: anchors.glycogenCard,
        storage: anchors.storageCard
    };

    Object.entries(targetTerminals).forEach(([name, point]) => {
        setRouteTerminal(name, point, "route-terminal-target");
    });

    const spine =
        document.querySelector(".circulation-spine");

    if (spine) {
        const brainToPool =
            directRoute(anchors.brain, anchors.pool);
        const poolToMuscle =
            directRoute(anchors.pool, anchors.muscle)
                .replace(/^M [^C]+/, "");

        spine.setAttribute("d", `${brainToPool} ${poolToMuscle}`);
    }

    const crosslinks =
        [...document.querySelectorAll(".circulation-crosslink")];

    [
        [anchors.pool, anchors.liver],
        [anchors.pool, anchors.repair],
        [anchors.pool, anchors.storage],
        [anchors.storage, anchors.glycogen]
    ].forEach(([from, to], index) => {
        if (crosslinks[index]) {
            crosslinks[index].setAttribute("d", directRoute(from, to));
        }
    });

    [
        document.querySelector(".circulation-core-ring"),
        document.querySelector(".circulation-core")
    ].forEach(core => setRouteNode(core, anchors.pool));

    const circulationNodes =
        [...document.querySelectorAll(".circulation-node")];

    [
        anchors.brain,
        anchors.liver,
        anchors.repair,
        anchors.storage,
        anchors.glycogen,
        anchors.muscle
    ].forEach((point, index) => {
        setRouteNode(circulationNodes[index], point);
    });

    const shareRoutes = {
        protein: [
            [anchors.pool, anchors.repair]
        ],
        carbs: [
            [anchors.pool, anchors.brain],
            [anchors.pool, anchors.glycogen],
            [anchors.pool, anchors.muscle]
        ],
        fat: [
            [anchors.liver, anchors.pool],
            [anchors.liver, anchors.storage]
        ]
    };

    Object.entries(shareRoutes).forEach(([name, routes]) => {
        const paths = [
            ...document.querySelectorAll(
                `.channel-${name} .route-share`
            )
        ];

        routes.forEach(([from, to], index) => {
            if (paths[index]) {
                paths[index].setAttribute("d", directRoute(from, to));
            }
        });
    });

    const releaseLabel =
        document.querySelector(".release-label");

    if (releaseLabel) {
        releaseLabel.setAttribute(
            "x",
            routeNumber((anchors.storage.x + anchors.storageCard.x) / 2)
        );
        releaseLabel.setAttribute(
            "y",
            routeNumber(Math.max(anchors.storage.y, anchors.storageCard.y) + 24)
        );
        releaseLabel.setAttribute("text-anchor", "middle");
    }
}


function scheduleRouteGeometryUpdate() {

    window.cancelAnimationFrame(routeGeometryFrame);

    routeGeometryFrame =
        window.requestAnimationFrame(updateRouteGeometry);
}


window.addEventListener("resize", scheduleRouteGeometryUpdate);

if (window.ResizeObserver) {
    const routingResizeObserver =
        new ResizeObserver(scheduleRouteGeometryUpdate);

    routingResizeObserver.observe(routingStage);
}

document
    .querySelectorAll(".destination-card")
    .forEach(card => {
        card.addEventListener("transitionend", event => {
            if (event.propertyName === "transform") {
                scheduleRouteGeometryUpdate();
            }
        });
    });

if (bodyAnatomy && !bodyAnatomy.complete) {
    bodyAnatomy.addEventListener(
        "load",
        scheduleRouteGeometryUpdate,
        { once: true }
    );
}

const motionToggle =
    document.getElementById("motionToggle");

const motionToggleText =
    document.getElementById("motionToggleText");

const motionIcon =
    motionToggle.querySelector(".motion-icon");

let flowMotionPaused = false;
let motionUserOverride = false;


function setFlowMotionPaused(paused) {

    flowMotionPaused = paused;

    if (paused && routingNetwork.pauseAnimations) {
        routingNetwork.pauseAnimations();
    }

    if (!paused && routingNetwork.unpauseAnimations) {
        routingNetwork.unpauseAnimations();
    }

    bodyStage.classList.toggle("flow-paused", paused);
    motionToggle.setAttribute(
        "aria-label",
        paused
            ? "Play animated fuel flow"
            : "Pause animated fuel flow"
    );
    motionToggleText.textContent = paused ? "Play" : "Pause";
    motionIcon.textContent = paused ? "▶" : "∿";
}


motionToggle.addEventListener("click", () => {
    motionUserOverride = true;
    setFlowMotionPaused(!flowMotionPaused);
    persistExplorerSnapshot();
});


const reducedMotionPreference =
    window.matchMedia("(prefers-reduced-motion: reduce)");


const syncMotionPreference = event => {
    if (!motionUserOverride) {
        setFlowMotionPaused(event.matches);
    }
};


if (reducedMotionPreference.addEventListener) {
    reducedMotionPreference.addEventListener(
        "change",
        syncMotionPreference
    );
} else {
    reducedMotionPreference.addListener(
        syncMotionPreference
    );
}


const restoredExplorerSnapshot =
    restoreExplorerSnapshot();

if (restoredExplorerSnapshot?.motionUserOverride === true) {
    motionUserOverride = true;
    setFlowMotionPaused(
        restoredExplorerSnapshot.flowMotionPaused === true
    );
} else {
    setFlowMotionPaused(reducedMotionPreference.matches);
}


document
    .querySelectorAll('a[href^="learn.html"]')
    .forEach(link => {
        link.addEventListener("click", () => {
            persistExplorerSnapshot();
        });
    });


const welcomeDialog =
    document.getElementById("welcomeDialog");

const welcomeOpenButton =
    document.getElementById("welcomeOpenButton");

const welcomeCloseButton =
    document.getElementById("welcomeCloseButton");

const welcomeExploreButton =
    document.getElementById("welcomeExploreButton");

const welcomeLearnLink =
    document.getElementById("welcomeLearnLink");

const welcomeStorageKey =
    "bodyFuelExplorerWelcomeV1";


function hasSeenWelcome() {

    if (history.state?.[welcomeStorageKey] === true) {
        return true;
    }

    try {
        return localStorage.getItem(welcomeStorageKey) === "seen";
    } catch (error) {
        return false;
    }
}


function rememberWelcome() {

    try {
        localStorage.setItem(welcomeStorageKey, "seen");
    } catch (error) {
        // History state still prevents repeat openings during this navigation session.
    }

    try {
        const currentHistoryState =
            history.state && typeof history.state === "object"
                ? history.state
                : {};

        history.replaceState(
            {
                ...currentHistoryState,
                [welcomeStorageKey]: true
            },
            ""
        );
    } catch (error) {
        // The invitation can still be dismissed when browser storage is restricted.
    }
}


function openWelcomeDialog() {

    if (welcomeDialog.open) {
        return;
    }

    if (typeof welcomeDialog.showModal === "function") {
        welcomeDialog.showModal();
    } else {
        welcomeDialog.setAttribute("open", "");
    }
}


function closeWelcomeDialog(returnValue) {

    if (!welcomeDialog.open) {
        return;
    }

    if (typeof welcomeDialog.close === "function") {
        welcomeDialog.close(returnValue);
    } else {
        welcomeDialog.removeAttribute("open");
        rememberWelcome();
    }
}


welcomeOpenButton.addEventListener("click", openWelcomeDialog);

welcomeCloseButton.addEventListener("click", () => {
    closeWelcomeDialog("dismissed");
});

welcomeExploreButton.addEventListener("click", () => {
    closeWelcomeDialog("explore");

    window.setTimeout(() => {
        plannerElements.calorieTarget.focus();
    }, 0);
});

welcomeLearnLink.addEventListener("click", () => {
    rememberWelcome();
    persistExplorerSnapshot();
});

welcomeDialog.addEventListener("close", rememberWelcome);

welcomeDialog.addEventListener("click", event => {
    if (event.target === welcomeDialog) {
        closeWelcomeDialog("dismissed");
    }
});


updateWeightUnitAccessibility();
calculate();
scheduleRouteGeometryUpdate();

window.requestAnimationFrame(() => {
    if (!hasSeenWelcome()) {
        window.setTimeout(openWelcomeDialog, 180);
    }
});
