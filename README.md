# Canvas Harness Market

Themes, course art and switches for [Canvas Harness](https://chromewebstore.google.com/detail/bppjpjpbichfcbgajlppkgbbncbfohgd), at https://flzsh.github.io/canvas-harness-packs/.

Everything here is data: `packs.json` lists each pack with its size and SHA-256, and Canvas Harness checks both before
it adds anything. Canvas Harness never downloads code; a feature pack only switches on a feature that ships inside the
extension.

`skills/` holds four skills for your own AI (banner art, a whole theme, a pet, add-ons and utilities): instructions plus
small Node scripts that run on your computer to check and pack what the AI makes. Each is also a zip on the page.

## Submit a pack

Open [Submit yours](https://flzsh.github.io/canvas-harness-packs/submit.html), choose one `.chpack`, `.chkit`,
`.chtheme`, `.chpet` or `.chpreset` file, enter a display name, choose a licence and tick both confirmations.
Send downloads a zip and opens a prefilled GitHub issue. Attach that zip and press Submit. A GitHub account is
required. The pack stays on your device until you attach it; the issue fields and attachment are public.
Use a nickname rather than a personal name. The page sends no file bytes or analytics anywhere.

The page checks the extension, 40 MB limit (40,000,000 bytes), UTF-8, JSON format or course-art header, and name.
It shows the kind, name, size and SHA-256. Pack names use 1–120 printable characters on one line with no leading
or trailing spaces; credits use 1–60. These are preliminary checks, not artwork approval.
The Action reads the issue as data, downloads only a GitHub user attachment (with capped, restricted redirects),
and accepts a simple zip with exactly one regular pack file and no paths. Stored and deflated zips are supported;
encrypted, ZIP64, streamed, commented and extra-metadata zips are refused. Use the page's zip for compatibility.
It verifies the CRC, file size, name, kind and SHA-256, and runs the trusted Canvas Harness checker. All checker
problems are reported together in a plain reply. A pass adds `checked`; failures add `needs-changes`.
Checks cannot prove originality, permission or the absence of personal information: the owner reviews those.
No submitted JavaScript, HTML, SVG scripts, commands or other executable content is ever run.

## Owner review and publication

Build with Node 22+ and `CH_SKILL_CHECK` pointing to Canvas Harness's single-file checker:

```powershell
$env:CH_SKILL_CHECK = 'C:/path/to/Canvas-Harness/skill-check/check.cjs'
node canvas-harness-unreleased/market-site/build.cjs canvas-harness-packs
node --test canvas-harness-unreleased/market-site/*.test.cjs
```

For offline tests only, use `market-site/skills-shared/test-check.cjs`. It is deliberately marked TEST ONLY;
the deployed workflow refuses to use it. Replace it with the real checker before accepting submissions.
The real checker must exit nonzero for every invalid pack (including unsafe SVG, unknown fields, asset hashes,
size/type limits and kind-specific schema errors), and report all problems on stdout/stderr. No JSON output
contract is assumed. The build copies it byte for byte to `tools/check.cjs` and the relevant skill folders.

Ensure repository labels `submission`, `checked`, `needs-changes` and `approved` exist, enable Actions,
and enable “Allow GitHub Actions to create and approve pull requests” in the repository's Actions settings.
Review the original pack, its rights/privacy confirmations and checker result. The repository owner adds
`approved`; other people's approval labels do nothing. Approval downloads and checks the file again, checks
that the issue is unchanged, and opens a pull request on a new branch. It never publishes automatically.
Review the diff and merge the PR to publish. Editing a submission invalidates its approval; apply `approved`
again after review. Re-running an approval reuses the same PR. Closed or changed issues are not imported.

Published packs live in `community/<id>/`; `community.json` records the credit, licence, hash, size, picture
and source issue; `packs.json` includes the same pack for the extension's normal Add flow. Rebuilding preserves
community packs, catalogue entries and owner-drawn `assets/community/` pictures. Previews use the course banner,
pet stand pose, or theme banner/still; the source art is embedded as an isolated image in an inert SVG wrapper.
Video themes use their still. Presets and packs without theme/kit art use owner-replaceable SVG placeholders.
Course art needs a banner and pets need a stand image before publication.

## Licences

Choose [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/) to allow sharing and adaptation with credit,
or [CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/) to dedicate the work to the public domain as far
as possible. The chosen licence and “by” credit appear on the card and in the catalogue. Submit only work you
made or have permission to share under that licence. No copied characters, logos, other people's photos,
names, school details or personal information.

## Takedowns

Open a blank [GitHub issue](https://github.com/Flzsh/canvas-harness-packs/issues/new) with the pack's link or id
and explain the request; do not post additional personal information. The owner removes its entries from
`community.json` and `packs.json` and its folder under `community/`, then republishes Pages. For an attachment
containing private data, also remove the attachment from its issue and contact GitHub Support about retained
copies. Removing a Market listing cannot retract copies already downloaded or revoke an existing licence.
