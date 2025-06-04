document.addEventListener('DOMContentLoaded', () => {
    const navLinks = document.querySelectorAll('#navLinks li a.nav-link, .logo');
    const contentSections = document.querySelectorAll('.content-section');
    const menuToggle = document.getElementById('menuToggle');
    const navUl = document.getElementById('navLinks');
    const themeToggleBtn = document.getElementById('themeToggleBtn');
    const body = document.body;
    const currentYearSpan = document.getElementById('currentYear');
    const languageSelect = document.getElementById('languageSelect');

    const navLoginLinkContainer = document.getElementById('navLoginLinkContainer');
    const navLogoutLinkContainer = document.getElementById('navLogoutLinkContainer');
    const logoutButton = document.getElementById('logoutButton');
    const loggedInUsernameSpan = document.getElementById('loggedInUsername');
    const globalMessageDiv = document.getElementById('globalMessage');
    const authMessageDiv = document.getElementById('authMessage');

    // عناصر مشغل الفيديو الجديد
    const videoPlayerModal = document.getElementById('videoPlayerModal');
    const mainVideoPlayer = document.getElementById('mainVideoPlayer');
    const videoPlayerTitle = document.getElementById('videoPlayerTitle');
    const closeVideoPlayerModalBtn = document.getElementById('closeVideoPlayerModalBtn');


    let allVideosData = [];

    const translations = {
        en: {
            site_title: "SofagHub - Your SikoSiko Hub",
            nav_home: "Home",
            nav_videos: "Videos",
            nav_subscriptions: "Subscriptions",
            nav_settings: "Settings",
            nav_login: "Login",
            nav_logout: "Logout",
            search_placeholder: "Search videos...",
            search_button_text: "Search",
            welcome_title: "Welcome to SofagHub!",
            site_subtitle_text: "Your premium Arabic site for Siko Siko videos.",
            suggested_for_you: "Suggested for You",
            browse_videos_title: "Browse Videos",
            subscription_plans_title: "Subscription Plans",
            basic_plan_title: "Basic Plan",
            free_plan_price: "Free",
            basic_feature_1: "Limited video access",
            basic_feature_2: "Low quality (SD)",
            basic_feature_3: "Many annoying ads",
            basic_feature_4: "Forum support",
            start_free_btn: "Start Free",
            most_popular_badge: "Most Popular",
            premium_plan_title: "Premium Plan",
            monthly_text: "/month",
            premium_feature_1: "Access to all videos",
            premium_feature_2: "High quality (HD/1080p)",
            premium_feature_3: "Ad-free watching",
            premium_feature_4: "New exclusive content weekly",
            premium_feature_5: "Email support",
            subscribe_now_btn: "Subscribe Now",
            ultimate_plan_title: "Ultimate Plan",
            ultimate_feature_1: "All Premium features",
            ultimate_feature_2: "Ultra high quality (4K UHD)",
            ultimate_feature_3: "Download videos for offline viewing",
            ultimate_feature_4: "Early access to new content",
            ultimate_feature_5: "Dedicated & fast support",
            choose_ultimate_btn: "Choose Ultimate Plan",
            settings_title: "Account & Appearance Settings",
            theme_label: "Appearance:",
            language_label: "Interface Language:",
            save_settings_btn: "Save Settings",
            login_title_section: "Login",
            email_label: "Email",
            email_placeholder: "example@mail.com",
            password_label: "Password",
            password_placeholder: "********",
            login_btn: "Login",
            no_account_text: "Don't have an account?",
            create_account_link: "Create a new account",
            create_account_title: "Create New Account",
            username_label: "Username",
            username_placeholder: "Your unique name",
            password_placeholder_strong: "Strong password",
            confirm_password_label: "Confirm Password",
            confirm_password_placeholder: "Re-enter password",
            create_account_btn: "Create Account",
            already_have_account_text: "Already have an account?",
            login_link_from_register: "Login",
            footer_text: "Arabic Siko Siko, coming soon.",
            modal_title: "Exclusive Content for Subscribers!",
            modal_description: "This video requires a premium subscription. Get unlimited access to all exclusive videos in high quality, ad-free.",
            modal_feature_1: "New exclusive videos weekly",
            modal_feature_2: "Up to 4K quality",
            modal_feature_3: "No annoying ads",
            modal_feature_4: "Premium technical support",
            subscribe_now_btn_modal: "Subscribe Now",
            see_all_plans_link: "See All Plans",
            tag_free: "Free",
            tag_paid: "Paid",
            views_text: "views",
            watch_now_btn_text: "Watch Now",
            premium_access_btn_text: "Exclusive Access",
            error_generic_ar: "حدث خطأ. حاول مرة أخرى.",
            error_generic_en: "An error occurred. Please try again.",
            error_loading_videos_ar: "حدث خطأ أثناء تحميل الفيديوهات. حاول لاحقاً.",
            error_loading_videos_en: "Error loading videos. Please try again later.",
            no_videos_ar: "لا توجد فيديوهات لعرضها حاليًا.",
            no_videos_en: "No videos to display at the moment.",
            password_mismatch_ar: "كلمتا المرور غير متطابقتين.",
            password_mismatch_en: "Passwords do not match.",
            password_short_ar: "يجب أن تتكون كلمة المرور من 6 أحرف على الأقل.",
            password_short_en: "Password must be at least 6 characters long.",
            error_logout_ar: "حدث خطأ أثناء تسجيل الخروج.",
            error_logout_en: "Error during logout.",
            search_no_results_ar: "لا توجد نتائج بحث تطابق '${query}'.",
            search_no_results_en: "No search results found for '${query}'.",
            settings_saved_ar: "تم حفظ الإعدادات بنجاح!",
            settings_saved_en: "Settings saved successfully!",
            theme_toggle_light: "التبديل إلى المظهر الفاتح",
            theme_toggle_dark: "التبديل إلى المظهر الداكن",
            video_token_error_ar: "خطأ في الحصول على إذن مشاهدة الفيديو. حاول مرة أخرى.",
            video_token_error_en: "Error getting video viewing permission. Please try again."
        },
        ar: { 
            site_title: "SofagHub - سوفاج هاب",
            nav_home: "الرئيسية",
            nav_videos: "الفيديوهات",
            nav_subscriptions: "الاشتراكات",
            nav_settings: "الإعدادات",
            nav_login: "تسجيل الدخول",
            nav_logout: "تسجيل الخروج",
            search_placeholder: "ابحث عن فيديوهات...",
            search_button_text: "بحث",
            welcome_title: "مرحباً بك في SofagHub!",
            site_subtitle_text: "موقع عربي مميز لمشاهدة السيكو سيكو العربي",
            suggested_for_you: "مقترحة لك",
            browse_videos_title: "تصفح الفيديوهات",
            subscription_plans_title: "خطط الاشتراك",
            basic_plan_title: "الخطة الأساسية",
            free_plan_price: "مجاني",
            basic_feature_1: "الوصول لفيديوهات محدودة",
            basic_feature_2: "جودة مشاهدة منخفضة (SD)",
            basic_feature_3: "إعلانات كثيرة ومزعجة",
            basic_feature_4: "دعم عبر المنتدى",
            start_free_btn: "ابدأ مجاناً",
            most_popular_badge: "الأكثر شيوعاً",
            premium_plan_title: "الخطة المميزة",
            monthly_text: "/شهرياً",
            premium_feature_1: "الوصول لجميع الفيديوهات",
            premium_feature_2: "جودة مشاهدة عالية (HD/1080p)",
            premium_feature_3: "مشاهدة بدون إعلانات",
            premium_feature_4: "محتوى حصري وجديد أسبوعياً",
            premium_feature_5: "دعم فني عبر البريد",
            subscribe_now_btn: "اشترك الآن",
            ultimate_plan_title: "الخطة الفائقة",
            ultimate_feature_1: "جميع مزايا الخطة المميزة",
            ultimate_feature_2: "جودة مشاهدة فائقة (4K UHD)",
            ultimate_feature_3: "تحميل الفيديوهات للمشاهدة لاحقًا",
            ultimate_feature_4: "وصول مبكر للمحتوى الجديد",
            ultimate_feature_5: "دعم فني مخصص وسريع",
            choose_ultimate_btn: "اختر الخطة الفائقة",
            settings_title: "إعدادات الحساب والمظهر",
            theme_label: "المظهر:",
            language_label: "لغة الواجهة:",
            save_settings_btn: "حفظ الإعدادات",
            login_title_section: "تسجيل الدخول",
            email_label: "البريد الإلكتروني",
            email_placeholder: "example@mail.com",
            password_label: "كلمة المرور",
            password_placeholder: "********",
            login_btn: "تسجيل الدخول",
            no_account_text: "ليس لديك حساب؟",
            create_account_link: "أنشئ حساباً جديداً",
            create_account_title: "إنشاء حساب جديد",
            username_label: "اسم المستخدم",
            username_placeholder: "اسمك الفريد",
            password_placeholder_strong: "كلمة مرور قوية",
            confirm_password_label: "تأكيد كلمة المرور",
            confirm_password_placeholder: "أعد إدخال كلمة المرور",
            create_account_btn: "إنشاء حساب",
            already_have_account_text: "لديك حساب بالفعل؟",
            login_link_from_register: "سجل الدخول",
            footer_text: "سيكو سيكو عربي قريب.",
            modal_title: "محتوى حصري للمشتركين!",
            modal_description: "هذا الفيديو يتطلب اشتراكًا مميزًا للوصول إليه. احصل على وصول غير محدود لجميع الفيديوهات الحصرية بجودة عالية وبدون إعلانات.",
            modal_feature_1: "فيديوهات حصرية جديدة أسبوعياً",
            modal_feature_2: "جودة تصل إلى 4K",
            modal_feature_3: "بدون إعلانات مزعجة",
            modal_feature_4: "دعم فني متميز",
            subscribe_now_btn_modal: "الاشتراك الآن",
            see_all_plans_link: "مشاهدة جميع الخطط",
            tag_free: "مجاني",
            tag_paid: "مدفوع",
            views_text: "مشاهدات",
            watch_now_btn_text: "شاهد الآن",
            premium_access_btn_text: "محتوى حصري",
            error_generic_ar: "حدث خطأ. حاول مرة أخرى.",
            error_generic_en: "An error occurred. Please try again.",
            error_loading_videos_ar: "حدث خطأ أثناء تحميل الفيديوهات. حاول لاحقاً.",
            error_loading_videos_en: "Error loading videos. Please try again later.",
            no_videos_ar: "لا توجد فيديوهات لعرضها حاليًا.",
            no_videos_en: "No videos to display at the moment.",
            password_mismatch_ar: "كلمتا المرور غير متطابقتين.",
            password_mismatch_en: "Passwords do not match.",
            password_short_ar: "يجب أن تتكون كلمة المرور من 6 أحرف على الأقل.",
            password_short_en: "Password must be at least 6 characters long.",
            error_logout_ar: "حدث خطأ أثناء تسجيل الخروج.",
            error_logout_en: "Error during logout.",
            search_no_results_ar: "لا توجد نتائج بحث تطابق '${query}'.",
            search_no_results_en: "No search results found for '${query}'.",
            settings_saved_ar: "تم حفظ الإعدادات بنجاح!",
            settings_saved_en: "Settings saved successfully!",
            theme_toggle_light: "التبديل إلى المظهر الفاتح",
            theme_toggle_dark: "التبديل إلى المظهر الداكن",
            video_token_error_ar: "خطأ في الحصول على إذن مشاهدة الفيديو. حاول مرة أخرى.",
            video_token_error_en: "Error getting video viewing permission. Please try again."
        }
    };

    let currentLang = localStorage.getItem('language') || 'ar';

    function getTranslation(key) {
        return translations[currentLang]?.[key] || translations['en']?.[key] || key;
    }

    function showMessage(element, message, isSuccess) {
        if (!element) return;
        element.textContent = message;
        element.className = `message ${isSuccess ? 'success' : 'error'}`; 
        if (element.id === 'globalMessage') element.className = `global-message ${isSuccess ? 'success' : 'error'}`;
        if (element.id === 'authMessage') element.className = `auth-message ${isSuccess ? 'success' : 'error'}`;
        
        element.style.display = 'block';
        setTimeout(() => {
            element.style.display = 'none';
        }, 5000);
    }

    // دالة لفتح مشغل الفيديو
    async function openVideoPlayer(video) {
        if (!videoPlayerModal || !mainVideoPlayer || !videoPlayerTitle) return;

        try {
            // 1. طلب توكن من الخادم
            const tokenResponse = await fetch(`/api/request-video-token/${video.id}`, { method: 'POST' });
            if (!tokenResponse.ok) {
                const errorData = await tokenResponse.json().catch(() => ({}));
                throw new Error(errorData.message || `Failed to get video token, status: ${tokenResponse.status}`);
            }
            const { token } = await tokenResponse.json();

            if (!token) {
                throw new Error("No token received from server.");
            }

            // 2. بناء رابط الفيديو مع التوكن
            const videoStreamUrl = `/api/video-stream/${video.id}?token=${token}`;
            
            // 3. تعيين مصدر الفيديو وعنوانه وتشغيله
            mainVideoPlayer.src = videoStreamUrl;
            videoPlayerTitle.textContent = video.title[currentLang] || video.title['ar'];
            videoPlayerModal.style.display = 'flex';
            body.style.overflow = 'hidden'; // لمنع التمرير في الخلفية
            mainVideoPlayer.load(); // التأكد من تحميل المصدر الجديد
            mainVideoPlayer.play().catch(e => console.error("Video play failed:", e));

        } catch (error) {
            console.error("Error opening video player:", error);
            showMessage(globalMessageDiv, getTranslation('video_token_error_ar'), false);
        }
    }

    // دالة لإغلاق مشغل الفيديو
    function closeVideoPlayer() {
        if (!videoPlayerModal || !mainVideoPlayer) return;
        mainVideoPlayer.pause();
        mainVideoPlayer.src = ""; // إفراغ المصدر لإيقاف التحميل
        videoPlayerModal.style.display = 'none';
        body.style.overflow = '';
    }

    if (closeVideoPlayerModalBtn) {
        closeVideoPlayerModalBtn.addEventListener('click', closeVideoPlayer);
    }
    if (videoPlayerModal) {
        videoPlayerModal.addEventListener('click', (event) => {
            if (event.target === videoPlayerModal) { // إذا تم الضغط على الخلفية
                closeVideoPlayer();
            }
        });
    }
    // إغلاق المشغل عند الضغط على زر Escape
    document.addEventListener('keydown', (event) => {
        if (event.key === "Escape" && videoPlayerModal.style.display === 'flex') {
            closeVideoPlayer();
        }
    });


    function createVideoCard(video) {
        const lang = currentLang;
        const card = document.createElement('div');
        card.className = 'video-card';
        card.dataset.type = video.type;
        card.dataset.videoId = video.id;

        const isPremiumPlaceholder = video.type === 'paid';
        const tagText = video.type === 'free' ? getTranslation('tag_free') : getTranslation('tag_paid');
        const tagClass = video.type === 'free' ? 'free-tag-overlay' : 'paid-tag-overlay';
        
        let thumbnailUrl = video.thumbnail;
        if (thumbnailUrl && !thumbnailUrl.startsWith('/') && !thumbnailUrl.startsWith('http')) {
             thumbnailUrl = `/${thumbnailUrl}`;
        }

        card.innerHTML = `
            <div class="video-thumbnail ${isPremiumPlaceholder ? 'premium-video-placeholder-thumb' : ''}">
                <span class="video-type-tag ${tagClass}">${tagText}</span>
                <img src="${thumbnailUrl || 'images/placeholder.png'}" alt="${(video.altText && video.altText[lang]) || video.title[lang]}" loading="lazy">
                <div class="play-overlay"><svg viewBox="0 0 24 24"><path fill="currentColor" d="M8,5.14V19.14L19,12.14L8,5.14Z" /></svg></div>
            </div>
            <div class="video-info">
                <h4 class="video-title">${video.title[lang]}</h4>
                <p class="video-meta">
                    <span>${video.views[lang]} ${getTranslation('views_text')}</span>
                </p>
                <p class="video-description">${video.description[lang]}</p>
                ${video.type === 'free'
                ? `<button class="watch-now-btn">${getTranslation('watch_now_btn_text')}</button>`
                : `<button class="premium-access-btn">${getTranslation('premium_access_btn_text')}</button>`
            }
            </div>
        `;

        const actionTrigger = card.querySelector('.video-thumbnail, .watch-now-btn, .premium-access-btn');

        if (actionTrigger) {
            actionTrigger.addEventListener('click', (e) => {
                e.preventDefault();
                if (video.type === 'paid') {
                    openModal(); // يفتح مودال الاشتراك
                } else {
                    // للفيديوهات المجانية، افتح مشغل الفيديو الجديد
                    if (video.id) {
                        openVideoPlayer(video);
                    } else {
                        console.error("Video ID is missing for video card.", video);
                        showMessage(globalMessageDiv, getTranslation('error_generic_ar'), false);
                    }
                }
            });
        }
        if (video.type === 'paid' && card.querySelector('.premium-access-btn')) {
            const premiumBtn = card.querySelector('.premium-access-btn');
            if (!premiumBtn.isSameNode(actionTrigger)) { 
                 premiumBtn.addEventListener('click', (e) => {
                    e.preventDefault();
                    openModal();
                });
            }
        }
        return card;
    }

    const suggestedVideosContainer = document.getElementById('suggestedVideosContainer');
    const videoGridContainer = document.getElementById('videoGridContainer');

    async function fetchAndPopulateVideos() {
        try {
            const response = await fetch('/api/videos');
            if (!response.ok) {
                let errorMsg = getTranslation(currentLang === 'ar' ? 'error_loading_videos_ar' : 'error_loading_videos_en');
                try {
                    const errorData = await response.json();
                    if (errorData && errorData.message) { errorMsg = errorData.message; }
                } catch (e) { /* ignore */ }
                throw new Error(errorMsg);
            }
            allVideosData = await response.json();

            if (suggestedVideosContainer) {
                suggestedVideosContainer.innerHTML = '';
                const suggested = allVideosData.filter(v => v.isSuggested);
                if (suggested.length > 0) {
                    suggested.forEach(video => {
                        suggestedVideosContainer.appendChild(createVideoCard(video));
                    });
                }
            }
            if (videoGridContainer) {
                videoGridContainer.innerHTML = '';
                if (allVideosData.length > 0) {
                    allVideosData.forEach(video => {
                        videoGridContainer.appendChild(createVideoCard(video));
                    });
                } else {
                    videoGridContainer.innerHTML = `<p class="no-results-message">${getTranslation(currentLang === 'ar' ? 'no_videos_ar' : 'no_videos_en')}</p>`;
                }
            }
        } catch (error) {
            console.error("Error fetching and populating videos:", error);
            const errorText = error.message || getTranslation(currentLang === 'ar' ? 'error_loading_videos_ar' : 'error_loading_videos_en');
            if (videoGridContainer) videoGridContainer.innerHTML = `<p class="no-results-message">${errorText}</p>`;
        }
    }

    // ... باقي الكود الخاص بـ menuToggle, currentYearSpan, setActiveSection, navLinks, applyTheme, themeToggleBtn, setLanguage, languageSelect, etc.
    // يجب أن يبقى كما هو

    if (menuToggle) {
        menuToggle.addEventListener('click', () => {
            const isExpanded = navUl.classList.toggle('active');
            menuToggle.classList.toggle('active');
            menuToggle.setAttribute('aria-expanded', isExpanded.toString());
            body.style.overflow = isExpanded ? 'hidden' : '';
        });
    }

    if (currentYearSpan) currentYearSpan.textContent = new Date().getFullYear();

    function setActiveSection(sectionId, fromLinkClick = true) {
        contentSections.forEach(section => {
            section.classList.remove('active');
            if (section.id === sectionId) {
                section.classList.add('active');
            }
        });
        document.querySelectorAll('#navLinks li a.nav-link').forEach(link => {
            link.classList.remove('active');
            if (link.dataset.section === sectionId) {
                link.classList.add('active');
            }
        });
        
        if (navUl.classList.contains('active')) {
            navUl.classList.remove('active');
            menuToggle.classList.remove('active');
            menuToggle.setAttribute('aria-expanded', 'false');
            body.style.overflow = '';
        }
        
        if (fromLinkClick) {
            const mainContentArea = document.querySelector('main');
            if (mainContentArea && window.scrollY > mainContentArea.offsetTop) {
                window.scrollTo({ top: (mainContentArea.offsetTop - document.querySelector('header').offsetHeight - 10), behavior: 'smooth' });
            }
        }
    }

    navLinks.forEach(link => {
        if (link.id === 'logoutButton') return;
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const sectionId = link.dataset.section;
            if (sectionId) {
                setActiveSection(sectionId);
            }
        });
    });

    function applyTheme(theme) {
        if (theme === 'dark') {
            body.classList.add('dark-theme');
            if (themeToggleBtn) themeToggleBtn.setAttribute('data-theme', 'dark');
        } else {
            body.classList.remove('dark-theme');
            if (themeToggleBtn) themeToggleBtn.setAttribute('data-theme', 'light');
        }
        if (themeToggleBtn) {
             const newAriaLabelKey = body.classList.contains('dark-theme') ? 'theme_toggle_light' : 'theme_toggle_dark';
             themeToggleBtn.setAttribute('aria-label', getTranslation(newAriaLabelKey));
        }
    }

    if (themeToggleBtn) themeToggleBtn.addEventListener('click', () => {
        const newTheme = body.classList.contains('dark-theme') ? 'light' : 'dark';
        localStorage.setItem('theme', newTheme);
        applyTheme(newTheme);
    });

    function setLanguage(lang) {
        currentLang = lang;
        localStorage.setItem('language', lang);
        document.documentElement.lang = lang;
        document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
        
        document.querySelectorAll('[data-translate]').forEach(el => {
            const key = el.dataset.translate;
            el.textContent = getTranslation(key);
        });
        document.querySelectorAll('[data-translate-placeholder]').forEach(el => {
            const key = el.dataset.translatePlaceholder;
            el.placeholder = getTranslation(key);
        });

        fetchAndPopulateVideos();
        
        const currentTheme = localStorage.getItem('theme') || 'light';
        applyTheme(currentTheme);
        
        const searchButtonTextSpan = document.querySelector('#searchButton .search-button-text');
        if (searchButtonTextSpan) searchButtonTextSpan.textContent = getTranslation('search_button_text');
        
        checkAuthState();
    }

    if (languageSelect) {
        languageSelect.value = currentLang;
        languageSelect.addEventListener('change', function () { setLanguage(this.value); });
    }

    const loginForm = document.getElementById('loginForm');
    const registerForm = document.getElementById('registerForm');
    const switchToRegisterLink = document.getElementById('switchToRegister');
    const switchToLoginLink = document.getElementById('switchToLogin');

    function updateAuthUI(isLoggedIn, username = '') {
        if (isLoggedIn) {
            if (navLoginLinkContainer) navLoginLinkContainer.style.display = 'none';
            if (navLogoutLinkContainer) navLogoutLinkContainer.style.display = 'block';
            if (loggedInUsernameSpan) loggedInUsernameSpan.textContent = username;
            if (logoutButton) {
                const logoutTextNode = Array.from(logoutButton.childNodes).find(node => node.nodeType === Node.TEXT_NODE);
                if(logoutTextNode) logoutTextNode.nodeValue = `${getTranslation('nav_logout')} (`;
            }

            if (document.getElementById('login-section')?.classList.contains('active')) {
                setActiveSection('home-section', false);
            }
        } else {
            if (navLoginLinkContainer) navLoginLinkContainer.style.display = 'block';
            if (navLogoutLinkContainer) navLogoutLinkContainer.style.display = 'none';
            if (loggedInUsernameSpan) loggedInUsernameSpan.textContent = '';
        }
    }
    
    async function checkAuthState() {
        try {
            const response = await fetch('/api/check-auth');
            const data = await response.json();
            updateAuthUI(data.loggedIn, data.user ? data.user.username : '');
        } catch (error) {
            console.error('Error checking auth state:', error);
            updateAuthUI(false);
        }
    }

    if (switchToRegisterLink && switchToLoginLink && loginForm && registerForm) {
        switchToRegisterLink.addEventListener('click', (e) => {
            e.preventDefault(); loginForm.style.display = 'none'; registerForm.style.display = 'block';
            if (authMessageDiv) authMessageDiv.style.display = 'none';
        });
        switchToLoginLink.addEventListener('click', (e) => {
            e.preventDefault(); registerForm.style.display = 'none'; loginForm.style.display = 'block';
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

            if (password !== confirmPassword) {
                showMessage(authMessageDiv, getTranslation('password_mismatch_ar'), false);
                return;
            }
            if (password.length < 6) {
                showMessage(authMessageDiv, getTranslation('password_short_ar'), false);
                return;
            }

            try {
                const response = await fetch('/api/register', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ username, email, password, hint })
                });
                const data = await response.json();
                showMessage(authMessageDiv, data.message, data.success);
                if (data.success) {
                    updateAuthUI(true, data.user.username);
                    setTimeout(() => setActiveSection('home-section', false), 1500);
                    registerForm.reset();
                }
            } catch (error) {
                console.error("Error during registration:", error);
                showMessage(authMessageDiv, getTranslation('error_generic_ar'), false);
            }
        });
    }
    
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = document.getElementById('loginEmail').value;
            const password = document.getElementById('loginPassword').value;
            try {
                const response = await fetch('/api/login', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email, password })
                });
                const data = await response.json();
                showMessage(authMessageDiv, data.message, data.success);
                if (data.success) {
                    updateAuthUI(true, data.user.username);
                    setTimeout(() => setActiveSection('home-section', false), 1500);
                    loginForm.reset();
                }
            } catch (error) {
                console.error("Error during login:", error);
                showMessage(authMessageDiv, getTranslation('error_generic_ar'), false);
            }
        });
    }

    if (logoutButton) {
        logoutButton.addEventListener('click', async (e) => {
            e.preventDefault();
            try {
                const response = await fetch('/api/logout');
                const data = await response.json();
                showMessage(globalMessageDiv, data.message, data.success);
                if (data.success) {
                    updateAuthUI(false);
                    setActiveSection('home-section');
                }
            } catch (error) {
                console.error("Error during logout:", error);
                showMessage(globalMessageDiv, getTranslation('error_logout_ar'), false);
            }
        });
    }

    const searchButton = document.getElementById('searchButton');
    const searchInput = document.getElementById('searchInput');
    let noResultsEl = null;

    if (searchButton && searchInput) {
        const performSearch = () => {
            const query = searchInput.value.trim().toLowerCase();
            setActiveSection('videos-section');
            
            if (noResultsEl && noResultsEl.parentNode) {
                noResultsEl.parentNode.removeChild(noResultsEl);
                noResultsEl = null;
            }

            if (videoGridContainer) {
                if (query) {
                    filterVideosBySearch(query);
                } else {
                    const videoCards = videoGridContainer.querySelectorAll('.video-card');
                    videoCards.forEach(card => card.style.display = 'flex');
                    if (allVideosData.length === 0) {
                         videoGridContainer.innerHTML = `<p class="no-results-message">${getTranslation(currentLang === 'ar' ? 'no_videos_ar' : 'no_videos_en')}</p>`;
                    }
                }
            }
        };
        searchButton.addEventListener('click', performSearch);
        searchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') { e.preventDefault(); performSearch(); }
        });
         searchInput.addEventListener('input', () => {
            if (searchInput.value.trim() === '') {
                performSearch();
            }
        });
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
                } else {
                    card.style.display = 'none';
                }
            } else {
                 card.style.display = 'none';
            }
        });

        if (noResultsEl && noResultsEl.parentNode) {
            noResultsEl.parentNode.removeChild(noResultsEl);
            noResultsEl = null;
        }

        if (!found && query) {
            noResultsEl = document.createElement('p');
            noResultsEl.className = 'no-results-message';
            noResultsEl.textContent = getTranslation(currentLang === 'en' ? 'search_no_results_en' : 'search_no_results_ar').replace('${query}', searchInput.value.trim());
            videoGridContainer.appendChild(noResultsEl);
        }
    }

    const premiumModal = document.getElementById('premiumContentModal');
    const closeModalBtn = premiumModal ? premiumModal.querySelector('.close-modal-btn') : null;
    const modalSubscribeBtn = document.getElementById('modalSubscribeBtn');
    const modalSeePlansBtn = document.getElementById('modalSeePlansBtn');

    function openModal() { // Modal للاشتراك
        if (premiumModal) premiumModal.style.display = 'flex'; body.style.overflow = 'hidden';
    }
    function closeModal() { // Modal للاشتراك
        if (premiumModal) premiumModal.style.display = 'none'; body.style.overflow = '';
    }
    if (closeModalBtn) closeModalBtn.addEventListener('click', closeModal);
    if (modalSubscribeBtn) {
        modalSubscribeBtn.addEventListener('click', () => { closeModal(); setActiveSection('subscription-section'); });
    }
    if (modalSeePlansBtn) {
        modalSeePlansBtn.addEventListener('click', (e) => { e.preventDefault(); closeModal(); setActiveSection('subscription-section'); });
    }
    if (premiumModal) {
        premiumModal.addEventListener('click', (event) => { if (event.target === premiumModal) closeModal(); });
    }
    document.addEventListener('keydown', function (event) {
        if (event.key === "Escape" && premiumModal && (premiumModal.style.display === 'flex' || premiumModal.style.display === 'block')) closeModal();
    });

    const settingsForm = document.querySelector('#settings-section .settings-form');
    if (settingsForm && settingsForm.querySelector('button[type="submit"]')) {
        settingsForm.addEventListener('submit', (e) => {
            e.preventDefault();
            showMessage(globalMessageDiv, getTranslation('settings_saved_ar'), true);
        });
    }

    async function initializePage() {
        const savedTheme = localStorage.getItem('theme') || 'light';
        applyTheme(savedTheme); 
        
        await checkAuthState(); 
        setLanguage(currentLang);

        let initialSectionId = 'home-section';
        if (window.location.hash && window.location.hash.length > 1) {
            const hashSectionId = window.location.hash.substring(1).split('?')[0];
            if (document.getElementById(hashSectionId)) { 
                const isLoggedIn = navLogoutLinkContainer?.style.display === 'block';
                if (!(hashSectionId === 'login-section' && isLoggedIn)) {
                    initialSectionId = hashSectionId;
                }
            }
        }
        setActiveSection(initialSectionId, false);
        console.log("SofagHub Fully Initialized with token-based video streaming!");
    }

    initializePage();
});
