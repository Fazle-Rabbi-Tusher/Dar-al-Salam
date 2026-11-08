# Animation prompts for every named character

Paste one prompt per action into your image generator (Codex / ChatGPT images). Attach the character's existing full-body sprite from `art/sprites/<id>.png` so the look stays identical. Each prompt makes **one horizontal strip** of frames.

## Rules for every strip (paste these with each prompt)

- Detailed pixel-art character sprite, same style and same person as the attached sprite. Realistic face; modest dress (arms and knees covered).
- **One horizontal strip of N frames**, each frame exactly **224 × 336 px**, side by side, no gaps (strip width = 224 × N).
- Flat background **#14131B** filling the whole image (it is removed automatically). No shadows on the background, no glow.
- In **every frame** the character's feet rest on the same point: **x = 112, y = 320** inside the frame. Same scale in all frames (adult about 260 px tall).
- No text, letters, numbers, logos, crests, sponsor names, flags, Arabic text, calligraphy or religious symbols.
- **View SE**: body turned three-quarters toward the viewer, facing right. **View NE**: three-quarters from behind, facing away up to the right. (Left-facing views are mirrored automatically.)
- Save as **`<id>__<action>_<view>.png`**, for example `mohamed-salah__sujood_SE.png`, and send them to Claude in a zip.

## Back-only characters

Characters marked _back only_ must never show their face: make **only NE** strips for them.

## Abdul El-Sayed — `abdul-el-sayed`

Outfit as in the sprite (blazer-open). Default held item: nothing.

- **`abdul-el-sayed__speech_SE.png`** — 4 frames, view SE. Holding: nothing. Pose: standing at a podium giving a speech, one hand raised, mouth open.
  > Prompt: "Pixel-art sprite strip of Abdul El-Sayed (same person and outfit as the attached sprite), 4 frames in one row, each 224×336 px, feet at x 112 y 320, view SE, standing at a podium giving a speech, one hand raised, mouth open, holding nothing. Flat #14131B background, no text or logos."
- **`abdul-el-sayed__speech_NE.png`** — 4 frames, view NE. Holding: nothing. Pose: standing at a podium giving a speech, one hand raised, mouth open.
  > Prompt: "Pixel-art sprite strip of Abdul El-Sayed (same person and outfit as the attached sprite), 4 frames in one row, each 224×336 px, feet at x 112 y 320, view NE, standing at a podium giving a speech, one hand raised, mouth open, holding nothing. Flat #14131B background, no text or logos."
- **`abdul-el-sayed__wave_SE.png`** — 4 frames, view SE. Holding: nothing. Pose: standing, right hand raised above the shoulder waving side to side, friendly smile.
  > Prompt: "Pixel-art sprite strip of Abdul El-Sayed (same person and outfit as the attached sprite), 4 frames in one row, each 224×336 px, feet at x 112 y 320, view SE, standing, right hand raised above the shoulder waving side to side, friendly smile, holding nothing. Flat #14131B background, no text or logos."
- **`abdul-el-sayed__wave_NE.png`** — 4 frames, view NE. Holding: nothing. Pose: standing, right hand raised above the shoulder waving side to side, friendly smile.
  > Prompt: "Pixel-art sprite strip of Abdul El-Sayed (same person and outfit as the attached sprite), 4 frames in one row, each 224×336 px, feet at x 112 y 320, view NE, standing, right hand raised above the shoulder waving side to side, friendly smile, holding nothing. Flat #14131B background, no text or logos."

## Ahmed Zewail — `ahmed-zewail`

Outfit as in the sprite (lab-coat). Default held item: a tablet computer.

- **`ahmed-zewail__talk_SE.png`** — 4 frames, view SE. Holding: a tablet computer. Pose: standing, speaking warmly, one hand gesturing at chest height; mouth alternates open and closed.
  > Prompt: "Pixel-art sprite strip of Ahmed Zewail (same person and outfit as the attached sprite), 4 frames in one row, each 224×336 px, feet at x 112 y 320, view SE, standing, speaking warmly, one hand gesturing at chest height; mouth alternates open and closed, holding a tablet computer. Flat #14131B background, no text or logos."
- **`ahmed-zewail__talk_NE.png`** — 4 frames, view NE. Holding: a tablet computer. Pose: standing, speaking warmly, one hand gesturing at chest height; mouth alternates open and closed.
  > Prompt: "Pixel-art sprite strip of Ahmed Zewail (same person and outfit as the attached sprite), 4 frames in one row, each 224×336 px, feet at x 112 y 320, view NE, standing, speaking warmly, one hand gesturing at chest height; mouth alternates open and closed, holding a tablet computer. Flat #14131B background, no text or logos."
- **`ahmed-zewail__idle_SE.png`** — 4 frames, view SE. Holding: a tablet computer. Pose: standing relaxed, weight on both feet; small breathing movement; one frame with a blink.
  > Prompt: "Pixel-art sprite strip of Ahmed Zewail (same person and outfit as the attached sprite), 4 frames in one row, each 224×336 px, feet at x 112 y 320, view SE, standing relaxed, weight on both feet; small breathing movement; one frame with a blink, holding a tablet computer. Flat #14131B background, no text or logos."
- **`ahmed-zewail__idle_NE.png`** — 4 frames, view NE. Holding: a tablet computer. Pose: standing relaxed, weight on both feet; small breathing movement; one frame with a blink.
  > Prompt: "Pixel-art sprite strip of Ahmed Zewail (same person and outfit as the attached sprite), 4 frames in one row, each 224×336 px, feet at x 112 y 320, view NE, standing relaxed, weight on both feet; small breathing movement; one frame with a blink, holding a tablet computer. Flat #14131B background, no text or logos."

## al-Biruni — `al-biruni`

Outfit as in the sprite (qaba, imamah). Default held item: a brass astrolabe.

- **`al-biruni__idle_SE.png`** — 4 frames, view SE. Holding: a brass astrolabe. Pose: standing relaxed, weight on both feet; small breathing movement; one frame with a blink.
  > Prompt: "Pixel-art sprite strip of al-Biruni (same person and outfit as the attached sprite), 4 frames in one row, each 224×336 px, feet at x 112 y 320, view SE, standing relaxed, weight on both feet; small breathing movement; one frame with a blink, holding a brass astrolabe. Flat #14131B background, no text or logos."
- **`al-biruni__idle_NE.png`** — 4 frames, view NE. Holding: a brass astrolabe. Pose: standing relaxed, weight on both feet; small breathing movement; one frame with a blink.
  > Prompt: "Pixel-art sprite strip of al-Biruni (same person and outfit as the attached sprite), 4 frames in one row, each 224×336 px, feet at x 112 y 320, view NE, standing relaxed, weight on both feet; small breathing movement; one frame with a blink, holding a brass astrolabe. Flat #14131B background, no text or logos."
- **`al-biruni__talk_SE.png`** — 4 frames, view SE. Holding: a brass astrolabe. Pose: standing, speaking warmly, one hand gesturing at chest height; mouth alternates open and closed.
  > Prompt: "Pixel-art sprite strip of al-Biruni (same person and outfit as the attached sprite), 4 frames in one row, each 224×336 px, feet at x 112 y 320, view SE, standing, speaking warmly, one hand gesturing at chest height; mouth alternates open and closed, holding a brass astrolabe. Flat #14131B background, no text or logos."
- **`al-biruni__talk_NE.png`** — 4 frames, view NE. Holding: a brass astrolabe. Pose: standing, speaking warmly, one hand gesturing at chest height; mouth alternates open and closed.
  > Prompt: "Pixel-art sprite strip of al-Biruni (same person and outfit as the attached sprite), 4 frames in one row, each 224×336 px, feet at x 112 y 320, view NE, standing, speaking warmly, one hand gesturing at chest height; mouth alternates open and closed, holding a brass astrolabe. Flat #14131B background, no text or logos."

## al-Jazari — `al-jazari`

Outfit as in the sprite (qaba, imamah). Default held item: rolled plans.

- **`al-jazari__talk_SE.png`** — 4 frames, view SE. Holding: rolled plans. Pose: standing, speaking warmly, one hand gesturing at chest height; mouth alternates open and closed.
  > Prompt: "Pixel-art sprite strip of al-Jazari (same person and outfit as the attached sprite), 4 frames in one row, each 224×336 px, feet at x 112 y 320, view SE, standing, speaking warmly, one hand gesturing at chest height; mouth alternates open and closed, holding rolled plans. Flat #14131B background, no text or logos."
- **`al-jazari__talk_NE.png`** — 4 frames, view NE. Holding: rolled plans. Pose: standing, speaking warmly, one hand gesturing at chest height; mouth alternates open and closed.
  > Prompt: "Pixel-art sprite strip of al-Jazari (same person and outfit as the attached sprite), 4 frames in one row, each 224×336 px, feet at x 112 y 320, view NE, standing, speaking warmly, one hand gesturing at chest height; mouth alternates open and closed, holding rolled plans. Flat #14131B background, no text or logos."
- **`al-jazari__idle_SE.png`** — 4 frames, view SE. Holding: rolled plans. Pose: standing relaxed, weight on both feet; small breathing movement; one frame with a blink.
  > Prompt: "Pixel-art sprite strip of al-Jazari (same person and outfit as the attached sprite), 4 frames in one row, each 224×336 px, feet at x 112 y 320, view SE, standing relaxed, weight on both feet; small breathing movement; one frame with a blink, holding rolled plans. Flat #14131B background, no text or logos."
- **`al-jazari__idle_NE.png`** — 4 frames, view NE. Holding: rolled plans. Pose: standing relaxed, weight on both feet; small breathing movement; one frame with a blink.
  > Prompt: "Pixel-art sprite strip of al-Jazari (same person and outfit as the attached sprite), 4 frames in one row, each 224×336 px, feet at x 112 y 320, view NE, standing relaxed, weight on both feet; small breathing movement; one frame with a blink, holding rolled plans. Flat #14131B background, no text or logos."

## Al-Khwarizmi — `al-khwarizmi`

Outfit as in the sprite (scholar-robe, imamah). Default held item: a plain book (no readable text).

- **`al-khwarizmi__idle_SE.png`** — 4 frames, view SE. Holding: a plain book (no readable text). Pose: standing relaxed, weight on both feet; small breathing movement; one frame with a blink.
  > Prompt: "Pixel-art sprite strip of Al-Khwarizmi (same person and outfit as the attached sprite), 4 frames in one row, each 224×336 px, feet at x 112 y 320, view SE, standing relaxed, weight on both feet; small breathing movement; one frame with a blink, holding a plain book (no readable text). Flat #14131B background, no text or logos."
- **`al-khwarizmi__idle_NE.png`** — 4 frames, view NE. Holding: a plain book (no readable text). Pose: standing relaxed, weight on both feet; small breathing movement; one frame with a blink.
  > Prompt: "Pixel-art sprite strip of Al-Khwarizmi (same person and outfit as the attached sprite), 4 frames in one row, each 224×336 px, feet at x 112 y 320, view NE, standing relaxed, weight on both feet; small breathing movement; one frame with a blink, holding a plain book (no readable text). Flat #14131B background, no text or logos."
- **`al-khwarizmi__talk_SE.png`** — 4 frames, view SE. Holding: a plain book (no readable text). Pose: standing, speaking warmly, one hand gesturing at chest height; mouth alternates open and closed.
  > Prompt: "Pixel-art sprite strip of Al-Khwarizmi (same person and outfit as the attached sprite), 4 frames in one row, each 224×336 px, feet at x 112 y 320, view SE, standing, speaking warmly, one hand gesturing at chest height; mouth alternates open and closed, holding a plain book (no readable text). Flat #14131B background, no text or logos."
- **`al-khwarizmi__talk_NE.png`** — 4 frames, view NE. Holding: a plain book (no readable text). Pose: standing, speaking warmly, one hand gesturing at chest height; mouth alternates open and closed.
  > Prompt: "Pixel-art sprite strip of Al-Khwarizmi (same person and outfit as the attached sprite), 4 frames in one row, each 224×336 px, feet at x 112 y 320, view NE, standing, speaking warmly, one hand gesturing at chest height; mouth alternates open and closed, holding a plain book (no readable text). Flat #14131B background, no text or logos."

## al-Zahrawi — `al-zahrawi`

Outfit as in the sprite (jubba, imamah). Default held item: a plain rolled scroll.

- **`al-zahrawi__talk_SE.png`** — 4 frames, view SE. Holding: a plain rolled scroll. Pose: standing, speaking warmly, one hand gesturing at chest height; mouth alternates open and closed.
  > Prompt: "Pixel-art sprite strip of al-Zahrawi (same person and outfit as the attached sprite), 4 frames in one row, each 224×336 px, feet at x 112 y 320, view SE, standing, speaking warmly, one hand gesturing at chest height; mouth alternates open and closed, holding a plain rolled scroll. Flat #14131B background, no text or logos."
- **`al-zahrawi__talk_NE.png`** — 4 frames, view NE. Holding: a plain rolled scroll. Pose: standing, speaking warmly, one hand gesturing at chest height; mouth alternates open and closed.
  > Prompt: "Pixel-art sprite strip of al-Zahrawi (same person and outfit as the attached sprite), 4 frames in one row, each 224×336 px, feet at x 112 y 320, view NE, standing, speaking warmly, one hand gesturing at chest height; mouth alternates open and closed, holding a plain rolled scroll. Flat #14131B background, no text or logos."
- **`al-zahrawi__idle_SE.png`** — 4 frames, view SE. Holding: a plain rolled scroll. Pose: standing relaxed, weight on both feet; small breathing movement; one frame with a blink.
  > Prompt: "Pixel-art sprite strip of al-Zahrawi (same person and outfit as the attached sprite), 4 frames in one row, each 224×336 px, feet at x 112 y 320, view SE, standing relaxed, weight on both feet; small breathing movement; one frame with a blink, holding a plain rolled scroll. Flat #14131B background, no text or logos."
- **`al-zahrawi__idle_NE.png`** — 4 frames, view NE. Holding: a plain rolled scroll. Pose: standing relaxed, weight on both feet; small breathing movement; one frame with a blink.
  > Prompt: "Pixel-art sprite strip of al-Zahrawi (same person and outfit as the attached sprite), 4 frames in one row, each 224×336 px, feet at x 112 y 320, view NE, standing relaxed, weight on both feet; small breathing movement; one frame with a blink, holding a plain rolled scroll. Flat #14131B background, no text or logos."

## Aziz Sancar — `aziz-sancar`

Outfit as in the sprite (lab-coat). Default held item: a lab flask.

