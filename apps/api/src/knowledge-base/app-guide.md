# Ghid de utilizare — Padel Platform

Bun venit pe Padel Platform, prima platformă din România dedicată jucătorilor de padel. Acest ghid te plimbă prin toate funcționalitățile.

## Creare cont și profil

### Înregistrare în 4 pași

Procesul are patru pași:

1. **Cont** — email, parolă (minim 8 caractere cu litere și cifre), nume de utilizator (3-20 caractere, doar litere/cifre/underscore).
2. **Date personale** — prenume, nume, dată naștere (minim 14 ani), gen, oraș.
3. **Profil padel** — nivelul tău (1.0–7.0 în pași de 0.5), partea preferată (stânga / dreapta / ambele), mâna dominantă.
4. **Preferințe** — frecvență de joc, obiectiv (recreațional / competitiv / mixt).

**Nivelul de padel** urmează scara Playtomic (1.0–7.0):

- 1.0–2.0 — începător.
- 2.5–3.5 — nivel intermediar.
- 4.0–5.0 — avansat.
- 5.5+ — competițional.

Nu te subevalua dar nici nu te supraevalua — algoritmul de potrivire folosește nivelul tău pentru a-ți recomanda parteneri compatibili.

### Editarea profilului

În `/profile` ai trei tab-uri:

- **Profil** — editezi datele personale, bio (max 200 caractere), avatar, vizibilitate (Public / Doar prieteni / Privat).
- **Disponibilitate și preferințe** — adaugi intervale orare pe zile + configurezi preferințele de potrivire (diferența max. de nivel acceptată, filtru pe gen, interval de vârstă, dacă ceri același obiectiv).
- **Rating** — vezi nivelul tău curent calculat din rating-ul Glicko-2, graficul de evoluție și istoricul de match-uri.

## Cluburi

În `/clubs` vezi toate cluburile de padel listate pe platformă. Filtrele din bara laterală:

- **Oraș** — filtru text.
- **Tip teren** — Panoramic / Tradițional / Single padel.
- **Indoor / Outdoor**.
- **Lângă mine** — folosește locația browser-ului pentru a căuta cluburi într-o rază de 25 km.

Pe pagina unui club poți:

- Vedea terenurile disponibile cu prețuri (normal și peak).
- Verifica facilitățile (vestiar, dușuri, cafenea, școală etc.).
- Adăuga clubul la favorite (maxim **3 cluburi favorite**).
- Vedea harta cu locația exactă.

## Găsire parteneri (Potriviri)

Funcția centrală a platformei. În `/matching` ai două moduri:

### Modul „Partener” — găsești 1 jucător compatibil

Algoritmul Multi-Criteria Decision Analysis (MCDA) calculează un scor 0–100 între tine și fiecare candidat folosind 6 componente:

| Componentă         | Pondere | Ce contează                                                              |
| ------------------ | ------: | ------------------------------------------------------------------------ |
| Nivel (skill)      |    30 % | Cu cât diferența de nivel e mai mică, cu atât mai bine.                  |
| Partea preferată   |    20 % | LEFT + RIGHT = 100; AMBELE + orice = 80; LEFT+LEFT sau RIGHT+RIGHT = 30. |
| Disponibilitate    |    20 % | Suprapunerea în ore disponibile săptămânal.                              |
| Cluburi / distanță |    15 % | Club favorit comun = 100; același oraș = 50.                             |
| Obiective          |    10 % | Recreațional + Competitiv = 30; același obiectiv = 100.                  |
| Istoric            |     5 % | Cât de echilibrat ai jucat cu această persoană în trecut.                |

Există și un **filtru hard** pe gen (dacă preferința ta este „doar bărbați” / „doar femei”) — aceasta blochează direct candidatul, fără scor.

Slidere-ul „Scor minim” filtrează rezultatele. Recomandăm 30+ pentru rezultate utilizabile, 50+ pentru potriviri foarte bune.

### Modul „Match complet (2v2)” — algoritmul îți propune formații

Sistemul:

