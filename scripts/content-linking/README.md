# Content Linking Scripts

Scripts for auditing and repairing broken links inside `src/content/`.

---

## What the scripts do

| Script | Purpose |
|---|---|
| `audit-links.mjs` | Scans all content files and reports broken internal and external links |
| `fix-links.mjs` | Attempts to repair broken links automatically; inserts `TODO` markers where repair is not possible |

---

## How to run

### Audit (read-only)

```bash
node scripts/content-linking/audit-links.mjs
```

Prints a report of every broken link grouped by file. Does not modify any content.

### Fix

```bash
node scripts/content-linking/fix-links.mjs
```

Rewrites content files in place. Review `git diff` afterwards to confirm changes.

---

## Auto-fix behaviour

### Internal links

All internal links (links whose target resolves to another file inside `src/content/`) are auto-fixed using a **title map** derived from each file's frontmatter `title`. If a link text or slug no longer matches a live document, the script resolves the correct slug from the title map and rewrites the href.

### External links

External links are handled in two tiers:

1. **Known mappings** — a curated list of old-URL → new-URL pairs (`link-mappings.json`). Matching links are rewritten automatically.
2. **Unknown / unverifiable links** — links that cannot be matched by a known mapping are left in place and annotated with an inline `<!-- TODO: verify external link -->` comment so they are easy to find and review manually.

> External links are never silently deleted. A `TODO` marker is always preferred over data loss.

---

## Adding known mappings

Edit `scripts/content-linking/link-mappings.json`:

```json
{
  "https://old-domain.com/old-path": "https://new-domain.com/new-path"
}
```

Re-run `fix-links.mjs` to apply.
