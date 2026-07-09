import "@7h3laughingman/pf2e-types";
declare module "@7h3laughingman/pf2e-types" {
    interface ClientSettingsPF2e {
        get(module: "pf2e-feat-filter", key: "filter-mode"): "mark" | "hide";
        get(
            module: "pf2e-feat-filter",
            key: "choice-set-filter-mode",
        ): "mark" | "hide" | "none" | "same";
        get(
            module: "pf2e-feat-filter",
            key: "use-extended-predicates",
        ): boolean;
    }
}