1. Identifică primii 20 de parteneri compatibili.
2. Generează toate combinațiile de 3 jucători din acest grup.
3. Pentru fiecare combinație, evaluează cele 3 formații posibile (cine cu cine).
4. Calculează un scor `matchQuality = 0.6 × compatibilitate medie + 0.4 × echilibru echipe`.
5. Returnează top 5.

Echilibrul echipei se calculează din diferența mediilor de nivel și prezența unei pereche LEFT+RIGHT pe fiecare parte.

## Match-uri deschise (Open Matches)

În `/open-matches` găsești cereri publice de jucători. Cineva a postat că vrea să joace într-o anumită zi la un anumit club și caută parteneri.

### Creează un match deschis

În `/open-matches/new`:

- **Club** și **dată/oră**.
- **Criterii** (opțional): interval de nivel, gen cerut, parte preferată căutată, obiectiv cerut.
- **Note** — descriere liberă.

Creatorul este automat **primul participant**. Cei care încearcă să se înscrie sunt validați împotriva criteriilor — dacă nu se potrivesc, primesc un mesaj clar de respingere (de exemplu „nivelul minim cerut este 3.0”).

### Înscrierea ca al 4-lea jucător

Când al patrulea jucător se înscrie:

1. Statusul postării trece automat în „**Plin**”.
2. Sistemul creează un **Match real** și împarte cei 4 jucători în două echipe echilibrate.
3. Toți cei 4 primesc o notificare „Match-ul tău este complet!”.
4. Match-ul apare în `/matches`.

### Algoritmul de echilibrare echipe

Sortăm cei 4 jucători după nivel descrescător. Echipele se formează ca:

- **Echipa 1**: jucător #1 (cel mai bun) + jucător #4 (cel mai slab).
- **Echipa 2**: jucător #2 + jucător #3.

Este demonstrabil cea mai echilibrată partiție pentru 4 numere sortate.

## Match-uri jucate

În `/matches` vezi tab-uri pentru:

- **În confirmare** — match-uri unde scorul a fost introdus și aștepți confirmarea ta sau a altora.
- **Programate** — match-uri viitoare.
- **Finalizate** — match-uri validate (rating-ul tău a fost actualizat).
- **Expirate** — match-uri unde s-au scurs 48 de ore fără confirmare totală (nu se aplică rating).

### Introducere scor

Pe pagina detaliată a unui match programat, oricare dintre cei 4 jucători poate introduce scorul. Formatul: 2 sau 3 set-uri (6-3, 6-4, 7-5, 7-6 sunt valide).

După introducere:

- Statusul devine **„Așteaptă confirmare”**.
- Cei 3 jucători primesc notificare.
- Fiecare confirmă (sau contestă) scorul.

**Când toți 4 confirmă** → match-ul devine **„Validat”** și rating-urile Glicko-2 se actualizează pentru toți. Vezi diferența de rating pe pagina match-ului.

**Dacă trec 48 de ore fără confirmare totală** → match-ul expiră, fără modificare de rating.

### Contestarea unui scor

Pe pagina match-ului ai opțiunea „Contestă scorul” (cu motivul scris, minim 5 caractere). Match-ul rămâne în confirmare, dar se marchează ca **„Contestat”** pentru intervenția unui administrator.

## Rating Glicko-2

Padel Platform folosește **Glicko-2** (Glickman 2012) ca sistem de rating, adaptat pentru dubluri.

### Cum funcționează

Fiecare jucător are 3 valori:

- **Rating** — punctajul de bază (start 1500 sau valoare derivată din nivelul declarat la înregistrare).
- **RD (Rating Deviation)** — incertitudinea. Mare = sistemul nu e sigur unde stai; mic = rating stabilizat.
- **Volatilitate (σ)** — măsură de instabilitate (cât de mult variază rezultatele tale recente).

### Statusurile rating-ului

- **Provizoriu** (RD > 200): rating-ul tău este încă în formare. Joacă măcar 10 match-uri validate.
- **Se rafinează** (100 ≤ RD ≤ 200): sistemul are o idee bună despre tine.
- **Stabilizat** (RD < 100): rating-ul tău reflectă fiabil nivelul tău.

### Maparea rating → nivel

