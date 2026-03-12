import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

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

async function verifyUser(req: Request) {
  const authHeader = req.headers.get('Authorization')
  if (!authHeader) return null

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
    { global: { headers: { Authorization: authHeader } } },
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()
  return user
}

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

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const user = await verifyUser(req)
    if (!user) {
      return jsonResponse({ error: 'Unauthorized' }, 401)
    }

    const anthropicApiKey = Deno.env.get('ANTHROPIC_API_KEY')
    if (!anthropicApiKey) {
      return jsonResponse({ error: 'AI service not configured' }, 500)
    }

    const body = await req.json()
    const { financialData, action = 'analyze', message, conversationHistory = [] } = body

    let systemPrompt: string
    let messages: { role: string; content: string }[]
    let maxTokens: number

    if (action === 'chat') {
      systemPrompt = `${CHAT_SYSTEM_PROMPT}\n\nDatos financieros del usuario:\n${JSON.stringify(financialData, null, 2)}`
      messages = [
        ...conversationHistory,
        { role: 'user', content: message },
      ]
      maxTokens = 800
    } else {
      systemPrompt = SYSTEM_PROMPT
      messages = [
        {
          role: 'user',
          content: `Analiza estos datos financieros y genera un análisis completo:\n${JSON.stringify(financialData, null, 2)}`,
        },
      ]
      maxTokens = 2048
    }

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': anthropicApiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: maxTokens,
        system: systemPrompt,
        messages,
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('Anthropic API error:', errorText)
      return jsonResponse({ error: 'AI analysis failed' }, 502)
    }

    const aiResponse = await response.json()
    const textContent = aiResponse.content?.[0]?.text ?? '{}'

    if (action === 'chat') {
      return jsonResponse({ reply: textContent })
    }

    const analysis = JSON.parse(textContent)
    return jsonResponse({ analysis })
  } catch (error) {
    console.error('Edge function error:', error)
    return jsonResponse({ error: 'Internal server error' }, 500)
  }
})
