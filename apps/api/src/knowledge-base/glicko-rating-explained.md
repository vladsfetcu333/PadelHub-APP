# Sistemul de rating Glicko-2 — explicat pentru jucători

Acest document explică pe înțelesul tuturor cum funcționează rating-ul Glicko-2 folosit pe Padel Platform. Pentru detaliile matematice complete, vezi articolul original al lui Mark Glickman (2012): <http://www.glicko.net/glicko/glicko2.pdf>.

## De ce nu ELO?

ELO (Arpad Elo, 1960) este sistemul de rating cunoscut din șah. E simplu: după un meci, câștigătorul primește un număr de puncte, perdantul îl pierde. Mărimea schimbării depinde de diferența de rating dintre cei doi.

Problema cu ELO pentru o platformă activă: **un jucător care vine după 6 luni de pauză** are același rating ca acum jumătate de an, dar performanța lui s-a schimbat. ELO nu cunoaște _incertitudinea_.

## Cele 3 numere ale Glicko-2

Pe Padel Platform, profilul tău are 3 valori:

### Rating (R)

Punctajul de bază — analog cu ELO. Pornește de la 1500 sau de la o valoare derivată din nivelul tău declarat la înregistrare.

| Rating | Nivel echivalent |
| ------ | ---------------- |
| 1100   | 1.0              |
| 1250   | 2.0              |
| 1350   | 2.5              |
| 1450   | 3.0              |
| 1500   | 3.5              |
| 1600   | 4.0              |
| 1700   | 4.5              |
| 1800   | 5.0              |
| 1900   | 5.5              |
| 2000   | 6.0              |
| 2100   | 6.5              |
| 2200+  | 7.0+             |

### RD (Rating Deviation)

**Incertitudinea** rating-ului tău, măsurată pe aceeași scară. Pornește de la 350 (foarte nesigur) și scade pe măsură ce joci match-uri validate.

- **RD > 200**: rating provizoriu — sistemul nu te cunoaște încă.
- **100 < RD < 200**: se rafinează — sistemul are o idee bună.
- **RD < 100**: stabilizat — rating-ul reflectă fiabil nivelul tău.

În interfață, rating-ul tău este afișat ca „1487 ± 76”. Acesta este intervalul de încredere: cu 68% probabilitate, „nivelul tău adevărat” se află în 1411–1563.

### Volatilitate (σ)

Cât de **constantă** este performanța ta recentă. Volatilitate mică = ești previzibil. Volatilitate mare = ești în formă fluctuantă (poate ai progresat brusc sau ai avut o serie de match-uri proaste). Valoarea pornește de la 0.06 și se modifică foarte încet, conform algoritmului Glicko-2 (Step 5 din paper).

## Cum se schimbă rating-ul după un match

Trei principii cheie:

### 1. Câștigând împotriva cuiva mult mai bun = câștig mare

Dacă rating-ul tău este 1500 și învingi pe cineva de 1800, sistemul gândește „**hmm, e o surpriză**” și îți crește semnificativ rating-ul. Invers, dacă învingi pe cineva de 1200, e _așteptat_ — rating-ul tău crește puțin.

### 2. Mișcările sunt mai mari când RD este mare

Un jucător nou (RD = 350) poate vedea rating-ul mișcându-se cu 100+ puncte după un singur match. Un veteran cu RD = 60 va vedea schimbări de 5-15 puncte.

Motivul este intuitiv: dacă sistemul nu e sigur unde stai, un singur rezultat oferă **multă informație** și ar trebui să te miște mult. Dacă te-a observat 50 de match-uri și e foarte sigur, un singur rezultat este zgomot — mișcarea ar trebui să fie mică.

### 3. RD scade după fiecare match jucat (devii mai cunoscut)

Și RD crește când nu joci o perioadă (incertitudinea crește — poate te-ai schimbat).

## Adaptarea pentru padel doubles

Padel-ul se joacă 2 contra 2, dar Glicko-2 e definit pentru match-uri 1v1. Adaptarea noastră:

1. Construim **rating-ul virtual al echipei**:
   - Rating echipă = media celor 2 jucători.
   - RD echipă = sqrt((RD1² + RD2²) / 2) (combinare în pătrat a variațiilor).
2. **Fiecare jucător** este actualizat individual ca și cum ar fi jucat 1v1 împotriva echipei adverse virtuale, cu rezultatul echipei sale.
3. Ratingul partenerului **nu** intră ca adversar (pentru a evita contradicțiile).

Această adaptare nu este standard în literatura academică (nu există un Glicko-2 canonical pentru dubluri), dar este folosită în multe implementări practice și este documentată în articolul Lasek et al. (2013) pentru o adaptare similară.

**Consecință importantă**: dacă jucător A (RD=50) și jucător B (RD=200) câștigă împreună, ambii vor obține rating, dar **B se va mișca mai mult** (sistemul nu era sigur unde stă B).

## Cum se interpretează evoluția rating-ului

Graficul din profilul tău („Rating” tab) arată evoluția peste timp cu o **bandă verde** care reprezintă ± RD la fiecare punct.

- **Bandă largă** → rating provizoriu, nu te lua serios de evoluție încă.
- **Bandă strânsă** → rating stabilizat, evoluția este semnificativă.
- **Salturi mari în sus / jos** → match-uri împotriva unor adversari mult diferiți de tine.
- **Plateau** → joci constant împotriva unor adversari de nivel apropiat — rating-ul s-a stabilizat.

## Frecvent: „de ce am pierdut puține puncte la o înfrângere mare?”

Două motive comune:

1. **Adversarii erau mult mai buni**. Sistemul „știa” că ai șanse mici. O înfrângere previzibilă nu îți schimbă rating-ul mult.
2. **RD-ul tău este mic**. Sistemul e încrezător în rating-ul tău și are nevoie de **multe** rezultate consistente pentru a te muta.

Invers, dacă pierzi unul-dintr-o-sută la cineva sub nivelul tău, rating-ul **scade mai mult** decât te aștepți — este o surpriză, deci informativ.

## Frecvent: „pot scădea rating-ul jucând cu cineva slab?”

Da. Dacă faci echipă cu cineva mult sub nivelul tău și pierdeți, rating-ul scade — sistemul nu știe că adversarii au beneficiat de slăbiciunea coechipierului tău, doar vede rezultatul echipei.

Pe termen lung această asimetrie se nivelează (lege statistică). Dar pe scurt poate părea „nedreaptă”.

## Frecvent: „cum pot urca cel mai rapid?”

1. **Joacă match-uri împotriva unor adversari mai buni**. Câștigând, rating-ul tău crește mai mult decât împotriva unor adversari mai slabi.
2. **Joacă des**. Match-urile validate stabilizează RD-ul, ceea ce înseamnă că rating-ul tău devine de încredere.
3. **Alege parteneri compatibili**. O echipă LEFT+RIGHT joacă mai eficient decât LEFT+LEFT.
4. **Nu juca doar acolo unde câștigi sigur** — sistemul nu te miscă suficient.

## Referințe academice

- **Glickman, M.E. (2012).** _Example of the Glicko-2 system._ Boston University. <http://www.glicko.net/glicko/glicko2.pdf>
- **Glickman, M.E. (1995).** _The Glicko system._ Boston University.
- **Lasek, J., Szlávik, Z., & Bhulai, S. (2013).** _The predictive power of ranking systems in association football._ International Journal of Applied Pattern Recognition.
- **Arpad Elo (1978).** _The Rating of Chess Players, Past and Present._

## Implementarea pe Padel Platform

Codul algoritmic se află în `apps/api/src/lib/rating/glicko2.ts` și este acoperit de 17 teste unitare în `glicko2.test.ts`, incluzând **reproducerea exemplului numeric din articolul Glickman 2012** într-o toleranță de 0.01 (rating 1464.06, RD 151.52, σ 0.05999 după trei match-uri specificate în paper).
