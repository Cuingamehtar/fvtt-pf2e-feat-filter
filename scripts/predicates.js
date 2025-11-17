import { MODULE_ID } from "../module.js";

export function preprocessPredicate(p) {
    if (game.settings.get(MODULE_ID, "use-extended-predicates")) return p;
    p = p.map(trivializeExtendedOptions);
    if (p.some((e) => e === false)) return [];
    return p.filter((e) => e !== true);
}

const extendedPrefix = "feat-filter";

function trivializeExtendedOptions(p) {
    if (typeof p === "string") return p.startsWith(extendedPrefix) ? true : p;
    if (typeof p === "object" && !Array.isArray(p)) {
        const type = Object.keys(p)[0];
        let values = p[type];
        switch (type) {
            case "gte":
            case "gt":
            case "eq":
            case "lt":
            case "lte":
                return values[0].startsWith(extendedPrefix) ? true : p;

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
