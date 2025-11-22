// --- CONFIGURATION ---
const SUPABASE_URL = 'https://lypndarukqjtkyhxygwe.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx5cG5kYXJ1a3FqdGt5aHh5Z3dlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM3Nzc2NzAsImV4cCI6MjA3OTM1MzY3MH0.NE5Q1BFVsBDyKSUxHO--aR-jbSHSLW8klha7C7_VbUA';
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// --- DOM Elements ---
const loggedOutNav = document.getElementById('loggedOutNav');
const loggedInNav = document.getElementById('loggedInNav');
const guestPenNameInput = document.getElementById('guestPenName');
const commentGuestName = document.getElementById('commentGuestName');
const authModal = document.getElementById('authModal');
const mainNav = document.getElementById('mainNav');

// New Info Elements
const infoBtn = document.getElementById('infoBtn');
const aboutModal = document.getElementById('aboutModal');

// Upload & Profile Elements
const changeAvatarBtn = document.getElementById('changeAvatarBtn');
const avatarUploadInput = document.createElement('input'); 
avatarUploadInput.type = 'file';
avatarUploadInput.accept = 'image/*';

// Settings Elements
const updateUsernameInput = document.getElementById('updateUsernameInput');
const saveUsernameBtn = document.getElementById('saveUsernameBtn');
const newPasswordInput = document.getElementById('newPasswordInput');
const changePasswordBtn = document.getElementById('changePasswordBtn');
const deleteAccountBtn = document.getElementById('deleteAccountBtn');

let currentUser = null;
let currentProfile = null;

// --- INIT ---
async function init() {
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
        currentUser = session.user;
        await fetchUserProfile();
    }
    updateUI();
    fetchStories();

    supabase.auth.onAuthStateChange(async (event, session) => {
        if (session) {
            currentUser = session.user;
            await fetchUserProfile();
        } else {
            currentUser = null;
            currentProfile = null;
        }
        updateUI();
        fetchStories();
    });
}

// --- SCROLL & NAV ---
window.addEventListener('scroll', () => {
    if (window.scrollY > 50) mainNav.classList.add('scrolled');
    else mainNav.classList.remove('scrolled');
});
document.querySelector('.logo').addEventListener('click', () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
});

// --- MODALS ---
infoBtn.addEventListener('click', () => aboutModal.classList.remove('hidden'));

function closeAllModals() { document.querySelectorAll('.modal').forEach(m => m.classList.add('hidden')); }
window.onclick = (e) => { if (e.target.classList.contains('modal')) closeAllModals(); };

// --- AUTHENTICATION ---
let isSignUp = false;
document.getElementById('navLoginBtn').addEventListener('click', () => authModal.classList.remove('hidden'));

document.querySelector('.auth-link').addEventListener('click', () => {
    isSignUp = !isSignUp;
    document.getElementById('authTitle').innerText = isSignUp ? "Sign Up" : "Log In";
    document.getElementById('authActionBtn').innerText = isSignUp ? "Sign Up & Log In" : "Log In"; 
    document.getElementById('usernameInput').classList.toggle('hidden', !isSignUp);
    document.getElementById('switchAuthMode').innerHTML = isSignUp ? 
        "Already have an account? <span class='auth-link'>Log In</span>" : 
        "Don't have an account? <span class='auth-link'>Sign Up</span>";
    document.querySelector('.auth-link').addEventListener('click', arguments.callee);
});

document.getElementById('authActionBtn').addEventListener('click', async () => {
    const email = document.getElementById('emailInput').value;
    const password = document.getElementById('passwordInput').value;
    const username = document.getElementById('usernameInput').value;
    const errorMsg = document.getElementById('authError');
    errorMsg.innerText = "";

    if(!email || !password) return errorMsg.innerText = "Please fill in all fields.";

    try {
        if (isSignUp) {
            if(!username) return errorMsg.innerText = "Pen name required.";
            const { error } = await supabase.auth.signUp({
                email, password,
                options: { data: { username: username } }
            });
            if (error) throw error;
            alert("Welcome, " + username + "!");
        } else {
            const { error } = await supabase.auth.signInWithPassword({ email, password });
            if (error) throw error;
        }
        closeAllModals();
    } catch (err) {
        errorMsg.innerText = err.message;
    }
});

document.getElementById('logoutBtn').addEventListener('click', async () => { await supabase.auth.signOut(); });

