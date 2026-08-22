/*
 * Body Fuel Flow Explorer — My Foods learning wrapper
 * Copyright © 2026 Anthony Adams. All rights reserved.
 */
(function (root, factory) {
    const api = factory();
    if (typeof module === "object" && module.exports) module.exports = api;
    if (root) root.BodyFuelFoodFlow = api;
    if (root?.document) api.initialize(root);
}(typeof window !== "undefined" ? window : globalThis, function () {
    "use strict";

    const stepCount = 7;

    class FoodFlowGuideStateMachine {
        constructor() {
            this.reset();
        }

        reset() {
            this.active = false;
            this.step = 0;
            this.snapshot = null;
            this.demoFood = null;
            this.saved = false;
            this.activated = false;
        }

        start(snapshot) {
            this.reset();
            this.active = true;
            this.step = 1;
            this.snapshot = snapshot;
        }

        go(step) {
            if (!this.active) return this.step;
            this.step = Math.max(1, Math.min(stepCount, Number(step)));
            return this.step;
        }

        next() {
            if (this.step === 2 && !this.demoFood) return this.step;
            if (this.step === 3 && !this.saved) return this.step;
            if (this.step === 4 && !this.activated) return this.step;
            return this.go(this.step + 1);
        }
    }

    function initialize(browserRoot) {
        const doc = browserRoot.document;
        const bridge = browserRoot.BodyFuelExplorerGuideBridge;
        if (!bridge) return null;

        const elements = {
            reopen: doc.getElementById("foodFlowReopenButton"),
            dialog: doc.getElementById("foodFlowIntro"),
            returnButton: doc.getElementById("foodFlowReturnButton"),
            startButton: doc.getElementById("foodFlowStartButton"),
            dimmer: doc.getElementById("foodFlowGuideDimmer"),
            coach: doc.getElementById("foodFlowGuideCoach"),
            progress: doc.getElementById("foodFlowGuideProgress"),
            title: doc.getElementById("foodFlowGuideTitle"),
            body: doc.getElementById("foodFlowGuideBody"),
            status: doc.getElementById("foodFlowGuideStatus"),
            actions: doc.getElementById("foodFlowGuideActions"),
            back: doc.getElementById("foodFlowGuideBack"),
            next: doc.getElementById("foodFlowGuideNext"),
            exit: doc.getElementById("foodFlowGuideExit"),
            announcer: doc.getElementById("foodFlowGuideAnnouncer")
        };
        if (Object.values(elements).some(element => !element)) return null;

        const machine = new FoodFlowGuideStateMachine();
        let dialogOpener = null;
        let guideOpener = null;
        let activeTarget = null;
        let previousDescription = null;

        const selectorForFood = (foodId, suffix = "") =>
            `[data-food-id="${browserRoot.CSS.escape(foodId)}"]${suffix}`;

        function announce(message) {
            elements.announcer.textContent = "";
            browserRoot.setTimeout(() => {
                elements.announcer.textContent = message;
            }, 25);
        }

        function openDialog(trigger = elements.reopen) {
            browserRoot.BodyFuelGuideController?.exit?.();
            if (machine.active) closeGuide();
            dialogOpener = trigger || doc.activeElement;
            if (typeof elements.dialog.showModal === "function") elements.dialog.showModal();
            else elements.dialog.setAttribute("open", "");
            browserRoot.requestAnimationFrame(() => elements.startButton.focus());
        }

        function closeDialog() {
            if (typeof elements.dialog.close === "function" && elements.dialog.open) {
                elements.dialog.close();
            } else {
                elements.dialog.removeAttribute("open");
            }
        }

        function clearSpotlight() {
            if (!activeTarget) return;
            activeTarget.classList.remove("guide-spotlight-target");
            activeTarget.removeAttribute("data-guide-target-active");
            if (previousDescription === null) activeTarget.removeAttribute("aria-describedby");
            else activeTarget.setAttribute("aria-describedby", previousDescription);
            activeTarget = null;
            previousDescription = null;
        }

        function syncDockReservation() {
            if (!machine.active || elements.coach.hidden) return;
            const height = Math.ceil(elements.coach.getBoundingClientRect().height);
            doc.documentElement.style.setProperty("--guide-dock-height", `${height}px`);
        }

        function spotlight(target) {
            clearSpotlight();
            activeTarget = typeof target === "string" ? doc.querySelector(target) : target;
            if (!activeTarget) return;
            previousDescription = activeTarget.getAttribute("aria-describedby");
            activeTarget.classList.add("guide-spotlight-target");
            activeTarget.setAttribute("data-guide-target-active", "true");
            activeTarget.setAttribute("aria-describedby", "foodFlowGuideBody");
            browserRoot.requestAnimationFrame(() => {
                syncDockReservation();
                activeTarget?.scrollIntoView({
                    block: "center",
                    inline: "nearest",
                    behavior: browserRoot.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth"
                });
            });
        }

        function setCopy(title, paragraphs) {
            elements.title.textContent = title;
            elements.body.replaceChildren(...paragraphs.map(text => {
                const paragraph = doc.createElement("p");
                paragraph.textContent = text;
                return paragraph;
            }));
        }

        function actionButton(label, action, className = "guide-primary-action") {
            const button = doc.createElement("button");
            button.type = "button";
            button.className = className;
            button.textContent = label;
            button.addEventListener("click", action);
            elements.actions.append(button);
            return button;
        }

        function renderStep() {
            clearSpotlight();
            elements.actions.replaceChildren();
            elements.status.textContent = "";
            elements.progress.textContent = `${machine.step} of ${stepCount} · My Food flow`;
            elements.back.hidden = machine.step === 1 || (machine.step >= 3 && machine.step <= 5);
            elements.next.hidden = [2, 3, 4, 7].includes(machine.step);
            elements.next.textContent = "Next";

            if (machine.step === 1) {
                setCopy("One food, four clear places", [
                    "Find My Food searches. My Pantry saves. My Foods activates. The hero responds only to the active pattern.",
                    "This temporary walkthrough will restore your Pantry and current foods when it finishes."
                ]);
                spotlight(".food-source-tabs");
            }

            if (machine.step === 2) {
                setCopy("Start with Find My Food", [
                    "We’ll load one ordinary USDA example so you can follow it through the complete shelf-to-hero path."
                ]);
                actionButton("Open a sample search", async () => {
                    elements.status.textContent = "Finding an available example…";
                    const demoFood = await bridge.prepareFoodFlowSearch();
                    if (!demoFood) {
                        elements.status.textContent = "Every sample is already on your shelf. Exit the guide and try again after removing one sample food.";
                        return;
                    }
                    machine.demoFood = demoFood;
                    machine.go(3);
                    renderStep();
                });
                spotlight("#findMyFoodTab");
            }

            if (machine.step === 3) {
                setCopy("Save it to My Pantry", [
                    `${machine.demoFood.name} is only a search result right now. Press its real “Add to Pantry” button.`,
                    "Saving a food does not change the hero. It simply puts the food on your reusable shelf."
                ]);
                elements.status.textContent = "Waiting for Add to Pantry…";
                spotlight(selectorForFood(machine.demoFood.id, " .save-pantry-food"));
            }

            if (machine.step === 4) {
                bridge.showFoodBrowser("pantry");
                setCopy("Use it from My Pantry", [
                    "The food is now saved on this device, but it still is not shaping the hero.",
                    "Press its real “Use” button to move the remembered portion into My Foods."
                ]);
                elements.status.textContent = "Waiting for Use…";
                spotlight(selectorForFood(machine.demoFood.id, " .move-saved-food"));
            }

            if (machine.step === 5) {
                bridge.showFoodBrowser("saved");
                setCopy("My Foods means active", [
                    `${machine.demoFood.name} now contributes to today’s visible energy and macro pattern.`,
                    "The portion controls change the active amount. “Pantry” switches the food off without making you search for it again."
                ]);
                spotlight(selectorForFood(machine.demoFood.id));
            }

            if (machine.step === 6) {
                setCopy("Now the hero has something to interpret", [
                    "Energy, macro totals, pathway brightness, and body-response dials now reflect the combined foods in My Foods.",
                    "The display is a conceptual educational model—not a prediction of digestion or an individual outcome."
                ]);
                spotlight(".routing-stage");
            }

            if (machine.step === 7) {
                setCopy("You now know the food flow", [
                    "Find it → save it in My Pantry → use it in My Foods → watch the hero respond.",
                    "Finishing restores the Pantry and active foods you had before this lesson."
                ]);
                actionButton("Finish and restore my foods", () => closeGuide());
                spotlight(".food-source-tabs");
            }

            browserRoot.requestAnimationFrame(() => {
                syncDockReservation();
                elements.title.tabIndex = -1;
                elements.title.focus({ preventScroll: true });
            });
            announce(`Food-flow guide step ${machine.step} of ${stepCount}. ${elements.title.textContent}`);
        }

        function startGuide(trigger = elements.startButton) {
            if (machine.active) return;
            browserRoot.BodyFuelGuideController?.exit?.();
            guideOpener = trigger === elements.startButton ? elements.reopen : trigger;
            machine.start(bridge.capture());
            doc.body.classList.add("guide-active", "food-flow-guide-active");
            doc.documentElement.classList.add("guide-active", "food-flow-guide-active");
            elements.dimmer.hidden = false;
            elements.coach.hidden = false;
            renderStep();
        }

        function closeGuide() {
            if (!machine.active) return;
            clearSpotlight();
            bridge.restore(machine.snapshot);
            machine.active = false;
            doc.body.classList.remove("guide-active", "food-flow-guide-active");
            doc.documentElement.classList.remove("guide-active", "food-flow-guide-active");
            elements.dimmer.hidden = true;
            elements.coach.hidden = true;
            doc.documentElement.style.removeProperty("--guide-dock-height");
            announce("Food-flow guide closed. Your prior Pantry and active foods were restored.");
            browserRoot.requestAnimationFrame(() => (guideOpener || elements.reopen).focus({ preventScroll: true }));
        }

        elements.reopen.addEventListener("click", () => openDialog(elements.reopen));
        elements.returnButton.addEventListener("click", closeDialog);
        elements.startButton.addEventListener("click", () => {
            closeDialog();
            browserRoot.requestAnimationFrame(() => startGuide(elements.reopen));
        });
        elements.dialog.addEventListener("close", () => {
            if (dialogOpener && dialogOpener !== elements.startButton) dialogOpener.focus();
        });
        elements.dialog.addEventListener("click", event => {
            if (event.target === elements.dialog) closeDialog();
        });
        elements.exit.addEventListener("click", closeGuide);
        elements.next.addEventListener("click", () => {
            const before = machine.step;
            machine.next();
            if (machine.step !== before) renderStep();
        });
        elements.back.addEventListener("click", () => {
            machine.go(machine.step - 1);
            renderStep();
        });

        doc.addEventListener("click", event => {
            if (!machine.active || !machine.demoFood) return;
            const card = event.target.closest("[data-food-id]");
            if (card?.dataset.foodId !== machine.demoFood.id) return;

            if (machine.step === 3 && event.target.closest(".save-pantry-food")) {
                browserRoot.setTimeout(() => {
                    if (bridge.getSavedLocation(machine.demoFood.id) !== "pantry") return;
                    machine.saved = true;
                    machine.go(4);
                    renderStep();
                }, 80);
            }

            if (machine.step === 4 && event.target.closest(".move-saved-food")) {
                browserRoot.setTimeout(() => {
                    if (bridge.getSavedLocation(machine.demoFood.id) !== "active") return;
                    machine.activated = true;
                    machine.go(5);
                    renderStep();
                }, 100);
            }
        });

        doc.addEventListener("keydown", event => {
            if (!machine.active || event.key !== "Escape" || event.defaultPrevented) return;
            event.preventDefault();
            closeGuide();
        });
        browserRoot.addEventListener("resize", syncDockReservation);
        browserRoot.addEventListener("orientationchange", syncDockReservation);

        const controller = Object.freeze({
            machine,
            open: openDialog,
            start: startGuide,
            exit: closeGuide,
            renderStep
        });
        browserRoot.BodyFuelFoodFlowController = controller;
        return controller;
    }

    return Object.freeze({ FoodFlowGuideStateMachine, initialize, stepCount });
}));
