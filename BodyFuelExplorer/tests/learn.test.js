"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const projectRoot = path.resolve(__dirname, "..");

const explorerHtml = fs.readFileSync(
    path.join(projectRoot, "index.html"),
    "utf8"
);

const explorerApp = fs.readFileSync(
    path.join(projectRoot, "app.js"),
    "utf8"
);

const learnHtml = fs.readFileSync(
    path.join(projectRoot, "learn.html"),
    "utf8"
);

const learnCss = fs.readFileSync(
    path.join(projectRoot, "learn.css"),
    "utf8"
);

const learnApp = fs.readFileSync(
    path.join(projectRoot, "learn.js"),
    "utf8"
);


test("the visual guide is fully local and all of its resources exist", () => {
    const references = [
        ...learnHtml.matchAll(/\b(?:src|href)="([^"]+)"/g)
    ].map(match => match[1]);

    const externalReferences = references.filter(reference =>
        reference.startsWith("http:") ||
        reference.startsWith("https:") ||
        reference.startsWith("//")
    );

    assert.deepEqual(externalReferences, []);

    references
        .filter(reference => !reference.startsWith("#"))
        .map(reference => reference.split(/[?#]/)[0])
        .filter(Boolean)
        .forEach(reference => {
            assert.equal(
                fs.existsSync(path.join(projectRoot, reference)),
                true,
                `Missing learning-guide resource: ${reference}`
            );
        });
});


test("learning-guide IDs are unique and cover the high-value concepts", () => {
    const ids = [
        ...learnHtml.matchAll(/\bid="([^"]+)"/g)
    ].map(match => match[1]);

    const uniqueIds = new Set(ids);

    assert.equal(uniqueIds.size, ids.length);

    [
        "machine",
        "protein",
        "carbohydrates",
        "fats",
        "fuel-pool",
        "brain-fuel",
        "liver-processing",
        "working-muscles",
        "repair",
        "glycogen",
        "fat-storage",
        "stored-fuel-release",
        "activity-demand",
        "body-goal",
        "goal-direction",
        "approximate-fuel-in",
        "macro-locks",
        "viewing-horizon",
        "what-this-model-is"
    ].forEach(id => {
        assert.equal(uniqueIds.has(id), true, `Missing guide anchor: ${id}`);
    });
});


test("every explorer tooltip deep link resolves to the visual guide", () => {
    const guideIds = new Set([
        ...learnHtml.matchAll(/\bid="([^"]+)"/g)
    ].map(match => match[1]));

    const learnTargets = [
        ...explorerHtml.matchAll(/\bdata-learn-target="([^"]+)"/g)
    ].map(match => match[1]);

    assert.ok(learnTargets.length >= 12);

    learnTargets.forEach(target => {
        assert.equal(
            guideIds.has(target),
            true,
            `Explorer links to missing guide section: ${target}`
        );
    });

    assert.match(explorerHtml, /class="learn-link" href="learn\.html\?from=explorer"/);
    assert.match(explorerHtml, /id="infoPopoverLink"/);
    assert.match(explorerApp, /`learn\.html\?from=explorer#\$\{learnTarget\}`/);
    assert.match(explorerHtml, /data-learn-target="goal-direction"/);
});


