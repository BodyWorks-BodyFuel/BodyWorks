/*
 * Body Fuel Flow Explorer — Visual Learning Guide interactions
 * Copyright © 2026 Anthony Adams. All rights reserved.
 */

"use strict";

const poolExamples = {
    everyday: {
        available: "60%",
        demand: "Everyday pull",
        explanation:
            "Everyday movement leaves a moderate pool available while some fuel continues toward storage and maintenance."
    },
    training: {
        available: "43%",
        demand: "Strong training pull",
        explanation:
            "Training raises the immediate pull toward working muscle, so less of the shared pool remains readily available."
    },
    surplus: {
        available: "82%",
        demand: "Lower pull relative to supply",
        explanation:
            "When supply is higher than the current pull, more fuel remains available and the branch toward storage becomes stronger."
    }
};

const cycleExamples = {
    store: {
        reserve: "Receiving surplus",
        explanation:
            "When supply remains above current demand, storage pressure rises over time."
    },
    release: {
        reserve: "Contributing fuel",
        explanation:
            "When current demand exceeds incoming supply, stored energy can return to the shared pool and support the body."
    }
};

const directionExamples = {
    higher: {
        current: "179",
        target: "190",
        arrow: "↗",
        summary:
            "For a higher target, supply above demand points in the intended direction.",
        results: {
            below: {
                tone: "away",
                label: "Away from target",
                detail: "Leans lower than 179"
            },
            near: {
                tone: "hold",
                label: "Holding pattern",
                detail: "Leans toward staying near 179"
            },
            above: {
                tone: "toward",
                label: "Toward target",
                detail: "Leans higher toward 190"
            }
        }
    },
    maintain: {
        current: "185",
        target: "185",
        arrow: "→",
        summary:
            "For a similar target, supply near demand supports the intended holding pattern.",
        results: {
            below: {
                tone: "away",
                label: "Leans lower",
                detail: "Moves away from 185"
            },
            near: {
                tone: "toward",
                label: "Maintaining",
                detail: "Leans toward staying near 185"
            },
            above: {
                tone: "away",
                label: "Leans higher",
                detail: "Moves away from 185"
            }
        }
    },
    lower: {
        current: "190",
        target: "179",
        arrow: "↘",
        summary:
            "For a lower target, supply below demand points in the intended direction.",
        results: {
            below: {
                tone: "toward",
                label: "Toward target",
                detail: "Leans lower toward 179"
            },
            near: {
                tone: "hold",
                label: "Holding pattern",
                detail: "Leans toward staying near 190"
            },
            above: {
                tone: "away",
                label: "Away from target",
                detail: "Leans higher than 190"
            }
        }
    }
};

const machineBoard = document.querySelector(".machine-board");
const machineRoutes = document.querySelector(".machine-routes");
const machineBodyImage = document.querySelector(".machine-body img");
const machinePool = document.querySelector(".shared-pool");

const anatomyRouteAnchors = {
    brain: { x: .50, y: .07 },
    liver: { x: .43, y: .35 },
    muscle: { x: .64, y: .70 },
    repair: { x: .64, y: .28 },
    glycogen: { x: .57, y: .64 },
    storage: { x: .53, y: .52 }
};

function pointInBoard(element, xRatio, yRatio, boardBounds) {
    const bounds = element.getBoundingClientRect();

    return {
        x: bounds.left - boardBounds.left + bounds.width * xRatio,
        y: bounds.top - boardBounds.top + bounds.height * yRatio
    };
}

function routeCurve(start, end) {
    const distance = end.x - start.x;
    const firstControl = start.x + Math.max(45, distance * .36);
    const secondControl = end.x - Math.max(45, distance * .24);

    return [
        `M ${start.x.toFixed(1)} ${start.y.toFixed(1)}`,
        `C ${firstControl.toFixed(1)} ${start.y.toFixed(1)},`,
        `${secondControl.toFixed(1)} ${end.y.toFixed(1)},`,
        `${end.x.toFixed(1)} ${end.y.toFixed(1)}`
    ].join(" ");
}

function setMachineRoute(pathId, start, end) {
    const path = document.getElementById(pathId);

    if (path) {
        path.setAttribute("d", routeCurve(start, end));
    }
}

function syncMachineRoutes() {
    if (!machineBoard || !machineRoutes || !machineBodyImage || !machinePool) {
        return;
    }

    const boardBounds = machineBoard.getBoundingClientRect();

    if (!boardBounds.width || !boardBounds.height) {
        return;
    }

    machineRoutes.setAttribute(
        "viewBox",
        `0 0 ${boardBounds.width.toFixed(1)} ${boardBounds.height.toFixed(1)}`
    );

    const poolCenter = pointInBoard(machinePool, .5, .5, boardBounds);

    [
        ["learnProteinIn", document.querySelector(".protein-node")],
        ["learnCarbsIn", document.querySelector(".carb-node")],
        ["learnFatsIn", document.querySelector(".fat-node")]
    ].forEach(([pathId, source]) => {
        if (source) {
            setMachineRoute(
                pathId,
                pointInBoard(source, 1, .5, boardBounds),
                poolCenter
            );
        }
    });

    const outputPaths = {
        brain: "learnBrainOut",
        liver: "learnLiverOut",
        muscle: "learnMuscleOut",
        repair: "learnRepairOut",
        glycogen: "learnGlycogenOut",
        storage: "learnStorageOut"
    };

    Object.entries(outputPaths).forEach(([routeName, pathId]) => {
        const target = document.querySelector(
            `[data-route-anchor="${routeName}"]`
        );
        const anchor = anatomyRouteAnchors[routeName];

        if (!target || !anchor) {
            return;
        }

        setMachineRoute(
            pathId,
            pointInBoard(machineBodyImage, anchor.x, anchor.y, boardBounds),
            pointInBoard(target, 0, .5, boardBounds)
        );
    });
}

