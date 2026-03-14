import http from 'node:http';

const sampleRequest = {
  preferredBlueprint: 'course',
  document: {
    kind: 'pptx',
    title: 'Security Awareness Deck',
    rawText: 'Phishing awareness basics. Report suspicious links. Verify sender identity.',
    sections: [
      {
        title: 'Slide 1',
        body: 'Phishing awareness basics and examples.',
        sourceRef: 'slide-1',
      },
      {
        title: 'Slide 2',
        body: 'How to report suspicious links and verify sender identity.',
        sourceRef: 'slide-2',
      },
    ],
  },
};

function createMockOutlineResponse() {
  return {
    outline: {
      title: 'Security Awareness Training',
      description: 'Practical overview of phishing awareness and reporting workflow.',
      recommendedBlueprint: 'course',
      objectives: [
        'Identify common phishing indicators.',
        'Apply internal reporting process for suspicious messages.',
      ],
      sections: [
        {
          title: 'Recognize Phishing',
          summary: 'Identify high-risk sender, link, and attachment signals.',
          bullets: [
            'Check sender identity and domain mismatches.',
            'Inspect links before clicking.',
            'Treat urgent language as a red flag.',
          ],
        },
        {
          title: 'Report and Respond',
          summary: 'Escalate suspicious content through the approved channel.',
          bullets: [
            'Use the internal report workflow.',
            'Do not forward suspicious links externally.',
            'Follow containment guidance.',
          ],
        },
      ],
      assessmentPrompt:
        'Create a short scenario assessment asking the learner to decide if a message is phishing and pick the correct reporting step.',
    },
  };
}

function assertValidOutlinePayload(payload) {
  if (!payload || typeof payload !== 'object') throw new Error('Payload is not an object');
  if (!payload.outline || typeof payload.outline !== 'object') throw new Error('Missing outline object');
  const outline = payload.outline;
  if (typeof outline.title !== 'string' || outline.title.length === 0) throw new Error('Invalid outline.title');
  if (!Array.isArray(outline.sections) || outline.sections.length === 0) throw new Error('Invalid outline.sections');
  if (!Array.isArray(outline.objectives)) throw new Error('Invalid outline.objectives');
  if (typeof outline.assessmentPrompt !== 'string' || outline.assessmentPrompt.length === 0) {
    throw new Error('Invalid outline.assessmentPrompt');
  }
}

async function run() {
  let requestSeen = false;
  const server = http.createServer((req, res) => {
    if (req.method !== 'POST' || req.url !== '/ai-import-outline') {
      res.statusCode = 404;
      res.end('Not Found');
      return;
    }

    const chunks = [];
    req.on('data', (chunk) => chunks.push(chunk));
    req.on('end', () => {
      try {
        requestSeen = true;
        const body = JSON.parse(Buffer.concat(chunks).toString('utf8'));
        if (body?.preferredBlueprint !== 'course' || !body?.document?.rawText) {
          res.statusCode = 400;
          res.setHeader('content-type', 'application/json');
          res.end(JSON.stringify({ error: 'Bad payload' }));
          return;
        }
        res.statusCode = 200;
        res.setHeader('content-type', 'application/json');
        res.end(JSON.stringify(createMockOutlineResponse()));
      } catch (error) {
        res.statusCode = 500;
        res.setHeader('content-type', 'application/json');
        res.end(JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }));
      }
    });
  });

  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const address = server.address();
  if (!address || typeof address === 'string') throw new Error('Could not resolve mock server address.');
  const endpoint = `http://127.0.0.1:${address.port}/ai-import-outline`;

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(sampleRequest),
  });
  if (!response.ok) {
    throw new Error(`Mock endpoint returned ${response.status}`);
  }
  const payload = await response.json();
  assertValidOutlinePayload(payload);
  if (!requestSeen) throw new Error('Mock server did not observe request.');

  await new Promise((resolve) => server.close(resolve));

  let failedAsExpected = false;
  try {
    await fetch(endpoint, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(sampleRequest),
    });
  } catch {
    failedAsExpected = true;
  }

  if (!failedAsExpected) {
    throw new Error('Expected endpoint to fail after shutdown, but request succeeded.');
  }

  console.log('✅ AI outline endpoint smoke test passed.');
  console.log('   - Remote contract path validated against mock endpoint.');
  console.log('   - Endpoint failure path validated (used to trigger client fallback).');
}

run().catch((error) => {
  console.error('❌ AI outline endpoint smoke test failed.');
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});

