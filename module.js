async function getAllFeatPrerequisites() {
    const feats = await game.packs.get("pf2e.feats-srd").getDocuments();
    const withPrerequisites = feats
        .filter(
            (e) => e.type === "feat" && e.system.prerequisites.value.length > 0
        )
        .map((e) => ({
            uuid: e.uuid,
            name: e.name,
            prerequisites: e.system.prerequisites.value.map((p) =>
                p.value.toLowerCase().replace(/[\.;]$/, "")
            ),
        }));

    const data = withPrerequisites.reduce((acc, e) => {
        acc[e.uuid] = e.prerequisites.reduce((pacc, p) => {
            pacc[p] = p;
            return pacc;
        }, {});
        return acc;
    }, {});

    // Create the file and contents
    let file = new File([JSON.stringify(data, null, "\t")], "prereqs.json", {
        type: "application/json",
    });

    // Upload the file
    let response = await foundry.applications.apps.FilePicker.upload(
        "data",
        "modules/pf2e-feat-filter/omegat/source",
        file,
        {},
        { notify: false }
    );
    if (response.status == "success") {
        ui.notifications.info("Prerequsites updated");
    } else {
        ui.notifications.error("Something went wrong, see console");
        console.log(response);
    }
}

let mapping = {};
let currentActorId = null;
let currentActorRollOptions = null;

async function loadMapping() {
    mapping = await foundry.utils.fetchJsonWithTimeout(
        "modules/pf2e-feat-filter/data/mapping.json"
    );
}
async function refreshList() {
    const list = document.querySelector(
        'div#compendium-browser div.browser-tab[data-tab-name="feat"] ul.result-list'
    );
    if (!list) return;
    game.pf2e.compendiumBrowser.tabs.feat.filterData.checkboxes.skills.selected =
        game.pf2e.compendiumBrowser.tabs.feat.filterData.checkboxes.skills.selected.map(
            (e) => e
        );
}

function patchCompendium() {
    if (!libWrapper) return ui.notifications.error("Need libwrapper active");
    libWrapper.register(
        "pf2e-feat-filter",
        "game.pf2e.compendiumBrowser.tabs.feat.filterIndexData",
        function (wrapped, entry) {
            if (!wrapped(entry)) return false;
            if (!currentActorRollOptions | !mapping[entry.uuid]) return true;
            const predicate =
                entry.predicate ?? new game.pf2e.Predicate(mapping[entry.uuid]);
            if (!entry.predicate) {
                if (!predicate.isValid)
                    ui.notifications.error(
                        `Predicate for item ${entry.name} (${entry.uuid}) is malformed`
                    );
                entry.predicate = predicate;
            }
            return predicate.test(currentActorRollOptions);
        }
    );
}

function assignCharacter() {
    const defaultToCharacter = game.settings.get(
        "pf2e-feat-filter",
        "defaults-to-character"
    );
    const mustHaveSheetOpen = game.settings.get(
        "pf2e-feat-filter",
        "must-have-sheet-open"
    );
    let actor = [
        ...canvas.tokens.controlled.map((t) => t.actor),
        ...(defaultToCharacter && game.user.character
            ? [game.user.character]
            : []),
    ].find(
        (a) =>
            a.type == "character" &&
            a.isOwner &&
            (!mustHaveSheetOpen || a.sheet?.rendered)
    );
    if (!actor) {
        // console.debug("PF2e Feat Filter | Filter reset");
        currentActorId = null;
        currentActorRollOptions = null;
        refreshList();
        return;
    }
    if (actor.id == currentActorId) return;
    // console.debug(`PF2e Feat Filter | Filter for: ${actor.name}`);
    currentActorId = actor.id;
    currentActorRollOptions = actor.getRollOptions();
    refreshList();
}

Hooks.on("ready", async () => {
    const manifest = game.modules.get("pf2e-feat-filter");

    await loadMapping();

    manifest.api = { getAllFeatPrerequisites };

    Hooks.on("updateActor", (actor) => {
        if (actor.id == currentActorId) {
            currentActorRollOptions = actor.getRollOptions();
            refreshList();
        }
    });

    // Debounce so it doesn't reset to default when selecting a new token
    const debouncedAssign = foundry.utils.debounce(assignCharacter, 50);
    [
        "controlToken",
        "renderCharacterSheetPF2e",
        "closeCharacterSheetPF2e",
    ].forEach((hook) => Hooks.on(hook, debouncedAssign));

    Hooks.on("renderFeatSheetPF2e", (sheet, html) => {
        const uuid = sheet.item.uuid;
        const p = mapping[uuid];
        if (!p) return;
        const title = html[0].querySelector("div.prerequisites h4.tags-title");
        title.innerHTML += `<sup><span class="icon fa-solid fa-circle-info" data-tooltip=""></span></sup>`;
        title
            .querySelector("span")
            .setAttribute("aria-label", JSON.stringify(p, null, 2));
    });
    registerSettings();
    patchCompendium();
});

function registerSettings() {
    game.settings.register("pf2e-feat-filter", "defaults-to-character", {
        name: "Default to player's character",
        hint: "When deselecting all tokens, filter feats based on the player's assigned character",
        scope: "user",
        type: Boolean,
        config: true,
        default: false,
        requiresReload: false,
        onChange: assignCharacter,
    });

    game.settings.register("pf2e-feat-filter", "must-have-sheet-open", {
        name: "Must have open character sheet",
        hint: "Filters feats only if the actor's character sheet is open",
        scope: "user",
        type: Boolean,
        config: true,
        default: false,
        requiresReload: false,
        onChange: assignCharacter,
    });
}
