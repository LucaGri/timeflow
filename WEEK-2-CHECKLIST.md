# 📅 WEEK 2 - Calendar + Google Sync (CHECKLIST)

**Obiettivo:** Calendario interattivo funzionante + Google Calendar integration + Smart Conflicts

**Timeline:** 7 giorni (2-3 ore/giorno = 14-21 ore totali)

---

## 🎯 Milestone Week 2

Al termine di questa settimana avrai:
- ✅ Calendario visuale completo (drag & drop)
- ✅ CRUD eventi (Create, Read, Update, Delete)
- ✅ Sincronizzazione Google Calendar bidirezionale
- ✅ Sistema Smart Conflicts attivo
- ✅ Categorizzazione automatica eventi

---

## 📋 TASK LIST

### DAY 3-5: Core Calendar UI (6-9 ore)

#### [ ] Task 3.1: Implementa React Big Calendar
**Tempo:** 2-3 ore

File da creare/modificare:
- `src/pages/Calendar.tsx` (sostituire placeholder)
- `src/components/calendar/CalendarView.tsx` (nuovo)

Cosa fare:
1. Installare react-big-calendar styles
2. Configurare localizzazione italiana
3. Implementare vista settimanale/mensile
4. Aggiungere color coding per categoria
5. Testare responsive (mobile + desktop)

**Codice starter:**
```tsx
import { Calendar as BigCalendar, momentLocalizer } from 'react-big-calendar'
import moment from 'moment'
import 'react-big-calendar/lib/css/react-big-calendar.css'

const localizer = momentLocalizer(moment)

// Configurare custom event styling per categoria
```

#### [ ] Task 3.2: Event Modal (Create/Edit)
**Tempo:** 2-3 ore

File da creare:
- `src/components/calendar/EventModal.tsx` (nuovo)
- `src/hooks/useEvents.ts` (custom hook per gestione eventi)

Cosa implementare:
- Form per creare nuovo evento
- Form per modificare evento esistente
- Validazione (start < end, titolo obbligatorio)
- Selezione categoria (dropdown)
- Date/time picker (usa input HTML5 o libreria)

**Campi form:**
- Titolo* (required)
- Descrizione
- Data inizio* + Ora inizio*
- Data fine* + Ora fine*
- Categoria* (meeting/deep_work/admin/personal/break/other)
- Importanza (1-5 stelle)
- Location (opzionale)

#### [ ] Task 3.3: CRUD Operations
**Tempo:** 2-3 ore

File da creare/modificare:
- `src/lib/api/events.ts` (API calls Supabase)

Funzioni da implementare:
```typescript
// src/lib/api/events.ts
export const createEvent = async (eventData) => { /* ... */ }
export const updateEvent = async (id, eventData) => { /* ... */ }
export const deleteEvent = async (id) => { /* ... */ }
export const getEvents = async (startDate, endDate) => { /* ... */ }
```

Test:
- [ ] Crea evento → appare nel calendario
- [ ] Modifica evento → cambia nel calendario
- [ ] Elimina evento → scompare dal calendario
- [ ] Eventi persistono dopo refresh

---

### DAY 6-8: Google Calendar Integration (6-9 ore)

#### [ ] Task 6.1: Google Cloud Console Setup
**Tempo:** 1 ora

Steps:
1. Vai su [console.cloud.google.com](https://console.cloud.google.com)
2. Crea nuovo progetto "TimeFlow"
3. Abilita **Google Calendar API**
4. Vai su "Credentials" → "Create Credentials" → "OAuth 2.0 Client ID"
5. Configura OAuth consent screen:
   - User Type: External
   - App name: TimeFlow
   - Scopes: .../auth/calendar (full access)
6. Crea OAuth 2.0 Client:
   - Application type: Web application
   - Authorized redirect URIs:
     - `http://localhost:3000/auth/callback` (dev)
     - `https://timeflow-xxx.vercel.app/auth/callback` (prod)
7. Copia **Client ID** e salvalo

#### [ ] Task 6.2: OAuth Flow Frontend
**Tempo:** 2-3 ore

File da creare:
- `src/lib/google/auth.ts` (gestione OAuth)
- `src/pages/auth/GoogleCallback.tsx` (callback handler)
- `src/components/settings/ConnectGoogle.tsx` (UI button)

Funzioni chiave:
```typescript
// Inizia OAuth flow
export const initiateGoogleAuth = () => {
  const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?...`
  window.location.href = authUrl
}

