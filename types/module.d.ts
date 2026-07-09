import { ItemPF2e } from "@7h3laughingman/pf2e-types";
import type { ModuleConfig } from "../src/module";
declare global {
    interface ConfigPF2e {
        ["pf2e-feat-filter"]: ModuleConfig;
    }

    type ItemUUID = ItemPF2e["uuid"];

    type CompendiumCollection = (typeof game.packs.contents)[0];

    type UnknownHookCallback = (p: unknown) => void;
}
