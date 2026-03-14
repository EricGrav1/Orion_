interface ImportedDocumentSection {
  title: string;
  body: string;
  sourceRef?: string;
}

interface ImportedDocumentPayload {
  kind: 'text' | 'pdf' | 'docx' | 'pptx';
  title: string;
  rawText: string;
  sections: ImportedDocumentSection[];
}

interface OutlineSection {
  title: string;
  summary: string;
  bullets: string[];
}

interface StructuredOutline {
  title: string;
  description: string;
  recommendedBlueprint: 'course' | 'microlearning' | 'storyline';
  objectives: string[];
  sections: OutlineSection[];
  assessmentPrompt: string;
}

type AiProvider = 'openai' | 'moonshot';

function extractJsonObject(text: string): unknown | null {
  const firstBrace = text.indexOf('{');
  const lastBrace = text.lastIndexOf('}');
  if (firstBrace < 0 || lastBrace <= firstBrace) return null;
  const sliced = text.slice(firstBrace, lastBrace + 1).trim();
  try {
    return JSON.parse(sliced);
  } catch {
    return null;
  }
}

function normalizeWhitespace(value: string): string {
  return value
    .replace(/\r\n?/g, '\n')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/[ \t]{2,}/g, ' ')
    .trim();
}

function toSentences(text: string): string[] {
  return normalizeWhitespace(text)
    .split(/(?<=[.!?])\s+/)
    .map((sentence) => sentence.trim())
    .filter(Boolean);
}

function fallbackOutline(
  document: ImportedDocumentPayload,
  preferredBlueprint: 'course' | 'microlearning' | 'storyline'
): StructuredOutline {
  const sections = document.sections.slice(0, preferredBlueprint === 'microlearning' ? 3 : 8).map((section) => {
    const bullets = toSentences(section.body).slice(0, 4);
    return {
      title: section.title || 'Section',
      summary: bullets[0] || section.body.slice(0, 180),
      bullets: bullets.length > 0 ? bullets : [section.body.slice(0, 180)],
    };
  });

  if (sections.length === 0) {
    const bullets = toSentences(document.rawText).slice(0, 4);
    sections.push({
      title: 'Overview',
      summary: bullets[0] || 'Imported source overview.',
      bullets,
    });
  }

  return {
    title: document.title || 'AI Generated Course',
    description: normalizeWhitespace(document.rawText).slice(0, 220),
    recommendedBlueprint: preferredBlueprint,
    objectives: sections.slice(0, 3).map((section) => section.summary),
    sections,
    assessmentPrompt:
      'Create a short assessment that checks core understanding and practical application from the imported source.',
  };
}

function isValidDocument(value: unknown): value is ImportedDocumentPayload {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Partial<ImportedDocumentPayload>;
  return (
    (candidate.kind === 'text' ||
      candidate.kind === 'pdf' ||
      candidate.kind === 'docx' ||
      candidate.kind === 'pptx') &&
    typeof candidate.title === 'string' &&
    typeof candidate.rawText === 'string' &&
    Array.isArray(candidate.sections)
  );
}

function buildPrompt(document: ImportedDocumentPayload, preferredBlueprint: string): string {
  return `
You are an instructional design engine.
Transform the imported source into a structured course outline JSON.

Preferred blueprint: ${preferredBlueprint}
Document kind: ${document.kind}
Document title: ${document.title}

Document text:
${document.rawText.slice(0, 140000)}

Required JSON schema:
{
  "title": "string",
  "description": "string",
  "recommendedBlueprint": "course|microlearning|storyline",
  "objectives": ["string"],
  "sections": [
    {
      "title": "string",
      "summary": "string",
      "bullets": ["string"]
    }
  ],
  "assessmentPrompt": "string"
}

Constraints:
- Keep sections focused and sequenced.
- Keep bullets concrete and learner-facing.
- Always return strictly valid JSON object only.
  `.trim();
}

async function generateWithOpenAI(
  document: ImportedDocumentPayload,
  preferredBlueprint: 'course' | 'microlearning' | 'storyline'
): Promise<
  | { outline: StructuredOutline; usedModel: string; error: null }
  | { outline: null; usedModel: string; error: string }
  | null
