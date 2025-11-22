// --- 1. CONFIGURATION ---
const SUPABASE_URL = 'https://lypndarukqjtkyhxygwe.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx5cG5kYXJ1a3FqdGt5aHh5Z3dlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM3Nzc2NzAsImV4cCI6MjA3OTM1MzY3MH0.NE5Q1BFVsBDyKSUxHO--aR-jbSHSLW8klha7C7_VbUA';

const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// --- DOM Elements ---
const loginBtn = document.getElementById('loginBtn');
const userProfile = document.getElementById('userProfile');
const feed = document.getElementById('storyFeed');
const topStoriesContainer = document.getElementById('topStories');
const mainStoryInput = document.getElementById('mainStoryInput');
const publishBtn = document.getElementById('publishBtn');
const guestPenNameInput = document.getElementById('guestPenName');
const charCountDisplay = document.getElementById('charCount');

const welcomeOverlay = document.getElementById('welcomeOverlay');
const enterBtn = document.getElementById('enterBtn');
const youtubePlayer = document.getElementById('youtubePlayer');
const bgVideo = document.getElementById('bgVideo');

// Modal Elements
const readModal = document.getElementById('readModal');
const closeModalBtn = document.querySelector('.close-modal');
const readModalAuthor = document.getElementById('readModalAuthor');
const readModalText = document.getElementById('readModalText');
const readModalDate = document.getElementById('readModalDate');

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

// --- 2. WELCOME LOGIC ---
const YOUTUBE_SOURCE = "https://www.youtube.com/embed/hVFaaUEIpzE?start=0&autoplay=1";

enterBtn.addEventListener('click', () => {
    welcomeOverlay.classList.add('hidden');
    setTimeout(() => {
        welcomeOverlay.classList.add('display-none');
    }, 800);
    youtubePlayer.src = YOUTUBE_SOURCE;
    bgVideo.muted = false;
    bgVideo.play().catch(e => console.log("Auto-play blocked"));
});

// --- 3. DATABASE FUNCTIONS ---

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
        charCountDisplay.innerText = '0';
        fetchStories();
    }
}

// --- FIXED VOTING LOGIC (No Jumping) ---
async function toggleVote(event, id, currentVotes) {
    // Stop the click from bubbling up to the card (prevent opening modal)
    event.stopPropagation();

    let votedStories = JSON.parse(localStorage.getItem('votedStories')) || [];
    let newVotes;
    const hasVoted = votedStories.includes(id);

    // 1. Update Local State
    if (hasVoted) {
        newVotes = currentVotes - 1;
        votedStories = votedStories.filter(storyId => storyId !== id);
    } else {
        newVotes = currentVotes + 1;
        votedStories.push(id);
    }
    localStorage.setItem('votedStories', JSON.stringify(votedStories));

    // 2. Update UI Instantly (Without re-rendering the list!)
    const countSpan = document.getElementById(`count-${id}`);
    const btnElement = document.getElementById(`btn-${id}`);
    
    if(countSpan) countSpan.innerText = newVotes;
    
    if(btnElement) {
        if (hasVoted) {
            btnElement.classList.remove('voted');
            btnElement.innerHTML = `🤍 <span id="count-${id}">${newVotes}</span>`;
        } else {
            btnElement.classList.add('voted');
            btnElement.innerHTML = `❤️ <span id="count-${id}">${newVotes}</span>`;
        }
        // Update the onclick handler to reflect new vote count
        btnElement.onclick = (e) => toggleVote(e, id, newVotes);
    }

    // 3. Send to Server silently
    const { error } = await supabase
        .from('stories')
        .update({ votes: newVotes })
        .eq('id', id);

    if (error) {
        console.error("Vote error:", error);
        // Only fetch if error, to revert
        fetchStories(); 
    }
}

// --- 4. RENDER FUNCTIONS ---

function renderStories(stories) {
    feed.innerHTML = '';
    const votedStories = JSON.parse(localStorage.getItem('votedStories')) || [];

    if (!stories || stories.length === 0) {
        feed.innerHTML = '<p style="text-align:center;">No stories yet. Be the first!</p>';
        return;
    }

    stories.forEach(story => {
        const card = document.createElement('div');
        card.className = 'story-card';
        
        // CLICK EVENT: Open Modal
        card.addEventListener('click', () => openReadModal(story));

        const isVoted = votedStories.includes(story.id);
        const heartIcon = isVoted ? '❤️' : '🤍';
        const heartClass = isVoted ? 'voted' : '';

        // Note: We added IDs to the Button and Span to update them easily later
        card.innerHTML = `
            <div class="story-text">${escapeHtml(story.content)}</div>
            <div class="story-meta">
                <span>By @${escapeHtml(story.author)}</span>
                <button 
                    id="btn-${story.id}"
                    class="vote-btn ${heartClass}" 
                    onclick="toggleVote(event, ${story.id}, ${story.votes})">
                    ${heartIcon} <span id="count-${story.id}">${story.votes}</span>
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
            div.style.cursor = "pointer";
            // Allow clicking leaderboard items too
            div.onclick = () => openReadModal(story);
            div.innerHTML = `<strong>@${escapeHtml(story.author)}</strong><br><small>${escapeHtml(story.content.substring(0, 50))}...</small>`;
            topStoriesContainer.appendChild(div);
        }
    });
}

// --- MODAL LOGIC ---
function openReadModal(story) {
    readModalAuthor.innerText = "By @" + story.author;
    readModalText.innerText = story.content; // Shows full text
    
    // Format Date (Simple)
    const date = new Date(story.created_at);
    readModalDate.innerText = date.toLocaleDateString();

    readModal.classList.remove('hidden');
}

// Close Modal
closeModalBtn.addEventListener('click', () => {
    readModal.classList.add('hidden');
});

// Close if clicking outside the paper
window.addEventListener('click', (e) => {
    if (e.target === readModal) {
        readModal.classList.add('hidden');
    }
});

function escapeHtml(text) {
    if (!text) return "";
    return text
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

// --- 5. INTERACTIONS ---

mainStoryInput.addEventListener('input', () => {
    const currentLength = mainStoryInput.value.length;
    charCountDisplay.innerText = currentLength;
    if (currentLength >= 1900) {
        charCountDisplay.style.color = "#e76f51"; 
    } else {
        charCountDisplay.style.color = "#ccd5ae"; 
    }
});

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
