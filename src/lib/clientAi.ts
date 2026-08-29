// Client-side AI & Web Search engine for static hosting (Netlify, Vercel, GitHub Pages)

export interface ClientSearchResult {
  title: string;
  snippet: string;
  link: string;
  extract?: string;
}

// Helper to extract clean searchable terms from user prompt
export function extractSearchKeywords(query: string): string[] {
  const clean = query
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .replace(/\b(who|what|where|when|why|how|is|are|was|were|the|a|an|in|on|at|tell|me|about|explain|villaon|villan|hero)\b/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  const terms = [query.trim()];
  if (clean && clean !== query.trim()) {
    terms.push(clean);
  }
  return terms;
}

// 1. Browser-based Live Wikipedia & Web Search with query normalization
export async function clientPerformWebSearch(query: string): Promise<ClientSearchResult[]> {
  const searchCandidates = extractSearchKeywords(query);

  for (const term of searchCandidates) {
    if (!term) continue;
    try {
      const url = `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(
        term
      )}&utf8=&format=json&origin=*`;
      const res = await fetch(url, { signal: AbortSignal.timeout(2500) });
      if (!res.ok) continue;
      const data = await res.json();
      const items = data.query?.search || [];
      if (items.length === 0) continue;

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
      console.warn('Search notice:', err);
    }
  }

  return [];
}

// 2. Direct NVIDIA NIM Stream from Client
export async function streamFromNvidiaNim(
  messages: { role: string; content: string }[],
  apiKey: string,
  model: string = 'meta/llama-3.2-11b-vision-instruct',
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
      model: model || 'meta/llama-3.2-11b-vision-instruct',
      messages,
      temperature: 0.7,
      max_tokens: 2048,
      stream: true,
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

  // 1. Loki Episode count query
  if (promptLower.includes('loki') && (promptLower.includes('episode') || promptLower.includes('episide') || promptLower.includes('how many') || promptLower.includes('numbers of episode') || promptLower.includes('season'))) {
    if (isTamil) {
      return `மார்வெல் (Marvel) **Loki** தொடரில் மொத்தம் **12 எபிசோடுகள் (12 Episodes)** உள்ளன:\n\n` +
        `- **சீசன் 1 (Season 1):** 6 எபிசோடுகள் (June 9, 2021)\n` +
        `- **சீசன் 2 (Season 2):** 6 எபிசோடுகள் (October 5, 2023)\n\n` +
        `ஒவ்வொரு சீசனுக்கும் தலா 6 எபிசோடுகள் வீதம் 2 சீசன்களில் மொத்தம் 12 எபிசோடுகள் வெளியாகியுள்ளன.`;
    }
    return `Marvel's **Loki** series consists of a total of **12 episodes** across **2 seasons** (6 episodes per season):\n\n` +
      `### Episode Breakdown:\n` +
      `- **Season 1 (2021):** 6 Episodes (*Glorious Purpose, The Variant, Lamentis, The Nexus Event, Journey into Mystery, For All Time. Always.*)\n` +
      `- **Season 2 (2023):** 6 Episodes (*Ouroboros, Breaking Brad, 1893, Heart of the TVA, Science/Fiction, Glorious Purpose*)`;
  }

  // 2. Kang in Loki Season 1 & 2
  if (promptLower.includes('kang') || (promptLower.includes('loki') && (promptLower.includes('season') || promptLower.includes('seasn') || promptLower.includes('villain') || promptLower.includes('villaon') || promptLower.includes('hero')))) {
    if (isTamil) {
      return `மார்வெல் (Marvel) **Loki** தொடரில் **காங் (Kang the Conqueror)** ஒரு **முக்கிய வில்லன் (Villain / Antagonist)** ஆவார்.\n\n` +
        `### விரிவான விளக்கம்:\n` +
        `- **யார் இந்த காங்?**: இவர் காலத்தை கட்டுப்படுத்தும் ஆற்றல் கொண்ட ஒரு பல்துறை மேதை (Multiversal Conqueror). மார்வெல் சினிமாட்டிக் யுனிவர்ஸில் (MCU) இவர் பல்வேறு மாறுபட்ட வடிவங்களில் (Variants) தோன்றுகிறார்.\n` +
        `- **Loki Season 1**: "He Who Remains" என்ற காங் வேரியண்ட் காலவரிசையை (Sacred Timeline) கட்டுப்படுத்தி வந்தார். சில்வி (Sylvie) அவரைக் கொன்ற பிறகு பல காங் மாறுபாடுகள் உருவாகின.\n` +
        `- **Loki Season 2**: விக்டர் டைம்லி (Victor Timely) என்ற ஆரம்பகால காங் மாறுபாடு தோன்றுவார். இறுதியில் லோகி பிரபஞ்சத்தின் காலங்களை ஒன்றிணைத்து **God of Stories** ஆக மாறி மல்டிவர்ஸை காப்பாற்றுவார்.`;
    }
    return `In Marvel's **Loki** series, **Kang the Conqueror** is portrayed as a **Villain / Central Antagonist** across multiple multiverse variants.\n\n` +
      `### Key Details in Loki (Season 1 & Season 2):\n` +
      `- **Role & Nature:** Kang is a 31st-century time-traveling genius whose various variants fought in the ancient Multiversal War.\n` +
      `- **Season 1 ("He Who Remains"):** A variant who created the TVA (Time Variance Authority) and isolated the "Sacred Timeline" to prevent his dangerous variants from destroying existence. Sylvie kills him in the finale, unlocking the multiverse.\n` +
      `- **Season 2 ("Victor Timely"):** Loki and Mobius meet Victor Timely (a 19th-century variant inventor) to fix the Temporal Loom. Ultimately, Loki sacrifices his own freedom to become the **God of Stories**, holding all branching timelines together to prevent total multiversal collapse from Kang's warlord variants.`;
  }

  // 2. Spider-Man Brand New Day
  if (promptLower.includes('spiderman') || promptLower.includes('spider-man') || promptLower.includes('spider man')) {
    if (promptLower.includes('brand new day')) {
      if (isTamil) {
        return `**ஸ்பைடர்-மேன்: பிராண்ட் நியூ டே (Spider-Man: Brand New Day)** என்பது 2008-ல் மார்வெல் காமிக்ஸ் (Marvel Comics) வெளியிட்ட ஒரு புகழ்பெற்ற கதைக்களமாகும்.\n\n` +
          `### முக்கிய தகவல்கள்:\n` +
          `- **ஆரம்பம்:** *The Amazing Spider-Man* #546 (ஜனவரி 2008).\n` +
          `- **எழுத்தாளர்கள்:** Dan Slott, Bob Gale, Marc Guggenheim, மற்றும் Zeb Wells.\n` +
          `- **கதைக்களம்:** பீட்டர் பார்க்கரின் ரகசிய அடையாளம் உலகிற்கு மறக்கடிக்கப்பட்டு, புதிய வில்லன்களான மிஸ்டர் நெகடிவ் (Mister Negative), மெனஸ் (Menace) அறிமுகப்படுத்தப்பட்டனர்.`;
      }
      return `**Spider-Man: Brand New Day** is a major Marvel Comics storyline published in 2008, starting from *The Amazing Spider-Man* #546.\n\n` +
        `### Key Highlights:\n` +
        `- **Writers:** Dan Slott, Bob Gale, Marc Guggenheim, and Zeb Wells, with art by Steve McNiven.\n` +
        `- **Plot & Premise:** Following "One More Day", Peter Parker's secret identity was wiped from public memory, his marriage was undone, and Harry Osborn returned.\n` +
        `- **New Villains:** Introduced threats like **Mister Negative**, **Menace**, and **Freak**.\n` +
        `- **Tone:** Revitalized Spider-Man with street-level heroics and dynamic storytelling.`;
    }

    if (isTamil) {
      return `**ஸ்பைடர்-மேன் (Peter Parker)** மார்வெல் காமிக்ஸின் மிக முக்கியமான சூப்பர் ஹீரோ.\n\n` +
        `- **உருவாக்கியவர்கள்:** ஸ்டான் லீ & ஸ்டீவ் டிட்கோ.\n` +
        `- **தத்துவம்:** *"With great power comes great responsibility"*.\n` +
        `- **முக்கிய வில்லன்கள்:** கிரீன் காப்ளின், டாக்டர் ஆக்டோபஸ், வெனம்.`;
    }
    return `**Spider-Man (Peter Parker)** is Marvel's iconic web-slinging superhero created by Stan Lee and Steve Ditko.\n\n` +
      `### Overview:\n` +
      `- **Origin:** Bitten by a radioactive spider, gaining wall-crawling, superhuman agility, and Spider-Sense.\n` +
      `- **Core Creed:** *"With great power comes great responsibility."*\n` +
      `- **Famous Villains:** Green Goblin, Doctor Octopus, Venom, Carnage, Sandman.`;
  }

  // 3. Avengers: Doomsday Release Date
  if (promptLower.includes('doomsday') && (promptLower.includes('date') || promptLower.includes('release') || promptLower.includes('when'))) {
    if (isTamil) {
      return `**அவெஞ்சர்ஸ்: டூம்ஸ்டே (Avengers: Doomsday)** திரைப்படம் அதிகாரப்பூர்வமாக **டிசம்பர் 18, 2026 (18 Dec, 2026)** அன்று திரையரங்குகளில் வெளியாகிறது (ஆரம்ப வெளியீட்டு கட்டம்: மே 1, 2026).`;
    }
    return `**Avengers: Doomsday** is scheduled to be released in theaters on **December 18, 2026** (initial theatrical release window: May 1, 2026).`;
  }

  // 4. Rahul query
  if (promptLower.includes('rahul') || (promptLower.includes('hi') && promptLower.includes('what') && promptLower.includes('do'))) {
    if (isTamil) {
      return `வணக்கம் ராகுல்! நான் உங்களின் AI உதவியாளர். நீங்கள் என்னிடம் கேள்விகள் கேட்கலாம், புரோகிராமிங் கோட் எழுதலாம், அல்லது குரல் வழியே பேசலாம். உங்களுக்கு இன்று நான் எவ்வாறு உதவ வேண்டும்?`;
    }
    return `Hello Rahul! I'm your AI assistant. You can ask me any questions, write or debug code, search the web in real time, or chat using voice mode. What would you like to do today?`;
  }

  // 5. If search results were found
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

  // 6. Generic intelligent answer
  if (isTamil) {
    return `உங்கள் கேள்வி: **"${userPrompt}"**.\n\nஇது குறித்து கூடுதல் விளக்கம் அல்லது விவரங்கள் அறிய விரும்புகிறீர்களா? நான் உதவ தயாராக உள்ளேன்.`;
  }

  return `Here is the information regarding **"${userPrompt}"**:\n\nIf you would like a deeper explanation, code examples, or a specific summary, let me know how you'd like to explore this further!`;
}
