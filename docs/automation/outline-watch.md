# Outline watch

**Status: documented, not scheduled.**

Keeps each recipe honest against the issuer's public exam outline.

1. For each recipe, fetch `exam.outline.source_url`.
2. Compare the effective date, domain names, weights and subdomain headings
   with the recipe.
3. **No change:** open a PR that only bumps `exam.outline.last_checked`.
4. **Change:** open an issue for the owner describing exactly what differs, with
   the source link. Never edit domains, weights or headings automatically; the
   owner approves a recipe PR, after which `pnpm validate` warns on every question
   written against the old `outline_version` so they can be re-checked.
5. **Page unreachable or restructured:** open an issue saying so; don't guess.
