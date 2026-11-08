# Linked scripts: everyone helps someone

A planning document for the art and engine: how every character's loop sets off a good effect in someone else. **[AGENTS.md](../AGENTS.md) wins** wherever this document and the repo rules differ. Nothing here approves a card; new ambient people still need their IDs checked against `content/rules/never-depict.json`.

The whole world runs on one 240-frame loop (20 seconds at 12 fps). In these scripts, every character's action sets off a good effect in someone nearby, and the last beat of each chain hands over to the next chain, so a visitor can follow one kindness across the whole map. This covers all 44 people who have a card in the repo today, grouped by where they already stand.

**How the links work**

- **Cue by frame number, never by chance.** "Frames 60–84" means every card involved plays its part in that window, so the engine stays deterministic.
- **The effect is always visible:** a passed object, a beam of light, a wave, someone walking over. No text, numbers or logos.
- **Shared props carry the story:** the football, a water crate, a fruit crate, a book, a light beam, a model tower, a small purse. Each is a small sprite with its own path.
- **Couriers join the chains:** Zohran Mamdani's scooter, Kanouté's walk, Ibn Battuta's directions, a cured patient and a market seller carry effects from one area to the next.
- **The adhan pause closes every loop.** At frames 228–240 everyone eases to a stop, then the world resets to frame 0.
- **(new move)** marks a move the character's current animation strip doesn't have yet. Cards on 120-frame loops move to 240.
- People from different centuries meet freely, as on Floor796.

## Chain 1 — Stadium: "The unseen work"

| Frames  | Who                             | Does                                                                                                                                     | Good effect                                       |
| ------- | ------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------- |
| 0–36    | N'Golo Kanté                    | Carries the fruit crate Zohran just dropped to the bench (carry)                                                                         | The team has fruit and water at the break         |
| 36–60   | Mesut Özil                      | Long pass (kick)                                                                                                                         | The ball drops at Mané's feet                     |
| 60–84   | Sadio Mané · Yassine Bounou     | Mané shoots (kick); Bounou dives (dive)                                                                                                  | Goal                                              |
| 84–108  | Mané · Bounou · Karim Benzema   | Mané sujood; Bounou gets up and applauds the scorer (cheer); Benzema celebrates (celebrate)                                              | The beaten keeper shows sportsmanship             |
| 108–132 | Mané → Kanté                    | Hand on heart towards the bench (hand-on-heart); Kanté cheers shyly (cheer)                                                              | The scorer thanks the man who did the unseen work |
| 132–168 | Mohamed Salah                   | Walks the ball to the centre (walk), kicks off to Ziyech (kick)                                                                          | Play restarts                                     |
| 168–192 | Hakim Ziyech → Frédéric Kanouté | Ziyech knocks the ball out to the touchline (kick); Kanouté stops it (idle), walks it to the stand (walk) and hands it to a child (wave) | A child goes home with the match ball             |
| 192–216 | Sofiane Boufal                  | Walks to the stand (walk) and cheers with his mother (cheer; a dance would be a new move)                                                | Honouring parents                                 |
| 216–228 | Kanté                           | Carries the empty crate back to the gate (carry)                                                                                         | Ready for Zohran's next delivery                  |

## Chain 2 — Arena: "Strong and gentle"

| Frames  | Who                                     | Does                                                                                    | Good effect                                                |
| ------- | --------------------------------------- | --------------------------------------------------------------------------------------- | ---------------------------------------------------------- |
| 0–48    | Islam Makhachev · Kamaru Usman          | Light sparring (guard, punch)                                                           | —                                                          |
| 48–72   | Khabib Nurmagomedov                     | Waves them in (wave)                                                                    | They stop and touch gloves (idle): respect                 |
| 72–120  | Khamzat Chimaev · Zabit Magomedsharipov | Spar (guard, punch, kick)                                                               | Zabit pulls his kick short; both reset: control over anger |
| 120–156 | Muhammad Ali                            | Playful taunt to the crowd (taunt)                                                      | A nervous child at the ropes laughs and steps up           |
| 156–192 | Khabib                                  | Holds the belt up (belt-pose), then lowers it and waves the child in (wave)             | The child gets a first lesson                              |
| 192–228 | Abdul El-Sayed                          | Speaks to the crowd outside the arena (speech), then waves to Zohran riding past (wave) | Fighters and fans head for water and rest                  |

