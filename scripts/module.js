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

    const flatPrereqs = withPrerequisites.reduce((acc, e) => {
        acc[e.uuid] = e.prerequisites.reduce((pacc, p) => {
            pacc[p] = p;
            return pacc;
        }, {});
        return acc;
    }, {});
    const mapping = withPrerequisites.reduce((acc, e) => {
        acc[e.uuid] = e.prerequisites;
        return acc;
    }, {});

    // Create the file and contents
    let file = new File(
        [JSON.stringify(flatPrereqs, null, "\t")],
        "prereqs.json",
        { type: "application/json" }
    );

    // Upload the file
    let response = await foundry.applications.apps.FilePicker.upload(
        "data",
        "modules/pf2e-feat-filter/omegat/source",
        file,
        {},
        { notify: false }
    );
    console.log(response);

    // Create the file and contents
    file = new File(
        [JSON.stringify(mapping, null, "\t")],
        "mappingSource.json",
        { type: "application/json" }
    );

    // Upload the file
    response = await foundry.applications.apps.FilePicker.upload(
        "data",
        "modules/pf2e-feat-filter/data",
        file,
        {},
        { notify: false }
    );

    console.log(response);
}

let mapping = {};
let currentActorId = null;
let currentActorRollOptions = null;

async function loadMapping() {
    mapping = await foundry.utils.fetchJsonWithTimeout(
        "modules/pf2e-feat-filter/data/mapping.json"
    );
}
function refreshList() {
    document
        .querySelector(
            'div.browser-tab[data-tab-name="feat"] input[name="textFilter"]'
        )
        ?.dispatchEvent(new Event("input"));
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

    Hooks.on("controlToken", (token) => {
        const actor = canvas.tokens.controlled[0]?.actor;
        if (!actor || !actor.isOwner) {
            currentActorId = null;
            currentActorRollOptions = null;
            refreshList();
            return;
        }
        if (actor.id == currentActorId) return;
        currentActorId = actor.id;
        currentActorRollOptions = actor.getRollOptions();
        refreshList();
    });

    patchCompendium();
});
