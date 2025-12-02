import { MODULE_ID } from "../module.js";

let currentActor;
let sheetIds;

function updateFeatSheet(uuid, html) {
    const p = CONFIG[MODULE_ID].predicates[uuid];
    if (!p) return;
    const list = html.querySelector("div.prerequisites ul.tags");
    const children = list.querySelectorAll("li");
    for (let i = 0; i < children.length; i++) {
        if (p[i] == null) continue;
        const element = children[i];
        element.setAttribute("data-tooltip", "");
        element.setAttribute(
            "aria-label",
            JSON.stringify(p[i].toObject(), null, 2)
        );

        element.classList.remove("ff-satisfied");
        element.classList.remove("ff-unsatisfied");

        if (
            currentActor.rollOptions &&
            game.settings.get(MODULE_ID, "highlight-on-feat-sheet")
        ) {
            const satisfied = p[i].test(currentActor.rollOptions);
            element.classList.add(
                satisfied ? "ff-satisfied" : "ff-unsatisfied"
            );
        }
    }
}

export function registerHighlightPrerequisites(ca) {
    currentActor = ca;

    Hooks.on("renderFeatSheetPF2e", (sheet, html) => {
        const uuid = sheet.item.uuid;
        updateFeatSheet(uuid, html[0]);
    });

    Hooks.on("pf2e-feat-filter.characterAssigned", (ca) => {
        currentActor = ca;
        const sheets = document.querySelectorAll("div.app.sheet.pf2e.feat");
        sheets.forEach((s) => {
            const id = s.id;
            const sourceId = s.querySelector(`input#${id}-source-id`)?.value;
            if (!sourceId) return;
            updateFeatSheet(sourceId, s);
        });
    });
}
