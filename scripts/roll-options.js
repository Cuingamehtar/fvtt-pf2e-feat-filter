import { MODULE_ID } from "../module.js";

export function getExtendedRollOptions(actor) {
    if (!game.settings.get(MODULE_ID, "use-extended-predicates"))
        return actor.getRollOptions();

    const rollOptions = [...actor.getRollOptions()];

    // best lore
    rollOptions.push(
        `feat-filter:lore:best:rank:${Object.values(actor.itemTypes.lore)
            .map((e) => e.system.proficient.value)
            .reduce((acc, e) => (acc > e ? acc : e), 0)}`
    );

    // focus
    const focus = actor.system.resources.focus?.max ?? 0;
    rollOptions.push(`feat-filter:focus:max:${focus}`);

    // spellcasting
    rollOptions.push(
        `feat-filter:spellcasting:rank:${actor.spellcasting.base.rank}`
    );
    // traditions
    const traditions = new Set(
        actor.spellcasting.collections
            .values()
            .filter((coll) => coll.entry.system)
            .map((coll) => coll.entry.system.tradition.value)
    );
    if (traditions.size > 0)
        rollOptions.push(
            ...traditions.map((t) => `feat-filter:spellcasting:tradition:${t}`)
        );

    // spells
    rollOptions.push(
        ...actor.itemTypes.spell.map(
            (e) =>
                `feat-filter:spell:${
                    e.slug ?? game.pf2e.system.sluggify(e.name)
                }`
        )
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

    // class hp
    const hp = actor.class?.system.hp;
    if (hp) rollOptions.push(`feat-filter:class:hp:${hp}`);

    // senses
    const senses = actor.system.perception.senses.map(
        (s) => `feat-filter:sense:${s.type}:${s.acuity}`
    );
    rollOptions.push(...senses);

    // languages
    rollOptions.push(
        ...actor.system.details.languages.value.map(
            (l) => `feat-filter:language:${l}`
        )
    );
    return rollOptions;
}
