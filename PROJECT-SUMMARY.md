# 📊 TimeFlow - Project Summary & Roadmap

**Creato:** 6 Novembre 2025  
**Versione:** 1.0.0 MVP  
**Status:** ✅ Week 1 COMPLETE | 🔄 Week 2 NEXT

---

## 🎯 Vision & Obiettivo

**TimeFlow** è un calendario intelligente che si distingue dalla concorrenza con:

1. **Progressive Journaling** - Riflessioni automatiche collegate agli eventi
2. **Time Analytics Avanzate** - Visualizzazione pattern temporali e produttività
3. **Smart Conflicts** - Rilevamento conflitti intelligente e suggerimenti
4. **Context-Aware** (v2) - Suggerimenti ML-based per scheduling ottimale
5. **Voice-First** (v1.1) - Quick capture vocale eventi
6. **Energy-Based** (v1.1) - Scheduling basato su energia personale

---

## 💰 Business Model

**Target:** B2C (knowledge workers, professionisti 25-45 anni)  
**Modello:** Freemium con trial  
**Pricing:** €4.99/mese  
**Trial:** 14 giorni gratuiti

### Revenue Projections

| Utenti Paganti | MRR | Costi Mensili | Profitto Netto | Margine |
|----------------|-----|---------------|----------------|---------|
| 10 | €50 | €0 | €47 | 94% |
| 50 | €250 | €0 | €235 | 94% |
| 100 | €500 | €0-10 | €470 | 94% |
| 500 | €2,500 | €45 | €2,350 | 94% |

**Break-even:** 1 utente pagante (copre costi dominio)

---

## 🏗️ Tech Stack

### Frontend
- **Framework:** React 18 + TypeScript
- **Styling:** Tailwind CSS + shadcn/ui
- **Routing:** React Router v6
- **State:** Zustand (lightweight)
- **Calendar:** React Big Calendar
- **Charts:** Recharts
- **Forms:** React Hook Form + Zod
- **Icons:** Lucide React

### Backend & Services
- **Database:** Supabase PostgreSQL (500MB free)
- **Auth:** Supabase Auth (incluso)
- **Storage:** Supabase Storage (50MB free)
- **Email:** Resend (3,000 free/mese)
- **Payments:** Stripe (solo fee per transazione)
- **Hosting:** Vercel (unlimited free)
- **Analytics:** Plausible self-hosted (free)

### Integrazioni
- **Google Calendar API** (1M requests/day free)
- **OpenAI Whisper API** (v1.1 - €0.006/min)

### Costo Totale Anno 1
- **Setup:** €15 (dominio)
- **Mensile (0-100 utenti):** €0
- **Mensile (500+ utenti):** €45
- **ROI con 500 utenti:** 5,455% 🚀

---

## 📅 Development Timeline

### ✅ WEEK 1: Foundation (COMPLETATA)
**Tempo:** 4-6 ore  
**Status:** 100% DONE

**Deliverables:**
- [x] Setup progetto completo (React + TypeScript + Tailwind)
- [x] Supabase configurato + schema database (8 tabelle)
- [x] Sistema autenticazione completo (login/signup/logout)
- [x] Layout principale con sidebar navigation
- [x] 5 pagine principali (placeholder)
- [x] Deploy pipeline Vercel configurato
- [x] UI components base
- [x] Routing protetto

**Output:** App deployata con auth funzionante ✅

---

### 🔄 WEEK 2: Calendar + Google Sync (PROSSIMA)
**Tempo:** 14-21 ore (2-3h/giorno)  
**Status:** 0% - Ready to start

**Tasks:**
- [ ] Implementare React Big Calendar UI (6-9h)
- [ ] CRUD eventi completo (3-4h)
- [ ] Google Calendar OAuth integration (3-4h)
- [ ] Sync bidirezionale (4-5h)
- [ ] Smart Conflicts detection (3-4h)
- [ ] UI polish e testing (2-3h)

**Output:** Calendario completo + Google sync + conflicts ⏳

**File chiave da creare:**
- `src/components/calendar/CalendarView.tsx`
- `src/components/calendar/EventModal.tsx`
- `src/lib/google/auth.ts`
- `src/lib/google/calendar.ts`
- `src/lib/conflicts/detectConflicts.ts`

---

### 🔜 WEEK 3: Analytics + Journaling
**Tempo:** 14-21 ore  
**Status:** Not started

**Tasks:**
- [ ] Time Analytics Dashboard (6-8h)
- [ ] Grafici Recharts (categorization, patterns) (4-5h)
- [ ] Progressive Journaling System (5-7h)
- [ ] Pattern detection base (3-4h)

**Output:** Analytics completa + journaling funzionante

**Features:**
- Dashboard con visualizzazioni:
  - Tempo per categoria (pie chart)
  - Trend settimanale (line chart)
  - Heatmap produttività
  - Insights automatici
