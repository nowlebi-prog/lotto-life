# Lotto Life Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver a complete deployable Korean browser-local lottery story game with two modes, 20 fixed character presets and 20 selectable success endings.

**Architecture:** Vanilla HTML/CSS/ES modules, browser-only in-memory state, no runtime dependencies or API calls. Pure engine validates all actions; story content is data. A small Node build copies static assets into dist and a local server supports preview.

**Tech Stack:** Native JavaScript, CSS, Canvas export, Node test runner and HTTP server, Playwright for browser QA.

**Spec:** docs/spec/product.md

## Global Constraints

- No login, backend, database, persistence, analytics, user-to-user interaction or real personal information.
- Male 10 and female 10 immutable preset IDs. Only gender and nickname inputs.
- Winner mode guarantees rank 1 and receipt; random mode permits exactly one major scenario.
- Rank 2 is five main numbers plus bonus. Rank 3 is five main numbers without bonus.
- Twenty first-action endings available only after rank-1 claim. All choices accessible to all genders.
- Relative asset URLs and static output must work under a GitHub Pages repository subpath.
- Safe literal text rendering and client-side image download. No external font/CDN dependency.

## Tasks

### Task 1 Engine and content

Files: src/data.js, src/engine.js, tests/engine.test.js.
Interface: exports PRESETS, ENDINGS, SCENARIOS; createRun({mode,gender,nickname,presetId,random,scenarioId}), getScene(run), advance(run,choiceId), finishEnding(run,endingId), choosePreset(gender,random), matchingRank(numbers,draw,bonus), normalizeNickname(value).
getScene returns {id,background,speaker,title,text,choices:[{id,label,hint?}],stage,progress}. advance returns a new state; stale/invalid choices do not progress. run includes sceneId, mode, scenarioId, nickname, presetId, ticket, verifiedRank, claimed, endingId, history. Static messages are authored in Korean.

- [ ] Write node:test cases for first-mode guarantee, rank math, all seven scenarios, fixed ticket, invalid choice, no claim twice and all 20 endings.
- [ ] Run tests before engine implementation and record missing behavior.
- [ ] Implement pure engine and complete Korean narrative content.
- [ ] Run tests, review requirements and report exact contract.

### Task 2 Art assets

Files: public/assets only, assets-manifest.json and docs/art-assets.md.
Existing design refs are in ../output/lotto-life-v3-endings-characters/boards.

- [ ] Generate male and female 5x2 transparent character atlases with 10 cells each, no labels, uniform safe cells.
- [ ] Generate reusable empty room, shop street and fictional bank backgrounds plus an empty 5x4 ending scene atlas.
- [ ] Prepare web assets and a manifest describing sprite grid/crops. Preserve originals outside public when unnecessary for download weight.
- [ ] Inspect all generated assets; report fallback assets honestly if transparency/grid is unsuitable.

### Task 3 UI and build

Files: index.html, src/app.js, src/styles.css, scripts/build.mjs, scripts/serve.mjs, package.json.

- [ ] Connect engine to mode selection, character setup, dialogue stage, phone/ticket views, local progress and endings.
- [ ] Render strings as text, validate nickname, freeze frame action handlers against double clicks, preserve a preset for the full run.
- [ ] Implement 20-choice grid and canvas card export with selected character and nickname.
- [ ] Add accessible focus, keyboard choices, reduced motion and mobile layouts.
- [ ] Add zero-dependency static build and local server, validate copied assets.

### Task 4 QA and delivery

Files: tests/browser.test.mjs, README.md, .github/workflows/pages.yml, docs/verification.md.

- [ ] Test all engine branches and all ending IDs; inspect desktop/mobile screenshots and actual image export.
- [ ] Test network/storage behavior and fresh reload; test hostile nickname and rapid clicks.
- [ ] Request independent code review, fix important findings and repeat affected checks.
- [ ] Build clean static output and prepare source/deploy archives with no credentials.
- [ ] Check authorized GitHub publication and private Sites preview when available; if unavailable deliver upload-ready final files.

## Rulings and execution ledger

- New standalone repository is necessary: the shared workspace has no HEAD and contains unrelated untracked projects. No parent repository mutation or user-file staging.
- Development branch: codex/lotto-life. Existing session authorization covers implementation and GitHub publication of this new app.
- First mode and random mode share rendering but not failure conditions. No live user data is simulated as real.
- Source UI can be implemented alongside the independent pure engine and asset work using the fixed interface above.
