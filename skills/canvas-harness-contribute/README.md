# Contribute to Canvas Harness

Works with: contributors' AI agents that can read files and run Node 22.8+.

Load this folder as a skill, or upload the folder/zip and ask your AI to follow SKILL.md. Pick an issue first.
The references map 3.9.3 on GitHub main (the Chrome Web Store line) and 4.0 Preview 6 on preview/4.0 (GitHub
pre-releases only); work on the branch the issue names.

From your clone, run the downloaded skill's scripts/pre-pr-check.cjs with Node before opening a PR (add
--base preview/4.0 for a preview change). It reads local Git history and changes without fetching. Run npm test,
npm run check and npm run build too. The skill's own checker tests use temporary Git repositories:
node --test scripts/pre-pr-check.test.cjs.
