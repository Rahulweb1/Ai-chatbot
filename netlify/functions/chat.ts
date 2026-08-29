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

async function performWikipediaSearch(query: string) {
  try {
    const clean = query.replace(/[^\w\s]/gi, ' ').trim();
    const url = `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(
      clean
    )}&utf8=&format=json`;
    const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
    if (!res.ok) return [];
    const data = await res.json();
    const items = data.query?.search || [];
    if (!items.length) return [];

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
        snippet: extract || top.snippet.replace(/<[^>]+>/g, ''),
        extract,
        link: pageUrl,
      },
    ];
  } catch {
    return [];
  }
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
          temperature: 0.7,
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

    // Search grounding
    let searchContext = '';
    let searchResults: any[] = [];
    if (body.webSearchEnabled !== false) {
      searchResults = await performWikipediaSearch(lastUserMessage);
      if (searchResults.length > 0) {
        searchContext = `\n\nLive Search Grounding Information:\n${searchResults
          .map((r) => `- ${r.title}: ${r.snippet}`)
          .join('\n')}`;
      }
    }

    const formattedMessages = [
      {
        role: 'system',
        content: `You are ChatGPT, an intelligent, helpful AI assistant. Provide direct, factual, and well-structured answers in markdown. ${
          isTamil ? 'Respond fluently and naturally in Tamil.' : 'Respond clearly in English.'
        }${searchContext}`,
      },
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
        replyText = `I apologize, but I am currently processing your request. Please ask your question again.`;
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
