const express = require('express');
const fs = require('fs-extra');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs'); 
const session = require('express-session');
const cookieParser = require('cookie-parser');
const { Telegraf, Markup } = require('telegraf');
const axios = require('axios');
const crypto = require('crypto');

const app = express();
const PORT = process.env.PORT || 8080;
const BOT_TOKEN = "7441862651:AAFGYKjv1TrPgNss8VgcxeSqUR8R_XoajAs";
const YOUR_ADMIN_TELEGRAM_ID = 6988696258;

console.log('Server.js: Starting up...');
const videoTokensStore = new Map();

const dbPath = path.join(__dirname, 'users.db');
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Database connection error:', err.message);
        process.exit(1);
    } else {
        console.log('Successfully connected to SQLite database (users.db).');
        db.serialize(() => {
            db.run(`CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                username TEXT UNIQUE NOT NULL,
                email TEXT UNIQUE NOT NULL,
                password_hash TEXT NOT NULL,
                hint TEXT,
                plan TEXT DEFAULT 'free',
                plan_start_date DATETIME,
                plan_expiry_date DATETIME 
            )`, (errDb) => {
                if (errDb) console.error("Error creating users table:", errDb.message);
            });

            db.run(`CREATE TABLE IF NOT EXISTS videos (
                id TEXT PRIMARY KEY, 
                title_ar TEXT, title_en TEXT, 
                thumbnail_path TEXT,
                alt_text_ar TEXT, alt_text_en TEXT, 
                views_ar TEXT DEFAULT '0', views_en TEXT DEFAULT '0', 
                type TEXT DEFAULT 'free',
                description_ar TEXT, description_en TEXT, 
                is_suggested INTEGER DEFAULT 0, 
                video_file_path TEXT,
                uploaded_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )`, (errDb) => {
                if (errDb) console.error("Error creating videos table:", errDb.message);
            });
        });
    }
});

const videosBaseDir = path.join(__dirname, 'videos_data');
const videoFilesDir = path.join(videosBaseDir, 'files');
const videoThumbnailsDir = path.join(videosBaseDir, 'thumbnails');
fs.ensureDirSync(videoFilesDir);
fs.ensureDirSync(videoThumbnailsDir);

app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(session({
    name: 'sofaghub.sid', 
    secret: process.env.SESSION_SECRET || 'a_much_more_secure_and_random_secret_key_for_sofaghub_!@#$', 
    resave: false, 
    saveUninitialized: false, 
    cookie: { 
        secure: process.env.NODE_ENV === 'production',
        httpOnly: true, 
        maxAge: 7 * 24 * 60 * 60 * 1000, 
        sameSite: 'lax' 
    }
}));

console.log('Server.js: Basic middlewares configured.');
app.use('/images', express.static(path.join(__dirname, 'images')));
app.use('/videos_data/thumbnails', express.static(videoThumbnailsDir));
app.use(express.static(__dirname));

function ensureAuthenticated(req, res, next) {
    if (req.session && req.session.userId) {
        return next();
    }
    res.status(401).json({ success: false, messageKey: 'auth_required' });
}

const planDetailsMap = {
    free: { name: 'الخطة المجانية', durationMonths: null },
    standard: { name: 'الخطة القياسية', durationMonths: 6 },
    pro: { name: 'الخطة برو', durationMonths: 1 },
    ultimate: { name: 'الخطة الفائقة', durationMonths: 1 },
    annual: { name: 'الخطة السنوية', durationMonths: 12 }
};

