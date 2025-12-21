import { PredicateStatement } from "foundry-pf2e";
import { MODULE_ID } from "./module";

let extended = true;
let lores = true;

export function preprocessPredicate(p: PredicateStatement[] | null) {
    if (p == null) return null;
    extended = game.settings.get(MODULE_ID, "use-extended-predicates");
    lores = !game.settings.get(MODULE_ID, "ignore-specific-lores");
    if (extended && lores) return new game.pf2e.Predicate(p);
    const processedPredicates = p.map(trivializeExtendedOptions);
    if (processedPredicates.some((e) => e === false)) return null;
    const filteredPredicates = processedPredicates.filter(
        (e): e is PredicateStatement => e !== true,
    );
    return filteredPredicates.length > 0
        ? new game.pf2e.Predicate(filteredPredicates)
        : null;
}

const extendedPrefix = "feat-filter";

function alwaystrue(s: string) {
    return (
        (!extended && s.startsWith(extendedPrefix)) ||
        (!lores && s.match(/skill:[^:]+-lore:rank/))
    );
}

type MaybeAlwaysTrueStatement = PredicateStatement | boolean;

function trivializeExtendedOptions(
    p: PredicateStatement,
): MaybeAlwaysTrueStatement {
    if (typeof p === "string") return alwaystrue(p) ? true : p;
    if (isNontrivialStatement(p)) {
        let [type, values] = Object.entries(p)[0];
        switch (type) {
            case "gte":
            case "gt":
            case "eq":
            case "lt":
            case "lte":
                return alwaystrue(values[0]) ? true : p;

            case "and":
                values = values.map(trivializeExtendedOptions);
                if (values.some((v: MaybeAlwaysTrueStatement) => v === false))
                    return false;
                return {
                    and: values.filter(
                        (v: MaybeAlwaysTrueStatement) => v !== true,
                    ),
                };

            case "or":
                values = values.map(trivializeExtendedOptions);
                if (values.some((v: MaybeAlwaysTrueStatement) => v === true))
                    return true;
                return {
                    or: values.filter(
                        (v: MaybeAlwaysTrueStatement) => v !== false,
                    ),
                };

            case "not":
                values = trivializeExtendedOptions(
                    values as PredicateStatement,
                );
                if (typeof values === "boolean") return !values;
                return p;

            default:
                throw new Error(`Unknown predicate ${p}`);
        }
    }
    return p;
}

function isNontrivialStatement(
    p: PredicateStatement,
): p is Exclude<PredicateStatement, string> {
    return typeof p === "object" && !Array.isArray(p);
}
