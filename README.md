# Slop Meter

**Give it a mess. It tells you where to start.**

A codebase-analysis application for developers inheriting unfamiliar repositories. It turns source evidence into a small set of root causes, ranked engineering decisions, and a dependency-aware refactoring roadmap. It can run locally or as an authenticated, per-user Vercel application.

The hosted application is available at **https://slop-meter.vercel.app**.

## Run

Requires Node.js 22+ and Git for GitHub repositories.

```sh
npm install
npm run dev
```

Open **http://127.0.0.1:5173**. The API runs on **127.0.0.1:4310**. Both services bind to the local machine.

For a production frontend build served by the local API:

```sh
npm run build
npm start
```

Then open **http://127.0.0.1:4310**.

## Hosted deployment

The Vercel deployment uses Clerk for authentication and a private Vercel Blob store for per-user workspace data. Configure these variables through the corresponding Vercel integrations:

- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
- `CLERK_SECRET_KEY`
- `BLOB_READ_WRITE_TOKEN`

Hosted scans accept public GitHub repositories. Local-directory repositories and machine-local CLI harnesses are available only when running the application locally. The hosted function downloads a source archive, never executes repository scripts, scans it in temporary storage, and removes the temporary files afterward.

## What works

- Multiple GitHub and local repositories, with search and source filters.
- A usable sample workspace, explicitly labeled. Sample repositories cannot be scanned; add a real repository to analyze your own code.
- Real local baseline scans without an AI account. These inspect oversized modules, dynamic execution, silent failures, missing test filenames, and identical source files. Baseline signals are deliberately limited and phrased as review hypotheses.
- AI discovery through Codex, Claude Code, GitHub Copilot CLI, OpenAI API, or Anthropic API. Category names are open-ended; the AI is not constrained to the baseline checklist.
- Harness, model, thinking-effort, scan-depth, and Slop Profile selection. Copilot controls its own reasoning effort; its effort control is disabled.
- Repository inventory, bounded source batches, and a final cross-batch synthesis into root causes.
- Evidence drawers with actual source snippets, line numbers, rationale, confidence, effort, dependencies, citations, and step-by-step action plans.
- Priorities scored from impact, risk, blast radius, confidence, effort, profile emphasis, and improvements unlocked. A topological pass orders prerequisites before dependent work and removes cycles.
- Roadmap stages: start here, up next, intentionally later, and resolved.
- Decision status tracking and Markdown roadmap export. Refactoring happens in your editor or harness; Slop Meter never changes the repository's source files.
- Rescans update health and trends while preserving each scan's findings, profile snapshot, source commit when available, knowledge fingerprints, and scope.
- Current authoritative documentation retrieval, freshness timestamps, content fingerprints, failure states, and same-host redirect handling. Cached guidance is refreshed before an AI scan when older than 24 hours. Installed dependency manifests are supplied to the model for version/context matching.
- Custom profiles, presets, natural-language instructions, team rules, and adjustable category emphasis.
- Persistent settings and data, scan progress, cancellation, failure recovery, mobile navigation, focus-trapped dialogs, and reduced-motion support.

## Harness setup

Settings shows whether each CLI is installed or an API credential is present. Installation detection does not verify authentication.

| Harness        | Requirement                                   | Execution                                                               |
| -------------- | --------------------------------------------- | ----------------------------------------------------------------------- |
| Local baseline | None                                          | Runs entirely locally; no model call                                    |
| Codex          | Installed, authenticated `codex` CLI          | Noninteractive, read-only sandbox, isolated temporary working directory |
| Claude Code    | Installed, authenticated `claude` CLI         | Print mode, safe mode, tools disabled, no session persistence           |
| GitHub Copilot | Installed, authenticated `copilot` CLI        | Prompt mode, tool access denied                                         |
| OpenAI API     | `OPENAI_API_KEY` in the server environment    | Responses API; default `gpt-5.4`                                        |
| Anthropic API  | `ANTHROPIC_API_KEY` in the server environment | Messages API; default `claude-sonnet-4-6`                               |

Use your normal CLI sign-in flow. Set API credentials in your terminal or process manager before starting the server. Credentials are never entered into the browser, returned by the API, or written to the workspace database. `.env` files are not automatically loaded. Model names can be customized in Settings or the scan dialog; availability and effort support depend on the selected provider/model.

