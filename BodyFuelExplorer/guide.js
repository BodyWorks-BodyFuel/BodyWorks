/*
 * Body Fuel Flow Explorer — optional guided learning wrapper
 * Copyright © 2026 Anthony Adams. All rights reserved.
 */

(function attachBodyFuelGuide(root, factory) {
    const api = factory();

    if (typeof module === "object" && module.exports) {
        module.exports = api;
    }

    root.BodyFuelGuide = api;

    if (root.document) {
        api.initialize(root);
    }
}(
    typeof globalThis !== "undefined" ? globalThis : this,
    function createBodyFuelGuide() {
        "use strict";

        const stepCount = 7;
        const preferenceKey = "bodyFuelExplorerGuideV1";

        class GuideStateMachine {
            constructor() {
                this.reset();
            }

            reset() {
                this.active = false;
                this.step = 0;
                this.snapshot = null;
                this.wellLoaded = false;
                this.contrastLoaded = false;
                this.weeksSeen = false;
                this.viewedEdges = new Set();
            }

            start(snapshot) {
                this.reset();
                this.active = true;
                this.step = 1;
                this.snapshot = snapshot;
                return this.step;
            }

            go(step) {
                if (!this.active) return this.step;
                this.step = Math.max(1, Math.min(stepCount, Number(step)));
                return this.step;
            }

            next() {
                if (this.step === 2 && !this.wellLoaded) return this.step;
                if (this.step === 3 && !this.contrastLoaded) return this.step;
                if (this.step === 6 && !this.weeksSeen) return this.step;
                return this.go(this.step + 1);
            }

            back() {
                return this.go(this.step - 1);
            }

            markWellLoaded() {
                this.wellLoaded = true;
            }

            markContrastLoaded() {
                this.contrastLoaded = true;
            }

            markEdgeViewed(name) {
                this.viewedEdges.add(name);
            }

            markWeeks() {
                this.weeksSeen = true;
            }

            finish() {
                this.active = false;
            }
        }

        function initialize(browserRoot) {
            const doc = browserRoot.document;
            const bridge = browserRoot.BodyFuelExplorerGuideBridge;
            const scenarioApi = browserRoot.BodyFuelGuideScenarios;
            if (!bridge || !scenarioApi) return null;

            const scenarios = scenarioApi.buildScenarios();
            const validation = scenarioApi.validateScenarios(scenarios);
            if (!validation.valid) {
                console.warn("The optional guide is unavailable because its teaching scenarios need review.");
                return null;
            }

            const elements = {
                replay: doc.getElementById("guideReplayButton"),
                invitation: doc.getElementById("guideInvitation"),
                invitationStart: doc.getElementById("guideInvitationStart"),
                invitationDismiss: doc.getElementById("guideInvitationDismiss"),
                dimmer: doc.getElementById("guideDimmer"),
                coach: doc.getElementById("guideCoach"),
                progress: doc.getElementById("guideProgress"),
                title: doc.getElementById("guideTitle"),
                body: doc.getElementById("guideBody"),
                status: doc.getElementById("guideActionStatus"),
                actions: doc.getElementById("guidePrimaryActions"),
                back: doc.getElementById("guideBack"),
                next: doc.getElementById("guideNext"),
                exit: doc.getElementById("guideExit"),
                announcer: doc.getElementById("guideAnnouncer")
            };
            const machine = new GuideStateMachine();
            const labelByKey = {
                fuel: "Brain & Essential Fuel",
                liver: "Liver Processing",
                muscle: "Working Muscles",
                repair: "Repair & Rebuilding",
                glycogen: "Glycogen Storage",
                storage: "Fat Storage",
                fatUse: "Fat as Fuel",
                release: "Stored Reserves Released"
            };
            const selectorByKey = {
                fuel: ".destination-brain, [data-route=\"fuel\"]",
                liver: ".destination-liver, [data-route=\"liver\"]",
                muscle: ".destination-muscle, [data-route=\"muscle\"]",
                repair: ".destination-repair, [data-route=\"repair\"]",
                glycogen: ".destination-glycogen, [data-route=\"glycogen\"]",
                storage: ".destination-storage, [data-route=\"storage\"]",
                fatUse: ".destination-fat-use, [data-route=\"fatUse\"]",
                release: ".destination-fat-use, [data-route=\"release\"]"
            };
            let previousFocus = null;
            let activeTarget = null;
            let activeHighlight = null;
            let activeVisibilityTarget = null;
            let targetDescription = null;
            let resizeFrame = null;
            let visibilityTimer = null;
            let dockObserver = null;
            let feedbackSnapshots = [];

            const prefersReducedMotion = () =>
                browserRoot.matchMedia("(prefers-reduced-motion: reduce)").matches;

            function readPreference() {
                try {
                    return browserRoot.localStorage.getItem(preferenceKey);
                } catch (error) {
                    return null;
                }
            }

            function rememberPreference(value) {
                try {
                    browserRoot.localStorage.setItem(preferenceKey, value);
                } catch (error) {
                    // The permanent replay control still works without storage.
                }
            }

            function announce(message) {
                elements.announcer.textContent = "";
                browserRoot.setTimeout(() => {
                    elements.announcer.textContent = message;
                }, 30);
            }

            function clearSpotlight() {
                if (activeTarget) {
                    if (targetDescription === null) {
                        activeTarget.removeAttribute("aria-describedby");
                    } else {
                        activeTarget.setAttribute("aria-describedby", targetDescription);
                    }
                }
                activeHighlight?.classList.remove("guide-spotlight-target");
                activeTarget?.removeAttribute("data-guide-target-active");
                activeVisibilityTarget?.removeAttribute("data-guide-visibility-target");
                activeTarget = null;
                activeHighlight = null;
                activeVisibilityTarget = null;
                targetDescription = null;
            }

            function clearHeldEmphasis() {
                const stage = doc.querySelector(".body-stage");
                stage?.classList.remove("guide-held-emphasis");
                doc.querySelectorAll(".guide-held-target")
                    .forEach(element => element.classList.remove("guide-held-target"));
            }

            function holdEmphasis(keys) {
                clearHeldEmphasis();
                const stage = doc.querySelector(".body-stage");
                stage?.classList.add("guide-held-emphasis");
                keys.forEach(key => {
                    doc.querySelectorAll(selectorByKey[key] || "")
                        .forEach(element => element.classList.add("guide-held-target"));
                });
            }

            function guideScrollBehavior() {
                const state = bridge.getState?.() || {};
                return prefersReducedMotion() || state.motionPaused ? "auto" : "smooth";
            }

            function syncDockReservation() {
                if (!machine.active || elements.coach.hidden) return;
                const height = Math.ceil(elements.coach.getBoundingClientRect().height);
                const previous = Number.parseFloat(
                    doc.documentElement.style.getPropertyValue("--guide-dock-height")
                ) || 0;
                if (Math.abs(height - previous) < 1) return;
                doc.documentElement.style.setProperty("--guide-dock-height", `${height}px`);
                scheduleTargetVisibility({ delay: 0 });
            }

            function suppressFeedbackWidgets() {
                const selectors = [
                    "#feedbackWidget",
                    ".feedback-widget",
                    "[data-feedback-widget]",
                    "iframe[title*='feedback' i]"
                ];
                feedbackSnapshots = [...doc.querySelectorAll(selectors.join(","))].map(node => ({
                    node,
                    inert: node.inert,
                    ariaHidden: node.getAttribute("aria-hidden")
                }));
                feedbackSnapshots.forEach(({ node }) => {
                    node.classList.add("guide-feedback-suppressed");
                    node.inert = true;
                    node.setAttribute("aria-hidden", "true");
                });
            }

            function restoreFeedbackWidgets() {
                feedbackSnapshots.forEach(({ node, inert, ariaHidden }) => {
                    node.classList.remove("guide-feedback-suppressed");
                    node.inert = inert;
                    if (ariaHidden === null) node.removeAttribute("aria-hidden");
                    else node.setAttribute("aria-hidden", ariaHidden);
                });
                feedbackSnapshots = [];
            }

            function visibilityElementFor(target) {
                if (target.closest?.(".routing-stage")) {
                    return doc.querySelector(".routing-stage") || target;
                }
                if (target.closest?.("#patternTimelineSection")) {
                    return doc.getElementById("patternTimelineSection") || target;
                }
                return target;
            }

            function layoutSnapshot() {
                const dock = elements.coach.getBoundingClientRect();
                const target = activeTarget?.getBoundingClientRect() || null;
                const visibilityTarget = activeVisibilityTarget?.getBoundingClientRect() || target;
                const safeTop = 8;
                const safeBottom = Math.max(safeTop + 44, dock.top - 18);
                const compactRect = rect => rect && ({
                    top: rect.top,
                    right: rect.right,
                    bottom: rect.bottom,
                    left: rect.left,
                    width: rect.width,
                    height: rect.height
                });
                return {
                    dock: compactRect(dock),
                    target: compactRect(target),
                    visibilityTarget: compactRect(visibilityTarget),
                    safeRegion: { top: safeTop, bottom: safeBottom, height: safeBottom - safeTop }
                };
            }

            function ensureTargetVisible({ settle = true, instant = false } = {}) {
                if (!machine.active || !activeTarget || elements.coach.hidden) return;
                const behavior = instant ? "auto" : guideScrollBehavior();
                browserRoot.requestAnimationFrame(() => {
                    if (!activeVisibilityTarget) return;
                    const { visibilityTarget, safeRegion } = layoutSnapshot();
                    if (!visibilityTarget) return;
                    const margin = 16;
                    const available = safeRegion.height - margin * 2;
                    let delta = 0;
                    if (visibilityTarget.height <= available) {
                        if (visibilityTarget.top < safeRegion.top + margin) {
                            delta = visibilityTarget.top - safeRegion.top - margin;
                        } else if (visibilityTarget.bottom > safeRegion.bottom - margin) {
                            delta = visibilityTarget.bottom - safeRegion.bottom + margin;
                        }
                    } else {
                        delta = visibilityTarget.top - safeRegion.top - margin;
                    }
                    if (Math.abs(delta) > 1) {
                        browserRoot.scrollBy({ top: delta, behavior });
                    }
                    if (settle && behavior === "smooth") {
                        browserRoot.setTimeout(() =>
                            ensureTargetVisible({ settle: false, instant: true }), 280);
                    }
                });
            }

            function scheduleTargetVisibility({ delay = 40, focus = false } = {}) {
                browserRoot.clearTimeout(visibilityTimer);
                visibilityTimer = browserRoot.setTimeout(() => {
                    syncDockReservation();
                    ensureTargetVisible();
                    browserRoot.setTimeout(() => {
                        if (focus && activeTarget) activeTarget.focus({ preventScroll: true });
                        ensureTargetVisible({ settle: false, instant: true });
                    }, guideScrollBehavior() === "auto" ? 0 : 260);
                }, delay);
            }

            function spotlight(target, { focus = false } = {}) {
                clearSpotlight();
                activeTarget = typeof target === "string" ? doc.querySelector(target) : target;
                if (!activeTarget) return;
                targetDescription = activeTarget.getAttribute("aria-describedby");
                activeHighlight = focus
                    ? activeTarget.closest(".timeline-options") || activeTarget
                    : activeTarget;
                activeVisibilityTarget = visibilityElementFor(activeTarget);
                activeHighlight.classList.add("guide-spotlight-target");
                activeTarget.setAttribute("data-guide-target-active", "true");
                activeVisibilityTarget.setAttribute("data-guide-visibility-target", "true");
                if (!focus) {
                    activeTarget.setAttribute("aria-describedby", "guideBody");
                }
                scheduleTargetVisibility({ delay: 0, focus });
            }

            function actionButton(label, action, className = "") {
                const button = doc.createElement("button");
                button.type = "button";
                button.textContent = label;
                if (className) button.className = className;
                button.addEventListener("click", action);
                elements.actions.append(button);
                return button;
            }

            function setCopy(title, paragraphs) {
                elements.title.textContent = title;
                elements.body.replaceChildren();
                paragraphs.forEach(paragraph => {
                    const node = doc.createElement("p");
                    node.textContent = paragraph;
                    elements.body.append(node);
                });
            }

            function formatEnergy(value) {
                return Math.round(value).toLocaleString("en-US");
            }

            function largestChangeCopy() {
                const names = scenarios.aboveReference.largestChanges
                    .slice(0, 3)
                    .map(change => labelByKey[change.key]);
                return names.length > 1
                    ? `${names.slice(0, -1).join(", ")} and ${names.at(-1)}`
                    : names[0];
            }

            function renderStep({ focusCard = true } = {}) {
                clearSpotlight();
                clearHeldEmphasis();
                elements.actions.replaceChildren();
                elements.status.textContent = "";
                elements.progress.textContent = `${machine.step} of ${stepCount}`;
                elements.back.hidden = machine.step === 1;
                elements.next.hidden = false;
                elements.next.textContent = machine.step === 6 && machine.weeksSeen ? "Finish" : "Next";

                if (machine.step === 1) {
                    setCopy("Start with the visible comparison", [
                        `Selected food energy is compared with the fixed ${scenarios.reference.label} model context of about ${formatEnergy(scenarios.reference.energy)} kcal/day.`,
                        "That is a general model scenario—not your calorie requirement, target, or measured energy use."
                    ]);
                    spotlight(".estimated-energy-summary");
                }

                if (machine.step === 2) {
                    setCopy("Load a well-matched example", machine.wellLoaded ? [
                        `This selected modeled day is about ${formatEnergy(scenarios.wellMatched.totalEnergy)} kcal, ${Math.abs(scenarios.wellMatched.differenceFromReference)} kcal from the reference.`,
                        "Its visible priorities are relatively distributed. “Well-matched” applies only to this scenario and reference."
                    ] : [
                        "Use the real explorer to load a familiar, varied day that sits near the fixed model reference."
                    ]);
                    if (!machine.wellLoaded) {
                        elements.next.hidden = true;
                        actionButton("Load the well-matched example", () => {
                            bridge.loadScenario(scenarios.wellMatched.lines, {
                                timeline: 0,
                                preserveBrowser: true
                            });
                            machine.markWellLoaded();
                            announce("Well-matched example loaded in the explorer.");
                            renderStep();
                        }, "guide-primary-action");
                        spotlight(".estimated-energy-summary");
                    } else {
                        spotlight(".stage-message");
                    }
                }

                if (machine.step === 3) {
                    const changed = largestChangeCopy();
                    setCopy("Watch the hero reprioritize", machine.contrastLoaded ? [
                        `This teaching contrast makes changes in ${changed} easier to see.`,
                        "The body, pathways, and response cards are the lesson here; food search and saved-food organization have their own My Food flow guide."
                    ] : [
                        "Load a temporary stronger contrast and watch the hero, pathways, and response cards change together.",
                        "This example is for learning the display—not a suggested eating pattern."
                    ]);
                    if (!machine.contrastLoaded) {
                        elements.next.hidden = true;
                        actionButton("Show the hero contrast", () => {
                            bridge.loadScenario(scenarios.aboveReference.lines, {
                                timeline: 0,
                                preserveBrowser: true
                            });
                            machine.markContrastLoaded();
                            announce("Hero contrast loaded in the explorer.");
                            renderStep();
                        }, "guide-primary-action");
                        spotlight(".routing-stage");
                    } else {
                        holdEmphasis(scenarios.aboveReference.largestChanges.map(change => change.key));
                        spotlight(".destination-stack");
                    }
                }

                if (machine.step === 4) {
                    const changed = largestChangeCopy();
                    setCopy("Read brighter as relative emphasis", [
                        `${changed} changed most when the combined selected pattern moved above the model reference.`,
                        "Brighter means stronger relative emphasis in this conceptual model—not literal glowing flow, a measurement, diagnosis, or one food directly becoming stored body fat."
                    ]);
                    holdEmphasis(scenarios.aboveReference.largestChanges.map(change => change.key));
                    const leadKey = scenarios.aboveReference.largestChanges[0].key;
                    spotlight((selectorByKey[leadKey] || "").split(",")[0]);
                }

                if (machine.step === 5) {
                    setCopy("Explore the edges", [
                        "Extreme examples make visual differences easier to recognize. They are demonstrations—not suggested eating patterns or predictions of an individual outcome."
                    ]);
                    const above = actionButton("Much more than the model reference", () => {
                        bridge.loadScenario(scenarios.aboveReference.lines, {
                            timeline: 0,
                            preserveBrowser: true
                        });
                        machine.markEdgeViewed("above");
                        elements.status.textContent =
                            `${formatEnergy(scenarios.aboveReference.totalEnergy)} kcal in this modeled day; processing and storage tendencies become more prominent.`;
                        above.setAttribute("aria-pressed", "true");
                        holdEmphasis(["liver", "storage", "repair"]);
                        announce("Above-reference teaching contrast loaded.");
                        scheduleTargetVisibility();
                    }, "guide-edge-action");
                    above.setAttribute("aria-pressed", String(machine.viewedEdges.has("above")));
                    const below = actionButton("Much less than the model reference", () => {
                        bridge.loadScenario(scenarios.belowReference.lines, {
                            timeline: 0,
                            preserveBrowser: true
                        });
                        machine.markEdgeViewed("below");
                        elements.status.textContent =
                            `${formatEnergy(scenarios.belowReference.totalEnergy)} kcal in this deliberately exaggerated modeled day; reserve contribution becomes prominent.`;
                        below.setAttribute("aria-pressed", "true");
                        holdEmphasis(["release", "fatUse"]);
                        announce("Below-reference teaching contrast loaded.");
                        scheduleTargetVisibility();
                    }, "guide-edge-action");
                    below.setAttribute("aria-pressed", String(machine.viewedEdges.has("below")));
                    spotlight(".estimated-energy-summary");
                }

                if (machine.step === 6) {
                    setCopy("Try the repeated-pattern lens", machine.weeksSeen ? [
                        "Weeks repeats the same selected daily relationship as a lens. It does not advance time instantly, multiply displayed calories, or predict what will happen to you.",
                        "The brighter shifts show which conceptual priorities become easier to see when that same pattern is viewed across weeks."
                    ] : [
                        "Choose the real Weeks control. The guide will wait for that selection."
                    ]);
                    if (!machine.weeksSeen) {
                        elements.next.hidden = true;
                        spotlight('[data-timeline="2"]', { focus: true });
                    } else {
                        holdEmphasis(["repair", "storage", "fatUse", "release"]);
                        spotlight("#patternTimelineSection");
                    }
                }

                if (machine.step === 7) {
                    setCopy("Now make the explorer yours", [
                        "Foods + visible model context + repeated timeline = changing hero priorities.",
                        "Restore what you had before the tour, or keep the temporary teaching example."
                    ]);
                    elements.back.hidden = false;
                    elements.next.hidden = true;
                    actionButton("Restore what I had", () => complete("restore"), "guide-primary-action");
                    actionButton("Keep this example", () => complete("keep"));
                    spotlight(elements.replay);
                }

                elements.coach.scrollTop = 0;
                if (focusCard) {
                    browserRoot.requestAnimationFrame(() => {
                        elements.title.tabIndex = -1;
                        elements.title.focus({ preventScroll: true });
                        syncDockReservation();
                        scheduleTargetVisibility();
                    });
                }
                announce(`Guide step ${machine.step} of ${stepCount}. ${elements.title.textContent}`);
            }

            function startGuide(trigger = elements.replay) {
                if (machine.active) return;
                browserRoot.BodyFuelFoodFlowController?.exit?.();
                previousFocus = trigger || doc.activeElement;
                elements.invitation.hidden = true;
                machine.start(bridge.capture());
                doc.body.classList.add("guide-active");
                doc.documentElement.classList.add("guide-active");
                suppressFeedbackWidgets();
                elements.dimmer.hidden = false;
                elements.coach.hidden = false;
                renderStep();
                doc.fonts?.ready?.then(() => scheduleTargetVisibility());
            }

            function closeGuide({ restore = true, preference = "dismissed" } = {}) {
                if (!machine.active) return;
                clearSpotlight();
                clearHeldEmphasis();
                if (restore) bridge.restore(machine.snapshot);
                rememberPreference(preference);
                machine.finish();
                doc.body.classList.remove("guide-active");
                doc.documentElement.classList.remove("guide-active");
                elements.dimmer.hidden = true;
                elements.coach.hidden = true;
                restoreFeedbackWidgets();
                browserRoot.clearTimeout(visibilityTimer);
                doc.documentElement.style.removeProperty("--guide-dock-height");
                announce(restore
                    ? "Guide closed. Your prior explorer state was restored."
                    : "Guide closed.");
                browserRoot.requestAnimationFrame(() =>
                    (elements.replay || previousFocus)?.focus({ preventScroll: true })
                );
            }

            function complete(choice) {
                if (choice === "restore") bridge.restore(machine.snapshot);
                if (choice === "keep") bridge.persist();
                closeGuide({ restore: false, preference: "completed" });
            }

            function goNext() {
                const before = machine.step;
                machine.next();
                if (machine.step !== before) renderStep();
            }

            function goBack() {
                if (machine.step === 4) {
                    bridge.loadScenario(scenarios.wellMatched.lines, {
                        timeline: 0,
                        preserveBrowser: true
                    });
                    machine.contrastLoaded = false;
                }
                if (machine.step === 5) {
                    bridge.loadScenario(scenarios.aboveReference.lines, {
                        timeline: 0,
                        preserveBrowser: true
                    });
                }
                machine.back();
                renderStep();
            }

            elements.replay.addEventListener("click", () => startGuide(elements.replay));
            elements.invitationStart.addEventListener("click", () => startGuide(elements.invitationStart));
            elements.invitationDismiss.addEventListener("click", () => {
                elements.invitation.hidden = true;
                rememberPreference("dismissed");
                announce("Guided example dismissed. You can reopen it from the header.");
            });
            elements.exit.addEventListener("click", () => closeGuide());
            elements.next.addEventListener("click", goNext);
            elements.back.addEventListener("click", goBack);

            doc.addEventListener("click", event => {
                if (!machine.active) return;
                const timeline = event.target.closest("[data-timeline]");
                if (machine.step === 6 && timeline?.dataset.timeline === "2") {
                    machine.markWeeks();
                    announce("Weeks selected in the real Pattern Timeline.");
                    browserRoot.setTimeout(() => renderStep(), 120);
                }
            });

            doc.addEventListener("keydown", event => {
                if (!machine.active || event.key !== "Escape") return;
                if (event.defaultPrevented || doc.getElementById("coreExplanationDialog")?.open) return;
                event.preventDefault();
                closeGuide();
            });

            const handleViewportChange = () => {
                browserRoot.cancelAnimationFrame(resizeFrame);
                resizeFrame = browserRoot.requestAnimationFrame(() => {
                    syncDockReservation();
                    scheduleTargetVisibility({ delay: 60 });
                });
            };
            browserRoot.addEventListener("resize", handleViewportChange);
            browserRoot.addEventListener("orientationchange", handleViewportChange);
            if ("ResizeObserver" in browserRoot) {
                dockObserver = new browserRoot.ResizeObserver(syncDockReservation);
                dockObserver.observe(elements.coach);
            }

            const offerInvitation = () => {
                if (!readPreference() && !doc.querySelector("dialog[open]")) {
                    elements.invitation.hidden = false;
                }
            };
            browserRoot.addEventListener("bodyfuel:intro-closed", offerInvitation);
            browserRoot.setTimeout(offerInvitation, 550);

            const controller = Object.freeze({
                machine,
                scenarios,
                start: startGuide,
                exit: closeGuide,
                complete,
                renderStep,
                getLayoutSnapshot: layoutSnapshot
            });
            browserRoot.BodyFuelGuideController = controller;
            return controller;
        }

        return Object.freeze({ GuideStateMachine, initialize, preferenceKey, stepCount });
    }
));
