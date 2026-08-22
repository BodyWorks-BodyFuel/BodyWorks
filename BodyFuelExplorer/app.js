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
    calculateTrajectory,
    calculateRouteSignals,
    flowPresentation,
    getHorizonPeriod,
    getActivityProfile,
    classifyEnergyBalance,
    outputTone,
    presets
} = window.BodyFuelModel;

const {
    categories: foodCategories,
    catalog: foodCatalog,
    catalogById,
    createExampleDay,
    cloneLines,
    aggregateFoods,
    itemCount,
    formatEnergyEstimate,
    filteredCatalog
} = window.BodyFuelFoods;

const {
    createFuelInput,
    toModelInput
} = window.BodyFuelInput;

const {
    searchFoods: searchUsdaFoods
} = window.BodyFuelUsda;

const {
    buildNarration,
    suggestExperiment
} = window.BodyFuelNarration;

const coreExplanations = window.BodyFuelExplanations;

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
    calorieTarget: 2150,
    weightUnit: "lb",
    locks: {
        protein: false,
        carbs: false,
        fats: false
    }
};

const explorerHistoryKey = "bodyFuelExplorer";
const myFoodsStorageKey = "bodyFuelExplorerMyFoodsV1";
const emphasisDurationMs = 3000;
const fixedActivityContext = Object.freeze(getActivityProfile(1));

const foodExperience = {
    lines: [],
    filter: "breakfast",
    browserSource: "familiar",
    usdaResults: [],
    savedUsdaFoods: [],
    lastRemovedSavedFood: null,
    source: "foods",
    dayKind: "empty",
    viewMode: "core",
    lastChange: { type: "empty" },
    experimentUndo: null,
    experiment: null,
    currentState: null,
    announcementTimer: null,
    emphasisTimer: null
};

const foodElements = {
    filters: document.getElementById("foodFilters"),
    grid: document.getElementById("foodGrid"),
    browserStatus: document.getElementById("foodBrowserStatus"),
    tray: document.getElementById("foodTray"),
    trayEmpty: document.getElementById("trayEmpty"),
    daySummary: document.getElementById("daySummary"),
    exampleNote: document.getElementById("exampleNote"),
    loadExample: document.getElementById("loadExampleDay"),
    clearStart: document.getElementById("clearStartButton"),
    clearDay: document.getElementById("clearDayButton"),
    resetFamiliarFoods: document.getElementById("resetFamiliarFoodsButton"),
    estimatedEnergy: document.getElementById("estimatedFoodEnergy"),
    estimatedEnergyMeterFill: document.getElementById("estimatedEnergyMeterFill"),
    modelEnergyContext: document.getElementById("modelEnergyContext"),
    mobileSummary: document.getElementById("mobileDaySummary"),
    mobileCount: document.getElementById("mobileDayCount"),
    source: document.getElementById("technicalSource"),
    sourceTitle: document.getElementById("technicalSourceTitle"),
    sourceDetail: document.getElementById("technicalSourceDetail"),
    useFoodEstimates: document.getElementById("useFoodEstimatesButton"),
    narrationTitle: document.getElementById("narrationTitle"),
    narrationBody: document.getElementById("narrationBody"),
    narrationContext: document.getElementById("narrationContext"),
    narrationAnnouncement: document.getElementById("narrationAnnouncement"),
    experimentCard: document.getElementById("experimentCard"),
    experimentButton: document.getElementById("experimentButton"),
    workspace: document.getElementById("explorerMain"),
    buildViewButton: document.getElementById("buildViewButton"),
    seeViewButton: document.getElementById("seeViewButton"),
    teaserBody: document.getElementById("teaserBody"),
    teaserMessage: document.getElementById("teaserMessage"),
    dockBody: document.getElementById("dockBody"),
    liveBodyMessage: document.getElementById("liveBodyMessage"),
    seeFoodsSummary: document.getElementById("seeFoodsSummary"),
    seeActivitySummary: document.getElementById("seeActivitySummary"),
    seeHorizonSummary: document.getElementById("seeHorizonSummary")
};

Object.assign(foodElements, {
    sourceTabs: [...document.querySelectorAll("[data-food-source-tab]")],
    familiarPanel: document.getElementById("familiarFoodsPanel"),
    usdaPanel: document.getElementById("usdaFoodsPanel"),
    myPantryPanel: document.getElementById("myPantryPanel"),
    myPantryTabCount: document.getElementById("myPantryTabCount"),
    myFoodsPanel: document.getElementById("myFoodsPanel"),
    myFoodsTabCount: document.getElementById("myFoodsTabCount"),
    usdaForm: document.getElementById("usdaSearchForm"),
    usdaInput: document.getElementById("usdaSearchInput"),
    usdaClear: document.getElementById("usdaSearchClear"),
    usdaState: document.getElementById("usdaSearchState"),
    usdaResults: document.getElementById("usdaResults"),
    myPantryList: document.getElementById("myPantryList"),
    myPantryEmpty: document.getElementById("myPantryEmpty"),
    myFoodsList: document.getElementById("myFoodsList"),
    myFoodsEmpty: document.getElementById("myFoodsEmpty"),
    sendAllToPantry: document.getElementById("sendAllToPantryButton"),
    undoSavedFood: document.getElementById("undoSavedFoodButton")
});


function placeCoreExperienceInReadingOrder() {
    const workspace = foodElements.workspace;
    const controlsPanel = workspace?.querySelector(".controls-panel");
    const hero = workspace?.querySelector(".body-stage");

    if (!workspace || !controlsPanel || !hero) return;

    workspace.insertBefore(hero, controlsPanel);
}


function revealFocusedFoodRow(event) {
    const wrapper = event.target.closest(".food-tile-wrap");
    if (!wrapper || !foodElements.grid.contains(wrapper)) return;

    const gridRect = foodElements.grid.getBoundingClientRect();
    const tileRect = wrapper.getBoundingClientRect();
    const rowIsFullyVisible =
        tileRect.top >= gridRect.top && tileRect.bottom <= gridRect.bottom;

    if (rowIsFullyVisible) return;

    const rowTop = tileRect.top - gridRect.top + foodElements.grid.scrollTop;
    foodElements.grid.scrollTop = Math.max(0, rowTop);
}

const coreElements = {
    myDay: document.getElementById("coreMyDay"),
    dialog: document.getElementById("coreExplanationDialog"),
    dialogTitle: document.getElementById("coreExplanationTitle"),
    dialogBody: document.getElementById("coreExplanationBody"),
    dialogClose: document.getElementById("coreExplanationClose"),
    dialogDetails: document.getElementById("coreExplanationDetails"),
    dialogDetailsTitle: document.getElementById("coreExplanationDetailsTitle"),
    dialogDetailsList: document.getElementById("coreExplanationDetailsList"),
    timelineButtons: [...document.querySelectorAll("[data-timeline]")],
    activeExplanationTrigger: null,
    myDayTab: null
};