app.post('/api/register', async (req, res) => {
    const { username, email, password } = req.body;
    if (!username || !email || !password) return res.status(400).json({ success: false, messageKey: 'fill_all_fields' });

    // Stricter validation
    const usernameRegex = /^[a-z0-9]+$/;
    if (!usernameRegex.test(username)) {
        return res.status(400).json({ success: false, messageKey: 'invalid_username_format_ar' });
    }
    if (!email.toLowerCase().endsWith('@gmail.com')) {
        return res.status(400).json({ success: false, messageKey: 'invalid_email_format_ar' });
    }
    if (password.length < 6) return res.status(400).json({ success: false, messageKey: 'password_short_ar' });

    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        const sql = `INSERT INTO users (username, email, password_hash, plan) VALUES (?, ?, ?, 'free')`;
        db.run(sql, [username, email, hashedPassword], function (err) {
            if (err) {
                let messageKey = 'registration_failed';
                if (err.message.includes('UNIQUE constraint failed')) {
                    messageKey = err.message.includes('email') ? 'email_exists' : 'username_exists';
                }
                console.error("[API /api/register] SQL Error:", err.message);
                return res.status(409).json({ success: false, messageKey });
            }
            const userId = this.lastID;
            const newUser = { id: userId, username, email, plan: 'free' };
            
            req.session.regenerate(function(regenErr) { 
                if (regenErr) console.error("Session regeneration error after register:", regenErr);
                req.session.userId = userId;
                req.session.username = username;
                req.session.userPlan = 'free';
                req.session.userEmail = email;
                console.log('[API /api/register] User registered:', username, 'Plan: free');
                res.status(201).json({ success: true, messageKey: 'registration_success', user: newUser });
            });
        });
    } catch (error) {
        console.error("[API /api/register] Catch Error:", error);
        res.status(500).json({ success: false, messageKey: 'error_generic_ar' });
    }
});

app.post('/api/login', (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ success: false, messageKey: 'email_password_required' });
    const sql = `SELECT id, username, email, password_hash, plan, plan_expiry_date FROM users WHERE email = ?`;
    db.get(sql, [email], async (err, user) => {
        if (err) {
            console.error("[API /api/login] SQL Error:", err.message);
            return res.status(500).json({ success: false, messageKey: 'error_generic_ar' });
        }
        if (!user) return res.status(401).json({ success: false, messageKey: 'invalid_credentials' });
        
        const passwordMatch = await bcrypt.compare(password, user.password_hash);
        if (!passwordMatch) return res.status(401).json({ success: false, messageKey: 'invalid_credentials' });

        let currentPlan = user.plan;
        if (user.plan !== 'free' && user.plan_expiry_date && new Date(user.plan_expiry_date) < new Date()) {
            currentPlan = 'free';
            db.run("UPDATE users SET plan = 'free', plan_start_date = NULL, plan_expiry_date = NULL WHERE id = ?", [user.id]);
        }
        
        const userData = { id: user.id, username: user.username, email: user.email, plan: currentPlan };

        req.session.regenerate(function(regenErr) {
            if (regenErr) {
                console.error("Session regeneration error:", regenErr);
                return res.status(500).json({ success: false, messageKey: 'session_error' });
            }
            req.session.userId = user.id;
            req.session.username = user.username;
            req.session.userPlan = currentPlan;
            req.session.userEmail = user.email;
            console.log('[API /api/login] User logged in:', user.username, 'Plan:', currentPlan);
            res.json({ success: true, messageKey: 'login_success', user: userData });
        });
    });
});

app.get('/api/logout', (req, res) => {
    if (req.session) {
        req.session.destroy(err => {
            if (err) {
                return res.status(500).json({ success: false, messageKey: 'logout_failed' });
            }
            res.clearCookie('sofaghub.sid');
            res.json({ success: true, messageKey: 'logout_success' });
        });
    } else {
        res.json({ success: true, messageKey: 'no_active_session' });
    }
});

app.get('/api/check-auth', (req, res) => {
    if (req.session && req.session.userId) {
        db.get("SELECT username, email, plan, plan_expiry_date FROM users WHERE id = ?", [req.session.userId], (err, user) => {
            if (err || !user) {
                req.session.destroy(() => { res.clearCookie('sofaghub.sid'); res.json({ loggedIn: false }); });
                return;
            }
            
            let currentPlan = user.plan;
            if (user.plan !== 'free' && user.plan_expiry_date && new Date(user.plan_expiry_date) < new Date()) {
                currentPlan = 'free';
                db.run("UPDATE users SET plan = 'free', plan_start_date = NULL, plan_expiry_date = NULL WHERE id = ?", [req.session.userId]);
            }
            
            req.session.userPlan = currentPlan;
            req.session.username = user.username;
            req.session.userEmail = user.email;

            res.json({ loggedIn: true, user: { username: user.username, email: user.email, plan: currentPlan } });
        });
    } else {
        res.json({ loggedIn: false });
    }
});

