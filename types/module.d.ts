import type { ModuleConfig } from "../src/module";
import type { GamePF2e } from "foundry-pf2e";
declare global {
    interface ConfigPF2e {
        ["pf2e-feat-filter"]: ModuleConfig;
    }
}