- **`aziz-sancar__pour_SE.png`** — 6 frames, view SE. Holding: a lab flask. Pose: pouring from the held vessel into a cup or flask, careful and steady.
  > Prompt: "Pixel-art sprite strip of Aziz Sancar (same person and outfit as the attached sprite), 6 frames in one row, each 224×336 px, feet at x 112 y 320, view SE, pouring from the held vessel into a cup or flask, careful and steady, holding a lab flask. Flat #14131B background, no text or logos."
- **`aziz-sancar__pour_NE.png`** — 6 frames, view NE. Holding: a lab flask. Pose: pouring from the held vessel into a cup or flask, careful and steady.
  > Prompt: "Pixel-art sprite strip of Aziz Sancar (same person and outfit as the attached sprite), 6 frames in one row, each 224×336 px, feet at x 112 y 320, view NE, pouring from the held vessel into a cup or flask, careful and steady, holding a lab flask. Flat #14131B background, no text or logos."
- **`aziz-sancar__talk_SE.png`** — 4 frames, view SE. Holding: a lab flask. Pose: standing, speaking warmly, one hand gesturing at chest height; mouth alternates open and closed.
  > Prompt: "Pixel-art sprite strip of Aziz Sancar (same person and outfit as the attached sprite), 4 frames in one row, each 224×336 px, feet at x 112 y 320, view SE, standing, speaking warmly, one hand gesturing at chest height; mouth alternates open and closed, holding a lab flask. Flat #14131B background, no text or logos."
- **`aziz-sancar__talk_NE.png`** — 4 frames, view NE. Holding: a lab flask. Pose: standing, speaking warmly, one hand gesturing at chest height; mouth alternates open and closed.
  > Prompt: "Pixel-art sprite strip of Aziz Sancar (same person and outfit as the attached sprite), 4 frames in one row, each 224×336 px, feet at x 112 y 320, view NE, standing, speaking warmly, one hand gesturing at chest height; mouth alternates open and closed, holding a lab flask. Flat #14131B background, no text or logos."

## Begum Rokeya — `begum-rokeya`

Outfit as in the sprite (long-dress, hijab). Default held item: a plain book (no readable text).

- **`begum-rokeya__talk_SE.png`** — 4 frames, view SE. Holding: a plain book (no readable text). Pose: standing, speaking warmly, one hand gesturing at chest height; mouth alternates open and closed.
  > Prompt: "Pixel-art sprite strip of Begum Rokeya (same person and outfit as the attached sprite), 4 frames in one row, each 224×336 px, feet at x 112 y 320, view SE, standing, speaking warmly, one hand gesturing at chest height; mouth alternates open and closed, holding a plain book (no readable text). Flat #14131B background, no text or logos."
- **`begum-rokeya__talk_NE.png`** — 4 frames, view NE. Holding: a plain book (no readable text). Pose: standing, speaking warmly, one hand gesturing at chest height; mouth alternates open and closed.
  > Prompt: "Pixel-art sprite strip of Begum Rokeya (same person and outfit as the attached sprite), 4 frames in one row, each 224×336 px, feet at x 112 y 320, view NE, standing, speaking warmly, one hand gesturing at chest height; mouth alternates open and closed, holding a plain book (no readable text). Flat #14131B background, no text or logos."

## Fatima al-Fihri — `fatima-al-fihri`

Outfit as in the sprite (abaya, khimar). Default held item: nothing.

- **`fatima-al-fihri__wave_SE.png`** — 4 frames, view SE. Holding: nothing. Pose: standing, right hand raised above the shoulder waving side to side, friendly smile.
  > Prompt: "Pixel-art sprite strip of Fatima al-Fihri (same person and outfit as the attached sprite), 4 frames in one row, each 224×336 px, feet at x 112 y 320, view SE, standing, right hand raised above the shoulder waving side to side, friendly smile, holding nothing. Flat #14131B background, no text or logos."
- **`fatima-al-fihri__wave_NE.png`** — 4 frames, view NE. Holding: nothing. Pose: standing, right hand raised above the shoulder waving side to side, friendly smile.
  > Prompt: "Pixel-art sprite strip of Fatima al-Fihri (same person and outfit as the attached sprite), 4 frames in one row, each 224×336 px, feet at x 112 y 320, view NE, standing, right hand raised above the shoulder waving side to side, friendly smile, holding nothing. Flat #14131B background, no text or logos."
- **`fatima-al-fihri__talk_SE.png`** — 4 frames, view SE. Holding: nothing. Pose: standing, speaking warmly, one hand gesturing at chest height; mouth alternates open and closed.
  > Prompt: "Pixel-art sprite strip of Fatima al-Fihri (same person and outfit as the attached sprite), 4 frames in one row, each 224×336 px, feet at x 112 y 320, view SE, standing, speaking warmly, one hand gesturing at chest height; mouth alternates open and closed, holding nothing. Flat #14131B background, no text or logos."
- **`fatima-al-fihri__talk_NE.png`** — 4 frames, view NE. Holding: nothing. Pose: standing, speaking warmly, one hand gesturing at chest height; mouth alternates open and closed.
  > Prompt: "Pixel-art sprite strip of Fatima al-Fihri (same person and outfit as the attached sprite), 4 frames in one row, each 224×336 px, feet at x 112 y 320, view NE, standing, speaking warmly, one hand gesturing at chest height; mouth alternates open and closed, holding nothing. Flat #14131B background, no text or logos."

## Fazlur Rahman Khan — `fazlur-rahman-khan`

Outfit as in the sprite (suit). Default held item: rolled plans.

- **`fazlur-rahman-khan__talk_SE.png`** — 4 frames, view SE. Holding: rolled plans. Pose: standing, speaking warmly, one hand gesturing at chest height; mouth alternates open and closed.
  > Prompt: "Pixel-art sprite strip of Fazlur Rahman Khan (same person and outfit as the attached sprite), 4 frames in one row, each 224×336 px, feet at x 112 y 320, view SE, standing, speaking warmly, one hand gesturing at chest height; mouth alternates open and closed, holding rolled plans. Flat #14131B background, no text or logos."
- **`fazlur-rahman-khan__talk_NE.png`** — 4 frames, view NE. Holding: rolled plans. Pose: standing, speaking warmly, one hand gesturing at chest height; mouth alternates open and closed.
  > Prompt: "Pixel-art sprite strip of Fazlur Rahman Khan (same person and outfit as the attached sprite), 4 frames in one row, each 224×336 px, feet at x 112 y 320, view NE, standing, speaking warmly, one hand gesturing at chest height; mouth alternates open and closed, holding rolled plans. Flat #14131B background, no text or logos."
- **`fazlur-rahman-khan__idle_SE.png`** — 4 frames, view SE. Holding: rolled plans. Pose: standing relaxed, weight on both feet; small breathing movement; one frame with a blink.
  > Prompt: "Pixel-art sprite strip of Fazlur Rahman Khan (same person and outfit as the attached sprite), 4 frames in one row, each 224×336 px, feet at x 112 y 320, view SE, standing relaxed, weight on both feet; small breathing movement; one frame with a blink, holding rolled plans. Flat #14131B background, no text or logos."
- **`fazlur-rahman-khan__idle_NE.png`** — 4 frames, view NE. Holding: rolled plans. Pose: standing relaxed, weight on both feet; small breathing movement; one frame with a blink.
  > Prompt: "Pixel-art sprite strip of Fazlur Rahman Khan (same person and outfit as the attached sprite), 4 frames in one row, each 224×336 px, feet at x 112 y 320, view NE, standing relaxed, weight on both feet; small breathing movement; one frame with a blink, holding rolled plans. Flat #14131B background, no text or logos."

## Frédéric Kanouté — `frederic-kanoute`

Outfit as in the sprite (football-kit). Default held item: nothing.

- **`frederic-kanoute__idle_SE.png`** — 4 frames, view SE. Holding: nothing. Pose: standing relaxed, weight on both feet; small breathing movement; one frame with a blink.
  > Prompt: "Pixel-art sprite strip of Frédéric Kanouté (same person and outfit as the attached sprite), 4 frames in one row, each 224×336 px, feet at x 112 y 320, view SE, standing relaxed, weight on both feet; small breathing movement; one frame with a blink, holding nothing. Flat #14131B background, no text or logos."
- **`frederic-kanoute__idle_NE.png`** — 4 frames, view NE. Holding: nothing. Pose: standing relaxed, weight on both feet; small breathing movement; one frame with a blink.
  > Prompt: "Pixel-art sprite strip of Frédéric Kanouté (same person and outfit as the attached sprite), 4 frames in one row, each 224×336 px, feet at x 112 y 320, view NE, standing relaxed, weight on both feet; small breathing movement; one frame with a blink, holding nothing. Flat #14131B background, no text or logos."
- **`frederic-kanoute__celebrate_SE.png`** — 4 frames, view SE. Holding: nothing. Pose: right arm raised with the index finger pointing to the sky, calm proud face.
  > Prompt: "Pixel-art sprite strip of Frédéric Kanouté (same person and outfit as the attached sprite), 4 frames in one row, each 224×336 px, feet at x 112 y 320, view SE, right arm raised with the index finger pointing to the sky, calm proud face, holding nothing. Flat #14131B background, no text or logos."
- **`frederic-kanoute__celebrate_NE.png`** — 4 frames, view NE. Holding: nothing. Pose: right arm raised with the index finger pointing to the sky, calm proud face.
  > Prompt: "Pixel-art sprite strip of Frédéric Kanouté (same person and outfit as the attached sprite), 4 frames in one row, each 224×336 px, feet at x 112 y 320, view NE, right arm raised with the index finger pointing to the sky, calm proud face, holding nothing. Flat #14131B background, no text or logos."
- **`frederic-kanoute__walk_SE.png`** — 6 frames, view SE. Holding: nothing. Pose: a full walk cycle: contact, down, passing, up for each leg, arms swinging opposite to the legs.
  > Prompt: "Pixel-art sprite strip of Frédéric Kanouté (same person and outfit as the attached sprite), 6 frames in one row, each 224×336 px, feet at x 112 y 320, view SE, a full walk cycle: contact, down, passing, up for each leg, arms swinging opposite to the legs, holding nothing. Flat #14131B background, no text or logos."
- **`frederic-kanoute__walk_NE.png`** — 6 frames, view NE. Holding: nothing. Pose: a full walk cycle: contact, down, passing, up for each leg, arms swinging opposite to the legs.
  > Prompt: "Pixel-art sprite strip of Frédéric Kanouté (same person and outfit as the attached sprite), 6 frames in one row, each 224×336 px, feet at x 112 y 320, view NE, a full walk cycle: contact, down, passing, up for each leg, arms swinging opposite to the legs, holding nothing. Flat #14131B background, no text or logos."
- **`frederic-kanoute__talk@keys_SE.png`** — 4 frames, view SE. Holding: a small ring of keys. Pose: standing, speaking warmly, one hand gesturing at chest height; mouth alternates open and closed.
  > Prompt: "Pixel-art sprite strip of Frédéric Kanouté (same person and outfit as the attached sprite), 4 frames in one row, each 224×336 px, feet at x 112 y 320, view SE, standing, speaking warmly, one hand gesturing at chest height; mouth alternates open and closed, holding a small ring of keys. Flat #14131B background, no text or logos."
- **`frederic-kanoute__talk@keys_NE.png`** — 4 frames, view NE. Holding: a small ring of keys. Pose: standing, speaking warmly, one hand gesturing at chest height; mouth alternates open and closed.
  > Prompt: "Pixel-art sprite strip of Frédéric Kanouté (same person and outfit as the attached sprite), 4 frames in one row, each 224×336 px, feet at x 112 y 320, view NE, standing, speaking warmly, one hand gesturing at chest height; mouth alternates open and closed, holding a small ring of keys. Flat #14131B background, no text or logos."
- **`frederic-kanoute__wave_SE.png`** — 4 frames, view SE. Holding: nothing. Pose: standing, right hand raised above the shoulder waving side to side, friendly smile.
  > Prompt: "Pixel-art sprite strip of Frédéric Kanouté (same person and outfit as the attached sprite), 4 frames in one row, each 224×336 px, feet at x 112 y 320, view SE, standing, right hand raised above the shoulder waving side to side, friendly smile, holding nothing. Flat #14131B background, no text or logos."
- **`frederic-kanoute__wave_NE.png`** — 4 frames, view NE. Holding: nothing. Pose: standing, right hand raised above the shoulder waving side to side, friendly smile.
  > Prompt: "Pixel-art sprite strip of Frédéric Kanouté (same person and outfit as the attached sprite), 4 frames in one row, each 224×336 px, feet at x 112 y 320, view NE, standing, right hand raised above the shoulder waving side to side, friendly smile, holding nothing. Flat #14131B background, no text or logos."

## Habib Umar bin Hafiz — `habib-umar-bin-hafiz`

Outfit as in the sprite (jubba, imamah). Default held item: nothing.

- **`habib-umar-bin-hafiz__teach_SE.png`** — 4 frames, view SE. Holding: nothing. Pose: sitting cross-legged on the floor, teaching, one hand gesturing.
  > Prompt: "Pixel-art sprite strip of Habib Umar bin Hafiz (same person and outfit as the attached sprite), 4 frames in one row, each 224×336 px, feet at x 112 y 320, view SE, sitting cross-legged on the floor, teaching, one hand gesturing, holding nothing. Flat #14131B background, no text or logos."
- **`habib-umar-bin-hafiz__teach_NE.png`** — 4 frames, view NE. Holding: nothing. Pose: sitting cross-legged on the floor, teaching, one hand gesturing.
  > Prompt: "Pixel-art sprite strip of Habib Umar bin Hafiz (same person and outfit as the attached sprite), 4 frames in one row, each 224×336 px, feet at x 112 y 320, view NE, sitting cross-legged on the floor, teaching, one hand gesturing, holding nothing. Flat #14131B background, no text or logos."

## Hakeem Olajuwon — `hakeem-olajuwon`

Outfit as in the sprite (football-kit). Default held item: nothing.

- **`hakeem-olajuwon__celebrate_SE.png`** — 4 frames, view SE. Holding: nothing. Pose: right arm raised with the index finger pointing to the sky, calm proud face.
  > Prompt: "Pixel-art sprite strip of Hakeem Olajuwon (same person and outfit as the attached sprite), 4 frames in one row, each 224×336 px, feet at x 112 y 320, view SE, right arm raised with the index finger pointing to the sky, calm proud face, holding nothing. Flat #14131B background, no text or logos."
