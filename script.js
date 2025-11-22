// --- 1. CONFIGURATION ---
const SUPABASE_URL = 'https://lypndarukqjtkyhxygwe.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx5cG5kYXJ1a3FqdGt5aHh5Z3dlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM3Nzc2NzAsImV4cCI6MjA3OTM1MzY3MH0.NE5Q1BFVsBDyKSUxHO--aR-jbSHSLW8klha7C7_VbUA';

// Initialize the client (uses the CDN library from index.html)
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// --- DOM Elements ---
const loginBtn = document.getElementById('loginBtn');
const userProfile = document.getElementById('userProfile');
const feed = document.getElementById('storyFeed');
const topStoriesContainer = document.getElementById('topStories');
const mainStoryInput = document.getElementById('mainStoryInput');
const publishBtn = document.getElementById('publishBtn');
const guestPenNameInput = document.getElementById('guestPenName');

let currentUser = null;

// --- Init ---
async function init() {
    const savedUser = localStorage.getItem('storyNookUser');
    if (savedUser) {
        currentUser = savedUser;
        checkLoginStatus();
    }
    await fetchStories();
}

// --- 2. DATABASE FUNCTIONS ---

async function fetchStories() {
    feed.innerHTML = '<p style="text-align:center; color:#888;">Loading stories...</p>';
    
    const { data, error } = await supabase
        .from('stories')
        .select('*')
        .order('created_at', { ascending: false });

    if (error) {
        console.error("Error fetching:", error);
        feed.innerHTML = '<p>Error loading stories.</p>';
    } else {
        renderStories(data);
        updateLeaderboard(data);
    }
}

async function postStory(author, text) {
    const { error } = await supabase
        .from('stories')
        .insert([
            { author: author, content: text, votes: 0 }
        ]);

    if (error) {
        alert("Error posting story: " + error.message);
    } else {
        mainStoryInput.value = '';
        guestPenNameInput.value = '';
        fetchStories();
    }
}

async function toggleVote(id, currentVotes) {
    const newVotes = currentVotes + 1;

    const { error } = await supabase
        .from('stories')
        .update({ votes: newVotes })
        .eq('id', id);

    if (error) {
        console.error("Vote error:", error);
    } else {
        fetchStories();
    }
}

// --- 3. RENDER FUNCTIONS ---

function renderStories(stories) {
    feed.innerHTML = '';
    
    if (!stories || stories.length === 0) {
        feed.innerHTML = '<p style="text-align:center;">No stories yet. Be the first!</p>';
        return;
    }

    stories.forEach(story => {
        const card = document.createElement('div');
        card.className = 'story-card';
        
        card.innerHTML = `
            <div class="story-text">${escapeHtml(story.content)}</div>
            <div class="story-meta">
                <span>By @${escapeHtml(story.author)}</span>
                <button class="vote-btn" onclick="toggleVote(${story.id}, ${story.votes})">
                    ❤️ <span>${story.votes}</span>
                </button>
            </div>
        `;
        feed.appendChild(card);
    });
}

function updateLeaderboard(stories) {
    topStoriesContainer.innerHTML = '';
    const top3 = [...stories].sort((a, b) => b.votes - a.votes).slice(0, 3);
    
    top3.forEach(story => {
        if(story.votes > 0) { 
            const div = document.createElement('div');
            div.style.marginBottom = "10px";
            div.style.padding = "10px";
            div.style.background = "rgba(255,255,255,0.05)";
            div.style.borderRadius = "5px";
            div.innerHTML = `<strong>@${escapeHtml(story.author)}</strong><br><small>${escapeHtml(story.content.substring(0, 50))}...</small>`;
            topStoriesContainer.appendChild(div);
        }
    });
}

function escapeHtml(text) {
    if (!text) return "";
    return text
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

// --- 4. INTERACTIONS ---

publishBtn.addEventListener('click', () => {
    const text = mainStoryInput.value.trim();
    let authorName = currentUser;

    if (!text) {
        alert("Please write a story first!");
        return;
    }

    if (!currentUser) {
        const guestName = guestPenNameInput.value.trim();
        if (!guestName) {
            alert("Please sign your story with a Pen Name.");
            return;
        }
        authorName = guestName + " (Guest)";
    }

    postStory(authorName, text);
});

loginBtn.addEventListener('click', () => {
    const name = prompt("Enter username:");
    if(name) {
        currentUser = name;
        localStorage.setItem('storyNookUser', name);
        checkLoginStatus();
    }
});

function checkLoginStatus() {
    if (currentUser) {
        loginBtn.classList.add('hidden');
        userProfile.classList.remove('hidden');
        document.getElementById('usernameDisplay').innerText = currentUser;
        guestPenNameInput.classList.add('hidden');
    } else {
        loginBtn.classList.remove('hidden');
        userProfile.classList.add('hidden');
        guestPenNameInput.classList.remove('hidden');
    }
}

init();