import { ItemUUID } from "foundry-pf2e/foundry/common/documents/_module.mjs";
import { registerHighlightPrerequisites } from "./feat-sheet";
import { hookBrowser } from "./monitor";
import { preprocessPredicate } from "./predicates";
import { getExtendedRollOptions } from "./roll-options";
import {
    CompendiumBrowserFeatTab,
    FeatPF2e,
    Predicate,
    PredicateStatement,
} from "foundry-pf2e";
import Module from "foundry-pf2e/foundry/client/packages/module.mjs";
import {
    downloadPrerequisitesForPackage,
    getAllFeatPrerequisitesDev,
} from "./exporter";
import CompendiumCollection from "foundry-pf2e/foundry/client/documents/collections/compendium-collection.mjs";
import { PredicateGuesser } from "./guesser";

export const MODULE_ID = "pf2e-feat-filter";

export type ModuleConfig = {
    predicates: Record<ItemUUID, (Predicate | null)[]>;
};

export type ActorTracker = {
    id: string | null;
    rollOptions: string[] | null;
};

const currentActor: ActorTracker = {
    id: null,
    rollOptions: null,
};

type ModuleFlags = {
    files?: string[];
};

async function loadPredicates() {
    const files =
        (
            game.modules.get(MODULE_ID)?.flags?.[MODULE_ID] as
                | ModuleFlags
                | undefined
        )?.files ?? [];
    const data = await Promise.all(
        files
            .filter((f) => game.system.id === f || game.modules.get(f)?.active)
            .map(
                (f) =>
                    foundry.utils.fetchJsonWithTimeout(
                        `modules/pf2e-feat-filter/data/${f}.json`,
                    ) as Promise<
                        Record<ItemUUID, (PredicateStatement[] | null)[]>
                    >,
            ),
    );
    data.forEach(
        (d) =>
            (CONFIG[MODULE_ID].predicates = {
                ...CONFIG[MODULE_ID].predicates,
                ...Object.fromEntries(
                    Object.entries(d)
                        .map(
                            ([uuid, predicateSources]) =>
                                [
                                    uuid,
                                    predicateSources.map(preprocessPredicate),
                                ] as [string, (Predicate | null)[]],
                        )
                        .filter(([_, v]) => v.some(Boolean)),
                ),
            }),
    );
    console.log(`${MODULE_ID} | Loaded prerequisites`);
    Hooks.call(`${MODULE_ID}.prerequisitesReady`);
}
async function refreshList() {
    const list = document.querySelector(
        'div#compendium-browser div.browser-tab[data-tab-name="feat"] ul.result-list',
    );
    if (!list) return;
    game.pf2e.compendiumBrowser.tabs.feat.filterData.checkboxes.skills.selected =
        game.pf2e.compendiumBrowser.tabs.feat.filterData.checkboxes.skills.selected.map(
            (e) => e,
        );
}

function patchCompendium() {
    if (!libWrapper) return ui.notifications.error("Need libwrapper active");
    libWrapper.register(
        MODULE_ID,
        "game.pf2e.compendiumBrowser.tabs.feat.filterIndexData",
        function (
            wrapped: CompendiumBrowserFeatTab["filterIndexData"],
            entry: Parameters<CompendiumBrowserFeatTab["filterIndexData"]>[0],
        ) {
            if (!wrapped(entry)) return false;
            if (game.settings.get(MODULE_ID, "filter-mode") !== "hide")
                return true;
            const predicateSource = CONFIG[MODULE_ID].predicates;
            if (!currentActor.rollOptions) return true;
            let predicates = predicateSource[entry.uuid as ItemUUID];
            if (predicates) {
                return predicates.every(
                    (p) => p == null || p.test(currentActor.rollOptions ?? []),
                );
            }
            return true;
        },
    );

    if (game.settings.get(MODULE_ID, "guess-unmapped-prerequisites")) {
        const isCompendiumCollection = (
            pack:
                | fd.abstract.DocumentCollection<fd.abstract.ClientDocument>
                | undefined,
        ): pack is CompendiumCollection =>
            pack?.constructor.name === "CompendiumCollection";

        libWrapper.register(
            MODULE_ID,
            "game.pf2e.compendiumBrowser.tabs.feat.loadData",
            async function (
                this: CompendiumBrowserFeatTab,
                wrapped: CompendiumBrowserFeatTab["loadData"],
            ) {
                await wrapped();
                const feats = this.indexData;
                const packs = Array.from(
                    new Set(
                        feats.map(
                            (f) => foundry.utils.parseUuid(f.uuid)?.collection,
                        ),
                    ),
                );
                for await (const p of packs) {
                    if (!p) continue;
                    if (isCompendiumCollection(p)) {
                        await p.getIndex({ fields: ["system.prerequisites"] });
                    }
                }
                for (const entry of this.indexData) {
                    const prerequisites = ((
                        foundry.utils.fromUuidSync(entry.uuid) as FeatPF2e
                    )?.system.prerequisites?.value ?? []) as {
                        value: string;
                    }[];
                    entry.prerequisites = prerequisites.map((p) => p.value);
                    const predicates = CONFIG[MODULE_ID].predicates[entry.uuid];
                    if (predicates) {
                        prerequisites.map((p, i) =>
                            PredicateGuesser.add(p.value, predicates[i]),
                        );
                    }
                }
                for (const entry of this.indexData) {
                    if (entry.prerequisites.length == 0) continue;
                    const predicates = CONFIG[MODULE_ID].predicates;
                    if (predicates[entry.uuid]) continue;
                    predicates[entry.uuid] = (
                        entry.prerequisites as string[]
                    ).map((p) => PredicateGuesser.get(p));
                }
            },
        );
    }
}

