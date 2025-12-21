export * from "foundry-pf2e";

declare module "foundry-pf2e" {
    interface ClientSettingsPF2e {
        get(module: "pf2e-feat-filter", key: "filter-mode"): "mark" | "hide";
        get(
            module: "pf2e-feat-filter",
            key: "use-extended-predicates",
        ): boolean;
    }
}