- **`hakeem-olajuwon__celebrate_NE.png`** — 4 frames, view NE. Holding: nothing. Pose: right arm raised with the index finger pointing to the sky, calm proud face.
  > Prompt: "Pixel-art sprite strip of Hakeem Olajuwon (same person and outfit as the attached sprite), 4 frames in one row, each 224×336 px, feet at x 112 y 320, view NE, right arm raised with the index finger pointing to the sky, calm proud face, holding nothing. Flat #14131B background, no text or logos."
- **`hakeem-olajuwon__idle_SE.png`** — 4 frames, view SE. Holding: nothing. Pose: standing relaxed, weight on both feet; small breathing movement; one frame with a blink.
  > Prompt: "Pixel-art sprite strip of Hakeem Olajuwon (same person and outfit as the attached sprite), 4 frames in one row, each 224×336 px, feet at x 112 y 320, view SE, standing relaxed, weight on both feet; small breathing movement; one frame with a blink, holding nothing. Flat #14131B background, no text or logos."
- **`hakeem-olajuwon__idle_NE.png`** — 4 frames, view NE. Holding: nothing. Pose: standing relaxed, weight on both feet; small breathing movement; one frame with a blink.
  > Prompt: "Pixel-art sprite strip of Hakeem Olajuwon (same person and outfit as the attached sprite), 4 frames in one row, each 224×336 px, feet at x 112 y 320, view NE, standing relaxed, weight on both feet; small breathing movement; one frame with a blink, holding nothing. Flat #14131B background, no text or logos."

## Hakim Ziyech — `hakim-ziyech`

Outfit as in the sprite (football-kit). Default held item: nothing.

- **`hakim-ziyech__kick_SE.png`** — 4 frames, view SE. Holding: nothing. Pose: football strike: wind-up, plant foot, strike through the ball, follow-through.
  > Prompt: "Pixel-art sprite strip of Hakim Ziyech (same person and outfit as the attached sprite), 4 frames in one row, each 224×336 px, feet at x 112 y 320, view SE, football strike: wind-up, plant foot, strike through the ball, follow-through, holding nothing. Flat #14131B background, no text or logos."
- **`hakim-ziyech__kick_NE.png`** — 4 frames, view NE. Holding: nothing. Pose: football strike: wind-up, plant foot, strike through the ball, follow-through.
  > Prompt: "Pixel-art sprite strip of Hakim Ziyech (same person and outfit as the attached sprite), 4 frames in one row, each 224×336 px, feet at x 112 y 320, view NE, football strike: wind-up, plant foot, strike through the ball, follow-through, holding nothing. Flat #14131B background, no text or logos."
- **`hakim-ziyech__celebrate_SE.png`** — 4 frames, view SE. Holding: nothing. Pose: right arm raised with the index finger pointing to the sky, calm proud face.
  > Prompt: "Pixel-art sprite strip of Hakim Ziyech (same person and outfit as the attached sprite), 4 frames in one row, each 224×336 px, feet at x 112 y 320, view SE, right arm raised with the index finger pointing to the sky, calm proud face, holding nothing. Flat #14131B background, no text or logos."
- **`hakim-ziyech__celebrate_NE.png`** — 4 frames, view NE. Holding: nothing. Pose: right arm raised with the index finger pointing to the sky, calm proud face.
  > Prompt: "Pixel-art sprite strip of Hakim Ziyech (same person and outfit as the attached sprite), 4 frames in one row, each 224×336 px, feet at x 112 y 320, view NE, right arm raised with the index finger pointing to the sky, calm proud face, holding nothing. Flat #14131B background, no text or logos."
- **`hakim-ziyech__idle@envelope_SE.png`** — 4 frames, view SE. Holding: a plain cream envelope. Pose: standing relaxed, weight on both feet; small breathing movement; one frame with a blink.
  > Prompt: "Pixel-art sprite strip of Hakim Ziyech (same person and outfit as the attached sprite), 4 frames in one row, each 224×336 px, feet at x 112 y 320, view SE, standing relaxed, weight on both feet; small breathing movement; one frame with a blink, holding a plain cream envelope. Flat #14131B background, no text or logos."
- **`hakim-ziyech__idle@envelope_NE.png`** — 4 frames, view NE. Holding: a plain cream envelope. Pose: standing relaxed, weight on both feet; small breathing movement; one frame with a blink.
  > Prompt: "Pixel-art sprite strip of Hakim Ziyech (same person and outfit as the attached sprite), 4 frames in one row, each 224×336 px, feet at x 112 y 320, view NE, standing relaxed, weight on both feet; small breathing movement; one frame with a blink, holding a plain cream envelope. Flat #14131B background, no text or logos."
- **`hakim-ziyech__talk@envelope_SE.png`** — 4 frames, view SE. Holding: a plain cream envelope. Pose: standing, speaking warmly, one hand gesturing at chest height; mouth alternates open and closed.
  > Prompt: "Pixel-art sprite strip of Hakim Ziyech (same person and outfit as the attached sprite), 4 frames in one row, each 224×336 px, feet at x 112 y 320, view SE, standing, speaking warmly, one hand gesturing at chest height; mouth alternates open and closed, holding a plain cream envelope. Flat #14131B background, no text or logos."
- **`hakim-ziyech__talk@envelope_NE.png`** — 4 frames, view NE. Holding: a plain cream envelope. Pose: standing, speaking warmly, one hand gesturing at chest height; mouth alternates open and closed.
  > Prompt: "Pixel-art sprite strip of Hakim Ziyech (same person and outfit as the attached sprite), 4 frames in one row, each 224×336 px, feet at x 112 y 320, view NE, standing, speaking warmly, one hand gesturing at chest height; mouth alternates open and closed, holding a plain cream envelope. Flat #14131B background, no text or logos."
- **`hakim-ziyech__wave_SE.png`** — 4 frames, view SE. Holding: nothing. Pose: standing, right hand raised above the shoulder waving side to side, friendly smile.
  > Prompt: "Pixel-art sprite strip of Hakim Ziyech (same person and outfit as the attached sprite), 4 frames in one row, each 224×336 px, feet at x 112 y 320, view SE, standing, right hand raised above the shoulder waving side to side, friendly smile, holding nothing. Flat #14131B background, no text or logos."
- **`hakim-ziyech__wave_NE.png`** — 4 frames, view NE. Holding: nothing. Pose: standing, right hand raised above the shoulder waving side to side, friendly smile.
  > Prompt: "Pixel-art sprite strip of Hakim Ziyech (same person and outfit as the attached sprite), 4 frames in one row, each 224×336 px, feet at x 112 y 320, view NE, standing, right hand raised above the shoulder waving side to side, friendly smile, holding nothing. Flat #14131B background, no text or logos."

## Hamza Yusuf — `hamza-yusuf`

Outfit as in the sprite (jubba, imamah). Default held item: a plain book (no readable text).

- **`hamza-yusuf__talk_SE.png`** — 4 frames, view SE. Holding: a plain book (no readable text). Pose: standing, speaking warmly, one hand gesturing at chest height; mouth alternates open and closed.
  > Prompt: "Pixel-art sprite strip of Hamza Yusuf (same person and outfit as the attached sprite), 4 frames in one row, each 224×336 px, feet at x 112 y 320, view SE, standing, speaking warmly, one hand gesturing at chest height; mouth alternates open and closed, holding a plain book (no readable text). Flat #14131B background, no text or logos."
- **`hamza-yusuf__talk_NE.png`** — 4 frames, view NE. Holding: a plain book (no readable text). Pose: standing, speaking warmly, one hand gesturing at chest height; mouth alternates open and closed.
  > Prompt: "Pixel-art sprite strip of Hamza Yusuf (same person and outfit as the attached sprite), 4 frames in one row, each 224×336 px, feet at x 112 y 320, view NE, standing, speaking warmly, one hand gesturing at chest height; mouth alternates open and closed, holding a plain book (no readable text). Flat #14131B background, no text or logos."
- **`hamza-yusuf__idle_SE.png`** — 4 frames, view SE. Holding: a plain book (no readable text). Pose: standing relaxed, weight on both feet; small breathing movement; one frame with a blink.
  > Prompt: "Pixel-art sprite strip of Hamza Yusuf (same person and outfit as the attached sprite), 4 frames in one row, each 224×336 px, feet at x 112 y 320, view SE, standing relaxed, weight on both feet; small breathing movement; one frame with a blink, holding a plain book (no readable text). Flat #14131B background, no text or logos."
- **`hamza-yusuf__idle_NE.png`** — 4 frames, view NE. Holding: a plain book (no readable text). Pose: standing relaxed, weight on both feet; small breathing movement; one frame with a blink.
  > Prompt: "Pixel-art sprite strip of Hamza Yusuf (same person and outfit as the attached sprite), 4 frames in one row, each 224×336 px, feet at x 112 y 320, view NE, standing relaxed, weight on both feet; small breathing movement; one frame with a blink, holding a plain book (no readable text). Flat #14131B background, no text or logos."

## Hashim Amla — `hashim-amla`

Outfit as in the sprite (shirt-trousers). Default held item: a cricket bat.

- **`hashim-amla__bat_SE.png`** — 4 frames, view SE. Holding: a cricket bat. Pose: cricket cover drive: stance with bat raised, front foot forward, bat through low toward the ball, high follow-through.
  > Prompt: "Pixel-art sprite strip of Hashim Amla (same person and outfit as the attached sprite), 4 frames in one row, each 224×336 px, feet at x 112 y 320, view SE, cricket cover drive: stance with bat raised, front foot forward, bat through low toward the ball, high follow-through, holding a cricket bat. Flat #14131B background, no text or logos."
- **`hashim-amla__bat_NE.png`** — 4 frames, view NE. Holding: a cricket bat. Pose: cricket cover drive: stance with bat raised, front foot forward, bat through low toward the ball, high follow-through.
  > Prompt: "Pixel-art sprite strip of Hashim Amla (same person and outfit as the attached sprite), 4 frames in one row, each 224×336 px, feet at x 112 y 320, view NE, cricket cover drive: stance with bat raised, front foot forward, bat through low toward the ball, high follow-through, holding a cricket bat. Flat #14131B background, no text or logos."
- **`hashim-amla__walk_SE.png`** — 6 frames, view SE. Holding: a cricket bat. Pose: a full walk cycle: contact, down, passing, up for each leg, arms swinging opposite to the legs.
  > Prompt: "Pixel-art sprite strip of Hashim Amla (same person and outfit as the attached sprite), 6 frames in one row, each 224×336 px, feet at x 112 y 320, view SE, a full walk cycle: contact, down, passing, up for each leg, arms swinging opposite to the legs, holding a cricket bat. Flat #14131B background, no text or logos."
- **`hashim-amla__walk_NE.png`** — 6 frames, view NE. Holding: a cricket bat. Pose: a full walk cycle: contact, down, passing, up for each leg, arms swinging opposite to the legs.
  > Prompt: "Pixel-art sprite strip of Hashim Amla (same person and outfit as the attached sprite), 6 frames in one row, each 224×336 px, feet at x 112 y 320, view NE, a full walk cycle: contact, down, passing, up for each leg, arms swinging opposite to the legs, holding a cricket bat. Flat #14131B background, no text or logos."
- **`hashim-amla__idle_SE.png`** — 4 frames, view SE. Holding: a cricket bat. Pose: standing relaxed, weight on both feet; small breathing movement; one frame with a blink.
  > Prompt: "Pixel-art sprite strip of Hashim Amla (same person and outfit as the attached sprite), 4 frames in one row, each 224×336 px, feet at x 112 y 320, view SE, standing relaxed, weight on both feet; small breathing movement; one frame with a blink, holding a cricket bat. Flat #14131B background, no text or logos."
- **`hashim-amla__idle_NE.png`** — 4 frames, view NE. Holding: a cricket bat. Pose: standing relaxed, weight on both feet; small breathing movement; one frame with a blink.
  > Prompt: "Pixel-art sprite strip of Hashim Amla (same person and outfit as the attached sprite), 4 frames in one row, each 224×336 px, feet at x 112 y 320, view NE, standing relaxed, weight on both feet; small breathing movement; one frame with a blink, holding a cricket bat. Flat #14131B background, no text or logos."

## Ibn al-Haytham — `ibn-al-haytham`

Outfit as in the sprite (qaba, imamah). Default held item: a plain book (no readable text).

- **`ibn-al-haytham__talk_SE.png`** — 4 frames, view SE. Holding: a plain book (no readable text). Pose: standing, speaking warmly, one hand gesturing at chest height; mouth alternates open and closed.
  > Prompt: "Pixel-art sprite strip of Ibn al-Haytham (same person and outfit as the attached sprite), 4 frames in one row, each 224×336 px, feet at x 112 y 320, view SE, standing, speaking warmly, one hand gesturing at chest height; mouth alternates open and closed, holding a plain book (no readable text). Flat #14131B background, no text or logos."
- **`ibn-al-haytham__talk_NE.png`** — 4 frames, view NE. Holding: a plain book (no readable text). Pose: standing, speaking warmly, one hand gesturing at chest height; mouth alternates open and closed.
  > Prompt: "Pixel-art sprite strip of Ibn al-Haytham (same person and outfit as the attached sprite), 4 frames in one row, each 224×336 px, feet at x 112 y 320, view NE, standing, speaking warmly, one hand gesturing at chest height; mouth alternates open and closed, holding a plain book (no readable text). Flat #14131B background, no text or logos."
- **`ibn-al-haytham__idle_SE.png`** — 4 frames, view SE. Holding: a plain book (no readable text). Pose: standing relaxed, weight on both feet; small breathing movement; one frame with a blink.
  > Prompt: "Pixel-art sprite strip of Ibn al-Haytham (same person and outfit as the attached sprite), 4 frames in one row, each 224×336 px, feet at x 112 y 320, view SE, standing relaxed, weight on both feet; small breathing movement; one frame with a blink, holding a plain book (no readable text). Flat #14131B background, no text or logos."
- **`ibn-al-haytham__idle_NE.png`** — 4 frames, view NE. Holding: a plain book (no readable text). Pose: standing relaxed, weight on both feet; small breathing movement; one frame with a blink.
  > Prompt: "Pixel-art sprite strip of Ibn al-Haytham (same person and outfit as the attached sprite), 4 frames in one row, each 224×336 px, feet at x 112 y 320, view NE, standing relaxed, weight on both feet; small breathing movement; one frame with a blink, holding a plain book (no readable text). Flat #14131B background, no text or logos."

## Ibn Battuta — `ibn-battuta`

Outfit as in the sprite (kaftan, imamah). Default held item: a plain rolled scroll.

