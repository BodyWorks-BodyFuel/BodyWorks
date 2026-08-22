#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

const NUTRIENTS = Object.freeze({ protein: 1003, fats: 1004, carbs: 1005 });

function argumentsMap(argv) {
    const values = {};
    for (let index = 2; index < argv.length; index += 2) {
        values[argv[index]?.replace(/^--/, "")] = argv[index + 1];
    }
    return values;
}

function requiredFile(value, label) {
    if (!value || !fs.existsSync(value)) {
        throw new Error(`Missing ${label} JSON file: ${value || "not supplied"}`);
    }
    return path.resolve(value);
}

function readFoods(file, rootKey) {
    const payload = JSON.parse(fs.readFileSync(file, "utf8"));
    if (!Array.isArray(payload[rootKey])) {
        throw new Error(`${path.basename(file)} does not contain ${rootKey}.`);
    }
    return payload[rootKey];
}

function number(value) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
}

function round(value) {
    return Math.round(value * 10) / 10;
}

function titleCase(value) {
    return String(value || "USDA food")
        .toLocaleLowerCase("en-US")
        .replace(/(^|[\s,(/-])([a-z])/g, (_, lead, letter) =>
            `${lead}${letter.toLocaleUpperCase("en-US")}`
        );
}

function nutrient(food, nutrientId) {
    const entry = (food.foodNutrients || []).find(item =>
        Number(item?.nutrient?.id) === nutrientId &&
        String(item?.nutrient?.unitName || "").toLowerCase() === "g"
    );
    return number(entry?.amount);
}

function portionLabel(portion) {
    const explicit = String(portion.portionDescription || "").trim();
    if (explicit) return explicit;

    const amount = number(portion.amount || portion.value) || 1;
    const unit = String(
        portion.measureUnit?.name || portion.measureUnit?.abbreviation || "portion"
    ).trim();
    return `${amount.toLocaleString("en-US")} ${unit}`;
}

function choosePortion(food) {
    const candidates = (food.foodPortions || [])
        .filter(portion =>
            number(portion.gramWeight) > 0 &&
            !/quantity not specified|undetermined|not specified|unknown/i.test(
                `${portion.portionDescription || ""} ${portion.measureUnit?.name || ""}`
            ) &&
            !/racc/i.test(String(portion.measureUnit?.name || ""))
        )
        .map(portion => ({
            label: portionLabel(portion),
            grams: number(portion.gramWeight),
            sequence: number(portion.sequenceNumber) || 999
        }))
        .sort((left, right) =>
            left.sequence - right.sequence ||
            Number(right.grams <= 500) - Number(left.grams <= 500) ||
            left.grams - right.grams
        );

    return candidates[0] || { label: "100 g reference portion", grams: 100 };
}

function normalizedFood(food) {
    if (!food || typeof food !== "object") return null;
    const fdcId = Number(food.fdcId);
    if (!Number.isFinite(fdcId)) return null;

    const per100 = {
        protein: nutrient(food, NUTRIENTS.protein),
        carbs: nutrient(food, NUTRIENTS.carbs),
        fats: nutrient(food, NUTRIENTS.fats)
    };
    if (per100.protein + per100.carbs + per100.fats <= 0) return null;

    const portion = choosePortion(food);
    const factor = portion.grams / 100;
    return [
        fdcId,
        titleCase(food.description),
        portion.label,
        round(portion.grams),
        round(per100.protein * factor),
        round(per100.carbs * factor),
        round(per100.fats * factor),
        String(food.dataType || "USDA food")
    ];
}

function sourceMetadata(file, label, release) {
    const bytes = fs.readFileSync(file);
    return {
        label,
        release,
        file: path.basename(file),
        sha256: crypto.createHash("sha256").update(bytes).digest("hex")
    };
}

const args = argumentsMap(process.argv);
const foundationFile = requiredFile(args.foundation, "Foundation Foods");
const srFile = requiredFile(args.sr, "SR Legacy");
const fnddsFile = requiredFile(args.fndds, "FNDDS");
const outputDirectory = path.resolve(args.output || "data/usda");

const sources = [
    {
        ...sourceMetadata(foundationFile, "Foundation Foods", "2026-04"),
        foods: readFoods(foundationFile, "FoundationFoods")
    },
    {
        ...sourceMetadata(srFile, "SR Legacy", "2018-04"),
        foods: readFoods(srFile, "SRLegacyFoods")
    },
    {
        ...sourceMetadata(fnddsFile, "FNDDS", "2021-2023 / 2024-10 release"),
        foods: readFoods(fnddsFile, "SurveyFoods")
    }
];

const records = sources
    .flatMap(source => source.foods.map(normalizedFood).filter(Boolean))
    .sort((left, right) => left[1].localeCompare(right[1], "en-US") || left[0] - right[0]);

const uniqueRecords = [];
const seen = new Set();
for (const record of records) {
    const key = `${record[0]}:${record[7]}`;
    if (seen.has(key)) continue;
    seen.add(key);
    uniqueRecords.push(record);
}

fs.mkdirSync(outputDirectory, { recursive: true });
const generatedAt = new Date().toISOString();
const publicSources = sources.map(({ foods, ...source }) => ({ ...source }));
const index = {
    schema: 1,
    generatedAt,
    attribution: "USDA FoodData Central",
    fields: ["fdcId", "name", "portion", "portionGrams", "protein", "carbs", "fats", "dataType"],
    records: uniqueRecords
};
const serialized = JSON.stringify(index);
const indexFile = path.join(outputDirectory, "foods-index.js");
fs.writeFileSync(indexFile, `globalThis.BodyFuelUsdaIndex=${serialized};\n`);

const manifest = {
    schema: 1,
    generatedAt,
    attribution: "U.S. Department of Agriculture, Agricultural Research Service. FoodData Central.",
    license: "CC0 1.0 Universal",
    records: uniqueRecords.length,
    bytes: fs.statSync(indexFile).size,
    indexSha256: crypto.createHash("sha256").update(serialized).digest("hex"),
    sources: publicSources
};
fs.writeFileSync(
    path.join(outputDirectory, "manifest.json"),
    `${JSON.stringify(manifest, null, 2)}\n`
);

console.log(`Wrote ${uniqueRecords.length.toLocaleString("en-US")} foods to ${indexFile}`);
console.log(`Index size: ${(manifest.bytes / 1024 / 1024).toFixed(2)} MiB`);
