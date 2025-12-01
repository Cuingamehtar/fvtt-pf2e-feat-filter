import * as fs from "fs";
import { evalTokens, tokenizeString } from "./tokenizer.js";

/**
 *
 * @param {{[k:string]:string}} entry
 */
function processEntry(entry) {
    const result = Object.entries(entry).map(([k, v]) => {
        if (k == v) {
            return null;
        }
        try {
            const tokens = tokenizeString(v);
            //console.log(tokens);
            const s = evalTokens(tokens);

            return typeof s === "object" && s["and"] ? s["and"] : [s];
        } catch (err) {
            console.error(`Error parsing "${v}" at "${k}"`);
            return null;
        }
    }, []);
    return result.filter(Boolean).length !== 0 ? result : undefined;
}

const files = fs.readdirSync("./omegat/target/");

let loreSlugs = [];

for (const file of files) {
    const content = fs.readFileSync(`./omegat/target/${file}`, "utf-8");
    for (const m of content.matchAll(/skill:([^:]+-lore):rank/g)) {
        loreSlugs.push(m[1]);
    }
    const data = JSON.parse(content);

    const result = Object.entries(data).reduce((acc, [k, v]) => {
        const res = processEntry(Object.values(v)[0]);
        if (res) {
            acc[k] = res;
        }
        return acc;
    }, {});

    fs.writeFileSync(`./data/${file}`, JSON.stringify(result, null, "\t"));
}

const manifest = JSON.parse(fs.readFileSync("module.json", "utf-8"));
manifest.flags["pf2e-feat-filter"] = {
    files: files.map((f) => f.replace(/\.json$/, "")),
};
fs.writeFileSync("module.json", JSON.stringify(manifest, null, 2));

loreSlugs = Array.from(new Set(loreSlugs)).sort();

const lang = JSON.parse(fs.readFileSync("./lang/en.json", "utf-8"));
lang["pf2e-feat-filter"].lore.slugs = loreSlugs.reduce((acc, e) => {
    acc[e] = e.replaceAll("-", " ");
    return acc;
}, {});
fs.writeFileSync("./lang/en.json", JSON.stringify(lang, null, 4));