if (machineBoard && "ResizeObserver" in window) {
    const machineRouteObserver = new ResizeObserver(syncMachineRoutes);

    machineRouteObserver.observe(machineBoard);
}

window.addEventListener("load", syncMachineRoutes);
window.requestAnimationFrame(syncMachineRoutes);

const arrivedFromExplorer =
    new URLSearchParams(window.location.search)
        .get("from") === "explorer";

document
    .querySelectorAll(".explorer-return-link")
    .forEach(link => {
        link.addEventListener("click", event => {
            if (!arrivedFromExplorer) {
                return;
            }

            event.preventDefault();

            if (window.history.length > 1) {
                window.history.back();
            } else {
                window.location.href = link.href;
            }
        });
    });

const poolDemo = document.querySelector(".pool-demo");
const poolValue = document.getElementById("learnPoolValue");
const demandLabel = document.getElementById("learnDemandLabel");
const poolExplanation = document.getElementById("poolExplanation");
const poolButtons = Array.from(document.querySelectorAll("[data-pool-state]"))
    .filter(element => element.matches("button"));

function selectPoolExample(state) {
    const example = poolExamples[state];

    if (!example || !poolDemo) {
        return;
    }

    poolDemo.dataset.poolState = state;
    poolValue.textContent = example.available;
    demandLabel.textContent = example.demand;
    poolExplanation.textContent = example.explanation;

    poolButtons.forEach(button => {
        button.setAttribute(
            "aria-pressed",
            String(button.dataset.poolState === state)
        );
    });
}

poolButtons.forEach(button => {
    button.addEventListener("click", () => {
        selectPoolExample(button.dataset.poolState);
    });
});

const cycleDemo = document.querySelector(".cycle-demo");
const cycleReserveLabel = document.getElementById("cycleReserveLabel");
const cycleExplanation = document.getElementById("cycleExplanation");
const cycleButtons = Array.from(document.querySelectorAll("[data-cycle-state]"))
    .filter(element => element.matches("button"));

function selectCycleExample(state) {
    const example = cycleExamples[state];

    if (!example || !cycleDemo) {
        return;
    }

    cycleDemo.dataset.cycleState = state;
    cycleReserveLabel.textContent = example.reserve;
    cycleExplanation.textContent = example.explanation;

    cycleButtons.forEach(button => {
        button.setAttribute(
            "aria-pressed",
            String(button.dataset.cycleState === state)
        );
    });
}

cycleButtons.forEach(button => {
    button.addEventListener("click", () => {
        selectCycleExample(button.dataset.cycleState);
    });
});

const directionDemo = document.querySelector(".direction-demo");
const directionCurrent = document.getElementById("directionCurrent");
const directionTarget = document.getElementById("directionTarget");
const directionArrow = document.getElementById("directionArrow");
const directionSummary = document.getElementById("directionSummary");
const directionButtons = Array.from(
    document.querySelectorAll("[data-goal-direction]")
).filter(element => element.matches("button"));

const directionResults = {
    below: {
        card: document.querySelector(".balance-below"),
        label: document.getElementById("belowResult"),
        detail: document.getElementById("belowDetail")
    },
    near: {
        card: document.querySelector(".balance-near"),
        label: document.getElementById("nearResult"),
        detail: document.getElementById("nearDetail")
    },
    above: {
        card: document.querySelector(".balance-above"),
        label: document.getElementById("aboveResult"),
        detail: document.getElementById("aboveDetail")
    }
};

function selectGoalDirection(direction) {
    const example = directionExamples[direction];

    if (!example || !directionDemo) {
        return;
    }

    directionDemo.dataset.goalDirection = direction;
    directionCurrent.textContent = example.current;
    directionTarget.textContent = example.target;
    directionArrow.textContent = example.arrow;
    directionSummary.textContent = example.summary;

    Object.entries(example.results).forEach(([supplyState, result]) => {
        const elements = directionResults[supplyState];

        elements.card.dataset.tone = result.tone;
        elements.label.textContent = result.label;
        elements.detail.textContent = result.detail;
    });

    directionButtons.forEach(button => {
        button.setAttribute(
            "aria-pressed",
            String(button.dataset.goalDirection === direction)
        );
    });
}

directionButtons.forEach(button => {
    button.addEventListener("click", () => {
        selectGoalDirection(button.dataset.goalDirection);
    });
});

let anchorTimer;

function showAnchorArrival() {
    const rawId = window.location.hash.slice(1);

    if (!rawId) {
        return;
    }

    const target = document.getElementById(decodeURIComponent(rawId));

    if (!target) {
        return;
    }

    const visibleTarget =
        target.classList.contains("anchor-alias")
            ? target.closest("article")
            : target;

    if (!visibleTarget) {
        return;
    }

    document
        .querySelectorAll(".anchor-arrival")
        .forEach(element => element.classList.remove("anchor-arrival"));

    visibleTarget.classList.add("anchor-arrival");

    window.clearTimeout(anchorTimer);
    anchorTimer = window.setTimeout(() => {
        visibleTarget.classList.remove("anchor-arrival");
    }, 1900);
}

window.addEventListener("hashchange", showAnchorArrival);
window.addEventListener("load", showAnchorArrival);
