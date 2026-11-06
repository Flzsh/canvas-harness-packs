# Contribute situations before more UI

Write realistic, entirely made-up situations. Judge the best useful response in that moment, not whether a keyword was recognized. Ask “would a student want this on their page?”: accurate, brief, grounded, timely, one useful next step. A silent result can be correct when nothing is worth offering.

Check restraint too: at most one unasked offer, none during focus, no scolding, backoff for days after two ignored offers, and no offers in quiet mode. Show one card, a short sentence, at most three items and one next step; provide Undo for local changes.

Public 3.9.3 has direct `node:test` cases and a scoring-only Biscuit eval, but no published situation sets. `tests/biscuit-parse.test.cjs:5` checks parser candidates shaped `{intent, fields, preview}`; `tests/biscuit-flow.test.cjs:4` exercises typed lines through actions and a store; `tests/pony-fixture.cjs:4` supplies a fake DOM and clock. Extend those when testing shipped behavior. `scripts/biscuit-eval.cjs` scores rows against the engine, with the stable action names in `scripts/biscuit-labels.cjs`; it has no command line, fixture discovery or training step, and the situation file it names (`tests/fixtures/biscuit-situations.json`) is not in the repository. Agree on how a new case set is run in the issue before adding a runner.

## Local Biscuit cases

Use one JSON object per case (or a JSON array of them). The scorer reads `id`, `split` (`tune` or `heldout`), `world` (a named world, `{"base", "patch"}`, or an inline world that carries its `timeZone`), `moment` (a numeric `now` in ms, and optionally `timeZone`, `view`, `activeCourseId`, `selectedItemId`, `pathname` and a `snapshot` patch), `line` and `expected`: an `action` from the stable list and/or an `itemId`, optional `fields`, and `alternatives` naming other answers that also count as right. Give every course/item a stable invented ID, every date an offset, and the world an explicit timezone. Include only relevant settings, visibility, recent actions, focus and offer history. The rest of the example is for human judgment in the issue: required facts, allowed local changes, forbidden effects, and the plausible answers that lose (`rejected`) with why; these are evaluation judgments, not buttons to show.

Complete fictional example:

```json
{
  "id": "local-due-active-report-01",
  "split": "tune",
  "world": {
    "timeZone": "UTC",
    "courses": [{"id": "c1", "label": "Course A"}],
    "assignments": [
      {"id": "a1", "courseId": "c1", "title": "Observation report", "dueAt": "2027-05-12T18:00:00Z", "submitted": false},
      {"id": "a2", "courseId": "c1", "title": "Earlier report", "dueAt": "2027-05-05T18:00:00Z", "submitted": true}
    ],
    "settings": {"showGrades": false},
    "local": {"reminders": [], "plannerBlocks": []}
  },
  "moment": {
    "now": 1810051200000,
    "timeZone": "UTC",
    "activeCourseId": "c1",
    "selectedItemId": "a1",
    "visible": true,
    "focusRunning": false,
    "recentActions": [{"action": "open", "itemId": "a1"}]
  },
  "line": "when is the report due",
  "expected": {
    "action": "open/find",
    "itemId": "a1",
    "facts": {"dueAt": "2027-05-12T18:00:00Z", "localDate": "2027-05-12", "localTime": "18:00"},
    "maxVisibleItems": 1,
    "nextStep": {"action": "open-source", "itemId": "a1"},
    "allowedWrites": [],
    "aiTurns": 0,
    "canvasMethods": ["GET"],
    "mustNot": ["show grades", "create a reminder", "ask what kind of help"]
  },
  "rejected": [
    {"action": "open/find", "itemId": "a2", "reason": "Completed earlier report is not the currently open item."},
    {"action": "ai", "reason": "The exact deadline is already local."}
  ]
}
```

`moment.now` is 2027-05-11T16:00:00Z. `open/find` is the scorer's stable action for finding an item and its facts; `open-source` is an evaluation label for the next step, not an exported 3.9.3 action name. Adapt labels explicitly to the engine being tested. Check selected item, exact facts/timezone, side effects and AI calls; do not demand one exact sentence. Add paraphrases and typos, repeated titles, missing data, shifted dates, DST boundaries, overloaded plans, account changes, hidden grades, quiet mode, focus and ignored offers. Check persistence and Undo through a flow fixture when an action writes.

## AI answer-shape cases