- **`ibn-battuta__talk_SE.png`** — 4 frames, view SE. Holding: a plain rolled scroll. Pose: standing, speaking warmly, one hand gesturing at chest height; mouth alternates open and closed.
  > Prompt: "Pixel-art sprite strip of Ibn Battuta (same person and outfit as the attached sprite), 4 frames in one row, each 224×336 px, feet at x 112 y 320, view SE, standing, speaking warmly, one hand gesturing at chest height; mouth alternates open and closed, holding a plain rolled scroll. Flat #14131B background, no text or logos."
- **`ibn-battuta__talk_NE.png`** — 4 frames, view NE. Holding: a plain rolled scroll. Pose: standing, speaking warmly, one hand gesturing at chest height; mouth alternates open and closed.
  > Prompt: "Pixel-art sprite strip of Ibn Battuta (same person and outfit as the attached sprite), 4 frames in one row, each 224×336 px, feet at x 112 y 320, view NE, standing, speaking warmly, one hand gesturing at chest height; mouth alternates open and closed, holding a plain rolled scroll. Flat #14131B background, no text or logos."
- **`ibn-battuta__wave_SE.png`** — 4 frames, view SE. Holding: a plain rolled scroll. Pose: standing, right hand raised above the shoulder waving side to side, friendly smile.
  > Prompt: "Pixel-art sprite strip of Ibn Battuta (same person and outfit as the attached sprite), 4 frames in one row, each 224×336 px, feet at x 112 y 320, view SE, standing, right hand raised above the shoulder waving side to side, friendly smile, holding a plain rolled scroll. Flat #14131B background, no text or logos."
- **`ibn-battuta__wave_NE.png`** — 4 frames, view NE. Holding: a plain rolled scroll. Pose: standing, right hand raised above the shoulder waving side to side, friendly smile.
  > Prompt: "Pixel-art sprite strip of Ibn Battuta (same person and outfit as the attached sprite), 4 frames in one row, each 224×336 px, feet at x 112 y 320, view NE, standing, right hand raised above the shoulder waving side to side, friendly smile, holding a plain rolled scroll. Flat #14131B background, no text or logos."

## Ibn Khaldun — `ibn-khaldun`

Outfit as in the sprite (scholar-robe, imamah). Default held item: a plain book (no readable text).

- **`ibn-khaldun__idle_SE.png`** — 4 frames, view SE. Holding: a plain book (no readable text). Pose: standing relaxed, weight on both feet; small breathing movement; one frame with a blink.
  > Prompt: "Pixel-art sprite strip of Ibn Khaldun (same person and outfit as the attached sprite), 4 frames in one row, each 224×336 px, feet at x 112 y 320, view SE, standing relaxed, weight on both feet; small breathing movement; one frame with a blink, holding a plain book (no readable text). Flat #14131B background, no text or logos."
- **`ibn-khaldun__idle_NE.png`** — 4 frames, view NE. Holding: a plain book (no readable text). Pose: standing relaxed, weight on both feet; small breathing movement; one frame with a blink.
  > Prompt: "Pixel-art sprite strip of Ibn Khaldun (same person and outfit as the attached sprite), 4 frames in one row, each 224×336 px, feet at x 112 y 320, view NE, standing relaxed, weight on both feet; small breathing movement; one frame with a blink, holding a plain book (no readable text). Flat #14131B background, no text or logos."
- **`ibn-khaldun__talk_SE.png`** — 4 frames, view SE. Holding: a plain book (no readable text). Pose: standing, speaking warmly, one hand gesturing at chest height; mouth alternates open and closed.
  > Prompt: "Pixel-art sprite strip of Ibn Khaldun (same person and outfit as the attached sprite), 4 frames in one row, each 224×336 px, feet at x 112 y 320, view SE, standing, speaking warmly, one hand gesturing at chest height; mouth alternates open and closed, holding a plain book (no readable text). Flat #14131B background, no text or logos."
- **`ibn-khaldun__talk_NE.png`** — 4 frames, view NE. Holding: a plain book (no readable text). Pose: standing, speaking warmly, one hand gesturing at chest height; mouth alternates open and closed.
  > Prompt: "Pixel-art sprite strip of Ibn Khaldun (same person and outfit as the attached sprite), 4 frames in one row, each 224×336 px, feet at x 112 y 320, view NE, standing, speaking warmly, one hand gesturing at chest height; mouth alternates open and closed, holding a plain book (no readable text). Flat #14131B background, no text or logos."

## Ibn Rushd — `ibn-rushd`

Outfit as in the sprite (jubba, imamah). Default held item: a plain book (no readable text).

- **`ibn-rushd__talk_SE.png`** — 4 frames, view SE. Holding: a plain book (no readable text). Pose: standing, speaking warmly, one hand gesturing at chest height; mouth alternates open and closed.
  > Prompt: "Pixel-art sprite strip of Ibn Rushd (same person and outfit as the attached sprite), 4 frames in one row, each 224×336 px, feet at x 112 y 320, view SE, standing, speaking warmly, one hand gesturing at chest height; mouth alternates open and closed, holding a plain book (no readable text). Flat #14131B background, no text or logos."
- **`ibn-rushd__talk_NE.png`** — 4 frames, view NE. Holding: a plain book (no readable text). Pose: standing, speaking warmly, one hand gesturing at chest height; mouth alternates open and closed.
  > Prompt: "Pixel-art sprite strip of Ibn Rushd (same person and outfit as the attached sprite), 4 frames in one row, each 224×336 px, feet at x 112 y 320, view NE, standing, speaking warmly, one hand gesturing at chest height; mouth alternates open and closed, holding a plain book (no readable text). Flat #14131B background, no text or logos."
- **`ibn-rushd__idle_SE.png`** — 4 frames, view SE. Holding: a plain book (no readable text). Pose: standing relaxed, weight on both feet; small breathing movement; one frame with a blink.
  > Prompt: "Pixel-art sprite strip of Ibn Rushd (same person and outfit as the attached sprite), 4 frames in one row, each 224×336 px, feet at x 112 y 320, view SE, standing relaxed, weight on both feet; small breathing movement; one frame with a blink, holding a plain book (no readable text). Flat #14131B background, no text or logos."
- **`ibn-rushd__idle_NE.png`** — 4 frames, view NE. Holding: a plain book (no readable text). Pose: standing relaxed, weight on both feet; small breathing movement; one frame with a blink.
  > Prompt: "Pixel-art sprite strip of Ibn Rushd (same person and outfit as the attached sprite), 4 frames in one row, each 224×336 px, feet at x 112 y 320, view NE, standing relaxed, weight on both feet; small breathing movement; one frame with a blink, holding a plain book (no readable text). Flat #14131B background, no text or logos."

## Ibn Sina — `ibn-sina`

Outfit as in the sprite (jubba, imamah). Default held item: nothing.

- **`ibn-sina__talk_SE.png`** — 4 frames, view SE. Holding: nothing. Pose: standing, speaking warmly, one hand gesturing at chest height; mouth alternates open and closed.
  > Prompt: "Pixel-art sprite strip of Ibn Sina (same person and outfit as the attached sprite), 4 frames in one row, each 224×336 px, feet at x 112 y 320, view SE, standing, speaking warmly, one hand gesturing at chest height; mouth alternates open and closed, holding nothing. Flat #14131B background, no text or logos."
- **`ibn-sina__talk_NE.png`** — 4 frames, view NE. Holding: nothing. Pose: standing, speaking warmly, one hand gesturing at chest height; mouth alternates open and closed.
  > Prompt: "Pixel-art sprite strip of Ibn Sina (same person and outfit as the attached sprite), 4 frames in one row, each 224×336 px, feet at x 112 y 320, view NE, standing, speaking warmly, one hand gesturing at chest height; mouth alternates open and closed, holding nothing. Flat #14131B background, no text or logos."
- **`ibn-sina__idle_SE.png`** — 4 frames, view SE. Holding: nothing. Pose: standing relaxed, weight on both feet; small breathing movement; one frame with a blink.
  > Prompt: "Pixel-art sprite strip of Ibn Sina (same person and outfit as the attached sprite), 4 frames in one row, each 224×336 px, feet at x 112 y 320, view SE, standing relaxed, weight on both feet; small breathing movement; one frame with a blink, holding nothing. Flat #14131B background, no text or logos."
- **`ibn-sina__idle_NE.png`** — 4 frames, view NE. Holding: nothing. Pose: standing relaxed, weight on both feet; small breathing movement; one frame with a blink.
  > Prompt: "Pixel-art sprite strip of Ibn Sina (same person and outfit as the attached sprite), 4 frames in one row, each 224×336 px, feet at x 112 y 320, view NE, standing relaxed, weight on both feet; small breathing movement; one frame with a blink, holding nothing. Flat #14131B background, no text or logos."

## Islam Makhachev — `islam-makhachev`

Outfit as in the sprite (fight-kit). Default held item: MMA gloves.

- **`islam-makhachev__guard_SE.png`** — 4 frames, view SE. Holding: MMA gloves. Pose: calm fighting stance after the bout is over, hands up loosely, no violence.
  > Prompt: "Pixel-art sprite strip of Islam Makhachev (same person and outfit as the attached sprite), 4 frames in one row, each 224×336 px, feet at x 112 y 320, view SE, calm fighting stance after the bout is over, hands up loosely, no violence, holding MMA gloves. Flat #14131B background, no text or logos."
- **`islam-makhachev__guard_NE.png`** — 4 frames, view NE. Holding: MMA gloves. Pose: calm fighting stance after the bout is over, hands up loosely, no violence.
  > Prompt: "Pixel-art sprite strip of Islam Makhachev (same person and outfit as the attached sprite), 4 frames in one row, each 224×336 px, feet at x 112 y 320, view NE, calm fighting stance after the bout is over, hands up loosely, no violence, holding MMA gloves. Flat #14131B background, no text or logos."
- **`islam-makhachev__punch_SE.png`** — 4 frames, view SE. Holding: MMA gloves. Pose: shadow-boxing a straight punch into the air (no opponent hit): guard, extend, recoil, guard.
  > Prompt: "Pixel-art sprite strip of Islam Makhachev (same person and outfit as the attached sprite), 4 frames in one row, each 224×336 px, feet at x 112 y 320, view SE, shadow-boxing a straight punch into the air (no opponent hit): guard, extend, recoil, guard, holding MMA gloves. Flat #14131B background, no text or logos."
- **`islam-makhachev__punch_NE.png`** — 4 frames, view NE. Holding: MMA gloves. Pose: shadow-boxing a straight punch into the air (no opponent hit): guard, extend, recoil, guard.
  > Prompt: "Pixel-art sprite strip of Islam Makhachev (same person and outfit as the attached sprite), 4 frames in one row, each 224×336 px, feet at x 112 y 320, view NE, shadow-boxing a straight punch into the air (no opponent hit): guard, extend, recoil, guard, holding MMA gloves. Flat #14131B background, no text or logos."
- **`islam-makhachev__idle_SE.png`** — 4 frames, view SE. Holding: MMA gloves. Pose: standing relaxed, weight on both feet; small breathing movement; one frame with a blink.
  > Prompt: "Pixel-art sprite strip of Islam Makhachev (same person and outfit as the attached sprite), 4 frames in one row, each 224×336 px, feet at x 112 y 320, view SE, standing relaxed, weight on both feet; small breathing movement; one frame with a blink, holding MMA gloves. Flat #14131B background, no text or logos."
- **`islam-makhachev__idle_NE.png`** — 4 frames, view NE. Holding: MMA gloves. Pose: standing relaxed, weight on both feet; small breathing movement; one frame with a blink.
  > Prompt: "Pixel-art sprite strip of Islam Makhachev (same person and outfit as the attached sprite), 4 frames in one row, each 224×336 px, feet at x 112 y 320, view NE, standing relaxed, weight on both feet; small breathing movement; one frame with a blink, holding MMA gloves. Flat #14131B background, no text or logos."

## Kamaru Usman — `kamaru-usman`

Outfit as in the sprite (fight-kit). Default held item: MMA gloves.

- **`kamaru-usman__guard_SE.png`** — 4 frames, view SE. Holding: MMA gloves. Pose: calm fighting stance after the bout is over, hands up loosely, no violence.
  > Prompt: "Pixel-art sprite strip of Kamaru Usman (same person and outfit as the attached sprite), 4 frames in one row, each 224×336 px, feet at x 112 y 320, view SE, calm fighting stance after the bout is over, hands up loosely, no violence, holding MMA gloves. Flat #14131B background, no text or logos."
- **`kamaru-usman__guard_NE.png`** — 4 frames, view NE. Holding: MMA gloves. Pose: calm fighting stance after the bout is over, hands up loosely, no violence.
  > Prompt: "Pixel-art sprite strip of Kamaru Usman (same person and outfit as the attached sprite), 4 frames in one row, each 224×336 px, feet at x 112 y 320, view NE, calm fighting stance after the bout is over, hands up loosely, no violence, holding MMA gloves. Flat #14131B background, no text or logos."
- **`kamaru-usman__punch_SE.png`** — 4 frames, view SE. Holding: MMA gloves. Pose: shadow-boxing a straight punch into the air (no opponent hit): guard, extend, recoil, guard.
  > Prompt: "Pixel-art sprite strip of Kamaru Usman (same person and outfit as the attached sprite), 4 frames in one row, each 224×336 px, feet at x 112 y 320, view SE, shadow-boxing a straight punch into the air (no opponent hit): guard, extend, recoil, guard, holding MMA gloves. Flat #14131B background, no text or logos."
- **`kamaru-usman__punch_NE.png`** — 4 frames, view NE. Holding: MMA gloves. Pose: shadow-boxing a straight punch into the air (no opponent hit): guard, extend, recoil, guard.
  > Prompt: "Pixel-art sprite strip of Kamaru Usman (same person and outfit as the attached sprite), 4 frames in one row, each 224×336 px, feet at x 112 y 320, view NE, shadow-boxing a straight punch into the air (no opponent hit): guard, extend, recoil, guard, holding MMA gloves. Flat #14131B background, no text or logos."
- **`kamaru-usman__idle_SE.png`** — 4 frames, view SE. Holding: MMA gloves. Pose: standing relaxed, weight on both feet; small breathing movement; one frame with a blink.
  > Prompt: "Pixel-art sprite strip of Kamaru Usman (same person and outfit as the attached sprite), 4 frames in one row, each 224×336 px, feet at x 112 y 320, view SE, standing relaxed, weight on both feet; small breathing movement; one frame with a blink, holding MMA gloves. Flat #14131B background, no text or logos."
