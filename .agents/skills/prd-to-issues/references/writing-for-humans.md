# Writing for Humans

Pipeline artifacts — GitHub issues, PR bodies, diagnostic reports — must be readable in one pass by someone who doesn't already have the codebase in their head. That "someone" is usually future-you six months from now.

This doc defines the **plain-language walkthrough**: the shape, when to write one, when to skip, and the revision bar. Skill templates (`/qa`, `/triage-issue`, `/pre-merge`, `/prd-to-issues`) reference this doc instead of re-encoding the principle themselves.

The burden this doc places on templates is small: *existing* narrative slots (`## Summary`, `## Problem`, `## Additional context`) get a sharper bar for what the words must do. No new required section is added.

## The shape

A plain-language walkthrough is ordered like this:

1. **Domain setup** — one paragraph. What part of the system matters here, named in the user's own words. Not "the `parseDate()` utility"; rather "the part of the app that reads dates from the state government's public data feed." A reader who has never opened this repo should be able to follow.
2. **The lede** — one sentence. What changed, or what's wrong. Front-loaded. State it before you qualify it. This is Smart Brevity's *Lede* and Zinsser's *lead as contract* — the sentence that earns the reader's next sentence.
3. **Each step named and motivated** — short paragraphs or tight bullets. For each piece of the change: what it does, and *why that was the right move* given the domain setup above. Not a restatement of the diff.
4. **Why it matters** — one or two sentences. What this unlocks, prevents, or clarifies for users or future maintainers. This is Smart Brevity's *Axiom* (`Why it matters:`) carried into artifact bodies.
5. **Optional: follow-ups or teaching note** — loose ends, related work you consciously deferred, or a one-line pattern the next person can reuse.

That's it. The shape mirrors Smart Brevity's Core 4 (*Tease → Lede → Axiom → Go Deeper*) adapted to issue and PR bodies. The bullets, boundary maps, and structured sections around the walkthrough are unchanged — they still carry traceability.

## When to write one

Write a walkthrough when the artifact will be read by someone reconstructing context. In practice, that means:

- **Non-trivial PR bodies** — any behavior change, new surface area, bug fix with a non-obvious root cause, refactor that crosses module boundaries.
- **Bug issues from `/qa`** that describe a failure whose domain meaning isn't obvious from the stack trace — i.e., most of them.
- **Deeper diagnosis issues from `/triage-issue`** — these are the richest bug artifacts in the repo. They benefit most from a domain frame before the Root Cause Analysis bullets.

## When to skip

Skip the walkthrough when the artifact body would only dilute the change. Explicit list:

- Typo fixes, copy-only edits.
- Dependency bumps with no behavior change.
- Formatting-only PRs (prettier, biome, rename-only refactors).
- Single-line reverts (let the reverted commit's own walkthrough speak).
- Trivially-reproducible bugs with no domain nuance (`npm install` fails with a clear error message — the stack trace is the walkthrough).

These exemptions are load-bearing. Without them, "include a walkthrough" becomes ceremony, and agents will fill the slot with filler that restates the bullets beside it — the Meadows policy-resistance failure mode. When in doubt, a one-sentence summary is better than a padded walkthrough.

## What counts vs. what doesn't

The walkthrough must carry the **mental model** the bullets can't. It is not a narrativized restatement of the `## Key changes` list.

**Doesn't count** — restates the structured sections:

> This PR fixes a bug in `parseDate()`. It updates the regex and adds a fallback. The fix is tested with two new unit tests. Closes #27.

A reader who doesn't know the codebase still doesn't know what the bug *meant* or why the fix is shaped the way it is.

**Counts** — supplies the mental model:

> The app reads bill-hearing dates from the state government's public data feed. That feed started returning a format we didn't anticipate (`04/15/2026` instead of `2026-04-15`), so every hearing after April 15 silently dropped off the calendar page — users saw an empty list and assumed nothing was scheduled. The fix teaches the date parser to recognize both formats, with the ISO form preferred when both are present. We didn't change the feed contract or the calendar UI; just the translation layer in between. The two new tests lock in both formats so a future feed change breaks loudly instead of quietly.

Same PR. The second version tells a reader who has never seen this repo what happened, why it mattered, and what changed — without citing files or line numbers.

## Revision bar

Before hitting "Create issue" or "Create PR," run the walkthrough through these checks. They come from the two books cited below and are deliberately short:

- **Strip clutter.** Bracket every non-working word. Aim for a 50% reduction from the first draft. If a word doesn't do work, cut it. (*Zinsser, stripping principle.*)
- **Cut the warm-up.** The first paragraph of a first draft is almost always throat-clearing. Try deleting it — does the piece start stronger? (*Zinsser, warm-up paragraphs.*)
- **Bar/Beach Test.** Would you say this word out loud to a friend at a bar or the beach? If not, cut it. No "leverage," "ecosystem," "seamless." (*Smart Brevity, Bar/Beach Test.*)
- **Active verbs.** Replace passive constructions with the actor doing the thing. "A fallback was added" → "the parser now falls back to …" (*Zinsser, active verbs.*)
- **Concrete nouns.** "The calendar page" beats "the UI." "The state data feed" beats "the external service." (*Zinsser, significant detail.*)
- **Short, not shallow.** Cutting noise is not cutting substance. If you're deleting a sentence that supplies the mental model, put it back. (*Smart Brevity, Short-Not-Shallow.*)

The dogfooding test: would *you*, returning to this artifact cold in six months, understand what was done and why? If not, revise. If yes, ship.

## Guardrails

A few things this doc is **not** asking for:

- Not a new `## Walkthrough` section. The walkthrough lives *inside* the existing narrative slot (`## Summary`, `## Problem`, `## Additional context`).
- Not a word count. "Non-trivial" doesn't mean "long." A four-sentence walkthrough that carries the mental model beats a twelve-sentence one that restates the bullets.
- Not for every artifact. Shape, research, and compound artifacts have different readers and different shapes — they are out of scope here.
- Not a replacement for boundary maps, acceptance criteria, or any structured-traceability field. The walkthrough sits alongside them, not in place of them.

## Further reading

Both books are in `/library`:

- `/library smart-brevity` — Core 4 (Tease → Lede → Axiom → Go Deeper), Bar/Beach Test, Short-Not-Shallow, Why-it-matters signpost. Source for the *shape* and the *lede* discipline.
- `/library william-zinsser-on-writing-well` — stripping principle, 50% rule, active verbs, lead-as-contract, reader fragility, warm-up paragraphs. Source for the *revision bar*.

Cross-references already in the repo:

- Ousterhout §*Comments* — comments carry the mental model the code can't show. Artifact bodies carry the same burden.
- Ousterhout §*Strategic vs. tactical programming* — writing for readers at artifact-creation time is the strategic investment; "explain it to me" follow-ups are the tactical cost.
- Meadows §*Policy resistance* — required sections that are seen as busywork get filled with filler. The "when to skip" list above is what prevents this.
