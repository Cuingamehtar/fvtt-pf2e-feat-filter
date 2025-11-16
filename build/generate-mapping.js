import * as fs from "fs";
import { evalTokens, tokenizeString } from "./tokenizer.js";

/**
 *
 * @param {{[k:string]:string}} entry
 */
function processEntry(entry) {
    const result = Object.entries(entry).reduce((acc, kv) => {
        const [k, v] = kv;
        if (k == v) return acc;
        try {
            const tokens = tokenizeString(v);
            //console.log(tokens);
            const s = evalTokens(tokens);

            return typeof s === "object" && s["and"]
                ? [...acc, ...s["and"]]
                : [...acc, s];
        } catch (err) {
            console.error(`Error parsing "${v}" at "${k}"`);
            return acc;
        }
    }, []);
    return result.length !== 0 ? result : undefined;
}

const files = fs.readdirSync("./omegat/target/");

for (const file of files) {
    const data = JSON.parse(
        fs.readFileSync(`./omegat/target/${file}`, "utf-8")
    );

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
