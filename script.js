// --- CONFIGURATION ---
const SUPABASE_URL = 'https://lypndarukqjtkyhxygwe.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx5cG5kYXJ1a3FqdGt5aHh5Z3dlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM3Nzc2NzAsImV4cCI6MjA3OTM1MzY3MH0.NE5Q1BFVsBDyKSUxHO--aR-jbSHSLW8klha7C7_VbUA';
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// --- DOM Elements ---
const navLoginBtn = document.getElementById('navLoginBtn');
const userNavProfile = document.getElementById('userNavProfile');
const writingZoneSection = document.getElementById('writingZoneSection');
const guestPrompt = document.getElementById('guestPrompt');
const authModal = document.getElementById('authModal');
const profileModal = document.getElementById('profileModal');
const readModal = document.getElementById('readModal');

let currentUser = null;
let currentProfile = null;

// --- INIT ---
async function init() {
    // Check Auth Status
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
        currentUser = session.user;
        await fetchUserProfile();
    }
    updateUI();
    fetchStories();

    // Listen for Auth Changes
    supabase.auth.onAuthStateChange(async (event, session) => {
        if (session) {
            currentUser = session.user;
            await fetchUserProfile();
        } else {
            currentUser = null;
            currentProfile = null;
        }
        updateUI();
        fetchStories(); // Refresh stories to show correct delete buttons
    });
}

// --- AUTHENTICATION ---
let isSignUp = false;

document.getElementById('navLoginBtn').addEventListener('click', () => {
    authModal.classList.remove('hidden');
});

document.getElementById('switchAuthMode').addEventListener('click', () => {
    isSignUp = !isSignUp;
    document.getElementById('authTitle').innerText = isSignUp ? "Sign Up" : "Log In";
    document.getElementById('authActionBtn').innerText = isSignUp ? "Sign Up" : "Log In";
    document.getElementById('usernameInput').classList.toggle('hidden', !isSignUp);
    document.getElementById('switchAuthMode').innerHTML = isSignUp ? "Already have an account? <span>Log In</span>" : "Don't have an account? <span>Sign Up</span>";
});

document.getElementById('authActionBtn').addEventListener('click', async () => {
    const email = document.getElementById('emailInput').value;
    const password = document.getElementById('passwordInput').value;
    const username = document.getElementById('usernameInput').value;
    const errorMsg = document.getElementById('authError');

    if(!email || !password) return errorMsg.innerText = "Please fill in all fields.";

    try {
        if (isSignUp) {
            if(!username) return errorMsg.innerText = "Pen name required.";
            const { error } = await supabase.auth.signUp({
                email, password,
                options: { data: { username: username } } // Stores username in metadata
            });
            if (error) throw error;
            alert("Account created! You are logged in.");
        } else {
            const { error } = await supabase.auth.signInWithPassword({ email, password });
            if (error) throw error;
        }
        closeAllModals();
    } catch (err) {
        errorMsg.innerText = err.message;
    }
});

document.getElementById('logoutBtn').addEventListener('click', async () => {
    await supabase.auth.signOut();
});

async function fetchUserProfile() {
    const { data } = await supabase.from('profiles').select('*').eq('id', currentUser.id).single();
    currentProfile = data;
}

function updateUI() {
    if (currentUser && currentProfile) {
        navLoginBtn.classList.add('hidden');
        userNavProfile.classList.remove('hidden');
        writingZoneSection.classList.remove('hidden');
        guestPrompt.classList.add('hidden');
        
        document.getElementById('navUsername').innerText = currentProfile.username;
        document.getElementById('navAvatar').src = currentProfile.avatar_url;
    } else {
        navLoginBtn.classList.remove('hidden');
        userNavProfile.classList.add('hidden');
        writingZoneSection.classList.add('hidden');
        guestPrompt.classList.remove('hidden');
    }
}

// --- STORIES & FEED ---
async function fetchStories() {
    const feed = document.getElementById('storyFeed');
    feed.innerHTML = '<p style="text-align:center;">Loading...</p>';

    // Fetch Stories + Profile Info + Comment Count
    const { data: stories, error } = await supabase
        .from('stories')
        .select(`
            *,
            profiles (username, avatar_url),
            comments (count)
        `)
        .order('created_at', { ascending: false });

    if (error) return console.error(error);

    feed.innerHTML = '';
    const topStories = [...stories].sort((a, b) => b.votes - a.votes).slice(0, 3);
    renderLeaderboard(topStories);

    stories.forEach(story => {
        const card = document.createElement('div');
        card.className = 'story-card';
        card.onclick = () => openReadModal(story);

        const commentCount = story.comments ? story.comments[0].count : 0;
        
        card.innerHTML = `
            <div class="profile-header" style="margin-bottom:10px;">
                <img src="${story.profiles.avatar_url}" class="avatar-small" style="margin-right:10px;">
                <span style="color:#d4a373; font-weight:bold;">@${story.profiles.username}</span>
            </div>
            <div class="story-text">${escapeHtml(story.content)}</div>
            <div class="story-meta">
                <span>❤️ ${story.votes}</span>
                <span>💬 ${commentCount} comments</span>
            </div>
        `;
        feed.appendChild(card);
    });
}

