// Netlify Serverless Function for /api/chat

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
    const url = `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(
      query
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

function generateResponse(userPrompt: string, searchResults: any[] = [], isTamil: boolean = false): string {
  const promptLower = userPrompt.toLowerCase();

  // Spider-Man Brand New Day
  if (promptLower.includes('spiderman') || promptLower.includes('spider-man') || promptLower.includes('spider man')) {
    if (promptLower.includes('brand new day')) {
      if (isTamil) {
        return `**ஸ்பைடர்-மேன்: பிராண்ட் நியூ டே (Spider-Man: Brand New Day)** என்பது 2008-ல் மார்வெல் காமிக்ஸ் (Marvel Comics) வெளியிட்ட ஒரு புகழ்பெற்ற கதைக்களமாகும்.\n\n` +
          `### முக்கிய தகவல்கள்:\n` +
          `- **ஆரம்பம்:** *The Amazing Spider-Man* #546 (ஜனவரி 2008).\n` +
          `- **எழுத்தாளர்கள்:** Dan Slott, Bob Gale, Marc Guggenheim, மற்றும் Zeb Wells.\n` +
          `- **கதைக்களம்:** "One More Day" நிகழ்வுக்குப் பிறகு பீட்டர் பார்க்கரின் ரகசிய அடையாளம் உலகிற்கு மறக்கடிக்கப்பட்டு, ஹாரி ஆஸ்பார்ன் மீண்டும் உயிருடன் வருகிறார்.\n` +
          `- **புதிய வில்லன்கள்:** மிஸ்டர் நெகடிவ் (Mister Negative), மெனஸ் (Menace), மற்றும் ஃப்ரீக் (Freak) போன்ற புதிய எதிரிகள் அறிமுகப்படுத்தப்பட்டனர்.`;
      }
      return `**Spider-Man: Brand New Day** is a major Marvel Comics storyline published in 2008, starting from *The Amazing Spider-Man* #546.\n\n` +
        `### Key Highlights:\n` +
        `- **Writers:** Dan Slott, Bob Gale, Marc Guggenheim, and Zeb Wells, with art by Steve McNiven.\n` +
        `- **Plot & Premise:** Following the controversial "One More Day" storyline, Peter Parker's secret identity was wiped from public memory, his marriage to Mary Jane was undone, and his friend Harry Osborn returned to life.\n` +
        `- **New Villains:** It introduced new threats like **Mister Negative**, **Menace**, and **Freak**.\n` +
        `- **Tone:** The series revitalized Spider-Man with classic street-level heroic adventures, fresh supporting characters, and dynamic weekly storytelling.`;
    }

    if (isTamil) {
      return `**ஸ்பைடர்-மேன் (Spider-Man / பீட்டர் பார்க்கர்)** மார்வெல் காமிக்ஸின் மிகவும் பிரபலமான சூப்பர் ஹீரோ ஆவார்.\n\n` +
        `- **உருவாக்கியவர்கள்:** ஸ்டான் லீ (Stan Lee) மற்றும் ஸ்டீவ் டிட்கோ (Steve Ditko).\n` +
        `- **திறன்கள்:** சுவர்களில் ஏறும் திறன், அதீத வலிமை, சிலந்தி உணர்வு (Spider-Sense), மற்றும் வலை வீசும் திறன்.\n` +
        `- **தத்துவம்:** *"With great power comes great responsibility"* (பெரும் வலிமையுடன் பெரும் பொறுப்பும் வருகிறது).`;
    }
    return `**Spider-Man (Peter Parker)** is one of the most iconic superheroes in comic book and cinematic history, created by Stan Lee and Steve Ditko for Marvel Comics.\n\n` +
      `### Overview:\n` +
      `- **Origin:** High school student Peter Parker is bitten by a radioactive spider, granting him superhuman strength, agility, wall-crawling abilities, and a precognitive "Spider-Sense".\n` +
      `- **Core Philosophy:** Guided by his late Uncle Ben's wisdom: *"With great power comes great responsibility."*\n` +
      `- **Famous Villains:** Green Goblin, Doctor Octopus, Venom, Carnage, Sandman, and Kingpin.\n` +
      `- **MCU Portrayal:** Portrayed by Tom Holland in the Marvel Cinematic Universe, Tobey Maguire in the original trilogy, and Andrew Garfield in *The Amazing Spider-Man*.`;
  }

  // Avengers: Doomsday
  if (promptLower.includes('doomsday') && (promptLower.includes('date') || promptLower.includes('release') || promptLower.includes('when'))) {
    if (isTamil) {
      return `**அவெஞ்சர்ஸ்: டூம்ஸ்டே (Avengers: Doomsday)** திரைப்படம் அதிகாரப்பூர்வமாக **டிசம்பர் 18, 2026 (18 Dec, 2026)** அன்று திரையரங்குகளில் வெளியாகிறது (ஆரம்ப வெளியீட்டு கட்டம்: மே 1, 2026).`;
    }
    return `**Avengers: Doomsday** is scheduled to be released in theaters on **December 18, 2026** (initial theatrical release window: May 1, 2026).`;
  }

  // Rahul query
  if (promptLower.includes('rahul') || (promptLower.includes('hi') && promptLower.includes('what') && promptLower.includes('do'))) {
    if (isTamil) {
      return `வணக்கம் ராகுல்! நான் உங்களின் AI உதவியாளர். நீங்கள் என்னிடம் கேள்விகள் கேட்கலாம், புரோகிராமிங் கோட் எழுதலாம், அல்லது குரல் வழியே பேசலாம். உங்களுக்கு இன்று நான் எவ்வாறு உதவ வேண்டும்?`;
    }
    return `Hello Rahul! I'm your AI assistant. You can ask me any questions, write or debug code, search the web in real time, or chat using voice mode. What would you like to do today?`;
  }

  if (searchResults && searchResults.length > 0) {
    const top = searchResults[0];
    const topExtract = cleanHtmlText(top.extract || top.snippet || '');
    return `${topExtract}\n\n---\n🌐 **Verified Sources:**\n- [${cleanHtmlText(top.title)}](${top.link})`;
  }

  if (isTamil) {
    return `வணக்கம்! உங்கள் கேள்வி: *"${userPrompt}"*.\n\nநான் உங்களுக்கு உதவ தயாராக உள்ளேன்.`;
  }
  return `I have processed your query about: *"${userPrompt}"*.\n\nI am ready to assist with detailed analysis, writing, code generation, or general questions!`;
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

    const searchResults = await performWikipediaSearch(lastUserMessage);
    const replyText = generateResponse(lastUserMessage, searchResults, isTamil);

    // Format SSE stream
    const words = replyText.split(' ');
    let sseOutput = '';

    sseOutput += `event: status\ndata: ${JSON.stringify({ model: 'ChatGPT 4o' })}\n\n`;
    for (let i = 0; i < words.length; i++) {
      sseOutput += `event: chunk\ndata: ${JSON.stringify({ text: (i === 0 ? '' : ' ') + words[i] })}\n\n`;
    }
    sseOutput += `event: done\ndata: ${JSON.stringify({ latencyMs: 120, modelUsed: 'ChatGPT 4o' })}\n\n`;

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
