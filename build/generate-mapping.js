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
            console.error(`Error parsing "${v}" at "${k}"`, err);
            return acc;
        }
    }, []);
    return result.length !== 0 ? result : undefined;
}

const data = JSON.parse(
    fs.readFileSync("./omegat/target/prereqs.json", "utf-8")
);

const result = Object.entries(data).reduce((acc, [k, v]) => {
    const res = processEntry(v);
    if (res) {
        acc[k] = res;
    }
    return acc;
}, {});

fs.writeFileSync("./data/mapping.json", JSON.stringify(result, null, "\t"));
