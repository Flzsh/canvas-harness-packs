# Before opening the pull request

- Start with an issue and its agreed release scope. Keep one purpose per PR against `main`. Check whether your checkout has the required 3.4 code; `main` is 3.2.1 at this handoff while 3.4 is in store review.
- Read the complete diff, including untracked files, fixtures, generated output and commit messages. Keep school, teacher, course and student identities, private paths, backups, credentials and real coursework out. Use invented labels and `example.test` for fixtures.
- Keep retrieval and planning local. Infer the task from context. Add no help-kind menus or out-of-plan features; propose them in an issue instead.
- Keep Canvas GET only, AI source review explicit, grades opt-in and accounts isolated. Confirm a save cannot overwrite another tab's newer work and a failed save can be retried safely.
- Preserve backups, media, pack validation, exact removal and Undo. Test failure paths that the change can affect.
- Check Full, Lite and relevant Custom selections; custom school addresses; disabled features; idle/hidden teardown; keyboard access and reduced motion where affected. Keep dashboard CSS and manifest lists synchronized.
- Save UTF-8 with LF. Add no npm packages. Put comments on their own line. Reuse classes and describe new visuals for the owner to draw.
- Run `npm test`, then `npm run check`. Run `npm run build` when changing packaging, file inclusion, permissions or loading. Report actual results and distinguish offline fixtures from any live checks.
- Run the downloaded skill's `scripts/pre-pr-check.cjs` with Node from the clone (or pass the clone as its positional argument). It compares branch commits from the merge base with local `origin/main` and inspects changes. It does not fetch. If the ref is missing/stale, prepare a current base through your normal workflow, then rerun.
- Fix every checker failure and review every warning. Identity heuristics miss names and can flag harmless text; binary exclusions and comment heuristics also require manual review. The checker cannot inspect the eventual PR description.
- Set `git config user.email` to your GitHub-provided no-reply address before committing. If existing commits have the wrong author, configure the email, then use `git commit --amend --reset-author` for the latest commit or interactive rebase with an amend at each affected commit. Recheck author and committer emails. Coordinate before rewriting an already shared branch.
- Remove AI co-author trailers and “Generated with” lines from commits and PR text. Retain required source and third-party license notices. Human contributor credit appears in the changelog when merged.
- Explain the problem, resulting behavior, issue, tests and any limits in plain words. The owner may adapt the contribution rather than merge it unchanged.