> {
  const apiKey = Deno.env.get('OPENAI_API_KEY');
  if (!apiKey) return null;

  const model = Deno.env.get('OPENAI_MODEL') || 'gpt-4.1-mini';
  const prompt = buildPrompt(document, preferredBlueprint);
  let response: Response;
  try {
    response = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        input: prompt,
        temperature: 0.2,
        max_output_tokens: 2200,
      }),
    });
  } catch (error) {
    return {
      outline: null,
      usedModel: model,
      error: error instanceof Error ? error.message : 'OpenAI request failed to send.',
    };
  }

  if (!response.ok) {
    const errorText = await response.text().catch(() => '');
    const compact = errorText.replace(/\s+/g, ' ').trim().slice(0, 240);
    return {
      outline: null,
      usedModel: model,
      error: `OpenAI error ${response.status}: ${compact || 'Unknown error'}`,
    };
  }

  const payload = await response.json().catch(() => null);
  if (!payload) {
    return { outline: null, usedModel: model, error: 'OpenAI response JSON parse failed.' };
  }
  const directText = payload?.output_text as string | undefined;
  const candidateText =
    directText ||
    payload?.output?.[0]?.content?.find?.((item: unknown) => (item as { type?: string }).type === 'output_text')?.text ||
    payload?.output?.[0]?.content?.[0]?.text;
  if (typeof candidateText !== 'string' || candidateText.trim().length === 0) {
    return { outline: null, usedModel: model, error: 'OpenAI returned no output text.' };
  }

  const parsed = extractJsonObject(candidateText) as StructuredOutline | null;
  if (!parsed || typeof parsed !== 'object') {
    return { outline: null, usedModel: model, error: 'OpenAI returned non-JSON output.' };
  }
  if (!Array.isArray(parsed.sections) || parsed.sections.length === 0) {
    return { outline: null, usedModel: model, error: 'OpenAI JSON missing sections.' };
  }
  return { outline: parsed, usedModel: model, error: null };
}

async function generateWithMoonshot(
  document: ImportedDocumentPayload,
  preferredBlueprint: 'course' | 'microlearning' | 'storyline'
): Promise<
  | { outline: StructuredOutline; usedModel: string; error: null }
  | { outline: null; usedModel: string; error: string }
  | null
> {
  const apiKey = Deno.env.get('MOONSHOT_API_KEY');
  if (!apiKey) return null;

  const baseUrl = (Deno.env.get('MOONSHOT_BASE_URL') || 'https://api.moonshot.ai/v1').replace(/\/+$/, '');
  const model = Deno.env.get('MOONSHOT_MODEL') || 'kimi-k2-thinking';
  const prompt = buildPrompt(document, preferredBlueprint);

  let response: Response;
  try {
    response = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: 'Return only valid JSON. Do not wrap in markdown.' },
          { role: 'user', content: prompt },
        ],
        temperature: 0.2,
        max_tokens: 2200,
      }),
    });
  } catch (error) {
    return {
      outline: null,
      usedModel: model,
      error: error instanceof Error ? error.message : 'Moonshot request failed to send.',
    };
  }

  if (!response.ok) {
    const errorText = await response.text().catch(() => '');
    const compact = errorText.replace(/\s+/g, ' ').trim().slice(0, 240);
    return {
      outline: null,
      usedModel: model,
      error: `Moonshot error ${response.status}: ${compact || 'Unknown error'}`,
    };
  }

  const payload = await response.json().catch(() => null);
  if (!payload) {
    return { outline: null, usedModel: model, error: 'Moonshot response JSON parse failed.' };
  }

  const candidateText =
    payload?.choices?.[0]?.message?.content ??
    payload?.choices?.[0]?.text ??
    null;

  if (typeof candidateText !== 'string' || candidateText.trim().length === 0) {
    return { outline: null, usedModel: model, error: 'Moonshot returned no output text.' };
  }

  const parsed = extractJsonObject(candidateText) as StructuredOutline | null;
  if (!parsed || typeof parsed !== 'object') {
    return { outline: null, usedModel: model, error: 'Moonshot returned non-JSON output.' };
  }
  if (!Array.isArray(parsed.sections) || parsed.sections.length === 0) {
    return { outline: null, usedModel: model, error: 'Moonshot JSON missing sections.' };
  }
  return { outline: parsed, usedModel: model, error: null };
}

Deno.serve(async (request) => {
  if (request.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405 });
  }

  try {
    const body = await request.json();
    const preferredBlueprint = body?.preferredBlueprint as 'course' | 'microlearning' | 'storyline' | undefined;
    const document = body?.document as unknown;

    if (!preferredBlueprint || !['course', 'microlearning', 'storyline'].includes(preferredBlueprint)) {
      return Response.json({ error: 'Invalid preferredBlueprint' }, { status: 400 });
    }

    if (!isValidDocument(document)) {
      return Response.json({ error: 'Invalid document payload' }, { status: 400 });
    }

    const provider = (Deno.env.get('AI_PROVIDER') || 'openai').toLowerCase() as AiProvider;
    const aiResult =
      provider === 'moonshot'
        ? await generateWithMoonshot(document, preferredBlueprint)
        : await generateWithOpenAI(document, preferredBlueprint);
    const outline =
      aiResult && aiResult.outline ? aiResult.outline : fallbackOutline(document, preferredBlueprint);
    return Response.json({
      outline,
      meta: {
        provider,
        source: aiResult && aiResult.outline ? provider : 'fallback',
        model: aiResult?.usedModel ?? null,
        providerError: aiResult && !aiResult.outline ? aiResult.error : null,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unexpected error';
    return Response.json({ error: message }, { status: 500 });
  }
});