## Chain 3 — Study quarter (west): "Knowledge passed hand to hand"

| Frames  | Who                     | Does                                                                          | Good effect                                      |
| ------- | ----------------------- | ----------------------------------------------------------------------------- | ------------------------------------------------ |
| 0–60    | Habib Umar bin Hafiz    | Teaches a circle of children (teach)                                          | —                                                |
| 60–96   | Mufti Menk              | Takes over with a short reminder (talk)                                       | The children smile and nod                       |
| 96–120  | Omar Suleiman           | At the mosque door, waves a boy in a wheelchair up the new ramp (wave)        | Everyone gets in                                 |
| 0–48    | al-Khwarizmi            | Works a sum in his book (idle, then talk)                                     | Hands the page to Ibn Khaldun                    |
| 48–96   | Ibn Khaldun · Ibn Rushd | Ibn Khaldun reads it and turns to Ibn Rushd (talk); Ibn Rushd answers (talk)  | A friendly disagreement; both nod                |
| 120–168 | al-Zahrawi → Ibn Sina   | al-Zahrawi shows his scroll of instruments (talk); Ibn Sina studies it (idle) | —                                                |
| 168–216 | Ibn Sina                | Treats a patient (talk)                                                       | The patient walks away straighter and waves back |
| 216–228 | The patient             | Walks to Omar Suleiman's mosque door                                          | Arrives in time for the adhan pause              |

## Chain 4 — Studio and lab: "Light, time and buildings"

| Frames  | Who                             | Does                                                                              | Good effect                                     |
| ------- | ------------------------------- | --------------------------------------------------------------------------------- | ----------------------------------------------- |
| 0–24    | Ibn al-Haytham                  | Tilts his lens at the window (talk)                                               | A beam of light crosses the street into the lab |
| 24–60   | Ahmed Zewail · Aziz Sancar      | The beam hits Zewail's tablet, which flashes (talk); Sancar pours (pour)          | The flask turns from murky to clear             |
| 60–96   | al-Jazari                       | His elephant clock chimes (talk)                                                  | Marks the half-loop for the whole quarter       |
| 96–144  | Zaha Hadid → Fazlur Rahman Khan | Zaha sketches a curve (talk); Fazlur adds a frame to it (talk)                    | A model tower rises between them                |
| 144–168 | al-Biruni                       | Sights the model's top with his astrolabe (idle, then talk)                       | Nods: it's level                                |
| 168–204 | Hamza Yusuf                     | Leads his students over to see the model (talk)                                   | —                                               |
| 204–228 | Fatima al-Fihri                 | Waves the students, and the traveller Ibn Battuta sent, into her courtyard (wave) | They sit down to study                          |

## Chain 5 — Library and market (south): "From a book to a market"

| Frames  | Who               | Does                                                | Good effect               |
| ------- | ----------------- | --------------------------------------------------- | ------------------------- |
| 0–48    | Begum Rokeya      | Hands a book to a girl (talk)                       | —                         |
| 48–96   | Malala Yousafzai  | Reads with the girls (talk), waves more over (wave) | More girls join           |
| 96–132  | Muhammad Yunus    | Hands a small purse to a woman (talk)               | She opens a fruit stall   |
| 132–180 | The stall seller  | Fills Zohran's crate with fruit                     | It will reach the stadium |
| 180–204 | The stall seller  | Gives oranges to Hashim Amla                        | Link to chain 6           |
| 192–228 | Kazi Nazrul Islam | Recites to the market crowd (talk)                  | People stop and listen    |

## Chain 6 — Cricket ground and court: "Make room"