| Rating | Nivel echivalent |
| ------ | ---------------- |
| 1100   | 1.0              |
| 1350   | 2.5              |
| 1500   | 3.5              |
| 1700   | 4.5              |
| 1900   | 5.5              |
| 2100+  | 6.5+             |

Pe profilul tău, pagina **Rating** afișează:

- Nivelul tău curent (mare, în brand-700).
- Rating Glicko-2 cu RD (de exemplu „1487 ± 76”).
- Grafic de evoluție rating peste timp, cu bandă ± RD.
- Lista ultimelor 10 match-uri cu diferența (+/-) de rating.

## Turnee

Padel Platform organizează 3 formate de turneu:

### Americano

Partenerii se rotesc în fiecare rundă. Toți joacă cu toți peste durata turneului. Scorul este cumulativ individual (puncte din meciuri câștigate + game-uri câștigate ca tiebreaker).

Există 4 moduri de generare a împerecherilor:

- **Rotație** (recomandat): round-robin complet — fiecare jucător este partener cu fiecare alt jucător exact o dată.
- **Echilibrat**: top + bottom în fiecare rundă (jucător 1 + jucător 8 vs 2 + 7 etc).
- **Adiacent în clasament**: 1+2 vs 3+4 etc.
- **Aleatoriu**: shuffle cu evitarea repetărilor.

### Mexicano

Variantă a Americano în care **împerecherea fiecărei runde se face din clasamentul curent** (după runda precedentă). Mai competitiv.

### Eliminare directă

Echipe fixe (parteneriat constant), bracket cu seeding (1 vs N, 2 vs N-1, etc). Pierderea unui meci = eliminare.

### Invitați

Dacă organizezi un turneu și nu toți jucătorii au cont, poți adăuga **invitați** cu nume și nivel. Singura restricție: dacă măcar un jucător din meci este invitat, rating-ul **nu** se actualizează (Glicko-2 are nevoie de toți cei 4 cu profiluri persistente).

### Mod TV

Pe pagina turneului, butonul „Mod TV” deschide o pagină full-screen optimizată pentru proiecție într-un club:

- Header cu numele turneului + runda curentă + ceasul.
- Alternare automată între „Meciuri în desfășurare” și „Clasament Top 10” la fiecare 15 secunde.
- Auto-refresh la fiecare 5 secunde.

## Notificări

Clopoțelul din header arată numărul de notificări necitite. Click pentru lista celor mai recente 10. Tipuri:

- **Bun venit** la înregistrare.
- **Match-ul tău este complet** când Open Match-ul tău se umple.
- **Scor introdus** când un partener / adversar a introdus scorul unui match al tău.
- **Rating actualizat** când rating-ul tău s-a modificat semnificativ.
- **Turneu** invitații, începere, finalizare.

Toate notificările sunt **doar în aplicație** (fără email / push).

## Rapoarte

Există 3 rapoarte:

- **Raport jucător** (`/reports/player`): istoricul tău complet — match-uri, win rate, evoluție rating, top parteneri/adversari, comparație cu media platformei.
- **Raport club** (`/reports/club/:id`): pentru proprietari de cluburi — utilizare terenuri, jucători activi, trend săptămânal.
- **Raport admin** (`/admin/reports`): metrice la nivel de platformă, pâlnie de conversie.

## Asistent (chatbot)

Butonul din colțul dreapta-jos al ecranului deschide asistentul AI. Întreabă-l despre:

- Reguli de padel.
- Termeni din glosar (ce înseamnă bandeja, vibora, etc.).
- Cum să folosești o funcție a aplicației.
- Tactică de bază.

Asistentul folosește RAG (Retrieval-Augmented Generation) — caută în baza noastră de cunoștințe înainte să răspundă. Vezi la finalul fiecărui răspuns secțiunea „Surse” care arată ce documente au fost consultate.

## Roluri și permisiuni

- **PLAYER** (implicit): joacă match-uri, intră în turnee, vede rapoarte proprii.
- **CLUB_OWNER**: poate crea cluburi (necesită verificare admin) și vede raportul clubului propriu.
- **COACH**: pentru viitor — pentru moment este doar un flag pe profil.
- **ADMIN**: vede toate rapoartele, verifică cluburi, intervine în dispute.
