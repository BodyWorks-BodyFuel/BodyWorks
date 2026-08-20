"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const model = require("../model.js");

const projectRoot = path.resolve(__dirname, "..");
const read = name => fs.readFileSync(path.join(projectRoot, name), "utf8");
const html = read("index.html");
const app = read("app.js");
const css = read("style.css");


test("core dependencies load in stable layer order", () => {
    const sources = [
        "model.js?v=20260819-1",
        "foods.js?v=20260818-2",
        "narration.js?v=20260819-2",
        "explanations.js?v=20260819-2",
        "app.js?v=20260819-6",
        "guide-scenarios.js?v=20260819-1",
        "guide.js?v=20260819-4",
        "intro.js?v=20260820-1"
    ];
    const positions = sources.map(source => html.indexOf(`src="${source}"`));
    positions.forEach(position => assert.ok(position >= 0));
    assert.deepEqual([...positions].sort((a, b) => a - b), positions);
    assert.match(html, /href="style\.css\?v=20260820-1"/);
});


test("all local resources exist, IDs are unique, and routes resolve", () => {
    const references = [...html.matchAll(/\b(?:src|href)="([^"]+)"/g)]
        .map(match => match[1])
        .filter(reference =>
            !reference.startsWith("#") &&
            !reference.startsWith("http:") &&
            !reference.startsWith("https:") &&
            !reference.startsWith("data:")
        );
    references.map(reference => reference.split(/[?#]/)[0]).forEach(reference => {
        assert.equal(fs.existsSync(path.join(projectRoot, reference)), true, reference);
    });

    const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map(match => match[1]);
    assert.equal(new Set(ids).size, ids.length);
    [...html.matchAll(/<mpath[^>]+href="#([^"]+)"/g)]
        .map(match => match[1])
        .forEach(id => assert.ok(ids.includes(id), `Missing route ${id}`));
});


test("the forward-facing contract contains only food, timeline, and hero", () => {
    assert.match(html, /<body class="core-mode">/);
    assert.match(html, /class="workspace core-workspace"[\s\S]*?data-view="core"/);
    assert.match(html, /id="foodBrowserSection"/);
    assert.match(html, /id="clearFoodsButton"/);
    assert.match(html, /id="timelineHeading">Pattern Timeline/);
    assert.match(html, /class="body-stage" id="seeViewRegion"/);
    assert.match(html, /Choose foods\. Watch the pattern respond\. Then explore the timeline\./);
});


test("advanced and legacy interfaces remain recoverable but inert", () => {
    [
        "experience-nav", "build-start", "body-teaser", "activity-section",
        "live-body-dock", "output-panel day-panel", "core-my-day legacy-backstage"
    ].forEach(className => {
        const element = [...html.matchAll(/<[^>]+class="([^"]+)"[^>]*>/g)]
            .find(match => className.split(" ").every(name => match[1].split(" ").includes(name)));
        assert.ok(element, `Missing preserved ${className} element`);
        assert.match(element[0], /\bhidden\b/);
        assert.match(element[0], /\b(?:inert|aria-hidden="true")\b/);
    });
    assert.match(html, /id="weightManagementControls" hidden/);
    ["calorieTarget", "protein", "carbs", "fats", "bodyOutputsHeading"]
        .forEach(id => assert.match(html, new RegExp(`id="${id}"`)));
    assert.deepEqual(
        [...html.matchAll(/data-preset="([^"]+)"/g)].map(match => match[1]).sort(),
        Object.keys(model.presets).sort()
    );
    assert.match(css, /\.legacy-backstage\[hidden\][\s\S]*?display: none !important/);
});


test("the core starts empty without running a physiological scenario", () => {
    assert.match(app, /lines: \[\]/);
    assert.match(app, /dayKind: "empty"/);
    assert.match(app, /filter: "breakfast"/);
    const calculationGuard = app.match(/function calculate\(\) \{[\s\S]*?const state = calculateBodyState/);
    assert.ok(calculationGuard);
    assert.match(calculationGuard[0], /foodExperience\.lines\.length === 0/);
    assert.match(calculationGuard[0], /renderEmptyModelState\(\);[\s\S]*?return;/);
    assert.match(html, /Add a food below to bring the fuel pathways to life/);
    assert.match(app, /No dietary inputs selected/);
});


test("empty hero keeps the anatomical figure while routes and body responses recede", () => {
    assert.match(html, /class="body-anatomy"[\s\S]*?body-anatomical-v4-alpha\.png/);
    assert.match(css, /body\.core-mode \.body-stage\.is-empty \.route-channel[\s\S]*?opacity: 0 !important[\s\S]*?visibility: hidden !important/);
    assert.match(css, /body\.core-mode \.body-stage\.is-empty \.destination-card[\s\S]*?opacity: \.055 !important/);
    assert.match(css, /body\.core-mode \.body-stage\.is-empty \.body-anatomy[\s\S]*?opacity: \.95 !important/);
    assert.match(app, /stage\$\{name\}Value/);
    assert.match(app, /textContent = "Tap to learn"/);
});


test("food and timeline changes use a restartable three-second emphasis lifecycle", () => {
    assert.match(app, /function addFood\(foodId\)/);
    assert.match(app, /existing\.quantity \+= 1/);
    assert.match(app, /classList\.add\("has-foods"\)/);
    assert.match(app, /fullStage\.dataset\.inputEmphasis/);
    assert.match(app, /protein: changedItem\.estimate\.protein \* 4/);
    assert.match(app, /carbs: changedItem\.estimate\.carbs \* 4/);
    assert.match(app, /fats: changedItem\.estimate\.fats \* 9/);
    assert.match(app, /const emphasisDurationMs = 3000/);
    assert.match(app, /window\.clearTimeout\(foodExperience\.emphasisTimer\)[\s\S]*?window\.setTimeout/);
    assert.match(app, /fullStage\.classList\.remove\("is-emphasized"\)[\s\S]*?void fullStage\.offsetWidth[\s\S]*?fullStage\.classList\.add\("is-emphasized"\)/);
    assert.match(app, /\}, emphasisDurationMs\)/);
    assert.match(css, /data-input-emphasis="protein"[\s\S]*?\.route-protein/);
    assert.match(css, /transition-duration: \.18s/);
});