| Frames  | Who                        | Does                                                                                                                    | Good effect                        |
| ------- | -------------------------- | ----------------------------------------------------------------------------------------------------------------------- | ---------------------------------- |
| 0–36    | Hashim Amla                | Cover drive (bat)                                                                                                       | The ball races to the boundary     |
| 36–60   | Tamim Iqbal                | Cheers the shot, though it's the other side's (cheer)                                                                   | Sportsmanship                      |
| 60–96   | Usman Khawaja              | Walks to the side while the others celebrate (walk)                                                                     | —                                  |
| 96–132  | Mashrafe Mortaza → Khawaja | Celebrates (celebrate), then beckons him back (new move); Khawaja walks back and cheers with them (walk, cheer)         | No one is left out                 |
| 132–168 | Hakeem Olajuwon            | The boundary ball bounces onto his court; he catches it, celebrates and tosses it back (celebrate; throw is a new move) | Two sports, one ball               |
| 168–204 | Amla                       | Walks to the market stall (walk)                                                                                        | Brings oranges back for both teams |
| 204–228 | Everyone                   | Share the oranges (idle)                                                                                                | —                                  |

## The couriers: how the chains join up

| Frames  | Who                | Route                                                                                                | What it connects                                                                         |
| ------- | ------------------ | ---------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| 0–12    | Zohran Mamdani     | Drops the full fruit crate at the stadium gate (ride, then idle)                                     | Starts chain 1                                                                           |
| 12–96   | Zohran             | Rides south past the arena (ride), waving to Abdul El-Sayed on the way (wave)                        | Stadium → arena → market                                                                 |
| 96–180  | Zohran             | Waits at the market while the crate is filled (idle)                                                 | Chain 5                                                                                  |
| 180–240 | Zohran             | Rides back north and reaches the stadium gate at frame 240, which is frame 0 of the next loop (ride) | Market → stadium; the loop closes                                                        |
| 0–60    | Ibn Battuta        | Gives directions to a lost traveller (talk, wave)                                                    | The traveller walks north and reaches Fatima al-Fihri's courtyard at frame 204 (chain 4) |
| 168–192 | Kanouté            | Walks the match ball to a child in the stand                                                         | Stadium → crowd                                                                          |
| 216–228 | Ibn Sina's patient | Walks to the mosque                                                                                  | Study quarter → mosque                                                                   |
| 228–240 | Everyone           | Adhan pause: stop, turn, rest                                                                        | Resets the whole world                                                                   |

## Every character, linked

