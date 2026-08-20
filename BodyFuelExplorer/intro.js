/*
 * Body Fuel Explorer — first-visit purpose statement
 *
 * This controller owns only the introductory explanation. The Explorer stays
 * loaded behind the modal, and the same dialog is reused by the header control
 * so its content never splits into multiple versions.
 */
(function (root, factory) {
    const api = factory();
    if (typeof module === "object" && module.exports) module.exports = api;
    if (root) root.BodyFuelIntro = api;
    if (root?.document) api.initialize(root.document, root);
}(typeof window !== "undefined" ? window : globalThis, function () {
    "use strict";

    const sessionKey = "bodyFuelExplorerIntroV1";
    const closedEvent = "bodyfuel:intro-closed";

    function initialize(doc, browserRoot) {
        const dialog = doc.getElementById("explorerIntro");
        const enter = doc.getElementById("introEnterButton");
        const reopen = doc.getElementById("introReopenButton");
        if (!dialog || !enter || !reopen) return null;

        let opener = null;

        function hasSeenThisSession() {
            try {
                return browserRoot.sessionStorage.getItem(sessionKey) === "seen";
            } catch (error) {
                return false;
            }
        }

        function rememberThisSession() {
            try {
                browserRoot.sessionStorage.setItem(sessionKey, "seen");
            } catch (error) {
                // Restricted storage simply means the purpose statement may reappear next visit.
            }
        }

        function open(trigger = null) {
            opener = trigger || doc.activeElement;
            if (!dialog.open) {
                if (typeof dialog.showModal === "function") dialog.showModal();
                else dialog.setAttribute("open", "");
            }
            browserRoot.requestAnimationFrame(() => enter.focus());
        }

        function close() {
            rememberThisSession();
            if (typeof dialog.close === "function" && dialog.open) dialog.close();
            else dialog.removeAttribute("open");
        }

        // Closing announces availability to optional layers that intentionally
        // wait until the first-visit explanation is out of the way.
        dialog.addEventListener("close", () => {
            browserRoot.dispatchEvent(new browserRoot.CustomEvent(closedEvent));
            if (opener === reopen) reopen.focus();
        });
        enter.addEventListener("click", close);
        reopen.addEventListener("click", () => open(reopen));

        if (!hasSeenThisSession()) open();

        const controller = Object.freeze({ open, close, sessionKey, closedEvent });
        browserRoot.BodyFuelIntroController = controller;
        return controller;
    }

    return Object.freeze({ initialize, sessionKey, closedEvent });
}));
