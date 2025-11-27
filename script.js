document.addEventListener('DOMContentLoaded', () => {
    console.log("Website Loaded v10.0 - Empty Circle Fix");

    // --- 1. MODAL OPEN LISTENERS ---
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

    // --- 2. MODAL CLOSE LOGIC ---
    window.closeModal = (id) => {
        const modal = document.getElementById(id);
        if (modal) {
            modal.classList.add('hidden');
            if(id === 'profileModal') resetProfileModalToMyView();
        }
    }
    window.closeAllModals = () => {
        document.querySelectorAll('.modal').forEach(m => m.classList.add('hidden'));
        resetProfileModalToMyView();
    }
    window.onclick = (e) => {
        if (e.target.classList.contains('modal')) {
            e.target.classList.add('hidden');
            resetProfileModalToMyView();
        }
    };

    // --- 3. SUPABASE INIT ---
    const ADMIN_EMAIL = 'chdrey@gmail.com'; 
    let supabase = null;
    let currentUser = null;
    let currentProfile = null;
    let isAdmin = false;
    let activeStoryId = null;

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

    // --- 4. APP LOGIC ---
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
            
            if(!document.getElementById('profileModal').classList.contains('admin-view')) {
                const profileName = document.getElementById('profileNameDisplay');
                if(profileName) profileName.innerText = currentProfile.username;
                updateAvatars(currentProfile);
            }
        } else {
            loggedOut.classList.remove('hidden');
            loggedIn.classList.add('hidden');
            guestInput.classList.remove('hidden');
        }
    }

    function updateAvatars(profileData) {
        const avatars = [document.getElementById('navAvatar'), document.getElementById('profileAvatar')];
        const flairClass = profileData.flairs ? profileData.flairs.css_class : '';
        avatars.forEach(img => {
            if(img) {
                img.src = profileData.avatar_url || 'https://i.imgur.com/6UD0njE.png';
                if(img.id === 'navAvatar') {
                    img.className = 'avatar-small';
                    img.classList.remove('frame-wood', 'frame-stone', 'frame-iron', 'frame-gold', 'frame-diamond', 'frame-cosmic', 'frame-copper');
                    if(flairClass) img.classList.add(flairClass);
                } else if (!document.getElementById('profileModal').classList.contains('admin-view')) {
                    img.className = 'avatar-large profile-trigger-action';
                }
            }
        });
    }

    // --- AUTH ---
    let isSignUp = false;
    const authModal = document.getElementById('authModal');
    if(document.getElementById('navLoginBtn')) document.getElementById('navLoginBtn').onclick = () => document.getElementById('authModal').classList.remove('hidden');

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
                    closeModal('authModal');
                } else {
                    const { error } = await supabase.auth.signInWithPassword({ email, password });
                    if(error) throw error;
                    closeModal('authModal');
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
            document.querySelectorAll('.tab-btn')[0].classList.add('active');
        } else {
            document.getElementById('adminTabContest').classList.remove('hidden');
            document.querySelectorAll('.tab-btn')[1].classList.add('active');
        }
    };

    async function loadAllUsers() {
        const list = document.getElementById('adminUserList');
        list.innerHTML = '<div style="text-align:center; color:#888;">Loading users...</div>';
        
        const term = document.getElementById('adminUserSearch').value.toLowerCase();
        let query = supabase.from('profiles').select('*, user_flairs(flair_id)');
        if(term) query = query.ilike('username', `%${term}%`);
        
        const { data: users, error } = await query.order('username').limit(50);
        
        if(error) { list.innerHTML = "Error loading users."; return; }
        list.innerHTML = '';
        if(users.length === 0) list.innerHTML = '<div style="text-align:center;">No users found.</div>';

        users.forEach(u => {
            const card = document.createElement('div');
            card.className = 'admin-user-card';
            
            const earned = u.user_flairs.map(f => f.flair_id);
            let badgeHtml = '';
            
            const badges = [
                {id: 1, cls: 'frame-wood', name: 'The Bard'}, 
                {id: 2, cls: 'frame-copper', name: 'Talk of the Nook'},
                {id: 3, cls: 'frame-stone', name: 'The Ink Scribble'}, 
                {id: 4, cls: 'frame-iron', name: 'The Cliffhanger'},
                {id: 5, cls: 'frame-gold', name: 'The Golden Quill'}, 
                {id: 6, cls: 'frame-diamond', name: 'Trilogy Master'}
            ];

            badges.forEach(b => {
                const has = earned.includes(b.id);
                badgeHtml += `<div class="admin-badge-btn ${has ? 'owned' : ''} ${b.cls}" 
                              title="Toggle: ${b.name}"
                              onclick="toggleUserBadge('${u.id}', ${b.id}, ${has}, this); event.stopPropagation();"></div>`;
            });

            card.innerHTML = `
                <div class="admin-user-header" onclick="viewUserProfile('${u.id}')">
                    <strong>@${u.username}</strong>
                    <button class="btn-delete" onclick="adminBanUser('${u.id}'); event.stopPropagation();" style="font-size:0.7rem;">BAN</button>
                </div>
                <div class="admin-badge-controls">${badgeHtml}</div>
            `;
            list.appendChild(card);
        });
    }

    const adminSearch = document.getElementById('adminUserSearch');
    if(adminSearch) adminSearch.addEventListener('keyup', loadAllUsers);

    window.viewUserProfile = async (userId) => {
        const { data: targetUser } = await supabase.from('profiles').select('*').eq('id', userId).single();
        if(!targetUser) return alert("User data missing.");

        const modal = document.getElementById('profileModal');
        modal.classList.add('admin-view'); 
        
        document.getElementById('settingsSection').classList.add('hidden');
        document.getElementById('deleteSection').classList.add('hidden');
        document.getElementById('adminDashboardBtn').classList.add('hidden');

        document.getElementById('profileNameDisplay').innerText = targetUser.username;
        const bigAvatar = document.getElementById('profileAvatar');
        bigAvatar.src = targetUser.avatar_url || 'https://i.imgur.com/6UD0njE.png';
        bigAvatar.classList.remove('profile-trigger-action'); 

        loadPassportForUser(userId); 
        loadStoriesForUser(userId);  

        modal.classList.remove('hidden');
    };

    function resetProfileModalToMyView() {
        const modal = document.getElementById('profileModal');
        modal.classList.remove('admin-view');
        
        document.getElementById('settingsSection').classList.remove('hidden');
        document.getElementById('deleteSection').classList.remove('hidden');
        if(isAdmin) document.getElementById('adminDashboardBtn').classList.remove('hidden');
        
        if(currentProfile) {
            document.getElementById('profileNameDisplay').innerText = currentProfile.username;
            const bigAvatar = document.getElementById('profileAvatar');
            bigAvatar.src = currentProfile.avatar_url || 'https://i.imgur.com/6UD0njE.png';
            bigAvatar.classList.add('profile-trigger-action');
            loadPassportForUser(currentUser.id);
            loadStoriesForUser(currentUser.id);
        }
    }

    window.toggleUserBadge = async (userId, badgeId, hasBadge, btn) => {
        if(!confirm(hasBadge ? "Remove badge?" : "Award badge?")) return;
        if(hasBadge) {
            await supabase.from('user_flairs').delete().eq('user_id', userId).eq('flair_id', badgeId);
            btn.classList.remove('owned');
            btn.onclick = () => toggleUserBadge(userId, badgeId, false, btn);
        } else {
            await supabase.from('user_flairs').insert({ user_id: userId, flair_id: badgeId });
            btn.classList.add('owned');
            btn.onclick = () => toggleUserBadge(userId, badgeId, true, btn);
        }
    };

    window.adminBanUser = async (userId) => {
        if(confirm("Ban this user? They will be signed out and deleted.")) {
            await supabase.from('profiles').delete().eq('id', userId);
            alert("User data removed.");
            loadAllUsers();
        }
    };

    window.adminAwardWinner = async (place) => {
        const inputId = `winner${place}Input`;
        const username = document.getElementById(inputId).value;
        if(!username) return alert("Enter username");
        const { data: user } = await supabase.from('profiles').select('id').eq('username', username).single();
        if(!user) return alert("User not found");
        let badgeId = (place === 1) ? 5 : (place === 2) ? 4 : 3;
        await supabase.from('user_flairs').insert({ user_id: user.id, flair_id: badgeId });
        alert(`Awarded Badge #${badgeId} to ${username}!`);
        document.getElementById(inputId).value = '';
    };

    // --- REFACTORED PASSPORT LOADING ---
    async function loadPassportForUser(targetId) {
        const grid = document.getElementById('flairGrid');
        grid.innerHTML = 'Loading...';
        
        const { data: userFlairs } = await supabase.from('user_flairs').select('flair_id').eq('user_id', targetId);
        const counts = {};
        if (userFlairs) userFlairs.forEach(uf => counts[uf.flair_id] = (counts[uf.flair_id] || 0) + 1);
        const earnedIds = userFlairs.map(uf => uf.flair_id);
        
        const { data: targetProfile } = await supabase.from('profiles').select('selected_flair_id').eq('id', targetId).single();
        const selectedId = targetProfile ? targetProfile.selected_flair_id : null;

        const badgeDefinitions = [
            { id: 1, name: "The Bard", css: "frame-wood" },
            { id: 2, name: "Talk of the Nook", css: "frame-copper" },
            { id: 3, name: "The Ink Scribble", css: "frame-stone" },
            { id: 4, name: "The Cliffhanger", css: "frame-iron" },
            { id: 5, name: "The Golden Quill", css: "frame-gold" },
            { id: 6, name: "The Trilogy Master", css: "frame-diamond" }
        ];

        grid.innerHTML = '';

        badgeDefinitions.forEach(def => {
            const isUnlocked = earnedIds.includes(def.id);
            const isSelected = selectedId === def.id;
            
            const div = document.createElement('div');
            // If unlocked, add class 'unlocked', otherwise 'locked'
            div.className = `flair-item ${isUnlocked ? 'unlocked' : 'locked'} ${isSelected ? 'selected' : ''}`;
            
            if(isUnlocked && targetId === currentUser.id) {
                div.onclick = () => equipFlair(def.id);
            }
            
            // KEY FIX: If not unlocked, use 'frame-locked' style instead of material style
            const visualClass = isUnlocked ? def.css : 'frame-locked';

            div.innerHTML = `
                <div class="flair-preview ${visualClass}"></div>
                <span>${def.name}</span>
                <div class="my-badge-tooltip">Times earned: ${counts[def.id] || 0}</div>
            `;
            grid.appendChild(div);
        });
    }

    async function loadStoriesForUser(targetId) {
        const { data: myStories } = await supabase.from('stories').select('*').eq('user_id', targetId).order('created_at', { ascending: false });
        const list = document.getElementById('myStoriesList');
        list.innerHTML = '';
        if(myStories.length === 0) { list.innerHTML = '<p class="subtext">No stories yet.</p>'; return; }
        myStories.forEach(s => {
            const details = document.createElement('details');
            details.style.borderBottom = "1px solid #ccc"; details.style.padding = "10px 0";
            const summary = document.createElement('summary');
            summary.style.cssText = "display:flex; justify-content:space-between; cursor:pointer; font-weight:bold;";
            summary.innerHTML = `<span>${s.content.substring(0,30)}...</span>`;
            
            if(targetId === currentUser.id || isAdmin) {
                const del = document.createElement('button');
                del.innerText = 'X'; del.className = 'btn-delete';
                del.onclick = async (e) => {
                    e.stopPropagation();
                    if(confirm("Delete?")) { await supabase.from('stories').delete().eq('id', s.id); loadStoriesForUser(targetId); fetchStories(); }
                };
                summary.appendChild(del);
            }
            details.appendChild(summary);
            details.appendChild(Object.assign(document.createElement('div'), {innerText: s.content, style:"padding:10px; font-style:italic;"}));
            list.appendChild(details);
        });
    }

    async function equipFlair(id) {
        await supabase.from('profiles').update({ selected_flair_id: id }).eq('id', currentUser.id);
        await fetchUserProfile();
        updateUI();
        loadPassportForUser(currentUser.id);
    }

    // Default Loaders
    async function loadPassport() { loadPassportForUser(currentUser.id); }
    async function loadMyStories() { loadStoriesForUser(currentUser.id); }

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
        if(!val) return;
        const payload = { content: val, story_id: activeStoryId };
        if(currentUser) payload.user_id = currentUser.id; else { if(!pen) return alert("Name needed"); payload.guest_name = pen; }
        await supabase.from('comments').insert(payload);
        document.getElementById('newCommentInput').value = '';
        fetchComments(activeStoryId);
    };
});