function createExplorerSnapshot() {

    const activePreset =
        document.querySelector(".preset.active")?.dataset.preset || null;

    return {
        version: 7,
        foodLines: cloneLines(foodExperience.lines),
        foodBrowserSource: foodExperience.browserSource,
        foodSource: foodExperience.source,
        foodDayKind: foodExperience.dayKind,
        foodFilter: foodExperience.filter,
        viewMode: foodExperience.viewMode,
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

    if (!snapshot || ![6, 7].includes(snapshot.version)) {
        return null;
    }

    if (Array.isArray(snapshot.foodLines)) {
        foodExperience.lines = snapshot.foodLines
            .filter(line =>
                (catalogById[line.foodId] || line.food?.estimate) &&
                Number(line.quantity) > 0
            )
            .map(line => ({
                foodId: line.foodId,
                quantity: Number(line.quantity),
                ...(line.food ? { food: line.food } : {}),
                ...(Array.isArray(line.exampleMeals)
                    ? { exampleMeals: [...line.exampleMeals] }
                    : {})
            }));
    }

    foodExperience.source = snapshot.foodSource === "manual"
        ? "manual"
        : "foods";
    foodExperience.browserSource = ["usda", "pantry", "saved"].includes(snapshot.foodBrowserSource)
        ? snapshot.foodBrowserSource
        : "familiar";
    foodExperience.dayKind = ["example", "custom", "empty"].includes(snapshot.foodDayKind)
        ? snapshot.foodDayKind
        : "custom";
    foodExperience.filter = foodCategories
        .filter(category => category.id !== "all")
        .map(category => category.id)
        .includes(snapshot.foodFilter)
        ? snapshot.foodFilter
        : "breakfast";
    foodExperience.viewMode = "core";

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


function labelLevel(value) {

    if (value < 25) return "Low";

    if (value < 50) return "Moderate";

    if (value < 75) return "High";

    return "Very High";
}


function timeLabel(value) {
    return getHorizonPeriod(value).label;
}


function updateCoreTimelineControl(time) {
    const timelineDescriptions = [
        "Today emphasizes immediate routing, essential fuel, working tissue, and glycogen.",
        "Days emphasizes recurring fuel supply and glycogen use and refill.",
        "Weeks emphasizes repair support, reserve use, and accumulating storage pressure.",
        "Months emphasizes sustained storage, release, and longer-term adaptation tendencies."
    ];
    const repeatedPatternNote =
        foodExperience.dayKind === "custom" && Number(time) > 0
            ? " These selections are treated as the complete repeated daily pattern."
            : "";

    const comparison = modelComparisonMessage(foodExperience.currentState, time);

    document.getElementById("horizonDescription").textContent =
        foodExperience.lines.length
            ? `${timelineDescriptions[Number(time)]} ${comparison.message}${repeatedPatternNote}`
            : "Add foods first; the timeline will then change the model’s repeated-pattern lens.";

    coreElements.timelineButtons.forEach(button => {
        const selected = Number(button.dataset.timeline) === Number(time);
        button.classList.toggle("is-active", selected);
        button.setAttribute("aria-pressed", String(selected));
    });

    document.querySelector(".body-stage").dataset.timeline = String(time);
    updateEstimatedFoodEnergy();
}


function updateEstimatedFoodEnergy() {
    const totals = foodTotals();
    const estimate = formatEnergyEstimate(totals.calories, controls.time.value);
    foodElements.estimatedEnergy.textContent = estimate.text;
    foodElements.estimatedEnergy.setAttribute(
        "aria-label",
        estimate.ariaLabel
    );
    const energyMeterPercent = Math.min(
        100,
        Math.max(0, (totals.calories / (fixedActivityContext.demand * 1.4)) * 100)
    );
    foodElements.estimatedEnergyMeterFill.style.width = `${energyMeterPercent}%`;
    foodElements.modelEnergyContext.textContent =
        `Model context: fixed baseline reference ≈ ${Math.round(fixedActivityContext.demand).toLocaleString()} kcal/day`;
}


function modelComparisonMessage(state, time = controls.time.value) {
    if (!state) {
        return {
            balanceState: "empty",
            title: "No foods selected",
            message: "Choose a food to see what it contributes to the living system."
        };
    }

    const balanceState = classifyEnergyBalance(state.balance);
    const repeated = Number(time) >= 2;

    if (balanceState === "deficit") {
        return {
            balanceState,
            title: repeated
                ? "Repeated supply stays below the model reference"
                : "Reserve contribution is more visible",
            message: repeated
                ? "If this same supply-to-reference relationship repeats across weeks, reserve-use, repair, and storage tendencies become easier to see."
                : "This selected day supplies less energy than the fixed baseline model reference, so reserve contribution becomes more visible."
        };
    }

    if (balanceState === "surplus") {
        return {
            balanceState,
            title: "Storage tendency is more prominent",
            message: "This selected day supplies more energy than the fixed baseline model reference, so storage tendency becomes more prominent."
        };
    }

    return {
        balanceState,
        title: "Priorities remain distributed",
        message: "Incoming food energy sits near the fixed baseline model reference, so the model’s priorities remain more distributed."
    };
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
            "Enter both weights to compare this scenario with a target direction.";

        return;
    }

    plannerElements.trajectoryCard.dataset.state =
        trajectory.state;

    plannerElements.trajectoryIcon.textContent =
        trajectory.icon;

    plannerElements.trajectoryLabel.textContent =
        trajectory.label;

    plannerElements.trajectoryDetail.textContent =
        `This scenario's fuel supply is ${trajectory.supplyPhrase} modeled demand ${getHorizonPeriod(time).phrase}.`;
}


function formatPortionQuantity(quantity) {
    if (Number.isInteger(quantity)) return String(quantity);
    if (quantity === 0.5) return "½";
    return `${Math.floor(quantity)}½`;
}


function setExperienceView(view, { persist = true } = {}) {
    if (document.body.classList.contains("core-mode")) {
        foodExperience.viewMode = "core";
        foodElements.workspace.dataset.view = "core";
        if (persist) persistExplorerSnapshot();
        return;
    }

    const nextView = view === "see" ? "see" : "build";
    foodExperience.viewMode = nextView;
    foodElements.workspace.dataset.view = nextView;
    foodElements.buildViewButton.classList.toggle("active", nextView === "build");
    foodElements.seeViewButton.classList.toggle("active", nextView === "see");
    foodElements.buildViewButton.setAttribute("aria-pressed", String(nextView === "build"));
    foodElements.seeViewButton.setAttribute("aria-pressed", String(nextView === "see"));

    if (nextView === "see") {
        window.requestAnimationFrame(scheduleRouteGeometryUpdate);
    }

    if (persist) persistExplorerSnapshot();
}


function liveChangeMessage() {
    const item = foodItem(foodExperience.lastChange?.foodId);
    const activity = getActivityProfile(controls.activity.value);
    const horizon = getHorizonPeriod(controls.time.value);
    const type = foodExperience.lastChange?.type;

    if (!foodExperience.lines.length && foodExperience.source === "foods") {
        return {
            emphasis: "empty",
            ...modelComparisonMessage(null)
        };
    }

    const comparison = modelComparisonMessage(
        foodExperience.currentState,
        controls.time.value
    );

    if (["food-add", "food-increase", "food-decrease", "food-remove"].includes(type) && item) {
        return {
            emphasis: "food",
            ...comparison
        };
    }

    if (type === "activity") {
        return {
            emphasis: "movement",
            ...comparison
        };
    }

    if (type === "horizon") {
        return {
            emphasis: "horizon",
            ...comparison
        };
    }

    if (["technical", "technical-preset"].includes(type)) {
        return {
            emphasis: "whole",
            ...comparison
        };
    }

    return {
        emphasis: "whole",
        ...comparison
    };
}


function updateLiveBody() {
    const update = liveChangeMessage();
    const bodies = [foodElements.teaserBody, foodElements.dockBody];
    const fullStage = document.querySelector(".body-stage");
    const changedItem = foodItem(foodExperience.lastChange?.foodId);
    if (changedItem) {
        const weightedInputs = {
            protein: changedItem.estimate.protein * 4,
            carbs: changedItem.estimate.carbs * 4,
            fats: changedItem.estimate.fats * 9
        };
        fullStage.dataset.inputEmphasis = Object.entries(weightedInputs)
            .sort((left, right) => right[1] - left[1])[0][0];
    }

    bodies.forEach(body => {
        body.dataset.emphasis = update.emphasis;
        body.classList.remove("is-emphasized");
        void body.offsetWidth;
        body.classList.add("is-emphasized");
    });

    foodElements.teaserMessage.textContent = update.message;
    foodElements.liveBodyMessage.textContent = update.message;
    document.getElementById("stateDescription").textContent = update.message;
    document.getElementById("stateTitle").textContent = update.title;
    fullStage.dataset.emphasis = update.emphasis;
    fullStage.classList.remove("is-emphasized");
    void fullStage.offsetWidth;
    fullStage.classList.add("is-emphasized");

    window.clearTimeout(foodExperience.emphasisTimer);
    foodExperience.emphasisTimer = window.setTimeout(() => {
        bodies.forEach(body => body.classList.remove("is-emphasized"));
        fullStage.classList.remove("is-emphasized");
    }, emphasisDurationMs);
}


function setFoodSource(source) {
    foodExperience.source = source;
    const adjusted = source === "manual";

    foodElements.source.dataset.source = source;
    foodElements.sourceTitle.textContent = adjusted
        ? "Adjusted from foods"
        : "Using food estimates";
    foodElements.sourceDetail.textContent = adjusted
        ? "The routing map is using the direct laboratory values below."
        : "The values below come from Today’s foods.";
    foodElements.useFoodEstimates.hidden = !adjusted;
    document.getElementById("exploreModel").classList.toggle("is-adjusted", adjusted);
}


function enterAdjustedFromFoods(changeType = "technical") {
    setFoodSource("manual");
    foodExperience.lastChange = { type: changeType };
}


function foodItem(foodId) {
    return catalogById[foodId] ||
        foodExperience.lines.find(line => line.foodId === foodId)?.food ||
        foodExperience.savedUsdaFoods.find(entry => entry.food.id === foodId)?.food ||
        foodExperience.usdaResults.find(item => item.id === foodId) ||
        null;
}


function foodTotals() {
    return aggregateFoods(foodExperience.lines);
}


function selectedFoodSource() {
    const sources = new Set(foodExperience.lines.map(line =>
        line.food?.source === "usda" ? "usda" : "familiar"
    ));
    if (sources.size > 1) return "mixed";
    return sources.values().next().value || "familiar";
}


function currentFuelInput() {
    const fromFoods = foodExperience.source === "foods";
    const totals = fromFoods
        ? foodTotals()
        : {
            protein: Number(controls.protein.value),
            carbs: Number(controls.carbs.value),
            fats: Number(controls.fats.value),
            calories: calculateMacroCalories({
                protein: Number(controls.protein.value),
                carbs: Number(controls.carbs.value),
                fats: Number(controls.fats.value)
            })
        };

    return createFuelInput({
        source: fromFoods ? selectedFoodSource() : "manual",
        totals,
        activity: Number(controls.activity.value),
        timeline: Number(controls.time.value),
        items: foodExperience.lines.map(line => ({
            id: line.foodId,
            quantity: line.quantity,
            source: line.food?.source === "usda" ? "usda" : "familiar"
        }))
    });
}


function syncFoodTotalsToControls() {
    const totals = foodTotals();

    macroKeys.forEach(key => {
        controls[key].value = Math.round(totals[key]);
    });

    planner.calorieTarget = totals.calories;
    updateCalorieTargetDisplay();
    clearMacroLocks();

    setCalorieStatus(
        foodExperience.lines.length === 0
            ? "Add foods to create model inputs."
            : "Values are derived from Today’s foods. Moving a technical control will adjust them from the food estimates."
    );
}


function updateTechnicalTotals(totals) {
    document.getElementById("technicalCalories").textContent =
        Math.round(totals.calories).toLocaleString();
    document.getElementById("technicalProtein").textContent =
        Math.round(totals.protein).toLocaleString();
    document.getElementById("technicalCarbs").textContent =
        Math.round(totals.carbs).toLocaleString();
    document.getElementById("technicalFats").textContent =
        Math.round(totals.fats).toLocaleString();
}


function renderFoodBrowser() {
    foodElements.filters.replaceChildren();

    const workspaceTabs = foodCategories.filter(category => category.id !== "all");

    workspaceTabs.forEach(category => {
        const button = document.createElement("button");
        button.type = "button";
        button.className = "food-filter";
        button.dataset.category = category.id;
        button.id = `foodTab-${category.id}`;
        button.setAttribute("role", "tab");
        button.setAttribute("aria-controls", "foodGrid");
        button.textContent = category.label;
        button.setAttribute("aria-pressed", String(foodExperience.filter === category.id));
        button.setAttribute("aria-selected", String(foodExperience.filter === category.id));
        button.tabIndex = foodExperience.filter === category.id ? 0 : -1;
        button.addEventListener("click", () => {
            foodExperience.filter = category.id;
            renderFoodBrowser();
            foodElements.grid.scrollTop = 0;
            foodElements.browserStatus.textContent =
                `${category.label} foods shown.`;
            persistExplorerSnapshot();
        });
        foodElements.filters.append(button);
    });

    foodElements.grid.replaceChildren();

    foodElements.grid.hidden = false;
    coreElements.myDay.hidden = true;
    foodElements.grid.setAttribute("role", "tabpanel");
    foodElements.grid.setAttribute("aria-labelledby", `foodTab-${foodExperience.filter}`);

    filteredCatalog(foodExperience.filter).forEach(item => {
        const selectedLine = foodExperience.lines.find(line => line.foodId === item.id);
        const selectedQuantity = selectedLine?.quantity || 0;
        const wrapper = document.createElement("article");
        wrapper.className = "food-tile-wrap";
        wrapper.classList.toggle("is-selected", selectedQuantity > 0);
        wrapper.dataset.foodId = item.id;
        wrapper.setAttribute("aria-label", `${item.name}, representative portion ${item.portion}`);

        const tile = document.createElement("div");
        tile.className = "food-tile";
        tile.dataset.foodId = item.id;
        tile.dataset.artGroup = item.groups[0];
        tile.dataset.selected = String(selectedQuantity > 0);

        const art = document.createElement("span");
        art.className = "food-art";
        art.textContent = item.art;
        art.setAttribute("aria-hidden", "true");

        const copy = document.createElement("span");
        copy.className = "food-tile-copy";
        const name = document.createElement("strong");
        name.textContent = item.name;
        const portion = document.createElement("small");
        portion.textContent = item.portion;
        copy.append(name, portion);

        const stepper = document.createElement("div");
        stepper.className = "catalog-portion-stepper";
        stepper.setAttribute("role", "group");
        stepper.setAttribute("aria-label", `${item.name} portion quantity`);

        const decrease = document.createElement("button");
        decrease.type = "button";
        decrease.className = "catalog-portion-decrease";
        decrease.textContent = "−";
        decrease.disabled = selectedQuantity <= 0;
        decrease.setAttribute("aria-label", `Remove one portion of ${item.name}`);
        decrease.addEventListener("click", () => adjustFoodFromTile(item.id, -1));

        const quantity = document.createElement("output");
        quantity.className = "catalog-portion-count";
        quantity.textContent = formatPortionQuantity(selectedQuantity);
        quantity.setAttribute(
            "aria-label",
            `${item.name} current quantity ${formatPortionQuantity(selectedQuantity)}`
        );

        const increase = document.createElement("button");
        increase.type = "button";
        increase.className = "catalog-portion-increase";
        increase.textContent = "+";
        increase.setAttribute("aria-label", `Add one portion of ${item.name}`);
        increase.addEventListener("click", () => adjustFoodFromTile(item.id, 1));

        stepper.append(decrease, quantity, increase);
        tile.append(art, copy, stepper);

        const help = document.createElement("button");
        help.type = "button";
        help.className = "food-tile-help";
        help.id = `foodHelp-${item.id}`;
        help.textContent = "i";
        help.setAttribute("aria-label", `About the representative portion for ${item.name}`);
        help.dataset.coreExplanation = "food-portions";

        wrapper.append(tile, help);
        foodElements.grid.append(wrapper);
    });
}


function setFoodBrowserSource(source, { focus = false, persist = true } = {}) {
    foodExperience.browserSource = ["usda", "pantry", "saved"].includes(source) ? source : "familiar";
    const showingUsda = foodExperience.browserSource === "usda";
    const showingPantry = foodExperience.browserSource === "pantry";
    const showingSaved = foodExperience.browserSource === "saved";

    foodElements.familiarPanel.hidden = showingUsda || showingPantry || showingSaved;
    foodElements.usdaPanel.hidden = !showingUsda;
    foodElements.myPantryPanel.hidden = !showingPantry;
    foodElements.myFoodsPanel.hidden = !showingSaved;
    foodElements.sourceTabs.forEach(button => {
        const selected = button.dataset.foodSourceTab === foodExperience.browserSource;
        button.classList.toggle("is-active", selected);
        button.setAttribute("aria-selected", String(selected));
        button.tabIndex = selected ? 0 : -1;
    });

    if (focus) {
        const target = showingUsda
            ? foodElements.usdaInput
            : showingPantry
                ? foodElements.myPantryList.querySelector("button") || foodElements.sourceTabs.find(button => button.dataset.foodSourceTab === "pantry")
            : showingSaved
                ? foodElements.myFoodsList.querySelector("button") || foodElements.sourceTabs.find(button => button.dataset.foodSourceTab === "saved")
                : foodElements.filters.querySelector("button");
        target?.focus();
    }
    if (persist) persistExplorerSnapshot();
}


function savedUsdaEntry(foodId) {
    return foodExperience.savedUsdaFoods.find(entry => entry.food.id === foodId) || null;
}


function safeSavedUsdaEntry(entry) {
    const food = entry?.food;
    const estimate = food?.estimate;
    if (
        !food || food.source !== "usda" || !String(food.id || "").startsWith("usda-") ||
        !estimate || ![estimate.protein, estimate.carbs, estimate.fats].every(Number.isFinite)
    ) return null;

    const quantity = Math.max(0, Number(entry.quantity) || 0);
    const lastQuantity = Math.max(0.5, Number(entry.lastQuantity) || quantity || 1);
    return {
        food: {
            ...food,
            estimate: { ...estimate }
        },
        quantity,
        lastQuantity
    };
}


function persistMyFoods() {
    try {
        localStorage.setItem(myFoodsStorageKey, JSON.stringify({
            version: 1,
            foods: foodExperience.savedUsdaFoods
        }));
    } catch (error) {
        // The shelf remains usable for this page when storage is unavailable.
    }
}


function restoreMyFoods() {
    try {
        const payload = JSON.parse(localStorage.getItem(myFoodsStorageKey) || "null");
        if (payload?.version !== 1 || !Array.isArray(payload.foods)) return;

        foodExperience.savedUsdaFoods = payload.foods
            .map(safeSavedUsdaEntry)
            .filter(Boolean);

        foodExperience.savedUsdaFoods.forEach(entry => {
            if (entry.quantity <= 0) return;
            foodExperience.lines.push({
                foodId: entry.food.id,
                quantity: entry.quantity,
                food: {
                    ...entry.food,
                    estimate: { ...entry.food.estimate }
                }
            });
        });
    } catch (error) {
        foodExperience.savedUsdaFoods = [];
    }
}


function saveUsdaFood(item, quantity = 1) {
    let entry = savedUsdaEntry(item.id);
    if (!entry) {
        entry = safeSavedUsdaEntry({ food: item, quantity, lastQuantity: quantity });
        if (!entry) return null;
        foodExperience.savedUsdaFoods.unshift(entry);
    } else if (quantity > 0) {
        entry.quantity = quantity;
        entry.lastQuantity = quantity;
    }
    persistMyFoods();
    return entry;
}


function syncSavedUsdaQuantities() {
    foodExperience.savedUsdaFoods.forEach(entry => {
        const line = foodExperience.lines.find(item => item.foodId === entry.food.id);
        entry.quantity = Math.max(0, Number(line?.quantity) || 0);
        if (entry.quantity > 0) entry.lastQuantity = entry.quantity;
    });
    persistMyFoods();
}


function reconcileSavedUsdaLocations() {
    let changed = false;
    foodExperience.savedUsdaFoods.forEach(entry => {
        const line = foodExperience.lines.find(item => item.foodId === entry.food.id);
        const activeQuantity = Math.max(0, Number(line?.quantity) || 0);
        if (entry.quantity !== activeQuantity) {
            entry.quantity = activeQuantity;
            changed = true;
        }
        if (activeQuantity > 0 && entry.lastQuantity !== activeQuantity) {
            entry.lastQuantity = activeQuantity;
            changed = true;
        }
    });
    if (changed) persistMyFoods();
}


function renderMyFoods() {
    reconcileSavedUsdaLocations();
    const pantryEntries = foodExperience.savedUsdaFoods.filter(entry => entry.quantity <= 0);
    const activeEntries = foodExperience.savedUsdaFoods.filter(entry => entry.quantity > 0);
    foodElements.myPantryEmpty.hidden = pantryEntries.length > 0;
    foodElements.myFoodsEmpty.hidden = activeEntries.length > 0;
    foodElements.sendAllToPantry.disabled = activeEntries.length === 0;
    foodElements.myPantryTabCount.textContent = pantryEntries.length.toLocaleString();
    foodElements.myFoodsTabCount.textContent = activeEntries.length.toLocaleString();
    const pantryTab = foodElements.sourceTabs.find(button => button.dataset.foodSourceTab === "pantry");
    const activeTab = foodElements.sourceTabs.find(button => button.dataset.foodSourceTab === "saved");
    pantryTab?.setAttribute("aria-label", `My Pantry, ${pantryEntries.length} saved ${pantryEntries.length === 1 ? "food" : "foods"}`);
    activeTab?.setAttribute("aria-label", `My Foods, ${activeEntries.length} active ${activeEntries.length === 1 ? "food" : "foods"}`);
    renderSavedFoodGroups(foodElements.myPantryList, pantryEntries, "pantry");
    renderSavedFoodGroups(foodElements.myFoodsList, activeEntries, "active");
}


function renderSavedFoodGroups(container, savedEntries, location) {
    const groups = [
        ["protein", "Protein-forward"],
        ["carbs", "Carbohydrate-forward"],
        ["fats", "Fat-forward"],
        ["mixed", "Mixed"]
    ];
    container.replaceChildren(...groups.flatMap(([key, label]) => {
        const entries = savedEntries.filter(entry => savedFoodMacroGroup(entry.food) === key);
        if (!entries.length) return [];
        const section = document.createElement("section");
        section.className = "my-foods-group";
        section.dataset.macroGroup = key;
        const heading = document.createElement("h4");
        const headingLabel = document.createElement("span");
        headingLabel.textContent = label;
        const headingCount = document.createElement("small");
        headingCount.textContent = `${entries.length} ${entries.length === 1 ? "food" : "foods"}`;
        heading.append(headingLabel, headingCount);
        const grid = document.createElement("div");
        grid.className = "my-foods-group-grid";
        grid.append(...entries.map(entry => usdaResultCard(entry.food, { location })));
        section.append(heading, grid);
        return [section];
    }));
}


function savedFoodMacroGroup(item) {
    const energy = {
        protein: Math.max(0, Number(item.estimate?.protein) || 0) * 4,
        carbs: Math.max(0, Number(item.estimate?.carbs) || 0) * 4,
        fats: Math.max(0, Number(item.estimate?.fats) || 0) * 9
    };
    const ranked = Object.entries(energy).sort((a, b) => b[1] - a[1]);
    const total = ranked.reduce((sum, [, value]) => sum + value, 0);
    if (!total || ranked[0][1] / total < 0.45 || (ranked[0][1] - ranked[1][1]) / total < 0.1) return "mixed";
    return ranked[0][0];
}


function usdaResultCard(item, { location = "search" } = {}) {
    const savedEntry = savedUsdaEntry(item.id);
    const selectedLine = foodExperience.lines.find(line => line.foodId === item.id);
    const selectedQuantity = selectedLine?.quantity || 0;
    const card = document.createElement("article");
    card.className = "usda-result-card";
    card.classList.toggle("is-selected", selectedQuantity > 0);
    card.dataset.foodId = item.id;

    const copy = document.createElement("div");
    copy.className = "usda-result-copy";
    const name = document.createElement("strong");
    name.textContent = item.name;
    const portion = document.createElement("span");
    portion.textContent = displayFoodPortion(item);
    const source = document.createElement("small");
    source.textContent = `${item.dataType} · USDA FoodData Central`;
    copy.append(name, portion, source);

    const actions = document.createElement("div");
    actions.className = "usda-card-actions";

    if (location === "search") {
        const save = document.createElement("button");
        save.type = "button";
        save.className = "save-pantry-food";
        save.textContent = savedEntry ? "In My Pantry" : "Add to Pantry";
        save.disabled = Boolean(savedEntry);
        save.setAttribute("aria-label", savedEntry
            ? `${item.name} is already saved in My Pantry`
            : `Add ${item.name} to My Pantry`);
        save.addEventListener("click", () => addFoodToPantry(item));
        actions.append(save);
        card.append(copy, actions);
        return card;
    }

    const displayedQuantity = location === "pantry"
        ? savedEntry?.lastQuantity || 1
        : selectedQuantity;
    const stepper = document.createElement("div");
    stepper.className = "catalog-portion-stepper usda-portion-stepper";
    stepper.setAttribute("role", "group");
    stepper.setAttribute("aria-label", `${item.name} portion quantity`);
    const decrease = document.createElement("button");
    decrease.type = "button";
    decrease.className = "catalog-portion-decrease";
    decrease.textContent = "−";
    decrease.disabled = displayedQuantity <= 1;
    decrease.setAttribute("aria-label", `Decrease the remembered portion of ${item.name}`);
    decrease.addEventListener("click", () => location === "pantry"
        ? adjustPantryQuantity(item.id, -1)
        : changeFoodQuantity(item.id, -1));
    const quantity = document.createElement("output");
    quantity.className = "catalog-portion-count";
    quantity.textContent = formatPortionQuantity(displayedQuantity);
    quantity.setAttribute("aria-label", `${item.name} portion quantity ${displayedQuantity}`);
    const increase = document.createElement("button");
    increase.type = "button";
    increase.className = "catalog-portion-increase";
    increase.textContent = "+";
    increase.setAttribute("aria-label", `Add one portion of ${item.name}`);
    increase.addEventListener("click", () => location === "pantry"
        ? adjustPantryQuantity(item.id, 1)
        : addUsdaFood(item));
    stepper.append(decrease, quantity, increase);
    actions.append(stepper);

    card.classList.add("is-saved", `is-${location}`);

    const move = document.createElement("button");
    move.type = "button";
    move.className = "move-saved-food";
    move.textContent = location === "pantry" ? "Use" : "Pantry";
    move.setAttribute("aria-label", location === "pantry"
        ? `Use ${item.name} in My Foods`
        : `Return ${item.name} to My Pantry`);
    move.addEventListener("click", () => location === "pantry"
        ? activatePantryFood(item.id)
        : returnFoodToPantry(item.id));
    actions.append(move);

    if (location === "pantry") {
        const remove = document.createElement("button");
        remove.type = "button";
        remove.className = "remove-saved-food";
        remove.textContent = "Remove";
        remove.setAttribute("aria-label", `Remove ${item.name} from My Pantry`);
        remove.addEventListener("click", () => removeSavedUsdaFood(item.id));
        actions.append(remove);
    }

    card.append(copy, actions);
    return card;
}


function renderUsdaResults() {
    foodElements.usdaResults.replaceChildren(
        ...foodExperience.usdaResults.map(usdaResultCard)
    );
}


function addFoodToPantry(item) {
    if (savedUsdaEntry(item.id)) return;
    const entry = safeSavedUsdaEntry({ food: item, quantity: 0, lastQuantity: 1 });
    if (!entry) return;
    foodExperience.savedUsdaFoods.unshift(entry);
    persistMyFoods();
    renderUsdaResults();
    renderMyFoods();
    foodElements.browserStatus.textContent = `${item.name} added to My Pantry.`;
}


function adjustPantryQuantity(foodId, delta) {
    const entry = savedUsdaEntry(foodId);
    if (!entry || entry.quantity > 0) return;
    entry.lastQuantity = Math.max(1, Math.round(entry.lastQuantity + delta));
    persistMyFoods();
    renderMyFoods();
}


function activatePantryFood(foodId) {
    const entry = savedUsdaEntry(foodId);
    if (!entry || entry.quantity > 0) return;
    entry.quantity = Math.max(1, entry.lastQuantity || 1);
    foodExperience.lines.push({
        foodId,
        quantity: entry.quantity,
        food: { ...entry.food, estimate: { ...entry.food.estimate } }
    });
    foodExperience.dayKind = "custom";
    foodExperience.lastChange = { type: "food-add", foodId };
    setFoodSource("foods");
    syncSavedUsdaQuantities();
    refreshFoodExperience();
    foodElements.browserStatus.textContent = `${entry.food.name} moved into My Foods and is now shaping the hero.`;
}


function returnFoodToPantry(foodId) {
    const entry = savedUsdaEntry(foodId);
    const line = foodExperience.lines.find(item => item.foodId === foodId);
    if (!entry || !line) return;
    entry.lastQuantity = Math.max(1, line.quantity);
    foodExperience.lines = foodExperience.lines.filter(item => item.foodId !== foodId);
    entry.quantity = 0;
    foodExperience.dayKind = foodExperience.lines.length ? "custom" : "empty";
    foodExperience.lastChange = { type: "food-remove", foodId };
    setFoodSource("foods");
    persistMyFoods();
    refreshFoodExperience();
    foodElements.browserStatus.textContent = `${entry.food.name} returned to My Pantry. Its portion was remembered.`;
}


function sendAllFoodsToPantry() {
    const activeEntries = foodExperience.savedUsdaFoods.filter(entry => entry.quantity > 0);
    if (!activeEntries.length) return;

    const activeIds = new Set(activeEntries.map(entry => entry.food.id));
    activeEntries.forEach(entry => {
        const line = foodExperience.lines.find(item => item.foodId === entry.food.id);
        entry.lastQuantity = Math.max(1, Number(line?.quantity) || entry.quantity || entry.lastQuantity || 1);
        entry.quantity = 0;
    });
    foodExperience.lines = foodExperience.lines.filter(line => !activeIds.has(line.foodId));
    foodExperience.dayKind = foodExperience.lines.length ? "custom" : "empty";
    foodExperience.lastChange = { type: "food-remove" };
    setFoodSource("foods");
    persistMyFoods();
    refreshFoodExperience();
    foodElements.browserStatus.textContent = `${activeEntries.length} ${activeEntries.length === 1 ? "food was" : "foods were"} returned to My Pantry. Their portions were remembered.`;
}


function removeSavedUsdaFood(foodId) {
    const index = foodExperience.savedUsdaFoods.findIndex(entry => entry.food.id === foodId);
    if (index < 0) return;

    foodExperience.lastRemovedSavedFood = {
        entry: foodExperience.savedUsdaFoods[index],
        index
    };
    const name = foodExperience.savedUsdaFoods[index].food.name;
    foodExperience.savedUsdaFoods.splice(index, 1);
    foodExperience.lines = foodExperience.lines.filter(line => line.foodId !== foodId);
    foodElements.undoSavedFood.hidden = false;
    foodElements.browserStatus.textContent = `${name} removed from My Pantry. Undo is available.`;
    foodExperience.dayKind = foodExperience.lines.length ? "custom" : "empty";
    foodExperience.lastChange = { type: "food-remove", foodId };
    persistMyFoods();
    setFoodSource("foods");
    refreshFoodExperience();
}


function addUsdaFood(item) {
    const existing = foodExperience.lines.find(line => line.foodId === item.id);
    if (existing) {
        existing.quantity += 1;
    } else {
        foodExperience.lines.push({
            foodId: item.id,
            quantity: 1,
            food: {
                ...item,
                estimate: { ...item.estimate }
            }
        });
    }

    const quantity = foodExperience.lines.find(line => line.foodId === item.id)?.quantity || 1;
    saveUsdaFood(item, quantity);

    foodExperience.dayKind = "custom";
    foodExperience.lastChange = { type: "food-add", foodId: item.id };
    foodExperience.experimentUndo = null;
    foodElements.browserStatus.textContent =
        `${item.name} increased in My Foods.`;
    setFoodSource("foods");
    refreshFoodExperience();
}


let usdaSearchTimer = null;
let usdaSearchSequence = 0;

function resetUsdaSearch() {
    window.clearTimeout(usdaSearchTimer);
    usdaSearchSequence += 1;
    foodExperience.usdaResults = [];
    foodElements.usdaResults.replaceChildren();
    foodElements.usdaForm.classList.remove("is-searching");
}

async function runUsdaSearch(query) {
    const sequence = ++usdaSearchSequence;
    if (query.length < 2) {
        resetUsdaSearch();
        foodElements.usdaState.textContent = query
            ? "Enter one more letter to start searching."
            : "Start typing to find a food.";
        return;
    }

    foodElements.usdaForm.classList.add("is-searching");
    foodElements.usdaState.textContent = `Searching the local USDA foods for “${query}”…`;
    foodElements.usdaResults.replaceChildren();
    try {
        foodExperience.usdaResults = await searchUsdaFoods(query);
        if (sequence !== usdaSearchSequence) return;
        renderUsdaResults();
        foodElements.usdaState.textContent = foodExperience.usdaResults.length
            ? `${foodExperience.usdaResults.length} approximate matches. Choose the closest familiar description.`
            : `No useful matches found for “${query}”. Try a simpler food name.`;
    } catch (error) {
        if (sequence !== usdaSearchSequence) return;
        foodExperience.usdaResults = [];
        foodElements.usdaState.textContent = error.message ||
            "USDA food search could not be reached.";
    } finally {
        if (sequence === usdaSearchSequence) {
            foodElements.usdaForm.classList.remove("is-searching");
        }
    }
}

function submitUsdaSearch(event) {
    event.preventDefault();
    window.clearTimeout(usdaSearchTimer);
    runUsdaSearch(foodElements.usdaInput.value.trim());
}

function queueUsdaSearch() {
    const query = foodElements.usdaInput.value.trim();
    foodElements.usdaClear.hidden = !query;
    window.clearTimeout(usdaSearchTimer);

    if (query.length < 2) {
        runUsdaSearch(query);
        return;
    }

    foodElements.usdaState.textContent = "Keep typing, or pause to see matches.";
    usdaSearchTimer = window.setTimeout(() => runUsdaSearch(query), 250);
}

function clearUsdaSearch() {
    foodElements.usdaInput.value = "";
    foodElements.usdaClear.hidden = true;
    resetUsdaSearch();
    foodElements.usdaState.textContent = "Start typing to find a food.";
    foodElements.usdaInput.focus();
}


function syncFoodTileSelections() {
    foodElements.grid.querySelectorAll(".food-tile-wrap").forEach(wrapper => {
        const item = foodItem(wrapper.dataset.foodId);
        const line = foodExperience.lines.find(entry => entry.foodId === wrapper.dataset.foodId);
        const quantity = line?.quantity || 0;
        const selected = quantity > 0;
        const tile = wrapper.querySelector(".food-tile");
        const decrease = wrapper.querySelector(".catalog-portion-decrease");
        const count = wrapper.querySelector(".catalog-portion-count");

        wrapper.classList.toggle("is-selected", selected);
        tile.dataset.selected = String(selected);
        decrease.disabled = !selected;
        count.textContent = formatPortionQuantity(quantity);
        count.setAttribute(
            "aria-label",
            `${item.name} current quantity ${formatPortionQuantity(quantity)}`
        );
    });
}


function displayFoodPortion(item) {
    const portion = String(item?.portion || "").trim();
    const portionGrams = Number(item?.portionGrams) || 0;
    const isGenericUsdaReference = item?.source === "usda"
        && Math.abs(portionGrams - 100) < 0.1
        && /^100 g reference portion$/i.test(portion);
    return isGenericUsdaReference
        ? "≈ 3½ oz · USDA 100 g"
        : portion || "Representative portion";
}


function createTrayRow(line, displayQuantity = line.quantity) {
    const item = foodItem(line.foodId);
    const row = document.createElement("article");
    row.className = "tray-row";
    row.dataset.foodId = item.id;

    const copy = document.createElement("div");
    copy.className = "tray-row-copy";
    const name = document.createElement("strong");
    name.textContent = item.name;
    const portion = document.createElement("span");
    portion.textContent = item.portion;
    copy.append(name, portion);

    const stepper = document.createElement("div");
    stepper.className = "portion-stepper";
    const decrease = document.createElement("button");
    decrease.type = "button";
    decrease.textContent = "−";
    decrease.setAttribute("aria-label", `Decrease ${item.name}`);
    decrease.addEventListener("click", () => changeFoodQuantity(item.id, -item.portionStep));
    const quantity = document.createElement("output");
    quantity.textContent = `${formatPortionQuantity(displayQuantity)}×`;
    quantity.setAttribute(
        "aria-label",
        `${formatPortionQuantity(displayQuantity)} ${displayQuantity === 1 ? "portion" : "portions"}`
    );
    const increase = document.createElement("button");
    increase.type = "button";
    increase.textContent = "+";
    increase.setAttribute("aria-label", `Increase ${item.name}`);
    increase.addEventListener("click", () => changeFoodQuantity(item.id, item.portionStep));
    stepper.append(decrease, quantity, increase);

    const remove = document.createElement("button");
    remove.type = "button";
    remove.className = "tray-remove";
    remove.textContent = "×";
    remove.setAttribute("aria-label", `Remove ${item.name}`);
    remove.addEventListener("click", () => removeFood(item.id));

    row.append(copy, stepper, remove);
    return row;
}


function renderExampleMeals() {
    ["Breakfast", "Lunch", "Dinner"].forEach(mealName => {
        const mealLines = foodExperience.lines.filter(line =>
            line.exampleMeals?.includes(mealName)
        );
        const details = document.createElement("details");
        details.className = "meal-group";
        const summary = document.createElement("summary");
        summary.innerHTML = `<span>${mealName}</span><small>${mealLines.length} foods</small>`;
        const rows = document.createElement("div");
        rows.className = "meal-rows";
        mealLines.forEach(line => {
            const perMealQuantity = line.quantity / line.exampleMeals.length;
            rows.append(createTrayRow(line, perMealQuantity));
        });
        details.append(summary, rows);
        foodElements.tray.append(details);
    });
}


function renderCustomDay() {
    if (document.body.classList.contains("core-mode")) {
        foodExperience.lines.forEach(line => {
            foodElements.tray.append(createTrayRow(line));
        });
        return;
    }

    const chips = document.createElement("div");
    chips.className = "day-chips";
    chips.setAttribute("aria-label", "Foods in this partial day");
    foodExperience.lines.forEach(line => {
        const chip = document.createElement("span");
        chip.textContent = `${foodItem(line.foodId).name} · ${formatPortionQuantity(line.quantity)}×`;
        chips.append(chip);
    });

    const details = document.createElement("details");
    details.className = "custom-edit-panel";
    const summary = document.createElement("summary");
    summary.textContent = "Edit portions";
    const rows = document.createElement("div");
    rows.className = "custom-edit-rows";
    foodExperience.lines.forEach(line => rows.append(createTrayRow(line)));
    details.append(summary, rows);
    foodElements.tray.append(chips, details);
}


function renderTray() {
    const empty = foodExperience.lines.length === 0;
    const foodCount = foodExperience.lines.length;
    const noun = foodCount === 1 ? "food" : "foods";

    foodElements.tray.hidden = empty;
    foodElements.trayEmpty.hidden = !empty;
    foodElements.clearDay.disabled = empty;
    const familiarCount = foodExperience.lines.filter(line => line.food?.source !== "usda").length;
    foodElements.resetFamiliarFoods.disabled = familiarCount === 0;
    updateEstimatedFoodEnergy();
    foodElements.loadExample.classList.toggle("active", foodExperience.dayKind === "example");
    foodElements.loadExample.setAttribute("aria-pressed", String(foodExperience.dayKind === "example"));
    foodElements.exampleNote.hidden = foodExperience.dayKind !== "example";

    if (coreElements.myDayTab) {
        coreElements.myDayTab.textContent = foodCount
            ? `My Day · ${foodCount}`
            : "My Day";
        coreElements.myDayTab.setAttribute(
            "aria-label",
            foodCount ? `My Day, ${foodCount} selected ${noun}` : "My Day, no foods selected"
        );
    }

    if (empty) {
        foodElements.daySummary.textContent = "No foods added yet";
        foodElements.mobileCount.textContent = "No foods yet";
        foodElements.seeFoodsSummary.textContent = "No foods added";
    } else if (foodExperience.dayKind === "example") {
        foodElements.daySummary.textContent = `Familiar Meals Example · ${foodCount} foods`;
        foodElements.mobileCount.textContent = `${foodCount} foods`;
        foodElements.seeFoodsSummary.textContent = `Familiar example · ${foodCount} foods`;
    } else {
        foodElements.daySummary.textContent = `A partial day so far · ${foodCount} ${noun}`;
        foodElements.mobileCount.textContent = `${foodCount} ${noun}`;
        foodElements.seeFoodsSummary.textContent = `Partial day · ${foodCount} ${noun}`;
    }

    foodElements.tray.replaceChildren();

    if (foodExperience.dayKind === "example") {
        renderExampleMeals();
    } else if (!empty) {
        renderCustomDay();
    }
}


function snapshotExperimentState() {
    return {
        lines: cloneLines(foodExperience.lines),
        source: foodExperience.source,
        dayKind: foodExperience.dayKind,
        activity: Number(controls.activity.value),
        time: Number(controls.time.value),
        macros: Object.fromEntries(macroKeys.map(key => [key, Number(controls[key].value)])),
        calorieTarget: planner.calorieTarget
    };
}


function renderNarration(state) {
    const item = foodItem(foodExperience.lastChange?.foodId);
    const activity = getActivityProfile(controls.activity.value);
    const horizon = getHorizonPeriod(controls.time.value);
    const narration = buildNarration({
        change: foodExperience.lastChange,
        state,
        item,
        activity,
        horizon,
        source: foodExperience.source
    });

    foodElements.narrationTitle.textContent = narration.title;
    foodElements.narrationBody.textContent = narration.body;
    foodElements.narrationContext.textContent = narration.context;

    window.clearTimeout(foodExperience.announcementTimer);
    foodExperience.announcementTimer = window.setTimeout(() => {
        foodElements.narrationAnnouncement.textContent =
            `${narration.title}. ${narration.body}`;
    }, 420);

    if (foodExperience.experimentUndo) {
        foodElements.experimentCard.hidden = false;
        foodElements.experimentButton.textContent = "Undo experiment";
        return;
    }

    const experiment = suggestExperiment({
        change: foodExperience.lastChange,
        activity,
        horizon,
        item
    });

    foodExperience.experiment = experiment;
    foodElements.experimentCard.hidden = !experiment;

    if (experiment) {
        foodElements.experimentButton.textContent = experiment.label;
    }
}


function refreshFoodExperience({ syncControls = true } = {}) {
    setFoodSource(foodExperience.source);
    renderTray();
    syncFoodTileSelections();
    renderMyFoods();
    renderUsdaResults();

    if (syncControls && foodExperience.source === "foods") {
        syncFoodTotalsToControls();
    }

    calculate();
}


function addFood(foodId) {
    const item = foodItem(foodId);
    if (!item) return;

    const existing = foodExperience.lines.find(line => line.foodId === foodId);
    if (existing) {
        existing.quantity += 1;
        delete existing.exampleMeals;
    } else {
        foodExperience.lines.push({ foodId, quantity: 1 });
    }

    foodExperience.dayKind = "custom";
    foodExperience.lastChange = { type: "food-add", foodId };
    foodExperience.experimentUndo = null;
    setFoodSource("foods");
    foodElements.browserStatus.textContent = `${item.name} added. ${foodExperience.lines.length} ${foodExperience.lines.length === 1 ? "food" : "foods"} selected.`;
    refreshFoodExperience();
}


function adjustFoodFromTile(foodId, delta) {
    const line = foodExperience.lines.find(entry => entry.foodId === foodId);

    if (delta > 0 && !line) {
        addFood(foodId);
        return;
    }

    if (line) {
        changeFoodQuantity(foodId, delta > 0 ? 1 : -1);
    }
}


function changeFoodQuantity(foodId, delta) {
    const line = foodExperience.lines.find(entry => entry.foodId === foodId);
    if (!line) return;

    line.quantity = Math.round((line.quantity + delta) * 2) / 2;
    delete line.exampleMeals;

    if (line.quantity <= 0) {
        foodExperience.lines = foodExperience.lines.filter(entry => entry.foodId !== foodId);
    }

    syncSavedUsdaQuantities();

    foodExperience.dayKind = foodExperience.lines.length ? "custom" : "empty";
    foodExperience.lastChange = {
        type: delta > 0 ? "food-increase" : "food-decrease",
        foodId
    };
    foodExperience.experimentUndo = null;
    setFoodSource("foods");
    refreshFoodExperience();
}


function removeFood(foodId) {
    foodExperience.lines = foodExperience.lines.filter(line => line.foodId !== foodId);
    syncSavedUsdaQuantities();
    foodExperience.dayKind = foodExperience.lines.length ? "custom" : "empty";
    foodExperience.lastChange = { type: "food-remove", foodId };
    foodExperience.experimentUndo = null;
    setFoodSource("foods");
    refreshFoodExperience();
}


function resetFamiliarFoods() {
    const familiarLines = foodExperience.lines.filter(line => line.food?.source !== "usda");
    if (!familiarLines.length) return;
    foodExperience.lines = foodExperience.lines.filter(line => line.food?.source === "usda");
    syncSavedUsdaQuantities();
    foodExperience.dayKind = foodExperience.lines.length ? "custom" : "empty";
    foodExperience.lastChange = { type: "food-remove" };
    foodExperience.experimentUndo = null;
    setFoodSource("foods");
    refreshFoodExperience();
    foodElements.browserStatus.textContent = "Familiar Foods reset. My Pantry and My Foods were not changed.";
}


function loadFamiliarMealsExample() {
    foodExperience.lines = createExampleDay();
    syncSavedUsdaQuantities();
    foodExperience.dayKind = "example";
    foodExperience.lastChange = { type: "example" };
    foodExperience.experimentUndo = null;
    controls.activity.value = 1;
    controls.time.value = 0;
    setFoodSource("foods");
    refreshFoodExperience();
}


function renderEmptyModelState() {
    document.querySelector(".body-stage").classList.add("is-empty");
    document.querySelector(".body-stage").classList.remove("has-foods");
    document.querySelector(".body-stage").classList.remove("is-releasing");
    document.querySelector(".routing-stage").classList.remove("is-releasing");
    document.querySelector(".routing-stage").dataset.balanceState = "empty";
    document.querySelector(".stage-message").dataset.balanceState = "empty";
    document.getElementById("balanceSummary").textContent = "Waiting for a food";
    document.getElementById("stateTitle").textContent = "No foods selected";
    document.getElementById("stateDescription").textContent =
        "Choose a food to see what it contributes to the living system.";
    ["Protein", "Carbs", "Fats"].forEach(name => {
        document.getElementById(`stage${name}Value`).textContent = "Tap to learn";
        const total = document.getElementById(`stage${name}Total`);
        total.textContent = "≈ 0 g";
        total.setAttribute("aria-label", `Estimated ${macroLabels[name.toLowerCase()] || name} total 0 grams`);
    });

    ["fuel", "glycogen", "muscle", "repair", "fatUse", "storage"].forEach(id => {
        document.getElementById(`${id}Output`).textContent = "—";
        document.getElementById(`${id}Status`).textContent = "Not modeled";
        document.getElementById(`${id}Gauge`).setAttribute("stroke-dasharray", "0 100");
        const destination = document.getElementById(
            `destination${id.charAt(0).toUpperCase()}${id.slice(1)}Value`
        );
        if (destination) setResponseDial(destination, 0, { empty: true });
    });

    updateTechnicalTotals(foodTotals());
    document.getElementById("timeLabel").textContent = timeLabel(controls.time.value);
    updateCoreTimelineControl(controls.time.value);
    renderNarration(null);
    updateLiveBody();
    persistExplorerSnapshot();
}


function calculate() {

    if (
        foodExperience.source === "foods" &&
        foodExperience.lines.length === 0
    ) {
        foodExperience.currentState = null;
        renderEmptyModelState();
        return;
    }

    document.querySelector(".body-stage").classList.remove("is-empty");
    document.querySelector(".body-stage").classList.add("has-foods");

    const fuelInput = currentFuelInput();
    const totals = fuelInput.nutrients;
    const { protein, carbs, fats } = totals;
    const activity = fuelInput.context.activity;
    const time = fuelInput.context.timeline;
    const state = calculateBodyState(toModelInput(fuelInput));

    state.fuelInput = fuelInput;

    foodExperience.currentState = state;
    updateTechnicalTotals(totals);

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

    renderNarration(state);

    updateLiveBody();

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

    const macroEnergy = {
        Protein: protein * 4,
        Carbs: carbs * 4,
        Fats: fats * 9
    };
    const totalMacroEnergy = Math.max(
        1,
        macroEnergy.Protein + macroEnergy.Carbs + macroEnergy.Fats
    );

    Object.entries(macroEnergy).forEach(([name, energy]) => {
        const share = energy / totalMacroEnergy;
        const label = share < 0.20
            ? "Smaller share of today’s mix"
            : share > 0.45
                ? "Larger share of today’s mix"
                : "Present in today’s mix";
        document.getElementById(`stage${name}Value`).textContent = label;
    });

    const macroTotals = {
        Protein: protein,
        Carbs: carbs,
        Fats: fats
    };
    const accessibleNames = {
        Protein: "protein",
        Carbs: "carbohydrate",
        Fats: "fat"
    };
    Object.entries(macroTotals).forEach(([name, grams]) => {
        const rounded = Math.round(grams);
        const total = document.getElementById(`stage${name}Total`);
        total.textContent = `≈ ${rounded.toLocaleString()} g`;
        total.setAttribute("aria-label", `Estimated ${accessibleNames[name]} total ${rounded.toLocaleString()} grams`);
    });

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
    foodElements.seeActivitySummary.textContent = activityProfile.label;

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
    foodElements.seeHorizonSummary.textContent = timeLabel(time);

    controls.time.setAttribute(
        "aria-valuetext",
        timeLabel(time)
    );

    updateCoreTimelineControl(time);
}


function outputStatus(id, value) {
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
        setResponseDial(destinationValue, rounded);
    }
}