test("the guide keeps a visible route back to the originating explorer", () => {
    const returnLinks = [
        ...learnHtml.matchAll(/class="[^"]*explorer-return-link[^"]*"/g)
    ];

    assert.equal(returnLinks.length, 3);
    assert.match(learnCss, /\.learn-topbar \{[\s\S]*?position: sticky;/);
    assert.match(learnApp, /const arrivedFromExplorer =/);
    assert.match(learnApp, /window\.history\.back\(\)/);
    assert.match(learnApp, /window\.location\.href = link\.href/);
});


test("the learning guide keeps section navigation and a route back to the top visible", () => {
    assert.match(learnHtml, /class="learn-shell" id="learnTop"/);
    assert.match(learnHtml, /class="learn-nav-top" href="#learnTop">↑ Top<\/a>/);
    assert.match(learnHtml, /class="learn-nav-links"/);
    assert.match(learnCss, /\.learn-nav \{[\s\S]*?position: sticky;[\s\S]*?top: 76px;/);
    assert.match(learnCss, /\.learn-nav-links \{[\s\S]*?display: flex;/);
    assert.match(learnCss, /\[id\] \{[\s\S]*?scroll-margin-top: 142px;/);
});


test("machine routes follow anatomy anchors and terminate at matching destination cards", () => {
    const routeAnchors = [
        ...learnHtml.matchAll(/\bdata-route-anchor="([^"]+)"/g)
    ].map(match => match[1]);

    assert.deepEqual(routeAnchors, [
        "brain",
        "liver",
        "muscle",
        "repair",
        "glycogen",
        "storage"
    ]);

    assert.match(learnApp, /const anatomyRouteAnchors =/);
    assert.match(learnApp, /function syncMachineRoutes\(\)/);
    assert.match(learnApp, /pointInBoard\(machineBodyImage, anchor\.x, anchor\.y, boardBounds\)/);
    assert.match(learnApp, /pointInBoard\(target, 0, \.5, boardBounds\)/);
    assert.match(learnApp, /new ResizeObserver\(syncMachineRoutes\)/);
    assert.match(learnCss, /\.machine-destinations \{[\s\S]*?grid-template-columns: minmax\(0, 1fr\);/);
});


test("the teaching interactions start in one clear selected state", () => {
    const poolStates = [
        ...learnHtml.matchAll(/<button[^>]+data-pool-state="[^"]+"[^>]+aria-pressed="(true|false)"/g)
    ];

    const cycleStates = [
        ...learnHtml.matchAll(/<button[^>]+data-cycle-state="[^"]+"[^>]+aria-pressed="(true|false)"/g)
    ];

    const directionStates = [
        ...learnHtml.matchAll(/<button[^>]+data-goal-direction="[^"]+"[^>]+aria-pressed="(true|false)"/g)
    ];

    assert.equal(poolStates.length, 3);
    assert.equal(cycleStates.length, 2);
    assert.equal(directionStates.length, 3);
    assert.equal(poolStates.filter(match => match[1] === "true").length, 1);
    assert.equal(cycleStates.filter(match => match[1] === "true").length, 1);
    assert.equal(directionStates.filter(match => match[1] === "true").length, 1);

    assert.match(learnApp, /function selectPoolExample\(state\)/);
    assert.match(learnApp, /function selectCycleExample\(state\)/);
    assert.match(learnApp, /function selectGoalDirection\(direction\)/);
    assert.match(learnApp, /setAttribute\(\s*"aria-pressed"/);
});


test("goal direction explains higher, maintaining and lower targets without predicting pace", () => {
    assert.match(learnHtml, /Supply versus demand sets direction—not speed/i);
    assert.match(learnHtml, /<output id="directionCurrent">179<\/output>/);
    assert.match(learnHtml, /<output id="directionTarget">190<\/output>/);
    assert.match(learnHtml, /Direction only:[\s\S]*does not predict how much weight changes/i);

    assert.match(learnApp, /higher:[\s\S]*Scenario points toward target[\s\S]*Leans higher toward 190/);
    assert.match(learnApp, /maintain:[\s\S]*Scenario near modeled balance[\s\S]*near modeled demand/);
    assert.match(learnApp, /lower:[\s\S]*Scenario points toward target[\s\S]*Leans lower toward 179/);
});


test("the guide reuses the anatomy system and all biology icon families", () => {
    [
        "assets/body/body-anatomical-v4-alpha.png",
        "input-protein.png",
        "input-carbohydrates.png",
        "input-fats.png",
        "destination-brain.png",
        "destination-liver.png",
        "destination-muscle.png",
        "destination-repair.png",
        "destination-glycogen.png",
        "destination-fat-storage.png"
    ].forEach(asset => {
        assert.match(learnHtml, new RegExp(asset.replaceAll(".", "\\.")));
    });
});


test("the guide states its conceptual limits and respects reduced motion", () => {
    assert.match(learnHtml, /relationship explorer, not a biological forecast/i);
    assert.match(learnHtml, /not literal pipes or exact calories/i);
    assert.match(learnHtml, /does not show[\s\S]*medical advice or an individual outcome/i);
    assert.match(learnCss, /@media \(prefers-reduced-motion: reduce\)/);
    assert.match(learnCss, /\.machine-routes circle,[\s\S]*display: none;/);
});