- **`kamaru-usman__idle_NE.png`** — 4 frames, view NE. Holding: MMA gloves. Pose: standing relaxed, weight on both feet; small breathing movement; one frame with a blink.
  > Prompt: "Pixel-art sprite strip of Kamaru Usman (same person and outfit as the attached sprite), 4 frames in one row, each 224×336 px, feet at x 112 y 320, view NE, standing relaxed, weight on both feet; small breathing movement; one frame with a blink, holding MMA gloves. Flat #14131B background, no text or logos."

## Karim Benzema — `karim-benzema`

Outfit as in the sprite (football-kit-captain). Default held item: white wrist tape.

- **`karim-benzema__celebrate_SE.png`** — 4 frames, view SE. Holding: white wrist tape. Pose: right arm raised with the index finger pointing to the sky, calm proud face.
  > Prompt: "Pixel-art sprite strip of Karim Benzema (same person and outfit as the attached sprite), 4 frames in one row, each 224×336 px, feet at x 112 y 320, view SE, right arm raised with the index finger pointing to the sky, calm proud face, holding white wrist tape. Flat #14131B background, no text or logos."
- **`karim-benzema__celebrate_NE.png`** — 4 frames, view NE. Holding: white wrist tape. Pose: right arm raised with the index finger pointing to the sky, calm proud face.
  > Prompt: "Pixel-art sprite strip of Karim Benzema (same person and outfit as the attached sprite), 4 frames in one row, each 224×336 px, feet at x 112 y 320, view NE, right arm raised with the index finger pointing to the sky, calm proud face, holding white wrist tape. Flat #14131B background, no text or logos."
- **`karim-benzema__cheer_SE.png`** — 4 frames, view SE. Holding: white wrist tape. Pose: both arms raised high and wide in joy, mouth open in a happy shout.
  > Prompt: "Pixel-art sprite strip of Karim Benzema (same person and outfit as the attached sprite), 4 frames in one row, each 224×336 px, feet at x 112 y 320, view SE, both arms raised high and wide in joy, mouth open in a happy shout, holding white wrist tape. Flat #14131B background, no text or logos."
- **`karim-benzema__cheer_NE.png`** — 4 frames, view NE. Holding: white wrist tape. Pose: both arms raised high and wide in joy, mouth open in a happy shout.
  > Prompt: "Pixel-art sprite strip of Karim Benzema (same person and outfit as the attached sprite), 4 frames in one row, each 224×336 px, feet at x 112 y 320, view NE, both arms raised high and wide in joy, mouth open in a happy shout, holding white wrist tape. Flat #14131B background, no text or logos."
- **`karim-benzema__cross-arms_SE.png`** — 4 frames, view SE. Holding: white wrist tape. Pose: arms folded across the chest, confident small nod.
  > Prompt: "Pixel-art sprite strip of Karim Benzema (same person and outfit as the attached sprite), 4 frames in one row, each 224×336 px, feet at x 112 y 320, view SE, arms folded across the chest, confident small nod, holding white wrist tape. Flat #14131B background, no text or logos."
- **`karim-benzema__cross-arms_NE.png`** — 4 frames, view NE. Holding: white wrist tape. Pose: arms folded across the chest, confident small nod.
  > Prompt: "Pixel-art sprite strip of Karim Benzema (same person and outfit as the attached sprite), 4 frames in one row, each 224×336 px, feet at x 112 y 320, view NE, arms folded across the chest, confident small nod, holding white wrist tape. Flat #14131B background, no text or logos."

## Kazi Nazrul Islam — `kazi-nazrul-islam`

Outfit as in the sprite (panjabi-lungi). Default held item: a plain book (no readable text).

- **`kazi-nazrul-islam__talk_SE.png`** — 4 frames, view SE. Holding: a plain book (no readable text). Pose: standing, speaking warmly, one hand gesturing at chest height; mouth alternates open and closed.
  > Prompt: "Pixel-art sprite strip of Kazi Nazrul Islam (same person and outfit as the attached sprite), 4 frames in one row, each 224×336 px, feet at x 112 y 320, view SE, standing, speaking warmly, one hand gesturing at chest height; mouth alternates open and closed, holding a plain book (no readable text). Flat #14131B background, no text or logos."
- **`kazi-nazrul-islam__talk_NE.png`** — 4 frames, view NE. Holding: a plain book (no readable text). Pose: standing, speaking warmly, one hand gesturing at chest height; mouth alternates open and closed.
  > Prompt: "Pixel-art sprite strip of Kazi Nazrul Islam (same person and outfit as the attached sprite), 4 frames in one row, each 224×336 px, feet at x 112 y 320, view NE, standing, speaking warmly, one hand gesturing at chest height; mouth alternates open and closed, holding a plain book (no readable text). Flat #14131B background, no text or logos."
- **`kazi-nazrul-islam__idle_SE.png`** — 4 frames, view SE. Holding: a plain book (no readable text). Pose: standing relaxed, weight on both feet; small breathing movement; one frame with a blink.
  > Prompt: "Pixel-art sprite strip of Kazi Nazrul Islam (same person and outfit as the attached sprite), 4 frames in one row, each 224×336 px, feet at x 112 y 320, view SE, standing relaxed, weight on both feet; small breathing movement; one frame with a blink, holding a plain book (no readable text). Flat #14131B background, no text or logos."
- **`kazi-nazrul-islam__idle_NE.png`** — 4 frames, view NE. Holding: a plain book (no readable text). Pose: standing relaxed, weight on both feet; small breathing movement; one frame with a blink.
  > Prompt: "Pixel-art sprite strip of Kazi Nazrul Islam (same person and outfit as the attached sprite), 4 frames in one row, each 224×336 px, feet at x 112 y 320, view NE, standing relaxed, weight on both feet; small breathing movement; one frame with a blink, holding a plain book (no readable text). Flat #14131B background, no text or logos."

## Khabib Nurmagomedov — `khabib-nurmagomedov`

Outfit as in the sprite (fight-kit, papakha). Default held item: a championship belt with a plain gold plate.

- **`khabib-nurmagomedov__belt-pose_SE.png`** — 4 frames, view SE. Holding: a championship belt with a plain gold plate. Pose: holding a championship belt (plain gold plate, no text) at waist level, proud smile.
  > Prompt: "Pixel-art sprite strip of Khabib Nurmagomedov (same person and outfit as the attached sprite), 4 frames in one row, each 224×336 px, feet at x 112 y 320, view SE, holding a championship belt (plain gold plate, no text) at waist level, proud smile, holding a championship belt with a plain gold plate. Flat #14131B background, no text or logos."
- **`khabib-nurmagomedov__belt-pose_NE.png`** — 4 frames, view NE. Holding: a championship belt with a plain gold plate. Pose: holding a championship belt (plain gold plate, no text) at waist level, proud smile.
  > Prompt: "Pixel-art sprite strip of Khabib Nurmagomedov (same person and outfit as the attached sprite), 4 frames in one row, each 224×336 px, feet at x 112 y 320, view NE, holding a championship belt (plain gold plate, no text) at waist level, proud smile, holding a championship belt with a plain gold plate. Flat #14131B background, no text or logos."
- **`khabib-nurmagomedov__wave_SE.png`** — 4 frames, view SE. Holding: a championship belt with a plain gold plate. Pose: standing, right hand raised above the shoulder waving side to side, friendly smile.
  > Prompt: "Pixel-art sprite strip of Khabib Nurmagomedov (same person and outfit as the attached sprite), 4 frames in one row, each 224×336 px, feet at x 112 y 320, view SE, standing, right hand raised above the shoulder waving side to side, friendly smile, holding a championship belt with a plain gold plate. Flat #14131B background, no text or logos."
- **`khabib-nurmagomedov__wave_NE.png`** — 4 frames, view NE. Holding: a championship belt with a plain gold plate. Pose: standing, right hand raised above the shoulder waving side to side, friendly smile.
  > Prompt: "Pixel-art sprite strip of Khabib Nurmagomedov (same person and outfit as the attached sprite), 4 frames in one row, each 224×336 px, feet at x 112 y 320, view NE, standing, right hand raised above the shoulder waving side to side, friendly smile, holding a championship belt with a plain gold plate. Flat #14131B background, no text or logos."

## Khamzat Chimaev — `khamzat-chimaev`

Outfit as in the sprite (fight-kit). Default held item: MMA gloves.

- **`khamzat-chimaev__guard_SE.png`** — 4 frames, view SE. Holding: MMA gloves. Pose: calm fighting stance after the bout is over, hands up loosely, no violence.
  > Prompt: "Pixel-art sprite strip of Khamzat Chimaev (same person and outfit as the attached sprite), 4 frames in one row, each 224×336 px, feet at x 112 y 320, view SE, calm fighting stance after the bout is over, hands up loosely, no violence, holding MMA gloves. Flat #14131B background, no text or logos."
- **`khamzat-chimaev__guard_NE.png`** — 4 frames, view NE. Holding: MMA gloves. Pose: calm fighting stance after the bout is over, hands up loosely, no violence.
  > Prompt: "Pixel-art sprite strip of Khamzat Chimaev (same person and outfit as the attached sprite), 4 frames in one row, each 224×336 px, feet at x 112 y 320, view NE, calm fighting stance after the bout is over, hands up loosely, no violence, holding MMA gloves. Flat #14131B background, no text or logos."
- **`khamzat-chimaev__punch_SE.png`** — 4 frames, view SE. Holding: MMA gloves. Pose: shadow-boxing a straight punch into the air (no opponent hit): guard, extend, recoil, guard.
  > Prompt: "Pixel-art sprite strip of Khamzat Chimaev (same person and outfit as the attached sprite), 4 frames in one row, each 224×336 px, feet at x 112 y 320, view SE, shadow-boxing a straight punch into the air (no opponent hit): guard, extend, recoil, guard, holding MMA gloves. Flat #14131B background, no text or logos."
- **`khamzat-chimaev__punch_NE.png`** — 4 frames, view NE. Holding: MMA gloves. Pose: shadow-boxing a straight punch into the air (no opponent hit): guard, extend, recoil, guard.
  > Prompt: "Pixel-art sprite strip of Khamzat Chimaev (same person and outfit as the attached sprite), 4 frames in one row, each 224×336 px, feet at x 112 y 320, view NE, shadow-boxing a straight punch into the air (no opponent hit): guard, extend, recoil, guard, holding MMA gloves. Flat #14131B background, no text or logos."
- **`khamzat-chimaev__idle_SE.png`** — 4 frames, view SE. Holding: MMA gloves. Pose: standing relaxed, weight on both feet; small breathing movement; one frame with a blink.
  > Prompt: "Pixel-art sprite strip of Khamzat Chimaev (same person and outfit as the attached sprite), 4 frames in one row, each 224×336 px, feet at x 112 y 320, view SE, standing relaxed, weight on both feet; small breathing movement; one frame with a blink, holding MMA gloves. Flat #14131B background, no text or logos."
- **`khamzat-chimaev__idle_NE.png`** — 4 frames, view NE. Holding: MMA gloves. Pose: standing relaxed, weight on both feet; small breathing movement; one frame with a blink.
  > Prompt: "Pixel-art sprite strip of Khamzat Chimaev (same person and outfit as the attached sprite), 4 frames in one row, each 224×336 px, feet at x 112 y 320, view NE, standing relaxed, weight on both feet; small breathing movement; one frame with a blink, holding MMA gloves. Flat #14131B background, no text or logos."

## Malala Yousafzai — `malala-yousafzai`

Outfit as in the sprite (long-dress, hijab). Default held item: a plain book (no readable text).

- **`malala-yousafzai__talk_SE.png`** — 4 frames, view SE. Holding: a plain book (no readable text). Pose: standing, speaking warmly, one hand gesturing at chest height; mouth alternates open and closed.
  > Prompt: "Pixel-art sprite strip of Malala Yousafzai (same person and outfit as the attached sprite), 4 frames in one row, each 224×336 px, feet at x 112 y 320, view SE, standing, speaking warmly, one hand gesturing at chest height; mouth alternates open and closed, holding a plain book (no readable text). Flat #14131B background, no text or logos."
- **`malala-yousafzai__talk_NE.png`** — 4 frames, view NE. Holding: a plain book (no readable text). Pose: standing, speaking warmly, one hand gesturing at chest height; mouth alternates open and closed.
  > Prompt: "Pixel-art sprite strip of Malala Yousafzai (same person and outfit as the attached sprite), 4 frames in one row, each 224×336 px, feet at x 112 y 320, view NE, standing, speaking warmly, one hand gesturing at chest height; mouth alternates open and closed, holding a plain book (no readable text). Flat #14131B background, no text or logos."
- **`malala-yousafzai__wave_SE.png`** — 4 frames, view SE. Holding: a plain book (no readable text). Pose: standing, right hand raised above the shoulder waving side to side, friendly smile.
  > Prompt: "Pixel-art sprite strip of Malala Yousafzai (same person and outfit as the attached sprite), 4 frames in one row, each 224×336 px, feet at x 112 y 320, view SE, standing, right hand raised above the shoulder waving side to side, friendly smile, holding a plain book (no readable text). Flat #14131B background, no text or logos."
- **`malala-yousafzai__wave_NE.png`** — 4 frames, view NE. Holding: a plain book (no readable text). Pose: standing, right hand raised above the shoulder waving side to side, friendly smile.
  > Prompt: "Pixel-art sprite strip of Malala Yousafzai (same person and outfit as the attached sprite), 4 frames in one row, each 224×336 px, feet at x 112 y 320, view NE, standing, right hand raised above the shoulder waving side to side, friendly smile, holding a plain book (no readable text). Flat #14131B background, no text or logos."

## Mashrafe Mortaza — `mashrafe-mortaza`

Outfit as in the sprite (shirt-trousers). Default held item: nothing.

- **`mashrafe-mortaza__celebrate_SE.png`** — 4 frames, view SE. Holding: nothing. Pose: right arm raised with the index finger pointing to the sky, calm proud face.
  > Prompt: "Pixel-art sprite strip of Mashrafe Mortaza (same person and outfit as the attached sprite), 4 frames in one row, each 224×336 px, feet at x 112 y 320, view SE, right arm raised with the index finger pointing to the sky, calm proud face, holding nothing. Flat #14131B background, no text or logos."
- **`mashrafe-mortaza__celebrate_NE.png`** — 4 frames, view NE. Holding: nothing. Pose: right arm raised with the index finger pointing to the sky, calm proud face.
  > Prompt: "Pixel-art sprite strip of Mashrafe Mortaza (same person and outfit as the attached sprite), 4 frames in one row, each 224×336 px, feet at x 112 y 320, view NE, right arm raised with the index finger pointing to the sky, calm proud face, holding nothing. Flat #14131B background, no text or logos."
