# Mansa Musa — animated gold procession

A 20-second looping pixel-art illustration matching the owner's crowned,
gold-robed procession reference. The foreground horse and rider use twelve
authored walking poses, with registered ground contacts. The background contains
the decorated elephant, camels, crowds, treasure chests and gold bearers.
Dust, gold highlights and a restrained tracking-camera motion add depth.

Open the MP4 or GIF to watch. To use the interactive preview, serve this folder:

```sh
python3 -m http.server 8130
```

Then open `http://localhost:8130/index.html`. Play, pause and scrub the timeline.
Reduced-motion preferences are respected. All images and code are local; the
preview has no CDN dependencies. The preview and video use the same 12 Hz,
240-tick animation state and preserve all twelve source poses.

`scene.js` exports `stateAt(frame)` and `createProcession(canvas, assets)` for
reuse. The rider's frame images are raster artwork with three-dimensional
shading. This pack supplies an animated illustration, and does not replace the
previous rotatable GLB model library or the main world's existing character.

The source PNGs, import/registration script, renderer and capture script are
included in the ZIP. Their source checksums are recorded in the inventory.
This is an illustrative historical reconstruction; existing character approval
and biography review remain drafts. There is no attributed voice or speech.
