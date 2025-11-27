document.addEventListener('DOMContentLoaded', () => {
    
    // REPLACE WITH YOUR ADMIN EMAIL
    const ADMIN_EMAIL = 'your_admin_email@example.com'; 

    // 1. WELCOME BUTTONS
    const enterBtn = document.getElementById('enterBtn');
    if (enterBtn) {
        enterBtn.addEventListener('click', () => {
            const overlay = document.getElementById('welcomeOverlay');
            if (overlay) {
                overlay.style.opacity = '0';
                setTimeout(() => overlay.classList.add('hidden'), 800);
            }
            const bgVideo = document.getElementById('bgVideo');
            if (bgVideo) {
                bgVideo.muted = false;
                bgVideo.play().catch(() => {});
            }
            const ytPlayer = document.getElementById('youtubePlayer');
            if (ytPlayer) ytPlayer.src = "https://www.youtube.com/embed/hVFaaUEIpzE?start=103&autoplay=1&mute=0";
        });
    }

    // INFO BUTTON (RESTORED)
    const infoBtn = document.getElementById('infoBtn');
    if (infoBtn) {
        infoBtn.onclick = () => {
            document.getElementById('aboutModal').classList.remove('hidden');
        };
    }

    // 2. SUPABASE INIT
    let supabase = null;
    try {
        const SUPABASE_URL = 'https://lypndarukqjtkyhxygwe.supabase.co';
        const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx5cG5kYXJ1a3FqdGt5aHh5Z3dlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM3Nzc2NzAsImV4cCI6MjA3OTM1MzY3MH0.NE5Q1BFVsBDyKSUxHO--aR-jbSHSLW8klha7C7_VbUA';
        supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
    } catch (err) { return; }

    let currentUser = null;
    let currentProfile = null;
    let isAdmin = false;

    // --- APP START ---
    async function initApp() {
        const { data: { session } } = await supabase.auth.getSession();
        if (session) handleUserSession(session);
        
        supabase.auth.onAuthStateChange((_, session) => {
            handleUserSession(session);
        });

        fetchStories(); 
    }

    async function handleUserSession(session) {
        if (session) {
            currentUser = session.user;
            isAdmin = (currentUser.email === ADMIN_EMAIL);
            await fetchUserProfile();
        } else {
            currentUser = null;
            currentProfile = null;
            isAdmin = false;
        }
        updateUI();
        fetchStories();
    }

    // --- UI UPDATES ---
    const nav = document.getElementById('mainNav');
    window.addEventListener('scroll', () => {
        if (window.scrollY > 50) nav.classList.add('scrolled');
        else nav.classList.remove('scrolled');
    });

    async function fetchUserProfile() {
        if(!currentUser) return;
        const { data } = await supabase
            .from('profiles')
            .select('*, flairs(css_class)')
            .eq('id', currentUser.id)
            .single();
        currentProfile = data;
    }

    function updateUI() {
        const loggedOut = document.getElementById('loggedOutNav');
        const loggedIn = document.getElementById('loggedInNav');
        const guestInput = document.getElementById('guestPenName');
        
        if (currentUser && currentProfile) {
            loggedOut.classList.add('hidden');
            loggedIn.classList.remove('hidden');
            guestInput.classList.add('hidden');
            
            document.getElementById('navUsername').innerText = currentProfile.username;
            
            const avatars = [document.getElementById('navAvatar'), document.getElementById('profileAvatar')];
            const flairClass = currentProfile.flairs ? currentProfile.flairs.css_class : '';
            
            avatars.forEach(img => {
                img.src = currentProfile.avatar_url || 'https://i.imgur.com/6UD0njE.png';
                img.className = img.id === 'navAvatar' ? 'avatar-small' : 'avatar-large';
                if(flairClass) img.classList.add(flairClass);
            });
        } else {
            loggedOut.classList.remove('hidden');
            loggedIn.classList.add('hidden');
            guestInput.classList.remove('hidden');
        }
    }

    // --- AUTH LOGIC ---
    let isSignUp = false;
    const authModal = document.getElementById('authModal');
    document.getElementById('navLoginBtn').onclick = () => authModal.classList.remove('hidden');

    document.getElementById('authSwitchBtn').onclick = function() {
        isSignUp = !isSignUp;
        document.getElementById('authTitle').innerText = isSignUp ? "Sign Up" : "Log In";
        document.getElementById('authActionBtn').innerText = isSignUp ? "Create Account" : "Log In";
        document.getElementById('authToggleText').innerText = isSignUp ? "Already have an account?" : "Don't have an account?";
        this.innerText = isSignUp ? "Log In" : "Sign Up";
        document.getElementById('usernameInput').classList.toggle('hidden', !isSignUp);
    };

    document.getElementById('authActionBtn').onclick = async function() {
        const email = document.getElementById('emailInput').value;
        const password = document.getElementById('passwordInput').value;
        const username = document.getElementById('usernameInput').value;
        const errorMsg = document.getElementById('authError');
        errorMsg.innerText = "";

        if(!email || !password) return errorMsg.innerText = "All fields required";

        try {
            if(isSignUp) {
                if(!username) return errorMsg.innerText = "Pen Name required";
                const { error } = await supabase.auth.signUp({
                    email, password,
                    options: { data: { username: username } }
                });
                if(error) throw error;
                alert("Welcome!");
            } else {
                const { error } = await supabase.auth.signInWithPassword({ email, password });
                if(error) throw error;
            }
            closeAllModals();
        } catch(e) {
            errorMsg.innerText = e.message;
        }
    };

    // --- STORIES ---
    async function fetchStories() {
        const feed = document.getElementById('storyFeed');
        if(!feed) return;
        feed.innerHTML = '<p style="text-align:center;">Loading...</p>';
        
        const { data: stories, error } = await supabase
            .from('stories')
            .select(`*, profiles (username, avatar_url, selected_flair_id, flairs(css_class)), comments (count)`)
            .order('created_at', { ascending: false });

        if (error) return;
        feed.innerHTML = '';
        
        // Leaderboard
        const topStories = [...stories].sort((a, b) => b.votes - a.votes).slice(0, 3);
        const lb = document.getElementById('topStories');
        if(lb) {
            lb.innerHTML = '';
            topStories.forEach(s => {
                if(s.votes > 0) {
                    let u = s.profiles ? s.profiles.username : (s.guest_name || 'Guest');
                    lb.innerHTML += `<div class="story-card" style="padding:10px" onclick="openReadModal(${s.id})"><strong>@${u}</strong> (${s.votes} ❤️)<br><small>${escapeHtml(s.content.substring(0,50))}...</small></div>`;
                }
            });
        }

        stories.forEach(story => {
            const card = document.createElement('div');
            card.className = 'story-card';
            
            let username = 'Guest';
            let avatar = 'https://i.imgur.com/6UD0njE.png';
            let flairClass = '';
            let isOwner = (currentUser && story.user_id === currentUser.id);

            if (story.profiles) {
                username = story.profiles.username;
                avatar = story.profiles.avatar_url || avatar;
                if(story.profiles.flairs) flairClass = story.profiles.flairs.css_class;
            } else if (story.guest_name) {
                username = story.guest_name + " (Guest)";
            }

            const userIdKey = currentUser ? currentUser.id : 'guest';
            const votedStories = JSON.parse(localStorage.getItem(`voted_${userIdKey}`)) || [];
            const hasVoted = votedStories.includes(story.id);

            let menuHtml = '';
            if(isOwner || isAdmin) {
                menuHtml = `
                <div class="menu-container">
                    <button class="menu-trigger" onclick="toggleMenu(this)">⋮</button>
                    <div class="menu-dropdown">
                        ${isOwner ? `<button class="menu-item" onclick="editStoryInit(${story.id})">Edit</button>` : ''}
                        <button class="menu-item delete" onclick="deleteStory(${story.id})">Delete</button>
                    </div>
                </div>`;
            }

            card.innerHTML = `
                <div style="display:flex; justify-content:space-between; align-items:flex-start;">
                    <div class="profile-header" style="margin-bottom:10px;">
                        <img src="${avatar}" class="avatar-small ${flairClass}" style="margin-right:10px;">
                        <span style="color:#d4a373; font-weight:bold;">@${username}</span>
                    </div>
                    ${menuHtml}
                </div>
                <div class="story-text" id="story-text-${story.id}">${escapeHtml(story.content)}</div>
                <div class="story-meta">
                    <button id="btn-${story.id}" class="vote-btn ${hasVoted ? 'voted' : ''}" onclick="toggleVote(event, ${story.id}, ${story.votes})">
                        ${hasVoted ? '❤️' : '🤍'} <span>${story.votes}</span>
                    </button>
                    <span>💬 ${story.comments ? story.comments[0].count : 0} comments</span>
                </div>
            `;
            
            card.addEventListener('click', (e) => {
                if(!e.target.closest('button') && !e.target.closest('.menu-container') && !e.target.closest('textarea')) {
                    openReadModal(story); 
                }
            });
            feed.appendChild(card);
        });
    }

    window.toggleVote = async function(event, id, currentVotes) {
        event.stopPropagation();
        const userIdKey = currentUser ? currentUser.id : 'guest';
        const storageKey = `voted_${userIdKey}`;
        
        let votedStories = JSON.parse(localStorage.getItem(storageKey)) || [];
        const hasVoted = votedStories.includes(id);
        
        let newVotes;
        if (hasVoted) {
            newVotes = Math.max(0, currentVotes - 1);
            votedStories = votedStories.filter(storyId => storyId !== id);
        } else {
            newVotes = currentVotes + 1;
            votedStories.push(id);
        }

        localStorage.setItem(storageKey, JSON.stringify(votedStories));
        const btn = document.getElementById(`btn-${id}`);
        if(btn) {
            btn.innerHTML = `${!hasVoted ? '❤️' : '🤍'} <span>${newVotes}</span>`;
            btn.classList.toggle('voted');
            btn.onclick = (e) => window.toggleVote(e, id, newVotes); 
        }
        await supabase.from('stories').update({ votes: newVotes }).eq('id', id);
    }

    // --- PASSPORT & FLAIRS ---
    if(document.getElementById('navProfileBtn')) {
        document.getElementById('navProfileBtn').addEventListener('click', async () => {
            document.getElementById('profileModal').classList.remove('hidden');
            loadPassport();
            loadMyStories();
        });
    }

    async function loadPassport() {
        const grid = document.getElementById('flairGrid');
        grid.innerHTML = 'Loading...';
        const { data: allFlairs } = await supabase.from('flairs').select('*');
        const { data: userFlairs } = await supabase.from('user_flairs').select('flair_id').eq('user_id', currentUser.id);
        const earnedIds = userFlairs.map(uf => uf.flair_id);
        grid.innerHTML = '';

        allFlairs.forEach(f => {
            const isUnlocked = earnedIds.includes(f.id);
            const isSelected = currentProfile.selected_flair_id === f.id;
            const div = document.createElement('div');
            div.className = `flair-item ${isUnlocked ? 'unlocked' : ''} ${isSelected ? 'selected' : ''}`;
            if(isUnlocked) div.onclick = () => equipFlair(f.id);
            div.innerHTML = `<div class="flair-preview ${f.css_class}" style="background:#333;"></div><span>${f.name}</span>`;
            grid.appendChild(div);
        });
    }

    async function equipFlair(id) {
        await supabase.from('profiles').update({ selected_flair_id: id }).eq('id', currentUser.id);
        await fetchUserProfile();
        updateUI();
        loadPassport();
    }

    async function loadMyStories() {
        const { data: myStories } = await supabase.from('stories').select('*').eq('user_id', currentUser.id);
        const list = document.getElementById('myStoriesList');
        list.innerHTML = '';
        myStories.forEach(s => {
            list.innerHTML += `<div style="border-bottom:1px solid #ccc; padding:10px; display:flex; justify-content:space-between;">
                <span>${escapeHtml(s.content.substring(0,30))}...</span>
                <button class="btn-delete" onclick="deleteStory(${s.id})">Delete</button>
            </div>`;
        });
    }

    window.closeAllModals = function() { document.querySelectorAll('.modal').forEach(m => m.classList.add('hidden')); }
    window.onclick = (e) => { if (e.target.classList.contains('modal')) closeAllModals(); };
    window.toggleMenu = function(btn) {
        document.querySelectorAll('.menu-dropdown').forEach(d => d.classList.remove('show'));
        btn.nextElementSibling.classList.toggle('show');
    }

    let activeStoryId = null;
    window.openReadModal = async function(storyObjOrId) {
        let story = storyObjOrId;
        if (typeof storyObjOrId === 'number') {
            const { data } = await supabase.from('stories').select('*, profiles(username)').eq('id', storyObjOrId).single();
            story = data;
        }
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
        const { data: comments } = await supabase.from('comments').select('*, profiles(username)').eq('story_id', storyId).order('created_at');
        list.innerHTML = '';
        comments.forEach(c => {
            let u = c.profiles ? c.profiles.username : (c.guest_name || 'Guest');
            let delBtn = (isAdmin || (currentUser && c.user_id === currentUser.id)) ? 
                `<button class="btn-delete" style="font-size:0.7rem;" onclick="deleteComment(${c.id})">X</button>` : '';
            list.innerHTML += `<div class="comment-item"><div><strong>@${u}</strong>: ${escapeHtml(c.content)}</div>${delBtn}</div>`;
        });
    }

    window.deleteStory = async (id) => {
        if(confirm("Delete this story?")) {
            await supabase.from('stories').delete().eq('id', id);
            fetchStories();
            if(!document.getElementById('profileModal').classList.contains('hidden')) loadMyStories();
        }
    }
    window.deleteComment = async (id) => {
        if(confirm("Delete comment?")) {
            await supabase.from('comments').delete().eq('id', id);
            fetchComments(activeStoryId);
        }
    }
    window.editStoryInit = (id) => {
        const d = document.getElementById(`story-text-${id}`);
        const txt = d.innerText;
        d.innerHTML = `<textarea id="edit-${id}" style="height:100px">${txt}</textarea><button class="btn-primary" onclick="saveStory(${id})">Save</button>`;
    }
    window.saveStory = async (id) => {
        const val = document.getElementById(`edit-${id}`).value;
        await supabase.from('stories').update({ content: val }).eq('id', id);
        fetchStories();
    }
    function escapeHtml(text) { return text ? text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;") : ""; }

    document.getElementById('publishBtn').addEventListener('click', async () => {
        const txt = document.getElementById('mainStoryInput').value;
        const pen = document.getElementById('guestPenName').value;
        if(!txt) return;
        const payload = { content: txt, votes: 0 };
        if(currentUser) payload.user_id = currentUser.id;
        else { if(!pen) return alert("Pen name needed"); payload.guest_name = pen; }
        const { error } = await supabase.from('stories').insert(payload);
        if(error) alert(error.message); else {
            document.getElementById('mainStoryInput').value = '';
            fetchStories();
        }
    });

    document.getElementById('postCommentBtn').addEventListener('click', async () => {
        const val = document.getElementById('newCommentInput').value;
        const pen = document.getElementById('commentGuestName').value;
        if(!val) return;
        const payload = { content: val, story_id: activeStoryId };
        if(currentUser) payload.user_id = currentUser.id;
        else { if(!pen) return alert("Name needed"); payload.guest_name = pen; }
        await supabase.from('comments').insert(payload);
        document.getElementById('newCommentInput').value = '';
        fetchComments(activeStoryId);
    });

    document.getElementById('logoutBtn').onclick = async () => { await supabase.auth.signOut(); };
    
    initApp();
});