- **`mashrafe-mortaza__idle_SE.png`** — 4 frames, view SE. Holding: nothing. Pose: standing relaxed, weight on both feet; small breathing movement; one frame with a blink.
  > Prompt: "Pixel-art sprite strip of Mashrafe Mortaza (same person and outfit as the attached sprite), 4 frames in one row, each 224×336 px, feet at x 112 y 320, view SE, standing relaxed, weight on both feet; small breathing movement; one frame with a blink, holding nothing. Flat #14131B background, no text or logos."
- **`mashrafe-mortaza__idle_NE.png`** — 4 frames, view NE. Holding: nothing. Pose: standing relaxed, weight on both feet; small breathing movement; one frame with a blink.
  > Prompt: "Pixel-art sprite strip of Mashrafe Mortaza (same person and outfit as the attached sprite), 4 frames in one row, each 224×336 px, feet at x 112 y 320, view NE, standing relaxed, weight on both feet; small breathing movement; one frame with a blink, holding nothing. Flat #14131B background, no text or logos."

## Mesut Özil — `mesut-ozil`

Outfit as in the sprite (football-kit-long). Default held item: nothing.

- **`mesut-ozil__walk_SE.png`** — 6 frames, view SE. Holding: nothing. Pose: a full walk cycle: contact, down, passing, up for each leg, arms swinging opposite to the legs.
  > Prompt: "Pixel-art sprite strip of Mesut Özil (same person and outfit as the attached sprite), 6 frames in one row, each 224×336 px, feet at x 112 y 320, view SE, a full walk cycle: contact, down, passing, up for each leg, arms swinging opposite to the legs, holding nothing. Flat #14131B background, no text or logos."
- **`mesut-ozil__walk_NE.png`** — 6 frames, view NE. Holding: nothing. Pose: a full walk cycle: contact, down, passing, up for each leg, arms swinging opposite to the legs.
  > Prompt: "Pixel-art sprite strip of Mesut Özil (same person and outfit as the attached sprite), 6 frames in one row, each 224×336 px, feet at x 112 y 320, view NE, a full walk cycle: contact, down, passing, up for each leg, arms swinging opposite to the legs, holding nothing. Flat #14131B background, no text or logos."
- **`mesut-ozil__kick_SE.png`** — 4 frames, view SE. Holding: nothing. Pose: football strike: wind-up, plant foot, strike through the ball, follow-through.
  > Prompt: "Pixel-art sprite strip of Mesut Özil (same person and outfit as the attached sprite), 4 frames in one row, each 224×336 px, feet at x 112 y 320, view SE, football strike: wind-up, plant foot, strike through the ball, follow-through, holding nothing. Flat #14131B background, no text or logos."
- **`mesut-ozil__kick_NE.png`** — 4 frames, view NE. Holding: nothing. Pose: football strike: wind-up, plant foot, strike through the ball, follow-through.
  > Prompt: "Pixel-art sprite strip of Mesut Özil (same person and outfit as the attached sprite), 4 frames in one row, each 224×336 px, feet at x 112 y 320, view NE, football strike: wind-up, plant foot, strike through the ball, follow-through, holding nothing. Flat #14131B background, no text or logos."
- **`mesut-ozil__idle_SE.png`** — 4 frames, view SE. Holding: nothing. Pose: standing relaxed, weight on both feet; small breathing movement; one frame with a blink.
  > Prompt: "Pixel-art sprite strip of Mesut Özil (same person and outfit as the attached sprite), 4 frames in one row, each 224×336 px, feet at x 112 y 320, view SE, standing relaxed, weight on both feet; small breathing movement; one frame with a blink, holding nothing. Flat #14131B background, no text or logos."
- **`mesut-ozil__idle_NE.png`** — 4 frames, view NE. Holding: nothing. Pose: standing relaxed, weight on both feet; small breathing movement; one frame with a blink.
  > Prompt: "Pixel-art sprite strip of Mesut Özil (same person and outfit as the attached sprite), 4 frames in one row, each 224×336 px, feet at x 112 y 320, view NE, standing relaxed, weight on both feet; small breathing movement; one frame with a blink, holding nothing. Flat #14131B background, no text or logos."
- **`mesut-ozil__cheer_SE.png`** — 4 frames, view SE. Holding: nothing. Pose: both arms raised high and wide in joy, mouth open in a happy shout.
  > Prompt: "Pixel-art sprite strip of Mesut Özil (same person and outfit as the attached sprite), 4 frames in one row, each 224×336 px, feet at x 112 y 320, view SE, both arms raised high and wide in joy, mouth open in a happy shout, holding nothing. Flat #14131B background, no text or logos."
- **`mesut-ozil__cheer_NE.png`** — 4 frames, view NE. Holding: nothing. Pose: both arms raised high and wide in joy, mouth open in a happy shout.
  > Prompt: "Pixel-art sprite strip of Mesut Özil (same person and outfit as the attached sprite), 4 frames in one row, each 224×336 px, feet at x 112 y 320, view NE, both arms raised high and wide in joy, mouth open in a happy shout, holding nothing. Flat #14131B background, no text or logos."

## Mohamed Salah — `mohamed-salah`

Outfit as in the sprite (football-kit-sleeved). Default held item: nothing.

- **`mohamed-salah__walk_SE.png`** — 6 frames, view SE. Holding: nothing. Pose: a full walk cycle: contact, down, passing, up for each leg, arms swinging opposite to the legs.
  > Prompt: "Pixel-art sprite strip of Mohamed Salah (same person and outfit as the attached sprite), 6 frames in one row, each 224×336 px, feet at x 112 y 320, view SE, a full walk cycle: contact, down, passing, up for each leg, arms swinging opposite to the legs, holding nothing. Flat #14131B background, no text or logos."
- **`mohamed-salah__walk_NE.png`** — 6 frames, view NE. Holding: nothing. Pose: a full walk cycle: contact, down, passing, up for each leg, arms swinging opposite to the legs.
  > Prompt: "Pixel-art sprite strip of Mohamed Salah (same person and outfit as the attached sprite), 6 frames in one row, each 224×336 px, feet at x 112 y 320, view NE, a full walk cycle: contact, down, passing, up for each leg, arms swinging opposite to the legs, holding nothing. Flat #14131B background, no text or logos."
- **`mohamed-salah__kick_SE.png`** — 4 frames, view SE. Holding: nothing. Pose: football strike: wind-up, plant foot, strike through the ball, follow-through.
  > Prompt: "Pixel-art sprite strip of Mohamed Salah (same person and outfit as the attached sprite), 4 frames in one row, each 224×336 px, feet at x 112 y 320, view SE, football strike: wind-up, plant foot, strike through the ball, follow-through, holding nothing. Flat #14131B background, no text or logos."
- **`mohamed-salah__kick_NE.png`** — 4 frames, view NE. Holding: nothing. Pose: football strike: wind-up, plant foot, strike through the ball, follow-through.
  > Prompt: "Pixel-art sprite strip of Mohamed Salah (same person and outfit as the attached sprite), 4 frames in one row, each 224×336 px, feet at x 112 y 320, view NE, football strike: wind-up, plant foot, strike through the ball, follow-through, holding nothing. Flat #14131B background, no text or logos."
- **`mohamed-salah__sujood_SE.png`** — 2 frames, view SE. Holding: nothing (hands are free). Pose: prostration (sujood) on the ground: forehead, nose, palms, knees and toes on the floor, held still; frame 2 shows a tiny breath.
  > Prompt: "Pixel-art sprite strip of Mohamed Salah (same person and outfit as the attached sprite), 2 frames in one row, each 224×336 px, feet at x 112 y 320, view SE, prostration (sujood) on the ground: forehead, nose, palms, knees and toes on the floor, held still; frame 2 shows a tiny breath, holding nothing (hands are free). Flat #14131B background, no text or logos."
- **`mohamed-salah__sujood_NE.png`** — 2 frames, view NE. Holding: nothing (hands are free). Pose: prostration (sujood) on the ground: forehead, nose, palms, knees and toes on the floor, held still; frame 2 shows a tiny breath.
  > Prompt: "Pixel-art sprite strip of Mohamed Salah (same person and outfit as the attached sprite), 2 frames in one row, each 224×336 px, feet at x 112 y 320, view NE, prostration (sujood) on the ground: forehead, nose, palms, knees and toes on the floor, held still; frame 2 shows a tiny breath, holding nothing (hands are free). Flat #14131B background, no text or logos."
- **`mohamed-salah__cheer_SE.png`** — 4 frames, view SE. Holding: nothing. Pose: both arms raised high and wide in joy, mouth open in a happy shout.
  > Prompt: "Pixel-art sprite strip of Mohamed Salah (same person and outfit as the attached sprite), 4 frames in one row, each 224×336 px, feet at x 112 y 320, view SE, both arms raised high and wide in joy, mouth open in a happy shout, holding nothing. Flat #14131B background, no text or logos."
- **`mohamed-salah__cheer_NE.png`** — 4 frames, view NE. Holding: nothing. Pose: both arms raised high and wide in joy, mouth open in a happy shout.
  > Prompt: "Pixel-art sprite strip of Mohamed Salah (same person and outfit as the attached sprite), 4 frames in one row, each 224×336 px, feet at x 112 y 320, view NE, both arms raised high and wide in joy, mouth open in a happy shout, holding nothing. Flat #14131B background, no text or logos."

## Mufti Ismail Menk — `mufti-ismail-menk`

Outfit as in the sprite (jubba, ghutra). Default held item: nothing.

- **`mufti-ismail-menk__talk_SE.png`** — 4 frames, view SE. Holding: nothing. Pose: standing, speaking warmly, one hand gesturing at chest height; mouth alternates open and closed.
  > Prompt: "Pixel-art sprite strip of Mufti Ismail Menk (same person and outfit as the attached sprite), 4 frames in one row, each 224×336 px, feet at x 112 y 320, view SE, standing, speaking warmly, one hand gesturing at chest height; mouth alternates open and closed, holding nothing. Flat #14131B background, no text or logos."
- **`mufti-ismail-menk__talk_NE.png`** — 4 frames, view NE. Holding: nothing. Pose: standing, speaking warmly, one hand gesturing at chest height; mouth alternates open and closed.
  > Prompt: "Pixel-art sprite strip of Mufti Ismail Menk (same person and outfit as the attached sprite), 4 frames in one row, each 224×336 px, feet at x 112 y 320, view NE, standing, speaking warmly, one hand gesturing at chest height; mouth alternates open and closed, holding nothing. Flat #14131B background, no text or logos."
- **`mufti-ismail-menk__idle_SE.png`** — 4 frames, view SE. Holding: nothing. Pose: standing relaxed, weight on both feet; small breathing movement; one frame with a blink.
  > Prompt: "Pixel-art sprite strip of Mufti Ismail Menk (same person and outfit as the attached sprite), 4 frames in one row, each 224×336 px, feet at x 112 y 320, view SE, standing relaxed, weight on both feet; small breathing movement; one frame with a blink, holding nothing. Flat #14131B background, no text or logos."
- **`mufti-ismail-menk__idle_NE.png`** — 4 frames, view NE. Holding: nothing. Pose: standing relaxed, weight on both feet; small breathing movement; one frame with a blink.
  > Prompt: "Pixel-art sprite strip of Mufti Ismail Menk (same person and outfit as the attached sprite), 4 frames in one row, each 224×336 px, feet at x 112 y 320, view NE, standing relaxed, weight on both feet; small breathing movement; one frame with a blink, holding nothing. Flat #14131B background, no text or logos."

## Muhammad Ali — `muhammad-ali`

Outfit as in the sprite (boxing-kit). Default held item: boxing gloves.

- **`muhammad-ali__taunt_SE.png`** — 4 frames, view SE. Holding: boxing gloves. Pose: standing tall looking down, fists at the sides, open-mouthed shout (the famous standing pose).
  > Prompt: "Pixel-art sprite strip of Muhammad Ali (same person and outfit as the attached sprite), 4 frames in one row, each 224×336 px, feet at x 112 y 320, view SE, standing tall looking down, fists at the sides, open-mouthed shout (the famous standing pose), holding boxing gloves. Flat #14131B background, no text or logos."
- **`muhammad-ali__taunt_NE.png`** — 4 frames, view NE. Holding: boxing gloves. Pose: standing tall looking down, fists at the sides, open-mouthed shout (the famous standing pose).
  > Prompt: "Pixel-art sprite strip of Muhammad Ali (same person and outfit as the attached sprite), 4 frames in one row, each 224×336 px, feet at x 112 y 320, view NE, standing tall looking down, fists at the sides, open-mouthed shout (the famous standing pose), holding boxing gloves. Flat #14131B background, no text or logos."
- **`muhammad-ali__idle_SE.png`** — 4 frames, view SE. Holding: boxing gloves. Pose: standing relaxed, weight on both feet; small breathing movement; one frame with a blink.
  > Prompt: "Pixel-art sprite strip of Muhammad Ali (same person and outfit as the attached sprite), 4 frames in one row, each 224×336 px, feet at x 112 y 320, view SE, standing relaxed, weight on both feet; small breathing movement; one frame with a blink, holding boxing gloves. Flat #14131B background, no text or logos."
- **`muhammad-ali__idle_NE.png`** — 4 frames, view NE. Holding: boxing gloves. Pose: standing relaxed, weight on both feet; small breathing movement; one frame with a blink.
  > Prompt: "Pixel-art sprite strip of Muhammad Ali (same person and outfit as the attached sprite), 4 frames in one row, each 224×336 px, feet at x 112 y 320, view NE, standing relaxed, weight on both feet; small breathing movement; one frame with a blink, holding boxing gloves. Flat #14131B background, no text or logos."

## Muhammad Yunus — `muhammad-yunus`

Outfit as in the sprite (shirt-trousers). Default held item: a tablet computer.

- **`muhammad-yunus__talk_SE.png`** — 4 frames, view SE. Holding: a tablet computer. Pose: standing, speaking warmly, one hand gesturing at chest height; mouth alternates open and closed.
  > Prompt: "Pixel-art sprite strip of Muhammad Yunus (same person and outfit as the attached sprite), 4 frames in one row, each 224×336 px, feet at x 112 y 320, view SE, standing, speaking warmly, one hand gesturing at chest height; mouth alternates open and closed, holding a tablet computer. Flat #14131B background, no text or logos."
