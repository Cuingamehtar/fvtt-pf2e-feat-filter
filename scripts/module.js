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

Hooks.on("ready", () => {
    const manifest = game.modules.get("pf2e-feat-filter");

    manifest.api = { getAllFeatPrerequisites };
});
