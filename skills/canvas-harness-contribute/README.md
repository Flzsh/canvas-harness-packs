# Contribute to Canvas Harness

Works with: contributors' AI agents that can read files and run Node 22.8+.

Load this folder as a skill, or upload the folder/zip and ask your AI to follow SKILL.md. Pick an issue first.
The references map public 3.4.0; at this handoff GitHub main is 3.2.1 until the 3.4 store review is approved.

From your clone, run the downloaded skill's scripts/pre-pr-check.cjs with Node before opening a PR. It reads local Git
history and changes without fetching. Run npm test and npm run check too, and npm run build for packaging changes.
The skill's own checker tests use temporary Git repositories: node --test scripts/pre-pr-check.test.cjs.
