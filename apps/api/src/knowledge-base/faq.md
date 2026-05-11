# Întrebări frecvente

## Cont și profil

**Cum îmi resetez parola?**
La momentul actual, resetarea automată prin email nu este implementată. Contactează administratorul platformei pentru a o reseta manual. Funcția va fi adăugată într-o iterație viitoare.

**Pot să-mi schimb numele de utilizator?**
Da. Mergi la `/profile` → tab „Profil” și editează câmpul. Numele de utilizator trebuie să aibă 3-20 caractere și să folosească doar litere, cifre și underscore.

**De ce nu apare profilul meu altcuiva?**
Poți seta vizibilitatea în `/profile` → „Vizibilitate profil”:

- **Public** — toți utilizatorii înregistrați văd profilul.
- **Doar prieteni** — momentan se comportă ca Public (funcția de prieteni nu e activă încă).
- **Privat** — nimeni în afară de tine.

**Cum schimb nivelul meu padel?**
Nivelul declarat este modificabil din `/profile` → tab „Profil”. Dar reține: dacă ai jucat suficient de multe match-uri validate (RD < 200), sistemul folosește rating-ul Glicko-2 ca nivel efectiv pentru potrivire, nu pe cel declarat.

## Match-uri

**De ce nu mi s-a actualizat rating-ul după match?**
Două motive posibile:

1. **Match-ul nu a fost validat încă** — toți cei 4 jucători trebuie să confirme scorul. Verifică tab-ul „În confirmare” din `/matches`.
2. **A trecut peste 48 de ore** — match-ul a expirat și nu se mai aplică rating.

**Pot să schimb scorul după ce l-am introdus?**
Doar **utilizatorul care a introdus scorul** poate să-l modifice, și doar dacă **niciun alt jucător nu a confirmat încă**. După prima confirmare a altcuiva, scorul este înghețat. Dacă observi o greșeală, folosește butonul „Contestă scorul”.

**Ce înseamnă „match contestat”?**
Un jucător a marcat scorul ca incorect și a oferit un motiv. Match-ul rămâne în stadiul de „așteaptă confirmare” până când administratorul intervine.

**Ce e rating Glicko-2 și diferența față de ELO?**
Glicko-2 este o variantă îmbunătățită a sistemului ELO (Elo). În plus față de rating, fiecare jucător are:

- **RD (Rating Deviation)** — incertitudinea rating-ului.
- **Volatilitate** — cât de stabilă a fost performanța recentă.

Un jucător nou are RD mare (350); după multe match-uri, RD scade. Mișcările de rating sunt **mai mari când RD este mare** (sistemul nu e sigur) și **mai mici când RD este mic** (sistemul e sigur — îți trebuie o demonstrație clară pentru a-l mișca).

## Cluburi

**Cum adaug un club nou?**
Trebuie să ai rolul **ADMIN** sau **CLUB_OWNER**. Mergi la `/clubs/new`. Dacă ești CLUB_OWNER, clubul tău va fi creat în stare **neverificată** până când un admin îl validează.

**De ce am limită de 3 cluburi favorite?**
Algoritmul de potrivire folosește **cluburile favorite comune** ca semnal de proximitate. Dacă fiecare ar putea favoriza 50 de cluburi, semnalul ar fi diluat. Limita de 3 te forțează să alegi cluburile cu adevărat tale.

**Pot vedea harta tuturor cluburilor?**
Da. Pe `/clubs`, comută între „Listă” și „Hartă”. Folosește Leaflet cu OpenStreetMap (gratuit, fără API key).

## Open Matches

**Ce diferență e între un Open Match și un Match?**

- **Open Match** = postare publică prin care **cauți** alți jucători. Este în starea „înscrieri deschise”.
- **Match** = un meci propriu-zis cu 4 jucători confirmați și o dată de joc. Match-urile pot apărea din Open Matches (când acesta se umple) sau din turnee.

**Pot să mă retrag dintr-un Open Match?**
Da, dar numai înainte ca match-ul să se umple cu 4 jucători (status `OPEN`). După ce a devenit `FULL`, nu mai poți părăsi — trebuie să discuți cu organizatorul. Creatorul în schimb nu poate părăsi niciodată — poate doar **anula** Open Match-ul cât timp este OPEN.

**Cum echilibrează sistemul echipele când se umple Open Match-ul?**
Sortăm cei 4 jucători după nivel descrescător și împărțim:

- **Echipa 1**: jucătorul cel mai bun + jucătorul cel mai slab.
- **Echipa 2**: jucătorii 2 și 3 (din mijloc).

Această partiție minimizează diferența de sumă a nivelurilor între cele două echipe — alegerea optimă matematic.

## Turnee

**Cât timp durează un turneu Americano?**
Depinde de:

