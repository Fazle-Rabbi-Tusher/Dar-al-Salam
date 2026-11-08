# Full-body character sprites

Each named character's look in the world comes from `art/sprites/<character id>.png`: a full-body **isometric** sprite, three-quarter view **facing down-left (SW)**, on a flat dark background (cut out automatically) or transparent. The build mirrors it for the right-facing views and the engine animates it (breathing, walking bob, hops, lunges) without redrawing it (DECISIONS.md, decision 47). Seated, kneeling, prayer and prop-in-hand moments still use the drawn character.

## Animation strips

`art/sprites/anim/<id>__<action>[@prop]_<SE|NE>.png`: one row of 224×336 frames per action and view, prepared from the owner's strips (DECISIONS.md, decision 48). The prompts are in `docs/animation-prompts.md`. Left-facing views are flipped by the engine. Seated, prostrating, riding and prop moments with a strip play the strip; anything without a strip falls back to the still sprite or the drawn character.

## Back views (optional, recommended)

Add `art/sprites/<character id>-back.png` to show the back when the camera sees someone walking away. Prompt (attach the front sprite):

> Same character, same art style, same outfit and proportions as the attached isometric pixel-art sprite, seen from **behind**, three-quarter view **facing up-left (away from the viewer)**, full body head to shoes, standing, arms relaxed. Same canvas size (1024 × 1536) and scale, feet at the same spot. Plain dark background #14131B. No text, logos, numbers or religious symbols.

## Still missing a sprite

Habib Umar bin Hafiz, Frédéric Kanouté, Hakim Ziyech, Yassine Bounou, Sofiane Boufal, Usman Khawaja and Hashim Amla use the drawn character until their sprite is added.

## Prompt (paste into an image generator with a photo of the person)

> Detailed isometric pixel-art full-body character sprite of **[NAME]**, matching the
> attached photo's face exactly. Standing, three-quarter view facing down-left, full body from
> head to shoes, arms relaxed at the sides. Wearing **[OUTFIT]**. Modest dress:
> arms covered to the elbow or more and knees covered. Realistic face (real
> eyes, brows, nose, mouth). Soft top-left lighting, clean pixel shading.
> Plain dark background. No text, logos, numbers, flags or religious symbols.
> Same style as the Mufti Menk sprite.

Rules: never for prophets, Ahl al-Bayt, the Prophet's wives, Maryam or the
Sahaba. Historical scholars have no photos; use a traditional portrait or
statue as the reference instead.

## Characters and file names

| File | Name | Outfit |
| --- | --- | --- |
| abdul-el-sayed.png | Abdul El-Sayed | navy open blazer, white shirt |
| ahmed-zewail.png | Ahmed Zewail | white lab coat, holding a tablet |
| al-biruni.png | al-Biruni | navy qaba robe, white turban, astrolabe |
| al-jazari.png | al-Jazari | red qaba robe, cream turban, rolled plans |
| al-khwarizmi.png | Al-Khwarizmi | indigo scholar's robe, white turban, book |
| al-zahrawi.png | al-Zahrawi | light blue jubba, cream turban, scroll |
| aziz-sancar.png | Aziz Sancar | white lab coat, glasses, flask |
| begum-rokeya.png | Begum Rokeya | white sari drawn over the head, book |
| fatima-al-fihri.png | Fatima al-Fihri | red abaya, navy khimar (face only) |
| fazlur-rahman-khan.png | Fazlur Rahman Khan | grey suit, glasses, blueprint roll |
| habib-umar-bin-hafiz.png | Habib Umar bin Hafiz | white jubba, white turban, green shawl |
| hakeem-olajuwon.png | Hakeem Olajuwon | red basketball kit with a T-shirt under it, knee-length shorts |
| hamza-yusuf.png | Hamza Yusuf | khaki jubba, white turban, glasses, book |
| ibn-al-haytham.png | Ibn al-Haytham | indigo qaba, white turban, book |
| ibn-battuta.png | Ibn Battuta | khaki traveller's kaftan, white turban, scroll |
| ibn-khaldun.png | Ibn Khaldun | cream scholar's robe, white turban, book |
| ibn-rushd.png | Ibn Rushd | black jubba, cream turban, book |
| ibn-sina.png | Ibn Sina | olive jubba, white turban |
| islam-makhachev.png | Islam Makhachev | black long-sleeve rash guard, knee-length fight shorts, MMA gloves |
| kamaru-usman.png | Kamaru Usman | green long-sleeve rash guard, knee-length fight shorts, MMA gloves |
| karim-benzema.png | Karim Benzema | white Real Madrid-style kit with captain's armband (no crest) |
| kazi-nazrul-islam.png | Kazi Nazrul Islam | cream panjabi, red lungi, book |
| khabib-nurmagomedov.png | Khabib Nurmagomedov | black rash guard, papakha hat, title belt |
| khamzat-chimaev.png | Khamzat Chimaev | black rash guard, knee-length fight shorts, MMA gloves |
| malala-yousafzai.png | Malala Yousafzai | coral shalwar kameez, rose dupatta over the hair, book |
| mashrafe-mortaza.png | Mashrafe Mortaza | green Bangladesh cricket shirt and trousers |
| mesut-ozil.png | Mesut Özil | red and white Arsenal-style kit, long sleeves (no crest) |
| mohamed-salah.png | Mohamed Salah | red Liverpool-style kit (no crest) |
| muhammad-ali.png | Muhammad Ali | white boxing vest, knee-length trunks, red gloves |
| muhammad-yunus.png | Muhammad Yunus | khaki shirt, dark trousers, tablet |
| ngolo-kante.png | N'Golo Kanté | blue Chelsea-style kit (no crest), football |
| omar-suleiman.png | Omar Suleiman | navy jubba |
| sadio-mane.png | Sadio Mané | red Liverpool-style kit (no crest) |
| tamim-iqbal.png | Tamim Iqbal | green Bangladesh cricket shirt and trousers, cricket bat |
| zabit-magomedsharipov.png | Zabit Magomedsharipov | black rash guard, knee-length fight shorts, MMA gloves |
| zaha-hadid.png | Zaha Hadid | long black dress, tablet |
| zohran-mamdani.png | Zohran Mamdani | navy suit |
| frederic-kanoute.png | Frédéric Kanouté | white Sevilla-style kit with red trim, plain shirt (no sponsor, no crest) |
| hakim-ziyech.png | Hakim Ziyech | red Morocco-style kit with green trim (no crest) |
| yassine-bounou.png | Yassine Bounou (Bono) | green goalkeeper kit, goalkeeper gloves |
| sofiane-boufal.png | Sofiane Boufal | red Morocco-style kit with green trim (no crest) |
| usman-khawaja.png | Usman Khawaja | cricket whites, green cap (no crest) |
| hashim-amla.png | Hashim Amla | green and gold cricket shirt and trousers, plain (no logo), cricket bat |
