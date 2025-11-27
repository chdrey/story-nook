document.addEventListener('DOMContentLoaded', () => {
    console.log("Website Loaded v5.2 - Admin Debug Mode");

    // --- 1. BUTTON LISTENERS ---
    const infoBtn = document.getElementById('infoBtn');
    if (infoBtn) infoBtn.onclick = () => document.getElementById('aboutModal').classList.remove('hidden');

    const passportInfoBtn = document.getElementById('passportInfoBtn');
    if (passportInfoBtn) passportInfoBtn.onclick = () => document.getElementById('passportInfoModal').classList.remove('hidden');

    const adminBtn = document.getElementById('adminDashboardBtn');
    if(adminBtn) {
        adminBtn.onclick = () => {
            document.getElementById('adminModal').classList.remove('hidden');
            loadAllUsers();
        };
    }

    // --- 2. SUPABASE INIT ---
    const ADMIN_EMAIL = 'chdrey@gmail.com'; 
    let supabase = null;
    let currentUser = null;
    let currentProfile = null;
    let isAdmin = false;
    let activeStoryId = null; // Fix for comments

    try {
        const SUPABASE_URL = 'https://lypndarukqjtkyhxygwe.supabase.co';
        const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx5cG5kYXJ1a3FqdGt5aHh5Z3dlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM3Nzc2NzAsImV4cCI6MjA3OTM1MzY3MH0.NE5Q1BFVsBDyKSUxHO--aR-jbSHSLW8klha7C7_VbUA';
        
        if (window.supabase) {
            supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
            initApp(); 
        } else {
            console.warn("Supabase script not loaded.");
        }
    } catch (err) { console.error("Supabase Init Error:", err); }

    // --- 3. APP LOGIC ---
    async function initApp() {
        const { data: { session } } = await supabase.auth.getSession();
        if (session) handleUserSession(session);
        supabase.auth.onAuthStateChange((_, session) => {
            handleUserSession(session);
        });
        fetchStories(); 
        setupProfileActions(); 
    }

    async function handleUserSession(session) {
        if (session) {
            currentUser = session.user;
            await fetchUserProfile();
            checkAdminStatus(); 
        } else {
            currentUser = null;
            currentProfile = null;
            isAdmin = false;
            if(adminBtn) adminBtn.classList.add('hidden');
        }
        updateUI();
        fetchStories();
    }

    // --- ADMIN CHECKER ---
    function checkAdminStatus() {
        if (!currentUser) return;
        const userEmail = currentUser.email ? currentUser.email.toLowerCase() : '';
        const targetEmail = ADMIN_EMAIL.toLowerCase();
        
        const isEmailMatch = userEmail === targetEmail;
        const isUserMatch = currentProfile && currentProfile.username === 'PenPaleto';

        if (isEmailMatch || isUserMatch) {
            isAdmin = true;
            const btn = document.getElementById('adminDashboardBtn');
            if(btn) btn.classList.remove('hidden');
        }
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
            
            const navUser = document.getElementById('navUsername');
            if(navUser) navUser.innerText = currentProfile.username;
            
            const profileName = document.getElementById('profileNameDisplay');
            if(profileName) profileName.innerText = currentProfile.username;

            const avatars = [document.getElementById('navAvatar'), document.getElementById('profileAvatar')];
            const flairClass = currentProfile.flairs ? currentProfile.flairs.css_class : '';
            avatars.forEach(img => {
                if(img) {
                    img.src = currentProfile.avatar_url || 'https://i.imgur.com/6UD0njE.png';
                    img.className = img.id === 'navAvatar' ? 'avatar-small' : 'avatar-large profile-trigger-action';
                    img.classList.remove('frame-wood', 'frame-stone', 'frame-iron', 'frame-gold', 'frame-diamond', 'frame-cosmic');
                    if(flairClass) img.classList.add(flairClass);
                }
            });
        } else {
            loggedOut.classList.remove('hidden');
            loggedIn.classList.add('hidden');
            guestInput.classList.remove('hidden');
        }
    }

    // --- AUTH ---
    let isSignUp = false;
    const authModal = document.getElementById('authModal');
    if(document.getElementById('navLoginBtn')) {
        document.getElementById('navLoginBtn').onclick = () => authModal.classList.remove('hidden');
    }

    if(document.getElementById('authSwitchBtn')) {
        document.getElementById('authSwitchBtn').onclick = function() {
            isSignUp = !isSignUp;
            document.getElementById('authTitle').innerText = isSignUp ? "Sign Up" : "Log In";
            document.getElementById('authActionBtn').innerText = isSignUp ? "Create Account" : "Log In";
            this.innerText = isSignUp ? "Log In" : "Sign Up";
            document.getElementById('usernameInput').classList.toggle('hidden', !isSignUp);
        };
    }

    const authActionBtn = document.getElementById('authActionBtn');
    if(authActionBtn) {
        authActionBtn.onclick = async function() {
            const email = document.getElementById('emailInput').value;
            const password = document.getElementById('passwordInput').value;
            const username = document.getElementById('usernameInput').value;
            const errorMsg = document.getElementById('authError');
            errorMsg.innerText = "";

            if(!email || !password) return errorMsg.innerText = "All fields required";

            try {
                if(isSignUp) {
                    if(!username) return errorMsg.innerText = "Pen Name required";
                    const { data: existing } = await supabase.from('profiles').select('username').eq('username', username).single();
                    if(existing) throw new Error("This Pen Name is already taken. Be original!");

                    const { error } = await supabase.auth.signUp({
                        email, password,
                        options: { data: { username: username } }
                    });
                    if(error) throw error;
                    alert("Welcome! Please check your email to confirm if required.");
                    closeAllModals();
                } else {
                    const { error } = await supabase.auth.signInWithPassword({ email, password });
                    if(error) throw error;
                    closeAllModals();
                }
            } catch(e) {
                errorMsg.innerText = e.message;
            }
        };
    }

    // --- ADMIN LOGIC ---
    window.switchAdminTab = (tab) => {
        document.querySelectorAll('.admin-tab-content').forEach(d => d.classList.add('hidden'));
        document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        if(tab === 'users') {
            document.getElementById('adminTabUsers').classList.remove('hidden');
            document.querySelector('.tab-btn:nth-child(1)').classList.add('active');
        } else {
            document.getElementById('adminTabContest').classList.remove('hidden');
            document.querySelector('.tab-btn:nth-child(2)').classList.add('active');
        }
    };

    async function loadAllUsers() {
        const list = document.getElementById('adminUserList');
        list.innerHTML = 'Loading...';
        const term = document.getElementById('adminUserSearch').value.toLowerCase();
        
        let query = supabase.from('profiles').select('*, user_flairs(flair_id)');
        if(term) query = query.ilike('username', `%${term}%`);
        
        const { data: users } = await query.order('username');
        list.innerHTML = '';

        users.forEach(u => {
            const card = document.createElement('div');
            card.className = 'admin-user-card';
            
            const earned = u.user_flairs.map(f => f.flair_id);
            let badgeHtml = '';
            // IDs: 1=Wood, 2=Copper, 3=Stone, 4=Iron, 5=Gold, 6=Diamond
            const badges = [
                {id: 1, cls: 'frame-wood'}, {id: 2, cls: 'frame-copper'},
                {id: 3, cls: 'frame-stone'}, {id: 4, cls: 'frame-iron'},
                {id: 5, cls: 'frame-gold'}, {id: 6, cls: 'frame-diamond'}
            ];

            badges.forEach(b => {
                const has = earned.includes(b.id);
                badgeHtml += `<div class="admin-badge-btn ${has ? 'owned' : ''} ${b.cls}" 
                              onclick="toggleUserBadge('${u.id}', ${b.id}, ${has}, this)"></div>`;
            });

            card.innerHTML = `
                <div class="admin-user-header">
                    <strong>@${u.username}</strong>
                    <button class="btn-delete" onclick="adminBanUser('${u.id}')" style="font-size:0.7rem;">BAN</button>
                </div>
                <div class="admin-badge-controls">${badgeHtml}</div>
            `;
            list.appendChild(card);
        });
    }

    window.toggleUserBadge = async (userId, badgeId, hasBadge, btn) => {
        if(!confirm(hasBadge ? "Remove badge?" : "Award badge?")) return;
        
        if(hasBadge) {
            await supabase.from('user_flairs').delete().eq('user_id', userId).eq('flair_id', badgeId);
            btn.classList.remove('owned');
        } else {
            await supabase.from('user_flairs').insert({ user_id: userId, flair_id: badgeId });
            btn.classList.add('owned');
        }
    };

    window.adminBanUser = async (userId) => {
        if(confirm("Ban this user? They will be signed out and deleted.")) {
            await supabase.from('profiles').delete().eq('id', userId);
            alert("User data removed.");
            loadAllUsers();
        }
    };

    const adminSearch = document.getElementById('adminUserSearch');
    if(adminSearch) adminSearch.addEventListener('keyup', loadAllUsers);

    window.adminAwardWinner = async (place) => {
        const inputId = `winner${place}Input`;
        const username = document.getElementById(inputId).value;
        if(!username) return alert("Enter username");

        const { data: user } = await supabase.from('profiles').select('id').eq('username', username).single();
        if(!user) return alert("User not found");

        let badgeId;
        if(place === 1) badgeId = 5; 
        else if(place === 2) badgeId = 4;
        else if(place === 3) badgeId = 3; 

        await supabase.from('user_flairs').insert({ user_id: user.id, flair_id: badgeId });
        alert(`Awarded Badge #${badgeId} to ${username}!`);
        document.getElementById(inputId).value = '';
    };

    // --- STANDARD APP LOGIC ---
    function setupProfileActions() {
        if(document.getElementById('navProfileBtn')) {
            document.getElementById('navProfileBtn').addEventListener('click', async () => {
                document.getElementById('profileModal').classList.remove('hidden');
                loadPassport();
                loadMyStories();
            });
        }

        const profileAvatar = document.getElementById('profileAvatar');
        if(profileAvatar) {
            profileAvatar.addEventListener('click', async () => {
                 const newUrl = prompt("Enter URL for new profile picture:", currentProfile.avatar_url || "");
                 if(newUrl && newUrl !== currentProfile.avatar_url) {
                     await supabase.from('profiles').update({ avatar_url: newUrl }).eq('id', currentUser.id);
                     await fetchUserProfile();
                     updateUI();
                 }
            });
        }

        const changePassBtn = document.getElementById('changePasswordBtn');
        if(changePassBtn) {
            changePassBtn.addEventListener('click', async () => {
                const newPass = document.getElementById('newPasswordInput').value;
                if(newPass) {
                    await supabase.auth.updateUser({ password: newPass });
                    alert("Password updated.");
                    document.getElementById('newPasswordInput').value = '';
                }
            });
        }

        const logoutBtn = document.getElementById('logoutBtn');
        if(logoutBtn) logoutBtn.onclick = async () => { await supabase.auth.signOut(); closeAllModals(); };

        const deleteAccountBtn = document.getElementById('deleteAccountBtn');
        if(deleteAccountBtn) {
            deleteAccountBtn.addEventListener('click', async () => {
                if(confirm("⚠️ ARE YOU SURE? Account deletion is permanent.")) {
                    await supabase.from('stories').delete().eq('user_id', currentUser.id);
                    await supabase.from('profiles').delete().eq('id', currentUser.id);
                    await supabase.auth.signOut();
                    window.location.reload(); 
                }
            });
        }
    }

    async function fetchStories() {
        const feed = document.getElementById('storyFeed');
        if(!feed) return;
        feed.innerHTML = '<p style="text-align:center;">Loading...</p>';
        const { data: stories } = await supabase.from('stories').select(`*, profiles (username, avatar_url, selected_flair_id, flairs(css_class)), comments (count)`).order('created_at', { ascending: false });
        feed.innerHTML = '';
        
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
            let username = story.profiles ? story.profiles.username : (story.guest_name + " (Guest)");
            let avatar = story.profiles?.avatar_url || 'https://i.imgur.com/6UD0njE.png';
            let flairClass = story.profiles?.flairs?.css_class || '';
            
            let menuHtml = '';
            const isOwner = (currentUser && story.user_id === currentUser.id);
            if(isOwner || isAdmin) {
                menuHtml = `<div class="menu-container"><button class="menu-trigger" onclick="toggleMenu(this)">⋮</button>
                <div class="menu-dropdown"><button class="menu-item delete" onclick="deleteStory(${story.id})">Delete</button></div></div>`;
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
                    <button id="btn-${story.id}" class="vote-btn" onclick="toggleVote(event, ${story.id}, ${story.votes})">❤️ <span>${story.votes}</span></button>
                    <span>💬 ${story.comments ? story.comments[0].count : 0}</span>
                </div>`;
            
            card.addEventListener('click', (e) => {
                if(!e.target.closest('button') && !e.target.closest('.menu-container')) openReadModal(story); 
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
        if(btn) btn.innerHTML = `❤️ <span>${newVotes}</span>`;
        await supabase.from('stories').update({ votes: newVotes }).eq('id', id);
    }

    async function loadPassport() {
        const grid = document.getElementById('flairGrid');
        grid.innerHTML = 'Loading...';
        const { data: allFlairs } = await supabase.from('flairs').select('*').order('id', { ascending: true });
        const { data: userFlairs } = await supabase.from('user_flairs').select('flair_id').eq('user_id', currentUser.id);
        
        const counts = {};
        if (userFlairs) userFlairs.forEach(uf => counts[uf.flair_id] = (counts[uf.flair_id] || 0) + 1);
        const earnedIds = userFlairs.map(uf => uf.flair_id);
        grid.innerHTML = '';

        allFlairs.forEach(f => {
            const isUnlocked = earnedIds.includes(f.id);
            const isSelected = currentProfile.selected_flair_id === f.id;
            const div = document.createElement('div');
            div.className = `flair-item ${isUnlocked ? 'unlocked' : ''} ${isSelected ? 'selected' : ''}`;
            if(isUnlocked) div.onclick = () => equipFlair(f.id);
            div.innerHTML = `<div class="flair-preview ${f.css_class}"></div><span>${f.name}</span><div class="my-badge-tooltip">Times earned: ${counts[f.id] || 0}</div>`;
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
        const { data: myStories } = await supabase.from('stories').select('*').eq('user_id', currentUser.id).order('created_at', { ascending: false });
        const list = document.getElementById('myStoriesList');
        list.innerHTML = '';
        myStories.forEach(s => {
            const details = document.createElement('details');
            details.style.borderBottom = "1px solid #ccc"; details.style.padding = "10px 0";
            const summary = document.createElement('summary');
            summary.style.cssText = "display:flex; justify-content:space-between; cursor:pointer; font-weight:bold;";
            summary.innerHTML = `<span>${s.content.substring(0,30)}...</span>`;
            
            const del = document.createElement('button');
            del.innerText = 'X'; del.className = 'btn-delete';
            del.onclick = async (e) => {
                e.stopPropagation();
                if(confirm("Delete?")) { await supabase.from('stories').delete().eq('id', s.id); loadMyStories(); }
            };
            summary.appendChild(del);
            details.appendChild(summary);
            details.appendChild(Object.assign(document.createElement('div'), {innerText: s.content, style:"padding:10px; font-style:italic;"}));
            list.appendChild(details);
        });
    }

    window.closeAllModals = function() { document.querySelectorAll('.modal').forEach(m => m.classList.add('hidden')); }
    window.onclick = (e) => { if (e.target.classList.contains('modal')) closeAllModals(); };
    window.toggleMenu = (btn) => { 
        document.querySelectorAll('.menu-dropdown').forEach(d => d.classList.remove('show'));
        btn.nextElementSibling.classList.toggle('show');
    };

    window.openReadModal = async (story) => {
        if(typeof story === 'number') { const {data} = await supabase.from('stories').select('*, profiles(username)').eq('id', story).single(); story = data; }
        activeStoryId = story.id;
        document.getElementById('readModalAuthor').innerText = "By @" + (story.profiles ? story.profiles.username : "Guest");
        document.getElementById('readModalText').innerText = story.content;
        document.getElementById('readModal').classList.remove('hidden');
        fetchComments(story.id);
    }

    async function fetchComments(storyId) {
        const list = document.getElementById('modalCommentsList');
        list.innerHTML = 'Loading...';
        const { data: comments } = await supabase.from('comments').select('*, profiles(username)').eq('story_id', storyId);
        list.innerHTML = '';
        comments.forEach(c => {
            const u = c.profiles ? c.profiles.username : c.guest_name;
            const del = (isAdmin || (currentUser && c.user_id === currentUser.id)) ? `<button onclick="deleteComment(${c.id})">X</button>` : '';
            list.innerHTML += `<div class="comment-item"><div><strong>@${u}</strong>: ${escapeHtml(c.content)}</div>${del}</div>`;
        });
    }

    window.deleteStory = async (id) => { if(confirm("Delete?")) { await supabase.from('stories').delete().eq('id', id); fetchStories(); } };
    window.deleteComment = async (id) => { if(confirm("Delete?")) { await supabase.from('comments').delete().eq('id', id); fetchComments(activeStoryId); } };
    function escapeHtml(text) { return text ? text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;") : ""; }

    const publishBtn = document.getElementById('publishBtn');
    if(publishBtn) publishBtn.onclick = async () => {
        const txt = document.getElementById('mainStoryInput').value;
        const pen = document.getElementById('guestPenName').value;
        if(!txt) return;
        const payload = { content: txt, votes: 0 };
        if(currentUser) payload.user_id = currentUser.id; else { if(!pen) return alert("Pen Name needed"); payload.guest_name = pen; }
        await supabase.from('stories').insert(payload);
        document.getElementById('mainStoryInput').value = ''; fetchStories();
    };

    const postCommentBtn = document.getElementById('postCommentBtn');
    if(postCommentBtn) postCommentBtn.onclick = async () => {
        const val = document.getElementById('newCommentInput').value;
        const pen = document.getElementById('commentGuestName').value;
        if(!val) return;
        const payload = { content: val, story_id: activeStoryId };
        if(currentUser) payload.user_id = currentUser.id; else { if(!pen) return alert("Name needed"); payload.guest_name = pen; }
        await supabase.from('comments').insert(payload);
        document.getElementById('newCommentInput').value = '';
        fetchComments(activeStoryId);
    };
});
