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
