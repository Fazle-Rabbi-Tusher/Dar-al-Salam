# Sports and Community update

The **Cricket**, **Basketball**, and **Boxing & MMA** shortcuts focus the new
native infrastructure. The ambulance vehicle and its buildings beside football
are removed. Existing footballers and the village school remain; Hakim Ziyech
has moved onto the pitch clear of basketball.

The cricket stadium occupies the former lower cricket/basketball plots. It has
an oval boundary rope, mown grass, a central wicket, bowling/popping/return
creases, two sets of stumps and bails, sight screens, individual terrace seats,
canopies, floodlights, a geometric entrance and a changing practice scoreboard.
Hashim Amla and Tamim Iqbal alternate at the crease and run between wickets.
Mashrafe Mortaza runs in, releases overarm and follows through; Usman Khawaja
gathers and returns the ball. This is an authored practice scene, not a replay
of a historical match or a regulation eleven-a-side fixture.

Hakeem Olajuwon shoots, dribbles, gathers, jumps, dunks and lands on a maple
court. Both ends have supported backboards, target squares, breakaway rims and
open woven nets. Court lines, benches, lighting and the scoreboard are modeled.
Ball flight uses constant-gravity arcs; deliveries, bat contact, catches, shot
release, baskets and net deformation share the same timeline as the drawn poses.
The global Pause freezes people, balls, nets, scores and apparatus together.

The raised boxing ring has four separated ropes, padded posts, turnbuckles,
spacers, canvas, apron, access stairs, stools and corner buckets. The MMA cage
has eight sides, open diamond chain links, padded posts, a framed gate with
hinges/latch and stairs. There are no opaque fence billboards covering fighters.

The kitchen is removed. The approved dark chamber now stands beside Community
at tile origin `[47,33]`, with uniform scale `0.85`. The original model and all
40 scholar writing frames are preserved; source artwork and approval metadata
are unchanged. See [dark-room-integration.md](dark-room-integration.md).

## Sources and implementation

- `packages/shared/sports.ts`: layout, routines, contact/gravity functions and
  rotatable arena geometry. Model space is genuine X/Y/Z; characters remain
  detailed front/rear pixel-art sprites with mirrored left views.
- `art/sprites/source/sports/`: original generated sheets and import inventory.
  Eighteen prepared front/rear strips retain 108 drawn poses. Previous idle,
  celebration and cheer strips remain untouched.
- `tools/prepare-sports-sprites.mjs`: repeatable alpha cleanup, registration and
  packing from checked-in sources; it does not redraw faces.
- `tools/update-sports-world.ts`: idempotent, scoped migration of the reviewed
  room and routines. The placeholder factory applies the same migration, while
  normal builds use the reviewed room directly.
- `tools/capture-sports-preview.mjs`: captures native rendering at half-tick
  intervals and encodes a 24 fps MP4. It requires the dev server and FFmpeg.
- `tests/sports.spec.ts` and `packages/shared/sports.test.ts`: native visibility,
  source-frame retention, pause, gravity, contacts, path/collision checks and
  stable moving geometry. All named cards remain drafts awaiting review.

## Preview

[Animated native-world preview](previews/sports-world-preview.mp4)

[Cricket stadium](previews/cricket-stadium.jpg) ·
[Basketball court](previews/basketball-court.jpg)