app.post('/api/account/update-username', ensureAuthenticated, async (req, res) => {
    const { newUsername } = req.body;
    const userId = req.session.userId;
    const usernameRegex = /^[a-z0-9]+$/;
    if (!newUsername || !usernameRegex.test(newUsername)) return res.status(400).json({ success: false, messageKey: "invalid_username_format_ar" });
    
    db.get(`SELECT id FROM users WHERE username = ? AND id != ?`, [newUsername, userId], (err, existingUser) => {
        if (err) return res.status(500).json({ success: false, messageKey: "error_generic_ar" });
        if (existingUser) return res.status(409).json({ success: false, messageKey: "username_exists" });
        
        db.run(`UPDATE users SET username = ? WHERE id = ?`, [newUsername, userId], function(updateErr) {
            if (updateErr) return res.status(500).json({ success: false, messageKey: "username_update_failed" });
            req.session.username = newUsername;
            res.json({ success: true, messageKey: "username_updated_success" });
        });
    });
});

app.post('/api/account/update-password', ensureAuthenticated, async (req, res) => {
    const { currentPassword, newPassword } = req.body;
    const userId = req.session.userId;
    if (!currentPassword || !newPassword) return res.status(400).json({ success: false, messageKey: "password_fields_required_ar" });
    if (newPassword.length < 6) return res.status(400).json({ success: false, messageKey: "password_short_ar" });

    db.get(`SELECT password_hash FROM users WHERE id = ?`, [userId], async (err, user) => {
        if (err || !user) return res.status(500).json({ success: false, messageKey: "user_data_fetch_error" });
        const currentPasswordMatch = await bcrypt.compare(currentPassword, user.password_hash);
        if (!currentPasswordMatch) return res.status(401).json({ success: false, messageKey: "current_password_incorrect" });
        
        const newHashedPassword = await bcrypt.hash(newPassword, 10);
        db.run(`UPDATE users SET password_hash = ? WHERE id = ?`, [newHashedPassword, userId], function(updateErr) {
            if (updateErr) return res.status(500).json({ success: false, messageKey: "password_update_failed" });
            res.json({ success: true, messageKey: "password_updated_success" });
        });
    });
});

app.post('/api/account/delete', ensureAuthenticated, async (req, res) => {
    const { password } = req.body;
    const userId = req.session.userId;
    if (!password) return res.status(400).json({ success: false, messageKey: "password_required_for_delete_ar" });
    
    db.get(`SELECT password_hash FROM users WHERE id = ?`, [userId], async (err, user) => {
        if (err || !user) return res.status(500).json({ success: false, messageKey: "user_data_fetch_error" });
        const passwordMatch = await bcrypt.compare(password, user.password_hash);
        if (!passwordMatch) return res.status(401).json({ success: false, messageKey: "delete_account_failed_password" });
        
        db.run(`DELETE FROM users WHERE id = ?`, [userId], function(deleteErr) {
            if (deleteErr) return res.status(500).json({ success: false, messageKey: "delete_account_failed" });
            req.session.destroy(sessionErr => {
                res.clearCookie('sofaghub.sid');
                res.json({ success: true, messageKey: "delete_account_success" });
            });
        });
    });
});

app.get('/api/videos', (req, res) => {
    const sql = `SELECT id, title_ar, title_en, thumbnail_path, alt_text_ar, alt_text_en, views_ar, views_en, type, description_ar, description_en, is_suggested FROM videos ORDER BY uploaded_at DESC`;
    db.all(sql, [], (err, rows) => {
        if (err) return res.status(500).json({ success: false, messageKey: 'error_loading_videos_ar' });
        const videosData = rows.map(row => ({
            id: row.id,
            title: { ar: row.title_ar, en: row.title_en },
            thumbnail: row.thumbnail_path,
            altText: { ar: row.alt_text_ar, en: row.alt_text_en },
            views: { ar: row.views_ar, en: row.views_en },
            type: row.type || 'free',
            description: { ar: row.description_ar, en: row.description_en },
            isSuggested: row.is_suggested === 1,
        }));
        res.json(videosData);
    });
});