test("the hero uses seven familiar qualitative destination cards", () => {
    const names = [
        "Brain &amp; Essential Fuel", "Liver Processing", "Working Muscles",
        "Repair &amp; Rebuilding", "Glycogen Storage", "Fat Storage", "Fat as Fuel"
    ];
    names.forEach(name => assert.match(html, new RegExp(`<strong>${name}<\\/strong>`)));
    assert.equal([...html.matchAll(/class="destination-card/g)].length, 7);
    const destinationOrder = [...html.matchAll(/<article class="destination-card[^>]*>[\s\S]*?<strong>([^<]+)<\/strong>[\s\S]*?<\/article>/g)]
        .map(match => match[1]);
    assert.deepEqual(destinationOrder, names);
    assert.match(css, /body\.core-mode \.body-stage \.destination-card b[\s\S]*?display: none !important/);
    assert.match(app, /card\.style\.setProperty\("--signal"/);
});


test("Liver Processing has one canonical painted route from anatomy to its card", () => {
    assert.equal([...html.matchAll(/id="routeLiverOut"/g)].length, 1);
    assert.equal([...html.matchAll(/data-route="liver"/g)].length, 1);

    const liverChannel = html.match(
        /<g class="route-channel channel-liver" data-route="liver">[\s\S]*?<\/g>/
    )[0];
    assert.match(liverChannel, /class="route-envelope"[^>]+href="#routeLiverOut"/);
    assert.match(liverChannel, /class="route-path route-path-core route-path-liver"[^>]+href="#routeLiverOut"/);
    assert.match(liverChannel, /class="route-filament"[^>]+href="#routeLiverOut"/);
    assert.match(liverChannel, /class="route-terminal route-terminal-target"/);
    assert.equal([...liverChannel.matchAll(/<mpath href="#routeLiverOut"/g)].length, 3);
    assert.doesNotMatch(liverChannel, /marker|arrow/i);
    assert.match(css, /\.channel-liver \{ color: #ff9a72; \}/);

    assert.match(app, /"routeLiverOut",[\s\S]*?horizontalRoute\(anchors\.liver, anchors\.liverCard/);
    const targetTerminals = app.match(/const targetTerminals = \{[\s\S]*?\n    \};/)[0];
    assert.match(targetTerminals, /liver: anchors\.liverCard/);
    assert.equal([...targetTerminals.matchAll(/fatUse:/g)].length, 1);
    assert.match(targetTerminals, /fatUse: anchors\.fatUseCard/);
    assert.doesNotMatch(targetTerminals, /fatUse: anchors\.liverCard/);

    assert.match(app, /const cardSignal = name === "liver"[\s\S]*?routeSignals\.strengths\.liver/);
    assert.match(app, /const liverSignal = routeSignals\.strengths\.liver/);
    assert.match(app, /liverRegion\.style\.opacity =[\s\S]*?liverSignal \/ 300/);
    assert.doesNotMatch(app, /availableFuel \* 0\.45 \+ fatUse \* 0\.55/);
    assert.match(css, /body\.core-mode \.body-stage\.is-empty \.route-channel \{[\s\S]*?opacity: 0 !important[\s\S]*?visibility: hidden/);
});


test("fat storage, Fat as Fuel, and reserve release have distinct route contracts", () => {
    const storageIndex = html.indexOf('class="destination-card destination-storage"');
    const fatUseIndex = html.indexOf('class="destination-card destination-fat-use"');
    assert.ok(storageIndex >= 0 && fatUseIndex > storageIndex);
    assert.match(html, /class="destination-card destination-storage"[^>]*data-core-explanation="fat-storage"/);
    assert.match(html, /id="routingDestinationsLabel">Body Responses</);
    assert.doesNotMatch(html, />Destinations</);
    assert.match(html, /class="destination-card destination-fat-use"[^>]*data-core-explanation="fat-as-fuel"/);

    assert.equal([...html.matchAll(/<path id="routeStorageOut"/g)].length, 1);
    assert.match(html, /id="routeFatUseOut"/);
    assert.match(html, /channel-storage[\s\S]*?href="#routeStorageOut"/);
    assert.match(html, /channel-fatUse[\s\S]*?href="#routeFatUseOut"/);
    assert.ok(
        html.indexOf('class="route-channel channel-storage"') <
        html.indexOf('class="route-channel channel-fatUse"')
    );
    assert.doesNotMatch(
        html.match(/<g class="route-channel channel-fatUse"[\s\S]*?<\/g>/)[0],
        /routeLiverOut/
    );

    assert.match(app, /storageCard: routeElementAnchor\("\.destination-storage", "left"\)[\s\S]*?fatUseCard: routeElementAnchor\("\.destination-fat-use", "left"\)/);
    assert.match(app, /"routeStorageOut",[\s\S]*?anchors\.storageCard/);
    assert.match(app, /"routeFatUseOut",[\s\S]*?anchors\.fatUseCard/);
    assert.match(app, /storage: anchors\.storageCard,[\s\S]*?fatUse: anchors\.fatUseCard/);
    assert.match(app, /const releaseOrigin = \{[\s\S]*?anchors\.storageCard\.x - 10[\s\S]*?anchors\.storageCard\.y \+ 24[\s\S]*?reserveReleaseRoute\(releaseOrigin, anchors\.fatUse, releaseLaneX\)/);
    assert.match(app, /const bodyRight = clientPointToRouteSpace\([\s\S]*?bodyRect\.right[\s\S]*?const releaseLabelX = routeNumber\([\s\S]*?bodyRight\.x \+ anchors\.fatUseCard\.x/);

    const releaseGroup = html.match(/<g class="route-channel stored-release"[\s\S]*?<\/g>/)[0];
    assert.match(releaseGroup, /STORED RESERVES[\s\S]*?RELEASED/);
    assert.match(releaseGroup, /<circle class="route-particle" r="6"/);
    assert.doesNotMatch(html, /<marker\b|marker-end=|releaseDirection/);
    assert.doesNotMatch(css, /marker-end|releaseDirection/);
    assert.match(css, /\.route-path-release[\s\S]*?stroke-dasharray: 3 13/);
    assert.match(css, /@media \(min-width: 901px\) and \(max-width: 1100px\)[\s\S]*?\.release-label[\s\S]*?letter-spacing: \.6px/);
    assert.match(app, /const isReleasing =[\s\S]*?routeSignals\.release > 12[\s\S]*?body-stage[\s\S]*?classList\.toggle\("is-releasing", isReleasing\)/);
    assert.match(css, /@media \(max-width: 520px\)[\s\S]*?body\.core-mode \.release-label[\s\S]*?display: none[\s\S]*?Stored reserves released/);
    assert.match(app, /const storageEmphasized =[\s\S]*?name === "storage"[\s\S]*?presentation\.level !== "low"/);
    assert.match(app, /storageEmphasized \? 1\.28 : 1/);
    assert.match(app, /pathOpacity \* \(storageEmphasized \? 1\.22 : 1\)/);

    const routeCoordinates = id => {
        const pathData = html.match(new RegExp(`id="${id}" d="([^"]+)"`))[1];
        return [...pathData.matchAll(/-?\d+(?:\.\d+)?/g)].map(match => Number(match[0]));
    };
    const endpoint = coordinates => coordinates.slice(-2);
    const startpoint = coordinates => coordinates.slice(0, 2);
    const storageRoute = routeCoordinates("routeStorageOut");
    const fatUseRoute = routeCoordinates("routeFatUseOut");
    const releaseRoute = routeCoordinates("routeStoredRelease");
    const dietaryFatRoute = routeCoordinates("routeFatIn");
    assert.notDeepEqual(endpoint(storageRoute), endpoint(fatUseRoute));
    assert.notDeepEqual(endpoint(storageRoute), startpoint(releaseRoute));
    assert.notDeepEqual(endpoint(dietaryFatRoute), endpoint(releaseRoute));
});


test("Pattern Timeline supplies four conceptual repeated-pattern lenses", () => {
    assert.match(html, /If this same day repeats, how might the model’s priorities change\?/);
    const options = [...html.matchAll(/data-timeline="(\d)"[^>]*>([^<]+)</g)]
        .map(match => [match[1], match[2].trim()]);
    assert.deepEqual(options, [["0", "Today"], ["1", "Days"], ["2", "Weeks"], ["3", "Months"]]);
    assert.match(html, /id="time"[\s\S]*?value="0"/);
    assert.match(app, /Today emphasizes immediate routing, essential fuel, working tissue, and glycogen/);
    assert.match(app, /Days emphasizes recurring fuel supply and glycogen use and refill/);
    assert.match(app, /Weeks emphasizes repair support, reserve use, and accumulating storage pressure/);
    assert.match(app, /Months emphasizes sustained storage, release, and longer-term adaptation tendencies/);
    assert.match(app, /These selections are treated as the complete repeated daily pattern/);
});


test("Everyday Movement is a fixed backstage reference", () => {
    assert.match(html, /activity-section legacy-backstage" hidden inert aria-hidden="true"/);
    assert.match(html, /id="activity"[\s\S]*?value="1"/);
    assert.match(app, /Everyday Movement remains the fixed reference/);
    assert.match(app, /controls\.activity\.value = 1/);
});


test("food workspace exposes only the five real browsing categories", () => {
    assert.match(html, /id="foodFilters" role="tablist" aria-label="Food categories"/);
    assert.match(app, /foodCategories\.filter\(category => category\.id !== "all"\)/);
    assert.match(app, /setAttribute\("role", "tab"\)/);
    assert.match(app, /setAttribute\("aria-selected"/);
    assert.match(app, /foodExperience\.filter = category\.id/);
    const browserRenderer = app.match(/function renderFoodBrowser\(\) \{[\s\S]*?function syncFoodTileSelections/)[0];
    assert.doesNotMatch(browserRenderer, /my-day|My Day/);
    assert.match(app, /filter: "breakfast"/);
});


test("food catalog uses gentle row-level snapping with deliberate scroll management", () => {
    const refinement = css.split("Final food-row snapping and follow-up timeline order").at(-1);
    const browserRenderer = app.match(/function renderFoodBrowser\(\) \{[\s\S]*?function syncFoodTileSelections/)[0];
    const tileAdjustment = app.match(/function adjustFoodFromTile\(foodId, delta\) \{[\s\S]*?\n\}/)[0];

    assert.match(refinement, /#foodGrid \{[\s\S]*?scroll-snap-type: y proximity[\s\S]*?-webkit-overflow-scrolling: touch/);
    assert.match(refinement, /food-tile-wrap \{[\s\S]*?scroll-snap-align: start[\s\S]*?scroll-snap-stop: normal/);
    assert.match(refinement, /scroll-padding-block: 2px 8px/);
    assert.match(refinement, /padding-block: 0 !important/);
    assert.match(browserRenderer, /renderFoodBrowser\(\);[\s\S]*?foodElements\.grid\.scrollTop = 0/);
    assert.doesNotMatch(tileAdjustment, /renderFoodBrowser|scrollTop/);
    assert.match(app, /function revealFocusedFoodRow\(event\)[\s\S]*?rowIsFullyVisible[\s\S]*?foodElements\.grid\.scrollTop = Math\.max\(0, rowTop\)/);
    assert.match(app, /foodElements\.grid\.addEventListener\("focusin", revealFocusedFoodRow\)/);
    assert.match(refinement, /prefers-reduced-motion: reduce[\s\S]*?#foodGrid \{[\s\S]*?scroll-behavior: auto/);
    assert.ok(html.indexOf('id="foodBrowserStatus"') > html.indexOf('id="foodGrid"'));
});


test("the reusable My Day tray remains preserved backstage", () => {
    assert.match(html, /class="today-section core-my-day legacy-backstage" id="coreMyDay"[\s\S]*?hidden inert aria-hidden="true"/);
    assert.match(html, /id="clearDayButton">Clear/);
    assert.match(app, /function changeFoodQuantity\(foodId, delta\)/);
    assert.match(app, /function removeFood\(foodId\)/);
    assert.match(app, /function clearFoodDay\(\)/);
    assert.match(app, /lastClearedLines/);
    assert.match(app, /Decrease \$\{item\.name\}/);
    assert.match(app, /Increase \$\{item\.name\}/);
    assert.match(app, /Remove \$\{item\.name\}/);
});


test("Clear foods is an accessible action outside the category tablist", () => {
    const workspaceBar = html.match(/<div class="food-workspace-bar">[\s\S]*?<div class="food-grid"/)[0];
    assert.match(workspaceBar, /id="clearFoodsButton" aria-label="Clear all selected foods" aria-disabled="true">Clear foods/);
    assert.match(workspaceBar, /id="undoClearButton" hidden>Undo clear/);
    assert.doesNotMatch(workspaceBar.match(/<button[^>]+id="clearFoodsButton"[^>]*>/)[0], /role="tab"|aria-selected/);
    assert.match(app, /foodElements\.clearFoods\.classList\.toggle\("is-inactive", empty\)/);
    assert.match(app, /foodElements\.clearFoods\.setAttribute\("aria-disabled", String\(empty\)\)/);
    assert.match(css, /\.clear-foods-action\.is-inactive/);
    assert.match(css, /\.clear-foods-action,[\s\S]*?min-height: 44px/);
});


test("estimated food energy is a neutral live summary driven by food totals", () => {
    const workspaceBar = html.match(/<div class="food-workspace-bar">[\s\S]*?<div class="food-grid"/)[0];
    assert.match(workspaceBar, /id="selectedFoodCount">0 foods selected/);
    assert.match(workspaceBar, /Estimated food energy:[\s\S]*?id="estimatedFoodEnergy"[\s\S]*?≈ 0 kcal/);
    assert.match(workspaceBar, /aria-label="About estimated food energy" data-core-explanation="estimated-energy"/);
    assert.match(app, /function updateEstimatedFoodEnergy\(\)/);
    assert.match(app, /const estimate = formatEnergyEstimate\(totals\.calories, controls\.time\.value\)/);
    assert.match(app, /foodElements\.estimatedEnergy\.textContent = estimate\.text/);
    assert.match(app, /foodElements\.estimatedEnergy\.setAttribute\([\s\S]*?estimate\.ariaLabel/);
    assert.match(app, /function renderTray\(\)[\s\S]*?updateEstimatedFoodEnergy\(\)/);
    assert.match(app, /function updateCoreTimelineControl\(time\)[\s\S]*?updateEstimatedFoodEnergy\(\)/);
    assert.doesNotMatch(workspaceBar, /target|goal|warning|score/i);
});


test("the visible Everyday Movement context comes from the canonical fixed profile", () => {
    const workspaceBar = html.match(/<div class="food-workspace-bar">[\s\S]*?<div class="food-grid"/)[0];
    const everyday = model.getActivityProfile(1);
    const state = model.calculateBodyState({
        protein: 0,
        carbs: 0,
        fats: 0,
        activity: everyday.index,
        time: 0
    });

    assert.match(workspaceBar, /id="modelEnergyContext"/);
    assert.match(app, /fixedActivityContext = Object\.freeze\(getActivityProfile\(1\)\)/);
    assert.match(app, /Model context: \$\{fixedActivityContext\.label\} ≈ \$\{Math\.round\(fixedActivityContext\.demand\)\.toLocaleString\(\)\} kcal\/day/);
    assert.equal(everyday.label, "Everyday Movement");
    assert.equal(everyday.demand, state.energyDemand);
    assert.equal(state.energyDemand, 2150);
    assert.doesNotMatch(workspaceBar, /requirement|recommendation|maintenance|measured burn/i);
    assert.match(css, /@media \(max-width: 520px\)[\s\S]*?estimated-energy-summary \.model-energy-context \{[\s\S]*?display: block/);
    assert.match(css, /food-workspace-actions :is\(\.clear-foods-action, \.undo-clear\) \{[\s\S]*?align-self: center/);
});


test("hero and timeline comparison copy uses the existing balance classification without classifying empty food", () => {
    assert.match(app, /const balanceState = classifyEnergyBalance\(state\.balance\)/);
    assert.match(app, /This selected day supplies less energy than the Everyday Movement model reference, so reserve contribution becomes more visible\./);
    assert.match(app, /If this same supply-to-reference relationship repeats across weeks, reserve-use, repair, and storage tendencies become easier to see\./);
    assert.match(app, /This selected day supplies more energy than the Everyday Movement model reference, so storage tendency becomes more prominent\./);
    assert.match(app, /Incoming fuel sits near the Everyday Movement model reference, so the model’s priorities remain more distributed\./);
    const emptyGuard = app.match(/function calculate\(\) \{[\s\S]*?const state = calculateBodyState/)[0];
    assert.ok(emptyGuard.indexOf("renderEmptyModelState();") < emptyGuard.indexOf("calculateBodyState"));
    assert.doesNotMatch(emptyGuard.slice(0, emptyGuard.indexOf("calculateBodyState")), /classifyEnergyBalance/);
});


test("Clear foods preserves timeline, restores true empty hero state, and supports undo", () => {
    const clearFunction = app.match(/function clearFoodDay\(\) \{[\s\S]*?\n\}/)[0];
    assert.match(clearFunction, /lastClearedLines = cloneLines\(foodExperience\.lines\)/);
    assert.match(clearFunction, /foodExperience\.lines = \[\]/);
    assert.match(clearFunction, /foodExperience\.dayKind = "empty"/);
    assert.match(clearFunction, /All selected foods cleared\. Undo is available\./);
    assert.doesNotMatch(clearFunction, /controls\.time|time\.value/);
    assert.match(app, /foodElements\.clearFoods\.addEventListener\("click", clearFoodDay\)/);
    assert.match(app, /undoClear\.addEventListener[\s\S]*?Previous food selections restored\.[\s\S]*?foodElements\.clearFoods\.focus\(\)/);
    assert.match(app, /foodExperience\.lines\.length === 0[\s\S]*?renderEmptyModelState\(\)/);
});


test("core explanations are in-place, dismissible, and restore focus", () => {
    assert.match(html, /id="coreExplanationDialog"/);
    assert.match(html, /id="coreExplanationClose" aria-label="Close explanation"/);
    assert.equal([...html.matchAll(/data-core-explanation="/g)].length >= 12, true);
    assert.match(app, /function openCoreExplanation/);
    assert.match(app, /coreElements\.dialog\.showModal/);
    assert.match(app, /event\.key === "Escape" && coreElements\.dialog\.open/);
    assert.match(app, /coreElements\.activeExplanationTrigger\?\.focus\(\)/);
    assert.match(app, /\["Enter", " "\]\.includes\(event\.key\)/);
    assert.match(html, /id="coreExplanationDetails" hidden/);
    assert.match(app, /dialogDetails\.hidden = !explanation\.details\?\.length/);
    assert.match(app, /dialogDetailsList\.replaceChildren\(\)/);
});


test("food tiles have independent representative-portion help", () => {
    assert.match(app, /wrapper\.className = "food-tile-wrap"/);
    assert.match(app, /help\.className = "food-tile-help"/);
    assert.match(app, /About the representative portion for \$\{item\.name\}/);
    assert.match(app, /help\.dataset\.coreExplanation = "food-portions"/);
    const browserRenderer = app.match(/function renderFoodBrowser\(\) \{[\s\S]*?function syncFoodTileSelections/)[0];
    assert.doesNotMatch(browserRenderer, /kcal|\bgrams\b|\d+ g/);
});


test("every food tile exposes an explicit accessible portion stepper", () => {
    assert.match(app, /const selectedQuantity = selectedLine\?\.quantity \|\| 0/);
    assert.match(app, /wrapper\.classList\.toggle\("is-selected", selectedQuantity > 0\)/);
    assert.match(app, /stepper\.className = "catalog-portion-stepper"/);
    assert.match(app, /decrease\.disabled = selectedQuantity <= 0/);
    assert.match(app, /quantity\.textContent = formatPortionQuantity\(selectedQuantity\)/);
    assert.match(app, /Remove one portion of \$\{item\.name\}/);
    assert.match(app, /Add one portion of \$\{item\.name\}/);
    assert.match(app, /function adjustFoodFromTile\(foodId, delta\)/);
    assert.match(app, /changeFoodQuantity\(foodId, delta > 0 \? 1 : -1\)/);
    assert.match(css, /\.food-tile-wrap\.is-selected \.food-tile/);
    assert.match(css, /\.catalog-portion-count/);
    assert.match(css, /\.catalog-portion-stepper button[\s\S]*?width: 44px[\s\S]*?height: 44px/);
    assert.match(css, /\.catalog-portion-stepper button:disabled/);
    assert.match(css, /\.food-tile-help[\s\S]*?width: 44px[\s\S]*?height: 44px/);
});


test("food tiles use a flat compact surface and unified stepper without shrinking touch targets", () => {
    const refinement = css.split("Surgical food-tray and portrait-footer polish").at(-1);
    assert.match(refinement, /food-tile-wrap \{[\s\S]*?min-height: 84px/);
    assert.match(refinement, /food-tile \{[\s\S]*?grid-template-columns: 36px minmax\(0, 1fr\) 108px[\s\S]*?grid-template-rows: minmax\(76px, auto\)[\s\S]*?min-height: 84px[\s\S]*?border: 1px solid[\s\S]*?box-shadow: none/);
    assert.match(refinement, /catalog-portion-stepper \{[\s\S]*?width: 108px[\s\S]*?height: 44px[\s\S]*?grid-template-columns: 44px 20px 44px[\s\S]*?border: 1px solid/);
    assert.match(refinement, /catalog-portion-stepper button \{[\s\S]*?width: 44px[\s\S]*?height: 44px/);
    assert.match(refinement, /catalog-portion-stepper button::before \{[\s\S]*?inset: 8px[\s\S]*?border: 0/);
    assert.match(refinement, /catalog-portion-count,[\s\S]*?width: 20px[\s\S]*?height: 44px[\s\S]*?background: transparent/);
    assert.match(refinement, /food-tile-help \{[\s\S]*?width: 44px[\s\S]*?height: 44px[\s\S]*?background: transparent/);
    assert.match(refinement, /food-tile-help::before \{[\s\S]*?width: 14px[\s\S]*?height: 14px[\s\S]*?content: "i"/);
    assert.match(refinement, /food-tile-wrap\.is-selected \.food-tile \{[\s\S]*?border-color:[\s\S]*?box-shadow: inset 3px/);
    assert.match(refinement, /food-tile-wrap\.is-selected \.catalog-portion-count \{[\s\S]*?color: #f0fdff/);
    assert.match(refinement, /min-width: 901px\) and \(max-width: 1100px\)[\s\S]*?food-grid \{[\s\S]*?grid-template-columns: minmax\(0, 1fr\)/);
    assert.match(refinement, /min-width: 521px\) and \(max-width: 700px\)[\s\S]*?food-grid \{[\s\S]*?grid-template-columns: repeat\(2, minmax\(0, 1fr\)\)/);
    assert.match(refinement, /max-width: 520px[\s\S]*?food-grid \{[\s\S]*?grid-template-columns: minmax\(0, 1fr\)/);
});


test("portrait footer is subordinate and uses only the required safe-area inset", () => {
    const refinement = css.split("Surgical food-tray and portrait-footer polish").at(-1);
    assert.match(refinement, /max-width: 900px\) and \(orientation: portrait\)[\s\S]*?site-footer \{[\s\S]*?display: grid[\s\S]*?gap: 1px[\s\S]*?min-height: 0[\s\S]*?font-size: 11px[\s\S]*?line-height: 1\.4/);
    assert.match(refinement, /padding: 3px 10px max\(3px, env\(safe-area-inset-bottom\)\)/);
    assert.match(refinement, /site-footer span,[\s\S]*?site-footer span:last-child \{[\s\S]*?display: block/);
});


test("tile selection stays synchronized through every food mutation", () => {
    assert.match(app, /function syncFoodTileSelections\(\)/);
    assert.match(app, /function refreshFoodExperience[\s\S]*?renderTray\(\);[\s\S]*?syncFoodTileSelections\(\)/);
    ["addFood", "changeFoodQuantity", "removeFood", "clearFoodDay"]
        .forEach(name => assert.match(app, new RegExp(`function ${name}\\([\\s\\S]*?refreshFoodExperience\\(\\)`)));
    assert.match(app, /undoClear\.addEventListener[\s\S]*?refreshFoodExperience\(\)/);
});


test("food help remains an independent explanation action", () => {
    const browserRenderer = app.match(/function renderFoodBrowser\(\) \{[\s\S]*?function syncFoodTileSelections/)[0];
    const helpBlock = browserRenderer.match(/const help = document\.createElement\("button"\)[\s\S]*?wrapper\.append\(tile, help\)/)[0];
    assert.doesNotMatch(helpBlock, /addFood|changeFoodQuantity/);
    assert.match(helpBlock, /help\.dataset\.coreExplanation = "food-portions"/);
    assert.doesNotMatch(browserRenderer, /tile\.addEventListener\("click"/);
});


test("live and screen-reader explanations stay concise and debounced", () => {
    assert.match(app, /modelComparisonMessage\(foodExperience\.currentState/);
    assert.match(app, /Everyday Movement model reference/);
    assert.match(app, /announcementTimer/);
    assert.match(app, /setTimeout\([\s\S]*?420/);
    assert.match(html, /class="stage-message core-response"[\s\S]*?aria-live="polite"/);
    assert.match(html, /id="narrationAnnouncement" role="status" aria-live="polite"/);
});


test("responsive shell presents hero and food first with timeline as the follow-up", () => {
    const refinement = css.split("Final food-row snapping and follow-up timeline order").at(-1);
    assert.match(css, /body\.core-mode \.core-workspace[\s\S]*?overflow: hidden !important/);
    assert.match(css, /body\.core-mode \.core-workspace \{[\s\S]*?align-items: stretch !important/);
    assert.match(app, /function placeCoreExperienceInReadingOrder\(\)[\s\S]*?workspace\.insertBefore\(hero, controlsPanel\)/);
    assert.ok(app.indexOf("placeCoreExperienceInReadingOrder();") < app.lastIndexOf("renderFoodBrowser();"));
    assert.match(html, /id="guideReplayButton"[\s\S]*?Show me how this works/);
    const controlsMarkup = html.match(/<aside class="panel controls-panel"[\s\S]*?<\/aside>/)[0];
    assert.doesNotMatch(controlsMarkup, /horizon-section|patternTimelineSection/);
    assert.ok(html.indexOf('id="patternTimelineSection"') > html.indexOf('id="foodBrowserSection"'));
    assert.match(refinement, /@media \(max-width: 900px\)[\s\S]*?grid-template-rows: minmax\(310px, 1\.25fr\) minmax\(275px, \.95fr\) auto/);
    assert.match(refinement, /body-stage \{[\s\S]*?grid-row: 1 !important[\s\S]*?#foodBrowserSection \{[\s\S]*?grid-row: 2 !important[\s\S]*?horizon-section \{[\s\S]*?grid-row: 3 !important/);
    assert.match(refinement, /@media \(min-width: 901px\)[\s\S]*?#foodBrowserSection \{[\s\S]*?grid-column: 1 !important[\s\S]*?grid-row: 1 !important[\s\S]*?body-stage \{[\s\S]*?grid-column: 2 !important[\s\S]*?grid-row: 1 !important/);
    assert.match(refinement, /horizon-section \{[\s\S]*?grid-column: 1 \/ -1 !important[\s\S]*?grid-row: 2 !important/);
    assert.match(refinement, /min-width: 521px\) and \(max-width: 900px\) and \(min-height: 851px\)[\s\S]*?grid-template-rows: 425px minmax\(319px, 1fr\) auto[\s\S]*?#foodGrid \{[\s\S]*?min-height: 84px !important/);
    assert.match(css, /#foodGrid[\s\S]*?overflow-y: auto !important/);
    assert.match(css, /@media \(max-width: 520px\)[\s\S]*?grid-template-columns: 90px minmax\(0, 1fr\) 112px !important/);
    assert.match(css, /body\.core-mode \.routing-stage \.routing-network \{[\s\S]*?display: block !important/);
    assert.match(css, /env\(safe-area-inset-bottom\)/);
});


test("landscape uses the dynamic Safari viewport instead of the compact-height fallback", () => {
    const refinement = css.split("Keep this responsive correction last").at(-1);
    assert.match(refinement, /min-width: 901px\) and \(orientation: landscape\)/);
    assert.match(refinement, /height: 100vh;[\s\S]*?height: 100svh;[\s\S]*?height: 100dvh/);
    assert.match(refinement, /core-workspace \{[\s\S]*?flex: 1 1 0%[\s\S]*?min-height: 0 !important[\s\S]*?grid-template-rows: minmax\(0, 1fr\) auto/);
    assert.match(refinement, /#foodBrowserSection \{[\s\S]*?height: auto !important[\s\S]*?max-height: none !important/);
    assert.match(refinement, /body-stage \{[\s\S]*?height: 100% !important[\s\S]*?min-height: 0 !important/);
});


test("core typography uses semantic roles instead of one broad enlargement", () => {
    const refinement = css.split("Focused hierarchy and unobstructed hero refinement").at(-1);
    assert.match(refinement, /brand h1 \{[\s\S]*?font-size: 19px/);
    assert.match(refinement, /core-food-heading,[\s\S]*?section-heading\) h2 \{[\s\S]*?font-size: 18px/);
    assert.match(refinement, /food-tile-copy strong \{[\s\S]*?font-size: 16px/);
    assert.match(refinement, /food-tile-copy small \{[\s\S]*?font-size: 14px/);
    assert.match(refinement, /food-browser-status \{[\s\S]*?font-size: 12px/);
    assert.match(refinement, /site-footer \{[\s\S]*?font-size: 12px[\s\S]*?line-height: 1\.45/);
    assert.match(refinement, /core-explanation-sheet p \{[\s\S]*?font-size: 16px[\s\S]*?line-height: 1\.65/);
});


test("response strip occupies normal hero flow without covering artwork", () => {
    const refinement = css.split("Focused hierarchy and unobstructed hero refinement").at(-1);
    assert.ok(html.indexOf('class="stage-message core-response"') > html.indexOf('class="routing-stage"'));
    assert.match(refinement, /core-workspace \.body-stage \{[\s\S]*?display: grid !important[\s\S]*?grid-template-rows: auto minmax\(0, 1fr\) auto/);
    assert.match(refinement, /routing-stage \{[\s\S]*?position: relative !important[\s\S]*?grid-template-rows: minmax\(0, 1fr\) !important/);
    assert.match(refinement, /stage-message\.core-response \{[\s\S]*?position: relative !important[\s\S]*?inset: auto !important[\s\S]*?display: block !important[\s\S]*?margin: 6px 10px 8px/);
    assert.match(refinement, /stage-message\.core-response p \{[\s\S]*?width: 100%[\s\S]*?overflow-wrap: break-word/);
    assert.match(refinement, /routing-stage \.human \{[\s\S]*?height: calc\(100% - 12px\) !important[\s\S]*?transform: none !important/);
    assert.match(refinement, /destination-stack \{[\s\S]*?top: 50% !important[\s\S]*?transform: translateY\(-50%\) !important/);
});


test("zoom-pressure layouts preserve a complete routing composition", () => {
    const refinement = css.split("Focused hierarchy and unobstructed hero refinement").at(-1);
    assert.match(refinement, /min-width: 521px\) and \(max-width: 900px\) and \(max-height: 850px\)[\s\S]*?grid-template-rows: 410px 430px auto !important/);
    assert.match(refinement, /core-workspace \.body-stage \{[\s\S]*?height: 410px !important[\s\S]*?min-height: 410px !important/);
    assert.match(refinement, /min-width: 521px\) and \(max-width: 650px\)[\s\S]*?grid-template-columns: 120px minmax\(0, 1fr\) 154px !important/);
    assert.match(refinement, /routing-stage \.route-card \{[\s\S]*?min-height: 46px !important/);
});


test("major core surfaces have restrained but distinct depth", () => {
    const refinement = css.split("Focused hierarchy and unobstructed hero refinement").at(-1);
    assert.match(refinement, /core-workspace \.body-stage \{[\s\S]*?linear-gradient\(155deg, rgba\(4, 17, 29/);
    assert.match(refinement, /horizon-section \{[\s\S]*?linear-gradient\(150deg, rgba\(10, 35, 54/);
    assert.match(refinement, /food-browser-section \{[\s\S]*?linear-gradient\(150deg, rgba\(12, 40, 57/);
    assert.match(refinement, /estimated-energy-summary \{[\s\S]*?background: rgba\(14, 43, 57, \.58\)/);
});


test("secondary help controls rest quietly and retain a strong focus state", () => {
    const refinement = css.split("Focused hierarchy and unobstructed hero refinement").at(-1);
    assert.match(refinement, /core-info-button \{[\s\S]*?border-color: rgba\(113, 172, 194, \.20\)[\s\S]*?box-shadow: none/);
    assert.match(refinement, /core-info-button:focus-visible \{[\s\S]*?outline: 2px solid #8bdcff[\s\S]*?outline-offset: 2px/);
    assert.match(refinement, /energy-info-button \{[\s\S]*?opacity: \.82/);
    assert.match(refinement, /energy-info-button:is\(:hover, :focus-visible, \[aria-expanded="true"\]\) \{[\s\S]*?opacity: 1/);
});


test("core helper text meets the iPad-first readability floor", () => {
    assert.match(css, /--muted: #a7bdca/);
    assert.match(css, /core-food-heading span,[\s\S]*?food-browser-intro,[\s\S]*?horizon-description \{[\s\S]*?font-size: 15px/);
    assert.match(css, /food-tile-copy small \{[\s\S]*?font-size: 14px/);
    assert.match(css, /food-filter,[\s\S]*?timeline-options button \{[\s\S]*?font-size: 15px/);
    assert.match(css, /site-footer \{[\s\S]*?font-size: 13px/);
    assert.match(css, /core-explanation-sheet p \{[\s\S]*?font-size: 16px[\s\S]*?line-height: 1\.65/);
    assert.match(css, /@media \(max-height: 700px\)[\s\S]*?food-browser-intro,[\s\S]*?horizon-description[\s\S]*?display: none/);
    assert.match(css, /Accessibility fallback: high zoom may scroll vertically, but never conceal controls/);
    assert.match(css, /max-height: 850px[\s\S]*?overflow-y: auto/);
    assert.match(css, /#foodGrid \{[\s\S]*?min-height: 130px !important/);
});


test("reduced motion replaces animated emphasis with static highlighting", () => {
    assert.match(css, /@media \(prefers-reduced-motion: reduce\)/);
    assert.match(css, /\.core-mode \.route-channel,[\s\S]*?transition: none !important/);
    assert.match(css, /\.body-stage\.is-emphasized \.destination-card[\s\S]*?outline:/);
    assert.match(css, /body\.core-mode \.body-stage\.is-emphasized \.route-card,[\s\S]*?outline: 2px[\s\S]*?transition: none !important/);
    assert.match(app, /setFlowMotionPaused\(reducedMotionPreference\.matches\)/);
});


test("motion control lives in stable hero chrome at every viewport", () => {
    const stageLabel = html.match(/<div class="stage-label">[\s\S]*?<\/div>\s*<div class="routing-stage"/)[0];
    assert.match(stageLabel, /id="motionToggle" aria-label="Pause motion"/);
    assert.equal([...html.matchAll(/id="motionToggle"/g)].length, 1);
    assert.match(app, /paused \? "Play motion" : "Pause motion"/);
    assert.match(css, /body\.core-mode \.body-stage \.stage-label \.motion-toggle[\s\S]*?position: static !important/);
    assert.match(css, /@media \(max-width: 520px\)[\s\S]*?\.stage-label \.motion-toggle[\s\S]*?display: inline-flex !important/);
});


test("relative assets support root and GitHub Pages subpath hosting", () => {
    const references = [...html.matchAll(/\b(?:src|href)="([^"]+)"/g)]
        .map(match => match[1])
        .filter(reference => !reference.startsWith("#"));
    references.forEach(reference => {
        assert.doesNotMatch(reference, /^\/(?!\/)/, reference);
        assert.doesNotMatch(reference, /file:\/\//, reference);
    });
    assert.match(html, /src="assets\/body\/body-anatomical-v4-alpha\.png"/);
    assert.match(html, /src="app\.js\?v=20260819-6"/);
});


test("scientific wording remains neutral and non-predictive", () => {
    assert.match(html, /An educational model using approximate food examples—not a measurement of digestion, metabolism, or an individual outcome/);
    assert.match(html, /Broad, familiar examples for exploring the model—never grades or prescriptions/);
    assert.doesNotMatch(html, />\s*(?:Good|Bad|Healthy|Unhealthy|Clean|Junk)\s*</i);
    assert.match(app, /selected day|selected foods/);
    assert.match(html, /© 2026 Anthony Adams\. All rights reserved\./);
});


test("history remains page-session only and does not persist the food day", () => {
    assert.match(app, /history\.replaceState/);
    assert.match(app, /foodLines: cloneLines/);
    assert.match(app, /version: 6/);
    assert.doesNotMatch(app, /localStorage\.setItem\([^)]*(?:food|day|tray)/i);
});