function setResponseDial(element, value, { empty = false } = {}) {
    if (!element) return;
    const level = Math.max(0, Math.min(100, Number(value) || 0));
    const label = level < 34 ? "lower" : level < 67 ? "moderate" : "higher";
    element.style.setProperty("--dial-angle", `${-110 + level * 2.2}deg`);
    element.dataset.emphasis = empty ? "empty" : label;
    element.setAttribute(
        "aria-label",
        empty ? "Relative emphasis not yet modeled" : `Relative model emphasis: ${label}`
    );
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

    const storageEmphasized =
        name === "storage" &&
        presentation.level !== "low";

    if (storageEmphasized) {
        channel.style.opacity = Math.min(
            1,
            presentation.channelOpacity * 1.18
        );
    }

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
            `${(
                presentation.pathWidth * widthScale *
                (storageEmphasized ? 1.28 : 1)
            ).toFixed(2)}px`;

        const pathOpacity =
            path.classList.contains("route-share")
                ? Math.max(0.20, presentation.pathOpacity * 0.64)
                : presentation.pathOpacity * (isRelease ? 0.72 : 1);

        path.style.opacity = Math.min(
            1,
            pathOpacity * (storageEmphasized ? 1.22 : 1)
        );
    });

    const envelopes =
        [...channel.querySelectorAll(".route-envelope")];

    envelopes.forEach(envelope => {
        envelope.style.strokeWidth =
            `${((
                isRelease
                    ? 2.4 + presentation.pathWidth * 1.35
                    : 3.2 + presentation.pathWidth * 2.65
            ) * (storageEmphasized ? 1.12 : 1)).toFixed(2)}px`;

        envelope.style.opacity = Math.min(
            1,
            (
                isRelease
                    ? 0.02 + presentation.contrast * 0.14
                    : 0.035 + presentation.contrast * 0.29
            ) * (storageEmphasized ? 1.24 : 1)
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

    const isReleasing =
        routeSignals.release > 12;

    routingStage.classList.toggle("is-releasing", isReleasing);
    document.querySelector(".body-stage")
        .classList.toggle("is-releasing", isReleasing);

    updateBalanceAura(balance);

    Object.entries(routeSignals.destinations)
        .forEach(([name, value]) => {
            const cardSignal = name === "liver"
                ? routeSignals.strengths.liver
                : value;
            const destinationClass = {
                fuel: "brain",
                fatUse: "fat-use"
            }[name] || name;
            const card = document.querySelector(
                `.destination-${destinationClass}`
            );

            if (card) {
                card.style.setProperty("--signal", (cardSignal / 100).toFixed(2));
                setResponseDial(card.querySelector(".response-dial"), cardSignal);
                card.classList.toggle(
                    "is-prioritized",
                    cardSignal >= 68
                );
            }
        });

    const liverSignal = routeSignals.strengths.liver;


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
        0.03 + liverSignal / 300;

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
        deficit: "Selected supply below reference",
        matched: "Selected supply near reference",
        surplus: "Selected supply above reference"
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

    enterAdjustedFromFoods("technical-preset");
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
            ? "Explorer reset to the Everyday Baseline model example. Its fuel and demand values are not personalized recommendations."
            : `${selectedPreset.textContent.trim()} example loaded. Locks were cleared so the full preset can be shown.`
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
            enterAdjustedFromFoods("technical");
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
                clearActivePreset();
                foodExperience.lastChange = {
                    type: key === "activity" ? "activity" : "horizon"
                };
                foodExperience.experimentUndo = null;

                setCalorieStatus(
                    key === "activity"
                        ? "Manual scenario: activity changed; fuel and duration remain as shown."
                        : "Manual scenario: duration changed; fuel and activity remain as shown."
                );

                calculate();
            }
        );
    });