app.post('/api/request-video-token/:videoId', (req, res) => {
    const videoId = req.params.videoId;
    db.get(`SELECT type FROM videos WHERE id = ?`, [videoId], (err, video) => {
        if (err || !video) return res.status(404).json({ success: false, messageKey: "video_not_found" });

        const planHierarchy = { 'free': 0, 'standard': 1, 'pro': 2, 'ultimate': 3, 'annual': 4 };
        const userPlan = (req.session && req.session.userPlan) ? req.session.userPlan : 'free';
        
        if (planHierarchy[userPlan] < planHierarchy[video.type]) {
            return res.status(403).json({ success: false, messageKey: `video_requires_plan_${video.type}` });
        }

        const token = crypto.randomBytes(16).toString('hex');
        const expiresAt = Date.now() + (15 * 60 * 1000); // 15 mins
        videoTokensStore.set(token, { videoId, expiresAt, sessionId: req.sessionID });
        res.json({ success: true, token });
    });
});

app.get('/api/video-stream/:videoId', (req, res) => {
    const { videoId } = req.params;
    const { token } = req.query;
    if (!token) return res.status(401).send("Access token required.");
    const tokenData = videoTokensStore.get(token);

    if (!tokenData || tokenData.videoId !== videoId || Date.now() > tokenData.expiresAt || tokenData.sessionId !== req.sessionID) {
        if(tokenData && Date.now() > tokenData.expiresAt) videoTokensStore.delete(token);
        return res.status(403).send("Invalid or expired access token.");
    }
    
    db.get(`SELECT video_file_path FROM videos WHERE id = ?`, [videoId], (err, row) => {
        if (err || !row || !row.video_file_path) return res.status(404).send("Video not found.");
        const videoPath = path.join(__dirname, row.video_file_path);
        fs.stat(videoPath, (statErr, stats) => {
            if (statErr) return res.status(statErr.code === 'ENOENT' ? 404 : 500).send("Video file error.");
            const fileSize = stats.size;
            const range = req.headers.range;
            if (range) {
                const parts = range.replace(/bytes=/, "").split("-");
                const start = parseInt(parts[0], 10);
                const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
                const chunksize = (end - start) + 1;
                const file = fs.createReadStream(videoPath, { start, end });
                res.writeHead(206, {
                    'Content-Range': `bytes ${start}-${end}/${fileSize}`,
                    'Accept-Ranges': 'bytes',
                    'Content-Length': chunksize,
                    'Content-Type': 'video/mp4',
                });
                file.pipe(res);
            } else {
                res.writeHead(200, {
                    'Content-Length': fileSize,
                    'Content-Type': 'video/mp4',
                });
                fs.createReadStream(videoPath).pipe(res);
            }
        });
    });
});

// --- Telegram Bot ---
const bot = new Telegraf(BOT_TOKEN);
const userStates = {}; // For multi-step operations

const isAdmin = (ctx, next) => {
    if (ctx.from.id === YOUR_ADMIN_TELEGRAM_ID) return next();
    return ctx.reply('ليس لديك صلاحية.');
};

bot.start(isAdmin, (ctx) => {
    ctx.reply('أهلاً بك أيها المدير! يمكنك استخدام الأوامر الإدارية أو إرسال فيديو مباشرة لبدء عملية الرفع.');
    userStates[ctx.from.id] = { step: 'awaiting_video_or_command' };
});

bot.command('cancel', isAdmin, (ctx) => {
    delete userStates[ctx.from.id];
    ctx.reply('تم إلغاء العملية الحالية.');
});

bot.command('stats', isAdmin, async (ctx) => {
    try {
        const totalUsers = await new Promise((resolve, reject) => db.get("SELECT COUNT(*) as c FROM users", (err, r) => err ? reject(err) : resolve(r.c)));
        const plansCount = await new Promise((resolve, reject) => db.all("SELECT plan, COUNT(*) as c FROM users GROUP BY plan", (err, r) => err ? reject(err) : resolve(r)));
        let stats = `📊 إحصائيات: ${totalUsers} مستخدم إجمالي.\n\n`;
        plansCount.forEach(p => { stats += `- ${planDetailsMap[p.plan]?.name || p.plan}: ${p.c}\n`; });
        ctx.replyWithHTML(stats);
    } catch (e) { ctx.reply('خطأ في جلب الإحصائيات.'); }
});

const planCommands = Object.keys(planDetailsMap).filter(p => p !== 'free').map((p, i) => ({ type: p, commandBase: `paid${i+1}`, name: planDetailsMap[p].name }));

planCommands.forEach(plan => {
    bot.command(`add${plan.commandBase}`, isAdmin, (ctx) => updatePlan(ctx, plan.type, 'add'));
    bot.command(`del${plan.commandBase}`, isAdmin, (ctx) => updatePlan(ctx, 'free', 'delete'));
});

