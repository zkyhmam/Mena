document.addEventListener('DOMContentLoaded', () => {
    const navLinks = document.querySelectorAll('#navLinks li a.nav-link[data-section], .logo[data-section]');
    const contentSections = document.querySelectorAll('.content-section');
    const menuToggle = document.getElementById('menuToggle');
    const navUl = document.getElementById('navLinks');
    const themeToggleBtn = document.getElementById('themeToggleBtn');
    const body = document.body;
    const currentYearSpan = document.getElementById('currentYear');
    const languageSelect = document.getElementById('languageSelect');
    const saveAppearanceSettingsBtn = document.getElementById('saveAppearanceSettingsBtn');

    const navLoginLinkContainer = document.getElementById('navLoginLinkContainer');
    const navAccountDropdownContainer = document.getElementById('navAccountDropdownContainer');
    const accountDropdownBtn = document.getElementById('accountDropdownBtn');
    const accountDropdownContent = document.getElementById('accountDropdownContent');
    const loggedInUsernameDropdownSpan = document.getElementById('loggedInUsernameDropdown');
    const userCurrentPlanSpan = document.getElementById('userCurrentPlan');
    const manageAccountLink = document.getElementById('manageAccountLink');
    const logoutButtonFromDropdown = document.getElementById('logoutButtonFromDropdown');
    const deleteAccountBtn = document.getElementById('deleteAccountBtn');
    
    const globalMessageDiv = document.getElementById('globalMessage');
    const authMessageDiv = document.getElementById('authMessage');
    const manageAccountMessageDiv = document.getElementById('manageAccountMessage');

    const currentUsernameDisplay = document.getElementById('currentUsernameDisplay');
    const newUsernameInput = document.getElementById('newUsername');
    const updateUsernameBtn = document.getElementById('updateUsernameBtn');
    const currentPasswordInput = document.getElementById('currentPassword');
    const newPasswordInput = document.getElementById('newPassword');
    const confirmNewPasswordInput = document.getElementById('confirmNewPassword');
    const updatePasswordBtn = document.getElementById('updatePasswordBtn');

    const videoPlayerModal = document.getElementById('videoPlayerModal');
    const mainVideoPlayer = document.getElementById('mainVideoPlayer');
    const videoPlayerTitle = document.getElementById('videoPlayerTitle');
    const closeVideoPlayerModalBtn = document.getElementById('closeVideoPlayerModalBtn');

    const loginForm = document.getElementById('loginForm');
    const registerForm = document.getElementById('registerForm');
    const switchToRegisterLink = document.getElementById('switchToRegister');
    const switchToLoginLink = document.getElementById('switchToLogin');
    
    // تحديد عناصر العناوين داخل النماذج مباشرة
    const loginFormTitle = loginForm?.querySelector('.section-title[data-translate="login_title_section"]');
    const registerFormTitle = registerForm?.querySelector('.section-title[data-translate="create_account_title"]');


    let allVideosData = [];
    let currentUserData = null;

    const translations = {
        en: {
            site_title: "SofagHub - Your SikoSiko Hub", nav_home: "Home", nav_videos: "Videos", nav_subscriptions: "Subscriptions", nav_settings: "Settings", nav_login: "Login", search_placeholder: "Search videos...", search_button_text: "Search", welcome_title: "Welcome to SofagHub!", site_subtitle_text: "Your premium Arabic site for Siko Siko videos.", suggested_for_you: "Suggested for You", browse_videos_title: "Browse Videos", subscription_plans_title: "Subscription Plans", basic_plan_title: "Basic Plan", free_plan_price: "Free", basic_feature_1: "Limited video access", basic_feature_2: "Low quality (SD)", basic_feature_3: "Many annoying ads", basic_feature_4: "Forum support", start_free_btn: "Start Free", most_popular_badge: "Most Popular", premium_plan_title: "Premium Plan", monthly_text: "/month", premium_feature_1: "Access to all videos", premium_feature_2: "High quality (HD/1080p)", premium_feature_3: "Ad-free watching", premium_feature_4: "New exclusive content weekly", premium_feature_5: "Email support", subscribe_now_btn: "Subscribe Now", ultimate_plan_title: "Ultimate Plan", ultimate_feature_1: "All Premium features", ultimate_feature_2: "Ultra high quality (4K UHD)", ultimate_feature_3: "Download videos for offline viewing", ultimate_feature_4: "Early access to new content", ultimate_feature_5: "Dedicated & fast support", choose_ultimate_btn: "Choose Ultimate Plan", settings_title: "Appearance & Language Settings", theme_label: "Appearance:", language_label: "Interface Language:", save_settings_btn: "Save Settings", login_title_section: "Login", email_label: "Email", email_placeholder: "example@mail.com", password_label: "Password", password_placeholder: "********", login_btn: "Login", no_account_text: "Don't have an account?", create_account_link: "Create a new account", create_account_title: "Create New Account", username_label: "Username", username_placeholder: "Your unique name", password_placeholder_strong: "Strong password", confirm_password_label: "Confirm Password", confirm_password_placeholder: "Re-enter password", create_account_btn: "Create Account", already_have_account_text: "Already have an account?", login_link_from_register: "Login", footer_text: "Arabic Siko Siko, coming soon.", modal_title: "Exclusive Content for Subscribers!", modal_description: "This video requires a premium subscription. Get unlimited access to all exclusive videos in high quality, ad-free.", modal_feature_1: "New exclusive videos weekly", modal_feature_2: "Up to 4K quality", modal_feature_3: "No annoying ads", modal_feature_4: "Premium technical support", subscribe_now_btn_modal: "Subscribe Now", see_all_plans_link: "See All Plans", tag_free: "Free", tag_paid: "Paid", views_text: "views", watch_now_btn_text: "Watch Now", premium_access_btn_text: "Exclusive Access", error_generic_ar: "An error occurred. Please try again.", error_generic_en: "An error occurred. Please try again.", error_loading_videos_ar: "Error loading videos. Please try again later.", error_loading_videos_en: "Error loading videos. Please try again later.", no_videos_ar: "No videos to display at the moment.", no_videos_en: "No videos to display at the moment.", password_mismatch_ar: "Passwords do not match.", password_mismatch_en: "Passwords do not match.", password_short_ar: "Password must be at least 6 characters long.", password_short_en: "Password must be at least 6 characters long.", error_logout_ar: "Error during logout.", error_logout_en: "Error during logout.", search_no_results_ar: "No search results found for '${query}'.", search_no_results_en: "No search results found for '${query}'.", settings_saved_ar: "Settings saved successfully!", settings_saved_en: "Settings saved successfully!", theme_toggle_light: "Switch to Light Theme", theme_toggle_dark: "Switch to Dark Theme", video_token_error_ar: "Error getting video viewing permission. Please try again.", video_token_error_en: "Error getting video viewing permission. Please try again.",
            plan_label: "Plan:", manage_account_link: "Manage Account", nav_logout_dropdown: "Logout", delete_account_link: "Delete Account", manage_account_title: "Manage Account", current_username_label: "Current Username:", new_username_label: "New Username:", new_username_placeholder: "Leave blank to keep current", update_username_btn: "Update Username", change_password_title: "Change Password", current_password_label: "Current Password:", new_password_label: "New Password:", confirm_new_password_label: "Confirm New Password:", update_password_btn: "Update Password", logout_confirm_title: "Confirm Logout", logout_confirm_message: "Are you sure you want to log out?", delete_account_confirm_title: "Confirm Account Deletion", delete_account_warning: "Warning! This action is irreversible. All your data and subscription (if any) will be permanently deleted. You will not be able to recover your account.", delete_account_prompt_password: "To confirm deletion, please enter your current password:", delete_account_success: "Your account has been successfully deleted.", delete_account_failed: "Failed to delete account. Please check your password or try again later.", username_updated_success: "Username updated successfully.", password_updated_success: "Password updated successfully.", confirm_action: "Confirm", cancel_action: "Cancel", password_fields_required_ar: "Password fields required.", password_fields_required_en: "Password fields required.", password_required_for_delete_ar: "Password required for deletion.", password_required_for_delete_en: "Password required for deletion."
        },
        ar: {
            site_title: "SofagHub - سوفاج هاب", nav_home: "الرئيسية", nav_videos: "الفيديوهات", nav_subscriptions: "الاشتراكات", nav_settings: "الإعدادات", nav_login: "تسجيل الدخول", search_placeholder: "ابحث عن فيديوهات...", search_button_text: "بحث", welcome_title: "مرحباً بك في SofagHub!", site_subtitle_text: "موقع عربي مميز لمشاهدة السيكو سيكو العربي", suggested_for_you: "مقترحة لك", browse_videos_title: "تصفح الفيديوهات", subscription_plans_title: "خطط الاشتراك", basic_plan_title: "الخطة الأساسية", free_plan_price: "مجاني", basic_feature_1: "الوصول لفيديوهات محدودة", basic_feature_2: "جودة مشاهدة منخفضة (SD)", basic_feature_3: "إعلانات كثيرة ومزعجة", basic_feature_4: "دعم عبر المنتدى", start_free_btn: "ابدأ مجاناً", most_popular_badge: "الأكثر شيوعاً", premium_plan_title: "الخطة المميزة", monthly_text: "/شهرياً", premium_feature_1: "الوصول لجميع الفيديوهات", premium_feature_2: "جودة مشاهدة عالية (HD/1080p)", premium_feature_3: "مشاهدة بدون إعلانات", premium_feature_4: "محتوى حصري وجديد أسبوعياً", premium_feature_5: "دعم فني عبر البريد", subscribe_now_btn: "اشترك الآن", ultimate_plan_title: "الخطة الفائقة", ultimate_feature_1: "جميع مزايا الخطة المميزة", ultimate_feature_2: "جودة مشاهدة فائقة (4K UHD)", ultimate_feature_3: "تحميل الفيديوهات للمشاهدة لاحقًا", ultimate_feature_4: "وصول مبكر للمحتوى الجديد", ultimate_feature_5: "دعم فني مخصص وسريع", choose_ultimate_btn: "اختر الخطة الفائقة", settings_title: "إعدادات المظهر واللغة", theme_label: "المظهر:", language_label: "لغة الواجهة:", save_settings_btn: "حفظ الإعدادات", login_title_section: "تسجيل الدخول", email_label: "البريد الإلكتروني", email_placeholder: "example@mail.com", password_label: "كلمة المرور", password_placeholder: "********", login_btn: "تسجيل الدخول", no_account_text: "ليس لديك حساب؟", create_account_link: "أنشئ حساباً جديداً", create_account_title: "إنشاء حساب جديد", username_label: "اسم المستخدم", username_placeholder: "اسمك الفريد", password_placeholder_strong: "كلمة مرور قوية", confirm_password_label: "تأكيد كلمة المرور", confirm_password_placeholder: "أعد إدخال كلمة المرور", create_account_btn: "إنشاء حساب", already_have_account_text: "لديك حساب بالفعل؟", login_link_from_register: "سجل الدخول", footer_text: "سيكو سيكو عربي قريب.", modal_title: "محتوى حصري للمشتركين!", modal_description: "هذا الفيديو يتطلب اشتراكًا مميزًا للوصول إليه.", modal_feature_1: "فيديوهات حصرية جديدة أسبوعياً", modal_feature_2: "جودة تصل إلى 4K", modal_feature_3: "بدون إعلانات مزعجة", modal_feature_4: "دعم فني متميز", subscribe_now_btn_modal: "الاشتراك الآن", see_all_plans_link: "مشاهدة جميع الخطط", tag_free: "مجاني", tag_paid: "مدفوع", views_text: "مشاهدات", watch_now_btn_text: "شاهد الآن", premium_access_btn_text: "محتوى حصري", error_generic_ar: "حدث خطأ. حاول مرة أخرى.", error_generic_en: "An error occurred. Please try again.", error_loading_videos_ar: "حدث خطأ أثناء تحميل الفيديوهات. حاول لاحقاً.", error_loading_videos_en: "Error loading videos. Please try again later.", no_videos_ar: "لا توجد فيديوهات لعرضها حاليًا.", no_videos_en: "No videos to display at the moment.", password_mismatch_ar: "كلمتا المرور غير متطابقتين.", password_mismatch_en: "Passwords do not match.", password_short_ar: "يجب أن تتكون كلمة المرور من 6 أحرف على الأقل.", password_short_en: "Password must be at least 6 characters long.", error_logout_ar: "حدث خطأ أثناء تسجيل الخروج.", error_logout_en: "Error during logout.", search_no_results_ar: "لا توجد نتائج بحث تطابق '${query}'.", search_no_results_en: "No search results found for '${query}'.", settings_saved_ar: "تم حفظ الإعدادات بنجاح!", settings_saved_en: "Settings saved successfully!", theme_toggle_light: "التبديل إلى المظهر الفاتح", theme_toggle_dark: "التبديل إلى المظهر الداكن", video_token_error_ar: "خطأ في الحصول على إذن مشاهدة الفيديو. حاول مرة أخرى.", video_token_error_en: "Error getting video viewing permission. Please try again.",
            plan_label: "الخطة:", manage_account_link: "إدارة الحساب", nav_logout_dropdown: "تسجيل الخروج", delete_account_link: "حذف الحساب", manage_account_title: "إدارة الحساب", current_username_label: "اسم المستخدم الحالي:", new_username_label: "اسم المستخدم الجديد:", new_username_placeholder: "اتركه فارغًا لعدم التغيير", update_username_btn: "تحديث اسم المستخدم", change_password_title: "تغيير كلمة المرور", current_password_label: "كلمة المرور الحالية:", new_password_label: "كلمة المرور الجديدة:", confirm_new_password_label: "تأكيد كلمة المرور الجديدة:", update_password_btn: "تحديث كلمة المرور", logout_confirm_title: "تأكيد تسجيل الخروج", logout_confirm_message: "هل أنت متأكد أنك تريد تسجيل الخروج؟", delete_account_confirm_title: "تأكيد حذف الحساب", delete_account_warning: "تحذير! هذا الإجراء لا يمكن التراجع عنه. سيتم حذف جميع بياناتك واشتراكك (إن وجد) بشكل دائم. لن تتمكن من استعادة حسابك.", delete_account_prompt_password: "لتأكيد الحذف، يرجى إدخال كلمة المرور الحالية:", delete_account_success: "تم حذف حسابك بنجاح.", delete_account_failed: "فشل حذف الحساب. يرجى التحقق من كلمة المرور أو المحاولة مرة أخرى لاحقًا.", username_updated_success: "تم تحديث اسم المستخدم بنجاح.", password_updated_success: "تم تحديث كلمة المرور بنجاح.", confirm_action: "تأكيد", cancel_action: "إلغاء", password_fields_required_ar: "الرجاء ملء جميع حقول كلمة المرور.", password_fields_required_en: "Please fill all password fields.", password_required_for_delete_ar: "كلمة المرور مطلوبة لتأكيد الحذف.", password_required_for_delete_en: "Password required to confirm deletion."
        }
    };

    let currentLang = localStorage.getItem('language') || 'ar';

    function getTranslation(key, replacements = {}) {
        let translation = translations[currentLang]?.[key] || translations['en']?.[key] || `TR:${key}`;
        for (const placeholder in replacements) {
            translation = translation.replace(`\${${placeholder}}`, replacements[placeholder]);
        }
        return translation;
    }
    
    function showMessage(element, message, isSuccess, duration = 5000) {
        if (!element) return;
        element.textContent = message;
        const baseClass = element.id.includes('global') ? 'global-message' : 
                          element.id.includes('auth') || element.id.includes('manageAccount') ? 'auth-message' : 'message';
        element.className = `${baseClass} ${isSuccess ? 'success' : 'error'}`;
        element.style.display = 'block';
        if (duration > 0) {
            setTimeout(() => {
                if(element) element.style.display = 'none';
            }, duration);
        }
    }

    async function openVideoPlayer(video) {
        if (!videoPlayerModal || !mainVideoPlayer || !videoPlayerTitle) return;
        try {
            const tokenResponse = await fetch(`/api/request-video-token/${video.id}`, { method: 'POST' });
            if (!tokenResponse.ok) {
                const errorData = await tokenResponse.json().catch(() => ({}));
                throw new Error(errorData.message || `Failed to get video token, status: ${tokenResponse.status}`);
            }
            const { token } = await tokenResponse.json();
            if (!token) throw new Error("No token received from server.");
            const videoStreamUrl = `/api/video-stream/${video.id}?token=${token}`;
            mainVideoPlayer.src = videoStreamUrl;
            videoPlayerTitle.textContent = video.title[currentLang] || video.title['ar'];
            videoPlayerModal.style.display = 'flex';
            body.style.overflow = 'hidden';
            mainVideoPlayer.load();
            mainVideoPlayer.play().catch(e => console.error("Video play failed:", e));
        } catch (error) {
            console.error("Error opening video player:", error);
            showMessage(globalMessageDiv, getTranslation('video_token_error_ar'), false);
        }
    }
    function closeVideoPlayer() {
        if (!videoPlayerModal || !mainVideoPlayer) return;
        mainVideoPlayer.pause(); mainVideoPlayer.src = "";
        videoPlayerModal.style.display = 'none'; body.style.overflow = '';
    }
    if (closeVideoPlayerModalBtn) closeVideoPlayerModalBtn.addEventListener('click', closeVideoPlayer);
    if (videoPlayerModal) videoPlayerModal.addEventListener('click', (event) => { if (event.target === videoPlayerModal) closeVideoPlayer(); });
    document.addEventListener('keydown', (event) => { if (event.key === "Escape" && videoPlayerModal && videoPlayerModal.style.display === 'flex') closeVideoPlayer();});

    function createVideoCard(video) {
        const lang = currentLang;
        const card = document.createElement('div');
        card.className = 'video-card'; card.dataset.type = video.type; card.dataset.videoId = video.id;
        const tagText = video.type === 'free' ? getTranslation('tag_free') : getTranslation('tag_paid');
        const tagClass = video.type === 'free' ? 'free-tag-overlay' : 'paid-tag-overlay';
        let thumbnailUrl = video.thumbnail;
        if (thumbnailUrl && !thumbnailUrl.startsWith('/') && !thumbnailUrl.startsWith('http')) thumbnailUrl = `/${thumbnailUrl}`;
        card.innerHTML = `
            <div class="video-thumbnail ${video.type === 'paid' ? 'premium-video-placeholder-thumb' : ''}">
                <span class="video-type-tag ${tagClass}">${tagText}</span>
                <img src="${thumbnailUrl || 'images/placeholder.png'}" alt="${(video.altText?.[lang]) || video.title[lang]}" loading="lazy">
                <div class="play-overlay"><svg viewBox="0 0 24 24"><path fill="currentColor" d="M8,5.14V19.14L19,12.14L8,5.14Z" /></svg></div>
            </div>
            <div class="video-info">
                <h4 class="video-title">${video.title[lang]}</h4>
                <p class="video-meta"><span>${video.views[lang]} ${getTranslation('views_text')}</span></p>
                <p class="video-description">${video.description[lang]}</p>
                ${video.type === 'free'
                ? `<button class="watch-now-btn">${getTranslation('watch_now_btn_text')}</button>`
                : `<button class="premium-access-btn">${getTranslation('premium_access_btn_text')}</button>`}
            </div>`;
        const actionTrigger = card.querySelector('.video-thumbnail, .watch-now-btn, .premium-access-btn');
        if (actionTrigger) {
            actionTrigger.addEventListener('click', (e) => {
                e.preventDefault();
                if (video.type === 'paid') openModal(); else if (video.id) openVideoPlayer(video);
                else showMessage(globalMessageDiv, getTranslation('error_generic_ar'), false);
            });
        }
        return card;
    }

    const suggestedVideosContainer = document.getElementById('suggestedVideosContainer');
    const videoGridContainer = document.getElementById('videoGridContainer');

    async function fetchAndPopulateVideos() {
        try {
            const response = await fetch('/api/videos');
            if (!response.ok) {
                let errorMsg = getTranslation('error_loading_videos_ar');
                try { const errorData = await response.json(); if (errorData?.message) errorMsg = errorData.message;} catch (e) {}
                throw new Error(errorMsg);
            }
            allVideosData = await response.json();
            if (suggestedVideosContainer) {
                suggestedVideosContainer.innerHTML = '';
                allVideosData.filter(v => v.isSuggested).forEach(video => suggestedVideosContainer.appendChild(createVideoCard(video)));
            }
            if (videoGridContainer) {
                videoGridContainer.innerHTML = '';
                if(allVideosData.length > 0) allVideosData.forEach(video => videoGridContainer.appendChild(createVideoCard(video)));
                else videoGridContainer.innerHTML = `<p class="no-results-message">${getTranslation('no_videos_ar')}</p>`;
            }
        } catch (error) {
            console.error("Error fetching/populating videos:", error);
            if (videoGridContainer) videoGridContainer.innerHTML = `<p class="no-results-message">${error.message || getTranslation('error_loading_videos_ar')}</p>`;
        }
    }

    if (menuToggle && navUl) {
        menuToggle.addEventListener('click', (e) => {
            e.stopPropagation(); 
            const isExpanded = navUl.classList.toggle('active');
            menuToggle.classList.toggle('active');
            menuToggle.setAttribute('aria-expanded', isExpanded.toString());
            body.style.overflow = isExpanded ? 'hidden' : '';
        });
    }
    document.addEventListener('click', (e) => {
        if (navUl && navUl.classList.contains('active') && !navUl.contains(e.target) && menuToggle && !menuToggle.contains(e.target)) {
            navUl.classList.remove('active');
            menuToggle.classList.remove('active');
            menuToggle.setAttribute('aria-expanded', 'false');
            body.style.overflow = '';
        }
    });

    if (currentYearSpan) currentYearSpan.textContent = new Date().getFullYear();

    function setActiveSection(sectionId, fromLinkClick = true) {
        contentSections.forEach(section => {
            section.classList.remove('active');
        });
        const targetSection = document.getElementById(sectionId);
        if (targetSection) {
            targetSection.classList.add('active');
            if (sectionId === 'login-section') {
                if (loginForm) loginForm.style.display = 'block';
                if (registerForm) registerForm.style.display = 'none';
                if (authMessageDiv) authMessageDiv.style.display = 'none';
                if(loginFormTitle) loginFormTitle.style.display = 'block'; // Use the specific title for login form
                if(registerFormTitle) registerFormTitle.style.display = 'block'; // Title inside register form
            }
        }

        document.querySelectorAll('#navLinks li a.nav-link[data-section]').forEach(link => {
            link.classList.remove('active');
            if (link.dataset.section === sectionId) link.classList.add('active');
        });
        
        if (accountDropdownContent && accountDropdownContent.style.display === 'block') {
             accountDropdownContent.style.display = 'none';
             if(accountDropdownBtn) accountDropdownBtn.classList.remove('active');
        }
        if (navUl && navUl.classList.contains('active') && fromLinkClick) {
            navUl.classList.remove('active');
            if (menuToggle) {
                menuToggle.classList.remove('active');
                menuToggle.setAttribute('aria-expanded', 'false');
            }
            if (body) body.style.overflow = '';
        }
        
        if (fromLinkClick) {
            const mainContentArea = document.querySelector('main');
            if (mainContentArea && window.scrollY > (mainContentArea.offsetTop - (document.querySelector('header')?.offsetHeight || 70) - 10) ) {
                 window.scrollTo({ top: (mainContentArea.offsetTop - (document.querySelector('header')?.offsetHeight || 70) - 10), behavior: 'smooth' });
            }
        }
    }

    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const sectionId = link.dataset.section;
            if (sectionId) setActiveSection(sectionId);
        });
    });

    function applyTheme(theme) {
        if (theme === 'dark') body.classList.add('dark-theme');
        else body.classList.remove('dark-theme');
        if (themeToggleBtn) {
            themeToggleBtn.setAttribute('data-theme', theme);
            themeToggleBtn.setAttribute('aria-label', getTranslation(theme === 'dark' ? 'theme_toggle_light' : 'theme_toggle_dark'));
        }
    }
    if (themeToggleBtn) themeToggleBtn.addEventListener('click', () => {
        const newTheme = body.classList.contains('dark-theme') ? 'light' : 'dark';
        localStorage.setItem('theme', newTheme); applyTheme(newTheme);
    });

    function setLanguage(lang) {
        currentLang = lang; localStorage.setItem('language', lang);
        document.documentElement.lang = lang; document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
        document.querySelectorAll('[data-translate]').forEach(el => {
            const key = el.dataset.translate;
            const targetAttr = el.dataset.translateAttr;
            const translation = getTranslation(key);
            if (targetAttr) el.setAttribute(targetAttr, translation);
            else el.textContent = translation;
        });
        document.querySelectorAll('[data-translate-placeholder]').forEach(el => el.placeholder = getTranslation(el.dataset.translatePlaceholder));
        fetchAndPopulateVideos();
        applyTheme(localStorage.getItem('theme') || 'light');
        if(document.querySelector('#searchButton .search-button-text')) document.querySelector('#searchButton .search-button-text').textContent = getTranslation('search_button_text');
        checkAuthState();
    }
    if (languageSelect) { languageSelect.value = currentLang; languageSelect.addEventListener('change', function () { setLanguage(this.value); }); }
    if (saveAppearanceSettingsBtn) {
        saveAppearanceSettingsBtn.addEventListener('click', (e) => {
            e.preventDefault();
            showMessage(globalMessageDiv, getTranslation('settings_saved_ar'), true);
        });
    }

    function updateAuthUI(isLoggedIn, userData = null) {
        currentUserData = isLoggedIn ? userData : null;
        if (isLoggedIn && userData) {
            if (navLoginLinkContainer) navLoginLinkContainer.style.display = 'none';
            if (navAccountDropdownContainer) navAccountDropdownContainer.style.display = 'inline-block';
            if (loggedInUsernameDropdownSpan) loggedInUsernameDropdownSpan.textContent = userData.username;
            if (userCurrentPlanSpan) {
                const planKey = userData.plan === 'free' ? 'free_plan_price' : `${userData.plan}_plan_title`;
                userCurrentPlanSpan.textContent = getTranslation(planKey);
                userCurrentPlanSpan.dataset.translate = planKey; 
            }
            if (accountDropdownBtn) accountDropdownBtn.classList.remove('active');
            if (currentUsernameDisplay) currentUsernameDisplay.value = userData.username;
        } else {
            if (navLoginLinkContainer) navLoginLinkContainer.style.display = 'block';
            if (navAccountDropdownContainer) navAccountDropdownContainer.style.display = 'none';
            if (accountDropdownContent && accountDropdownContent.style.display === 'block') {
                accountDropdownContent.style.display = 'none';
                if(accountDropdownBtn) accountDropdownBtn.classList.remove('active');
            }
        }
    }
    
    async function checkAuthState() {
        try {
            const response = await fetch('/api/check-auth'); // credentials: 'include' is default for same-origin
            const data = await response.json();
            updateAuthUI(data.loggedIn, data.user);
        } catch (error) { console.error('Error checking auth state:', error); updateAuthUI(false); }
    }
    
    if (accountDropdownBtn && accountDropdownContent) {
        accountDropdownBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            const isCurrentlyShown = accountDropdownContent.style.display === 'block';
            accountDropdownContent.style.display = isCurrentlyShown ? 'none' : 'block';
            accountDropdownBtn.classList.toggle('active', !isCurrentlyShown);
        });
    }
    document.addEventListener('click', (e) => {
        if (accountDropdownContent && accountDropdownContent.style.display === 'block') {
            if (accountDropdownBtn && !accountDropdownBtn.contains(e.target) && !accountDropdownContent.contains(e.target)) {
                accountDropdownContent.style.display = 'none';
                if(accountDropdownBtn) accountDropdownBtn.classList.remove('active');
            }
        }
    });

    if (manageAccountLink) {
        manageAccountLink.addEventListener('click', (e) => {
            e.preventDefault();
            setActiveSection('manage-account-section');
            if (currentUserData && currentUsernameDisplay) currentUsernameDisplay.value = currentUserData.username;
            else {
                fetch('/api/account/info').then(res => res.json()).then(data => {
                    if (data.success && data.user && currentUsernameDisplay) currentUsernameDisplay.value = data.user.username;
                }).catch(err => console.error("Error fetching account info:", err));
            }
            if(currentPasswordInput) currentPasswordInput.value = '';
            if(newPasswordInput) newPasswordInput.value = '';
            if(confirmNewPasswordInput) confirmNewPasswordInput.value = '';
            if(newUsernameInput) newUsernameInput.value = '';
            if(manageAccountMessageDiv) manageAccountMessageDiv.style.display = 'none';
        });
    }

    if (switchToRegisterLink && switchToLoginLink && loginForm && registerForm) {
        switchToRegisterLink.addEventListener('click', (e) => {
            e.preventDefault();
            loginForm.style.display = 'none';
            registerForm.style.display = 'block';
            if (authMessageDiv) authMessageDiv.style.display = 'none';
            // The titles are now part of their respective forms in HTML
        });
        switchToLoginLink.addEventListener('click', (e) => {
            e.preventDefault();
            registerForm.style.display = 'none';
            loginForm.style.display = 'block';
            if (authMessageDiv) authMessageDiv.style.display = 'none';
        });
    }

    if (registerForm) {
        registerForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const username = document.getElementById('registerUsername').value;
            const email = document.getElementById('registerEmail').value;
            const password = document.getElementById('registerPassword').value;
            const confirmPassword = document.getElementById('registerConfirmPassword').value;
            const hint = document.getElementById('registerHint').value;
            if (password !== confirmPassword) { showMessage(authMessageDiv, getTranslation('password_mismatch_ar'), false); return; }
            if (password.length < 6) { showMessage(authMessageDiv, getTranslation('password_short_ar'), false); return; }
            try {
                const response = await fetch('/api/register', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username, email, password, hint }) });
                const data = await response.json();
                showMessage(authMessageDiv, data.message, data.success);
                if (data.success && data.user) {
                    updateAuthUI(true, data.user);
                    setTimeout(() => {
                        setActiveSection('home-section');
                        registerForm.reset(); 
                        if (loginForm) loginForm.style.display = 'block'; // Default view for login section
                        if (registerForm) registerForm.style.display = 'none';
                    }, 1500);
                }
            } catch (error) { showMessage(authMessageDiv, getTranslation('error_generic_ar'), false); }
        });
    }
    
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = document.getElementById('loginEmail').value;
            const password = document.getElementById('loginPassword').value;
            try {
                const response = await fetch('/api/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password }) });
                const data = await response.json();
                showMessage(authMessageDiv, data.message, data.success); 
                if (data.success && data.user) {
                    updateAuthUI(true, data.user);
                    setTimeout(() => {
                        setActiveSection('home-section');
                        loginForm.reset();
                    }, 1500);
                }
            } catch (error) { showMessage(authMessageDiv, getTranslation('error_generic_ar'), false); }
        });
    }

    if (logoutButtonFromDropdown) {
        logoutButtonFromDropdown.addEventListener('click', async (e) => {
            e.preventDefault();
            const confirmed = confirm(getTranslation('logout_confirm_message'));
            if (confirmed) {
                try {
                    const response = await fetch('/api/logout');
                    const data = await response.json();
                    showMessage(globalMessageDiv, data.message, data.success);
                    if (data.success) { updateAuthUI(false); setActiveSection('home-section');}
                } catch (error) { showMessage(globalMessageDiv, getTranslation('error_logout_ar'), false); }
            }
        });
    }
    if (updateUsernameBtn && newUsernameInput) {
        updateUsernameBtn.addEventListener('click', async () => {
            const newUsername = newUsernameInput.value.trim();
            if (!newUsername) return;
            try {
                const response = await fetch('/api/account/update-username', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ newUsername }) });
                const data = await response.json();
                showMessage(manageAccountMessageDiv, data.message, data.success);
                if (data.success) {
                    newUsernameInput.value = '';
                    if (currentUsernameDisplay) currentUsernameDisplay.value = data.newUsername;
                    if (loggedInUsernameDropdownSpan) loggedInUsernameDropdownSpan.textContent = data.newUsername;
                    if(currentUserData) currentUserData.username = data.newUsername;
                }
            } catch (error) { showMessage(manageAccountMessageDiv, getTranslation('error_generic_ar'), false); }
        });
    }
    if (updatePasswordBtn && currentPasswordInput && newPasswordInput && confirmNewPasswordInput) {
        updatePasswordBtn.addEventListener('click', async () => {
            const currentPassword = currentPasswordInput.value; const newPassword = newPasswordInput.value; const confirmNewPassword = confirmNewPasswordInput.value;
            if (!currentPassword || !newPassword || !confirmNewPassword) { showMessage(manageAccountMessageDiv, getTranslation('password_fields_required_ar'), false); return; }
            if (newPassword.length < 6) { showMessage(manageAccountMessageDiv, getTranslation('password_short_ar'), false); return; }
            if (newPassword !== confirmNewPassword) { showMessage(manageAccountMessageDiv, getTranslation('password_mismatch_ar'), false); return; }
            try {
                const response = await fetch('/api/account/update-password', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ currentPassword, newPassword, confirmNewPassword }) });
                const data = await response.json();
                showMessage(manageAccountMessageDiv, data.message, data.success);
                if (data.success) { currentPasswordInput.value = ''; newPasswordInput.value = ''; confirmNewPasswordInput.value = '';}
            } catch (error) { showMessage(manageAccountMessageDiv, getTranslation('error_generic_ar'), false); }
        });
    }
    if (deleteAccountBtn) {
        deleteAccountBtn.addEventListener('click', async () => {
            const warningConfirmed = confirm(`${getTranslation('delete_account_confirm_title')}\n\n${getTranslation('delete_account_warning')}`);
            if (!warningConfirmed) return;
            const password = prompt(getTranslation('delete_account_prompt_password'));
            if (password === null) return; 
            if (!password) { showMessage(globalMessageDiv, getTranslation('password_required_for_delete_ar'), false, 0); return; }
            try {
                const response = await fetch('/api/account/delete', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ password }) });
                const data = await response.json();
                showMessage(globalMessageDiv, data.message, data.success, data.success ? 7000 : 0);
                if (data.success) { updateAuthUI(false); setActiveSection('home-section'); }
            } catch (error) { showMessage(globalMessageDiv, getTranslation('error_generic_ar'), false, 0); }
        });
    }
    const searchButton = document.getElementById('searchButton');
    const searchInput = document.getElementById('searchInput');
    let noResultsEl = null;
    if (searchButton && searchInput) {
        const performSearch = () => {
            const query = searchInput.value.trim().toLowerCase();
            setActiveSection('videos-section');
            if (noResultsEl && noResultsEl.parentNode) noResultsEl.parentNode.removeChild(noResultsEl); noResultsEl = null;
            if (videoGridContainer) {
                if (query) filterVideosBySearch(query);
                else {
                    videoGridContainer.querySelectorAll('.video-card').forEach(card => card.style.display = 'flex');
                    if (allVideosData.length === 0) videoGridContainer.innerHTML = `<p class="no-results-message">${getTranslation('no_videos_ar')}</p>`;
                }
            }
        };
        searchButton.addEventListener('click', performSearch);
        searchInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') { e.preventDefault(); performSearch(); }});
        searchInput.addEventListener('input', () => { if (searchInput.value.trim() === '') performSearch(); });
    }
    function filterVideosBySearch(query) {
        if (!videoGridContainer) return;
        const videoCards = videoGridContainer.querySelectorAll('.video-card');
        let found = false;
        videoCards.forEach(card => {
            const videoId = card.dataset.videoId;
            const videoData = allVideosData.find(v => v.id === videoId);
            if (videoData) {
                const title = (videoData.title[currentLang] || videoData.title['ar'] || '').toLowerCase();
                const description = (videoData.description[currentLang] || videoData.description['ar'] || '').toLowerCase();
                if (title.includes(query) || description.includes(query) || videoId.toLowerCase().includes(query)) {
                    card.style.display = 'flex'; found = true;
                } else { card.style.display = 'none'; }
            } else { card.style.display = 'none'; }
        });
        if (noResultsEl && noResultsEl.parentNode) { noResultsEl.parentNode.removeChild(noResultsEl); noResultsEl = null; }
        if (!found && query) {
            noResultsEl = document.createElement('p');
            noResultsEl.className = 'no-results-message';
            noResultsEl.textContent = getTranslation('search_no_results_ar', { query: searchInput.value.trim() });
            videoGridContainer.appendChild(noResultsEl);
        }
    }
    const premiumModal = document.getElementById('premiumContentModal');
    const closeModalBtn = premiumModal?.querySelector('.close-modal-btn');
    const modalSubscribeBtn = document.getElementById('modalSubscribeBtn');
    const modalSeePlansBtn = document.getElementById('modalSeePlansBtn');
    function openModal() { if (premiumModal) premiumModal.style.display = 'flex'; body.style.overflow = 'hidden';}
    function closeModal() { if (premiumModal) premiumModal.style.display = 'none'; body.style.overflow = '';}
    if (closeModalBtn) closeModalBtn.addEventListener('click', closeModal);
    if (modalSubscribeBtn) modalSubscribeBtn.addEventListener('click', () => { closeModal(); setActiveSection('subscription-section'); });
    if (modalSeePlansBtn) modalSeePlansBtn.addEventListener('click', (e) => { e.preventDefault(); closeModal(); setActiveSection('subscription-section'); });
    if (premiumModal) premiumModal.addEventListener('click', (event) => { if (event.target === premiumModal) closeModal(); });
    document.addEventListener('keydown', function (event) { if (event.key === "Escape" && premiumModal?.style.display === 'flex') closeModal();});
    
    async function initializePage() {
        applyTheme(localStorage.getItem('theme') || 'light'); 
        await checkAuthState(); 
        setLanguage(currentLang);
        let initialSectionId = 'home-section';
        const isLoggedIn = navAccountDropdownContainer?.style.display !== 'none' && navAccountDropdownContainer?.style.display !== '';
        if (window.location.hash?.length > 1) {
            const hashSectionId = window.location.hash.substring(1).split('?')[0];
            if (document.getElementById(hashSectionId)) { 
                if (!(hashSectionId === 'login-section' && isLoggedIn)) initialSectionId = hashSectionId;
            }
        } else if (isLoggedIn && document.getElementById('login-section')?.classList.contains('active')) {
            initialSectionId = 'home-section';
        }
        setActiveSection(initialSectionId, false);
        console.log("SofagHub Initialized with session persistence and dropdown fixes attempt.");
    }
    initializePage();
});
