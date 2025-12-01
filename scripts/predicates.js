import { MODULE_ID } from "../module.js";

let extended = true;
let lores = true;

export function preprocessPredicate(p) {
    if (p == null) return null;
    extended = game.settings.get(MODULE_ID, "use-extended-predicates");
    lores = !game.settings.get(MODULE_ID, "ignore-specific-lores");
    if (extended && lores) return p;
    p = p.map(trivializeExtendedOptions);
    if (p.some((e) => e === false)) return [];
    p = p.filter((e) => e !== true);
    return p.length > 0 ? new game.pf2e.Predicate(p) : null;
}

const extendedPrefix = "feat-filter";

function alwaystrue(s) {
    return (
        (!extended && s.startsWith(extendedPrefix)) ||
        (!lores && s.match(/skill:[^:]+-lore:rank/))
    );
}

function trivializeExtendedOptions(p) {
    if (typeof p === "string") return alwaystrue(p) ? true : p;
    if (typeof p === "object" && !Array.isArray(p)) {
        const type = Object.keys(p)[0];
        let values = p[type];
        switch (type) {
            case "gte":
            case "gt":
            case "eq":
            case "lt":
            case "lte":
                return alwaystrue(values[0]) ? true : p;

            case "and":
                values = values.map(trivializeExtendedOptions);
                if (values.some((v) => v === false)) return false;
                return { and: values.filter((v) => v !== true) };

            case "or":
                values = values.map(trivializeExtendedOptions);
                if (values.some((v) => v === true)) return true;
                return { or: values.filter((v) => v !== false) };

            case "not":
                values = trivializeExtendedOptions(values);
                if (typeof values === "boolean") return !values;
                return p;

            default:
                throw new Error("Unknown predicate", p);
        }
    }
}
