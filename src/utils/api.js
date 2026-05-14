const STORAGE_KEY_BASE = 'accountability_gremlin_v2_';

export function loadData(username) {
  try {
    const data = JSON.parse(localStorage.getItem(STORAGE_KEY_BASE + username));
    return data || { pledges: [], streak: 0 };
  } catch {
    return { pledges: [], streak: 0 };
  }
}

export function saveData(username, data) {
  localStorage.setItem(STORAGE_KEY_BASE + username, JSON.stringify(data));
}

// --- Auth Functions ---
const USERS_KEY = 'gremlin_users';

export function loadUsers() {
  try {
    return JSON.parse(localStorage.getItem(USERS_KEY)) || {};
  } catch {
    return {};
  }
}

export function authUser(username, password) {
  const users = loadUsers();
  const usernameLower = username.toLowerCase().trim();
  
  if (!usernameLower) throw new Error("Username required.");
  if (!password) throw new Error("Password required.");

  if (users[usernameLower]) {
    // User exists, check password
    if (users[usernameLower].password === password) {
      return { username: usernameLower, originalName: users[usernameLower].originalName };
    } else {
      throw new Error("Incorrect password.");
    }
  } else {
    // Create new user
    users[usernameLower] = { password, originalName: username.trim() };
    localStorage.setItem(USERS_KEY, JSON.stringify(users));
    return { username: usernameLower, originalName: username.trim() };
  }
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
