---
title: "Bench Court: Case Western v. University of Washington, or how my lab protocols went on trial"
published: true
tags: devchallenge, sanitychallenge, sanity, ai
cover_image: https://raw.githubusercontent.com/neromtoobad/aliquot/main/docs/img/court-case.jpg
---

*This is a submission for the [Sanity Challenge, Path Two: Vibe-Code Something Strange](https://dev.to/challenges/sanity-2026-09-16)*

## What I Built

Labs run on numbers that reputable sources can't agree on. How long should 1:10 bleach sit on a spill? The University of Washington says **30 minutes**, UC Santa Barbara **20**, Case Western **15–20**. How long do you autoclave biohazardous waste? Virginia Tech says **30 minutes**; UNC says **60**.

Someone in every lab eventually decides, and the decision usually lives in a PI's head or a laminated sheet nobody can find.

**Bench Court** puts those disagreements on trial.

- Every disputed value in my protocol dataset becomes a **case**, named the way the law would name it: *Case Western Reserve University v. University of Washington (bleach contact time)*.
- An **agent, the clerk**, reads every claim about that parameter, opens the case through **Sanity Workflows** and files a **brief**. The brief summarises each side with its source and authority, says whether the values truly conflict, and makes a recommendation.
- A **person, the bench**, opens the case in a courtroom app built with the **App SDK**. They read the exhibits and the brief, write a ruling, and bang one of four gavels: **Sustain**, **Overrule**, **Both apply**, **Dismiss**.
- The ruling is written back into the dataset as a **lab rule**. My other entry, [Aliquot](https://aliquot-five.vercel.app), a lab-protocol agent, applies lab rules *before* any outside source. So a ruling in Bench Court changes what the agent tells you at the bench.

The agent can move a case forward, but only a person can decide it, and both go through the same workflow transitions.

![The Bench Court app in the Sanity Dashboard: the case, the live workflow diagram, the claim on trial and the rival claims](https://raw.githubusercontent.com/neromtoobad/aliquot/main/docs/img/court-case.jpg)

## Demo

- **The court record (public):** https://aliquot-five.vercel.app/court. Every ruling so far, with the verdict stamp, the ruling text, the claim on trial and the clerk's brief.
- **The courtroom app** is an App SDK app deployed to my organization's Sanity Dashboard, so it's private to org members. Screenshots and the agent session below show it working.
- **The agent it governs:** https://aliquot-five.vercel.app. Ask it about anything that's been ruled on, and the lab rule shows up first.

<!-- VIDEO / GIF: open a case → read the brief → rule → the record updates → Aliquot cites the new lab rule -->

![The docket: five cases in session, each filed by the clerk agent](https://raw.githubusercontent.com/neromtoobad/aliquot/main/docs/img/court-docket.jpg)

![The clerk's brief and the four gavels. "The clerk recommends, but only a person can rule."](https://raw.githubusercontent.com/neromtoobad/aliquot/main/docs/img/court-brief.jpg)

The first ruling:

![The ruled case: a BOTH APPLY stamp, the ruling, and a note that it was entered into the lab SOP](https://raw.githubusercontent.com/neromtoobad/aliquot/main/docs/img/court-ruled.jpg)

The same ruling, a moment later, inside the agent it governs:

![Aliquot answering a bleach question: "Your lab's SOP overrides" quotes the Bench Court ruling, and the answer is 30 minutes inside the biosafety cabinet](https://raw.githubusercontent.com/neromtoobad/aliquot/main/docs/img/aliquot-obeys-ruling.jpg)

## Code

https://github.com/neromtoobad/aliquot. Bench Court lives in [`court/`](https://github.com/neromtoobad/aliquot/tree/main/court):

- [`workflows/bench-court.ts`](https://github.com/neromtoobad/aliquot/blob/main/court/workflows/bench-court.ts): the workflow definition (filed → hearing → ruled | dismissed)
- [`clerk.mjs`](https://github.com/neromtoobad/aliquot/blob/main/court/clerk.mjs): the clerk agent
- [`src/Court.tsx`](https://github.com/neromtoobad/aliquot/blob/main/court/src/Court.tsx): the courtroom (App SDK + `@sanity/workflow-sdk` + `@sanity/workflow-diagram`)
- [`web/src/app/court/page.tsx`](https://github.com/neromtoobad/aliquot/blob/main/web/src/app/court/page.tsx): the public record

### The process as data

```ts
defineWorkflow({
  name: 'bench-court',
  initialStage: 'filed',
  fields: [
    subject   (type: 'subject', types: ['claim'])   // the claim on trial
    caseName, brief, clerk (actor), verdict (options), ruling (text), judge (actor), ruledAt
  ],
  stages: [
    filed:     activity 'file-brief' → action 'submit-brief' (param: brief)   ← the agent fires this
    hearing:   activity 'rule' → sustain | overrule | both-apply | dismiss (param: ruling)  ← a person fires this
               transitions: verdict == 'dismissed' → dismissed; any other verdict → ruled
    ruled, dismissed   (terminal)
  ],
})
```

Each case is a workflow **instance**: a Sanity document holding its stage, its fields and its full history. Each ruling also becomes a `labRule` document that remembers where it came from:

```ts
labRule {
  title, rule, severity, appliesTo[] -> subject, overrides[] -> claims
  origin: 'court'
  caseName, caseClaim -> claim, verdict, brief, workflowInstance, ruledAt
}
```

That `labRule` feeds two things in [Aliquot](https://aliquot-five.vercel.app):
- the agent's GROQ precedence step, where a lab rule beats every outside source;
- the Sanity Context Knowledge Base's dataset source, so the next build carries the ruling into the prose too.

## My Build Process

I built this with **Claude Code** in one long session on the last day of the challenge, on the same Sanity project as my Path One entry. Here's what happened, including the parts that went wrong.

**1. I started on the wrong idea.** My first concept was a hackathon-rules agent. I'm in Lagos and enter a lot of hackathons; deadlines get extended in Discord and eligibility hides in the legal terms. Claude had the content model and UI half-built when a survey of the existing #sanitychallenge entries turned up **an entry with the same idea and almost the same name** (FinePrint). We pivoted to the domain I actually work in, wet-lab protocols (I'm an M.Tech Biology student). The architecture survived; the content didn't. Sending a subagent to survey the competition *first* would have saved 45 minutes.

**2. The data had to be real.** Two research subagents spent ~25 minutes each pulling values verbatim from NEB, Thermo, Qiagen, Sigma, Addgene, CSH, ASM, WHO, CDC and nine university safety offices. They found **46 sources, 92 claims and ~30 genuine disagreements**. Bench Court's docket is literally that list of disagreements. No case is invented.

**3. Workflows, first contact.** The quick start was enough to write the definition. The first `sanity-workflows deploy --check` failed:

```
defineAction("submit-brief") failed validation:
  params[0].type: Invalid option: expected one of "string"|"number"|...
```

Action params can't be `text`, only `string` (fields *can* be `text`). It was a one-word fix, and `--check` caught it offline before anything touched the dataset. Then `--dry-run` showed a diff, and `deploy` printed `✔ created bench-court v1`.

**4. The clerk is an agent driving the same transitions a person uses.** [`clerk.mjs`](https://github.com/neromtoobad/aliquot/blob/main/court/clerk.mjs) groups claims by subject + parameter and keeps the groups whose sources give different values. For each one it picks the lowest-authority claim as "the claim on trial" and asks a model for a brief that must end in *"Clerk recommends: …"*. Then it runs `sanity-workflows start` and `fire-action … --action submit-brief` using my login session. A dry run first, then for real:

```
§ Case Western Reserve University v. University of Washington (bleach contact time)
  filed court.wf-instance.f8a730b46675 → hearing
§ University of North Carolina at Chapel Hill v. Virginia Tech (minimum time for biohazardous waste)
  filed court.wf-instance.6bd717a3ba91 → hearing
…
5 case(s) filed.
```

The first version named cases after page titles and produced *"Biological Spill and Exposure Re v. Biohazardous Spills"*, which was truncated and meaningless. Switching to the source **publisher** gave case names that read like case law.

**5. The App SDK and the Workflows adapter.** `sanity init --template app-quickstart` scaffolded App SDK **v2**, but `@sanity/workflow-sdk` needs **v3.1+**. Upgrading meant the documented `@sanity/mutate` override. `@sanity/workflow-blueprint` also wants TypeScript 6, which the scaffold doesn't have, so the CLI went in with `--legacy-peer-deps`. Once that settled, the docs' building blocks were all I needed:
- `createEngine` + `useWorkflowInstances` for the docket,
- `useWorkflowSession` for a case,
- `session.fireAction({activity: 'rule', action, params: {ruling}})` for the gavels,
- `<WorkflowDiagram explain static />` for the stage map.

**6. The blank frame.** `sanity dev` started, but inside the Dashboard the app sat on a spinner: Vite's dependency optimizer never finished. So I deployed instead (`npm run deploy -- --create`). The first deployed load was a **blank dark frame**, and even an error boundary showed nothing. To narrow it down we added a "Bench Court v2" probe banner outside every provider and redeployed. Everything rendered. It had been a slow first load, not a bug. I left the error boundary in.

**7. Something I'm glad we noticed.** While debugging the frame, Claude read the iframe's `src` and found the Dashboard passes a **session token in the URL fragment**. It didn't open or reuse it, and it flagged it so I'd redact it from the transcript below.

**8. My first ruling was gibberish, and the record says so.** I ruled the bleach case **Both apply**, but the ruling text I typed while poking at the gavel was literally `nnm,,`. The workflow did exactly what it should: the case moved to `ruled`, and a `labRule` appeared with `origin: "court"`, the verdict, the brief, links to the 3 overridden claims and the workflow instance id. That also means the "law" read `nnm,,`. I supplied the wording I meant, and we patched it into the lab rule with `sanity exec`. We left the workflow instance alone (the docs say not to edit instances as content), so the case history still shows the original entry. The courtroom now shows the corrected rule with a line underneath: *"As first entered in the case record: "nnm,," — the judge corrected the wording in the lab rule afterwards."* Then I asked [Aliquot](https://aliquot-five.vercel.app) *"How long should I leave 1:10 bleach on a culture spill inside the biosafety cabinet?"* It answered **30 minutes**, quoting my ruling under "Your lab's SOP overrides".

**9. What I'd do differently.** The ruling writes the `labRule` from the browser after `fireAction` succeeds. The right shape is a Workflows **effect** on entering `ruled`, drained by a Sanity Function, so the rule exists even if the tab closes mid-ruling. I ran out of day.

**Prompts that worked:**
- "Survey the existing entries and tell me which domains are taken." I wish I'd asked it first.
- "Record only what a page actually says, quote verbatim, never fill a value from memory." This went to the research agents, and it's why the dataset can be trusted.
- "Dry-run the clerk before filing anything."

**Prompts that didn't:**
- My opening message was just a link to the challenge. That's how we ended up building the wrong thing for an hour.

## Sanity Project Details

- **Project ID:** `4wvtii12` (dataset `production`, public)
- **Rulings (public GROQ):** [`*[_type=="labRule" && origin=="court"]`](https://4wvtii12.api.sanity.io/v2026-10-01/data/query/production?query=*%5B_type%3D%3D%22labRule%22%20%26%26%20origin%3D%3D%22court%22%5D%7Btitle%2Crule%2CcaseName%2Cverdict%2CruledAt%7D)
- **Workflow:** `bench-court` v1, tag `court`, resource `4wvtii12.production`. The instances are engine-owned documents with dotted ids, so they're not publicly readable.
- **Studio:** https://aliquot.sanity.studio · **App:** Bench Court in organization `oszqultgn`'s Dashboard
- **Schema:** [`studio/schemaTypes/labRule.ts`](https://github.com/neromtoobad/aliquot/blob/main/studio/schemaTypes/labRule.ts), [`court/workflows/bench-court.ts`](https://github.com/neromtoobad/aliquot/blob/main/court/workflows/bench-court.ts)

## Agent Session

{% agent_session nerom-session-5cikjl %}
