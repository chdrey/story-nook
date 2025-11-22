// --- Mock Data ---
let currentUser = null; 
let stories = [
    { id: 1, author: "AutumnRain", text: "The fire crackled, mocking the silence of the empty house.", votes: 12, votedBy: [] },
    { id: 2, author: "CozyReader", text: "It was the kind of rain that demanded tea and old books.", votes: 45, votedBy: [] }
];

// --- DOM Elements ---
const loginBtn = document.getElementById('loginBtn');
const userProfile = document.getElementById('userProfile');
const feed = document.getElementById('storyFeed');
const topStoriesContainer = document.getElementById('topStories');

// Writing Elements
const mainStoryInput = document.getElementById('mainStoryInput');
const publishBtn = document.getElementById('publishBtn');
const guestPenNameInput = document.getElementById('guestPenName');

// --- Init ---
function init() {
    renderStories();
    updateLeaderboard();
    checkLoginStatus(); // Update UI based on login
}

// --- Render Functions ---
function renderStories() {
    feed.innerHTML = '';
    stories.slice().reverse().forEach(story => {
        const card = document.createElement('div');
        card.className = 'story-card';
        const isVoted = currentUser && story.votedBy.includes(currentUser);
        const heartIcon = isVoted ? '❤️' : '🤍';
        const heartClass = isVoted ? 'voted' : '';

        card.innerHTML = `
            <div class="story-text">${story.text}</div>
            <div class="story-meta">
                <span>By @${story.author}</span>
                <button class="vote-btn ${heartClass}" onclick="toggleVote(${story.id})">
                    ${heartIcon} <span>${story.votes}</span>
                </button>
            </div>
        `;
        feed.appendChild(card);
    });
}

function updateLeaderboard() {
    topStoriesContainer.innerHTML = '';
    const top3 = stories.slice().sort((a, b) => b.votes - a.votes).slice(0, 3);
    top3.forEach(story => {
        const div = document.createElement('div');
        div.style.marginBottom = "10px";
        div.style.padding = "10px";
        div.style.background = "rgba(255,255,255,0.05)";
        div.style.borderRadius = "5px";
        div.innerHTML = `<strong>@${story.author}</strong><br><small>${story.text.substring(0, 50)}...</small>`;
        topStoriesContainer.appendChild(div);
    });
}

// --- UI Logic ---
function checkLoginStatus() {
    if (currentUser) {
        loginBtn.classList.add('hidden');
        userProfile.classList.remove('hidden');
        document.getElementById('usernameDisplay').innerText = currentUser;
        guestPenNameInput.classList.add('hidden'); // Hide guest input if logged in
    } else {
        loginBtn.classList.remove('hidden');
        userProfile.classList.add('hidden');
        guestPenNameInput.classList.remove('hidden'); // Show guest input
    }
}

// --- Interactions ---

// 1. Publish Logic
publishBtn.addEventListener('click', () => {
    const text = mainStoryInput.value.trim();
    let authorName = currentUser;

    // Validate text
    if (!text) {
        alert("Please write a story first!");
        return;
    }

    // Validate Guest Name
    if (!currentUser) {
        const guestName = guestPenNameInput.value.trim();
        if (!guestName) {
            alert("Please sign your story with a Pen Name.");
            return;
        }
        authorName = guestName + " (Guest)";
    }

    // Add Story
    const newStory = {
        id: stories.length + 1,
        author: authorName,
        text: text,
        votes: 0,
        votedBy: []
    };
    stories.push(newStory);
    
    // Clear inputs
    mainStoryInput.value = '';
    guestPenNameInput.value = '';
    renderStories();
});

// 2. Login Simulation
loginBtn.addEventListener('click', () => {
    const name = prompt("Enter username:");
    if(name) {
        currentUser = name;
        checkLoginStatus();
        renderStories();
    }
});

// 3. Vote Logic
window.toggleVote = function(id) {
    if (!currentUser) {
        alert("Guest vote recorded!");
    }
    const story = stories.find(s => s.id === id);
    story.votes++;
    renderStories();
    updateLeaderboard();
};

init();