- Sistema journaling:
  - Editor rich text
  - Tag eventi
  - Prompt automatici post-evento
  - Timeline view
  - Search & filter

---

### 🔜 WEEK 4: Monetization + Launch
**Tempo:** 12-18 ore  
**Status:** Not started

**Tasks:**
- [ ] Stripe integration (4-5h)
- [ ] Trial system + paywall (3-4h)
- [ ] Email transazionali Resend (2-3h)
- [ ] Landing page (3-4h)
- [ ] Legal docs (Privacy, ToS) (1-2h)
- [ ] Testing completo + bug fixing (3-4h)
- [ ] SEO base + Lighthouse optimization (1-2h)

**Output:** App completa, live, monetizzabile 🚀

**Deliverables:**
- Stripe Checkout configurato
- Customer portal per gestione subscription
- Email welcome, trial expiring, payment confirmation
- Landing page conversion-focused
- Legal compliance (GDPR)
- Performance optimized (Lighthouse >90)

---

## 📊 Database Schema

### Tables (8 totali)

1. **profiles** - Dati utente estesi
   - Campi: full_name, avatar_url, google_*, trial_ends_at, subscription_status, stripe_*
   - RLS: User can only access own profile

2. **events** - Eventi calendario
   - Campi: title, description, start_time, end_time, category, google_event_id, energy_level, importance
   - Indexes: user_id, start_time, google_event_id
   - RLS: User can only access own events

3. **journal_entries** - Note diario
   - Campi: event_id, content, mood, energy_rating, tags
   - Index: user_id, event_id, created_at, tags (gin)
   - RLS: User can only access own entries

4. **analytics_cache** - Pre-computed analytics
   - Campi: period_type, period_start, period_end, metrics (jsonb)
   - Per performance: evita ricalcolo real-time
   - RLS: User can only access own cache

5. **smart_conflicts** - Rilevamento conflitti
   - Campi: event_id, conflict_type, severity, description, suggestion, resolved
   - Types: direct_overlap, overload, goal_impact, recovery_needed
   - RLS: User can only access own conflicts

6. **subscription_events** - Stripe webhooks
   - Campi: stripe_event_id, event_type, data (jsonb), processed
   - Per tracking pagamenti e cancellazioni
   - RLS: Service role only

7. **Auth tables** - Gestite da Supabase
   - auth.users (built-in)
   - Trigger auto-create profile on signup

---

## 🎨 UI/UX Design

