# Prompt: Yasser al-Dosari leading congregational prayer

A ready-to-paste build prompt for a coding agent. **[AGENTS.md](../AGENTS.md) wins** wherever this prompt and the repo rules differ. Nothing here approves a card.

```text
You're working on my GitHub repo Fazle-Rabbi-Tusher/Dar-al-Salam, a Floor796-style animated isometric website showing a peaceful Islamic world. Add a new scene: Sheikh Yasser al-Dosari leading a congregational prayer in the Peace Quarter mosque, men's rows behind him and women's rows behind a partition. Accuracy to the Sunnah matters more than anything else in this scene.

First read in full: AGENTS.md (rules, these always win), DECISIONS.md (including the living-person policy), docs/scene-bible.md, content/rules/never-depict.json, packages/shared/script.ts, schema.ts, rules.ts and clock.ts, content/ambient/mosque-garden.json, rooms/mosque-garden.tmj, and the cards omar-suleiman.json, ibn-sina.json and habib-umar-bin-hafiz.json.

1. THE CARD: content/characters/yasser-al-dosari.json
- Name: Yasser al-Dosari (en), ياسر الدوسري (ar), plus a bn spelling. Aliases: Yasir al-Dawsari, Yasser Al-Dossari. Run the never-depict validator on all of them first. "Hussain" in his full name is only a patronymic, which AGENTS.md says does not identify a prohibited person. If anything is flagged, stop and tell me.
- years "b. 1980"; place "Al-Kharj · Makkah"; district modern-quarter.
- Summary (well-established facts only): a Saudi imam and Qur'an reciter; Taraweeh and Tahajjud imam at Masjid al-Haram from 2015; appointed a permanent imam there on 12 October 2019; khatib from December 2022; reappointed March 2024. Link: https://en.wikipedia.org/wiki/Yasser_Al-Dosari
- Biography and story stay "PLACEHOLDER — to be researched". panelApproved: false. Add a panel note about consent and depiction for a living person.
- Deed line: "Pray your next salah in congregation."
- Look: white thobe, red-and-white shemagh, optional bisht, beard.

2. SETTING AND LAYOUT
The existing Peace Quarter mosque prayer hall, not Masjid al-Haram. No Kaaba, no Arabic text, no calligraphy. A plain mihrab niche and plain rugs are fine; ask me before adding anything else religious.

Everyone faces the qibla and is drawn from the back, all in the same NE or NW direction AGENTS.md allows, chosen to match the room. Front to back:
- The imam alone at the front, centred in the mihrab.
- Men's rows (2 rows of 6), filled from the middle behind the imam outwards, shoulder to shoulder and foot to foot, with no gaps.
  - Front row behind the imam: older, dignified men.
  - Mixed on purpose: a man in a suit next to a construction worker in hi-vis, a Bangladeshi man in a panjabi, a Malaysian in baju melayu, a Senegalese man in a boubou.
  - One Maliki man (Moroccan or Senegalese) prays with his arms at his sides; the rest fold their hands, right over left, on the chest or navel.
  - At the end of the last row: an old man seated on a stool, and the boy in the wheelchair from Omar Suleiman's ramp scene, both lined up with the row.
  - All men's clothing covers at least navel to knee, and is loose.
- Partition across the hall: a tall carved wooden lattice screen with geometric patterns only (no text, no symbols). Women can see the imam's movements through the lattice, but the men's side can't see in. Sunlight through it casts slowly moving geometric light on the floor, cued by frame number.
- Women's rows (2 rows of 5–6) behind the partition, with their own entrance. Loose, modest dress covering everything except face and hands. Mixed ages. At the end of a row, an elderly woman prays seated on a chair, lined up with the row. A mother prays while her toddler sits or crawls quietly beside her, and a girl next to her copies her movements about 4 frames late.
- The last row on each side is the only incomplete one.

3. THE PRAYER: one rak'ah compressed into the 240-frame loop (12 fps)
The congregation follows the imam 6 frames behind him and never moves at the same time as or ahead of him. Timings wrap around frame 240 using the loop's modulo.
- 0–12 the imam turns briefly to the congregation and gestures to straighten the rows; one man steps over to close a gap; then the imam turns back to the qibla
- 12–24 takbir: hands raised to the ears (or shoulders), palms facing the qibla
- 24–90 standing (qiyam), hands folded, except the Maliki man (this is when he recites)
- 90–118 ruku: back flat and level, head in line with the back, hands on the knees
- 118–134 standing straight again (i'tidal)
- 134–164 first sujood: forehead and nose, both palms, both knees and toes on the ground; men's elbows lifted away from the sides and forearms off the floor. In the men's last row, a toddler climbs onto his father's back, and the father stays in sujood until the child slides off; the imam's sujood is the same length. Show only the act, no story text. (Reuse the existing sujood strip only if it matches this posture from the back.)
- 164–180 sitting between the prostrations: sitting on the left foot, right foot upright with toes pointing to the qibla, hands on the thighs
- 180–210 second sujood, same posture
- 210–228 rising to stand
- 228–240 standing still, which lines up with the world's adhan pause
No looking around, no phones, no jokes during the prayer. Every person in the hall is praying.

Audio: an empty, clearly named hook for recitation audio, to be supplied later as real, licensed recitation. Never generate or synthesise Qur'an recitation or text.

4. OUTSIDE THE DOOR (runs in parallel)
- A neat shoe rack by the door, and separate men's and women's wudu areas with water dripping.
- The linked-scripts plan has Ibn Sina's healed patient walking to Omar Suleiman's mosque door at frames 216–228. He walks calmly, never rushing, slips off his shoes, steps in, and joins the end of the last men's row.
- One of the existing neighbourhood cats asleep in the sun on the steps.

5. RAMADAN MODE (existing build or URL flag only, no clock reads)
Night-time Taraweeh: lanterns lit, the hall full, two extra men's rows and one extra women's row, warm lamp light through the lattice instead of sunlight. After the prayer area, a volunteer at the door hands out dates and water for iftar.

6. NEW ART NEEDED
List exactly which animation strips are missing (row-straightening gesture, takbir, qiyam with folded hands, qiyam with arms at the sides, ruku, i'tidal, correct sujood, sitting between the prostrations, standing up, seated prayer on a chair or stool, wheelchair prayer, child climbing on a back, toddler sitting and crawling; all back-facing in the chosen direction) and which props (lattice partition, light pattern, rugs, shoe rack, wudu taps, stool, chair, lanterns, date tray). Don't draw final art. Use the repo's placeholder generator for drafts, marked DRAFT.

7. RULES (AGENTS.md, strictly)
- Never depict any prophet, Ahl al-Bayt, the Prophet's wives, Maryam or the Sahaba. Check every new ambient ID and name against never-depict.json.
- Modest dress; depiction full or back only.
- No text, letters, numbers, logos, Arabic, calligraphy or religious symbols in any art.
- Deterministic: no randomness, no wall-clock reads. Engine modules never import React.

8. WORKFLOW
- Branch from main; never commit to main.
- Show me your plan first: where the hall is on the map, the qibla direction, row layout, partition style and the outside area. Wait for my OK before writing code.
- Implement, run pnpm test, pnpm lint and pnpm typecheck, fix failures, and run prettier on changed files.
- Add tests: the congregation never moves at the same time as or ahead of the imam; the women's rows are fully behind the partition; the last row is the only incomplete row on each side; frame 240 matches frame 0; Ramadan mode adds rows only when the flag is on.
- Open one pull request, and finish with a list of art I need to supply.
```