| Character             | Chain   | Gives to                                           | Gets from                          |
| --------------------- | ------- | -------------------------------------------------- | ---------------------------------- |
| N'Golo Kanté          | 1       | The team (fruit at the bench)                      | Zohran (the crate); Mané (thanks)  |
| Mesut Özil            | 1       | Mané (the pass)                                    | — (starts the play)                |
| Sadio Mané            | 1       | Kanté (thanks)                                     | Özil (the pass); Bounou (applause) |
| Yassine Bounou        | 1       | Mané (applause)                                    | Kanté (water at the bench)         |
| Karim Benzema         | 1       | The team (celebration)                             | Mané's goal                        |
| Mohamed Salah         | 1       | Ziyech (kick-off)                                  | The goal resets play               |
| Hakim Ziyech          | 1       | Kanouté (the ball)                                 | Salah (kick-off)                   |
| Frédéric Kanouté      | 1       | A child (the ball)                                 | Ziyech                             |
| Sofiane Boufal        | 1       | His mother (time with her)                         | The crowd's cheers                 |
| Islam Makhachev       | 2       | Usman (respect)                                    | Khabib (the call to stop)          |
| Kamaru Usman          | 2       | Makhachev (respect)                                | Khabib                             |
| Khabib Nurmagomedov   | 2       | Makhachev and Usman; a child (first lesson)        | Ali (the child's courage)          |
| Khamzat Chimaev       | 2       | Zabit (a fair reset)                               | Zabit (a pulled kick)              |
| Zabit Magomedsharipov | 2       | Chimaev (a pulled kick)                            | Chimaev                            |
| Muhammad Ali          | 2       | A nervous child (courage)                          | The crowd                          |
| Abdul El-Sayed        | 2       | Fighters and fans (health advice); Zohran (a wave) | Zohran (a wave back)               |
| Habib Umar bin Hafiz  | 3       | Children (a lesson)                                | — (starts the circle)              |
| Mufti Menk            | 3       | Children (a reminder)                              | Habib Umar (the circle)            |
| Omar Suleiman         | 3       | A boy in a wheelchair (a way in)                   | The patient arrives at his door    |
| al-Khwarizmi          | 3       | Ibn Khaldun (a page)                               | — (starts the debate)              |
| Ibn Khaldun           | 3       | Ibn Rushd (a question)                             | al-Khwarizmi                       |
| Ibn Rushd             | 3       | Ibn Khaldun (an answer)                            | Ibn Khaldun                        |
| al-Zahrawi            | 3       | Ibn Sina (his instruments)                         | —                                  |
| Ibn Sina              | 3       | A patient (healing)                                | al-Zahrawi                         |
| Ibn al-Haytham        | 4       | Zewail (light)                                     | — (starts the beam)                |
| Ahmed Zewail          | 4       | Sancar (the flash)                                 | Ibn al-Haytham                     |
| Aziz Sancar           | 4       | The lab (a clear flask)                            | Zewail                             |
| al-Jazari             | 4       | The whole quarter (the chime)                      | —                                  |
| Zaha Hadid            | 4       | Fazlur Khan (a curve)                              | al-Jazari's chime (her cue)        |
| Fazlur Rahman Khan    | 4       | al-Biruni (a model to check)                       | Zaha Hadid                         |
| al-Biruni             | 4       | Hamza Yusuf (a level model to show)                | Fazlur Khan                        |
| Hamza Yusuf           | 4       | His students                                       | al-Biruni                          |
| Fatima al-Fihri       | 4       | Students and a traveller (a place to study)        | Hamza Yusuf; Ibn Battuta           |
| Ibn Battuta           | Courier | A lost traveller (directions)                      | —                                  |
| Begum Rokeya          | 5       | A girl (a book)                                    | — (starts the chain)               |
| Malala Yousafzai      | 5       | More girls (reading)                               | Begum Rokeya                       |
| Muhammad Yunus        | 5       | A woman (a small loan)                             | Malala's crowd passing by          |
| Kazi Nazrul Islam     | 5       | The market (a poem)                                | The busy market                    |
| Hashim Amla           | 6       | Both teams (oranges)                               | The stall seller                   |
| Tamim Iqbal           | 6       | Amla (applause)                                    | Amla's shot                        |
| Usman Khawaja         | 6       | The team (rejoins them)                            | Mashrafe (beckoned back)           |
| Mashrafe Mortaza      | 6       | Khawaja (a place in the celebration)               | The team's win                     |
| Hakeem Olajuwon       | 6       | The cricketers (the ball back)                     | Amla's boundary                    |
| Zohran Mamdani        | Courier | Kanté (the fruit crate)                            | The stall seller (fruit)           |

## What the art and engine need

- **New moves:** a beckon for Mashrafe, a throw for Hakeem, and an optional dance for Boufal with his mother. Everything else uses moves the strips already have.
- **New prop sprites:** football, water and fruit crates, a beam of light, a flask that changes colour, a model tower, a small purse, oranges, a wheelchair ramp.
- **New ambient people:** a child at the stadium, a child at the arena, a patient, a boy in a wheelchair, a market seller, a lost traveller, girls at the library.
- **Timing:** cards on 120-frame loops need 240-frame scripts so the chains line up.
- **When new cards arrive:** Edhi's ambulance can be a second courier, Ali Banat can hand his car keys to the market seller, and Bilquis Edhi can sit near Ibn Sina's clinic.
