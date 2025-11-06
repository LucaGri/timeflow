# TimeFlow - Smart Calendar App

**Versione:** 1.0.0 MVP  
**Stack:** React + TypeScript + Supabase + Vercel  
**Budget:** €0-5/mese (primi 100 utenti)

---

## 📋 Indice

1. [Setup Iniziale](#setup-iniziale)
2. [Configurazione Supabase](#configurazione-supabase)
3. [Deploy su Vercel](#deploy-su-vercel)
4. [Configurazione Google Calendar](#configurazione-google-calendar)
5. [Configurazione Stripe](#configurazione-stripe)
6. [Sviluppo Locale](#sviluppo-locale)
7. [Struttura Progetto](#struttura-progetto)
8. [Milestone Sviluppo](#milestone-sviluppo)

---

## 🚀 Setup Iniziale

### Prerequisiti

- Node.js 18+ installato
- Account GitHub (per repository)
- Account Supabase (gratis)
- Account Vercel (gratis)

### 1. Installazione Dipendenze

```bash
npm install
```

---

## 🗄️ Configurazione Supabase

### Step 1: Crea Progetto Supabase

1. Vai su [supabase.com](https://supabase.com)
2. Clicca "Start your project"
3. Crea una nuova organizzazione (gratis)
4. Crea un nuovo progetto:
   - **Nome:** TimeFlow
   - **Database Password:** Scegli una password sicura (salvala!)
   - **Region:** West EU (più vicina all'Italia)

### Step 2: Esegui Schema Database

1. Nel dashboard Supabase, vai su **SQL Editor**
2. Clicca "New Query"
3. Copia tutto il contenuto di `supabase-schema.sql`
4. Incolla nell'editor e clicca "Run"
5. Verifica che tutte le tabelle siano state create (vai su **Table Editor**)

### Step 3: Ottieni Credenziali

1. Vai su **Project Settings** → **API**
2. Copia:
   - **Project URL** (es: `https://xyzcompany.supabase.co`)
   - **anon public key** (chiave lunga che inizia con `eyJ...`)

### Step 4: Abilita Email Auth

1. Vai su **Authentication** → **Providers**
2. Assicurati che "Email" sia abilitato
3. (Opzionale) Personalizza le email template

---

## ⚙️ Configurazione Ambiente

### Crea file `.env`

Copia `.env.example` in `.env` e compila:

```bash
cp .env.example .env
```

Modifica `.env` con i tuoi valori:

```env
# Supabase (obbligatorio)
VITE_SUPABASE_URL=https://tuo-progetto.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...tua-chiave-anon...

# Google Calendar (configureremo dopo)
VITE_GOOGLE_CLIENT_ID=

# Stripe (configureremo dopo)
VITE_STRIPE_PUBLISHABLE_KEY=

# App Config
VITE_APP_URL=http://localhost:3000
VITE_TRIAL_DAYS=14
```

---

## 🚢 Deploy su Vercel

### Metodo 1: Via GitHub (Consigliato)

1. **Crea Repository GitHub**
   ```bash
   git init
   git add .
   git commit -m "Initial commit - TimeFlow MVP"
   git branch -M main
   git remote add origin https://github.com/tuousername/timeflow.git
   git push -u origin main
   ```

2. **Collega Vercel**
   - Vai su [vercel.com](https://vercel.com)
   - Clicca "Add New" → "Project"
   - Importa il repository GitHub
   - **Framework Preset:** Vite
   - **Build Command:** `npm run build`
   - **Output Directory:** `dist`

3. **Configura Environment Variables**
   In Vercel dashboard → Settings → Environment Variables, aggiungi:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
   - `VITE_APP_URL` (es: `https://timeflow.vercel.app`)
   - `VITE_TRIAL_DAYS` (14)

4. **Deploy**
   - Clicca "Deploy"
   - Aspetta 2-3 minuti
   - URL live: `https://timeflow-xxx.vercel.app`

### Metodo 2: Via CLI

```bash
npm install -g vercel
vercel login
vercel
```

---

## 📅 Configurazione Google Calendar (Week 2)

**Nota:** Configureremo questo durante Week 2 dello sviluppo.

### Passaggi futuri:

1. Google Cloud Console → Crea progetto
2. Abilita Google Calendar API
3. Crea OAuth 2.0 credentials
4. Aggiungi redirect URI di Vercel
5. Aggiorna `VITE_GOOGLE_CLIENT_ID`

Istruzioni dettagliate saranno fornite in Week 2.

---

## 💳 Configurazione Stripe (Week 4)

**Nota:** Configureremo questo durante Week 4 per monetizzazione.

### Passaggi futuri:

1. Crea account Stripe
2. Crea prodotto "TimeFlow Premium"
3. Imposta prezzo €4.99/mese
4. Configura webhook per Vercel URL
5. Aggiorna `VITE_STRIPE_PUBLISHABLE_KEY`

Istruzioni dettagliate saranno fornite in Week 4.

---

## 💻 Sviluppo Locale

### Avvia Development Server

```bash
npm run dev
```

Apri [http://localhost:3000](http://localhost:3000)

### Comandi Disponibili

```bash
npm run dev          # Avvia dev server
npm run build        # Build per production
npm run preview      # Preview build locale
npm run lint         # Esegui linting
npm run type-check   # Verifica TypeScript
```

---

## 📁 Struttura Progetto

```
timeflow/
├── public/              # Asset statici
├── src/
│   ├── components/      # Componenti React riutilizzabili
│   │   ├── layouts/     # Layout (MainLayout, AuthLayout)
│   │   └── ui/          # UI components (Button, etc)
│   ├── pages/           # Pagine applicazione
│   │   ├── auth/        # Login, Signup
│   │   ├── Dashboard.tsx
│   │   ├── Calendar.tsx
│   │   ├── Analytics.tsx
│   │   ├── Journal.tsx
│   │   └── Settings.tsx
│   ├── lib/             # Utilities e configurazioni
│   │   ├── supabase.ts  # Client Supabase
│   │   └── utils.ts     # Helper functions
│   ├── App.tsx          # Root component con routing
│   ├── main.tsx         # Entry point
│   └── index.css        # Global styles
├── supabase-schema.sql  # Schema database
├── .env.example         # Template variabili ambiente
├── package.json
├── tailwind.config.js
├── tsconfig.json
├── vite.config.ts
└── vercel.json
```

---

## 📅 Milestone Sviluppo

### ✅ WEEK 1: Foundation (COMPLETATA)

- [x] Setup progetto React + TypeScript + Tailwind
- [x] Configurazione Supabase + Schema database
- [x] Sistema autenticazione (Login/Signup)
- [x] Layout principale con sidebar
- [x] Deploy su Vercel
- [x] Pagine placeholder

**Deliverable:** App deployata con auth funzionante

---

### 🔄 WEEK 2: Google Calendar + Smart Conflicts (PROSSIMA)

**Obiettivi:**
- [ ] Integrazione Google Calendar API
- [ ] OAuth flow per connessione
- [ ] Sync bidirezionale eventi
- [ ] Sistema Smart Conflicts
- [ ] UI calendario con React Big Calendar

**Output:** Calendario funzionante + sync Google + detection conflitti

---

### 🔄 WEEK 3: Analytics + Journaling

**Obiettivi:**
- [ ] Dashboard Time Analytics
- [ ] Grafici categorizzazione tempo (Recharts)
- [ ] Sistema Progressive Journaling
- [ ] Editor note con tag
- [ ] Pattern detection base

**Output:** Analytics completa + journaling funzionante

---

### 🔄 WEEK 4: Monetizzazione + Launch

**Obiettivi:**
- [ ] Integrazione Stripe
- [ ] Trial system (14 giorni)
- [ ] Paywall e upgrade flow
- [ ] Email transazionali (Resend)
- [ ] Landing page
- [ ] Legal (Privacy Policy, ToS)

**Output:** App completa, live, monetizzabile

---

## 🔍 Stato Attuale

**✅ Completato:**
- Setup progetto completo
- Autenticazione Supabase
- Database schema
- UI base con routing
- Deploy pipeline Vercel

**🔜 Prossimi Passi:**
1. Implementare UI calendario completa
2. Creare form per CRUD eventi
3. Iniziare integrazione Google Calendar
4. Testare flow autenticazione completo

---

## 📞 Supporto

Se incontri problemi durante setup:

1. Verifica che tutte le variabili `.env` siano corrette
2. Controlla che lo schema Supabase sia stato eseguito correttamente
3. Verifica che il progetto sia stato buildato senza errori
4. Controlla i log su Vercel dashboard

---

## 🎯 Note Importanti

- **Costi Attuali:** €0/mese (tutto in free tier)
- **Primo Costo:** Solo dominio (~€15/anno) quando pronto per lancio
- **Scalabilità:** Free tier copre fino a 100-200 utenti
- **Backup:** Database Supabase ha backup automatici
- **SSL:** Incluso gratis su Vercel

---

## 🚀 Quick Start per Sviluppo

```bash
# 1. Clona e installa
git clone https://github.com/tuousername/timeflow.git
cd timeflow
npm install

# 2. Configura Supabase (segui sezione sopra)

# 3. Copia e configura .env
cp .env.example .env
# Modifica .env con le tue credenziali

# 4. Avvia dev server
npm run dev

# 5. Apri browser
# http://localhost:3000
```

**Fatto! Dovresti vedere la schermata di login. Prova a registrare un nuovo account.**

---

**Versione README:** 1.0  
**Ultimo Aggiornamento:** Day 1 - Setup Completato  
**Prossimo Update:** Week 2 - Google Calendar Integration
