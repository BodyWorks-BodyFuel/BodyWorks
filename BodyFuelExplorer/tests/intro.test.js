"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const introApi = require("../intro.js");
const projectRoot = path.resolve(__dirname, "..");
const read = name => fs.readFileSync(path.join(projectRoot, name), "utf8");
const html = read("index.html");
const intro = read("intro.js");
const css = read("style.css");

test("purpose statement uses one reusable accessible dialog", () => {
    assert.match(html, /<dialog class="explorer-intro" id="explorerIntro"/);
    assert.match(html, /aria-labelledby="explorerIntroTitle"/);
    assert.match(html, /id="introReopenButton"[\s\S]*?Explorer basics/);
    assert.equal((html.match(/id="explorerIntro"/g) || []).length, 1);
    assert.equal((html.match(/id="introEnterButton"/g) || []).length, 1);
});

test("intro answers purpose without becoming a tutorial or prescription", () => {
    assert.match(html, /What is this\?/);
    assert.match(html, /What is the body trying to do with what I give it\?/);
    assert.match(html, /What could this help you explore\?/);
    assert.match(html, /You don't need to find the perfect setting/);
    assert.match(html, /conceptual educational model—not a diet prescription/);
    assert.doesNotMatch(html, /Step 1|Next step|correct answer/i);
});

test("first visit is session-only and dismissal preserves the existing guide", () => {
    assert.equal(introApi.sessionKey, "bodyFuelExplorerIntroV1");
    assert.equal(introApi.closedEvent, "bodyfuel:intro-closed");
    assert.match(intro, /sessionStorage\.getItem\(sessionKey\)/);
    assert.match(intro, /sessionStorage\.setItem\(sessionKey, "seen"\)/);
    assert.doesNotMatch(intro, /localStorage/);
    assert.match(intro, /dispatchEvent\(new browserRoot\.CustomEvent\(closedEvent\)\)/);
});

test("intro is responsive, modal, and keeps strong focus treatment", () => {
    assert.match(css, /\.explorer-intro::backdrop/);
    assert.match(css, /\.explorer-intro-sections \{[\s\S]*?grid-template-columns: repeat\(3/);
    assert.match(css, /@media \(max-width: 820px\)[\s\S]*?\.explorer-intro-sections[\s\S]*?grid-template-columns: repeat\(2/);
    assert.match(css, /@media \(max-width: 720px\)[\s\S]*?\.explorer-intro-sections,[\s\S]*?grid-template-columns: 1fr/);
    assert.match(css, /\.explorer-intro button:focus-visible/);
    assert.match(css, /@media \(prefers-reduced-motion: reduce\)[\s\S]*?\.explorer-intro/);
});
