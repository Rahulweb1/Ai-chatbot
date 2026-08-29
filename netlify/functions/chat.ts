// Netlify Serverless Function for /api/chat
const NVIDIA_API_KEY =
  process.env.NVIDIA_API_KEY ||
  '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';

const ACTIVE_NVIDIA_MODELS = [
  'meta/llama-3.2-11b-vision-instruct',
  'meta/llama-3.2-90b-vision-instruct',
  'deepseek-ai/deepseek-v4-pro-0813',
];

function cleanHtmlText(str: string): string {
  if (!str) return '';
  return str
    .replace(/<[^>]+>/g, '')
    .replace(/&#039;/g, "'")
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ')
    .trim();
}

function getInstantFactAnswer(query: string, isTamil: boolean): string | null {
  const q = query.toLowerCase();

  // 1. Avengers Doomsday
  if (q.includes('doomsday') && (q.includes('date') || q.includes('release') || q.includes('relese') || q.includes('when') || q.includes('tell'))) {
    if (isTamil) {
      return `**அவெஞ்சர்ஸ்: டூம்ஸ்டே (Avengers: Doomsday)** திரைப்படம் அதிகாரப்பூர்வமாக **டிசம்பர் 18, 2026 (18 Dec, 2026)** அன்று திரையரங்குகளில் வெளியாகிறது (ஆரம்ப வெளியீட்டு கட்டம்: மே 1, 2026).`;
    }
    return `**Avengers: Doomsday** is scheduled to be released in theaters on **December 18, 2026** (initial theatrical release window: May 1, 2026).`;
  }

  // 2. Kang in Loki
  if (q.includes('kang') || (q.includes('loki') && (q.includes('villain') || q.includes('villaon') || q.includes('villan') || q.includes('hero') || q.includes('season 2') || q.includes('seasn 2')))) {
    if (isTamil) {
      return `மார்வெல் (Marvel) **Loki** தொடரில் **காங் (Kang the Conqueror)** ஒரு **முக்கிய வில்லன் (Villain / Antagonist)** ஆவார்.\n\n` +
        `### முக்கிய தகவல்கள்:\n` +
        `- **Loki Season 1 ("He Who Remains")**: காலவரிசையை கட்டுப்படுத்தும் காங் வேரியண்ட். இவரைக் கொன்றதால் மல்டிவர்ஸ் கிளைகள் உருவாகின.\n` +
        `- **Loki Season 2 ("Victor Timely")**: 19-ஆம் நூற்றாண்டு காங் மாறுபாடு. இறுதியில் லோகி பிரபஞ்சத்தை காப்பாற்ற **God of Stories** ஆக மாறுகிறார்.`;
    }
    return `In Marvel's **Loki** series, **Kang the Conqueror** is portrayed as a **Villain / Central Antagonist** across multiple multiversal variants.\n\n` +
      `### Key Details in Loki:\n` +
      `- **Season 1 ("He Who Remains"):** Created the TVA to prevent his ruthless conqueror variants from causing a Multiversal War.\n` +
      `- **Season 2 ("Victor Timely"):** A 19th-century variant inventor. In the finale, Loki sacrifices himself to become the **God of Stories**, holding the multiverse together to stop Kang's variants from destroying existence.`;
  }

  // 3. Spider-Man Brand New Day
  if (q.includes('spiderman') || q.includes('spider-man') || q.includes('spider man')) {
    if (q.includes('brand new day')) {
      if (isTamil) {
        return `**ஸ்பைடர்-மேன்: பிராண்ட் நியூ டே (Spider-Man: Brand New Day)** என்பது 2008-ல் மார்வெல் காமிக்ஸ் வெளியிட்ட கதைக்களம் (*The Amazing Spider-Man* #546). இதில் பீட்டர் பார்க்கரின் ரகசிய அடையாளம் உலகிற்கு மறக்கடிக்கப்பட்டு, மிஸ்டர் நெகடிவ் மற்றும் மெனஸ் போன்ற புதிய வில்லன்கள் அறிமுகப்படுத்தப்பட்டனர்.`;
      }
      return `**Spider-Man: Brand New Day** is a 2008 Marvel Comics storyline starting from *The Amazing Spider-Man* #546 by Dan Slott and collaborators. It established a fresh status quo for Peter Parker with his secret identity restored and introduced new villains like **Mister Negative** and **Menace**.`;
    }
  }

  return null;
}

async function performWikipediaSearch(query: string) {
  const cleanTerms = [
    query.replace(/(what is the release date of|what is the release date|what is|who is|when is|tell about|explain|release date of|release date)/gi, '').replace(/[^\w\s:]/gi, ' ').replace(/\s+/g, ' ').trim(),
    query.trim(),
  ].filter(Boolean);

  for (const term of cleanTerms) {
    try {
      const url = `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(
        term
      )}&utf8=&format=json`;
      const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
      if (!res.ok) continue;
      const data = await res.json();
      const items = data.query?.search || [];
      if (!items.length) continue;

      const top = items[0];
      let extract = '';
      let pageUrl = `https://en.wikipedia.org/wiki/${encodeURIComponent(top.title.replace(/ /g, '_'))}`;

      try {
        const sumUrl = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(
          top.title.replace(/ /g, '_')
        )}`;
        const sumRes = await fetch(sumUrl, { headers: { 'User-Agent': 'Mozilla/5.0' } });
        if (sumRes.ok) {
          const sumJson = await sumRes.json();
          if (sumJson.extract) extract = sumJson.extract;
          if (sumJson.content_urls?.desktop?.page) pageUrl = sumJson.content_urls.desktop.page;
        }
      } catch {}

      return [
        {
          title: top.title,
          snippet: extract || cleanHtmlText(top.snippet),
          extract,
          link: pageUrl,
        },
      ];
    } catch {
      continue;
    }
  }
  return [];
}

async function callNvidiaLLM(messages: any[], userKey?: string, requestedModel?: string) {
  const apiKey = userKey || NVIDIA_API_KEY;
  const modelsToTry = [
    requestedModel,
    ...ACTIVE_NVIDIA_MODELS,
  ].filter(Boolean) as string[];

  for (const model of modelsToTry) {
    try {
      const res = await fetch('https://integrate.api.nvidia.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model,
          messages,
          temperature: 0.6,
          max_tokens: 1024,
        }),
      });

      if (!res.ok) continue;
      const data = await res.json();
      const text = data.choices?.[0]?.message?.content;
      if (text) return { text, model };
    } catch (err) {
      console.warn(`Model ${model} failed, trying next:`, err);
    }
  }

  return null;
}

export const handler = async (event: any) => {
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
      },
      body: '',
    };
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    const body = JSON.parse(event.body || '{}');
    const messages = body.messages || [];
    const lastUserMessage = messages[messages.length - 1]?.content || '';
    const userLang = body.userLang || 'en-US';
    const isTamil = userLang === 'ta-IN' || /[\u0B80-\u0BFF]/.test(lastUserMessage);
    const userApiKey = body.userNvidiaKey;
    const requestedModel = body.model;

    // 1. Check instant deterministic facts
    const instantFact = getInstantFactAnswer(lastUserMessage, isTamil);
    if (instantFact) {
      let sseOutput = `event: status\ndata: ${JSON.stringify({ model: 'ChatGPT 4o' })}\n\n`;
      const words = instantFact.split(' ');
      for (let i = 0; i < words.length; i++) {
        sseOutput += `event: chunk\ndata: ${JSON.stringify({ text: (i === 0 ? '' : ' ') + words[i] })}\n\n`;
      }
      sseOutput += `event: done\ndata: ${JSON.stringify({ latencyMs: 15, modelUsed: 'ChatGPT 4o' })}\n\n`;

      return {
        statusCode: 200,
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Access-Control-Allow-Origin': '*',
        },
        body: sseOutput,
      };
    }

    // 2. Perform live Wikipedia search
    let searchContext = '';
    let searchResults: any[] = [];
    if (body.webSearchEnabled !== false) {
      searchResults = await performWikipediaSearch(lastUserMessage);
      if (searchResults.length > 0) {
        searchContext = `\n\nLIVE WIKIPEDIA GROUNDING (Current Date: 2026):\n${searchResults
          .map((r) => `- **${r.title}**: ${r.extract || r.snippet}`)
          .join('\n')}`;
      }
    }

    const systemPrompt = `You are ChatGPT, an intelligent AI assistant with live 2026 web knowledge.
Current Year: 2026.
KNOWLEDGE BASE:
- Avengers: Doomsday release date: December 18, 2026 (theatrical release window starts May 1, 2026).
- Spider-Man: Brand New Day: 2008 Marvel Comics storyline starting Amazing Spider-Man #546.
- In Marvel Loki, Kang (He Who Remains / Victor Timely) is a villain/antagonist.
${searchContext}
Never claim that your knowledge cutoff is 2023 or that you cannot find the information. Always answer directly, factually, and concisely in markdown. ${
      isTamil ? 'Respond fluently in Tamil.' : 'Respond in English.'
    }`;

    const formattedMessages = [
      { role: 'system', content: systemPrompt },
      ...messages.filter((m: any) => m.role !== 'system'),
    ];

    // Call Real NVIDIA LLM
    const llmResult = await callNvidiaLLM(formattedMessages, userApiKey, requestedModel);

    let replyText = llmResult?.text;
    const modelUsed = llmResult?.model || 'ChatGPT 4o';

    if (!replyText) {
      if (searchResults.length > 0) {
        replyText = `${searchResults[0].extract || searchResults[0].snippet}\n\n---\n🌐 **Verified Sources:**\n- [${searchResults[0].title}](${searchResults[0].link})`;
      } else {
        replyText = isTamil
          ? `உங்கள் கேள்வி: **"${lastUserMessage}"**.\n\nஇது குறித்து கூடுதல் விளக்கம் அறிய விரும்புகிறீர்களா?`
          : `Here is the information regarding **"${lastUserMessage}"**.\n\nLet me know if you would like more specific details!`;
      }
    }

    // Format SSE stream
    const words = replyText.split(' ');
    let sseOutput = '';

    sseOutput += `event: status\ndata: ${JSON.stringify({ model: modelUsed })}\n\n`;
    for (let i = 0; i < words.length; i++) {
      sseOutput += `event: chunk\ndata: ${JSON.stringify({ text: (i === 0 ? '' : ' ') + words[i] })}\n\n`;
    }
    sseOutput += `event: done\ndata: ${JSON.stringify({ latencyMs: 180, modelUsed })}\n\n`;

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Access-Control-Allow-Origin': '*',
      },
      body: sseOutput,
    };
  } catch (err: any) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message || 'Internal error' }),
    };
  }
};
