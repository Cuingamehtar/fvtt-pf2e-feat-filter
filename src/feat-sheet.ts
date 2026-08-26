import {
    FeatSheetPF2e,
    Predicate,
    PredicateStatement,
} from "@7h3laughingman/pf2e-types";
import { ActorTracker, MODULE_ID } from "./module";

let currentActor: ActorTracker;

function updateFeatSheet(uuid: ItemUUID, html: HTMLElement) {
    const predicates = CONFIG[MODULE_ID].predicates[uuid];
    if (!predicates) return;
    const list = html.querySelector("div.prerequisites ul.tags");
    if (!list) return;
    const children = list.querySelectorAll("li");
    for (let i = 0; i < children.length; i++) {
        const p = predicates[i];
        if (p == null) continue;
        const element = children[i];
        element.setAttribute("data-tooltip", "");
        element.dataset.html = "true";

        element.classList.remove("ff-satisfied");
        element.classList.remove("ff-unsatisfied");

        if (
            currentActor.rollOptions &&
            game.settings.get(MODULE_ID, "highlight-on-feat-sheet")
        ) {
            const satisfied = p.test(currentActor.rollOptions);
            element.classList.add(
                satisfied ? "ff-satisfied" : "ff-unsatisfied",
            );

            element.dataset.tooltip = prettyTooltip(
                currentActor.rollOptions,
                p,
            );
        }
    }
}

export function registerHighlightPrerequisites(ca: ActorTracker) {
    currentActor = ca;

    Hooks.on("renderFeatSheetPF2e", ((
        sheet: FeatSheetPF2e,
        html: HTMLElement[],
    ) => {
        const uuid = sheet.item.uuid;
        updateFeatSheet(uuid, html[0]);
    }) as UnknownHookCallback);

    Hooks.on("pf2e-feat-filter.characterAssigned", ((ca: ActorTracker) => {
        currentActor = ca;
        const sheets = document.querySelectorAll("div.app.sheet.pf2e.feat");
        sheets.forEach((s) => {
            const id = s.id;
            const sourceId = (
                s.querySelector(`input#${id}-source-id`) as
                    | HTMLInputElement
                    | undefined
            )?.value;
            if (!sourceId) return;
            updateFeatSheet(sourceId as ItemUUID, s as HTMLElement);
        });
    }) as UnknownHookCallback);
}

function prettyTooltip(rollOptions: string[], predicate: Predicate) {
    const out = predicate
        .values()
        .reduce((acc, e) => acc + formatElement(rollOptions, e), "");
    return `<ul>${out}</ul>`;
}

function formatElement(rollOptions: string[], p: PredicateStatement) {
    const satisfied = new game.pf2e.Predicate(p).test(rollOptions);
    const cl = satisfied ? "ff-satisfied tooltip" : "ff-unsatisfied";

    const content = (() => {
        if (typeof p === "string") return p;
        const [key, value] = Object.entries(p)[0];
        if (["lt", "lte", "eq", "gte", "gt"].includes(key)) {
            const sym =
                comparisonSymbols[key as keyof typeof comparisonSymbols];
            return `${value[0]} ${sym} ${value[1]} `;
        }

        const out = (Array.isArray(value) ? value : [value]).reduce(
            (acc, e) => acc + formatElement(rollOptions, e),
            "",
        );
        return `<p>${key}:</p><ul>${out}</ul>`;
    })();
    return `<li class="${cl}">${content}</li>`;
}

const comparisonSymbols = {
    lt: "&lt;",
    lte: "≤",
    eq: "=",
    gte: "≥",
    gt: "&gt;",
};
