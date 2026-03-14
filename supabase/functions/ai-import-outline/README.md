# `ai-import-outline` Edge Function

Structured outlining backend for Orion AI import.

## Request

`POST` JSON:

```json
{
  "preferredBlueprint": "course",
  "document": {
    "kind": "pptx",
    "title": "Quarterly Security Training",
    "rawText": "....",
    "sections": [
      {
        "title": "Slide 1",
        "body": "....",
        "sourceRef": "slide-1"
      }
    ]
  }
}
```

## Response

```json
{
  "outline": {
    "title": "Security Training",
    "description": "....",
    "recommendedBlueprint": "course",
    "objectives": ["..."],
    "sections": [
      {
        "title": "Section 1",
        "summary": "...",
        "bullets": ["..."]
      }
    ],
    "assessmentPrompt": "..."
  }
}
```

## Env Vars

- `AI_PROVIDER` (optional, `openai` or `moonshot`, defaults to `openai`)

### OpenAI provider (`AI_PROVIDER=openai`)
- `OPENAI_API_KEY` (optional, enables LLM outlining)
- `OPENAI_MODEL` (optional, defaults to `gpt-4.1-mini`)

### Moonshot (Kimi 2) provider (`AI_PROVIDER=moonshot`)
- `MOONSHOT_API_KEY` (required)
- `MOONSHOT_MODEL` (optional, defaults to `kimi-k2-thinking`)
- `MOONSHOT_BASE_URL` (optional, defaults to `https://api.moonshot.ai/v1`)

If no key is set (or model call fails), the function returns a deterministic fallback outline.

## Frontend Integration

Set:

```bash
VITE_AI_IMPORT_PIPELINE_ENDPOINT=https://<project-ref>.functions.supabase.co/ai-import-outline
```

## End-to-end verification

1. Run local contract smoke test:

```bash
npm run smoke:ai-outline
```

2. Start Orion app with `VITE_AI_IMPORT_PIPELINE_ENDPOINT` configured.
3. Open `AI Import` page and click `Run pipeline test`.
4. Expected:
   - `Remote pipeline active` when endpoint responds with valid outline.
   - `Fallback pipeline active` if endpoint is missing/failing or returns invalid schema.
