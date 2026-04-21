---
name: cevapi
description: Sync this repo (iotaledger/ts-packages) with the latest JS/TS-related changes from the source repos (iotaledger/iota and iotaledger/iota-names). Use when the user wants to pull in upstream changes, check for drift, or update specific folders/files.
disable-model-invocation: true
allowed-tools: Bash(*), Read, Write, Edit, Glob, Grep, Agent
argument-hint: [branch-or-ref] (defaults to develop)
---

# Cevapi — Sync from upstream repos

You are working in **https://github.com/iotaledger/ts-packages** (this repo).

There are two source repos:
1. **Primary:** https://github.com/iotaledger/iota
2. **Secondary:** https://github.com/iotaledger/iota-names

Your job is to make sure this repo has the latest JS/TS/Node-related files and folders from both source repos, and that all config files are adapted to include packages from both sources.

## Source ref

Use `$ARGUMENTS` as the git ref to sync from (applied to both repos). If no argument is provided, default to `develop`.

---

## Source 1: iotaledger/iota

### Directories (copy entirely, preserving paths)

- `apps/` — all frontend apps (wallet, explorer, wallet-dashboard, ui-kit, ui-icons, core, apps-backend, apps-backend-client, evm-bridge)
- `sdk/` — all SDK packages (typescript, bcs, dapp-kit, graphql-transport, kiosk, create-dapp, build-scripts, examples, signers, wallet-standard, ledgerjs-hw-app-iota, isc-sdk) — **excluding `sdk/move-bytecode-template/`**
- `dapps/` — dapp examples and tools (kiosk, kiosk-cli, multisig-toolkit, regulated-token, sponsored-transactions)
- `.changeset/` — changeset configuration and pending changesets
- `.husky/` — git hooks (pre-commit)
- `linting/license-check/` — ESLint license check plugin (package.json, plugin.js, rules/)
- `.license_ignore` — license ignore patterns
- `.license_template` — license header template

### GitHub workflows (selective)

From `.github/`, sync:
- `.github/CODEOWNERS`
- `.github/ISSUE_TEMPLATE/`
- `.github/PULL_REQUEST_TEMPLATE/`
- `.github/actions/`
- `.github/dependabot.yml`
- `.github/labeler.yml`
- `.github/pull_request_template.md`
- `.github/auto-merge.yml`
- Workflows related to JS/TS/apps/SDK/changesets — specifically any workflow file matching:
  - `apps_*`
  - `changesets_*`
  - `check_sri.yml`
  - `hierarchy.yml`
  - `labeler.yml`
  - `pr_lint.yml`
  - `stale.yml`
  - `nightly.yml`
- **Do NOT sync** Rust-only workflows (`_rust*.yml`, `_cargo_deny.yml`, `cargo_llvm_cov.yml`, `_typos.yml`, `_docs_lint.yml`, `_docusaurus.yml`, `release_docker*.yml`, `release_wiki.yml`, `preview_wiki.yml`, `crate_docs.yml`, `choco_publish.yml`, `_split_cluster*.yml`, `_execution_cut.yml`, `release_move_ide.yml`, `_move_ide.yml`, `_ledgernano.yml`, `develop_ci_slack_report.yml`, `_e2e.yml`, `links_checker.yml`)
- **Do NOT sync** infra-related templates:
  - `.github/ISSUE_TEMPLATE/bug_report_infra.md`
  - `.github/PULL_REQUEST_TEMPLATE/infra.md`

### Root config files

Copy these root-level files as a starting base:
- `package.json`
- `pnpm-lock.yaml`
- `pnpm-workspace.yaml`
- `turbo.json`
- `.eslintrc.js`
- `.npmrc`
- `.prettierignore`
- `.lintstagedrc.json`
- `prettier.config.js`
- `graphql.config.ts`
- `vercel.json`
- `.gitignore`

---

## Source 2: iotaledger/iota-names

### Directories (copy with path remapping)

- `dapp/` → copy to **`apps/names/`** in this repo
- `sdk/` → copy to **`sdk/names/`** in this repo
- `packages/` → copy to **`packages/`** in this repo (contains: auction, coupons, iota-names, payments, subnames, temp-subname-proxy)
- `build-scripts/` → copy to **`build-scripts/`** in this repo (or merge if iota already has one in sdk/)
- `names-display/` → copy to **`apps/names-display/`** in this repo

### GitHub workflows from iota-names