plannerElements.calorieTarget.addEventListener(
    "input",
    () => {
        enterAdjustedFromFoods("technical");
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
        enterAdjustedFromFoods("technical");
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
                enterAdjustedFromFoods("technical");
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


/* Weights provide goal context only; scenario controls retain their explicit source. */
[
    plannerElements.currentWeight,
    plannerElements.targetWeight
].forEach(input => {
    input.addEventListener("input", calculate);
});


plannerElements.weightUnit.addEventListener(
    "change",
    () => {
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
        loadFamiliarMealsExample();
    });


foodElements.loadExample.addEventListener("click", loadFamiliarMealsExample);
foodElements.clearStart.addEventListener("click", resetFamiliarFoods);
foodElements.clearDay.addEventListener("click", resetFamiliarFoods);
foodElements.resetFamiliarFoods.addEventListener("click", resetFamiliarFoods);
foodElements.sourceTabs.forEach(button => {
    button.addEventListener("click", () => {
        setFoodBrowserSource(button.dataset.foodSourceTab, { focus: true });
    });
    button.addEventListener("keydown", event => {
        if (!["ArrowLeft", "ArrowRight"].includes(event.key)) return;
        event.preventDefault();
        const tabs = foodElements.sourceTabs;
        const current = tabs.indexOf(button);
        const direction = event.key === "ArrowRight" ? 1 : -1;
        setFoodBrowserSource(tabs[(current + direction + tabs.length) % tabs.length].dataset.foodSourceTab, { focus: true });
    });
});
foodElements.usdaForm.addEventListener("submit", submitUsdaSearch);
foodElements.usdaInput.addEventListener("input", queueUsdaSearch);
foodElements.usdaClear.addEventListener("click", clearUsdaSearch);
foodElements.sendAllToPantry.addEventListener("click", sendAllFoodsToPantry);
foodElements.undoSavedFood.addEventListener("click", () => {
    const removed = foodExperience.lastRemovedSavedFood;
    if (!removed) return;

    foodExperience.savedUsdaFoods.splice(removed.index, 0, removed.entry);
    if (removed.entry.quantity > 0) {
        foodExperience.lines.push({
            foodId: removed.entry.food.id,
            quantity: removed.entry.quantity,
            food: {
                ...removed.entry.food,
                estimate: { ...removed.entry.food.estimate }
            }
        });
    }
    foodExperience.lastRemovedSavedFood = null;
    foodElements.undoSavedFood.hidden = true;
    persistMyFoods();
    setFoodSource("foods");
    refreshFoodExperience();
    foodElements.browserStatus.textContent = "Food restored to My Foods.";
    foodElements.myPantryList.querySelector("button")?.focus();
});

foodElements.useFoodEstimates.addEventListener("click", () => {
    clearActivePreset();
    foodExperience.lastChange = { type: "food-sync" };
    setFoodSource("foods");
    refreshFoodExperience();
});

foodElements.experimentButton.addEventListener("click", () => {
    if (foodExperience.experimentUndo) {
        const undo = foodExperience.experimentUndo;
        foodExperience.lines = cloneLines(undo.lines);
        foodExperience.dayKind = undo.dayKind;
        controls.activity.value = undo.activity;
        controls.time.value = undo.time;
        macroKeys.forEach(key => {
            controls[key].value = undo.macros[key];
        });
        planner.calorieTarget = undo.calorieTarget;
        foodExperience.experimentUndo = null;
        foodExperience.lastChange = { type: "experiment-undo" };
        setFoodSource(undo.source);
        refreshFoodExperience({ syncControls: undo.source === "foods" });
        return;
    }

    const experiment = foodExperience.experiment;
    if (!experiment) return;

    const undo = snapshotExperimentState();
    const action = experiment.action;

    if (action.type === "activity") {
        controls.activity.value = action.value;
    } else if (action.type === "horizon") {
        controls.time.value = action.value;
    } else if (action.type === "add-food") {
        const existing = foodExperience.lines.find(line => line.foodId === action.foodId);
        if (existing) existing.quantity += 1;
        else foodExperience.lines.push({ foodId: action.foodId, quantity: 1 });
        foodExperience.dayKind = "custom";
        setFoodSource("foods");
    }

    foodExperience.experimentUndo = undo;
    foodExperience.lastChange = { type: "experiment", foodId: action.foodId };
    refreshFoodExperience();
});

document.querySelectorAll("[data-view-target]").forEach(button => {
    button.addEventListener("click", () => {
        setExperienceView(button.dataset.viewTarget);
    });
});

foodElements.buildViewButton.addEventListener("click", () => {
    setExperienceView("build");
});

foodElements.seeViewButton.addEventListener("click", () => {
    setExperienceView("see");
});


coreElements.timelineButtons.forEach(button => {
    button.addEventListener("click", () => {
        controls.time.value = button.dataset.timeline;
        controls.time.dispatchEvent(new Event("input", { bubbles: true }));
    });
});


foodElements.filters.addEventListener("keydown", event => {
    if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;

    const tabs = [...foodElements.filters.querySelectorAll('[role="tab"]')];
    const currentIndex = tabs.indexOf(document.activeElement);
    if (currentIndex < 0) return;

    event.preventDefault();
    const nextIndex = event.key === "Home"
        ? 0
        : event.key === "End"
            ? tabs.length - 1
            : (currentIndex + (event.key === "ArrowRight" ? 1 : -1) + tabs.length) % tabs.length;
    tabs[nextIndex].focus();
    tabs[nextIndex].click();
});


function openCoreExplanation(trigger) {
    const explanation = coreExplanations[trigger.dataset.coreExplanation];
    if (!explanation) return;

    coreElements.activeExplanationTrigger = trigger;
    hideInfoPopover();
    trigger.setAttribute("aria-expanded", "true");
    coreElements.dialogTitle.textContent = explanation.title;
    coreElements.dialogBody.textContent = explanation.body;
    coreElements.dialogDetails.hidden = !explanation.details?.length;
    coreElements.dialogDetails.open = false;
    coreElements.dialogDetailsTitle.textContent = explanation.detailsTitle || "More context";
    coreElements.dialogDetailsList.replaceChildren();
    explanation.details?.forEach(detail => {
        const item = document.createElement("li");
        item.textContent = detail;
        coreElements.dialogDetailsList.append(item);
    });

    if (typeof coreElements.dialog.showModal === "function") {
        coreElements.dialog.showModal();
    } else {
        coreElements.dialog.setAttribute("open", "");
    }

    window.requestAnimationFrame(() => coreElements.dialogClose.focus());
}


function closeCoreExplanation() {
    if (typeof coreElements.dialog.close === "function" && coreElements.dialog.open) {
        coreElements.dialog.close();
    } else {
        coreElements.dialog.removeAttribute("open");
        coreElements.activeExplanationTrigger?.focus();
    }
}


document.addEventListener("click", event => {
    const trigger = event.target.closest("[data-core-explanation]");
    if (trigger) openCoreExplanation(trigger);
});

document.addEventListener("keydown", event => {
    if (event.key === "Escape" && coreElements.dialog.open) {
        event.preventDefault();
        closeCoreExplanation();
        return;
    }

    const trigger = event.target.closest?.("[data-core-explanation]");
    if (trigger && ["Enter", " "].includes(event.key) && !trigger.matches("button")) {
        event.preventDefault();
        openCoreExplanation(trigger);
    }
});

coreElements.dialogClose.addEventListener("click", closeCoreExplanation);
coreElements.dialog.addEventListener("close", () => {
    coreElements.activeExplanationTrigger?.setAttribute("aria-expanded", "false");
    coreElements.activeExplanationTrigger?.focus();
    coreElements.activeExplanationTrigger = null;
});
coreElements.dialog.addEventListener("click", event => {
    if (event.target === coreElements.dialog) closeCoreExplanation();
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
    .querySelectorAll(".info-button:not(.core-info-button)")
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
    fatUse: { x: 0.585, y: 0.67 },
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


function reserveReleaseRoute(from, to, laneX) {

    const verticalDistance =
        to.y - from.y;

    return [
        `M ${from.x} ${from.y}`,
        `C ${laneX} ${routeNumber(from.y + verticalDistance * 0.18)},`,
        `${laneX} ${routeNumber(to.y - verticalDistance * 0.18)},`,
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
        fatUseCard: routeElementAnchor(".destination-fat-use", "left"),
        brain: bodyRoutePoint("brain"),
        liver: bodyRoutePoint("liver"),
        muscle: bodyRoutePoint("muscle"),
        repair: bodyRoutePoint("repair"),
        glycogen: bodyRoutePoint("glycogen"),
        storage: bodyRoutePoint("storage"),
        fatUse: bodyRoutePoint("fatUse"),
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
    setRoutePath(
        "routeFatUseOut",
        horizontalRoute(anchors.fatUse, anchors.fatUseCard, 0.34, 0.24)
    );

    const releaseOrigin = {
        x: routeNumber(anchors.storageCard.x - 10),
        y: routeNumber(anchors.storageCard.y + 24)
    };

    const releaseLaneX = routeNumber(Math.min(
        anchors.fatUseCard.x - 58,
        Math.max(anchors.storage.x, anchors.fatUse.x) + 118
    ));

    setRoutePath(
        "routeStoredRelease",
        reserveReleaseRoute(releaseOrigin, anchors.fatUse, releaseLaneX)
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
        liver: anchors.liverCard,
        muscle: anchors.muscleCard,
        repair: anchors.repairCard,
        glycogen: anchors.glycogenCard,
        storage: anchors.storageCard,
        fatUse: anchors.fatUseCard
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
        anchors.fatUse,
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
        const bodyRect =
            bodyAnatomy.getBoundingClientRect();

        const bodyRight = clientPointToRouteSpace(
            bodyRect.right,
            bodyRect.top + bodyRect.height / 2
        );

        const releaseLabelX = routeNumber(
            (bodyRight.x + anchors.fatUseCard.x) / 2
        );

        releaseLabel.setAttribute(
            "x",
            releaseLabelX
        );
        releaseLabel.querySelectorAll("tspan").forEach(line => {
            line.setAttribute("x", releaseLabelX);
        });
        releaseLabel.setAttribute(
            "y",
            routeNumber((releaseOrigin.y + anchors.fatUse.y) / 2 - 24)
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
            ? "Play motion"
            : "Pause motion"
    );
    motionToggleText.textContent = paused ? "Play motion" : "Pause motion";
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


/*
 * Narrow bridge for the optional guided layer. Lesson state uses the same
 * rendering and model pathways as the explorer, while keeping temporary guide
 * transitions out of the normal Clear/Undo history.
 */
window.BodyFuelExplorerGuideBridge = Object.freeze({
    capture() {
        return {
            explorer: createExplorerSnapshot(),
            foodLines: cloneLines(foodExperience.lines),
            savedUsdaFoods: foodExperience.savedUsdaFoods.map(entry => ({
                food: { ...entry.food, estimate: { ...entry.food.estimate } },
                quantity: entry.quantity,
                lastQuantity: entry.lastQuantity
            })),
            usdaQuery: foodElements.usdaInput.value,
            usdaResults: foodExperience.usdaResults.map(item => ({
                ...item,
                estimate: { ...item.estimate }
            })),
            filter: foodExperience.filter,
            browserSource: foodExperience.browserSource,
            scrollTop: foodElements.grid.scrollTop,
            dayKind: foodExperience.dayKind,
            source: foodExperience.source,
            browserStatus: foodElements.browserStatus.textContent
        };
    },

    restore(snapshot) {
        if (!snapshot?.explorer) return false;

        const explorer = snapshot.explorer;
        foodExperience.lines = cloneLines(snapshot.foodLines || []);
        if (Array.isArray(snapshot.savedUsdaFoods)) {
            foodExperience.savedUsdaFoods = snapshot.savedUsdaFoods
                .map(entry => safeSavedUsdaEntry(entry))
                .filter(Boolean);
        }
        foodExperience.usdaResults = Array.isArray(snapshot.usdaResults)
            ? snapshot.usdaResults.map(item => ({ ...item, estimate: { ...item.estimate } }))
            : [];
        foodElements.usdaInput.value = String(snapshot.usdaQuery || "");
        foodElements.usdaClear.hidden = !foodElements.usdaInput.value;
        foodExperience.filter = foodCategories.some(category =>
            category.id === snapshot.filter && category.id !== "all"
        ) ? snapshot.filter : "breakfast";
        foodExperience.browserSource = ["usda", "pantry", "saved"].includes(snapshot.browserSource)
            ? snapshot.browserSource
            : "familiar";
        foodExperience.dayKind = ["example", "custom", "empty"].includes(snapshot.dayKind)
            ? snapshot.dayKind
            : (foodExperience.lines.length ? "custom" : "empty");
        foodExperience.source = explorer.foodSource === "manual" ? "manual" : "foods";
        foodExperience.experimentUndo = null;
        foodExperience.lastChange = { type: "guide-restore" };

        macroKeys.forEach(key => {
            restoreRangeValue(controls[key], explorer.macros?.[key]);
            planner.locks[key] = explorer.locks?.[key] === true;
        });
        restoreRangeValue(controls.activity, explorer.activity);
        restoreRangeValue(controls.time, explorer.time);
        planner.calorieTarget = Number.isFinite(Number(explorer.calorieTarget))
            ? Number(explorer.calorieTarget)
            : planner.calorieTarget;
        planner.weightUnit = explorer.weightUnit === "kg" ? "kg" : "lb";
        plannerElements.weightUnit.value = planner.weightUnit;
        plannerElements.currentWeight.value = explorer.currentWeight || "";
        plannerElements.targetWeight.value = explorer.targetWeight || "";
        motionUserOverride = explorer.motionUserOverride === true;
        setFlowMotionPaused(explorer.flowMotionPaused === true);

        renderFoodBrowser();
        renderMyFoods();
        renderUsdaResults();
        setFoodBrowserSource(foodExperience.browserSource, { persist: false });
        foodElements.browserStatus.textContent = snapshot.browserStatus || "";
        setFoodSource(foodExperience.source);
        renderTray();
        if (foodExperience.source === "foods") syncFoodTotalsToControls();
        calculate();
        persistMyFoods();

        window.requestAnimationFrame(() => {
            foodElements.grid.scrollTop = Number(snapshot.scrollTop) || 0;
        });
        return true;
    },

    loadScenario(lines, options = {}) {
        foodExperience.lines = cloneLines(lines)
            .filter(entry => catalogById[entry.foodId] && Number(entry.quantity) > 0);
        foodExperience.dayKind = foodExperience.lines.length ? "custom" : "empty";
        foodExperience.source = "foods";
        if (!options.preserveBrowser) {
            foodExperience.browserSource = "familiar";
        }
        foodExperience.experimentUndo = null;
        foodExperience.lastChange = { type: "guide-scenario" };
        controls.activity.value = fixedActivityContext.index;
        controls.time.value = String(Number(options.timeline ?? 0));
        if (options.filter && foodCategories.some(category => category.id === options.filter)) {
            foodExperience.filter = options.filter;
        }
        renderFoodBrowser();
        refreshFoodExperience();
        if (!options.preserveBrowser) {
            foodElements.grid.scrollTop = 0;
        }
    },

    showFoodBrowser(source) {
        setFoodBrowserSource(source, { focus: false });
    },

    async prepareFoodFlowSearch() {
        setFoodBrowserSource("usda", { focus: false });
        const queries = ["banana", "lentils", "oats", "salmon", "yogurt"];
        for (const query of queries) {
            foodElements.usdaInput.value = query;
            foodElements.usdaClear.hidden = false;
            await runUsdaSearch(query);
            const item = foodExperience.usdaResults.find(result => !savedUsdaEntry(result.id));
            if (item) return { id: item.id, name: item.name };
        }
        return null;
    },

    getSavedLocation(foodId) {
        const entry = savedUsdaEntry(foodId);
        if (!entry) return "search";
        return entry.quantity > 0 ? "active" : "pantry";
    },

    getState() {
        return {
            foodLines: cloneLines(foodExperience.lines),
            filter: foodExperience.filter,
            timeline: Number(controls.time.value),
            source: foodExperience.source,
            motionPaused: flowMotionPaused,
            reducedMotion: reducedMotionPreference.matches,
            state: foodExperience.currentState
        };
    },

    persist: persistExplorerSnapshot
});


restoreMyFoods();
const restoredExplorerSnapshot = restoreExplorerSnapshot();
syncSavedUsdaQuantities();

/* Everyday Movement remains the fixed reference for the simplified core. */
controls.activity.value = 1;

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
    "bodyFuelExplorerWelcomeV2";


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
        document.querySelector(".food-tile")?.focus();
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


placeCoreExperienceInReadingOrder();
foodElements.grid.addEventListener("focusin", revealFocusedFoodRow);
renderFoodBrowser();
renderMyFoods();
renderUsdaResults();
setFoodBrowserSource(foodExperience.browserSource, { persist: false });
setExperienceView(foodExperience.viewMode, { persist: false });
setFoodSource(foodExperience.source);
renderTray();

if (foodExperience.source === "foods") {
    syncFoodTotalsToControls();
}

updateWeightUnitAccessibility();
calculate();
scheduleRouteGeometryUpdate();

window.requestAnimationFrame(() => {
    if (!document.body.classList.contains("core-mode") && !hasSeenWelcome()) {
        window.setTimeout(openWelcomeDialog, 180);
    }
});
