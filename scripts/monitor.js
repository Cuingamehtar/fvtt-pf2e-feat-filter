let currentActor;

function paintBrowserElements() {
    if (!game.pf2e.compendiumBrowser.activeTab.tabName == "feat") return;
    const filterResults = game.pf2e.compendiumBrowser.tabs.feat.results;
    const elements = document.querySelectorAll(
        "div#compendium-browser ul.result-list li"
    );
    /* console.log(
        `filter: ${filterResults.length}, elements: ${elements.length}`
    );*/
    for (let i = 0; i < elements.length; i++) {
        const isAllowed =
            currentActor.rollOptions == null ||
            (filterResults[i].predicates?.every(
                (p) => p == null || p.test(currentActor.rollOptions)
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
        "div#compendium-browser ul.result-list"
    );
    if (list) {
        observer.disconnect();
        //console.log("BO disconnected");
        listObserver.observe(list, { childList: true });
        debouncedPaint();
        //console.log("LO connected");
    }
});

Hooks.on("pf2e-feat-filter.characterAssigned", () => debouncedPaint());

const listObserver = new MutationObserver(() => {
    debouncedPaint();
});

export function hookBrowser(ca) {
    currentActor = ca;
    Hooks.on("renderCompendiumBrowser", (_browser, html) => {
        const list = html.querySelector("ul.result-list");
        if (!list) {
            browserObserver.observe(html, { childList: true, subtree: true });
            // console.log("BO connected");
        } else {
            listObserver.observe(list, { childList: true });
            // console.log("LO connected");
        }
    });

    Hooks.on("closeCompendiumBrowser", () => {
        browserObserver.disconnect();
        listObserver.disconnect();
        console.log("observersDisconnected");
    });
}