async function updatePlan(ctx, planType, action) {
    const username = ctx.message.text.split(' ')[1];
    if (!username) return ctx.reply(`الاستخدام: /${ctx.message.text.split(' ')[0]} <اسم_المستخدم>`);
    
    db.get("SELECT id FROM users WHERE username = ?", [username], (err, user) => {
        if (err || !user) return ctx.reply(`لم يتم العثور على المستخدم ${username}.`);
        
        let sql, params, successMsg;
        const planConfig = planDetailsMap[planType];
        
        if (action === 'add') {
            const startDate = new Date();
            const expiryDate = new Date();
            expiryDate.setMonth(startDate.getMonth() + planConfig.durationMonths);
            sql = "UPDATE users SET plan = ?, plan_start_date = ?, plan_expiry_date = ? WHERE id = ?";
            params = [planType, startDate.toISOString(), expiryDate.toISOString(), user.id];
            successMsg = `✅ تم تحديث خطة ${username} إلى ${planConfig.name}.`;
        } else { // delete
            sql = "UPDATE users SET plan = 'free', plan_start_date = NULL, plan_expiry_date = NULL WHERE id = ?";
            params = [user.id];
            successMsg = `🗑️ تم إرجاع ${username} إلى الخطة المجانية.`;
        }

        db.run(sql, params, (updateErr) => {
            if (updateErr) return ctx.reply(`فشل تحديث خطة المستخدم.`);
            ctx.reply(successMsg);
        });
    });
}

// Video Upload Flow
bot.on('video', isAdmin, async (ctx) => {
    if (userStates[ctx.from.id] && userStates[ctx.from.id].step !== 'awaiting_video_or_command') {
        return ctx.reply('أنت في منتصف عملية أخرى. أرسل /cancel أولاً.');
    }
    try {
        const fileLink = await ctx.telegram.getFileLink(ctx.message.video.file_id);
        userStates[ctx.from.id] = {
            step: 'awaiting_title_ar',
            videoInfo: { telegramFileLink: fileLink.href, extension: path.extname(ctx.message.video.file_name || '.mp4') }
        };
        ctx.reply('تم استلام الفيديو. الآن، أدخل العنوان (بالعربية).');
    } catch (e) {
        ctx.reply('خطأ في معالجة الفيديو.');
    }
});

bot.on('photo', isAdmin, async (ctx) => {
    const state = userStates[ctx.from.id];
    if (!state || state.step !== 'awaiting_thumbnail') return;
    try {
        const fileLink = await ctx.telegram.getFileLink(ctx.message.photo.pop().file_id);
        const thumbName = `${Date.now()}_thumb.jpg`;
        const thumbPath = path.join(videoThumbnailsDir, thumbName);
        const response = await axios({ url: fileLink.href, responseType: 'stream' });
        response.data.pipe(fs.createWriteStream(thumbPath));
        state.videoInfo.thumbnail_relative_path = `/videos_data/thumbnails/${thumbName}`;
        state.step = 'awaiting_video_access_type';
        ctx.reply('تم حفظ الغلاف ✅. الآن، حدد نوع الوصول للفيديو:', Markup.inlineKeyboard([
            [Markup.button.callback('مجاني 🆓', 'set_video_type_free')],
            [Markup.button.callback('قياسي 💎', 'set_video_type_standard')],
            [Markup.button.callback('برو 🌟', 'set_video_type_pro')],
            [Markup.button.callback('فائق/سنوي 🚀', 'set_video_type_ultimate')]
        ]));
    } catch (e) {
        ctx.reply('خطأ في معالجة الغلاف.');
    }
});

bot.action(/set_video_type_(free|standard|pro|ultimate)/, isAdmin, async (ctx) => {
    const state = userStates[ctx.from.id];
    if (!state || state.step !== 'awaiting_video_access_type') return ctx.answerCbQuery('خطوة غير متوقعة.');
    state.videoInfo.video_access_type = ctx.match[1];
    state.step = 'awaiting_suggestion_choice';
    await ctx.editMessageText(`تم تحديد نوع الوصول: ${ctx.match[1]}.`);
    ctx.reply('هل تريد عرض هذا الفيديو في قسم "مقترحة لك" بالصفحة الرئيسية؟', Markup.inlineKeyboard([
        Markup.button.callback('نعم ✅', 'set_suggestion_yes'),
        Markup.button.callback('لا ❌', 'set_suggestion_no')
    ]));
});