### Color Scheme (Tailwind CSS Variables)
- **Primary:** Blue (#3b82f6) - Actions, CTA
- **Secondary:** Gray - Muted elements
- **Destructive:** Red - Errori, warning critici
- **Success:** Green - Conferme
- **Muted:** Gray - Testo secondario

### Category Colors
- **Meeting:** Blue
- **Deep Work:** Purple
- **Admin:** Red
- **Personal:** Green
- **Break:** Amber
- **Other:** Gray

### Layout
- **Sidebar:** 256px fixed (desktop), hidden mobile
- **Main content:** Flex 1, scrollable
- **Mobile:** Bottom tab navigation (TODO v1.1)

---

## 🚀 Post-Launch Roadmap

### v1.1 (2-4 settimane post-launch)
- [ ] Voice-First Quick Capture (Whisper API)
- [ ] Energy-Based Scheduling (basic)
- [ ] Mobile app wrapper (Capacitor)
- [ ] Export dati (JSON/CSV)
- [ ] Dark mode toggle UI

### v1.2 (2-3 mesi)
- [ ] Context-Aware Scheduling (ML-based)
- [ ] Integrazione Notion/Todoist
- [ ] Team features beta (pivot B2B)
- [ ] Public API alpha
- [ ] Advanced analytics (ML insights)

### v2.0 (6+ mesi)
- [ ] Full B2B offering
- [ ] Team dashboard & admin console
- [ ] Mobile native apps (iOS + Android)
- [ ] White-label option
- [ ] Enterprise pricing tier

---

## 📈 KPI & Metriche da Tracciare

### Acquisition
- [ ] Visite landing page
- [ ] Signup rate (trial start)
- [ ] Source (organic/referral/ads)
- [ ] Cost per acquisition (CPA)

### Activation
- [ ] % connette Google Calendar
- [ ] % crea primo evento
- [ ] % scrive primo journal entry
- [ ] Time to first value (minuti)

### Retention
- [ ] DAU/MAU ratio (target: >20%)
- [ ] Sessioni per utente/settimana (target: 5+)
- [ ] Churn rate settimanale (target: <5%)
- [ ] Feature usage (quali features più usate)

### Revenue
- [ ] Trial → Paid conversion (target: >15%)
- [ ] MRR (Monthly Recurring Revenue)
- [ ] LTV (Lifetime Value) (target: >€60)
- [ ] Churn mensile (target: <5%)

### Product
- [ ] Feature più/meno usata
- [ ] Tempo medio su analytics
- [ ] # journal entries per utente/mese
- [ ] # conflitti risolti

---

## ⚠️ Risks & Mitigation

### Technical Risks

**Risk:** Complessità Google Calendar OAuth  
**Impact:** Alto (feature core)  
**Mitigation:** Usa librerie battle-tested, dedica tempo extra, fallback manuale

**Risk:** Stripe webhook setup  
**Impact:** Alto (no business senza)  
**Mitigation:** Testing locale con Stripe CLI, monitoring alert

**Risk:** Performance con molti eventi  
**Impact:** Medio  
**Mitigation:** Pagination, virtual scrolling, analytics pre-computed

### Business Risks

**Risk:** Low conversion rate  
**Impact:** Alto  
**Mitigation:** Trial generoso (14 giorni), onboarding guidato, valore immediato

**Risk:** High churn  
**Impact:** Alto  
**Mitigation:** Email engagement, feature rollout continuo, support proattivo

**Risk:** Mercato saturo (Google Calendar, Notion Calendar, etc.)  
**Impact:** Medio  
**Mitigation:** Focus su differenziatori (journaling, analytics, smart conflicts), nicchia specifica

---

## 🎯 Success Criteria

### Minimum Viable Success (30 giorni post-launch)
- 50+ trial signups
- 10%+ conversion = 5+ utenti paganti
- €25/mese MRR
- <€10/mese costi
- **€15/mese profitto**

### Optimistic Target
- 200+ trial signups
- 15%+ conversion = 30 utenti paganti
- €150/mese MRR
- **€140/mese profitto**

### Stretch Goal
- 500+ signups
- 20%+ conversion = 100 utenti paganti
- €500/mese MRR
- **€450/mese profitto**

**Side Project Income Goal:** €200-500/mese entro 3 mesi

---

## 🛠️ Tools & Resources

### Development
- **IDE:** VS Code + extensions (ESLint, Prettier, Tailwind)
- **API Testing:** Postman / Insomnia
- **Database:** Supabase dashboard + SQL Editor
- **Debugging:** React DevTools, Redux DevTools

### Design
- **UI Components:** shadcn/ui (copy-paste)
- **Icons:** Lucide React
- **Colors:** Tailwind default palette
- **Inspiration:** Linear, Notion, Motion app

### Marketing (Post-launch)
- **Landing:** Vercel (stesso deploy)
- **Email:** Resend (transactional) + Mailchimp (marketing)
- **Analytics:** Plausible (privacy-friendly)
- **Social:** Twitter, Reddit (r/SideProject, r/productivity)

---

## 📚 Documentation

### User-Facing
- [ ] README.md ✅
- [ ] QUICKSTART.md ✅
- [ ] Help Center (post-launch)
- [ ] Video tutorials (post-launch)

### Developer
- [ ] API documentation (v1.2)
- [ ] Database schema ✅
- [ ] Contributing guide (se open-source)
- [ ] Changelog (da v1.0)

### Legal
- [ ] Privacy Policy (Week 4)
- [ ] Terms of Service (Week 4)
- [ ] Cookie Policy (se necessario)

---

## 🎓 Lessons Learned (da aggiornare)

### Technical
- *Da riempire durante sviluppo*

### Business
- *Da riempire post-launch*

### Product
- *Da riempire con feedback utenti*

---

## 🤝 Contributors

**Developer:** Tu + Claude AI Assistant  
**Design:** Tailwind CSS + shadcn/ui  
**Infrastructure:** Supabase + Vercel

---

## 📞 Support & Contact

**Development Questions:** Claude AI in questo progetto  
**Bug Reports:** GitHub Issues (quando pubblico)  
**Feature Requests:** GitHub Discussions  
**Business Inquiries:** [tua email]

---

## 📜 License

TBD - Probabilmente proprietario per ora, MIT se open-source futuro

---

**Last Updated:** 6 Novembre 2025  
**Next Review:** Fine Week 2  
**Version:** 1.0.0-alpha

---

## ✅ Quick Status Check

- [x] Project initialized
- [x] Database schema created
- [x] Authentication working
- [x] Basic UI complete
- [x] Deployed to Vercel
- [ ] Calendar implementation (Week 2)
- [ ] Google sync (Week 2)
- [ ] Analytics (Week 3)
- [ ] Journaling (Week 3)
- [ ] Monetization (Week 4)
- [ ] Launch! 🚀

**Current Phase:** Week 1 Complete → Starting Week 2  
**Overall Progress:** 25% (1/4 weeks)  
**On Track:** ✅ YES

---

**Ready to build something amazing! 💪🚀**