- Număr de jucători (4-16 tipic).
- Număr de runde (de obicei 4-8).
- Număr de terenuri disponibile.

Cu 8 jucători, 7 runde și 2 terenuri: ~3-4 ore.

**Pot adăuga prieteni fără cont?**
Da. Ca organizator, folosește „Adaugă invitat” pe pagina turneului. Limitări:

- Invitații **nu** primesc rating Glicko-2 — sistemul are nevoie de profiluri persistente.
- Match-urile cu invitați nu generează intrări în istoricul Glicko al jucătorilor înregistrați.
- Statistica turneului (puncte, game-uri câștigate) funcționează normal pentru toți.

**Care e diferența între Americano și Mexicano?**
**Americano**: programul de runde este **fix** dinainte. Toți joacă cu toți într-o ordine predefinită.

**Mexicano**: doar prima rundă este programată. După fiecare rundă, sistemul **re-împerechează** jucătorii pe baza clasamentului curent: jucătorul 1 face echipă cu 4 contra 2 + 3, jucătorii 5+8 contra 6+7, etc. Mai dinamic, dar mai puțin previzibil.

**Eliminarea directă** păstrează echipele **fixe** (parteneriat fix). Fiecare meci este knockout — pierderea = eliminare.

**Cum funcționează Modul TV?**
În pagina turneului ai un buton „Mod TV”. Se deschide o pagină full-screen optimizată pentru a fi proiectată într-un club:

- Fundal verde (brand) cu contrast mare.
- Auto-refresh la 5 secunde.
- Alternează între „Meciuri în desfășurare” și „Clasament Top 10” la fiecare 15 secunde.

Recomandare: pune URL-ul `/tournaments/:id/display` pe un Chromecast / Smart TV și ai un display profesional fără chrome.

## Algoritmul de potrivire

**De ce un jucător cu același nivel apare cu scor mic?**
Probabil un alt factor nu se potrivește:

- **Aceeași parte preferată** (LEFT + LEFT sau RIGHT + RIGHT) → 30 din 100 la componenta „Parte”.
- **Obiective opuse** (Recreațional + Competitiv) → 30 din 100 la componenta „Obiective”.
- **Oraș diferit / cluburi diferite** → 20 din 100 la componenta „Cluburi”.
- **Disponibilitate care nu se suprapune** → 0 din 100 la componenta „Disponibilitate”.

Verifică **defalcarea scorului** pe cardul rezultatului — sistemul îți arată exact unde s-a pierdut scor.

**De ce nu apar deloc rezultate?**
Posibile cauze:

- Filtrul „Scor minim” este prea ridicat. Coboară-l la 0 ca să vezi toate.
- Filtrul „Doar același oraș” elimină candidați din alte orașe.
- Filtrul tău de gen ascunde candidați.
- Sunt puțini utilizatori înregistrați pe platformă cu profilul potrivit.

**Ce înseamnă „nivel efectiv”?**
Dacă rating-ul tău Glicko-2 este stabil (RD < 200), sistemul îți calculează un „nivel efectiv” din rating, nu din valoarea declarată. Astfel, dacă declari 3.5 dar joci la 4.5 (rating ~1700), partenerii sunt căutați la 4.5.

## Asistent (chatbot)

**Pot să-i pun întrebări în engleză?**
Da, dar răspunsurile vor fi în română (este configurat să răspundă mereu în română). Pentru cea mai bună experiență, întreabă în română.

**Cât de des este actualizată baza de cunoștințe?**
Baza de cunoștințe (regulamente, glosar, ghid) este versionată odată cu aplicația. Re-ingestia se face manual prin `npm run ingest:knowledge` când conținutul se modifică.

**De ce văd „Surse: ...” la final?**
Asistentul folosește un model RAG (Retrieval-Augmented Generation). Caută în baza de cunoștințe documentele cele mai relevante pentru întrebarea ta, le include în prompt-ul către modelul Claude Haiku 4.5, și apoi îți afișează cu transparență ce a citit pentru a-ți răspunde.

## Tehnic / Tehnologie

**Datele mele sunt în siguranță?**

- Parolele sunt **hash-uite cu bcrypt** (nu sunt stocate plain).
- Autentificarea folosește **JWT** (JSON Web Tokens) cu expirare la 7 zile.
- Baza de date locală (SQLite în dezvoltare, PostgreSQL în producție).
- Nu vindem date — proiect academic.

**Aplicația funcționează pe mobil?**
Interfața este responsive — poate fi folosită din browser pe mobil. O aplicație nativă (React Native sau Capacitor) nu este planificată pentru această fază a proiectului.

**Este open-source?**
Codul este proprietate intelectuală a autorului (lucrare de licență). Va fi publicat pe GitHub după susținerea oficială.
