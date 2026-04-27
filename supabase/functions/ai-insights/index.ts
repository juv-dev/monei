import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function jsonResponse(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

function verifyUser(req: Request): { id: string } | null {
  const authHeader = req.headers.get('Authorization')
  if (!authHeader?.startsWith('Bearer ')) return null

  try {
    const token = authHeader.slice(7)
    const payload = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')))
    if (!payload?.sub) return null
    if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) return null
    return { id: payload.sub }
  } catch {
    return null
  }
}

const GEMINI_MODEL = 'gemini-2.5-flash-lite'
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`

const SYSTEM_PROMPT = `Eres MoneiAI, un asesor financiero personal experto e inteligente. Analizas datos financieros reales del usuario y das insights accionables.

REGLAS:
- Usa montos en Soles (S/)
- Sé directo, práctico y específico con los números del usuario
- Personaliza cada consejo basado en los datos reales
- Identifica patrones y oportunidades que el usuario no ve
- Usa un tono profesional pero cercano

Responde SOLO con un JSON válido (sin markdown, sin backticks) con esta estructura exacta:
{
  "calificacion": "A" | "B" | "C" | "D" | "F",
  "calificacionDetalle": "Explicación breve de por qué esa calificación",
  "resumen": "Párrafo de 3-4 oraciones con análisis profundo de la situación financiera. Incluye datos específicos del usuario.",
  "saludFinanciera": {
    "ingresosVsGastos": { "estado": "positivo" | "neutro" | "negativo", "detalle": "..." },
    "nivelDeuda": { "estado": "bajo" | "moderado" | "alto" | "critico", "detalle": "..." },
    "usoCredito": { "estado": "optimo" | "aceptable" | "elevado" | "peligroso", "detalle": "..." }
  },
  "potencialAhorro": {
    "montoMensual": 0,
    "estrategia": "Explicación de cómo lograr ese ahorro"
  },
  "planAccion": [
    { "prioridad": 1, "accion": "...", "impacto": "alto" | "medio" | "bajo", "categoria": "ahorro" | "deuda" | "gasto" | "credito" | "ingreso" },
    { "prioridad": 2, "accion": "...", "impacto": "...", "categoria": "..." },
    { "prioridad": 3, "accion": "...", "impacto": "...", "categoria": "..." },
    { "prioridad": 4, "accion": "...", "impacto": "...", "categoria": "..." },
    { "prioridad": 5, "accion": "...", "impacto": "...", "categoria": "..." }
  ],
  "alertas": [
    { "tipo": "urgente" | "importante" | "preventiva", "mensaje": "..." }
  ],
  "proyeccion": {
    "optimista": "Escenario si sigue el plan de acción",
    "actual": "Escenario si mantiene hábitos actuales"
  },
  "metaSugerida": {
    "descripcion": "Meta financiera concreta y alcanzable para los próximos 3 meses",
    "montoObjetivo": 0,
    "plazoMeses": 3
  }
}`

const CHAT_SYSTEM_PROMPT = `Eres MoneiAI, un asesor financiero personal experto. El usuario te ha proporcionado sus datos financieros y ahora te hace preguntas de seguimiento.

REGLAS:
- Usa montos en Soles (S/)
- Responde de forma clara, directa y útil
- Basa tus respuestas en los datos financieros proporcionados
- Si no tienes suficiente información para responder algo específico, dilo honestamente
- Mantén un tono profesional pero cercano
- Respuestas concisas (máximo 3-4 párrafos)
- NO respondas en JSON, responde en texto natural con formato claro
- Puedes usar viñetas o listas si mejoran la claridad`

async function callGemini(
  apiKey: string,
  systemPrompt: string,
  contents: { role: string; parts: { text: string }[] }[],
  useJsonMode = false,
) {
  const body: Record<string, unknown> = {
    system_instruction: { parts: [{ text: systemPrompt }] },
    contents,
    generationConfig: {
      maxOutputTokens: useJsonMode ? 2048 : 800,
      temperature: 0.7,
      thinkingConfig: { thinkingBudget: 0 },
    },
  }

  const response = await fetch(`${GEMINI_URL}?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })

  if (!response.ok) {
    const errorText = await response.text()
    console.error('Gemini API error:', response.status, errorText)
    throw new Error(`Gemini ${response.status}: ${errorText}`)
  }

  const result = await response.json()
  // Find the last text part (skips thinking parts in models that support it)
  const parts: { text?: string; thought?: boolean }[] = result.candidates?.[0]?.content?.parts ?? []
  const textPart = parts.filter((p) => !p.thought && p.text).at(-1)
  return textPart?.text ?? ''
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const user = await verifyUser(req)
    if (!user) {
      return jsonResponse({ error: 'Unauthorized' }, 401)
    }

    const geminiApiKey = Deno.env.get('GEMINI_API_KEY')
    if (!geminiApiKey) {
      return jsonResponse({ error: 'AI service not configured' }, 500)
    }

    const body = await req.json()
    const { financialData, action = 'analyze', message, conversationHistory = [] } = body

    if (action === 'chat') {
      const systemPrompt = `${CHAT_SYSTEM_PROMPT}\n\nDatos financieros del usuario:\n${JSON.stringify(financialData, null, 2)}`

      // Map conversation history: Anthropic "assistant" → Gemini "model"
      const contents = [
        ...conversationHistory.map((m: { role: string; content: string }) => ({
          role: m.role === 'assistant' ? 'model' : 'user',
          parts: [{ text: m.content }],
        })),
        { role: 'user', parts: [{ text: message }] },
      ]

      const reply = await callGemini(geminiApiKey, systemPrompt, contents, false)
      return jsonResponse({ reply })
    }

    // action === 'analyze'
    const contents = [
      {
        role: 'user',
        parts: [{ text: `Analiza estos datos financieros y genera un análisis completo:\n${JSON.stringify(financialData, null, 2)}` }],
      },
    ]

    const text = await callGemini(geminiApiKey, SYSTEM_PROMPT, contents, true)
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) throw new Error('No JSON in response')
    const analysis = JSON.parse(jsonMatch[0])
    return jsonResponse({ analysis })
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error)
    console.error('Edge function error:', msg)
    return jsonResponse({ error: msg }, 500)
  }
})
