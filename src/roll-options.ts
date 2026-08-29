import { CharacterPF2e } from "@7h3laughingman/pf2e-types";
import { MODULE_ID } from "./module";
import type * as Translations from "../lang/en.json";

export function getExtendedRollOptions(actor: CharacterPF2e) {
    const rollOptions = [...actor.getRollOptions()];
    const translatedLores = getTranslatedLores(actor);
    if (translatedLores && translatedLores.length > 0)
        rollOptions.push(...translatedLores);

    if (!game.settings.get(MODULE_ID, "use-extended-predicates"))
        return rollOptions;

    // best lore
    rollOptions.push(
        `feat-filter:lore:best:rank:${Object.values(actor.itemTypes.lore)
            .map((e) => e.system.proficient.value)
            .reduce((acc, e) => (acc > e ? acc : e), 0)}`,
    );

    // focus
    const focus = actor.system.resources.focus?.max ?? 0;
    rollOptions.push(`feat-filter:focus:max:${focus}`);

    // spellcasting
    rollOptions.push(
        `feat-filter:spellcasting:rank:${actor.spellcasting.base.rank}`,
    );
    // traditions
    const traditions = new Set(
        actor.spellcasting.collections
            .values()
            .filter((coll) => typeof coll.entry.system !== "undefined")
            .map((coll) => coll.entry.system!.tradition.value),
    );
    if (traditions.size > 0)
        rollOptions.push(
            ...traditions.map((t) => `feat-filter:spellcasting:tradition:${t}`),
        );

    // spells
    rollOptions.push(
        ...actor.itemTypes.spell.map(
            (e) =>
                `feat-filter:spell:${
                    e.slug ?? game.pf2e.system.sluggify(e.name)
                }`,
        ),
    );
    // actions (currently disabled as some actions are not actually actions)
    /*
    rollOptions.push(
        ...actor.itemTypes.action.map(
            (e) =>
                `feat-filter:action:${
                    e.slug ?? game.pf2e.system.sluggify(e.name)
                }`
        )
    );*/

    // versatile heritage
    if (actor.heritage && actor.heritage.system.ancestry == null)
        rollOptions.push(`feat-filter:versatile-heritage`);

    // class hp
    const hp = actor.class?.system.hp;
    if (hp) rollOptions.push(`feat-filter:class:hp:${hp}`);

    // senses
    const senses = actor.system.perception.senses.map(
        (s) => `feat-filter:sense:${s.type}:${s.acuity}`,
    );
    rollOptions.push(...senses);

    // languages
    rollOptions.push(
        ...actor.system.details.languages.value.map(
            (l) => `feat-filter:language:${l}`,
        ),
    );

    // has familiar
    if (
        game.actors.some(
            (a) => a.isOfType("familiar") && a.system.master?.id == actor.id,
        )
    )
        rollOptions.push("feat-filter:has-familiar");

    // deity domains
    rollOptions.push(
        ...[
            ...(actor.deity?.system?.domains.primary ?? []),
            ...(actor.deity?.system?.domains.alternate ?? []),
        ].map((d) => `feat-filter:deity:domain:${d}`),
    );

    // list actions (unreliable)
    rollOptions.push(
        ...actor.itemTypes.action.map((a) => `feat-filter:action:${a.slug}`),
    );

    // hands
    rollOptions.push(
        `feat-filter:hands:total:${actor.system.hands?.max?.value ?? 0}`,
    );

    // handle special cases
    specialCases(rollOptions);

    return rollOptions;
}

let loreRegexes: { pattern: RegExp; slug: string }[] | undefined = undefined;
const cachedLores = new Map<string, string>();
let hasTranslation: boolean | undefined = undefined;
function getTranslatedLores(actor: CharacterPF2e) {
    if (game.i18n.lang === "en" || hasTranslation === false) return;
    if (
        !hasTranslation &&
        !(
            game.i18n.translations[MODULE_ID] as
                | (typeof Translations)["pf2e-feat-filter"]
                | undefined
        )?.lore.slugs
    ) {
        hasTranslation = false;
        return;
    }
    const loresRx = (loreRegexes ??= (() => {
        const locObject = (
            game.i18n.translations[
                MODULE_ID
            ] as (typeof Translations)["pf2e-feat-filter"]
        ).lore.slugs;
        return Object.entries(locObject).map(([slug, pattern]) => ({
            pattern: new RegExp(
                foundry.applications.ux.SearchFilter.cleanQuery(pattern.trim()),
                "i",
            ),
            slug,
        }));
    })());
    const lores = actor.itemTypes.lore
        .map((l) => {
            if (cachedLores.has(l.name)) {
                return `${cachedLores.get(l.name)}:${l.system.proficient.value}`;
            }
            const name = foundry.applications.ux.SearchFilter.cleanQuery(
                l.name,
            );
            for (const p of loresRx) {
                if (name.match(p.pattern)) {
                    cachedLores.set(l.name, `skill:${p.slug}:rank`);
                    return `skill:${p.slug}:rank:${l.system.proficient.value}`;
                }
            }
            cachedLores.set(l.name, `skill:${l.slug}:rank`);
            return `skill:${l.slug}:rank:${l.system.proficient.value}`;
            return null;
        })
        .filter((e) => e !== null);
    return lores;
}

function specialCases(options: string[]) {
    // alchemist chirurgeon
    if (
        options.includes("class:alchemist") &&
        options.includes("feature:chirurgeon")
    ) {
        upgradeProficiency(
            options,
            "skill:medicine:rank",
            "skill:crafting:rank",
        );
    }
    // as-on-the-board-so-on-the-battlefield
    if (options.includes("feat:as-on-the-board-so-on-the-battlefield")) {
        upgradeProficiency(
            options,
            "skill:warfare-lore:rank",
            "skill:games-lore:rank",
        );
    }
}

function optionValue(option: string) {
    const sep = option.lastIndexOf(":");
    return option.slice(sep + 1);
}

function upgradeProficiency(
    options: string[],
    target: string,
    ...variants: string[]
) {
    const maxVariant = options.reduce(
        (acc, e) =>
            Math.max(
                acc,
                variants.some((v) => e.startsWith(v))
                    ? Number(optionValue(e))
                    : 0,
            ),
        0,
    );
    const tg = options.findIndex((e) => e.startsWith(target));
    if (tg != -1) {
        options[tg] =
            `${target}:${Math.max(Number(optionValue(options[tg])), maxVariant)}`;
    } else {
        options.push(`${target}:${maxVariant}`);
    }
}
