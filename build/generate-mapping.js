import * as fs from "fs";
import { evalTokens, tokenizeString } from "./tokenizer.js";

const warn = (s) => `\x1b[33m${s}\x1b[0m`;
function debounce(callback, delay) {
    let timer = null;
    let queue = null;
    return async (...args) => {
        await queue;
        clearTimeout(timer);
        timer = setTimeout(() => {
            queue = callback(...args);
        }, delay);
    };
}

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

function generate() {
    const timeStart = process.hrtime.bigint();
    const files = fs.readdirSync("./omegat/target/");

    let loreSlugs = [];

    for (const file of files) {
        const content = fs.readFileSync(`./omegat/target/${file}`, "utf-8");
        for (const m of content.matchAll(/skill:([^:]+):rank/g)) {
            if (m[1].endsWith("-lore")) {
                loreSlugs.push(m[1]);
            } else {
                if (
                    !m[1].match(
                        /^(piloting|computers|acrobatics|crafting|nature|athletics|medicine|intimidation|survival|arcana|deception|diplomacy|performance|thievery|religion|occultism|society|stealth)$/,
                    )
                )
                    console.log(`Invalid skill slug "${warn(m[1])}"`);
            }
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

    const timeTakenSec = (
        Number(process.hrtime.bigint() - timeStart) * 1e-9
    ).toFixed(3);

    console.log(`Prerequisites exported (${timeTakenSec} seconds)`);
}

const debGenerate = debounce(generate, 1000);

fs.watch("./omegat/target", { recursive: true }, debGenerate);
debGenerate();