async function fetchUserProfile() {
    if(!currentUser) return;
    const { data } = await supabase.from('profiles').select('*').eq('id', currentUser.id).single();
    currentProfile = data;
}

function updateUI() {
    if (currentUser && currentProfile) {
        loggedOutNav.classList.add('hidden');
        loggedInNav.classList.remove('hidden');
        guestPenNameInput.classList.add('hidden'); 
        commentGuestName.style.display = 'none';
        document.getElementById('navUsername').innerText = currentProfile.username;
        document.getElementById('navAvatar').src = currentProfile.avatar_url || 'https://i.imgur.com/6UD0njE.png';
    } else {
        loggedOutNav.classList.remove('hidden');
        loggedInNav.classList.add('hidden');
        guestPenNameInput.classList.remove('hidden'); 
        commentGuestName.style.display = 'block';      
    }
}

// --- STORIES & FEED ---
async function fetchStories() {
    const feed = document.getElementById('storyFeed');
    feed.innerHTML = '<p style="text-align:center;">Loading...</p>';
    const { data: stories, error } = await supabase
        .from('stories').select(`*, profiles (username, avatar_url), comments (count)`).order('created_at', { ascending: false });

    if (error) return console.error(error);
    feed.innerHTML = '';
    const topStories = [...stories].sort((a, b) => b.votes - a.votes).slice(0, 3);
    renderLeaderboard(topStories);
    
    stories.forEach(story => {
        const card = document.createElement('div');
        card.className = 'story-card';
        // Only click to read if not clicking a button
        card.onclick = (e) => {
            if(!e.target.closest('button') && !e.target.closest('.menu-container')) openReadModal(story);
        };

        const commentCount = story.comments ? story.comments[0].count : 0;
        let avatar = 'https://i.imgur.com/6UD0njE.png'; 
        let username = 'Guest';
        let isOwner = false;

        if (story.profiles) {
            avatar = story.profiles.avatar_url || 'https://i.imgur.com/6UD0njE.png';
            username = story.profiles.username;
            if(currentUser && story.user_id === currentUser.id) isOwner = true;
        } else if (story.guest_name) {
            username = story.guest_name + " (Guest)";
        }

        // Check if user has voted
        const userIdKey = currentUser ? currentUser.id : 'guest';
        const hasVoted = JSON.parse(localStorage.getItem(`voted_stories_${userIdKey}`))?.includes(story.id);

        let menuHtml = '';
        if(isOwner) {
            menuHtml = `
            <div class="menu-container">
                <button class="menu-trigger" onclick="toggleMenu(this)">⋮</button>
                <div class="menu-dropdown">
                    <button class="menu-item" onclick="editStoryInit(${story.id})">Edit</button>
                    <button class="menu-item delete" onclick="deleteStory(${story.id})">Delete</button>
                </div>
            </div>`;
        }

        card.innerHTML = `
            <div style="display:flex; justify-content:space-between; align-items:flex-start;">
                <div class="profile-header" style="margin-bottom:10px;">
                    <img src="${avatar}" class="avatar-small" style="margin-right:10px;">
                    <span style="color:#d4a373; font-weight:bold;">@${username}</span>
                </div>
                ${menuHtml}
            </div>
            
            <div class="story-text" id="story-text-${story.id}">${escapeHtml(story.content)}</div>
            
            <div class="story-meta">
                <button id="btn-${story.id}" class="vote-btn ${hasVoted ? 'voted' : ''}" onclick="toggleVote(event, ${story.id}, ${story.votes})">
                    ${hasVoted ? '❤️' : '🤍'} <span>${story.votes}</span>
                </button>
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
            let username = story.profiles ? story.profiles.username : (story.guest_name || 'Guest');
            const div = document.createElement('div');
            div.className = 'story-card'; div.style.padding = '10px';
            div.onclick = () => openReadModal(story);
            div.innerHTML = `<strong>@${username}</strong> (${story.votes} ❤️)<br><small>${story.content.substring(0, 50)}...</small>`;
            container.appendChild(div);
        }
    });
}

// --- ACTIONS & VOTING ---
document.getElementById('publishBtn').addEventListener('click', async () => {
    const text = document.getElementById('mainStoryInput').value;
    const guestName = document.getElementById('guestPenName').value;
    if (!text) return alert("Write something first!");
    const payload = { content: text, votes: 0 };
    if (currentUser) { payload.user_id = currentUser.id; } 
    else {
        if (!guestName) return alert("Please enter a Pen Name to post as a Guest!");
        payload.guest_name = guestName;
    }
    const { error } = await supabase.from('stories').insert([payload]);
    if (error) alert(error.message); else {
        document.getElementById('mainStoryInput').value = '';
        document.getElementById('guestPenName').value = '';
        fetchStories();
    }
});

async function toggleVote(event, id, currentVotes) {
    event.stopPropagation();
    
    // Use User ID or 'guest' to key the local storage
    const userIdKey = currentUser ? currentUser.id : 'guest';
    const storageKey = `voted_stories_${userIdKey}`;
    
    let votedStories = JSON.parse(localStorage.getItem(storageKey)) || [];
    const hasVoted = votedStories.includes(id);

    if (hasVoted) { 
        alert("You have already voted for this story.");
        return; 
    }

    // Optimistic Update
    const newVotes = currentVotes + 1; 
    votedStories.push(id); 
    localStorage.setItem(storageKey, JSON.stringify(votedStories));
    
    const btnElement = document.getElementById(`btn-${id}`);
    if(btnElement) {
        btnElement.innerHTML = `❤️ <span>${newVotes}</span>`;
        btnElement.classList.add('voted');
        btnElement.onclick = null; // Disable click visually
    }

    const { error } = await supabase.from('stories').update({ votes: newVotes }).eq('id', id);
    if (error) {
        console.error("Vote failed", error);
        // Revert if error
        votedStories = votedStories.filter(sid => sid !== id);
        localStorage.setItem(storageKey, JSON.stringify(votedStories));
        fetchStories();
    }
}

// --- EDIT & DELETE (3 DOTS) ---
window.toggleMenu = function(btn) {
    // Close others
    document.querySelectorAll('.menu-dropdown').forEach(d => {
        if(d !== btn.nextElementSibling) d.classList.remove('show');
    });
    btn.nextElementSibling.classList.toggle('show');
}
// Close menus when clicking elsewhere
window.addEventListener('click', (e) => {
    if(!e.target.matches('.menu-trigger')) {
        document.querySelectorAll('.menu-dropdown').forEach(d => d.classList.remove('show'));
    }
});

window.deleteStory = async function(id) {
    if(confirm("Are you sure you want to delete this story?")) {
        await supabase.from('stories').delete().eq('id', id);
        fetchStories();
        // If profile modal is open, refresh that too
        if(!document.getElementById('profileModal').classList.contains('hidden')) {
            document.getElementById('navProfileBtn').click();
        }
    }
};

window.editStoryInit = function(id) {
    // Replace text with textarea
    const textDiv = document.getElementById(`story-text-${id}`);
    const currentText = textDiv.innerText;
    textDiv.innerHTML = `
        <textarea id="edit-area-${id}" style="height:150px;">${currentText}</textarea>
        <div style="text-align:right;">
            <button class="btn-secondary small" onclick="fetchStories()">Cancel</button>
            <button class="btn-primary" onclick="saveStoryEdit(${id})">Save</button>
        </div>
    `;
};

window.saveStoryEdit = async function(id) {
    const newText = document.getElementById(`edit-area-${id}`).value;
    const { error } = await supabase.from('stories').update({ content: newText }).eq('id', id);
    if(error) alert("Error updating story");
    fetchStories();
};

// --- READ & COMMENTS ---
let activeStoryId = null;
async function openReadModal(story) {
    activeStoryId = story.id;
    const modal = document.getElementById('readModal');
    let username = story.profiles ? story.profiles.username : (story.guest_name || 'Guest');
    document.getElementById('readModalAuthor').innerText = "By @" + username;
    document.getElementById('readModalText').innerText = story.content;
    modal.classList.remove('hidden');
    fetchComments(story.id);
}

async function fetchComments(storyId) {
    const list = document.getElementById('modalCommentsList');
    list.innerHTML = 'Loading...';
    const { data: comments } = await supabase.from('comments').select('*, profiles(username)').eq('story_id', storyId).order('created_at', { ascending: true });
    list.innerHTML = '';
    
    comments.forEach(c => {
        const div = document.createElement('div');
        div.className = 'comment-item';
        let cUser = c.profiles ? c.profiles.username : (c.guest_name ? c.guest_name + " (Guest)" : 'Guest');
        
        // 3-dots for comments
        let menuHtml = '';
        if(currentUser && c.user_id === currentUser.id) {
            menuHtml = `
            <div class="menu-container">
                <button class="menu-trigger" onclick="toggleMenu(this)" style="font-size:1rem;">⋮</button>
                <div class="menu-dropdown">
                    <button class="menu-item delete" onclick="deleteComment(${c.id})">Delete</button>
                </div>
            </div>`;
        }

        div.innerHTML = `
            <div style="flex-grow:1;">
                <span class="comment-author">@${cUser}</span>
                <div>${escapeHtml(c.content)}</div>
            </div>
            ${menuHtml}
        `;
        list.appendChild(div);
    });
}

window.deleteComment = async function(id) {
    if(confirm("Delete comment?")) {
        await supabase.from('comments').delete().eq('id', id);
        fetchComments(activeStoryId);
    }
}

document.getElementById('postCommentBtn').addEventListener('click', async () => {
    const input = document.getElementById('newCommentInput');
    const guestInput = document.getElementById('commentGuestName');
    if(!input.value) return;
    const payload = { content: input.value, story_id: activeStoryId };
    if (currentUser) { payload.user_id = currentUser.id; } 
    else {
        if(!guestInput.value) return alert("Please enter a name to comment!");
        payload.guest_name = guestInput.value;
    }
    await supabase.from('comments').insert(payload);
    input.value = '';
    fetchComments(activeStoryId);
});

// --- PROFILE & SETTINGS ---
document.getElementById('navProfileBtn').addEventListener('click', async () => {
    document.getElementById('profileNameDisplay').innerText = currentProfile.username;
    document.getElementById('profileAvatar').src = currentProfile.avatar_url || 'https://i.imgur.com/6UD0njE.png';
    document.getElementById('profileModal').classList.remove('hidden');
    
    // Load My Stories for management
    const { data: myStories } = await supabase.from('stories').select('*').eq('user_id', currentUser.id).order('created_at', { ascending: false });
    const list = document.getElementById('myStoriesList');
    list.innerHTML = '';
    myStories.forEach(story => {
        const div = document.createElement('div');
        div.className = 'my-story-item';
        div.innerHTML = `<div><p>${story.content.substring(0, 30)}...</p><small>❤️ ${story.votes}</small></div><button class="btn-delete" onclick="deleteStory(${story.id})">Delete</button>`;
        list.appendChild(div);
    });
});

changeAvatarBtn.addEventListener('click', () => avatarUploadInput.click());
avatarUploadInput.addEventListener('change', async (event) => {
    const file = event.target.files[0];
    if (!file) return;
    const fileExt = file.name.split('.').pop();
    const fileName = `${currentUser.id}-${Math.random()}.${fileExt}`;
    const { error: uploadError } = await supabase.storage.from('avatars').upload(fileName, file);
    if (uploadError) return alert(uploadError.message);
    const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(fileName);
    await supabase.from('profiles').update({ avatar_url: publicUrl }).eq('id', currentUser.id);
    currentProfile.avatar_url = publicUrl;
    document.getElementById('profileAvatar').src = publicUrl;
    updateUI();
});

// Update Username
saveUsernameBtn.addEventListener('click', async () => {
    const newName = updateUsernameInput.value;
    if(!newName) return;
    const { error } = await supabase.from('profiles').update({ username: newName }).eq('id', currentUser.id);
    if(error) alert("Error updating name");
    else {
        alert("Username updated!");
        currentProfile.username = newName;
        updateUI();
        document.getElementById('profileNameDisplay').innerText = newName;
        updateUsernameInput.value = '';
    }
});

// Change Password
changePasswordBtn.addEventListener('click', async () => {
    const newPass = newPasswordInput.value;
    if(!newPass) return alert("Enter a new password");
    // Supabase allows updating password without old password if session is active
    const { error } = await supabase.auth.updateUser({ password: newPass });
    if(error) alert(error.message);
    else {
        alert("Password changed successfully!");
        newPasswordInput.value = '';
    }
});

// Delete Account
deleteAccountBtn.addEventListener('click', async () => {
    if(confirm("⚠️ ARE YOU SURE? This will delete your profile data. You cannot undo this.")) {
        // 1. Delete Profile (Cascades stories/comments if set up in
