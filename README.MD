# PF2e Feat Filter

[Foundry Page](https://foundryvtt.com/packages/pf2e-feat-filter/) | [Discussion](<https://discord.com/channels/880968862240239708/1439038249640267959>)

This module uses the system's predicates to filter out the feats in Compendium Browser which prerequisites don't match the selected token's character. Only the data provided by actor's roll options are handled.

Non-English language warning - lore items are matched by their slugs, which are generated from their names. Unless the name is in English, the slug will likely not match the expected slug.

Initial release doesn't support any configuration, but that might change.

## Workflow

1. Open feats tab of Compendium Browser (either from character sheet or with a sidebar button).

2. Select the token you want to filter the abilities for. If you want the unfiltered list, deselect all tokens.

https://github.com/user-attachments/assets/efc6c45b-679b-4b7d-8e79-f6c1fd427f5d

3. The list will autoupdate when you make changes to the selected actor.

https://github.com/user-attachments/assets/ff0b154c-b3b0-48bc-a5c1-d0e81f43eccd

4. When you open a feat sheet from the Compendium Browser, if its prerequisites are marked with `info` sign, you can hover and check which predicate is matching this feat.

https://github.com/user-attachments/assets/d0aa5082-7645-417c-86ce-1f8dd87d8e22

## Current predicates match the following

-   Attributes
-   Specific skills
-   Specific lores (in English only)
-   Generic armor and weapon ranks
-   Features/Feats
-   Speed (just the fact of it, not specific values)
-   Deity and sanctification
-   Spellcasting rank
-   Spells

## Not matched

-   Actions
-   Unarmed strikes
-   Other stuff not tracked by the system