From `.github/workflows/`, sync these JS/TS-related workflows (prefix them with `names_` if they would conflict with iota workflows):
- `changesets.yml`
- `changesets_ci.yml`
- `changesets_ci_comment.yml`
- `changesets_publish.yml`
- `iota_names.preview_deploy.yml`
- `iota_names.production_mainnet_deploy.yml`
- `iota_names.production_testnet_deploy.yml`
- `iota_names.staging_deploy.yml`
- `names_display.production_deploy.yml`
- `typescript.yml`
- `typescript_nightly.yml`
- `vercel_app_deploy.yml`
- `labeler.yml` (merge with iota's if conflicting)
- **Do NOT sync** Move/Rust/indexer-only workflows (`move_packages.yml`, `indexer.yml`, `iota_names_indexer_docker_build.yml`, `dprint.yml`, `typos.yml`, `links_checker.yml`, `deploy_docs_vercel.yml`, `develop_ci_slack_report.yml`)

Also sync from `.github/`:
- `.github/CODEOWNERS` (will be rewritten — see config adaptation section)
- `.github/ISSUE_TEMPLATE/` (merge with iota's)
- `.github/dependabot.yaml` (merge with iota's `dependabot.yml`)

---

## Post-sync: Adapt config files

After copying files from both sources, adapt the following configs so they include packages from **both** iota and iota-names:

### `pnpm-workspace.yaml`
- Must include workspace entries for all synced directories: `apps/*`, `sdk/*`, `dapps/*`, `packages/*`, `build-scripts`, `names-display`, `apps/names`, `sdk/names`
- Remove any Rust/Move-only workspace entries from the iota source

### `turbo.json`
- Ensure pipeline entries cover packages from both sources
- If iota-names has turbo tasks not present in iota's config, merge them in

### `package.json`
- Merge root-level scripts from both repos where applicable
- Merge devDependencies from both repos

### GitHub workflows
- **Deduplicate:** Both repos have overlapping workflows (e.g., `changesets_ci.yml`, `changesets_publish.yml`, `labeler.yml`). Do NOT keep two copies. Merge them into a single workflow that covers packages from both sources.
- **Merge path filters:** Any workflow that references hardcoded paths (e.g., `apps/wallet`, `sdk/typescript`) should also include the iota-names paths (`apps/names`, `sdk/names`, `packages/*`, `apps/names-display`) in its path triggers and filters.
- **Merge jobs:** If both repos have a similar workflow (e.g., both have a TypeScript CI workflow), combine them into one workflow with jobs/steps that cover all packages rather than having two separate workflows.
- **Rename to avoid ambiguity:** If an iota-names workflow does something unique (not covered by any iota workflow), keep it but prefix with `names_` to make its scope clear.

### `.github/CODEOWNERS`
- Do NOT merge ownership rules from both repos. Instead, rewrite CODEOWNERS so that **everything is owned by the tooling team** (`@iotaledger/tooling`). Replace all existing ownership entries accordingly.

### `.github/labeler.yml`
- Merge labeling rules from both repos

### `.github/dependabot.yml`
- Merge dependency update configs from both repos (note: iota-names uses `dependabot.yaml` with `.yaml` extension)

---

## Sync state tracking

This skill tracks the last synced commit for each source repo in `${CLAUDE_SKILL_DIR}/state.json`. The file has this structure:

```json
{
  "last_sync": "2026-04-02T12:00:00Z",
  "iota_commit": "abc1234...",
  "iota_names_commit": "def5678..."
}
```

Read this file at the start of every run. If both commit fields are `null`, this is a **first run** (full sync). Otherwise, it's an **incremental sync**.

---

## How to sync

### Step 0: Read state and preview changes

1. Read `${CLAUDE_SKILL_DIR}/state.json` to get the last synced commits.

2. Clone both source repos (full history needed for changelog — do NOT use `--depth 1` unless it's the first run):
   ```
   git clone --branch <ref> https://github.com/iotaledger/iota.git /tmp/iota-sync-source
   git clone --branch <ref> https://github.com/iotaledger/iota-names.git /tmp/iota-names-sync-source
   ```
   On first run you can use `--depth 1` since there's no previous commit to diff against.

3. **If this is NOT the first run**, show a human-readable summary of upstream changes since the last sync:

   For each source repo, run:
   ```
   git -C /tmp/<repo> log --oneline --no-merges <last_commit>..HEAD -- <relevant_paths>
   ```
   Where `<relevant_paths>` are the JS/TS directories and files listed in the "What to sync" sections.

   Present the summary grouped by repo, like:

   ```
   ## Changes since last sync

   ### iotaledger/iota (abc1234 → new_hash)
   - feat: add new wallet feature (3 files in apps/wallet)
   - fix: dapp-kit connection bug (2 files in sdk/dapp-kit)
   - chore: update eslint config

   ### iotaledger/iota-names (def5678 → new_hash)
   - feat: add subdomain support (5 files in dapp/, 2 files in sdk/)
   - fix: auction expiry calculation
   ```

   **Ask the user to confirm before proceeding with the sync.** If the user declines, stop and clean up.

### Step 1: Build the commit queue

Collect all upstream commits to port, sorted chronologically (oldest first), interleaved across both repos.

For each commit, record:
- Source repo (`iota` or `iota-names`)
- Commit hash
- Commit message
- Files changed (from `git diff --name-only <hash>^..<hash>`)

Filter out commits that touch only files outside the sync scope (e.g., Rust-only changes). If a commit touches both in-scope and out-of-scope files, include it but only port the in-scope files.

Present the full ordered queue to the user before starting, e.g.:
```
## Commit queue (8 commits, oldest → newest)
1. [iota] 22e7eb81 feat(ts-sdk): add support for effective commission rate
2. [iota] f15c61dc feat(dapps): update dapps effective commission rate
3. [iota-names] 749b7d4f chore(names-sdk): Rework names sdk release workflow
...
```

### Step 2: Port commits one by one

For each commit in the queue:

1. **Identify the files to copy** — run `git diff --name-only <hash>^..<hash>` on the source repo. Apply path remappings for iota-names files (`dapp/` → `apps/names/`, `sdk/` → `sdk/names/`, etc.). Skip files that are out of scope per the exclusion rules.

2. **Check if the commit is already incorporated** — if all changed files already match the upstream content, skip this commit and note it as "already incorporated".

3. **Copy the files** — read each file from the source clone and write it to the correct destination path in this repo.

4. **Apply any necessary adaptations** — if the commit touches a config file that requires merging (e.g., `pnpm-workspace.yaml`, `package.json`, `turbo.json`), apply only the delta from this commit rather than overwriting with the upstream version wholesale.

5. **Create a commit** — stage the ported files and commit with the original commit message (verbatim). Do **not** add any `Co-Authored-By` trailer.

   ```bash
   git add <files>
   git commit -m "<original message>"
   ```

6. **Report** what was ported and move to the next commit.

### Step 3: Update sync state

After all commits are ported, record the HEAD commits into `${CLAUDE_SKILL_DIR}/state.json`:
```json
{
  "last_sync": "<current ISO timestamp>",
  "iota_commit": "<HEAD of iota clone>",
  "iota_names_commit": "<HEAD of iota-names clone>"
}
```

### Step 4: Clean up

Remove the temporary clones when done.

## Post-sync: Deduplicate shared packages and utilities

Both source repos may contain overlapping packages or utilities (e.g., `build-scripts/` exists in both iota and iota-names). After copying:

1. Identify any duplicated packages, APIs, or utilities that exist in both sources.
2. Keep a single canonical version — prefer iota's version as the base since it's the primary source.
3. If the iota-names version has additions not present in iota's, merge those additions into the canonical version.
4. Update all `package.json` imports and references across the repo to point to the deduplicated package.
5. Report all deduplication decisions to the user for review.

Known overlaps to watch for:
- `build-scripts/` — exists in both repos
- Any shared ESLint/Prettier configs or utility packages

---

## Post-sync: Replace npm releases with workspace references

Since both source repos now live in the same monorepo, packages that previously depended on each other via **npm releases** should instead use **workspace references** (`workspace:*`) so they consume local builds.

For example, if an iota package depends on `@iota-names/sdk` (or similar) via a versioned npm dependency like `"@iota-names/sdk": "^1.2.3"`, replace it with `"@iota-names/sdk": "workspace:*"`. Likewise, if an iota-names package depends on any iota SDK package via npm, replace those with `workspace:*` too.

Steps:
1. After copying all files, scan every `package.json` across `apps/`, `sdk/`, `dapps/`, `packages/`, `build-scripts/`, `names-display/`, and `apps/names/`, `sdk/names/` for cross-repo npm dependencies.
2. Replace any versioned dependency that points to a package now present in this workspace with `workspace:*`.
3. Report all replacements made to the user.

---

## Important notes

- Do NOT sync Rust crates, Cargo files, Rust toolchain configs, Move packages, or Rust-specific CI.
- When copying files, preserve them as-is. Only modify files during the **post-sync adaptation** steps, and only for config merging and workspace reference rewiring.
- If a workflow references paths or jobs that only exist in the original monorepo context, flag it to the user but still copy it.
- When merging configs, prefer iota's version as the base and layer iota-names additions on top.
- If there are conflicting workflow filenames between the two repos, prefix the iota-names version with `names_` to avoid overwrites.
