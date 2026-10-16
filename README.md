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

Oprávnění: záložka **Lidé** se řídí viditelností seznamu „Zaměstnanci“ a
**Vozidla** seznamu „Vozidla“ — komu admin seznam skryje, nevidí ani data.
**Výplaty** vidí každý, kdo vidí nástěnku.

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
