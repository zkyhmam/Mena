document.addEventListener('DOMContentLoaded', () => {
    // --- ELEMENT SELECTORS ---
    const navLinks = document.querySelectorAll('#navLinks li a.nav-link[data-section-target], .logo[data-section-target], #headerAccountBtn[data-section-target]');
    const contentSections = document.querySelectorAll('.content-section');
    const themeToggleBtn = document.getElementById('themeToggleBtn');
    const body = document.body;
    const currentYearSpan = document.getElementById('currentYear');
    const languageSelect = document.getElementById('languageSelect');
    const saveAppearanceSettingsBtn = document.getElementById('saveAppearanceSettingsBtn');
    const headerLoginBtn = document.getElementById('headerLoginBtn');
    const headerAccountBtn = document.getElementById('headerAccountBtn');
    const globalMessageDiv = document.getElementById('globalMessage');
    const authMessageDiv = document.getElementById('authMessage');
    const manageAccountMessageDiv = document.getElementById('manageAccountMessage');
    
    // Account Management Page Selectors
    const accountPageWrapper = document.getElementById('manage-account-section');
    const accountOverviewPlan = document.getElementById('accountOverviewPlan');
    const accountOverviewUsername = document.getElementById('accountOverviewUsername');
    const accountOverviewEmail = document.getElementById('accountOverviewEmail');
    const showUpdateUsernameBtn = document.getElementById('showUpdateUsernameBtn');
    const showUpdatePasswordBtn = document.getElementById('showUpdatePasswordBtn');
    const updateUsernameForm = document.getElementById('updateUsernameForm');
    const updatePasswordForm = document.getElementById('updatePasswordForm');
    const currentUsernameDisplay = document.getElementById('currentUsernameDisplay');
    const newUsernameInput = document.getElementById('newUsername');
    const updateUsernameBtn = document.getElementById('updateUsernameBtn');
    const currentPasswordInput = document.getElementById('currentPassword');
    const newPasswordInput = document.getElementById('newPassword');
    const confirmNewPasswordInput = document.getElementById('confirmNewPassword');
    const updatePasswordBtn = document.getElementById('updatePasswordBtn');
    const logoutBtn = document.getElementById('logoutBtn');
    const deleteAccountBtn = document.getElementById('deleteAccountBtn');

    // Video Player Modal
    const videoPlayerModal = document.getElementById('videoPlayerModal');
    const mainVideoPlayer = document.getElementById('mainVideoPlayer');
    const videoPlayerTitle = document.getElementById('videoPlayerTitle');
    const closeVideoPlayerModalBtn = document.getElementById('closeVideoPlayerModalBtn');

    // Auth Forms
    const loginForm = document.getElementById('loginForm');
    const registerForm = document.getElementById('registerForm');
    const switchToRegisterLink = document.getElementById('switchToRegister');
    const switchToLoginLink = document.getElementById('switchToLogin');
    const loginFormTitleEl = loginForm?.querySelector('.login-form-title');
    const registerFormTitleEl = registerForm?.querySelector('.register-form-title');
    
    // Premium Modal
    const premiumModal = document.getElementById('premiumContentModal');

    // --- STATE VARIABLES ---
    let allVideosData = [];
    let currentUserData = null; // Will store { username, email, plan }

    // --- TRANSLATIONS ---
    const translations = {
        en: {
            site_title: "SofagHub - Your SikoSiko Hub", nav_home: "Home", nav_videos: "Videos", nav_subscriptions: "Subscriptions", nav_settings: "Settings", nav_login: "Login", search_placeholder: "Search videos...", search_button_text: "Search", welcome_title: "Welcome to SofagHub!", site_subtitle_text: "Your premium Arabic site for Siko Siko videos.", suggested_for_you: "Suggested for You", browse_videos_title: "Browse Videos", subscription_plans_title: "Subscription Plans", 
            free_plan_title: "Free Plan", free_plan_price: "Free", free_feature_1: "Limited free videos", free_feature_2: "Low quality (SD)", free_feature_3: "With Ads", free_feature_4: "No downloads", start_free_btn: "Start Free", 
            standard_plan_title: "Standard Plan", standard_duration_6months: "/6 months", standard_feature_1: "Access to free videos", standard_feature_2: "Ad-free watching", standard_feature_3: "Paid videos not included", standard_feature_4: "No downloads",
            most_popular_badge: "Most Popular", pro_plan_title: "Pro Plan", monthly_text: "/month", pro_feature_1: "All videos (Free & Paid)", pro_feature_2: "High quality (HD/1080p)", pro_feature_3: "Ad-free watching", pro_feature_4: "Dedicated customer support", pro_feature_5: "No downloads", subscribe_now_btn: "Subscribe Now", 
            ultimate_plan_title: "Ultimate Plan", ultimate_feature_1: "All Pro features", ultimate_feature_2: "Ultra high quality (4K UHD)", ultimate_feature_3: "Unlimited downloads", ultimate_feature_4: "24/7 priority support", ultimate_feature_5: "Early access to new content", choose_ultimate_btn: "Choose Ultimate Plan",
            annual_plan_title: "Annual Plan", annually_text: "/year", annual_feature_1: "Everything! All Ultimate features", annual_feature_2: "Huge savings annually", annual_feature_3: "Top priority in everything", annual_feature_4: "Exclusive gifts & features", subscribe_annually_btn: "Subscribe Annually",
            settings_title: "Appearance & Language Settings", theme_label: "Appearance:", language_label: "Interface Language:", save_settings_btn: "Save Settings", 
            login_title_section: "Login", email_label: "Email", email_placeholder: "example@gmail.com", password_label: "Password", password_placeholder: "********", login_btn: "Login", no_account_text: "Don't have an account?", create_account_link: "Create a new account", 
            create_account_title: "Create New Account", username_label: "Username", username_placeholder: "e.g., user123 (lowercase & numbers only)", password_placeholder_strong: "Strong password", confirm_password_label: "Confirm Password", confirm_password_placeholder: "Re-enter password", create_account_btn: "Create Account", already_have_account_text: "Already have an account?", login_link_from_register: "Login", 
            password_warning_text: "Important: Password cannot be recovered if forgotten. Please save it securely or use a strong hint.", password_hint_label: "Password Hint (Optional)", password_hint_placeholder: "e.g., First pet's name",
            footer_text: "Arabic Siko Siko, coming soon.", 
            modal_title: "Exclusive Content!", modal_description_generic: "This video requires a premium subscription to access.", modal_feature_all_videos: "All videos (Free & Paid)", modal_feature_high_quality: "High quality up to 4K", modal_feature_no_ads: "No annoying ads", modal_feature_download: "Download content", subscribe_now_btn_modal: "Subscribe Now", see_all_plans_link: "See All Plans", 
            tag_free: "Free", tag_paid: "Paid", views_text: "views", watch_now_btn_text: "Watch Now", premium_access_btn_text: "Exclusive Access", 
            error_generic_ar: "An error occurred. Please try again.", error_generic_en: "An error occurred. Please try again.", error_loading_videos_ar: "Error loading videos. Please try again later.", error_loading_videos_en: "Error loading videos. Please try again later.", no_videos_ar: "No videos to display at the moment.", no_videos_en: "No videos to display at the moment.", password_mismatch_ar: "Passwords do not match.", password_mismatch_en: "Passwords do not match.", password_short_ar: "Password must be at least 6 characters long.", password_short_en: "Password must be at least 6 characters long.", error_logout_ar: "Error during logout.", error_logout_en: "Error during logout.", search_no_results_ar: "No search results found for '${query}'.", search_no_results_en: "No search results found for '${query}'.", settings_saved_ar: "Settings saved successfully!", settings_saved_en: "Settings saved successfully!", theme_toggle_light: "Switch to Light Theme", theme_toggle_dark: "Switch to Dark Theme", video_token_error_ar: "Error getting video viewing permission. Please try again.", video_token_error_en: "Error getting video viewing permission. Please try again.",
            invalid_username_format_ar: "اسم المستخدم يجب أن يحتوي على حروف إنجليزية صغيرة وأرقام فقط.", invalid_username_format_en: "Username must contain only lowercase English letters and numbers.", invalid_email_format_ar: "الرجاء إدخال بريد إلكتروني صالح ينتهي بـ @gmail.com.", invalid_email_format_en: "Please enter a valid email ending with @gmail.com.",
            manage_account_link: "My Account", manage_account_title: "Manage Account", current_username_label: "Current Username:", new_username_label: "New Username:", new_username_placeholder: "Leave blank to keep current", update_username_btn: "Update Username", change_password_title: "Change Password", current_password_label: "Current Password:", new_password_label: "New Password:", confirm_new_password_label: "Confirm New Password:", update_password_btn: "Update Password", logout_btn_text: "Logout",
            logout_confirm_title: "Confirm Logout", logout_confirm_message: "Are you sure you want to log out?", delete_account_btn_text: "Delete Account Permanently", delete_account_confirm_title: "Confirm Account Deletion", delete_account_warning: "Warning! This action is irreversible. All your data and subscription (if any) will be permanently deleted. You will not be able to recover your account.", delete_account_prompt_password: "To confirm deletion, please enter your current password:", delete_account_success: "Your account has been successfully deleted.", delete_account_failed: "Failed to delete account. Please check your password or try again later.", username_updated_success: "Username updated successfully.", password_updated_success: "Password updated successfully.", confirm_action: "Confirm", cancel_action: "Cancel", password_fields_required_ar: "Password fields required.", password_fields_required_en: "Password fields required.", password_required_for_delete_ar: "Password required for deletion.", password_required_for_delete_en: "Password required to confirm deletion.",
            account_overview_title: "Account Overview", my_plan_label: "My Plan:", edit_profile_btn: "Edit Profile", change_password_btn: "Change Password", danger_zone_title: "Danger Zone",
            plan_free: "Free", plan_standard: "Standard", plan_pro: "Pro", plan_ultimate: "Ultimate", plan_annual: "Annual",
            video_requires_plan_standard: "This video requires at least a Standard plan.",
            video_requires_plan_pro: "This video requires at least a Pro plan.",
            video_requires_plan_ultimate: "This video requires at least an Ultimate plan.",
            video_requires_plan_annual: "This video requires at least an Annual plan."
        },
        ar: {
            site_title: "SofagHub - سوفاج هاب", nav_home: "الرئيسية", nav_videos: "الفيديوهات", nav_subscriptions: "الاشتراكات", nav_settings: "الإعدادات", nav_login: "تسجيل الدخول", search_placeholder: "ابحث عن فيديوهات...", search_button_text: "بحث", welcome_title: "مرحباً بك في SofagHub!", site_subtitle_text: "موقع عربي مميز لمشاهدة السيكو سيكو العربي", suggested_for_you: "مقترحة لك", browse_videos_title: "تصفح الفيديوهات", subscription_plans_title: "خطط الاشتراك", 
            free_plan_title: "الخطة المجانية", free_plan_price: "مجاني", free_feature_1: "فيديوهات مجانية محدودة", free_feature_2: "جودة منخفضة (SD)", free_feature_3: "مع إعلانات", free_feature_4: "بدون تحميل", start_free_btn: "ابدأ مجاناً", 
            standard_plan_title: "الخطة القياسية", standard_duration_6months: "/6 أشهر", standard_feature_1: "ولوج للفيديوهات المجانية", standard_feature_2: "مشاهدة خالية من الإعلانات", standard_feature_3: "لا تشمل الفيديوهات المدفوعة", standard_feature_4: "بدون تحميل",
            most_popular_badge: "الأكثر شيوعاً", pro_plan_title: "الخطة برو", monthly_text: "/شهرياً", pro_feature_1: "ولوج لكل الفيديوهات (المجانية والمدفوعة)", pro_feature_2: "جودة عالية (HD/1080p)", pro_feature_3: "مشاهدة بدون إعلانات", pro_feature_4: "دعم عملاء مخصص", pro_feature_5: "بدون تحميل", subscribe_now_btn: "اشترك الآن", 
            ultimate_plan_title: "الخطة الفائقة", ultimate_feature_1: "جميع مزايا الخطة برو", ultimate_feature_2: "جودة فائقة (4K UHD)", ultimate_feature_3: "تحميل غير محدود للمحتوى", ultimate_feature_4: "دعم فني بأولوية قصوى 24/7", ultimate_feature_5: "وصول مبكر للمحتوى الجديد", choose_ultimate_btn: "اختر الخطة الفائقة",
            annual_plan_title: "الخطة السنوية", annually_text: "/سنوياً", annual_feature_1: "كل شيء! جميع ميزات الخطة الفائقة", annual_feature_2: "توفير كبير على مدار العام", annual_feature_3: "أولوية قصوى في كل شيء", annual_feature_4: "هدايا وميزات حصرية", subscribe_annually_btn: "اشترك سنوياً",
            settings_title: "إعدادات المظهر واللغة", theme_label: "المظهر:", language_label: "لغة الواجهة:", save_settings_btn: "حفظ الإعدادات", 
            login_title_section: "تسجيل الدخول", email_label: "البريد الإلكتروني", email_placeholder: "example@gmail.com", password_label: "كلمة المرور", password_placeholder: "********", login_btn: "تسجيل الدخول", no_account_text: "ليس لديك حساب؟", create_account_link: "أنشئ حساباً جديداً", 
            create_account_title: "إنشاء حساب جديد", username_label: "اسم المستخدم", username_placeholder: "مثال: user123 (حروف إنجليزية صغيرة وأرقام فقط)", password_placeholder_strong: "كلمة مرور قوية", confirm_password_label: "تأكيد كلمة المرور", confirm_password_placeholder: "أعد إدخال كلمة المرور", create_account_btn: "إنشاء حساب", already_have_account_text: "لديك حساب بالفعل؟", login_link_from_register: "سجل الدخول", 
            password_warning_text: "تنبيه هام: لا يمكن استعادة كلمة المرور إذا نسيتها. الرجاء حفظها في مكان آمن أو استخدام تلميح قوي لتذكرها.", password_hint_label: "تلميح كلمة المرور (اختياري)", password_hint_placeholder: "مثال: اسم أول حيوان أليف",
            footer_text: "سيكو سيكو عربي قريب.", 
            modal_title: "محتوى حصري!", modal_description_generic: "هذا الفيديو يتطلب اشتراكًا مميزًا للوصول إليه.", modal_feature_all_videos: "جميع الفيديوهات (مجانية ومدفوعة)", modal_feature_high_quality: "جودة عالية تصل إلى 4K", modal_feature_no_ads: "بدون إعلانات مزعجة", modal_feature_download: "تحميل المحتوى", subscribe_now_btn_modal: "الاشتراك الآن", see_all_plans_link: "مشاهدة جميع الخطط", 
            tag_free: "مجاني", tag_paid: "مدفوع", views_text: "مشاهدات", watch_now_btn_text: "شاهد الآن", premium_access_btn_text: "محتوى حصري", 
            error_generic_ar: "حدث خطأ. حاول مرة أخرى.", error_generic_en: "An error occurred. Please try again.", error_loading_videos_ar: "حدث خطأ أثناء تحميل الفيديوهات. حاول لاحقاً.", error_loading_videos_en: "Error loading videos. Please try again later.", no_videos_ar: "لا توجد فيديوهات لعرضها حاليًا.", no_videos_en: "No videos to display at the moment.", password_mismatch_ar: "كلمتا المرور غير متطابقتين.", password_mismatch_en: "Passwords do not match.", password_short_ar: "يجب أن تتكون كلمة المرور من 6 أحرف على الأقل.", password_short_en: "Password must be at least 6 characters long.", error_logout_ar: "حدث خطأ أثناء تسجيل الخروج.", error_logout_en: "Error during logout.", search_no_results_ar: "لا توجد نتائج بحث تطابق '${query}'.", search_no_results_en: "No search results found for '${query}'.", settings_saved_ar: "تم حفظ الإعدادات بنجاح!", settings_saved_en: "Settings saved successfully!", theme_toggle_light: "التبديل إلى المظهر الفاتح", theme_toggle_dark: "التبديل إلى المظهر الداكن", video_token_error_ar: "خطأ في الحصول على إذن مشاهدة الفيديو. حاول مرة أخرى.", video_token_error_en: "Error getting video viewing permission. Please try again.",
            invalid_username_format_ar: "اسم المستخدم يجب أن يحتوي على حروف إنجليزية صغيرة وأرقام فقط.", invalid_username_format_en: "Username must contain only lowercase English letters and numbers.", invalid_email_format_ar: "الرجاء إدخال بريد إلكتروني صالح ينتهي بـ @gmail.com.", invalid_email_format_en: "Please enter a valid email ending with @gmail.com.",
            manage_account_link: "حسابي", manage_account_title: "إدارة الحساب", current_username_label: "اسم المستخدم الحالي:", new_username_label: "اسم المستخدم الجديد:", new_username_placeholder: "اتركه فارغًا لعدم التغيير", update_username_btn: "تحديث اسم المستخدم", change_password_title: "تغيير كلمة المرور", current_password_label: "كلمة المرور الحالية:", new_password_label: "كلمة المرور الجديدة:", confirm_new_password_label: "تأكيد كلمة المرور الجديدة:", update_password_btn: "تحديث كلمة المرور", logout_btn_text: "تسجيل الخروج",
            logout_confirm_title: "تأكيد تسجيل الخروج", logout_confirm_message: "هل أنت متأكد أنك تريد تسجيل الخروج؟", delete_account_btn_text: "حذف الحساب نهائياً", delete_account_confirm_title: "تأكيد حذف الحساب", delete_account_warning: "تحذير! هذا الإجراء لا يمكن التراجع عنه. سيتم حذف جميع بياناتك واشتراكك (إن وجد) بشكل دائم. لن تتمكن من استعادة حسابك.", delete_account_prompt_password: "لتأكيد الحذف، يرجى إدخال كلمة المرور الحالية:", delete_account_success: "تم حذف حسابك بنجاح.", delete_account_failed: "فشل حذف الحساب. يرجى التحقق من كلمة المرور أو المحاولة مرة أخرى لاحقًا.", username_updated_success: "تم تحديث اسم المستخدم بنجاح.", password_updated_success: "تم تحديث كلمة المرور بنجاح.", confirm_action: "تأكيد", cancel_action: "إلغاء", password_fields_required_ar: "الرجاء ملء جميع حقول كلمة المرور.", password_fields_required_en: "Please fill all password fields.", password_required_for_delete_ar: "كلمة المرور مطلوبة لتأكيد الحذف.", password_required_for_delete_en: "Password required to confirm deletion.",
            account_overview_title: "نظرة عامة على الحساب", my_plan_label: "خطتي الحالية:", edit_profile_btn: "تعديل الملف الشخصي", change_password_btn: "تغيير كلمة المرور", danger_zone_title: "منطقة الخطر",
            plan_free: "مجانية", plan_standard: "القياسية", plan_pro: "برو", plan_ultimate: "الفائقة", plan_annual: "السنوية",
            video_requires_plan_standard: "هذا الفيديو يتطلب على الأقل الخطة القياسية.",
            video_requires_plan_pro: "هذا الفيديو يتطلب على الأقل الخطة برو.",
            video_requires_plan_ultimate: "هذا الفيديو يتطلب على الأقل الخطة الفائقة.",
            video_requires_plan_annual: "هذا الفيديو يتطلب على الأقل الخطة السنوية."
        }
    };
    let currentLang = localStorage.getItem('language') || 'ar';

    // --- HELPER FUNCTIONS ---
    function getTranslation(key, replacements = {}) {
        let translation = translations[currentLang]?.[key] || translations['en']?.[key] || `TR:${key}`;
        for (const placeholder in replacements) {
            translation = translation.replace(`\${${placeholder}}`, replacements[placeholder]);
        }
        return translation;
    }
    
    function showMessage(element, messageKey, isSuccess, duration = 5000, replacements = {}) {
        if (!element) return;
        const messageText = getTranslation(messageKey, replacements);
        element.textContent = messageText;
        const baseClass = element.id.includes('global') ? 'global-message' : 'auth-message';
        element.className = `${baseClass} ${isSuccess ? 'success' : 'error'}`;
        element.style.display = 'block';
        if (duration > 0) {
            setTimeout(() => { if(element) element.style.display = 'none'; }, duration);
        }
    }

    // --- CORE LOGIC ---
    const planHierarchy = { 'free': 0, 'standard': 1, 'pro': 2, 'ultimate': 3, 'annual': 4 };

    function canUserAccessVideo(videoType, userPlan) {
        const userPlanLevel = planHierarchy[userPlan || 'free'];
        const requiredVideoPlanLevel = planHierarchy[videoType] || 0;
        return userPlanLevel >= requiredVideoPlanLevel;
    }

    async function openVideoPlayer(video) {
        if (!videoPlayerModal || !mainVideoPlayer || !videoPlayerTitle) return;

        if (!canUserAccessVideo(video.type, currentUserData ? currentUserData.plan : 'free')) {
            let requiredPlanKey;
            switch(video.type) {
                case 'standard': requiredPlanKey = 'video_requires_plan_standard'; break;
                case 'pro': requiredPlanKey = 'video_requires_plan_pro'; break;
                case 'ultimate': requiredPlanKey = 'video_requires_plan_ultimate'; break;
                case 'annual': requiredPlanKey = 'video_requires_plan_annual'; break;
                default: requiredPlanKey = 'modal_description_generic'; 
            }
            const modalDescriptionElement = premiumModal.querySelector('p[data-translate="modal_description_generic"]');
            if(modalDescriptionElement) {
                 modalDescriptionElement.textContent = getTranslation(requiredPlanKey);
            }
            openPremiumModal();
            return;
        }

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
            showMessage(globalMessageDiv, 'video_token_error_ar', false);
        }
    }
    
    function closeVideoPlayer() {
        if (!videoPlayerModal || !mainVideoPlayer) return;
        mainVideoPlayer.pause(); mainVideoPlayer.src = "";
        videoPlayerModal.style.display = 'none'; body.style.overflow = '';
    }

    function createVideoCard(video) {
        const lang = currentLang;
        const card = document.createElement('div');
        card.className = 'video-card'; card.dataset.type = video.type; card.dataset.videoId = video.id;
        
        const isPaidVideo = video.type !== 'free';
        const tagText = isPaidVideo ? getTranslation('tag_paid') : getTranslation('tag_free');
        const tagClass = isPaidVideo ? 'paid-tag-overlay' : 'free-tag-overlay';

        let thumbnailUrl = video.thumbnail;
        if (thumbnailUrl && !thumbnailUrl.startsWith('/') && !thumbnailUrl.startsWith('http')) thumbnailUrl = `/${thumbnailUrl}`;
        
        const canAccess = canUserAccessVideo(video.type, currentUserData ? currentUserData.plan : 'free');
        const buttonTextKey = canAccess ? 'watch_now_btn_text' : 'premium_access_btn_text';
        
        let buttonClass = 'watch-now-btn';
        if (isPaidVideo && !canAccess) buttonClass = 'premium-access-btn';

        card.innerHTML = `
            <div class="video-thumbnail ${isPaidVideo && !canAccess ? 'premium-video-placeholder-thumb' : ''}">
                <span class="video-type-tag ${tagClass}">${tagText}</span>
                <img src="${thumbnailUrl || 'images/placeholder.png'}" alt="${(video.altText?.[lang]) || video.title[lang]}" loading="lazy">
                <div class="play-overlay"><svg viewBox="0 0 24 24"><path fill="currentColor" d="M8,5.14V19.14L19,12.14L8,5.14Z" /></svg></div>
            </div>
            <div class="video-info">
                <h4 class="video-title">${video.title[lang]}</h4>
                <p class="video-meta"><span>${video.views[lang]} ${getTranslation('views_text')}</span></p>
                <p class="video-description">${video.description[lang]}</p>
                <button class="${buttonClass}" data-translate="${buttonTextKey}">${getTranslation(buttonTextKey)}</button>
            </div>`;
        const actionTrigger = card.querySelector('.video-thumbnail, .watch-now-btn, .premium-access-btn');
        if (actionTrigger) {
            actionTrigger.addEventListener('click', (e) => {
                e.preventDefault();
                openVideoPlayer(video); 
            });
        }
        return card;
    }

    async function fetchAndPopulateVideos() {
        try {
            const response = await fetch('/api/videos');
            if (!response.ok) throw new Error('error_loading_videos_ar');
            allVideosData = await response.json();
            
            // Re-render videos with current auth state
            updateVideoRenders();

        } catch (error) {
            console.error("Error fetching/populating videos:", error);
            const errorKey = error.message === 'error_loading_videos_ar' ? error.message : 'error_loading_videos_ar';
            if (document.getElementById('videoGridContainer')) document.getElementById('videoGridContainer').innerHTML = `<p class="no-results-message">${getTranslation(errorKey)}</p>`;
        }
    }
    
    function updateVideoRenders() {
        const suggestedContainer = document.getElementById('suggestedVideosContainer');
        const gridContainer = document.getElementById('videoGridContainer');

        if (suggestedContainer) {
            suggestedContainer.innerHTML = '';
            allVideosData.filter(v => v.isSuggested).forEach(video => suggestedContainer.appendChild(createVideoCard(video)));
        }
        if (gridContainer) {
            gridContainer.innerHTML = '';
            if (allVideosData.length > 0) allVideosData.forEach(video => gridContainer.appendChild(createVideoCard(video)));
            else gridContainer.innerHTML = `<p class="no-results-message">${getTranslation('no_videos_ar')}</p>`;
        }
    }

    function setActiveSection(sectionId, fromLinkClick = true, updateUrl = true) {
        contentSections.forEach(section => section.classList.remove('active'));
        const targetSection = document.getElementById(sectionId);
        if (targetSection) {
            targetSection.classList.add('active');
            if (updateUrl && fromLinkClick) window.location.hash = sectionId;

            if (sectionId === 'login-section') {
                if (loginForm) loginForm.style.display = 'block';
                if (registerForm) registerForm.style.display = 'none';
                if (authMessageDiv) authMessageDiv.style.display = 'none';
                if (loginFormTitleEl) loginFormTitleEl.style.display = 'block';
                if (registerFormTitleEl) registerFormTitleEl.style.display = 'none';
            }
        }

        navLinks.forEach(link => {
            link.classList.remove('active');
            if (link.dataset.sectionTarget === sectionId) {
                link.classList.add('active');
            }
        });
        
        if (fromLinkClick) {
            const mainContentArea = document.querySelector('main');
            const headerHeight = document.querySelector('header')?.offsetHeight || 80;
            if (mainContentArea && window.scrollY > (mainContentArea.offsetTop - headerHeight - 10) ) {
                 window.scrollTo({ top: (mainContentArea.offsetTop - headerHeight - 10), behavior: 'smooth' });
            }
        }
    }

    function applyTheme(theme) {
        if (theme === 'dark') body.classList.add('dark-theme');
        else body.classList.remove('dark-theme');
        if (themeToggleBtn) {
            themeToggleBtn.setAttribute('data-theme', theme);
            themeToggleBtn.setAttribute('aria-label', getTranslation(theme === 'dark' ? 'theme_toggle_light' : 'theme_toggle_dark'));
        }
    }

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
    }

    // --- AUTHENTICATION & UI UPDATES ---
    function renderAccountPage(userData) {
        if (!userData || !accountPageWrapper) return;

        // Set overview data
        if(accountOverviewUsername) accountOverviewUsername.textContent = userData.username;
        if(accountOverviewEmail) accountOverviewEmail.textContent = userData.email;
        if(accountOverviewPlan) accountOverviewPlan.textContent = getTranslation(`plan_${userData.plan}`);

        // Style page based on plan
        const planClass = `plan-${userData.plan}`;
        accountPageWrapper.className = `content-section ${planClass}`; // Remove previous plan classes
        if(document.getElementById(accountPageWrapper.id)?.classList.contains('active')) {
            accountPageWrapper.classList.add('active');
        }


        // Set form defaults
        if (currentUsernameDisplay) currentUsernameDisplay.value = userData.username;
        if (newUsernameInput) newUsernameInput.value = '';
        if(currentPasswordInput) currentPasswordInput.value = '';
        if(newPasswordInput) newPasswordInput.value = '';
        if(confirmNewPasswordInput) confirmNewPasswordInput.value = '';
        
        // Hide forms initially
        if(updateUsernameForm) updateUsernameForm.style.display = 'none';
        if(updatePasswordForm) updatePasswordForm.style.display = 'none';
    }

    function updateAuthUI(isLoggedIn, userData = null) {
        currentUserData = isLoggedIn ? userData : null;
        
        if (isLoggedIn && userData) {
            localStorage.setItem('currentUser', JSON.stringify(userData));
            if (headerLoginBtn) headerLoginBtn.style.display = 'none';
            if (headerAccountBtn) headerAccountBtn.style.display = 'inline-block';
            renderAccountPage(userData);
        } else {
            localStorage.removeItem('currentUser');
            if (headerLoginBtn) headerLoginBtn.style.display = 'inline-block';
            if (headerAccountBtn) headerAccountBtn.style.display = 'none';
        }
        
        // Always refresh video renders as permissions might have changed
        updateVideoRenders();
    }
    
    async function checkAuthState() {
        // Optimistic UI update from localStorage
        const storedUser = localStorage.getItem('currentUser');
        if (storedUser) {
            try {
                const user = JSON.parse(storedUser);
                updateAuthUI(true, user);
            } catch (e) {
                localStorage.removeItem('currentUser');
                updateAuthUI(false);
            }
        }

        // Verify with server
        try {
            const response = await fetch('/api/check-auth'); 
            const data = await response.json();
            updateAuthUI(data.loggedIn, data.user);
        } catch (error) { 
            console.error('Error checking auth state with server:', error); 
            // If server check fails but we have local data, we might be offline.
            // The optimistic UI remains. If it was a real auth error, the next API call will fail.
            if (!storedUser) {
                updateAuthUI(false);
            }
        }
    }
    
    async function handleLogout() {
        const confirmLogout = confirm(getTranslation('logout_confirm_message'));
        if (confirmLogout) {
            try {
                await fetch('/api/logout');
                updateAuthUI(false);
                setActiveSection('home-section', true, true);
                showMessage(globalMessageDiv, 'logout_success', true);
            } catch (error) {
                showMessage(globalMessageDiv, 'error_logout_ar', false);
            }
        }
    }

    async function handleDeleteAccount() {
        const confirmWarning = confirm(getTranslation('delete_account_warning'));
        if (!confirmWarning) return;

        const password = prompt(getTranslation('delete_account_prompt_password'));
        if (password === null) return; // User clicked cancel
        if (!password) {
            showMessage(manageAccountMessageDiv, 'password_required_for_delete_ar', false);
            return;
        }

        try {
            const response = await fetch('/api/account/delete', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ password })
            });
            const data = await response.json();
            if (data.success) {
                alert(getTranslation('delete_account_success'));
                updateAuthUI(false);
                window.location.hash = 'home-section';
                window.location.reload(); // Force a full refresh
            } else {
                showMessage(manageAccountMessageDiv, data.messageKey || 'delete_account_failed', false);
            }
        } catch (error) {
            showMessage(manageAccountMessageDiv, 'delete_account_failed', false);
        }
    }

    // --- EVENT LISTENERS ---

    // Navigation & Routing
    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const sectionId = link.dataset.sectionTarget;
            if (sectionId) {
                setActiveSection(sectionId, true, true);
                if (sectionId === 'manage-account-section' && currentUserData) {
                    renderAccountPage(currentUserData);
                }
            }
        });
    });
    
    window.addEventListener('hashchange', () => {
        const hash = window.location.hash.substring(1);
        const sectionId = hash.split('?')[0]; 
        if (sectionId && document.getElementById(sectionId)) {
            setActiveSection(sectionId, false, false); 
        } else if (!sectionId) {
            setActiveSection('home-section', false, false); 
        }
    });

    // Theme & Language
    if (themeToggleBtn) themeToggleBtn.addEventListener('click', () => {
        const newTheme = body.classList.contains('dark-theme') ? 'light' : 'dark';
        localStorage.setItem('theme', newTheme); applyTheme(newTheme);
    });
    if (languageSelect) {
        languageSelect.value = currentLang;
        languageSelect.addEventListener('change', function () { setLanguage(this.value); });
    }
    if (saveAppearanceSettingsBtn) {
        saveAppearanceSettingsBtn.addEventListener('click', (e) => {
            e.preventDefault();
            showMessage(globalMessageDiv, 'settings_saved_ar', true);
        });
    }

    // Auth Form Switching
    if (switchToRegisterLink && switchToLoginLink && loginForm && registerForm) {
        switchToRegisterLink.addEventListener('click', (e) => {
            e.preventDefault();
            loginForm.style.display = 'none';
            registerForm.style.display = 'block';
            if (authMessageDiv) authMessageDiv.style.display = 'none';
            if(loginFormTitleEl) loginFormTitleEl.style.display = 'none';
            if(registerFormTitleEl) registerFormTitleEl.style.display = 'block';
        });
        switchToLoginLink.addEventListener('click', (e) => {
            e.preventDefault();
            registerForm.style.display = 'none';
            loginForm.style.display = 'block';
            if (authMessageDiv) authMessageDiv.style.display = 'none';
            if(loginFormTitleEl) loginFormTitleEl.style.display = 'block';
            if(registerFormTitleEl) registerFormTitleEl.style.display = 'none';
        });
    }

    // Registration Form
    if (registerForm) {
        registerForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const username = document.getElementById('registerUsername').value;
            const email = document.getElementById('registerEmail').value;
            const password = document.getElementById('registerPassword').value;
            const confirmPassword = document.getElementById('registerConfirmPassword').value;
            const hint = document.getElementById('registerHint').value;

            // Client-side validation
            const usernameRegex = /^[a-z0-9]+$/;
            if (!usernameRegex.test(username)) {
                showMessage(authMessageDiv, 'invalid_username_format_ar', false); return;
            }
            if (!email.toLowerCase().endsWith('@gmail.com')) {
                showMessage(authMessageDiv, 'invalid_email_format_ar', false); return;
            }
            if (password !== confirmPassword) { showMessage(authMessageDiv, 'password_mismatch_ar', false); return; }
            if (password.length < 6) { showMessage(authMessageDiv, 'password_short_ar', false); return; }

            try {
                const response = await fetch('/api/register', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username, email, password, hint }) });
                const data = await response.json();
                showMessage(authMessageDiv, data.messageKey || (data.success ? 'registration_success' : 'registration_failed'), data.success, 5000, data.replacements || {}); 
                if (data.success && data.user) {
                    updateAuthUI(true, data.user);
                    setTimeout(() => {
                        setActiveSection('home-section', true, true);
                        registerForm.reset(); 
                    }, 1500);
                }
            } catch (error) { showMessage(authMessageDiv, 'error_generic_ar', false); }
        });
    }
    
    // Login Form
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = document.getElementById('loginEmail').value;
            const password = document.getElementById('loginPassword').value;
            try {
                const response = await fetch('/api/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password }) });
                const data = await response.json();
                showMessage(authMessageDiv, data.messageKey || (data.success ? 'login_success' : 'login_failed'), data.success, 5000, data.replacements || {}); 
                if (data.success && data.user) {
                    updateAuthUI(true, data.user);
                    setTimeout(() => {
                        setActiveSection('home-section', true, true);
                        loginForm.reset();
                    }, 1500);
                }
            } catch (error) { showMessage(authMessageDiv, 'error_generic_ar', false); }
        });
    }
    
    // Account Management
    if(showUpdateUsernameBtn) showUpdateUsernameBtn.addEventListener('click', () => {
        if(updateUsernameForm) updateUsernameForm.style.display = updateUsernameForm.style.display === 'none' ? 'block' : 'none';
    });
    if(showUpdatePasswordBtn) showUpdatePasswordBtn.addEventListener('click', () => {
        if(updatePasswordForm) updatePasswordForm.style.display = updatePasswordForm.style.display === 'none' ? 'block' : 'none';
    });
    if (updateUsernameBtn && newUsernameInput) {
        updateUsernameBtn.addEventListener('click', async () => {
            const newUsername = newUsernameInput.value.trim();
            if (!newUsername) return; 
            try {
                const response = await fetch('/api/account/update-username', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ newUsername }) });
                const data = await response.json();
                showMessage(manageAccountMessageDiv, data.messageKey || 'error_generic_ar', data.success, 5000, data.replacements || {});
                if (data.success) {
                    newUsernameInput.value = '';
                    await checkAuthState(); // Re-fetch user data to update everywhere
                    if (updateUsernameForm) updateUsernameForm.style.display = 'none';
                }
            } catch (error) { showMessage(manageAccountMessageDiv, 'error_generic_ar', false); }
        });
    }
    if (updatePasswordBtn && currentPasswordInput && newPasswordInput && confirmNewPasswordInput) {
        updatePasswordBtn.addEventListener('click', async () => {
            const currentPassword = currentPasswordInput.value; const newPassword = newPasswordInput.value; const confirmNewPassword = confirmNewPasswordInput.value;
            if (!currentPassword || !newPassword || !confirmNewPassword) { showMessage(manageAccountMessageDiv, 'password_fields_required_ar', false); return; }
            if (newPassword.length < 6) { showMessage(manageAccountMessageDiv, 'password_short_ar', false); return; }
            if (newPassword !== confirmNewPassword) { showMessage(manageAccountMessageDiv, 'password_mismatch_ar', false); return; }
            try {
                const response = await fetch('/api/account/update-password', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ currentPassword, newPassword }) });
                const data = await response.json();
                showMessage(manageAccountMessageDiv, data.messageKey || 'error_generic_ar', data.success);
                if (data.success) { 
                    currentPasswordInput.value = ''; newPasswordInput.value = ''; confirmNewPasswordInput.value = '';
                    if (updatePasswordForm) updatePasswordForm.style.display = 'none';
                }
            } catch (error) { showMessage(manageAccountMessageDiv, 'error_generic_ar', false); }
        });
    }
    if(logoutBtn) logoutBtn.addEventListener('click', handleLogout);
    if(deleteAccountBtn) deleteAccountBtn.addEventListener('click', handleDeleteAccount);

    // Search
    const searchButton = document.getElementById('searchButton');
    const searchInput = document.getElementById('searchInput');
    if (searchButton && searchInput) {
        const performSearch = () => {
            const query = searchInput.value.trim().toLowerCase();
            setActiveSection('videos-section', true, true); 
            const videoGridContainer = document.getElementById('videoGridContainer');
            if (!videoGridContainer) return;
            
            videoGridContainer.innerHTML = '';
            let found = false;
            
            const filteredVideos = allVideosData.filter(videoData => {
                if (!query) return true; // Show all if query is empty
                const title = (videoData.title[currentLang] || videoData.title['ar'] || '').toLowerCase();
                const description = (videoData.description[currentLang] || videoData.description['ar'] || '').toLowerCase();
                return title.includes(query) || description.includes(query) || videoData.id.toLowerCase().includes(query);
            });

            if (filteredVideos.length > 0) {
                filteredVideos.forEach(video => videoGridContainer.appendChild(createVideoCard(video)));
                found = true;
            }

            if (!found && query) {
                const noResultsEl = document.createElement('p');
                noResultsEl.className = 'no-results-message';
                noResultsEl.textContent = getTranslation('search_no_results_ar', { query: searchInput.value.trim() });
                videoGridContainer.appendChild(noResultsEl);
            } else if (!found && !query && allVideosData.length === 0) {
                 videoGridContainer.innerHTML = `<p class="no-results-message">${getTranslation('no_videos_ar')}</p>`;
            }
        };
        searchButton.addEventListener('click', performSearch);
        searchInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') { e.preventDefault(); performSearch(); }});
        searchInput.addEventListener('input', () => { if (searchInput.value.trim() === '') performSearch(); }); 
    }

    // Modals
    const closeModalBtn = premiumModal?.querySelector('.close-modal-btn');
    const modalSubscribeBtn = document.getElementById('modalSubscribeBtn');
    const modalSeePlansBtn = document.getElementById('modalSeePlansBtn');
    function openPremiumModal() { if (premiumModal) premiumModal.style.display = 'flex'; body.style.overflow = 'hidden';}
    function closePremiumModal() { if (premiumModal) premiumModal.style.display = 'none'; body.style.overflow = '';}
    if (closeModalBtn) closeModalBtn.addEventListener('click', closePremiumModal);
    if (modalSubscribeBtn) modalSubscribeBtn.addEventListener('click', () => { closePremiumModal(); setActiveSection('subscription-section', true, true); });
    if (modalSeePlansBtn) modalSeePlansBtn.addEventListener('click', (e) => { e.preventDefault(); closePremiumModal(); setActiveSection('subscription-section', true, true); });
    if (premiumModal) premiumModal.addEventListener('click', (event) => { if (event.target === premiumModal) closePremiumModal(); });
    if (closeVideoPlayerModalBtn) closeVideoPlayerModalBtn.addEventListener('click', closeVideoPlayer);
    if (videoPlayerModal) videoPlayerModal.addEventListener('click', (event) => { if (event.target === videoPlayerModal) closeVideoPlayer(); });
    document.addEventListener('keydown', (event) => {
        if (event.key === "Escape") {
            if (videoPlayerModal?.style.display === 'flex') closeVideoPlayer();
            if (premiumModal?.style.display === 'flex') closePremiumModal();
        }
    });
    
    // --- INITIALIZATION ---
    async function initializePage() {
        applyTheme(localStorage.getItem('theme') || 'light'); 
        await checkAuthState(); 
        setLanguage(currentLang); 
        
        let initialSectionId = 'home-section';
        const hash = window.location.hash.substring(1);
        const sectionIdFromHash = hash.split('?')[0];

        const isLoggedIn = currentUserData !== null;

        if (sectionIdFromHash && document.getElementById(sectionIdFromHash)) { 
            // Don't show login page if already logged in
            if (!(sectionIdFromHash === 'login-section' && isLoggedIn)) {
                initialSectionId = sectionIdFromHash;
            }
        }
        
        setActiveSection(initialSectionId, false, true); 
        if(!window.location.hash || window.location.hash === '#') {
            window.history.replaceState(null, null, '#home-section');
        }

        console.log("SofagHub Initialized.");
    }

    initializePage();
});
