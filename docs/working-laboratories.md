# Working laboratories and architecture studio

The university's four benches are now distinct chemistry and biology workstations.
Two inclined drafting boards show architectural plans developing stroke by stroke.
Seven lab/studio staff instances use four detailed original character identities,
with front/rear working animations in the project's isometric pixel-art style.
Existing named people, biographies, approvals, city and study scenes are preserved.
Use **Labs** in the district navigation; **Resume animation** starts a paused world.

Chemistry follows a deterministic 240-tick (20-second) cycle: prepare (0–48),
dispense (48–84), react (84–168), record (168–216), and reset (216–240). The
operators' pouring steps match the reagent pipette and droplets. The dose remains
in the vessel, its indicator changes colour, the stir bar turns, and bubbles and
surface foam appear during the reaction. This is an illustrative experiment;
no specific chemical recipe or historical experiment is asserted.

Biology has microscopes with moving focus/objective parts, illuminated slides,
sample dishes with a looping cell-division illustration, pipettes, sample droplets,
and scanning readouts. Staff prepare samples and observe beside the equipment.
The two architectural boards have inclined gridded blueprints, exterior walls,
courtyards, rooms, circulation and stairs. Pens lift between strokes, trace the
same segments that appear on the paper, and park while the plan is reviewed.
The plan fades for the next loop. Another architect works at the CAD desk.

## Implementation

- `packages/shared/laboratory.ts` builds the fixed 3D equipment and evaluates only
  small working parts at the supplied world time. It never reads a wall clock or
  uses random calls. Working geometry keeps a constant topology across phases.
- `web/src/engine/Infrastructure.ts` reuses activity vertex/normal/colour buffers
  for visible labs. Equipment stays anchored to the same planet tile coordinates.
  Static supports remain immutable; pause freezes render time as well as poses.
  Alpha-zero faces are discarded, so inactive particles do not occlude objects.
- `tools/placeholder/scenes/laboratories.ts` is the source for the staff routines
  and stools. The current room retains its original object IDs. Placeholder
  generation seeds lab staff in a separate content file, preserving the earlier
  restriction on unrelated anonymous crowds.
- `art/sprites/source/laboratory-crew.png` preserves the generated source sheet.
  `tools/art/prepare-laboratory-crew.py` imports its 8×4 cells, removes connected
  white gutters without removing enclosed coat highlights, registers shoes, and
  packs native 224×336 front/rear strips. It does not redraw faces. The four
  identities are fictional workers, not new named or approved historical cards.
- `content/ambient/laboratories.json` contains seven authored staff routines.
  Their supplied wrist/hand frames replace the coarse fallback placeholders.

## Verification

Unit coverage checks chronology, indicator/bubble timing, fixed supports,
constant animation topology, finite coordinates, closed loops, pen continuity,
blueprint progression and staff routines. Pipeline coverage permits exactly the
requested seven lab workers alongside the existing eight seated speech listeners,
and checks that their actions have prepared front/rear strips.

Native browser coverage checks moving apparatus and sprite frames, frozen pause,
unchanged support buffers, camera rotation, and the Labs navigation. Actual scene
screenshots and the recorded animation are under `.playwright/laboratories/`.
The native browser recording is encoded at 2× capture speed for the preview;
the live app keeps its deterministic 12 Hz simulation and shared pause controls.
The completed checks pass: 116 unit tests, 11 browser tests, type checking,
scoped ESLint and the Vite build. The asset build has 73 characters, 2,460
frames, nine atlases and zero warnings.
The changes are implemented locally; publishing remains a separate action.