- **`muhammad-yunus__talk_NE.png`** — 4 frames, view NE. Holding: a tablet computer. Pose: standing, speaking warmly, one hand gesturing at chest height; mouth alternates open and closed.
  > Prompt: "Pixel-art sprite strip of Muhammad Yunus (same person and outfit as the attached sprite), 4 frames in one row, each 224×336 px, feet at x 112 y 320, view NE, standing, speaking warmly, one hand gesturing at chest height; mouth alternates open and closed, holding a tablet computer. Flat #14131B background, no text or logos."
- **`muhammad-yunus__idle_SE.png`** — 4 frames, view SE. Holding: a tablet computer. Pose: standing relaxed, weight on both feet; small breathing movement; one frame with a blink.
  > Prompt: "Pixel-art sprite strip of Muhammad Yunus (same person and outfit as the attached sprite), 4 frames in one row, each 224×336 px, feet at x 112 y 320, view SE, standing relaxed, weight on both feet; small breathing movement; one frame with a blink, holding a tablet computer. Flat #14131B background, no text or logos."
- **`muhammad-yunus__idle_NE.png`** — 4 frames, view NE. Holding: a tablet computer. Pose: standing relaxed, weight on both feet; small breathing movement; one frame with a blink.
  > Prompt: "Pixel-art sprite strip of Muhammad Yunus (same person and outfit as the attached sprite), 4 frames in one row, each 224×336 px, feet at x 112 y 320, view NE, standing relaxed, weight on both feet; small breathing movement; one frame with a blink, holding a tablet computer. Flat #14131B background, no text or logos."

## N’Golo Kanté — `ngolo-kante`

Outfit as in the sprite (football-kit). Default held item: nothing.

- **`ngolo-kante__idle_SE.png`** — 4 frames, view SE. Holding: nothing. Pose: standing relaxed, weight on both feet; small breathing movement; one frame with a blink.
  > Prompt: "Pixel-art sprite strip of N’Golo Kanté (same person and outfit as the attached sprite), 4 frames in one row, each 224×336 px, feet at x 112 y 320, view SE, standing relaxed, weight on both feet; small breathing movement; one frame with a blink, holding nothing. Flat #14131B background, no text or logos."
- **`ngolo-kante__idle_NE.png`** — 4 frames, view NE. Holding: nothing. Pose: standing relaxed, weight on both feet; small breathing movement; one frame with a blink.
  > Prompt: "Pixel-art sprite strip of N’Golo Kanté (same person and outfit as the attached sprite), 4 frames in one row, each 224×336 px, feet at x 112 y 320, view NE, standing relaxed, weight on both feet; small breathing movement; one frame with a blink, holding nothing. Flat #14131B background, no text or logos."
- **`ngolo-kante__carry@trophy_SE.png`** — 6 frames, view SE. Holding: a generic golden cup with two handles (not the World Cup design, no text). Pose: walking while carrying the held item with both hands in front.
  > Prompt: "Pixel-art sprite strip of N’Golo Kanté (same person and outfit as the attached sprite), 6 frames in one row, each 224×336 px, feet at x 112 y 320, view SE, walking while carrying the held item with both hands in front, holding a generic golden cup with two handles (not the World Cup design, no text). Flat #14131B background, no text or logos."
- **`ngolo-kante__carry@trophy_NE.png`** — 6 frames, view NE. Holding: a generic golden cup with two handles (not the World Cup design, no text). Pose: walking while carrying the held item with both hands in front.
  > Prompt: "Pixel-art sprite strip of N’Golo Kanté (same person and outfit as the attached sprite), 6 frames in one row, each 224×336 px, feet at x 112 y 320, view NE, walking while carrying the held item with both hands in front, holding a generic golden cup with two handles (not the World Cup design, no text). Flat #14131B background, no text or logos."
- **`ngolo-kante__cheer@trophy_SE.png`** — 4 frames, view SE. Holding: a generic golden cup with two handles (not the World Cup design, no text). Pose: both arms raised high and wide in joy, mouth open in a happy shout.
  > Prompt: "Pixel-art sprite strip of N’Golo Kanté (same person and outfit as the attached sprite), 4 frames in one row, each 224×336 px, feet at x 112 y 320, view SE, both arms raised high and wide in joy, mouth open in a happy shout, holding a generic golden cup with two handles (not the World Cup design, no text). Flat #14131B background, no text or logos."
- **`ngolo-kante__cheer@trophy_NE.png`** — 4 frames, view NE. Holding: a generic golden cup with two handles (not the World Cup design, no text). Pose: both arms raised high and wide in joy, mouth open in a happy shout.
  > Prompt: "Pixel-art sprite strip of N’Golo Kanté (same person and outfit as the attached sprite), 4 frames in one row, each 224×336 px, feet at x 112 y 320, view NE, both arms raised high and wide in joy, mouth open in a happy shout, holding a generic golden cup with two handles (not the World Cup design, no text). Flat #14131B background, no text or logos."

## Omar Suleiman — `omar-suleiman`

Outfit as in the sprite (jubba). Default held item: nothing.

- **`omar-suleiman__talk_SE.png`** — 4 frames, view SE. Holding: nothing. Pose: standing, speaking warmly, one hand gesturing at chest height; mouth alternates open and closed.
  > Prompt: "Pixel-art sprite strip of Omar Suleiman (same person and outfit as the attached sprite), 4 frames in one row, each 224×336 px, feet at x 112 y 320, view SE, standing, speaking warmly, one hand gesturing at chest height; mouth alternates open and closed, holding nothing. Flat #14131B background, no text or logos."
- **`omar-suleiman__talk_NE.png`** — 4 frames, view NE. Holding: nothing. Pose: standing, speaking warmly, one hand gesturing at chest height; mouth alternates open and closed.
  > Prompt: "Pixel-art sprite strip of Omar Suleiman (same person and outfit as the attached sprite), 4 frames in one row, each 224×336 px, feet at x 112 y 320, view NE, standing, speaking warmly, one hand gesturing at chest height; mouth alternates open and closed, holding nothing. Flat #14131B background, no text or logos."
- **`omar-suleiman__wave_SE.png`** — 4 frames, view SE. Holding: nothing. Pose: standing, right hand raised above the shoulder waving side to side, friendly smile.
  > Prompt: "Pixel-art sprite strip of Omar Suleiman (same person and outfit as the attached sprite), 4 frames in one row, each 224×336 px, feet at x 112 y 320, view SE, standing, right hand raised above the shoulder waving side to side, friendly smile, holding nothing. Flat #14131B background, no text or logos."
- **`omar-suleiman__wave_NE.png`** — 4 frames, view NE. Holding: nothing. Pose: standing, right hand raised above the shoulder waving side to side, friendly smile.
  > Prompt: "Pixel-art sprite strip of Omar Suleiman (same person and outfit as the attached sprite), 4 frames in one row, each 224×336 px, feet at x 112 y 320, view NE, standing, right hand raised above the shoulder waving side to side, friendly smile, holding nothing. Flat #14131B background, no text or logos."

## Sadio Mané — `sadio-mane`

Outfit as in the sprite (football-kit). Default held item: nothing.

- **`sadio-mane__walk_SE.png`** — 6 frames, view SE. Holding: nothing. Pose: a full walk cycle: contact, down, passing, up for each leg, arms swinging opposite to the legs.
  > Prompt: "Pixel-art sprite strip of Sadio Mané (same person and outfit as the attached sprite), 6 frames in one row, each 224×336 px, feet at x 112 y 320, view SE, a full walk cycle: contact, down, passing, up for each leg, arms swinging opposite to the legs, holding nothing. Flat #14131B background, no text or logos."
- **`sadio-mane__walk_NE.png`** — 6 frames, view NE. Holding: nothing. Pose: a full walk cycle: contact, down, passing, up for each leg, arms swinging opposite to the legs.
  > Prompt: "Pixel-art sprite strip of Sadio Mané (same person and outfit as the attached sprite), 6 frames in one row, each 224×336 px, feet at x 112 y 320, view NE, a full walk cycle: contact, down, passing, up for each leg, arms swinging opposite to the legs, holding nothing. Flat #14131B background, no text or logos."
- **`sadio-mane__kick_SE.png`** — 4 frames, view SE. Holding: nothing. Pose: football strike: wind-up, plant foot, strike through the ball, follow-through.
  > Prompt: "Pixel-art sprite strip of Sadio Mané (same person and outfit as the attached sprite), 4 frames in one row, each 224×336 px, feet at x 112 y 320, view SE, football strike: wind-up, plant foot, strike through the ball, follow-through, holding nothing. Flat #14131B background, no text or logos."
- **`sadio-mane__kick_NE.png`** — 4 frames, view NE. Holding: nothing. Pose: football strike: wind-up, plant foot, strike through the ball, follow-through.
  > Prompt: "Pixel-art sprite strip of Sadio Mané (same person and outfit as the attached sprite), 4 frames in one row, each 224×336 px, feet at x 112 y 320, view NE, football strike: wind-up, plant foot, strike through the ball, follow-through, holding nothing. Flat #14131B background, no text or logos."
- **`sadio-mane__sujood_SE.png`** — 2 frames, view SE. Holding: nothing (hands are free). Pose: prostration (sujood) on the ground: forehead, nose, palms, knees and toes on the floor, held still; frame 2 shows a tiny breath.
  > Prompt: "Pixel-art sprite strip of Sadio Mané (same person and outfit as the attached sprite), 2 frames in one row, each 224×336 px, feet at x 112 y 320, view SE, prostration (sujood) on the ground: forehead, nose, palms, knees and toes on the floor, held still; frame 2 shows a tiny breath, holding nothing (hands are free). Flat #14131B background, no text or logos."
- **`sadio-mane__sujood_NE.png`** — 2 frames, view NE. Holding: nothing (hands are free). Pose: prostration (sujood) on the ground: forehead, nose, palms, knees and toes on the floor, held still; frame 2 shows a tiny breath.
  > Prompt: "Pixel-art sprite strip of Sadio Mané (same person and outfit as the attached sprite), 2 frames in one row, each 224×336 px, feet at x 112 y 320, view NE, prostration (sujood) on the ground: forehead, nose, palms, knees and toes on the floor, held still; frame 2 shows a tiny breath, holding nothing (hands are free). Flat #14131B background, no text or logos."
- **`sadio-mane__hand-on-heart_SE.png`** — 4 frames, view SE. Holding: nothing. Pose: right hand placed on the heart, slight bow of the head, grateful smile.
  > Prompt: "Pixel-art sprite strip of Sadio Mané (same person and outfit as the attached sprite), 4 frames in one row, each 224×336 px, feet at x 112 y 320, view SE, right hand placed on the heart, slight bow of the head, grateful smile, holding nothing. Flat #14131B background, no text or logos."
- **`sadio-mane__hand-on-heart_NE.png`** — 4 frames, view NE. Holding: nothing. Pose: right hand placed on the heart, slight bow of the head, grateful smile.
  > Prompt: "Pixel-art sprite strip of Sadio Mané (same person and outfit as the attached sprite), 4 frames in one row, each 224×336 px, feet at x 112 y 320, view NE, right hand placed on the heart, slight bow of the head, grateful smile, holding nothing. Flat #14131B background, no text or logos."

## Sofiane Boufal — `sofiane-boufal`

Outfit as in the sprite (football-kit). Default held item: nothing.

- **`sofiane-boufal__cheer_SE.png`** — 4 frames, view SE. Holding: nothing. Pose: both arms raised high and wide in joy, mouth open in a happy shout.
  > Prompt: "Pixel-art sprite strip of Sofiane Boufal (same person and outfit as the attached sprite), 4 frames in one row, each 224×336 px, feet at x 112 y 320, view SE, both arms raised high and wide in joy, mouth open in a happy shout, holding nothing. Flat #14131B background, no text or logos."
- **`sofiane-boufal__cheer_NE.png`** — 4 frames, view NE. Holding: nothing. Pose: both arms raised high and wide in joy, mouth open in a happy shout.
  > Prompt: "Pixel-art sprite strip of Sofiane Boufal (same person and outfit as the attached sprite), 4 frames in one row, each 224×336 px, feet at x 112 y 320, view NE, both arms raised high and wide in joy, mouth open in a happy shout, holding nothing. Flat #14131B background, no text or logos."
- **`sofiane-boufal__walk_SE.png`** — 6 frames, view SE. Holding: nothing. Pose: a full walk cycle: contact, down, passing, up for each leg, arms swinging opposite to the legs.
  > Prompt: "Pixel-art sprite strip of Sofiane Boufal (same person and outfit as the attached sprite), 6 frames in one row, each 224×336 px, feet at x 112 y 320, view SE, a full walk cycle: contact, down, passing, up for each leg, arms swinging opposite to the legs, holding nothing. Flat #14131B background, no text or logos."
- **`sofiane-boufal__walk_NE.png`** — 6 frames, view NE. Holding: nothing. Pose: a full walk cycle: contact, down, passing, up for each leg, arms swinging opposite to the legs.
  > Prompt: "Pixel-art sprite strip of Sofiane Boufal (same person and outfit as the attached sprite), 6 frames in one row, each 224×336 px, feet at x 112 y 320, view NE, a full walk cycle: contact, down, passing, up for each leg, arms swinging opposite to the legs, holding nothing. Flat #14131B background, no text or logos."

## Tamim Iqbal — `tamim-iqbal`

Outfit as in the sprite (shirt-trousers). Default held item: a cricket bat.

- **`tamim-iqbal__idle_SE.png`** — 4 frames, view SE. Holding: a cricket bat. Pose: standing relaxed, weight on both feet; small breathing movement; one frame with a blink.
  > Prompt: "Pixel-art sprite strip of Tamim Iqbal (same person and outfit as the attached sprite), 4 frames in one row, each 224×336 px, feet at x 112 y 320, view SE, standing relaxed, weight on both feet; small breathing movement; one frame with a blink, holding a cricket bat. Flat #14131B background, no text or logos."
- **`tamim-iqbal__idle_NE.png`** — 4 frames, view NE. Holding: a cricket bat. Pose: standing relaxed, weight on both feet; small breathing movement; one frame with a blink.
  > Prompt: "Pixel-art sprite strip of Tamim Iqbal (same person and outfit as the attached sprite), 4 frames in one row, each 224×336 px, feet at x 112 y 320, view NE, standing relaxed, weight on both feet; small breathing movement; one frame with a blink, holding a cricket bat. Flat #14131B background, no text or logos."
- **`tamim-iqbal__cheer_SE.png`** — 4 frames, view SE. Holding: a cricket bat. Pose: both arms raised high and wide in joy, mouth open in a happy shout.
  > Prompt: "Pixel-art sprite strip of Tamim Iqbal (same person and outfit as the attached sprite), 4 frames in one row, each 224×336 px, feet at x 112 y 320, view SE, both arms raised high and wide in joy, mouth open in a happy shout, holding a cricket bat. Flat #14131B background, no text or logos."
