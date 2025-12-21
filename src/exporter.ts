import { FeatPF2e } from "foundry-pf2e";
import type { ItemUUID } from "foundry-pf2e/foundry/client/documents/_module.mjs";

export async function getAllFeatPrerequisites() {
    const packages = Array.from(
        new Set([...game.packs.values()].map((p) => p.metadata.packageName)),
    ).reduce(
        (acc, e) => {
            acc[e] = {};
            return acc;
        },
        {} as Record<
            string,
            Record<ItemUUID, Record<string, Record<string, string>>>
        >,
    );

    let progress = ui.notifications.info("Loading feats", { progress: true });

    const npacks = game.packs.size;
    let i = 0;
    for (const pack of game.packs.values()) {
        progress.update({
            pct: i / npacks,
            message: `Loading feats: ${pack.metadata.packageName}.${pack.metadata.name}`,
        });
        i += 1;
        if (pack.metadata.type !== "Item") continue;
        const entries = (await pack.getDocuments({
            type: "feat",
        })) as FeatPF2e[];
        const withPrerequisites = entries
            .filter(
                (e) =>
                    e?.type === "feat" &&
                    e?.system.prerequisites.value.length > 0,
            )
            .map((e) => ({
                uuid: e.uuid,
                name: e.name,
                prerequisites: e.system.prerequisites.value.map((p) =>
                    p.value.toLowerCase().replace(/[\.;]$/, ""),
                ),
            }));

        const data = withPrerequisites.reduce(
            (acc, e) => {
                acc[e.uuid] = {
                    [e.name]: e.prerequisites.reduce(
                        (pacc, p) => {
                            pacc[p] = p;
                            return pacc;
                        },
                        {} as Record<string, string>,
                    ),
                };
                return acc;
            },
            {} as Record<ItemUUID, Record<string, Record<string, string>>>,
        );
        for (const [k, v] of Object.entries(data)) {
            packages[pack.metadata.packageName][k as ItemUUID] = v;
        }
    }
    progress.update({ pct: 1, message: "Done!" });

    for (const [module, entries] of Object.entries(packages)) {
        if (Object.keys(entries).length === 0) continue;
        // Create the file and contents
        let file = new File(
            [JSON.stringify(entries, null, "\t")],
            `${module}.json`,
            {
                type: "application/json",
            },
        );

        // Upload the file
        let response = await foundry.applications.apps.FilePicker.upload(
            "data",
            "modules/pf2e-feat-filter/omegat/source",
            file,
            {},
            { notify: false },
        );
        if (typeof response === "object" && response.status !== "success") {
            ui.notifications.error("Something went wrong, see console");
            console.log(response);
        }

        ui.notifications.info(`Exported files`);
    }
}
