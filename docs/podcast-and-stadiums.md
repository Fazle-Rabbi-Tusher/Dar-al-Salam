# Stadium turf, football goals and podcast studio

The Cricket and Football shortcuts show the new native grass surfaces. Podcast
opens the studio on the cleared west lawn. Omar Suleiman and Mehdi Hasan remain
searchable by their own names; “Mehedi Hassan” is also a search alias.

The studio contains dimensional timber/acoustic walls, an inlaid rug, upholstered
armchairs, a coffee table, two boom microphones, recorder, mugs, three cameras
on fixed tripods, two softboxes, a production monitor, cables and planters.
The native meshes retain their depth as the planet rotates. The characters use
authored front/rear isometric pixel sprites and mirrored left views, consistent
with the existing world; they are not rigged 3D character meshes.

The silent, illustrative 20-second conversation follows the shared deterministic
12 Hz / 240-tick clock. Omar speaks first, both pause, Mehdi responds, both pause,
and Omar resumes. Six talk and six listening drawings per front/rear view retain
all 24 poses for each person. The recording meters follow the current speaker;
camera heads and display motion interpolate between ticks. Pause freezes them.
No recording, quotation, attributed dialogue or cloned voice is included.

The cricket oval and football field use the generated grass albedo under
`art/materials/`, mild mowing variation and actual short blade triangles. The
oval edge is clipped to its ellipse. The goal mouths span the field's Y axis;
both have full-height white posts, crossbars, rear supports, side/roof/rear nets
and an open interior. Existing football ball and player scripts remain intact.

## Source and likeness status

Mehdi Hasan is the journalist intended by the owner's spelling “Mehedi Hassan”.
The public reference search located this photo in a public GitHub issue:

- Context: <https://github.com/kufarooq/World-News/issues/145>
- Original photo: <http://kufarooq99.files.wordpress.com/2014/12/60582-mehdi_hasan.jpg?w=400&h=300>
- Official publication: <https://zeteo.com/>
- Reference article: <https://en.wikipedia.org/wiki/Mehdi_Hasan>

The image host, Wikipedia, Wikimedia and Zeteo were blocked by the environment's
HTTP policy. The photo was **not downloaded or visually verified**. The generated
character is a provisional public-likeness concept matched to the project's art
references. Its photo comparison remains pending. Both cards stay unapproved
drafts, with biography/story research placeholders.

The explicit `familyName: "Hasan"` records a surname, per the given-name rule in
AGENTS.md. Only that whole trailing surname is excluded from the given-name
check. Full prohibited identities and prohibited given names remain blocked;
the allowlist and all advisory approvals are unchanged.

Generated source sheets and canonical art are retained under
`art/sprites/source/podcast/`. The original sheets are preserved in the
`original-orientation/` subfolder. Mehdi's rear listening drawings were generated
separately and packed into the corrected master. Import discovers transparent
gaps rather than cutting unequal source rows at quarter-sheet boundaries,
preventing detached shoes and truncated feet. All prepared cells use a common
foot anchor and density 4.

## Reproduce and review

```sh
node tools/prepare-podcast-sprites.mjs omar-suleiman mehdi-hasan
node --import tsx tools/update-podcast-and-grounds.ts
pnpm build:preview
pnpm test
pnpm typecheck
pnpm lint
pnpm test:e2e
# With the development server running:
node tools/capture-podcast-preview.mjs
```

The room/card migration is idempotent and is also used by the placeholder world
factory. It does not regenerate unrelated rooms or approve any cards. The
existing dark-chamber source components and materials remain unchanged.

The captured [native animation](previews/stadiums-and-podcast-preview.mp4) shows
the updated grass and goals, followed by the full 20-second conversation.
Still views: [cricket](previews/cricket-turf.jpg),
[football](previews/football-goals.jpg), [studio](previews/podcast-studio.jpg),
[Mehdi responding](previews/podcast-mehdi-speaking.jpg).

Verified with 142 unit tests and 22 Chromium browser tests, plus typecheck,
lint and the complete development asset / Vite production build. The built
manifest retains six poses for each action in all four runtime facings. The
approved dark-room source verification remains byte-identical. Browser checks
cover the new draft card/search alias, fixed guest positions, changing poses,
equipment animation, pause, loaded grass texture, both visible goals, existing
lab/sports behavior, world controls and mobile navigation.
