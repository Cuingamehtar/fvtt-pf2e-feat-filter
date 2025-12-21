import { CompendiumBrowserIndexData } from "foundry-pf2e";
import { ActorTracker, MODULE_ID } from "./module";

let currentActor: ActorTracker;

function paintBrowserElements() {
    if (game.pf2e.compendiumBrowser.activeTab.tabName !== "feat") return;
    const filterResults = game.pf2e.compendiumBrowser.tabs.feat
        .results as CompendiumBrowserIndexData;
    const elements = document.querySelectorAll(
        "div#compendium-browser ul.result-list li",
    );
    /* console.log(
        `filter: ${filterResults.length}, elements: ${elements.length}`
    );*/
    for (let i = 0; i < elements.length; i++) {
        const isAllowed =
            currentActor.rollOptions == null ||
            (CONFIG[MODULE_ID].predicates[filterResults[i].uuid]?.every(
                (p) => p == null || p.test(currentActor.rollOptions!),
            ) ??
                true);
        const element = elements[i];
        if (!isAllowed) {
            element.classList.add("ff-stripes");
        } else {
            element.classList.remove("ff-stripes");
        }
    }
}

const debouncedPaint = foundry.utils.debounce(paintBrowserElements, 20);

const browserObserver = new MutationObserver((_record, observer) => {
    const list = document.querySelector(
        "div#compendium-browser ul.result-list",
    );
    if (list) {
        observer.disconnect();
        listObserver.observe(list, { childList: true });
        debouncedPaint();
    }
});

Hooks.on("pf2e-feat-filter.characterAssigned", () => debouncedPaint());

const listObserver = new MutationObserver(() => {
    debouncedPaint();
});

export function hookBrowser(ca: ActorTracker) {
    currentActor = ca;
    Hooks.on("renderCompendiumBrowser", (_browser, html) => {
        const list = html.querySelector("ul.result-list");
        if (!list) {
            browserObserver.observe(html, { childList: true, subtree: true });
        } else {
            listObserver.observe(list, { childList: true });
        }
    });

    Hooks.on("closeCompendiumBrowser", () => {
        browserObserver.disconnect();
        listObserver.disconnect();
        console.log("observersDisconnected");
    });
}
