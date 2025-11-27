document.addEventListener('DOMContentLoaded', () => {
    console.log("Website Loaded v27.0 - Horizontal Actions & Clean Feed");

    // ==========================================
    // 1. SUPABASE CONFIGURATION
    // ==========================================
    const ADMIN_EMAIL = 'chdrey@gmail.com'; 
    const SUPABASE_URL = 'https://lypndarukqjtkyhxygwe.supabase.co';
    const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx5cG5kYXJ1a3FqdGt5aHh5Z3dlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM3Nzc2NzAsImV4cCI6MjA3OTM1MzY3MH0.NE5Q1BFVsBDyKSUxHO--aR-jbSHSLW8klha7C7_VbUA';
    
    let supabase = null;
    let currentUser = null;
    let currentProfile = null;
    let isAdmin = false;
    let activeStoryId = null;

    try {
        if (window.supabase) {
            supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
            initApp(); 
        } else {
            console.error("Supabase script not loaded in HTML.");
        }
    } catch (err) { console.error("Supabase Init Error:", err); }

    // ==========================================
    // 2. INITIALIZATION & AUTH
    // ==========================================
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
            await fetchUserProfile();
            checkAdminStatus(); 
        } else {
            currentUser = null;
            currentProfile = null;
            isAdmin = false;
            const adminBtn = document.getElementById('adminDashboardBtn');
            if(adminBtn) adminBtn.classList.add('hidden');
        }
        updateUI();
        fetchStories(); 
    }

    async function fetchUserProfile() {
        if(!currentUser) return;
        const { data } = await supabase
            .from('profiles')
            .select('*, flairs(css_class)')
            .eq('id', currentUser.id)
            .single();
        currentProfile = data;
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

    // ==========================================
    // 3. UI UPDATES & EVENT LISTENERS
    // ==========================================
    const nav = document.getElementById('mainNav');
    window.addEventListener('scroll', () => {
        if (window.scrollY > 50) nav.classList.add('scrolled');
        else nav.classList.remove('scrolled');
    });

    window.scrollToTop = () => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    function updateUI() {
        const loggedOut = document.getElementById('loggedOutNav');
        const loggedIn = document.getElementById('loggedInNav');
        const guestInput = document.getElementById('guestPenName');
        const commentGuestInput = document.getElementById('commentGuestName');
        
        if (currentUser && currentProfile) {
            loggedOut.classList.add('hidden');
            loggedIn.classList.remove('hidden');
            guestInput.classList.add('hidden');
            if(commentGuestInput) commentGuestInput.classList.add('hidden');
            
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
            if(commentGuestInput) commentGuestInput.classList.remove('hidden');
        }
    }

    function updateAvatars(profileData) {
        const avatars = [document.getElementById('navAvatar'), document.getElementById('profileAvatar')];
        const flairClass = profileData.flairs ? profileData.flairs.css_class : '';
        
        avatars.forEach(img => {
            if(img) {
                const url = profileData.avatar_url || 'https://i.imgur.com/6UD0njE.png';
                img.src = url;
                if(img.id === 'navAvatar') {
                    img.className = 'avatar-small';
                    img.classList.remove('frame-wood', 'frame-stone', 'frame-iron', 'frame-gold', 'frame-diamond', 'frame-copper');
                    if(flairClass) img.classList.add(flairClass);
                } else if (!document.getElementById('profileModal').classList.contains('admin-view')) {
                    img.className = 'avatar-large profile-trigger-action';
                }
            }
        });
    }

    // Modal Opening
    const infoBtn = document.getElementById('infoBtn');
    if (infoBtn) infoBtn.onclick = () => document.getElementById('aboutModal').classList.remove('hidden');

    const passportInfoBtn = document.getElementById('passportInfoBtn');
    if (passportInfoBtn) passportInfoBtn.onclick = () => document.getElementById('passportInfoModal').classList.remove('hidden');

    const navProfileBtn = document.getElementById('navProfileBtn');
    if (navProfileBtn) {
        navProfileBtn.onclick = (e) => {
            e.stopPropagation(); 
            document.getElementById('profileModal').classList.remove('hidden');
            window.resetProfileModalToMyView();
        };
    }

    // LOG IN BUTTON LOGIC
    const navLoginBtn = document.getElementById('navLoginBtn');
    if(navLoginBtn) {
        navLoginBtn.onclick = (e) => {
            e.stopPropagation();
            document.getElementById('authModal').classList.remove('hidden');
        };
    }

    const adminBtn = document.getElementById('adminDashboardBtn');
    if(adminBtn) {
        adminBtn.onclick = () => {
            document.getElementById('adminModal').classList.remove('hidden');
            loadAllUsers();
        };
    }

    // Feedback Modal logic
    window.openFeedback = () => {
        document.getElementById('feedbackModal').classList.remove('hidden');
        if(currentUser) {
            document.getElementById('feedbackEmail').classList.add('hidden');
        } else {
            document.getElementById('feedbackEmail').classList.remove('hidden');
        }
    };

    const submitFeedbackBtn = document.getElementById('submitFeedbackBtn');
    if(submitFeedbackBtn) {
        submitFeedbackBtn.onclick = () => {
            const txt = document.getElementById('feedbackText').value;
            if(!txt) return alert("Please write something!");
            alert("🦉 An owl has been dispatched to The High Council! (Simulated)");
            document.getElementById('feedbackText').value = '';
            closeModal('feedbackModal');
        };
    }

    // Modal Closing
    window.closeModal = (id) => {
        const modal = document.getElementById(id);
        if (modal) {
            modal.classList.add('hidden');
            if(id === 'profileModal') setTimeout(() => resetProfileModalToMyView(), 300);
        }
    }
    
    window.onclick = (e) => {
        if (e.target.classList.contains('modal')) {
            e.target.classList.add('hidden');
            if(e.target.id === 'profileModal') setTimeout(() => resetProfileModalToMyView(), 300);
        }
    };

    function escapeHtml(text) {
        return text ? text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;") : "";
    }

    // ==========================================
    // 4. AVATAR UPLOAD LOGIC
    // ==========================================
    const profileAvatar = document.getElementById('profileAvatar');
    const avatarInput = document.getElementById('avatarUploadInput');

    if(profileAvatar && avatarInput) {
        profileAvatar.onclick = () => {
            if(!document.getElementById('profileModal').classList.contains('admin-view')) {
                avatarInput.click();
            }
        };

        avatarInput.onchange = async (e) => {
            const file = e.target.files[0];
            if (!file) return;
            if (file.size > 2000000) return alert("File is too big! Max 2MB.");

            const overlay = document.getElementById('avatarEditOverlay');
            if(overlay) overlay.innerText = "⏳";

            try {
                const fileName = `${currentUser.id}/${Date.now()}.png`; 
                const { error: uploadError } = await supabase.storage.from('avatars').upload(fileName, file, {
                    cacheControl: '3600',
                    upsert: false
                });
                if (uploadError) throw uploadError;

                const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(fileName);

                const { error: dbError } = await supabase
                    .from('profiles')
                    .update({ avatar_url: publicUrl })
                    .eq('id', currentUser.id);
                if (dbError) throw dbError;

                await fetchUserProfile();
                updateUI();
                if(overlay) overlay.innerText = "📷";

            } catch (error) {
                console.error("Upload failed:", error);
                alert("Upload failed. Make sure 'avatars' bucket exists in Supabase Storage!");
                if(overlay) overlay.innerText = "❌";
            }
        };
    }

    // ==========================================
    // 5. STORY LOGIC
    // ==========================================

    function createStoryCardHTML(story, isTopSection = false) {
        const authorName = story.guest_name || (story.profiles ? story.profiles.username : 'Anonymous');
        const hasAvatar = story.profiles && story.profiles.avatar_url;
        let avatarHTML = '';
        if (hasAvatar) {
            avatarHTML = `<img src="${story.profiles.avatar_url}" class="feed-avatar-img" alt="Avatar">`;
        } else {
            const initial = authorName.charAt(0).toUpperCase();
            avatarHTML = `<div class="feed-avatar-placeholder">${initial}</div>`;
        }

        const commentCount = (story.comments && story.comments[0]) ? story.comments[0].count : 0;
        const isOwner = isAdmin || (currentUser && story.user_id === currentUser.id);
        
        let menuItems = `<button onclick="event.stopPropagation(); reportContent('story', ${story.id})">⚠️ Report</button>`;
        if (isOwner) {
            menuItems += `<button onclick="event.stopPropagation(); deleteStory(${story.id})" class="text-red">🗑️ Delete</button>`;
        }

        // Logic split: Top Section gets NO buttons. Feed gets the Horizontal Action Bar.
        let footerHTML = '';

        if (!isTopSection) {
            footerHTML = `
                <div class="story-actions-row">
                    <div class="actions-left">
                        <button class="btn-action-icon" onclick="event.stopPropagation(); voteStory('${story.id}', ${story.votes})">
                            ❤️ Like (${story.votes || 0})
                        </button>
                        <button class="btn-action-icon" onclick="openReadModal(${story.id})">
                            💬 Comment (${commentCount})
                        </button>
                    </div>
                    
                    <div class="action-column">
                        <button class="menu-trigger" onclick="event.stopPropagation(); toggleMenu('story-menu-${story.id}')">⋮</button>
                        <div id="story-menu-${story.id}" class="menu-dropdown">
                            ${menuItems}
                        </div>
                    </div>
                </div>
            `;
        }

        return `
            <div class="story-card" onclick="openReadModal(${story.id})">
                <div class="story-header-row">
                    ${avatarHTML}
                    <span class="story-author">${escapeHtml(authorName)}</span>
                </div>
                <p style="font-size: 1.1rem; margin-bottom: 10px;">"${escapeHtml(story.content.substring(0, 200))}${story.content.length > 200 ? '...' : ''}"</p>
                ${footerHTML}
            </div>
        `;
    }

    async function fetchStories() {
        const feed = document.getElementById('storyFeed');
        const top = document.getElementById('topStories');
        
        // --- 1. FETCH TOP 3 STORIES ---
        if(top) {
            const { data: topStories } = await supabase
                .from('stories')
                .select('*, profiles(username, avatar_url, selected_flair_id), comments(count)')
                .is('deleted_at', null)
                .gt('votes', 0) 
                .order('votes', { ascending: false })
                .limit(3);

            top.innerHTML = '';
            if(topStories && topStories.length > 0) {
                topStories.forEach(story => {
                    top.insertAdjacentHTML('beforeend', createStoryCardHTML(story, true));
                });
            } else {
                top.innerHTML = '<p style="text-align:center; color:#777; font-style:italic;">No top stories yet. Vote for one!</p>';
            }
        }

        // --- 2. FETCH FEED ---
        const { data: feedStories, error } = await supabase
            .from('stories')
            .select('*, profiles(username, avatar_url, selected_flair_id), comments(count)')
            .is('deleted_at', null)
            .order('created_at', { ascending: false })
            .limit(30);

        if (error) {
            console.error("Error loading stories:", error);
            if(feed) feed.innerHTML = '<p style="text-align:center">The ink has dried up (Error loading).</p>';
            return;
        }

        if(feed) {
            feed.innerHTML = '';
            if (feedStories.length === 0) {
                feed.innerHTML = '<p style="text-align:center">No stories yet. Be the first!</p>';
                return;
            }
            feedStories.forEach(story => {
                feed.insertAdjacentHTML('beforeend', createStoryCardHTML(story, false));
            });
        }
    }

    const publishBtn = document.getElementById('publishBtn');
    if(publishBtn) publishBtn.onclick = async () => {
        const txt = document.getElementById('mainStoryInput').value;
        const pen = document.getElementById('guestPenName').value;
        if(!txt) return alert("Write a story first!");
        
        const payload = { content: txt, votes: 0 };
        if(currentUser) {
            payload.user_id = currentUser.id; 
        } else { 
            if(!pen) return alert("Pen Name needed (or Log In)"); 
            payload.guest_name = pen; 
        }
        
        const { error } = await supabase.from('stories').insert(payload);
        if(error) {
            alert("Error publishing: " + error.message);
        } else {
            document.getElementById('mainStoryInput').value = ''; 
            fetchStories();
        }
    };

    window.voteStory = async (storyId, currentVotes) => {
        if (!currentUser) {
            alert("Please log in to vote!");
            document.getElementById('authModal').classList.remove('hidden');
            return;
        }
        const newVotes = (currentVotes || 0) + 1;
        await supabase.from('stories').update({ votes: newVotes }).eq('id', storyId);
        fetchStories();
    };

    window.deleteStory = async (id) => { 
        if(!confirm("Are you sure you want to delete this story?")) return;
        document.querySelectorAll('.menu-dropdown').forEach(el => el.classList.remove('show'));
        await supabase.from('stories').update({ deleted_at: new Date().toISOString() }).eq('id', id);
        fetchStories(); 
    };

    // ==========================================
    // 6. COMMENTS & READING
    // ==========================================
    window.openReadModal = async (story) => {
        if(typeof story === 'number') { 
            const {data} = await supabase.from('stories').select('*, profiles(username, avatar_url)').eq('id', story).single(); 
            story = data; 
        }
        
        activeStoryId = story.id;
        const authorDisplay = story.guest_name || (story.profiles ? story.profiles.username : "Guest");
        
        document.getElementById('readModalAuthor').innerText = "By @" + authorDisplay;
        document.getElementById('readModalText').innerText = story.content;
        document.getElementById('readModal').classList.remove('hidden');
        
        fetchComments(story.id);
    }

    async function fetchComments(storyId) {
        const list = document.getElementById('modalCommentsList');
        list.innerHTML = 'Loading...';
        
        const { data: comments } = await supabase
            .from('comments')
            .select('*, profiles(username, avatar_url)')
            .eq('story_id', storyId)
            .is('deleted_at', null) 
            .order('created_at', {ascending: true});
            
        list.innerHTML = '';
        if(!comments || comments.length === 0) {
            list.innerHTML = '<div style="color:#777; font-style:italic;">No comments yet.</div>';
            return;
        }

        comments.forEach(c => {
            const u = c.profiles ? c.profiles.username : c.guest_name;
            const uAvatar = (c.profiles && c.profiles.avatar_url) ? c.profiles.avatar_url : 'https://i.imgur.com/6UD0njE.png';
            const isOwner = isAdmin || (currentUser && c.user_id === currentUser.id);
            
            let menuItems = `<button onclick="event.stopPropagation(); reportContent('comment', ${c.id})">⚠️ Report</button>`;
            if (isOwner) {
                menuItems += `<button onclick="event.stopPropagation(); deleteComment(${c.id})" class="text-red">🗑️ Delete</button>`;
            }

            const menuHTML = `
                <div class="action-column" style="align-items:flex-end;">
                    <button class="menu-trigger" onclick="event.stopPropagation(); toggleMenu('comment-menu-${c.id}')">⋮</button>
                    <div id="comment-menu-${c.id}" class="menu-dropdown" style="width:100px;">
                        ${menuItems}
                    </div>
                </div>
            `;
            
            list.innerHTML += `
                <div class="comment-item">
                    <div style="display:flex; gap:10px; align-items:flex-start;">
                        <img src="${uAvatar}" class="feed-avatar-img" style="width:30px; height:30px;">
                        <div>
                            <strong>@${u}</strong><br>
                            ${escapeHtml(c.content)}
                        </div>
                    </div>
                    ${menuHTML}
                </div>`;
        });
    }

    const postCommentBtn = document.getElementById('postCommentBtn');
    if(postCommentBtn) postCommentBtn.onclick = async () => {
        const val = document.getElementById('newCommentInput').value;
        const guestNameInput = document.getElementById('commentGuestName');
        if(!val) return;
        
        const payload = { content: val, story_id: activeStoryId };
        if(currentUser) {
            payload.user_id = currentUser.id; 
        } else { 
            const guestName = guestNameInput.value;
            if(!guestName) return alert("Name needed"); 
            payload.guest_name = guestName; 
        }
        
        await supabase.from('comments').insert(payload);
        document.getElementById('newCommentInput').value = '';
        fetchComments(activeStoryId);
    };

    window.deleteComment = async (id) => { 
        if(!confirm("Are you sure you want to delete this comment?")) return;
        document.querySelectorAll('.menu-dropdown').forEach(el => el.classList.remove('show'));
        await supabase.from('comments').update({ deleted_at: new Date().toISOString() }).eq('id', id);
        fetchComments(activeStoryId); 
    };

    // ==========================================
    // 7. AUTH MODAL LOGIC
    // ==========================================
    let isSignUp = false;
    const authActionBtn = document.getElementById('authActionBtn');

    if(document.getElementById('authSwitchBtn')) {
        document.getElementById('authSwitchBtn').onclick = function() {
            isSignUp = !isSignUp;
            document.getElementById('authTitle').innerText = isSignUp ? "Sign Up" : "Log In";
            document.getElementById('authActionBtn').innerText = isSignUp ? "Create Account" : "Log In";
            this.innerText = isSignUp ? "Log In" : "Sign Up";
            document.getElementById('usernameInput').classList.toggle('hidden', !isSignUp);
        };
    }

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

    const logoutBtn = document.getElementById('logoutBtn');
    if(logoutBtn) logoutBtn.onclick = async () => {
        await supabase.auth.signOut();
        closeModal('profileModal');
    };

    // ==========================================
    // 8. ADMIN DASHBOARD & PROFILE LOGIC
    // ==========================================
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

    window.loadAllUsers = async () => {
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
    if(adminSearch) adminSearch.addEventListener('keyup', () => window.loadAllUsers());

    window.viewUserProfile = async (userId) => {
        const modal = document.getElementById('profileModal');
        const grid = document.getElementById('flairGrid');
        
        modal.classList.remove('hidden'); 
        modal.classList.add('admin-view'); 
        document.querySelector('.avatar-wrapper').classList.add('no-click');

        document.getElementById('settingsSection').classList.add('hidden');
        document.getElementById('deleteSection').classList.add('hidden');
        document.getElementById('adminDashboardBtn').classList.add('hidden');

        document.getElementById('profileNameDisplay').innerText = "Loading...";
        document.getElementById('profileAvatar').src = 'https://i.imgur.com/6UD0njE.png'; 
        if(grid) grid.innerHTML = '<p style="text-align:center; padding:20px;">Loading Badges...</p>';

        const { data: targetUser } = await supabase.from('profiles').select('*').eq('id', userId).single();
        if(!targetUser) { alert("User data missing."); modal.classList.add('hidden'); return; }

        document.getElementById('profileNameDisplay').innerText = targetUser.username;
        const bigAvatar = document.getElementById('profileAvatar');
        bigAvatar.src = targetUser.avatar_url || 'https://i.imgur.com/6UD0njE.png';
        bigAvatar.classList.remove('profile-trigger-action'); 

        setTimeout(() => {
            loadPassportForUser(userId); 
            loadStoriesForUser(userId);  
        }, 50);
    };

    window.resetProfileModalToMyView = () => {
        const modal = document.getElementById('profileModal');
        const grid = document.getElementById('flairGrid');
        
        modal.classList.remove('admin-view');
        document.querySelector('.avatar-wrapper').classList.remove('no-click');

        document.getElementById('settingsSection').classList.remove('hidden');
        document.getElementById('deleteSection').classList.remove('hidden');
        if(isAdmin) document.getElementById('adminDashboardBtn').classList.remove('hidden');
        
        if(currentProfile) {
            document.getElementById('profileNameDisplay').innerText = currentProfile.username;
            const bigAvatar = document.getElementById('profileAvatar');
            bigAvatar.src = currentProfile.avatar_url || 'https://i.imgur.com/6UD0njE.png';
            bigAvatar.classList.add('profile-trigger-action');
            if(grid) grid.innerHTML = 'Loading...';
            
            setTimeout(() => {
                loadPassportForUser(currentUser.id);
                loadStoriesForUser(currentUser.id);
            }, 50);
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

    window.adminAwardBadge = async (badgeId) => {
        const inputId = `badgeInput_${badgeId}`;
        const username = document.getElementById(inputId).value;
        if(!username) return alert("Enter username");
        const { data: user } = await supabase.from('profiles').select('id').eq('username', username).single();
        if(!user) return alert("User not found");
        
        const { error } = await supabase.from('user_flairs').insert({ user_id: user.id, flair_id: badgeId });
        if(error) { console.error(error); alert("Error awarding badge."); }
        else { 
            alert(`Badge #${badgeId} awarded to ${username}!`); 
            document.getElementById(inputId).value = ''; 
            if(user.id === currentUser.id) loadPassportForUser(currentUser.id);
        }
    };

    window.adminRevokeBadge = async (badgeId) => {
        const inputId = `badgeInput_${badgeId}`;
        const username = document.getElementById(inputId).value;
        if(!username) return alert("Enter username");
        const { data: user } = await supabase.from('profiles').select('id').eq('username', username).single();
        if(!user) return alert("User not found");
        
        const { error } = await supabase.from('user_flairs').delete().eq('user_id', user.id).eq('flair_id', badgeId);
        if(error) { console.error(error); alert("Error removing badge."); }
        else { 
            alert(`Badge #${badgeId} revoked from ${username}.`); 
            document.getElementById(inputId).value = ''; 
            if(user.id === currentUser.id) loadPassportForUser(currentUser.id);
        }
    };

    // ==========================================
    // 9. PASSPORT & PROFILE (UNIFIED LOGIC)
    // ==========================================
    async function loadPassportForUser(targetId) {
        const grid = document.getElementById('flairGrid');
        if(!grid) return;
        grid.innerHTML = ''; // Clear loading
        
        const { data: userFlairs, error } = await supabase.from('user_flairs').select('flair_id').eq('user_id', targetId);
        if(error) { console.error("Passport Error:", error); grid.innerHTML = "Error loading badges."; return; }

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

        badgeDefinitions.forEach(def => {
            const isUnlocked = earnedIds.includes(def.id);
            const isSelected = selectedId === def.id;
            const badgeCount = counts[def.id] || 0;
            
            const div = document.createElement('div');
            div.className = `flair-item ${isUnlocked ? 'unlocked' : 'locked'} ${isSelected ? 'selected' : ''}`;
            
            if(isUnlocked && targetId === currentUser.id) {
                div.onclick = () => equipFlair(def.id);
            }
            const visualClass = isUnlocked ? def.css : 'frame-locked';
            const showTooltip = isUnlocked || badgeCount > 0;

            div.innerHTML = `
                <div class="flair-preview ${visualClass}"></div>
                <span>${def.name}</span>
                ${showTooltip ? `<div class="my-badge-tooltip">Times earned: ${badgeCount}</div>` : ''}
            `;
            grid.appendChild(div);
        });
    }

    async function equipFlair(id) {
        await supabase.from('profiles').update({ selected_flair_id: id }).eq('id', currentUser.id);
        await fetchUserProfile();
        updateUI();
        loadPassportForUser(currentUser.id);
    }

    // === PROFILE STORY LOADER (SOFT DELETE & ACCORDION) ===
    async function loadStoriesForUser(targetId) {
        const list = document.getElementById('myStoriesList');
        if(!list) return;
        list.innerHTML = '<div style="text-align:center; color:#888;">Loading...</div>';
        
        const { data: myStories } = await supabase
            .from('stories')
            .select('*')
            .eq('user_id', targetId)
            .is('deleted_at', null) 
            .order('created_at', { ascending: false });
        
        list.innerHTML = '';
        if(!myStories || myStories.length === 0) { list.innerHTML = '<p class="subtext" style="text-align:center;">No stories yet.</p>'; return; }
        
        myStories.forEach(s => {
            const details = document.createElement('details');
            details.className = 'story-accordion';
            const summary = document.createElement('summary');
            summary.className = 'story-summary';
            
            const textSpan = document.createElement('span');
            textSpan.innerText = s.content.substring(0, 40) + (s.content.length > 40 ? "..." : "");
            summary.appendChild(textSpan);
            
            if(targetId === currentUser.id || isAdmin) {
                const del = document.createElement('button');
                del.innerText = '✕'; 
                del.className = 'btn-delete-small';
                del.title = "Delete Story";
                del.onclick = async (e) => {
                    e.stopPropagation(); 
                    e.preventDefault();
                    if(confirm("Are you sure you want to delete this story?")) {
                        await supabase.from('stories').update({ deleted_at: new Date().toISOString() }).eq('id', s.id);
                        loadStoriesForUser(targetId); 
                        fetchStories(); 
                    }
                };
                summary.appendChild(del);
            }
            
            const contentDiv = document.createElement('div');
            contentDiv.className = 'story-content-preview';
            contentDiv.innerText = s.content;
            
            details.appendChild(summary);
            details.appendChild(contentDiv);
            list.appendChild(details);
        });
    }

    window.enterNook = () => {
        const overlay = document.getElementById('welcomeOverlay');
        if (overlay) { overlay.style.opacity = '0'; setTimeout(() => overlay.classList.add('hidden'), 800); }
        const bgVideo = document.getElementById('bgVideo');
        if (bgVideo) { bgVideo.muted = false; bgVideo.play().catch(e => console.log("Video autoplay blocked")); }
        const ytPlayer = document.getElementById('youtubePlayer');
        if (ytPlayer) ytPlayer.src = "https://www.youtube.com/embed/hVFaaUEIpzE?start=103&autoplay=1&mute=0";
    }

    // ==========================================
    // 10. MENU & REPORT LOGIC
    // ==========================================
    window.toggleMenu = (elementId) => {
        document.querySelectorAll('.menu-dropdown').forEach(el => {
            if(el.id !== elementId) el.classList.remove('show');
        });
        const menu = document.getElementById(elementId);
        if(menu) menu.classList.toggle('show');
    };

    window.addEventListener('click', () => {
        document.querySelectorAll('.menu-dropdown').forEach(el => el.classList.remove('show'));
    });

    window.reportContent = (type, id) => {
        alert(`Thanks for reporting this ${type}. The admins have been notified.`);
        document.querySelectorAll('.menu-dropdown').forEach(el => el.classList.remove('show'));
    };
});