bot.action(/set_suggestion_(yes|no)/, isAdmin, async (ctx) => {
    const state = userStates[ctx.from.id];
    if (!state || state.step !== 'awaiting_suggestion_choice') return ctx.answerCbQuery('خطوة غير متوقعة.');
    
    state.videoInfo.is_suggested = ctx.match[1] === 'yes' ? 1 : 0;
    const isSuggestedText = ctx.match[1] === 'yes' ? 'نعم' : 'لا';
    await ctx.editMessageText(`تم تحديد الظهور في المقترحات: ${isSuggestedText}.`);
    ctx.reply('جاري تحميل الفيديو إلى الخادم وحفظ البيانات... ⏳');
    
    try {
        const { videoInfo } = state;
        const videoName = `${Date.now()}_video${videoInfo.extension}`;
        const videoPath = path.join(videoFilesDir, videoName);
        const response = await axios({ url: videoInfo.telegramFileLink, responseType: 'stream' });
        const writer = fs.createWriteStream(videoPath);
        response.data.pipe(writer);

        await new Promise((resolve, reject) => {
            writer.on('finish', resolve);
            writer.on('error', reject);
        });
        
        const videoId = `vid_${Date.now()}`;
        const sql = `INSERT INTO videos (id, title_ar, title_en, thumbnail_path, alt_text_ar, alt_text_en, description_ar, description_en, type, is_suggested, video_file_path) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
        db.run(sql, [
            videoId, videoInfo.title_ar, videoInfo.title_en, videoInfo.thumbnail_relative_path,
            videoInfo.title_ar, videoInfo.title_en, videoInfo.description_ar, videoInfo.description_en,
            videoInfo.video_access_type, videoInfo.is_suggested, `/videos_data/files/${videoName}`
        ], function(err) {
            if (err) {
                ctx.reply('حدث خطأ فادح أثناء حفظ بيانات الفيديو.');
                console.error(err);
            } else {
                ctx.reply(`🎉 تم رفع الفيديو بنجاح!\nالمعرف: ${videoId}`);
            }
            delete userStates[ctx.from.id];
        });
    } catch (e) {
        ctx.reply('حدث خطأ أثناء تحميل الفيديو.');
        console.error(e);
        delete userStates[ctx.from.id];
    }
});


bot.on('text', isAdmin, (ctx) => {
    const state = userStates[ctx.from.id];
    if (!state || state.step === 'awaiting_video_or_command') return;
    
    const text = ctx.message.text.trim();
    switch (state.step) {
        case 'awaiting_title_ar':
            state.videoInfo.title_ar = text;
            state.step = 'awaiting_description_ar';
            ctx.reply('تم. الآن الوصف (بالعربية).');
            break;
        case 'awaiting_description_ar':
            state.videoInfo.description_ar = text;
            state.step = 'awaiting_title_en';
            ctx.reply('تم. الآن العنوان (بالإنجليزية).');
            break;
        case 'awaiting_title_en':
            state.videoInfo.title_en = text;
            state.step = 'awaiting_description_en';
            ctx.reply('تم. الآن الوصف (بالإنجليزية).');
            break;
        case 'awaiting_description_en':
            state.videoInfo.description_en = text;
            state.step = 'awaiting_thumbnail';
            ctx.reply('تم. الآن أرسل صورة الغلاف.');
            break;
    }
});

bot.launch().then(() => console.log('Telegram Bot is running!')).catch(err => console.error('Error starting Bot:', err));

// Fallback for SPA routing
app.use((req, res) => {
    if (!req.path.startsWith('/api/') && req.method === 'GET' && !path.extname(req.path)) {
        res.sendFile(path.join(__dirname, 'web.html'));
    } else {
        res.status(404).send("Not Found");
    }
});

app.listen(PORT, () => {
    console.log(`SofagHub server running at http://localhost:${PORT}/`);
    if (YOUR_ADMIN_TELEGRAM_ID === 0) {
        console.warn("!!! WARNING: YOUR_ADMIN_TELEGRAM_ID is not set in server.js !!!");
    }
});
