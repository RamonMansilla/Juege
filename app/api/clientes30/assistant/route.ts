import OpenAI from "openai";
import { z } from "zod";

const messageSchema = z.object({ role: z.enum(["user", "assistant"]), content: z.string().min(1).max(600) });
const profileSchema = z.object({ name: z.string().max(80).optional(), headline: z.string().max(140).optional(), description: z.string().max(1000).optional(), appointment_type: z.string().max(100).optional(), rate_label: z.string().max(80).optional() }).optional();
const responseSchema = z.object({ reply: z.string().min(1).max(450), draft: z.object({ name: z.string().max(80), headline: z.string().max(140), description: z.string().max(1000), appointment_type: z.string().max(100), rate_label: z.string().max(80) }) });
const outputSchema = {
  type: "object",
  properties: {
    reply: { type: "string" },
    draft: { type: "object", properties: { name: { type: "string" }, headline: { type: "string" }, description: { type: "string" }, appointment_type: { type: "string" }, rate_label: { type: "string" } }, required: ["name", "headline", "description", "appointment_type", "rate_label"], additionalProperties: false },
  },
  required: ["reply", "draft"], additionalProperties: false,
};

export const runtime = "nodejs";
const requests = new Map<string, { start: number; count: number }>();
const WINDOW_MS = 60 * 60 * 1000;
const MAX_REQUESTS = 12;

function overLimit(request: Request) {
  const ip = request.headers.get("x-real-ip") || request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const now = Date.now();
  const state = requests.get(ip);
  if (!state || now - state.start > WINDOW_MS) { requests.set(ip, { start: now, count: 1 }); return false; }
  state.count += 1;
  return state.count > MAX_REQUESTS;
}

export async function POST(request: Request) {
  if (overLimit(request)) return Response.json({ error: "Has enviado varios mensajes. Inténtalo más tarde." }, { status: 429 });
  if (!process.env.OPENAI_API_KEY) return Response.json({ error: "El chat aún no está conectado. Configura OPENAI_API_KEY en Vercel." }, { status: 503 });
  let body: unknown;
  try { body = await request.json(); } catch { return Response.json({ error: "Mensaje no válido." }, { status: 400 }); }
  const parsed = z.object({ messages: z.array(messageSchema).min(1).max(8), profile: profileSchema }).safeParse(body);
  if (!parsed.success) return Response.json({ error: "Envía hasta 8 mensajes de 600 caracteres." }, { status: 400 });

  const history = parsed.data.messages.map((message) => ({ role: message.role, content: message.content }));
  const current = { name: "", headline: "", description: "", appointment_type: "", rate_label: "Tarifa a consultar", ...parsed.data.profile };
  try {
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const response = await openai.responses.create({
      model: process.env.OPENAI_MODEL || "gpt-6-astra",
      store: false,
      instructions: [
        "Eres un asistente editorial de JUEGUE Callao. Responde en español chileno breve y cordial.",
        "Ayuda a escribir perfiles de mujeres adultas que ofrecen compañía social para citas, cenas, paseos y conversación. Mantén el texto sugerente, respetuoso y no explícito; no describas ni propongas servicios sexuales, actos íntimos, contenido erótico, drogas, violencia, menores o promesas no verificables.",
        "No inventes edad, disponibilidad, ubicación exacta, identidad, experiencia, precio ni condiciones. Conserva el nombre si ya fue entregado. Cuando no hay tarifa indicada usa 'Tarifa a consultar'. No sugieras publicar; solo propone un borrador editable.",
        "Devuelve un JSON con una respuesta de chat breve y el borrador completo. Si el usuario pide datos no proporcionados, deja el campo vacío y dilo en reply.",
      ].join(" "),
      input: [
        { role: "user", content: "Borrador actual del perfil: " + JSON.stringify(current) },
        ...history,
      ],
      text: { format: { type: "json_schema", name: "juegue_profile_draft", strict: true, schema: outputSchema } },
    });
    const result = responseSchema.safeParse(JSON.parse(response.output_text || "null"));
    if (!result.success) return Response.json({ error: "La IA devolvió una propuesta incompleta. Prueba con una instrucción más breve." }, { status: 502 });
    return Response.json(result.data, { headers: { "cache-control": "no-store" } });
  } catch {
    return Response.json({ error: "No pudimos conectar el chat. Inténtalo de nuevo." }, { status: 502 });
  }
}
