import { ActorTracker, MODULE_ID } from "./module";
import { ItemUUID } from "foundry-pf2e/foundry/common/documents/_module.mjs";

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
        element.setAttribute(
            "aria-label",
            JSON.stringify(p.toObject(), null, 2),
        );

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
        }
    }
}

export function registerHighlightPrerequisites(ca: ActorTracker) {
    currentActor = ca;

    Hooks.on("renderFeatSheetPF2e", (sheet, html) => {
        const uuid = sheet.item.uuid;
        updateFeatSheet(uuid, html[0]);
    });

    Hooks.on("pf2e-feat-filter.characterAssigned", (ca: ActorTracker) => {
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
    });
}
