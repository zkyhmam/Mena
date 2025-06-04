const express = require('express');
const fs = require('fs-extra');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();
const bcryptActual = require('bcryptjs'); // تم استيراده بشكل صحيح هنا
const session = require('express-session');
const cookieParser = require('cookie-parser');
const { Telegraf, Markup } = require('telegraf');
const axios = require('axios');
const crypto = require('crypto');

const app = express();
const PORT = 8080;
const BOT_TOKEN = "7247981807:AAGhBZrTghiC4ZfmUIHVDxjGGOlXSr9o8lU";

console.log('Server.js: Starting up...');
const videoTokensStore = new Map();

const dbPath = path.join(__dirname, 'users.db');
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('خطأ في الاتصال بقاعدة البيانات:', err.message);
    } else {
        console.log('تم الاتصال بقاعدة بيانات SQLite بنجاح (users.db).');
        db.serialize(() => {
            db.run(`ALTER TABLE users ADD COLUMN plan TEXT DEFAULT 'free'`, (alterErr) => {
                if (alterErr && !alterErr.message.includes('duplicate column name')) {
                    console.error("خطأ في إضافة حقل الخطة لجدول المستخدمين:", alterErr.message);
                } else if (!alterErr || alterErr.message.includes('duplicate column name')) {
                     console.log("حقل 'plan' لجدول المستخدمين موجود بالفعل أو تم إضافته.");
                }
            });
            db.run(`CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                username TEXT UNIQUE NOT NULL,
                email TEXT UNIQUE NOT NULL,
                password_hash TEXT NOT NULL,
                hint TEXT,
                plan TEXT DEFAULT 'free' 
            )`, (errDb) => {
                if (errDb) console.error("خطأ في إنشاء جدول المستخدمين (مع الخطة):", errDb.message);
            });

            db.run(`CREATE TABLE IF NOT EXISTS videos (
                id TEXT PRIMARY KEY, title_ar TEXT, title_en TEXT, thumbnail_path TEXT,
                alt_text_ar TEXT, alt_text_en TEXT, views_ar TEXT DEFAULT '0',
                views_en TEXT DEFAULT '0', type TEXT DEFAULT 'free', description_ar TEXT,
                description_en TEXT, is_suggested INTEGER DEFAULT 0, video_file_path TEXT,
                uploaded_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )`, (errDb) => {
                if (errDb) console.error("خطأ في إنشاء جدول الفيديوهات:", errDb.message);
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
const sessionMiddleware = session({
    name: 'sofaghub.sid', 
    secret: 'a_much_more_secure_and_random_secret_key_!@#$%^_for_sofaghub_sessions_12345', 
    resave: false, 
    saveUninitialized: false, 
    cookie: { 
        secure: false, 
        httpOnly: true, 
        maxAge: 7 * 24 * 60 * 60 * 1000, 
        sameSite: 'lax' 
    }
});
app.use(sessionMiddleware);

console.log('Server.js: Basic middlewares configured with persistent session cookies.');
app.use('/images', express.static(path.join(__dirname, 'images')));
app.use('/videos_data/thumbnails', express.static(videoThumbnailsDir));
console.log('Server.js: Static file serving configured.');
app.use(express.static(__dirname));

function ensureAuthenticated(req, res, next) {
    if (req.session && req.session.userId) {
        return next();
    }
    res.status(401).json({ success: false, message: 'الرجاء تسجيل الدخول للمتابعة.' });
}

app.post('/api/register', async (req, res) => {
    const { username, email, password, hint } = req.body;
    if (!username || !email || !password) return res.status(400).json({ success: false, message: 'الرجاء إدخال جميع الحقول المطلوبة.' });
    if (password.length < 6) return res.status(400).json({ success: false, message: 'يجب أن تتكون كلمة المرور من 6 أحرف على الأقل.' });
    try {
        const hashedPassword = await bcryptActual.hash(password, 10);
        const sql = `INSERT INTO users (username, email, password_hash, hint, plan) VALUES (?, ?, ?, ?, 'free')`;
        db.run(sql, [username, email, hashedPassword, hint || null], function (err) {
            if (err) {
                if (err.message.includes('UNIQUE constraint failed')) {
                    const field = err.message.includes('email') ? 'البريد الإلكتروني' : 'اسم المستخدم';
                    return res.status(409).json({ success: false, message: `${field} مسجل بالفعل.` });
                }
                console.error("[API /api/register] SQL Error:", err.message);
                return res.status(500).json({ success: false, message: 'حدث خطأ أثناء التسجيل.' });
            }
            req.session.regenerate(function(regenErr) { // تجديد الجلسة بعد التسجيل
                if (regenErr) {
                    console.error("Session regeneration error after register:", regenErr);
                     // حتى لو فشل تجديد الجلسة، يمكننا محاولة إكمال تسجيل الدخول
                }
                req.session.userId = this.lastID;
                req.session.username = username;
                req.session.userPlan = 'free';
                console.log('[API /api/register] User registered successfully:', username, 'Plan:', req.session.userPlan);
                res.status(201).json({ success: true, message: 'تم التسجيل بنجاح! مرحباً بك.', user: { id: this.lastID, username: username, plan: 'free' } });
            }.bind(this)); // ربط this لـ db.run
        });
    } catch (error) {
        console.error("[API /api/register] Catch Error:", error);
        res.status(500).json({ success: false, message: 'حدث خطأ داخلي أثناء عملية التسجيل.' });
    }
});

app.post('/api/login', (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ success: false, message: 'الرجاء إدخال البريد الإلكتروني وكلمة المرور.' });
    const sql = `SELECT id, username, password_hash, plan FROM users WHERE email = ?`;
    db.get(sql, [email], async (err, user) => {
        if (err) {
            console.error("[API /api/login] SQL Error:", err.message);
            return res.status(500).json({ success: false, message: 'حدث خطأ.' });
        }
        if (!user) return res.status(401).json({ success: false, message: 'البريد الإلكتروني أو كلمة المرور غير صحيحة.' });
        const passwordMatch = await bcryptActual.compare(password, user.password_hash);
        if (!passwordMatch) return res.status(401).json({ success: false, message: 'البريد الإلكتروني أو كلمة المرور غير صحيحة.' });
        req.session.regenerate(function(regenErr) {
            if (regenErr) {
                console.error("Session regeneration error:", regenErr);
                return res.status(500).json({ success: false, message: 'خطأ في تهيئة الجلسة.' });
            }
            req.session.userId = user.id;
            req.session.username = user.username;
            req.session.userPlan = user.plan;
            console.log('[API /api/login] User logged in successfully:', user.username, 'Plan:', user.plan);
            res.json({ success: true, message: 'تم تسجيل الدخول بنجاح!', user: { id: user.id, username: user.username, plan: user.plan } });
        });
    });
});

app.get('/api/logout', (req, res) => {
    if (req.session) {
        req.session.destroy(err => {
            if (err) {
                console.error("[API /api/logout] Error destroying session:", err);
                return res.status(500).json({ success: false, message: 'فشل تسجيل الخروج.' });
            }
            res.clearCookie('sofaghub.sid');
            console.log('[API /api/logout] User logged out.');
            res.json({ success: true, message: 'تم تسجيل الخروج بنجاح.' });
        });
    } else {
        res.clearCookie('sofaghub.sid');
        res.json({ success: true, message: 'لا توجد جلسة نشطة لتسجيل الخروج منها.' });
    }
});

app.get('/api/check-auth', (req, res) => {
    if (req.session && req.session.userId && req.session.username) {
        res.json({ loggedIn: true, user: { username: req.session.username, plan: req.session.userPlan || 'free' } });
    } else {
        res.json({ loggedIn: false });
    }
});

app.get('/api/account/info', ensureAuthenticated, (req, res) => {
    const sql = `SELECT username, email, plan FROM users WHERE id = ?`;
    db.get(sql, [req.session.userId], (err, user) => {
        if (err || !user) {
            console.error("[API /api/account/info] Error fetching user info or user not found:", err ? err.message : "User not found");
            return res.status(404).json({ success: false, message: "لم يتم العثور على معلومات المستخدم." });
        }
        res.json({ success: true, user: { username: user.username, email: user.email, plan: user.plan } });
    });
});

app.post('/api/account/update-username', ensureAuthenticated, async (req, res) => {
    const { newUsername } = req.body;
    const userId = req.session.userId;
    if (!newUsername || newUsername.trim().length < 3) return res.status(400).json({ success: false, message: "اسم المستخدم الجديد يجب أن يتكون من 3 أحرف على الأقل." });
    const checkSql = `SELECT id FROM users WHERE username = ? AND id != ?`;
    db.get(checkSql, [newUsername.trim(), userId], (err, existingUser) => {
        if (err) { console.error("[API /update-username] SQL Error checking username:", err.message); return res.status(500).json({ success: false, message: "خطأ في الخادم." }); }
        if (existingUser) return res.status(409).json({ success: false, message: "اسم المستخدم هذا محجوز بالفعل." });
        const updateSql = `UPDATE users SET username = ? WHERE id = ?`;
        db.run(updateSql, [newUsername.trim(), userId], function(updateErr) {
            if (updateErr) { console.error("[API /update-username] SQL Error updating username:", updateErr.message); return res.status(500).json({ success: false, message: "فشل تحديث اسم المستخدم." }); }
            req.session.username = newUsername.trim();
            res.json({ success: true, message: "تم تحديث اسم المستخدم بنجاح.", newUsername: newUsername.trim() });
        });
    });
});

app.post('/api/account/update-password', ensureAuthenticated, async (req, res) => {
    const { currentPassword, newPassword, confirmNewPassword } = req.body;
    const userId = req.session.userId;
    if (!currentPassword || !newPassword || !confirmNewPassword) return res.status(400).json({ success: false, message: "الرجاء ملء جميع حقول كلمة المرور." });
    if (newPassword.length < 6) return res.status(400).json({ success: false, message: "كلمة المرور الجديدة يجب أن تتكون من 6 أحرف على الأقل." });
    if (newPassword !== confirmNewPassword) return res.status(400).json({ success: false, message: "كلمتا المرور الجديدتان غير متطابقتين." });
    const sqlGet = `SELECT password_hash FROM users WHERE id = ?`;
    db.get(sqlGet, [userId], async (err, user) => {
        if (err || !user) return res.status(500).json({ success: false, message: "خطأ في جلب بيانات المستخدم." });
        const currentPasswordMatch = await bcryptActual.compare(currentPassword, user.password_hash);
        if (!currentPasswordMatch) return res.status(401).json({ success: false, message: "كلمة المرور الحالية غير صحيحة." });
        const newHashedPassword = await bcryptActual.hash(newPassword, 10);
        const sqlUpdate = `UPDATE users SET password_hash = ? WHERE id = ?`;
        db.run(sqlUpdate, [newHashedPassword, userId], function(updateErr) {
            if (updateErr) { console.error("[API /update-password] SQL Error:", updateErr.message); return res.status(500).json({ success: false, message: "فشل تحديث كلمة المرور." }); }
            res.json({ success: true, message: "تم تحديث كلمة المرور بنجاح." });
        });
    });
});

app.post('/api/account/delete', ensureAuthenticated, async (req, res) => {
    const { password } = req.body;
    const userId = req.session.userId;
    if (!password) return res.status(400).json({ success: false, message: "الرجاء إدخال كلمة المرور لتأكيد الحذف." });
    const sqlGet = `SELECT password_hash FROM users WHERE id = ?`;
    db.get(sqlGet, [userId], async (err, user) => {
        if (err || !user) return res.status(500).json({ success: false, message: "خطأ في جلب بيانات المستخدم." });
        const passwordMatch = await bcryptActual.compare(password, user.password_hash);
        if (!passwordMatch) return res.status(401).json({ success: false, message: "كلمة المرور غير صحيحة. لم يتم حذف الحساب." });
        const sqlDelete = `DELETE FROM users WHERE id = ?`;
        db.run(sqlDelete, [userId], function(deleteErr) {
            if (deleteErr) { console.error("[API /delete-account] SQL Error:", deleteErr.message); return res.status(500).json({ success: false, message: "فشل حذف الحساب." }); }
            req.session.destroy(sessionErr => {
                if (sessionErr) console.error("Error destroying session after account deletion:", sessionErr);
                res.clearCookie('sofaghub.sid');
                res.json({ success: true, message: "تم حذف حسابك بنجاح." });
            });
        });
    });
});

app.get('/api/videos', (req, res) => {
    const sql = `SELECT id, title_ar, title_en, thumbnail_path, alt_text_ar, alt_text_en, views_ar, views_en, type, description_ar, description_en, is_suggested FROM videos ORDER BY uploaded_at DESC`;
    db.all(sql, [], (err, rows) => {
        if (err) return res.status(500).json({ success: false, message: 'حدث خطأ أثناء جلب الفيديوهات.' });
        const videosData = rows.map(row => ({
            id: row.id, title: { ar: row.title_ar, en: row.title_en }, thumbnail: row.thumbnail_path,
            altText: { ar: row.alt_text_ar, en: row.alt_text_en }, views: { ar: row.views_ar, en: row.views_en },
            type: row.type, description: { ar: row.description_ar, en: row.description_en }, isSuggested: row.is_suggested === 1,
        }));
        res.json(videosData);
    });
});

app.post('/api/request-video-token/:videoId', (req, res) => {
    const videoId = req.params.videoId;
    const sqlCheckType = `SELECT type FROM videos WHERE id = ?`;
    db.get(sqlCheckType, [videoId], (err, video) => {
        if (err || !video) return res.status(404).json({ success: false, message: "Video not found." });
        const token = crypto.randomBytes(16).toString('hex');
        const expiresAt = Date.now() + (15 * 60 * 1000);
        videoTokensStore.set(token, { videoId, expiresAt, sessionId: req.sessionID });
        console.log(`[API /request-video-token] Token generated for video ${videoId}: ${token}`);
        res.json({ success: true, token });
    });
});

app.get('/api/video-stream/:videoId', (req, res) => {
    const videoId = req.params.videoId;
    const clientToken = req.query.token;
    if (!clientToken) return res.status(401).send("Access token required.");
    const tokenData = videoTokensStore.get(clientToken);
    if (!tokenData || tokenData.videoId !== videoId || Date.now() > tokenData.expiresAt /*|| tokenData.sessionId !== req.sessionID*/) {
        if(tokenData && Date.now() > tokenData.expiresAt) videoTokensStore.delete(clientToken);
        return res.status(403).send("Invalid or expired access token.");
    }
    const sql = `SELECT video_file_path FROM videos WHERE id = ?`;
    db.get(sql, [videoId], (err, row) => {
        if (err || !row || !row.video_file_path) return res.status(404).send("Video not found in database or path missing.");
        const videoPathOnServer = path.join(__dirname, row.video_file_path);
        fs.stat(videoPathOnServer, (statErr, stats) => {
            if (statErr) return res.status(statErr.code === 'ENOENT' ? 404 : 500).send("Video file error.");
            const fileSize = stats.size;
            const range = req.headers.range;
            const videoExtension = path.extname(row.video_file_path).slice(1) || 'mp4';
            if (range) {
                const parts = range.replace(/bytes=/, "").split("-");
                const start = parseInt(parts[0], 10);
                let end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
                if (start >= fileSize || end >= fileSize ) { res.status(416).send('Requested range not satisfiable'); return; }
                const chunksize = (end - start) + 1;
                const file = fs.createReadStream(videoPathOnServer, { start, end });
                const head = { 'Content-Range': `bytes ${start}-${end}/${fileSize}`, 'Accept-Ranges': 'bytes', 'Content-Length': chunksize, 'Content-Type': `video/${videoExtension}` };
                res.writeHead(206, head); file.pipe(res);
            } else {
                const head = { 'Content-Length': fileSize, 'Content-Type': `video/${videoExtension}`, 'Accept-Ranges': 'bytes' };
                res.writeHead(200, head); fs.createReadStream(videoPathOnServer).pipe(res);
            }
        });
    });
});

const bot = new Telegraf(BOT_TOKEN);
const userStates = {};
bot.start((ctx) => { ctx.reply('مرحباً بك في بوت SofagHub! أرسل لي الفيديو الذي تريد رفعه.'); userStates[ctx.from.id] = { step: 'awaiting_video' }; });
bot.command('cancel', (ctx) => { const userId = ctx.from.id; if (userStates[userId]) { delete userStates[userId]; ctx.reply('تم إلغاء عملية الرفع الحالية.'); } else { ctx.reply('لا توجد عملية رفع نشطة لإلغائها.'); }});
bot.on('video', async (ctx) => { const userId = ctx.from.id; if (userStates[userId] && userStates[userId].step !== 'awaiting_video') { return ctx.reply('أنت حاليًا في منتصف عملية رفع أخرى. أرسل /cancel ثم أرسل الفيديو.'); } const fileId = ctx.message.video.file_id; const fileSize = ctx.message.video.file_size; const fileNameOriginal = ctx.message.video.file_name || `video_${Date.now()}.mp4`; const fileExtension = path.extname(fileNameOriginal) || '.mp4'; if (fileSize > 2000 * 1024 * 1024) { return ctx.reply('حجم الفيديو كبير جداً. الحد الأقصى هو 2 جيجابايت.'); } try { await ctx.replyWithChatAction('typing'); const fileLink = await ctx.telegram.getFileLink(fileId); userStates[userId] = { step: 'awaiting_title_ar', videoInfo: { telegramFileLink: fileLink.href, originalName: fileNameOriginal, extension: fileExtension, } }; ctx.reply('تم استلام الفيديو 👍. الآن، عنوان الفيديو (باللغة العربية).'); } catch (error) { console.error('[BOT] خطأ في الحصول على رابط الملف:', error); ctx.reply('حدث خطأ أثناء معالجة الفيديو.'); delete userStates[userId]; }});
bot.on('photo', async (ctx) => { const userId = ctx.from.id; if (!userStates[userId] || userStates[userId].step !== 'awaiting_thumbnail') { return ctx.reply('الرجاء اتباع التعليمات. أرسل /cancel للبدء من جديد.'); } const photo = ctx.message.photo.pop(); const fileId = photo.file_id; try { await ctx.replyWithChatAction('upload_photo'); const fileLink = await ctx.telegram.getFileLink(fileId); const thumbnailFileNameOnServer = `${Date.now()}_${userId}_thumb.jpg`; const thumbnailRelativePath = `/videos_data/thumbnails/${thumbnailFileNameOnServer}`; const response = await axios({ url: fileLink.href, responseType: 'stream' }); const writer = fs.createWriteStream(path.join(__dirname, thumbnailRelativePath)); response.data.pipe(writer); await new Promise((resolve, reject) => { writer.on('finish', resolve); writer.on('error', reject); }); userStates[userId].videoInfo.thumbnail_relative_path = thumbnailRelativePath; userStates[userId].step = 'awaiting_type'; ctx.reply('تم حفظ الغلاف ✅. الآن، حدد نوع الفيديو:', Markup.inlineKeyboard([Markup.button.callback('مجاني 🆓', 'set_type_free'), Markup.button.callback('مدفوع 💰', 'set_type_paid')])); } catch (error) { console.error('[BOT] خطأ في معالجة الغلاف:', error); ctx.reply('حدث خطأ أثناء معالجة الغلاف.'); }});
bot.action(/set_type_(free|paid)/, async (ctx) => { const userId = ctx.from.id; if (!userStates[userId] || userStates[userId].step !== 'awaiting_type') { return ctx.answerCbQuery('خطوة غير متوقعة.'); } const type = ctx.match[1]; userStates[userId].videoInfo.type = type; try { await ctx.editMessageReplyMarkup(undefined); await ctx.reply(`تم تحديد النوع: ${type === 'free' ? 'مجاني 🆓' : 'مدفوع 💰'}.`); await ctx.reply('جاري تحميل الفيديو إلى الخادم... ⏳'); await ctx.replyWithChatAction('upload_video'); const videoInfo = userStates[userId].videoInfo; const videoFileNameOnServer = `${Date.now()}_${userId}_video${videoInfo.extension}`; const videoRelativePath = `/videos_data/files/${videoFileNameOnServer}`; const videoResponse = await axios({ url: videoInfo.telegramFileLink, responseType: 'stream' }); const videoWriter = fs.createWriteStream(path.join(__dirname, videoRelativePath)); videoResponse.data.pipe(videoWriter); await new Promise((resolve, reject) => { videoWriter.on('finish', resolve); videoWriter.on('error', reject); }); const videoId = `vid_${Date.now()}${Math.random().toString(36).substring(2, 7)}`; const sql = `INSERT INTO videos (id, title_ar, title_en, thumbnail_path, alt_text_ar, alt_text_en, description_ar, description_en, type, video_file_path) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`; db.run(sql, [videoId, videoInfo.title_ar, videoInfo.title_en || videoInfo.title_ar, videoInfo.thumbnail_relative_path, videoInfo.alt_text_ar || videoInfo.title_ar, videoInfo.alt_text_en || videoInfo.title_en || videoInfo.title_ar, videoInfo.description_ar, videoInfo.description_en || videoInfo.description_ar, videoInfo.type, videoRelativePath], function(err) { if (err) { console.error('[BOT] خطأ في حفظ الفيديو:', err.message); ctx.reply('حدث خطأ فادح أثناء حفظ بيانات الفيديو.'); } else { const siteBaseUrl = `http://localhost:${PORT}`; ctx.reply(`تم رفع الفيديو بنجاح! 🎉\nالمعرف: ${videoId}\nالعنوان: ${videoInfo.title_ar}\nالنوع: ${videoInfo.type}\nالرابط: ${siteBaseUrl}`); } delete userStates[userId]; }); } catch (error) { console.error('[BOT] خطأ في تحميل الفيديو:', error); ctx.reply('حدث خطأ أثناء تحميل الفيديو أو حفظ البيانات.'); if (userStates[userId]?.videoInfo?.thumbnail_relative_path) { fs.unlink(path.join(__dirname, userStates[userId].videoInfo.thumbnail_relative_path)).catch(e => console.error("[BOT] Failed to delete temp thumbnail", e)); } delete userStates[userId]; }});
bot.on('text', (ctx) => { const userId = ctx.from.id; const text = ctx.message.text.trim(); if (!userStates[userId]) return ctx.reply('الرجاء إرسال الفيديو أولاً أو /start.'); if (text.toLowerCase() === '/cancel') { if (userStates[userId]) { delete userStates[userId]; return ctx.reply('تم إلغاء العملية.'); }} const currentState = userStates[userId]; if (!currentState) return; switch (currentState.step) { case 'awaiting_title_ar': currentState.videoInfo.title_ar = text; currentState.step = 'awaiting_description_ar'; ctx.reply('تم حفظ العنوان العربي 👍. الآن، الوصف (باللغة العربية).'); break; case 'awaiting_description_ar': currentState.videoInfo.description_ar = text; currentState.step = 'awaiting_title_en'; ctx.reply('تم حفظ الوصف العربي 👍. الآن، العنوان (باللغة الإنجليزية).', Markup.inlineKeyboard([Markup.button.callback('نفس العنوان العربي', 'use_same_title_ar_for_en')])); break; case 'awaiting_title_en': currentState.videoInfo.title_en = text; currentState.step = 'awaiting_description_en'; ctx.reply('تم حفظ العنوان الإنجليزي 👍. الآن، الوصف (باللغة الإنجليزية).', Markup.inlineKeyboard([Markup.button.callback('نفس الوصف العربي', 'use_same_desc_ar_for_en')])); break; case 'awaiting_description_en': currentState.videoInfo.description_en = text; currentState.step = 'awaiting_thumbnail'; ctx.reply('تم حفظ الوصف الإنجليزي 👍. الآن، صورة الغلاف للفيديو.'); break; default: ctx.reply('أنا في انتظار خطوة معينة. أرسل /cancel للبدء من جديد.'); }});
bot.action('use_same_title_ar_for_en', async (ctx) => { const userId = ctx.from.id; if (!userStates[userId] || userStates[userId].step !== 'awaiting_title_en') return ctx.answerCbQuery('خطوة غير متوقعة.'); userStates[userId].videoInfo.title_en = userStates[userId].videoInfo.title_ar; userStates[userId].step = 'awaiting_description_en'; await ctx.editMessageReplyMarkup(undefined); await ctx.reply('تم استخدام العنوان العربي للإنجليزي 👍. الآن، الوصف (باللغة الإنجليزية).', Markup.inlineKeyboard([Markup.button.callback('نفس الوصف العربي', 'use_same_desc_ar_for_en')])); });
bot.action('use_same_desc_ar_for_en', async (ctx) => { const userId = ctx.from.id; if (!userStates[userId] || userStates[userId].step !== 'awaiting_description_en') return ctx.answerCbQuery('خطوة غير متوقعة.'); userStates[userId].videoInfo.description_en = userStates[userId].videoInfo.description_ar; userStates[userId].step = 'awaiting_thumbnail'; await ctx.editMessageReplyMarkup(undefined); await ctx.reply('تم استخدام الوصف العربي للإنجليزي 👍. الآن، صورة الغلاف للفيديو.'); });
bot.launch().then(() => console.log('بوت تليجرام يعمل الآن!')).catch(err => console.error('خطأ في تشغيل بوت تليجرام:', err));

app.use((req, res, next) => { if (path.extname(req.url) !== '' || req.url.startsWith('/api/')) return next(); res.sendFile(path.join(__dirname, 'web.html'), (err) => { if (err) next(err); }); });
app.use((req, res, next) => { if (!res.headersSent) res.status(404).send("Sorry, can't find that page!"); });
app.use((err, req, res, next) => { console.error("[Global Error Handler]", err.stack || err); if (!res.headersSent) res.status(500).send('Something broke on the server!'); });
app.listen(PORT, () => { console.log(`SofagHub server running at http://localhost:${PORT}/`); console.log('اضغط Ctrl+C للخروج.'); });
app.on('error', (err) => { if (err.code === 'EADDRINUSE') console.error(`خطأ: المنفذ ${PORT} مستخدم بالفعل.`); else console.error(`خطأ في الخادم: ${err}`); process.exit(1); });
console.log('Server.js: End of file reached.');
