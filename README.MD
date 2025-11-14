# PF2e Feat Filter

This module uses the system's predicates to filter out the feats in Compendium Browser which prerequisites don't match the selected token's character. Only the data provided by actor's roll options are handled.

Non-English language warning - lore items are matched by their slugs, which are generated from their names. Unless the name is in English, the slug will likely not match the expected slug.

Initial release doesn't support any configuration, but that might change.

## Workflow

1. Open feats tab of Compendium Browser (either from character sheet or with a sidebar button).

2. Select the token you want to filter the abilities for. If you want the unfiltered list, deselect all tokens.

3. The list will autoupdate when you make changes to the selected actor.


4. When you open a feat sheet from the Compendium Browser, if its prerequisites are marked with `info` sign, you can hover and check which predicate is matching this feat.
