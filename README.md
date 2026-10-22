# Trellite Pro

Kanbanová aplikace ve stylu Trella (v češtině). Nástěnky, seznamy, karty,
přetahování, štítky, členové, termíny, úkoly (checklisty), přílohy, komentáře,
filtry, tmavý režim a export/import JSON.

Frontend je čisté HTML/CSS/JS (bez build kroku). Backend je Node/Express, který
ukládá celý stav do **reálné databáze (PostgreSQL)** když je nastavená
proměnná `DATABASE_URL` (např. na Railway), jinak do lokálního souboru.

## Spuštění lokálně

```bash
npm install
npm start
```

Aplikace poběží na http://localhost:3000. Bez `DATABASE_URL` se data ukládají
do `data/state.json` (a jako záloha do localStorage v prohlížeči).

Frontend funguje i jako čistě offline aplikace — stačí otevřít
`public/index.html` přímo v prohlížeči; data se pak ukládají jen do localStorage.

## Nasazení na Railway

1. Vytvořte nový projekt na [Railway](https://railway.app) z tohoto GitHub repozitáře.
2. Přidejte do projektu **PostgreSQL** (Add → Database → PostgreSQL).
3. Railway automaticky nastaví proměnnou `DATABASE_URL`. Server ji sám detekuje,
   vytvoří tabulku `workspace` a začne do ní ukládat.
4. Build i start zajistí Nixpacks pomocí `npm install` a `npm start`.

Žádná další konfigurace není potřeba — `PORT` dodává Railway, `DATABASE_URL`
také.

## Propojení se šichtovnicí a podpisy

Městské nástěnky (podle názvu: Mělník → `melnik`, Benešov → `benesov`, …) mají
záložky **Úkoly / Lidé / Výplaty / Vozidla**. Data se berou živě:

- **Šichtovnice** (`/api/integrace/*`) – kurýři, výplaty za měsíc (stejný výpočet
  jako stránka Fakturace), vozidla s posledním servisem a otevřenými závadami.
- **Podpisy** (`/api/integrace/*`) – smlouvy (PDF), vstupní test, velikost
  oblečení. S kurýrem se páruje přes ID ze šichtovnice, jinak podle jména.

Trello volá obě služby ze serveru se sdíleným klíčem; prohlížeč klíč nikdy nevidí.
Záložka se ukáže jen u města, které šichtovnice zná.

| Proměnná | Kde | Hodnota |
|---|---|---|
| `SMENOVNIK_URL` | Trello | adresa šichtovnice, např. `https://smenovnik.cz` |
| `SMENOVNIK_KEY` | Trello | stejná hodnota jako `INTEGRACE_API_KEY` ve šichtovnici |
| `PODPISY_URL` | Trello | adresa podpisů |
| `PODPISY_KEY` | Trello | stejná hodnota jako `INTEGRACE_API_KEY` v podpisech |
| `INTEGRACE_API_KEY` | šichtovnice, podpisy | náhodný tajný klíč (`openssl rand -hex 32`) |

Záložky navíc:

- **Směny** – kdo má ve vybraný den ranní / odpolední / celodenní směnu, telefon
  a jestli už odeslal předávku auta (ranní a celodenní bez předávky = červeně).
- **Výplaty → Pokuta / bonus** – zapíše pokutu (srážku) nebo bonus kurýrovi za
  zobrazený měsíc rovnou do šichtovnice (stejná tabulka jako stránka
  Bonus/Srážka), takže se hned promítne do fakturace. Přidat smí každý, kdo vidí
  Výplaty města; smazat jen autor nebo admin a jen položky přidané z Trella.
- **Výplaty → Pozdní příchody** – za měsíc všechny ranní a celodenní směny, ke
  kterým kurýr neodeslal předávku auta do `PREDAVKA_DEADLINE` (nebo vůbec);
  tlačítko „Pokuta“ předvyplní kurýra i dny.
- **Výplaty → faktury OSVČ** – u řidiče je vidět, jestli už fakturu za měsíc
  schválil v Moje data (číslo, částka, zaplaceno; PDF jen pro admina).
- **Řidiči → hodnocení z Foodisu** – hvězdičky na kartě kurýra, v detailu
  průměr a posledních 15 recenzí.
- **Výplaty → Účtenky ke schválení** – účtenky, které kurýři nahráli v Moje data;
  admin je může prohlédnout (fotka) a schválit / zamítnout.

Oprávnění: záložka **Lidé** se řídí viditelností seznamu „Zaměstnanci“ a
**Vozidla** seznamu „Vozidla“ — komu admin seznam skryje, nevidí ani data.
**Výplaty** vidí každý, kdo vidí nástěnku.

## Živá poloha aut (GPS)

Když je nastavené propojení na [online-monitoring.cz](https://login.online-monitoring.cz),
ukáže karta vozu v záložce **Vozidla** živý stav — jede / motor běží / zaparkováno,
rychlost, čas poslední polohy a odkaz na mapu. Server se k monitoringu přihlašuje
jménem a heslem, token (JWT, ~1 h) drží jen v paměti a sám ho obnovuje; prohlížeč
heslo ani token nikdy nevidí. Polohy se párují na auta ze šichtovnice podle SPZ.
Výpadek monitoringu Vozidla nerozbije — jen zmizí GPS odznak.

| Proměnná | Kde | Hodnota |
|---|---|---|
| `MONITORING_URL` | Trello | `https://login.online-monitoring.cz:9888` |
| `MONITORING_USER` | Trello | přihlašovací jméno k monitoringu |
| `MONITORING_PASS` | Trello | heslo k monitoringu |
| `MONITORING_WORKSPACE` | Trello | ID workspace (nepovinné, výchozí `1`) |

Doporučení: pro integraci si u monitoringu vyžádejte **zvláštní účet jen pro
čtení poloh**, ať případný únik hesla neumožní nic měnit. Pozn.: využívá se
privátní API webové aplikace (není oficiální), takže jejich větší update může
tvar dat změnit — napojení je proto napsané tolerantně.

### Hlídač rychlosti

Jednou za hodinu server projde knihu jízd každého auta a na každou jízdu
s maximální rychlostí nad limit pošle push upozornění všem **adminům**.
Každá jízda se hlásí jen jednou. První běh po nasazení se bere jako výchozí
stav (staré jízdy nehlásí). Běží jen při nastaveném `MONITORING_*`.

| Proměnná | Kde | Hodnota |
|---|---|---|
| `SPEED_LIMIT` | Trello | práh v km/h (výchozí `150`) |
| `SPEED_POLL_MS` | Trello | perioda kontroly v ms (výchozí `3600000` = 1 h) |

### Hlídač předávek (pozdní příchody)

Jednou denně po daném čase (pražského času) se Trello zeptá šichtovnice, kdo má
ten den **ranní nebo celodenní** směnu v předávkovém městě a do té doby
neodeslal denní předávku auta. Na každého takového kurýra pošle push upozornění
„Pozdní příchod" vybraným lidem (výchozí `denis,miroslav`). Odpolední směny se
neřeší, každý kurýr se hlásí jen jednou za den. Běží jen při nastaveném
propojení na šichtovnici (`SMENOVNIK_*`); šichtovnice k tomu vystavuje
`GET /api/integrace/predavky-chybejici`.

| Proměnná | Kde | Hodnota |
|---|---|---|
| `PREDAVKA_DEADLINE` | Trello | čas uzávěrky `HH:MM` pražského času (výchozí `10:40`) |
| `PREDAVKA_ALERT_USERS` | Trello | uživatelská jména příjemců oddělená čárkou (výchozí `denis,miroslav`) |
| `PREDAVKA_CHECK_MS` | Trello | perioda kontroly v ms (výchozí `60000` = 1 min) |

## API

| Metoda | Cesta         | Popis                              |
|--------|---------------|------------------------------------|
| GET    | `/api/state`  | Vrátí uložený stav (`{ data }`)    |
| PUT    | `/api/state`  | Uloží stav (`{ data }` v těle)     |
| GET    | `/api/health` | Health check                       |

## Co zatím není

Automatizace (Butler), rozšíření (Power-Ups), e-mailová oznámení,
víceuživatelské přihlašování a pohledy Kalendář/Časová osa/Dashboard.
Aktuálně celý workspace sdílí jeden dokument v databázi (ideální pro osobní
použití a testování).
