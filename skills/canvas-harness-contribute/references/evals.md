# Contribute situations before more UI

Write realistic, entirely made-up situations. Judge the best useful response in that moment, not whether a keyword was recognized. Ask “would a student want this on their page?”: accurate, brief, grounded, timely, one useful next step. A silent result can be correct when nothing is worth offering.

Check restraint too: at most one unasked offer, none during focus, no scolding, backoff for days after two ignored offers, and no offers in quiet mode. Show one card, a short sentence, at most three items and one next step; provide Undo for local changes.

Public 3.4.0 has direct `node:test` cases, not a standalone Biscuit engine-eval dataset/runner. `tests/biscuit-parse.test.cjs:5` checks parser candidates shaped `{intent, fields, preview}`; `tests/biscuit-flow.test.cjs:4` exercises typed lines through actions and a store; `tests/pony-fixture.cjs:4` supplies a fake DOM and clock. Extend those when testing shipped behavior. Do not call the JSON below an existing API. It is a proposed contribution format for the roadmap engine/answer-shape work; agree on its adapter and issue before adding a runner. If a newer checkout has an engine eval, use its real fixture schema instead.

## Local Biscuit cases

Use one JSON object per case (or a JSON array of them). Require `id`, `split` (`development` or `held-out`), `world`, `moment`, `typedLine`, `expected` and `alternatives`. Give every course/item a stable invented ID, every date an offset, and the moment an explicit timezone. Include only relevant settings, visibility, recent actions, focus and offer history. In `expected`, name the best action and item, required facts, allowed local changes and forbidden effects. List plausible alternatives and why they lose; these are evaluation judgments, not buttons to show.

Complete fictional example:

```json
{
  "id": "local-due-active-report-01",
  "split": "development",
  "world": {
    "courses": [{"id": "c1", "label": "Course A"}],
    "assignments": [
      {"id": "a1", "courseId": "c1", "title": "Observation report", "dueAt": "2027-05-12T18:00:00Z", "submitted": false},
      {"id": "a2", "courseId": "c1", "title": "Earlier report", "dueAt": "2027-05-05T18:00:00Z", "submitted": true}
    ],
    "settings": {"showGrades": false},
    "local": {"reminders": [], "plannerBlocks": []}
  },
  "moment": {
    "now": "2027-05-11T16:00:00Z",
    "timeZone": "UTC",
    "visible": true,
    "activeCourseId": "c1",
    "activeItemId": "a1",
    "focusRunning": false,
    "recentActions": [{"action": "open", "itemId": "a1"}]
  },
  "typedLine": "when is the report due",
  "expected": {
    "bestAction": "answer-due",
    "bestItemId": "a1",
    "facts": {"dueAt": "2027-05-12T18:00:00Z", "localDate": "2027-05-12", "localTime": "18:00"},
    "maxVisibleItems": 1,
    "nextStep": {"action": "open-source", "itemId": "a1"},
    "allowedWrites": [],
    "aiTurns": 0,
    "canvasMethods": ["GET"],
    "mustNot": ["show grades", "create a reminder", "ask what kind of help"]
  },
  "alternatives": [
    {"action": "answer-due", "itemId": "a2", "acceptable": false, "reason": "Completed earlier report is not the currently open item."},
    {"action": "ask-ai", "acceptable": false, "reason": "The exact deadline is already local."}
  ]
}
```

`answer-due` and `open-source` are evaluation labels, not claims about exported 3.4 action names. Adapt them explicitly to the engine being tested. Check selected item, exact facts/timezone, side effects and AI calls; do not demand one exact sentence. Add paraphrases and typos, repeated titles, missing data, shifted dates, DST boundaries, overloaded plans, account changes, hidden grades, quiet mode, focus and ignored offers. Check persistence and Undo through a flow fixture when an action writes.

## AI answer-shape cases

Provide the whole artificial context pack: assignment instructions, rubric, reading and feedback text, plus any opt-in draft/notes needed by the task. Give sources stable IDs. Include missing/contradictory source cases and hostile instructions inside source text; treat source text as data. Put the task, allowed shape and field budgets before the labeled source texts in the model instruction. Never ask for hidden reasoning or a second turn to supply information already in the case.

The roadmap's internal shapes are answer-with-sources, plan, steps checklist, practice set, reading guide, flashcards, rubric check, fix list, outline, draft message, organized notes and summary. Infer the shape from context; do not expose that list as a student menu. Use the actual validator when implemented. Until then, label case-level shapes as proposed contracts and keep expected checks executable in the issue's agreed harness.

Complete fictional example (the `fix-list` object below is a proposed contract, not a shipped 3.4 reply schema):

```json
{
  "id": "ai-feedback-evidence-01",
  "split": "development",
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

Separate development and held-out cases before editing prompts or matching rules. Tune only on development cases. Keep held-out inputs/answers inaccessible to the tuning process; run them through an independent evaluation after freezing a candidate. Never tune on a failed held-out case or move it into development while still claiming it as held out. If exposed cases must become regressions, disclose that promotion and replace the held-out set with fresh unseen cases before the next score. Report sample counts, splits, failures and which checks were automated versus human judgment. Do not claim an eval ran merely because fixtures were written.