CLI behavior follows the locally installed versions. API integrations follow the [OpenAI Responses API](https://developers.openai.com/api/reference/resources/responses/methods/create), [Anthropic Messages API](https://platform.claude.com/docs/en/api/messages/create), and [GitHub Copilot CLI reference](https://docs.github.com/en/copilot/reference/copilot-cli-reference/cli-command-reference).

## Scope, evidence, and trust

A score is an estimate based on the observed scan, not a security certification. A clean local baseline can score 100 while missing problems outside its checks. The repository page labels baseline scope; every scan records its coverage. Compare scans using the same harness, profile, depth, and source scope.

Inventory honors root and nested `.gitignore` files. It skips symlinks, common generated/dependency directories, environment files, key files, common secret filenames, binary content, and oversized files. Common inline credential patterns are redacted, but this is not a complete secret-detection system. Only select repositories you intend to share with the chosen AI provider.

Inventory is bounded to 10,000 files, 30 MB of content, 200 KB per file, and 100,000 directory entries. AI source context is sampled across directories:

| Depth    | Source budget        | Maximum batches |
| -------- | -------------------- | --------------- |
| Quick    | 90,000 characters    | 2               |
| Standard | 360,000 characters   | 6               |
| Deep     | 1,200,000 characters | 20              |

Each source file contributes at most 25,000 characters; the inventory prompt is capped at 70,000 characters. One synthesis call follows when multiple batches are used. Provider context limits may require choosing a shallower depth. Costs are charged through the selected harness/account. Limits bound work but do not make very large scans exhaustive.

AI responses must satisfy a validated JSON contract. Evidence paths and line numbers must exist in the inventory; rendered snippets are taken from the actual source rather than trusting model-generated code. Unverified citation URLs are discarded. Counts for real AI scans represent cited evidence, not invented totals. Conclusions still require engineering review: a valid source location does not prove the interpretation is correct.

The initial knowledge library contains OWASP, React, Next.js, Express, and TypeScript documentation. The content evolves through refreshes; automatic discovery of arbitrary new sources and full semantic version pinning are future extensions. Dependency versions and source dates inform the AI, but applicability is not a mechanically verified fact. This release does not include an exhaustive package-advisory scanner, autonomous code changes, pull request creation, or team authentication.

Local GitHub scans use a fresh shallow clone of the default branch and may use existing local Git credentials for private repositories. Hosted scans download the default branch archive of a public GitHub repository. Repository scripts are not executed. Temporary snapshots are removed after scanning; evidence and the commit ID remain in scan history. Local-directory scans inspect the current working tree, including eligible uncommitted files.

## Persistence and configuration

Locally, all application state is saved atomically to `.data/workspace.json` with owner-only file permissions. `.data` is ignored by Git. Back up that file to retain repositories, scans, profiles, settings, and cached documentation.

On Vercel, each authenticated user receives an isolated workspace stored as a private Blob object under an opaque user-derived key. Workspace APIs require a valid Clerk session, and same-origin checks protect state-changing requests.

- `SLOP_DATA_DIR`: alternate data directory; useful for isolated tests.
- `PORT`: API port, default 4310. If changed during development, also change the Vite API proxy target.
- API credentials: `OPENAI_API_KEY`, `ANTHROPIC_API_KEY`.

A restart marks unfinished scans as interrupted rather than leaving permanent progress indicators. Two scans may run at once. Removing a repository removes its application records and history, not the original source directory.

## Implementation

React 19 + TypeScript + Vite, Express 5, Clerk, private Vercel Blob storage, Zod, Lucide icons, and locally served Inter fonts.

- `src/pages/`: individual product surfaces.
- `src/components/`: dashboard, charts, tables, scan flows, evidence drawer, and reusable controls.
- `server/analyzer.ts`: inventory, redaction, baseline signals, priority ordering, and health scoring.
- `server/providers.ts`: harness execution, model contract validation, batching, and synthesis.
- `server/index.ts`: local API, scan lifecycle, documentation refresh, and exports.
- `server/store.ts`: atomic persistence and restart recovery.
- `server/seed.ts`: clearly marked illustrative workspace.

## Verification

```sh
npm run check
npm test
npm run build
```

The automated suite covers exclusions and secret redaction, nested ignore rules, cancellation, grouped evidence, conservative architecture signals, dependency cycles, profile-sensitive prioritization, health bounds, malformed model responses, actual-source snippet substitution, and a real API workflow:

**Add local repository → scan → inspect evidence → resolve → modify fixture → rescan → compare health → export → verify immutable historical findings and disk persistence.**

A live Codex invocation was also verified against a synthetic three-line fixture. It identified the unsafe parser and returned valid, source-linked JSON. Other provider adapters are implemented but have not all been authenticated and exercised live in this environment.

The rendered application was tested in the Codex in-app browser. Evidence tabs, action plans, roadmap dependencies, adding a local repository, completing a real baseline scan, profile persistence, history, and all five documentation refreshes were exercised. Desktop visual captures use the installed agent-browser verifier because enlarged in-app screenshots clipped the viewport. Mobile was checked at 390 × 844 with no document-level horizontal overflow. The generated design reference is `docs/design-concept.png`.

Design comparisons cover the olive/white palette, sidebar and navigation, headline/action hierarchy, metric strip, ranked evidence rows, health chart, compression panel, repository table, typography, and responsive stacking. Runtime data, sample labeling, private workspace identity, and complete workflow controls intentionally replace speculative content in the generated concept.
