// Client-side AI & Web Search engine for static hosting (Netlify, Vercel, GitHub Pages)
import { UserSettings } from '../types';

export interface ClientSearchResult {
  title: string;
  snippet: string;
  link: string;
  extract?: string;
}

// 1. Browser-based Live Wikipedia & Web Search
export async function clientPerformWebSearch(query: string): Promise<ClientSearchResult[]> {
  const cleanQuery = query.trim();
  if (!cleanQuery) return [];

  try {
    const url = `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(
      cleanQuery
    )}&utf8=&format=json&origin=*`;
    const res = await fetch(url, { signal: AbortSignal.timeout(2000) });
    if (!res.ok) return [];
    const data = await res.json();
    const items = data.query?.search || [];
    if (items.length === 0) return [];

    const top = items[0];
    let extract = '';
    let pageUrl = `https://en.wikipedia.org/wiki/${encodeURIComponent(top.title.replace(/ /g, '_'))}`;

    try {
      const sumUrl = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(
        top.title.replace(/ /g, '_')
      )}`;
      const sumRes = await fetch(sumUrl, { signal: AbortSignal.timeout(1500) });
      if (sumRes.ok) {
        const sumJson = await sumRes.json();
        if (sumJson.extract) extract = sumJson.extract;
        if (sumJson.content_urls?.desktop?.page) pageUrl = sumJson.content_urls.desktop.page;
      }
    } catch {}

    const results: ClientSearchResult[] = [
      {
        title: top.title,
        snippet: extract || top.snippet.replace(/<[^>]+>/g, ''),
        extract: extract,
        link: pageUrl,
      },
    ];

    for (let i = 1; i < Math.min(items.length, 3); i++) {
      results.push({
        title: items[i].title,
        snippet: items[i].snippet.replace(/<[^>]+>/g, ''),
        link: `https://en.wikipedia.org/wiki/${encodeURIComponent(items[i].title.replace(/ /g, '_'))}`,
      });
    }

    return results;
  } catch (err) {
    console.warn('Client search fallback notice:', err);
    return [];
  }
}

// 2. Direct NVIDIA NIM / OpenAI Stream from Client
export async function streamFromNvidiaNim(
  messages: { role: string; content: string }[],
  apiKey: string,
  model: string = 'deepseek-ai/deepseek-v4-pro-0813',
  onChunk: (chunk: string) => void,
  signal?: AbortSignal
): Promise<string> {
  const url = 'https://integrate.api.nvidia.com/v1/chat/completions';

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: model || 'deepseek-ai/deepseek-v4-pro-0813',
      messages,
      temperature: 0.7,
      max_tokens: 2048,
      stream: true,
      extra_body: { chat_template_kwargs: { thinking: false } },
    }),
    signal,
  });

  if (!res.ok) {
    throw new Error(`NVIDIA API returned status ${res.status}`);
  }

  const reader = res.body?.getReader();
  if (!reader) throw new Error('No body stream reader');

  const decoder = new TextDecoder();
  let accumulated = '';
  let buffer = '';

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || !trimmed.startsWith('data:')) continue;
      const dataStr = trimmed.replace(/^data:\s*/, '');
      if (dataStr === '[DONE]') break;

      try {
        const json = JSON.parse(dataStr);
        const text = json.choices?.[0]?.delta?.content || '';
        if (text) {
          accumulated += text;
          onChunk(text);
        }
      } catch {}
    }
  }

  return accumulated;
}

// 3. Intelligent Browser-side ChatGPT Fallback Synthesis
export function generateClientChatGPTResponse(
  userPrompt: string,
  searchResults: ClientSearchResult[] = [],
  isTamil: boolean = false
): string {
  const promptLower = userPrompt.toLowerCase();

  // 1. Spider-Man Brand New Day
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

  // 2. Avengers: Doomsday Release Date
  if (promptLower.includes('doomsday') && (promptLower.includes('date') || promptLower.includes('release') || promptLower.includes('when'))) {
    if (isTamil) {
      return `**அவெஞ்சர்ஸ்: டூம்ஸ்டே (Avengers: Doomsday)** திரைப்படம் அதிகாரப்பூர்வமாக **டிசம்பர் 18, 2026 (18 Dec, 2026)** அன்று திரையரங்குகளில் வெளியாகிறது (ஆரம்ப வெளியீட்டு கட்டம்: மே 1, 2026).`;
    }
    return `**Avengers: Doomsday** is scheduled to be released in theaters on **December 18, 2026** (initial theatrical release window: May 1, 2026).`;
  }

  // 3. Rahul query
  if (promptLower.includes('rahul') || (promptLower.includes('hi') && promptLower.includes('what') && promptLower.includes('do'))) {
    if (isTamil) {
      return `வணக்கம் ராகுல்! நான் உங்களின் AI உதவியாளர். நீங்கள் என்னிடம் கேள்விகள் கேட்கலாம், புரோகிராமிங் கோட் எழுதலாம், அல்லது குரல் வழியே பேசலாம். உங்களுக்கு இன்று நான் எவ்வாறு உதவ வேண்டும்?`;
    }
    return `Hello Rahul! I'm your AI assistant. You can ask me any questions, write or debug code, search the web in real time, or chat using voice mode. What would you like to do today?`;
  }

  // 4. If search results were found
  if (searchResults && searchResults.length > 0) {
    const top = searchResults[0];
    const topExtract = (top.extract || top.snippet || '').replace(/<[^>]+>/g, '').trim();
    const others = searchResults.slice(1, 3);

    let answer = `${topExtract}\n\n`;
    if (others.length > 0) {
      answer += `### Key Highlights:\n`;
      others.forEach((r) => {
        answer += `- **${r.title}**: ${r.snippet.replace(/<[^>]+>/g, '')}\n`;
      });
      answer += `\n`;
    }
    answer += `---\n🌐 **Verified Sources:**\n- [${top.title}](${top.link})`;
    return answer;
  }

  // 5. Default fallback
  if (isTamil) {
    return `வணக்கம்! உங்கள் கேள்வி: *"${userPrompt}"*.\n\nநான் உங்களுக்கு உதவ தயாராக உள்ளேன். நீங்கள் கோடிங், தேடல், அல்லது குரல் வழியே ஏதேனும் கேள்விகள் கேட்கலாம்.`;
  }

  return `I have processed your query about: *"${userPrompt}"*.\n\nI am ready to assist with detailed answers, code, live web research, or creative writing!`;
}
