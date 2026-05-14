const STORAGE_KEY = 'accountability_gremlin_v2';

export function loadData() {
  try {
    const data = JSON.parse(localStorage.getItem(STORAGE_KEY));
    return data || { pledges: [], streak: 0 };
  } catch {
    return { pledges: [], streak: 0 };
  }
}

export function saveData(data) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

export async function callClaude(prompt) {
  // Uses Vite environment variable if available, otherwise it will likely fail
  // Add VITE_ANTHROPIC_API_KEY=your_key in .env
  const apiKey = import.meta.env.VITE_ANTHROPIC_API_KEY;
  
  if (!apiKey) {
    console.warn("Missing VITE_ANTHROPIC_API_KEY in environment variables. Simulating response.");
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve("THE GREMLIN IS MOCKED BECAUSE YOU FORGOT THE API KEY. But still, do your tasks!");
      }, 1500);
    });
  }

  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true' // Required for client-side fetch
      },
      body: JSON.stringify({
        model: 'claude-3-5-sonnet-20240620',
        max_tokens: 1000,
        messages: [{ role: 'user', content: prompt }]
      })
    });
    
    if (!res.ok) {
      throw new Error(`API Error: ${res.status}`);
    }

    const data = await res.json();
    return data.content?.map(b => b.text || '').join('') || '';
  } catch (error) {
    console.error("Failed to call Claude:", error);
    throw error;
  }
}