- **`tamim-iqbal__cheer_NE.png`** — 4 frames, view NE. Holding: a cricket bat. Pose: both arms raised high and wide in joy, mouth open in a happy shout.
  > Prompt: "Pixel-art sprite strip of Tamim Iqbal (same person and outfit as the attached sprite), 4 frames in one row, each 224×336 px, feet at x 112 y 320, view NE, both arms raised high and wide in joy, mouth open in a happy shout, holding a cricket bat. Flat #14131B background, no text or logos."

## Usman Khawaja — `usman-khawaja`

Outfit as in the sprite (shirt-trousers, cap). Default held item: nothing.

- **`usman-khawaja__idle_SE.png`** — 4 frames, view SE. Holding: nothing. Pose: standing relaxed, weight on both feet; small breathing movement; one frame with a blink.
  > Prompt: "Pixel-art sprite strip of Usman Khawaja (same person and outfit as the attached sprite), 4 frames in one row, each 224×336 px, feet at x 112 y 320, view SE, standing relaxed, weight on both feet; small breathing movement; one frame with a blink, holding nothing. Flat #14131B background, no text or logos."
- **`usman-khawaja__idle_NE.png`** — 4 frames, view NE. Holding: nothing. Pose: standing relaxed, weight on both feet; small breathing movement; one frame with a blink.
  > Prompt: "Pixel-art sprite strip of Usman Khawaja (same person and outfit as the attached sprite), 4 frames in one row, each 224×336 px, feet at x 112 y 320, view NE, standing relaxed, weight on both feet; small breathing movement; one frame with a blink, holding nothing. Flat #14131B background, no text or logos."
- **`usman-khawaja__walk_SE.png`** — 6 frames, view SE. Holding: nothing. Pose: a full walk cycle: contact, down, passing, up for each leg, arms swinging opposite to the legs.
  > Prompt: "Pixel-art sprite strip of Usman Khawaja (same person and outfit as the attached sprite), 6 frames in one row, each 224×336 px, feet at x 112 y 320, view SE, a full walk cycle: contact, down, passing, up for each leg, arms swinging opposite to the legs, holding nothing. Flat #14131B background, no text or logos."
- **`usman-khawaja__walk_NE.png`** — 6 frames, view NE. Holding: nothing. Pose: a full walk cycle: contact, down, passing, up for each leg, arms swinging opposite to the legs.
  > Prompt: "Pixel-art sprite strip of Usman Khawaja (same person and outfit as the attached sprite), 6 frames in one row, each 224×336 px, feet at x 112 y 320, view NE, a full walk cycle: contact, down, passing, up for each leg, arms swinging opposite to the legs, holding nothing. Flat #14131B background, no text or logos."
- **`usman-khawaja__cheer_SE.png`** — 4 frames, view SE. Holding: nothing. Pose: both arms raised high and wide in joy, mouth open in a happy shout.
  > Prompt: "Pixel-art sprite strip of Usman Khawaja (same person and outfit as the attached sprite), 4 frames in one row, each 224×336 px, feet at x 112 y 320, view SE, both arms raised high and wide in joy, mouth open in a happy shout, holding nothing. Flat #14131B background, no text or logos."
- **`usman-khawaja__cheer_NE.png`** — 4 frames, view NE. Holding: nothing. Pose: both arms raised high and wide in joy, mouth open in a happy shout.
  > Prompt: "Pixel-art sprite strip of Usman Khawaja (same person and outfit as the attached sprite), 4 frames in one row, each 224×336 px, feet at x 112 y 320, view NE, both arms raised high and wide in joy, mouth open in a happy shout, holding nothing. Flat #14131B background, no text or logos."

## Yassine Bounou — `yassine-bounou`

Outfit as in the sprite (football-kit). Default held item: big goalkeeper gloves.

- **`yassine-bounou__idle_SE.png`** — 4 frames, view SE. Holding: big goalkeeper gloves. Pose: standing relaxed, weight on both feet; small breathing movement; one frame with a blink.
  > Prompt: "Pixel-art sprite strip of Yassine Bounou (same person and outfit as the attached sprite), 4 frames in one row, each 224×336 px, feet at x 112 y 320, view SE, standing relaxed, weight on both feet; small breathing movement; one frame with a blink, holding big goalkeeper gloves. Flat #14131B background, no text or logos."
- **`yassine-bounou__idle_NE.png`** — 4 frames, view NE. Holding: big goalkeeper gloves. Pose: standing relaxed, weight on both feet; small breathing movement; one frame with a blink.
  > Prompt: "Pixel-art sprite strip of Yassine Bounou (same person and outfit as the attached sprite), 4 frames in one row, each 224×336 px, feet at x 112 y 320, view NE, standing relaxed, weight on both feet; small breathing movement; one frame with a blink, holding big goalkeeper gloves. Flat #14131B background, no text or logos."
- **`yassine-bounou__dive_SE.png`** — 4 frames, view SE. Holding: big goalkeeper gloves. Pose: goalkeeper dive to the side: crouch, spring, full stretch in the air, landing.
  > Prompt: "Pixel-art sprite strip of Yassine Bounou (same person and outfit as the attached sprite), 4 frames in one row, each 224×336 px, feet at x 112 y 320, view SE, goalkeeper dive to the side: crouch, spring, full stretch in the air, landing, holding big goalkeeper gloves. Flat #14131B background, no text or logos."
- **`yassine-bounou__dive_NE.png`** — 4 frames, view NE. Holding: big goalkeeper gloves. Pose: goalkeeper dive to the side: crouch, spring, full stretch in the air, landing.
  > Prompt: "Pixel-art sprite strip of Yassine Bounou (same person and outfit as the attached sprite), 4 frames in one row, each 224×336 px, feet at x 112 y 320, view NE, goalkeeper dive to the side: crouch, spring, full stretch in the air, landing, holding big goalkeeper gloves. Flat #14131B background, no text or logos."
- **`yassine-bounou__cheer_SE.png`** — 4 frames, view SE. Holding: big goalkeeper gloves. Pose: both arms raised high and wide in joy, mouth open in a happy shout.
  > Prompt: "Pixel-art sprite strip of Yassine Bounou (same person and outfit as the attached sprite), 4 frames in one row, each 224×336 px, feet at x 112 y 320, view SE, both arms raised high and wide in joy, mouth open in a happy shout, holding big goalkeeper gloves. Flat #14131B background, no text or logos."
- **`yassine-bounou__cheer_NE.png`** — 4 frames, view NE. Holding: big goalkeeper gloves. Pose: both arms raised high and wide in joy, mouth open in a happy shout.
  > Prompt: "Pixel-art sprite strip of Yassine Bounou (same person and outfit as the attached sprite), 4 frames in one row, each 224×336 px, feet at x 112 y 320, view NE, both arms raised high and wide in joy, mouth open in a happy shout, holding big goalkeeper gloves. Flat #14131B background, no text or logos."

## Zabit Magomedsharipov — `zabit-magomedsharipov`

Outfit as in the sprite (fight-kit). Default held item: MMA gloves.

- **`zabit-magomedsharipov__kick_SE.png`** — 4 frames, view SE. Holding: MMA gloves. Pose: football strike: wind-up, plant foot, strike through the ball, follow-through.
  > Prompt: "Pixel-art sprite strip of Zabit Magomedsharipov (same person and outfit as the attached sprite), 4 frames in one row, each 224×336 px, feet at x 112 y 320, view SE, football strike: wind-up, plant foot, strike through the ball, follow-through, holding MMA gloves. Flat #14131B background, no text or logos."
- **`zabit-magomedsharipov__kick_NE.png`** — 4 frames, view NE. Holding: MMA gloves. Pose: football strike: wind-up, plant foot, strike through the ball, follow-through.
  > Prompt: "Pixel-art sprite strip of Zabit Magomedsharipov (same person and outfit as the attached sprite), 4 frames in one row, each 224×336 px, feet at x 112 y 320, view NE, football strike: wind-up, plant foot, strike through the ball, follow-through, holding MMA gloves. Flat #14131B background, no text or logos."
- **`zabit-magomedsharipov__guard_SE.png`** — 4 frames, view SE. Holding: MMA gloves. Pose: calm fighting stance after the bout is over, hands up loosely, no violence.
  > Prompt: "Pixel-art sprite strip of Zabit Magomedsharipov (same person and outfit as the attached sprite), 4 frames in one row, each 224×336 px, feet at x 112 y 320, view SE, calm fighting stance after the bout is over, hands up loosely, no violence, holding MMA gloves. Flat #14131B background, no text or logos."
- **`zabit-magomedsharipov__guard_NE.png`** — 4 frames, view NE. Holding: MMA gloves. Pose: calm fighting stance after the bout is over, hands up loosely, no violence.
  > Prompt: "Pixel-art sprite strip of Zabit Magomedsharipov (same person and outfit as the attached sprite), 4 frames in one row, each 224×336 px, feet at x 112 y 320, view NE, calm fighting stance after the bout is over, hands up loosely, no violence, holding MMA gloves. Flat #14131B background, no text or logos."
- **`zabit-magomedsharipov__idle_SE.png`** — 4 frames, view SE. Holding: MMA gloves. Pose: standing relaxed, weight on both feet; small breathing movement; one frame with a blink.
  > Prompt: "Pixel-art sprite strip of Zabit Magomedsharipov (same person and outfit as the attached sprite), 4 frames in one row, each 224×336 px, feet at x 112 y 320, view SE, standing relaxed, weight on both feet; small breathing movement; one frame with a blink, holding MMA gloves. Flat #14131B background, no text or logos."
- **`zabit-magomedsharipov__idle_NE.png`** — 4 frames, view NE. Holding: MMA gloves. Pose: standing relaxed, weight on both feet; small breathing movement; one frame with a blink.
  > Prompt: "Pixel-art sprite strip of Zabit Magomedsharipov (same person and outfit as the attached sprite), 4 frames in one row, each 224×336 px, feet at x 112 y 320, view NE, standing relaxed, weight on both feet; small breathing movement; one frame with a blink, holding MMA gloves. Flat #14131B background, no text or logos."

## Zaha Hadid — `zaha-hadid`

Outfit as in the sprite (long-dress). Default held item: a tablet computer.

- **`zaha-hadid__talk_SE.png`** — 4 frames, view SE. Holding: a tablet computer. Pose: standing, speaking warmly, one hand gesturing at chest height; mouth alternates open and closed.
  > Prompt: "Pixel-art sprite strip of Zaha Hadid (same person and outfit as the attached sprite), 4 frames in one row, each 224×336 px, feet at x 112 y 320, view SE, standing, speaking warmly, one hand gesturing at chest height; mouth alternates open and closed, holding a tablet computer. Flat #14131B background, no text or logos."
- **`zaha-hadid__talk_NE.png`** — 4 frames, view NE. Holding: a tablet computer. Pose: standing, speaking warmly, one hand gesturing at chest height; mouth alternates open and closed.
  > Prompt: "Pixel-art sprite strip of Zaha Hadid (same person and outfit as the attached sprite), 4 frames in one row, each 224×336 px, feet at x 112 y 320, view NE, standing, speaking warmly, one hand gesturing at chest height; mouth alternates open and closed, holding a tablet computer. Flat #14131B background, no text or logos."
- **`zaha-hadid__idle_SE.png`** — 4 frames, view SE. Holding: a tablet computer. Pose: standing relaxed, weight on both feet; small breathing movement; one frame with a blink.
  > Prompt: "Pixel-art sprite strip of Zaha Hadid (same person and outfit as the attached sprite), 4 frames in one row, each 224×336 px, feet at x 112 y 320, view SE, standing relaxed, weight on both feet; small breathing movement; one frame with a blink, holding a tablet computer. Flat #14131B background, no text or logos."
- **`zaha-hadid__idle_NE.png`** — 4 frames, view NE. Holding: a tablet computer. Pose: standing relaxed, weight on both feet; small breathing movement; one frame with a blink.
  > Prompt: "Pixel-art sprite strip of Zaha Hadid (same person and outfit as the attached sprite), 4 frames in one row, each 224×336 px, feet at x 112 y 320, view NE, standing relaxed, weight on both feet; small breathing movement; one frame with a blink, holding a tablet computer. Flat #14131B background, no text or logos."

## Zohran Mamdani — `zohran-mamdani`

Outfit as in the sprite (suit). Default held item: a kick scooter.

- **`zohran-mamdani__ride_SE.png`** — 4 frames, view SE. Holding: a kick scooter. Pose: riding a kick scooter: one foot on the deck, the other pushing, hands on the handlebar.
  > Prompt: "Pixel-art sprite strip of Zohran Mamdani (same person and outfit as the attached sprite), 4 frames in one row, each 224×336 px, feet at x 112 y 320, view SE, riding a kick scooter: one foot on the deck, the other pushing, hands on the handlebar, holding a kick scooter. Flat #14131B background, no text or logos."
- **`zohran-mamdani__ride_NE.png`** — 4 frames, view NE. Holding: a kick scooter. Pose: riding a kick scooter: one foot on the deck, the other pushing, hands on the handlebar.
  > Prompt: "Pixel-art sprite strip of Zohran Mamdani (same person and outfit as the attached sprite), 4 frames in one row, each 224×336 px, feet at x 112 y 320, view NE, riding a kick scooter: one foot on the deck, the other pushing, hands on the handlebar, holding a kick scooter. Flat #14131B background, no text or logos."
- **`zohran-mamdani__wave_SE.png`** — 4 frames, view SE. Holding: a kick scooter. Pose: standing, right hand raised above the shoulder waving side to side, friendly smile.
  > Prompt: "Pixel-art sprite strip of Zohran Mamdani (same person and outfit as the attached sprite), 4 frames in one row, each 224×336 px, feet at x 112 y 320, view SE, standing, right hand raised above the shoulder waving side to side, friendly smile, holding a kick scooter. Flat #14131B background, no text or logos."
- **`zohran-mamdani__wave_NE.png`** — 4 frames, view NE. Holding: a kick scooter. Pose: standing, right hand raised above the shoulder waving side to side, friendly smile.
  > Prompt: "Pixel-art sprite strip of Zohran Mamdani (same person and outfit as the attached sprite), 4 frames in one row, each 224×336 px, feet at x 112 y 320, view NE, standing, right hand raised above the shoulder waving side to side, friendly smile, holding a kick scooter. Flat #14131B background, no text or logos."