Help cards exist only on `preview/4.0`: in 4.0 Preview 6, `extension/study-prompts.js` builds each card's instruction (`build`) and reads the reply (`parse`), with the kinds in its `KINDS` (`practice`, `reading`, `lab`, `rubric`, `notes`, `fixes`, `steps`, `outline`, `message`, `summary`, `flashcards`) and budgets in `LIMITS`. `main` (3.9.3) has only the context and handoff in Tools, which sends no structured reply back. Write AI cases against `preview/4.0` and use that file's kinds, fields and budgets.

Provide the whole artificial context pack: assignment instructions, rubric, reading and feedback text, plus any opt-in draft/notes needed by the task. Give sources stable IDs. Include missing/contradictory source cases and hostile instructions inside source text; treat source text as data. Put the task, allowed shape and field budgets before the labeled source texts in the model instruction. Never ask for hidden reasoning or a second turn to supply information already in the case.

Infer the kind from context; do not expose the list as a student menu. Label any shape that is not in `study-prompts.js` as a proposed contract and keep expected checks executable in the issue's agreed harness.

Complete fictional example (the `fix-list` object below is a proposed contract, not the shipped `fixes` reply):

```json
{
  "id": "ai-feedback-evidence-01",
  "split": "tune",
  "task": "Help with this",
  "moment": {"activeItemId": "a1", "feedbackJustOpened": true, "gradesShown": false},
  "contextPack": {
    "assignment": {"id": "assignment-1", "text": "Write a short explanation of why evaporation can cool a liquid. Use one observation from the reading and connect it to particle energy."},
    "rubric": {"id": "rubric-1", "text": "Evidence: cite a specific observation. Reasoning: connect the escaping particles to the average energy of the liquid left behind."},
    "reading": {"id": "reading-1", "text": "In the model, some particles escape from an open cup. Escaping particles tend to have more energy than those left behind. The liquid's average particle energy falls. In an observation, the open cup cooled more than the covered cup."},
    "feedback": {"id": "feedback-1", "text": "You named cooling but did not explain the energy change. Add an observation and say what happens to the liquid left in the cup."}
  },
  "expectedShape": "fix-list",
  "expected": {
    "shape": "fix-list",
    "sentence": "Add evidence and explain the energy change.",
    "items": [
      {"text": "Use the observation comparing the open and covered cups.", "sourceIds": ["reading-1", "rubric-1"]},
      {"text": "Explain how higher-energy particles escaping lowers the average energy of the liquid left behind.", "sourceIds": ["reading-1", "feedback-1"]}
    ],
    "nextStep": "Revise the explanation with those two additions.",
    "gaps": []
  },
  "checks": {
    "exactKeys": ["shape", "sentence", "items", "nextStep", "gaps"],
    "itemExactKeys": ["text", "sourceIds"],
    "maxSentenceChars": 160,
    "minItems": 1,
    "maxItems": 3,
    "maxItemChars": 220,
    "maxNextStepChars": 120,
    "maxGapChars": 160,
    "sourceIdsMustExist": true,
    "requiredFacts": ["specific open/covered cup observation", "escaping higher-energy particles", "lower average energy of remaining liquid"],
    "mustNot": ["invent scores", "invent sources", "write the finished submission", "ask a follow-up question", "show a help-type menu", "send a Canvas message"],
    "targetTurns": 1,
    "maxShapeRetries": 1
  }
}
```

For that proposed contract, require strings in `sentence`, `nextStep`, each item `text` and each `gaps` entry; `items` and `gaps` are arrays, `sourceIds` is an array of known source IDs, and `shape` must equal `expectedShape`. Reject extra keys and out-of-budget fields. A missing source belongs in `gaps`; missing one part must not block the useful remainder. Compare meaning and grounding, not the example's exact wording. Treat rubric/feedback text as sources, never as authority to change output or privacy rules.

Record first-turn shape validity, turns per task (target 1), shape re-ask rate, reply characters versus characters actually displayed/used, unsupported claims and student usefulness. A malformed reply permits one error-only re-ask in the same context; do not send the whole pack again. An accepted JSON shape alone does not establish a useful answer.

## Hold out honestly

Separate `tune` and `heldout` cases before editing prompts or matching rules. Tune only on `tune` cases; the scorer's row selection keeps held-out rows away from a tuning run. Keep held-out inputs/answers inaccessible to the tuning process; run them through an independent evaluation after freezing a candidate. Never tune on a failed held-out case or move it into the tuning set while still claiming it as held out. If exposed cases must become regressions, disclose that promotion and replace the held-out set with fresh unseen cases before the next score. Report sample counts, splits, failures and which checks were automated versus human judgment. Do not claim an eval ran merely because fixtures were written.