// Gestisci callback
export const handleGoogleCallback = async (code: string) => {
  // Scambia code per token
  // Salva refresh_token in profiles table
}
```

#### [ ] Task 6.3: Sync Bidirezionale
**Tempo:** 3-4 ore

File da creare:
- `src/lib/google/calendar.ts` (API Google Calendar)
- `src/lib/sync/syncEngine.ts` (logica sync)

Funzionalità da implementare:
1. **Import da Google:**
   - Fetch eventi da Google Calendar
   - Crea/aggiorna eventi in Supabase
   - Salva `google_event_id` per mapping

2. **Export a Google:**
   - Quando crei evento in TimeFlow → crea anche su Google
   - Quando modifichi evento → aggiorna su Google
   - Quando elimini evento → elimina su Google

3. **Conflict Resolution:**
   - Se evento modificato sia su TimeFlow che Google → mostra popup "Quale versione tenere?"
   - Timestamp `updated_at` per determinare più recente

#### [ ] Task 6.4: Background Sync
**Tempo:** 1 ora

Implementa:
- Polling ogni 5 minuti per sync automatico
- Button "Sync Now" manuale
- Indicatore visuale "Last synced: 2 min ago"

```typescript
// In Settings page o Calendar page
useEffect(() => {
  const syncInterval = setInterval(() => {
    syncGoogleCalendar()
  }, 5 * 60 * 1000) // 5 minuti

  return () => clearInterval(syncInterval)
}, [])
```

---

### DAY 9-10: Smart Conflicts (4-6 ore)

#### [ ] Task 9.1: Conflict Detection Logic
**Tempo:** 2-3 ore

File da creare:
- `src/lib/conflicts/detectConflicts.ts`

Tipi di conflitti da rilevare:

1. **Direct Overlap** (severità: HIGH)
   - Due eventi si sovrappongono temporalmente
   - Esempio: Meeting 14:00-15:00 + Call 14:30-15:30

2. **Overload** (severità: MEDIUM)
   - Giornata troppo piena (>8 ore programmate)
   - Nessun break tra eventi lunghi

3. **Goal Impact** (severità: MEDIUM)
   - TODO: Implementare in future con obiettivi settimanali
   - Placeholder per ora

4. **Recovery Needed** (severità: LOW)
   - Meeting intensi back-to-back
   - Suggerisce break

```typescript
export const detectConflicts = (events: Event[]): SmartConflict[] => {
  const conflicts: SmartConflict[] = []
  
  // Check overlaps
  for (let i = 0; i < events.length; i++) {
    for (let j = i + 1; j < events.length; j++) {
      if (eventsOverlap(events[i], events[j])) {
        conflicts.push({
          type: 'direct_overlap',
          severity: 'high',
          description: `"${events[i].title}" si sovrappone con "${events[j].title}"`,
          suggestion: 'Sposta uno dei due eventi'
        })
      }
    }
  }
  
  // Check daily overload
  // ...
  
  return conflicts
}
```

#### [ ] Task 9.2: Conflict UI
**Tempo:** 2-3 ore

File da creare:
- `src/components/calendar/ConflictBanner.tsx`
- `src/components/calendar/ConflictList.tsx`

UI da implementare:
1. **Banner in alto al calendario**
   - Mostra numero conflitti attivi
   - Colore basato su severità massima (rosso/giallo/blu)
   - Click → apre lista conflitti

2. **Conflict Detail Panel**
   - Lista conflitti con:
     - Icona severità
     - Descrizione conflitto
     - Suggerimento risoluzione
     - Button "Risolvi" / "Ignora"

3. **Visual Indicators**
   - Eventi con conflitti hanno badge rosso
   - Tooltip al hover mostra tipo conflitto

---

## ✅ Checklist Finale Week 2

Prima di considerare Week 2 completata, verifica:

### Testing Checklist

**Calendar Base:**
- [ ] Posso creare un nuovo evento
- [ ] Posso modificare un evento esistente
- [ ] Posso eliminare un evento
- [ ] Eventi sono visibili nel calendario
- [ ] Drag & drop funziona (opzionale)
- [ ] Vista settimanale e mensile funzionano
- [ ] Responsive su mobile

**Google Sync:**
- [ ] Posso connettere il mio Google Calendar
- [ ] Eventi Google appaiono in TimeFlow
- [ ] Evento creato in TimeFlow appare su Google
- [ ] Modifica in TimeFlow si riflette su Google
- [ ] Eliminazione funziona bidirezionale
- [ ] Token refresh funziona (non devo riconnettere ogni ora)

**Smart Conflicts:**
- [ ] Creo due eventi sovrapposti → vedo warning
- [ ] Giornata con >8h eventi → vedo overload warning
- [ ] Conflitti appaiono in lista
- [ ] Posso marcare conflitto come "risolto"
- [ ] Badge visivi su eventi con conflitti

---

## 🚨 Possibili Problemi & Soluzioni

### Problema: "Invalid OAuth redirect URI"
**Causa:** URI non match tra Google Console e app  
**Fix:** Verifica che gli URI in Google Console includano esattamente l'URL della tua app

### Problema: "Google API quota exceeded"
**Causa:** Troppi sync (limite 1M richieste/giorno - improbabile)  
**Fix:** Aggiungi throttling ai sync automatici

### Problema: "Conflict detection lenta"
**Causa:** Loop O(n²) su molti eventi  
**Fix:** Ottimizza con sorting per data, break early quando possibile

### Problema: Token Google scade
**Causa:** Refresh token non salvato/utilizzato  
**Fix:** Implementa refresh automatico quando access_token scade

---

## 📊 Deliverable Week 2

Al termine avrai:
1. Calendario visuale completo e funzionante
2. Google Calendar connesso e sincronizzato
3. Sistema Smart Conflicts attivo
4. UI polish e responsive
5. Tutto testato e funzionante

**Costo aggiuntivo:** €0 (Google Calendar API gratis fino a 1M req/giorno)

---

## 🎯 Pronti per Week 3?

Dopo Week 2, passeremo a:
- **Time Analytics Dashboard** (grafici Recharts)
- **Progressive Journaling System**
- **Pattern Detection**

Ma prima, completiamo Week 2! 💪

---

**Status:** 🔄 Week 2 IN PROGRESS  
**Time Budget:** 14-21 ore (2-3 ore/giorno × 7 giorni)  
**Complexity:** ⭐⭐⭐ Media-Alta
