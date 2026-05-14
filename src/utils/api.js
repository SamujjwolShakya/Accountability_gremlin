// --- Cloud Database (JSONBlob) ---
const DB_ID = '019e259e-c506-7122-9fca-6687f75381e3';
const API_URL = `https://jsonblob.com/api/jsonBlob/${DB_ID}`;

async function fetchDB() {
  try {
    const res = await fetch(API_URL);
    if (!res.ok) throw new Error('DB fetch failed');
    const data = await res.json();
    return data.users ? data : { users: {} };
  } catch (err) {
    console.error(err);
    return { users: {} };
  }
}

async function saveDB(db) {
  try {
    await fetch(API_URL, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify(db)
    });
  } catch (err) {
    console.error('Failed to save to cloud', err);
  }
}

export async function loadData(username) {
  const db = await fetchDB();
  return db.users[username]?.data || { pledges: [], streak: 0 };
}

export async function saveData(username, data) {
  const db = await fetchDB();
  if (db.users[username]) {
    db.users[username].data = data;
    await saveDB(db);
  }
}

// --- Auth Functions ---
export async function authUser(username, password) {
  const db = await fetchDB();
  
  const usernameLower = username.toLowerCase().trim();
  if (!usernameLower) throw new Error("Username required.");
  if (!password) throw new Error("Password required.");

  if (db.users[usernameLower]) {
    // User exists, check password
    if (db.users[usernameLower].password === password) {
      return { username: usernameLower, originalName: db.users[usernameLower].originalName };
    } else {
      throw new Error("Incorrect password.");
    }
  } else {
    // Create new user
    db.users[usernameLower] = { 
      password, 
      originalName: username.trim(),
      data: { pledges: [], streak: 0 }
    };
    await saveDB(db);
    return { username: usernameLower, originalName: username.trim() };
  }
}

export async function callClaude(prompt) {
  // Uses Vite environment variable if available, otherwise it will likely fail
  // Add VITE_ANTHROPIC_API_KEY=your_key in .env
  const apiKey = import.meta.env.VITE_ANTHROPIC_API_KEY;
  
  if (!apiKey) {
    return new Promise(resolve => setTimeout(() => resolve("MOCK CLAUDE RESPONSE: I am watching you, and I am very disappointed. Do better next time!"), 1000));
  }

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
      'anthropic-dangerous-direct-browser-access': 'true' // Required for client-side Vite
    },
    body: JSON.stringify({
      model: 'claude-3-haiku-20240307',
      max_tokens: 150,
      messages: [{ role: 'user', content: prompt }]
    })
  });

  if (!response.ok) {
    throw new Error('Claude API error');
  }

  const data = await response.json();
  return data.content[0].text;
}
