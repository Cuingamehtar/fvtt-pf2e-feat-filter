import type { Predicate } from "foundry-pf2e";

export class PredicateGuesser {
    static populated: boolean = false;
    static #ignoreList: string[] = [];
    static #predicates: Map<string, Predicate | null> = new Map();

    static preparePrerequisite(p: string) {
        return p.toLocaleLowerCase().trim();
    }

    static add(prerequisite: string, predicate: Predicate | null) {
        prerequisite = this.preparePrerequisite(prerequisite);
        if (predicate === null) {
            this.#ignoreList.push(prerequisite);
            return;
        }
        if (!this.#ignoreList.includes(prerequisite)) {
            const p = this.#predicates.get(prerequisite);
            if (typeof p === "undefined") {
                this.#predicates.set(prerequisite, predicate);
            } else if (JSON.stringify(predicate) !== JSON.stringify(p)) {
                this.#predicates.delete(prerequisite);
                this.#ignoreList.push(prerequisite);
            }
        }
    }

    static get(prerequisite: string) {
        prerequisite = this.preparePrerequisite(prerequisite);
        const p = this.#predicates.get(prerequisite);
        return typeof p === "undefined" ? null : p;
    }
}
