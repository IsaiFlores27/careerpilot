# CareerPilot — Guía de configuración

## Prerequisitos

- Node.js 18+
- Cuenta en [Supabase](https://supabase.com) (gratis)
- Cuenta en [Vercel](https://vercel.com) (gratis)
- API Key de [Google AI Studio](https://aistudio.google.com/apikey) (Gemini — tiene capa gratis)

## 1. Configurar Supabase

1. Crea un nuevo proyecto en Supabase
2. Ve a **SQL Editor** y ejecuta el contenido de `supabase/migrations/001_initial.sql`
3. Ve a **Storage** → Crea un bucket llamado `resumes` con visibilidad **privada**
4. Ve a **Settings → API** y copia:
   - Project URL → `NEXT_PUBLIC_SUPABASE_URL`
   - anon/public key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - service_role key → `SUPABASE_SERVICE_ROLE_KEY`
5. Ve a **Authentication → Providers** y activa Google (opcional)

## 2. Configurar variables de entorno

Copia `.env.local` y rellena los valores:

```bash
# Supabase (del paso 1)
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGci...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGci...

# Google Gemini (obligatorio)
GEMINI_API_KEY=AIza...     # aistudio.google.com/apikey

# APIs de empleo (OPCIONALES — Gemini con Google Search ya busca vacantes reales.
# Estas solo agregan cobertura extra si las configuras)
RAPIDAPI_KEY=              # JSearch: rapidapi.com/letscrape-6bRBa3QguO5/api/jsearch
ADZUNA_APP_ID=             # adzuna.com/api
ADZUNA_APP_KEY=
JOOBLE_API_KEY=            # jooble.org/api/index.aspx

# Email (para alertas y recordatorios)
RESEND_API_KEY=            # resend.com

# Seguridad del cron (genera un string aleatorio)
CRON_SECRET=tu-secret-aleatorio-aqui
```

## 3. Arrancar en desarrollo

```bash
npm install
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000)

## 4. Desplegar en Vercel

```bash
npx vercel
```

O conecta el repositorio en [vercel.com/new](https://vercel.com/new) y agrega las variables de entorno en el dashboard.

## Flujo de uso

1. **Regístrate** y completa tu perfil (puesto objetivo, industria, ubicación, radio)
2. **Sube tu CV** (PDF o Word) → análisis automático con IA (~20 segundos)
3. **Revisa el diagnóstico**: ATS Score, bullets débiles, prioridades
4. **Optimiza para ATS**: el agente reescribe tu CV con logros medibles
5. **Busca vacantes**: Gemini busca en internet (Google Search) vacantes reales y actuales en tu radio, + APIs externas si las configuraste
6. **Adapta tu CV** a vacantes específicas con un clic
7. **Usa el coach**: plan 7 días, mensajes en frío, cartas, prep de entrevista
8. **Optimiza LinkedIn**: titular, Acerca de, aptitudes listas para copiar/pegar

## Fases implementadas

- ✅ **Fase 1**: Auth, subida de CV, análisis con IA, diagnóstico ATS, render PDF
- ✅ **Fase 2**: Búsqueda de vacantes multi-fuente, deduplicación, radio geográfico
- ✅ **Fase 3**: Chat coach streaming, 5 módulos (plan, mensajes, cartas, prep, follow-up)
- ✅ **Fase 4**: 3 crons automatizados (alertas, recordatorios, reporte semanal)
- 🔜 **Fase 5**: Plantillas adicionales, multi-idioma, Stripe

## Modelos de IA usados (Google Gemini)

| Tarea | Modelo | Por qué |
|-------|--------|---------|
| Análisis y optimización de CV | `gemini-3.5-flash` | Calidad alta + lectura nativa de PDF |
| Chat coach (streaming + tools) | `gemini-3.5-flash` | Function calling y streaming en vivo |
| LinkedIn | `gemini-3.5-flash` | Redacción de calidad |
| **Búsqueda de vacantes** | `gemini-3.5-flash` + **Google Search grounding** | Busca vacantes reales en internet en tiempo real |
| Embeddings (matching pgvector) | `gemini-embedding-001` (1536 dims) | Casi gratis |
| Follow-up, scoring, reporte semanal | `gemini-2.5-flash-lite` | Tareas mecánicas, ~10× más barato |

La capa de IA está en `lib/gemini/` (cliente, generate, embeddings) y los agentes en `lib/ai/agents/`.
Para cambiar de modelo, edita `GEMINI_MODELS` en `lib/gemini/client.ts`.

### ¿Cómo encuentra las vacantes?

`lib/jobs/gemini-search.ts` usa Gemini con la herramienta `googleSearch` (grounding):
busca en Google en tiempo real, extrae las vacantes con sus URLs reales y las normaliza.
Las APIs externas (`jsearch`, `adzuna`, `jooble`) solo se ejecutan si configuras sus keys,
y el agregador (`lib/jobs/aggregator.ts`) deduplica todo.

## Estimación de costo mensual por usuario activo

~$1–2.5 USD/mes con Gemini → margen amplio con plan Pro de $12–19 USD/mes.
La capa gratuita de Gemini cubre todo el desarrollo del MVP sin costo.