function assignCharacter() {
    const defaultToCharacter = game.settings.get(
        MODULE_ID,
        "defaults-to-character",
    );
    const mustHaveSheetOpen = game.settings.get(
        MODULE_ID,
        "must-have-sheet-open",
    );
    let actor = [
        ...canvas.tokens.controlled.filter((t) => t).map((t) => t.actor),
        ...(defaultToCharacter && game.user.character
            ? [game.user.character]
            : []),
    ].find(
        (a) =>
            a?.isOfType("character") &&
            a.isOwner &&
            (!mustHaveSheetOpen || a.sheet?.rendered),
    );
    if (!actor || !actor.isOfType("character")) {
        // console.debug("PF2e Feat Filter | Filter reset");
        currentActor.id = null;
        currentActor.rollOptions = null;
        Hooks.callAll("pf2e-feat-filter.characterAssigned", currentActor);
        refreshList();
        return;
    }
    if (actor.id == currentActor.id) return;
    // console.debug(`PF2e Feat Filter | Filter for: ${actor.name}`);
    currentActor.id = actor.id;
    currentActor.rollOptions = getExtendedRollOptions(actor);
    Hooks.callAll("pf2e-feat-filter.characterAssigned", currentActor);
    refreshList();
}

Hooks.on("ready", async () => {
    registerSettings();

    const manifest = game.modules.get(MODULE_ID) as Module & {
        api: { [id: string]: Function };
    };
    CONFIG[MODULE_ID] = { predicates: {} };

    await loadPredicates();

    manifest.api = {
        getAllFeatPrerequisitesDev,
        getExtendedRollOptions,
        downloadPrerequisitesForPackage,
    };

    Hooks.on("updateActor", (actor) => {
        if (actor.id == currentActor.id) {
            currentActor.rollOptions = getExtendedRollOptions(actor);
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

    registerHighlightPrerequisites(currentActor);
    patchCompendium();

    hookBrowser(currentActor);
});

function registerSettings() {
    game.settings.register(MODULE_ID, "filter-mode", {
        name: "pf2e-feat-filter.settings.filter-mode.name",
        hint: "pf2e-feat-filter.settings.filter-mode.hint",
        scope: "user",
        type: new foundry.data.fields.StringField({
            choices: {
                mark: "pf2e-feat-filter.settings.filter-mode.mark",
                hide: "pf2e-feat-filter.settings.filter-mode.hide",
            },
            nullable: false,
            blank: false,
            initial: "mark",
            required: true,
        }),
        config: true,
        requiresReload: false,
        onChange: assignCharacter,
    });

    game.settings.register(MODULE_ID, "highlight-on-feat-sheet", {
        name: "pf2e-feat-filter.settings.highlight-on-feat-sheet.name",
        hint: "pf2e-feat-filter.settings.highlight-on-feat-sheet.hint",
        scope: "user",
        type: Boolean,
        config: true,
        default: true,
        requiresReload: false,
        onChange: assignCharacter,
    });

    game.settings.register(MODULE_ID, "defaults-to-character", {
        name: "pf2e-feat-filter.settings.defaults-to-character.name",
        hint: "pf2e-feat-filter.settings.defaults-to-character.hint",
        scope: "user",
        type: Boolean,
        config: true,
        default: false,
        requiresReload: false,
        onChange: assignCharacter,
    });

    game.settings.register(MODULE_ID, "must-have-sheet-open", {
        name: "pf2e-feat-filter.settings.must-have-sheet-open.name",
        hint: "pf2e-feat-filter.settings.must-have-sheet-open.hint",
        scope: "user",
        type: Boolean,
        config: true,
        default: false,
        requiresReload: false,
        onChange: assignCharacter,
    });

    game.settings.register(MODULE_ID, "use-extended-predicates", {
        name: "pf2e-feat-filter.settings.use-extended-predicates.name",
        hint: "pf2e-feat-filter.settings.use-extended-predicates.hint",
        scope: "user",
        type: Boolean,
        config: true,
        default: true,
        requiresReload: true,
    });

    game.settings.register(MODULE_ID, "ignore-specific-lores", {
        name: "pf2e-feat-filter.settings.ignore-specific-lores.name",
        hint: "pf2e-feat-filter.settings.ignore-specific-lores.hint",
        scope: "user",
        type: Boolean,
        config: true,
        default: false,
        requiresReload: true,
    });

    game.settings.register(MODULE_ID, "guess-unmapped-prerequisites", {
        name: "pf2e-feat-filter.settings.guess-unmapped-prerequisites.name",
        hint: "pf2e-feat-filter.settings.guess-unmapped-prerequisites.hint",
        scope: "user",
        type: Boolean,
        config: true,
        default: false,
        requiresReload: true,
    });
}