function renderLeaderboard(stories) {
    const container = document.getElementById('topStories');
    container.innerHTML = '';
    stories.forEach(story => {
        if (story.votes > 0) {
            const div = document.createElement('div');
            div.className = 'story-card'; // Reusing card style for consistency
            div.style.padding = '10px';
            div.onclick = () => openReadModal(story);
            div.innerHTML = `<strong>@${story.profiles.username}</strong> (${story.votes} ❤️)<br><small>${story.content.substring(0, 50)}...</small>`;
            container.appendChild(div);
        }
    });
}

// --- PUBLISH STORY ---
document.getElementById('publishBtn').addEventListener('click', async () => {
    const text = document.getElementById('mainStoryInput').value;
    if (!text) return alert("Write something first!");

    const { error } = await supabase.from('stories').insert([{
        content: text,
        user_id: currentUser.id, // Uses Auth ID
        votes: 0
    }]);

    if (error) {
        alert(error.message);
    } else {
        document.getElementById('mainStoryInput').value = '';
        fetchStories();
    }
});

// --- READ MODAL & COMMENTS ---
let activeStoryId = null;

async function openReadModal(story) {
    activeStoryId = story.id;
    const modal = document.getElementById('readModal');
    document.getElementById('readModalAuthor').innerText = "By @" + story.profiles.username;
    document.getElementById('readModalText').innerText = story.content;
    
    modal.classList.remove('hidden');
    fetchComments(story.id);
}

async function fetchComments(storyId) {
    const list = document.getElementById('modalCommentsList');
    list.innerHTML = 'Loading...';
    
    const { data: comments } = await supabase
        .from('comments')
        .select('*, profiles(username)')
        .eq('story_id', storyId)
        .order('created_at', { ascending: true });

    list.innerHTML = '';
    comments.forEach(c => {
        const div = document.createElement('div');
        div.className = 'comment-item';
        div.innerHTML = `<div class="comment-author">@${c.profiles.username}</div><div>${escapeHtml(c.content)}</div>`;
        list.appendChild(div);
    });
}

document.getElementById('postCommentBtn').addEventListener('click', async () => {
    const input = document.getElementById('newCommentInput');
    if(!input.value) return;
    if(!currentUser) return alert("Please log in to comment.");

    await supabase.from('comments').insert({
        content: input.value,
        story_id: activeStoryId,
        user_id: currentUser.id
    });
    input.value = '';
    fetchComments(activeStoryId);
});

// --- PROFILE MANAGEMENT ---
document.getElementById('navProfileBtn').addEventListener('click', async () => {
    document.getElementById('profileName').innerText = currentProfile.username;
    document.getElementById('profileAvatar').src = currentProfile.avatar_url;
    document.getElementById('profileModal').classList.remove('hidden');
    
    // Load User's Stories
    const { data: myStories } = await supabase
        .from('stories')
        .select('*')
        .eq('user_id', currentUser.id)
        .order('created_at', { ascending: false });

    const list = document.getElementById('myStoriesList');
    list.innerHTML = '';
    
    myStories.forEach(story => {
        const div = document.createElement('div');
        div.className = 'my-story-item';
        div.innerHTML = `
            <div>
                <small>${new Date(story.created_at).toLocaleDateString()}</small>
                <p>${story.content.substring(0, 30)}...</p>
                <small>❤️ ${story.votes}</small>
            </div>
            <button class="btn-delete" onclick="deleteStory(${story.id})">Delete</button>
        `;
        list.appendChild(div);
    });
});

document.getElementById('changeAvatarBtn').addEventListener('click', async () => {
    const newUrl = prompt("Enter new image URL for your avatar:");
    if(newUrl) {
        const { error } = await supabase.from('profiles').update({ avatar_url: newUrl }).eq('id', currentUser.id);
        if(!error) {
            currentProfile.avatar_url = newUrl;
            updateUI();
            document.getElementById('profileAvatar').src = newUrl;
        }
    }
});

window.deleteStory = async function(id) {
    if(confirm("Are you sure you want to delete this story?")) {
        await supabase.from('stories').delete().eq('id', id);
        document.getElementById('navProfileBtn').click(); // Refresh list
        fetchStories(); // Refresh main feed
    }
};

// --- UTILS ---
function closeAllModals() {
    document.querySelectorAll('.modal').forEach(m => m.classList.add('hidden'));
}
window.onclick = (e) => { if (e.target.classList.contains('modal')) closeAllModals(); };
function escapeHtml(text) {
    if (!text) return "";
    return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
}

// --- WELCOME OVERLAY ---
document.getElementById('enterBtn').addEventListener('click', () => {
    document.getElementById('welcomeOverlay').classList.add('hidden');
    document.getElementById('youtubePlayer').src = "https://www.youtube.com/embed/hVFaaUEIpzE?start=103&autoplay=1";
    document.getElementById('bgVideo').muted = false;
    document.getElementById('bgVideo').play();
});

init();