import asyncio
import datetime
import json
import logging
import os
import random
import sqlite3
import string
from typing import Any, Dict, List, Optional, Tuple, Union

from telegram import (BotCommand, InlineKeyboardButton, InlineKeyboardMarkup,
                      MessageEntity, ReplyKeyboardRemove, Update)
from telegram.constants import ChatAction, MessageEntityType, ParseMode
from telegram.error import BadRequest, Forbidden
from telegram.ext import (Application, CallbackQueryHandler, CommandHandler,
                          ContextTypes, ConversationHandler, MessageHandler,
                          filters)

BOT_TOKEN = "7247981807:AAGhBZrTghiC4ZfmUIHVDxjGGOlXSr9o8lU"
DATABASE_NAME = "sofaghub_bot.db"
ADMIN_TELEGRAM_IDS = [6988696258, 7366755313]
MAIN_ADMIN_ID = 6988696258
CONTACT_ADMIN_USERNAME = "sofag255"

REFERRAL_BONUS = 0.2
GIFT_COOLDOWN_HOURS = 4


PLANS = {
    "free": {
        "name_ar": "الخطة المجانية",
        "name_en": "Free Plan",
        "price": 0,
        "access_level": 0,
        "can_download": False,
        "gift_cooldown": GIFT_COOLDOWN_HOURS,
        "description_ar": "الحصول على فيديو مجاني كل 4 ساعات من الفيديوهات المخصصة للمجاني.",
    },
    "standard": {
        "name_ar": "الخطة القياسية",
        "name_en": "Standard Plan",
        "price": 10,
        "access_level": 0,
        "can_download": False,
        "gift_cooldown": 0,
        "description_ar": "الوصول لجميع الفيديوهات المجانية بدون مؤقت انتظار أو حدود.",
    },
    "pro": {
        "name_ar": "الخطة برو",
        "name_en": "Pro Plan",
        "price": 40,
        "access_level": 2,
        "can_download": False,
        "gift_cooldown": 0,
        "description_ar": "مشاهدة جميع الفيديوهات (مجانية، برو، وفائقة) بحرية تامة. أكثر من 1000 فيديو حصري من تانجو وغيره.",
    },
    "ultimate": {
        "name_ar": "الخطة الفائقة",
        "name_en": "Ultimate Plan",
        "price": 99,
        "access_level": 3,
        "can_download": True,
        "gift_cooldown": 0,
        "description_ar": "مشاهدة وتحميل أي محتوى على جهازك بحرية تامة، بالإضافة لجميع مزايا برو.",
    },
}


VIDEO_UPLOAD_ACCESS_TYPES = {
    "free": {"name_ar": "مجاني 🆓", "level": 0},
    "pro": {"name_ar": "برو 🌟 (يتطلب خطة برو أو أعلى)", "level": 2},
    "ultimate": {"name_ar": "فائق 🚀 (يتطلب خطة فائقة)", "level": 3},
}


logging.basicConfig(
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s", level=logging.INFO
)
logger = logging.getLogger(__name__)


def get_db_connection():
    conn = sqlite3.connect(DATABASE_NAME, check_same_thread=False)
    conn.row_factory = sqlite3.Row
    return conn


def create_tables():
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute(
        """
        CREATE TABLE IF NOT EXISTS users (
            user_id INTEGER PRIMARY KEY, username TEXT, first_name TEXT, last_name TEXT,
            plan TEXT DEFAULT 'free', plan_start_date DATETIME, plan_expiry_date DATETIME,
            referral_code TEXT UNIQUE, referred_by INTEGER, referral_balance REAL DEFAULT 0.0,
            invited_count INTEGER DEFAULT 0, last_gift_time DATETIME,
            registration_date DATETIME DEFAULT CURRENT_TIMESTAMP, 
            is_bot_blocked INTEGER DEFAULT 0,
            is_banned_by_admin INTEGER DEFAULT 0, -- New field for admin ban
            sent_videos_cache TEXT DEFAULT '[]', -- Stores video_db_id
            current_video_index INTEGER DEFAULT 0 
        )
    """
    )
    cursor.execute(
        """
        CREATE TABLE IF NOT EXISTS videos (
            video_db_id INTEGER PRIMARY KEY AUTOINCREMENT, file_id TEXT UNIQUE NOT NULL, caption TEXT,
            access_type TEXT DEFAULT 'free', duration INTEGER, uploaded_by INTEGER,
            upload_date DATETIME DEFAULT CURRENT_TIMESTAMP, is_hidden INTEGER DEFAULT 0
        )
    """
    )

    cursor.execute(
        """
        CREATE TABLE IF NOT EXISTS bot_settings (
            key TEXT PRIMARY KEY,
            value TEXT
        )
    """
    )

    cursor.execute(
        "INSERT OR IGNORE INTO bot_settings (key, value) VALUES (?, ?)",
        ("auto_free_upload_mode", "false"),
    )
    conn.commit()
    conn.close()


def get_bot_setting(key: str) -> Optional[str]:
    conn = get_db_connection()
    row = conn.execute(
        "SELECT value FROM bot_settings WHERE key = ?", (key,)
    ).fetchone()
    conn.close()
    return row["value"] if row else None


def set_bot_setting(key: str, value: str):
    conn = get_db_connection()
    conn.execute(
        "INSERT OR REPLACE INTO bot_settings (key, value) VALUES (?, ?)", (key, value)
    )
    conn.commit()
    conn.close()


def generate_referral_code(user_id: int) -> str:
    random_part = "".join(random.choices(string.ascii_letters + string.digits, k=4))
    return f"{user_id}_{random_part}"


def get_user(user_id: int) -> Optional[sqlite3.Row]:
    conn = get_db_connection()
    user = conn.execute("SELECT * FROM users WHERE user_id = ?", (user_id,)).fetchone()
    conn.close()
    return user


def add_user(
    user_id: int,
    username: Optional[str],
    first_name: str,
    last_name: Optional[str],
    referred_by: Optional[int] = None,
) -> Tuple[Optional[sqlite3.Row], bool]:
    conn = get_db_connection()
    cursor = conn.cursor()
    existing_user = get_user(user_id)
    if existing_user:
        if existing_user["is_bot_blocked"] or existing_user["is_banned_by_admin"]:
            set_user_blocked_status(user_id, False)
        return existing_user, False
    referral_code = generate_referral_code(user_id)
    try:
        cursor.execute(
            """
            INSERT INTO users (user_id, username, first_name, last_name, referral_code, referred_by, registration_date, sent_videos_cache, current_video_index, is_banned_by_admin)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """,
            (
                user_id,
                username,
                first_name,
                last_name,
                referral_code,
                referred_by,
                datetime.datetime.now(),
                json.dumps([]),
                0,
                0,
            ),
        )
        conn.commit()
        new_user = get_user(user_id)
        logger.info(
            f"New user registered: {user_id} (@{username or 'N/A'}), referral code: {referral_code}, referred by: {referred_by}"
        )
        return new_user, True
    except sqlite3.IntegrityError as e:
        logger.error(f"Integrity error for user {user_id}: {e}")
        conn.rollback()
        return get_user(user_id), False
    finally:
        conn.close()


async def update_user_plan(
    context: ContextTypes.DEFAULT_TYPE, user_id: int, new_plan_key: str
) -> bool:
    conn = get_db_connection()
    cursor = conn.cursor()
    plan_info = PLANS.get(new_plan_key)
    if not plan_info:
        logger.error(f"Invalid plan key: {new_plan_key} for user {user_id}")
        return False
    start_date = datetime.datetime.now()
    expiry_date = None
    try:
        cursor.execute(
            """
            UPDATE users SET plan = ?, plan_start_date = ?, plan_expiry_date = ?, sent_videos_cache = ?, current_video_index = 0
            WHERE user_id = ?
        """,
            (new_plan_key, start_date, expiry_date, json.dumps([]), user_id),
        )
        conn.commit()
        logger.info(
            f"User {user_id} plan updated to {new_plan_key}. Expires: {expiry_date or 'Lifetime'}"
        )
        user_data = get_user(user_id)
        if (
            user_data
            and not user_data["is_bot_blocked"]
            and not user_data["is_banned_by_admin"]
        ):
            plan_name_ar = plan_info["name_ar"]
            expiry_text = "اشتراكك مفعل مدى الحياة."
            message = (
                f"🎉 تهانينا! تم تفعيل اشتراكك في {plan_name_ar} بنجاح.\n{expiry_text}"
            )
            try:
                await context.bot.send_message(chat_id=user_id, text=message)
            except Exception as e:
                logger.warning(
                    f"Failed to send plan activation message to {user_id}: {e}"
                )
                error_msg = str(e).lower()
                if (
                    "bot was blocked by the user" in error_msg
                    or "user is deactivated" in error_msg
                    or "chat not found" in error_msg
                ):
                    set_user_blocked_status(user_id, True)
        return True
    except Exception as e:
        logger.error(f"Error updating plan for user {user_id} to {new_plan_key}: {e}")
        conn.rollback()
        return False
    finally:
        conn.close()


def set_user_blocked_status(user_id: int, is_blocked: bool):
    conn = get_db_connection()
    conn.execute(
        "UPDATE users SET is_bot_blocked = ? WHERE user_id = ?",
        (1 if is_blocked else 0, user_id),
    )
    conn.commit()
    conn.close()
    logger.info(f"User {user_id} bot_blocked status set to {is_blocked}.")


def set_admin_ban_status(user_id: int, is_banned: bool):
    conn = get_db_connection()
    conn.execute(
        "UPDATE users SET is_banned_by_admin = ? WHERE user_id = ?",
        (1 if is_banned else 0, user_id),
    )
    conn.commit()
    conn.close()
    logger.info(f"User {user_id} admin_ban status set to {is_banned}.")


async def try_send_action(
    context: ContextTypes.DEFAULT_TYPE, chat_id: int, action: str = ChatAction.TYPING
) -> bool:
    try:
        await context.bot.send_chat_action(chat_id=chat_id, action=action)
        return True
    except Exception as e:
        error_msg = str(e).lower()
        if (
            "bot was blocked" in error_msg
            or "chat not found" in error_msg
            or "user is deactivated" in error_msg
        ):
            logger.warning(
                f"Bot blocked by/chat not found/user deactivated for user {chat_id}."
            )
            set_user_blocked_status(chat_id, True)
        return False


(UPLOAD_ACCESS_TYPE_CONVO_STATE,) = range(1)
(BROADCAST_CONFIRM_STATE,) = range(1, 2)
admin_upload_data: Dict[int, Dict[str, Any]] = {}
broadcast_data: Dict[int, Dict[str, Any]] = {}


def is_user_banned_by_admin(user_id: int) -> bool:
    user = get_user(user_id)
    return user and user["is_banned_by_admin"] == 1


async def start_command(update: Update, context: ContextTypes.DEFAULT_TYPE):
    user = update.effective_user
    chat_id = update.effective_chat.id
    if is_user_banned_by_admin(user.id):
        return

    if not await try_send_action(context, chat_id):
        return

    existing_user = get_user(user.id)
    is_new_user_flag = False
    referred_by_id = None
    referral_code_used = None
    if context.args and len(context.args) > 0:
        try:
            payload = context.args[0]
            if "_" in payload:
                referral_code_used = payload
                referred_by_id_str = payload.split("_")[0]
                if referred_by_id_str.isdigit():
                    referred_by_id = int(referred_by_id_str)
        except Exception as e:
            logger.warning(f"Error parsing referral payload '{context.args[0]}': {e}")

    if not existing_user:
        new_user_data, is_new_user_flag = add_user(
            user.id,
            user.username,
            user.first_name,
            user.last_name,
            referred_by_id if referred_by_id != user.id else None,
        )
        existing_user = new_user_data
        if is_new_user_flag and existing_user:
            bot_username = context.bot_data.get("bot_username", "YourBotName")
            welcome_message = f"🎉 أهلاً بك يا {user.first_name} في بوت SofagHub!\n\n"
            welcome_message += "الأوامر المتاحة لك:\n"
            welcome_message += (
                "/help - معلومات عن الخطط وكيفية الحصول على فيديوهات مجانية.\n"
            )
            welcome_message += "/premium - لعرض خطط الاشتراك المميزة.\n"
            welcome_message += "/gift - للحصول على فيديو مجاني (كل 4 ساعات).\n"
            welcome_message += f"/all_free - للحصول على رابط الإحالة الخاص بك.\n\n"
            welcome_message += f"🔗 رابط الإحالة الخاص بك:\nhttps://t.me/{bot_username}?start={existing_user['referral_code']}\n"
            welcome_message += "شارك هذا الرابط واكسب رصيدًا لكل صديق ينضم!"
            await update.message.reply_text(welcome_message)
            admin_notification_text = f"👤 مستخدم جديد انضم: <b>{user.first_name or ''} {user.last_name or ''}</b>\n"
            admin_notification_text += (
                f"يوزر: @{user.username or 'N/A'}\nID: <code>{user.id}</code>\n"
            )
            admin_notification_text += f"رابط إحالته: <code>https://t.me/{bot_username}?start={existing_user['referral_code']}</code>\n"
            if referred_by_id and referred_by_id != user.id:
                referrer = get_user(referred_by_id)
                if referrer:
                    conn_ref = get_db_connection()
                    conn_ref.execute(
                        "UPDATE users SET referral_balance = referral_balance + ?, invited_count = invited_count + 1 WHERE user_id = ?",
                        (REFERRAL_BONUS, referrer["user_id"]),
                    )
                    conn_ref.commit()
                    conn_ref.close()
                    admin_notification_text += f"دخل عن طريق: @{referrer['username'] or referrer['first_name']} (ID: <code>{referrer['user_id']}</code>)\n"
                    admin_notification_text += (
                        f"تم إضافة ${REFERRAL_BONUS:.2f} لرصيد المحيل.\n"
                    )
                    if (
                        not referrer["is_bot_blocked"]
                        and not referrer["is_banned_by_admin"]
                    ):
                        try:
                            updated_referrer = get_user(referrer["user_id"])
                            referrer_msg = f"🎉 لقد انضم {user.first_name or 'مستخدم جديد'} (@{user.username or 'N/A'}) عبر رابط إحالتك!\n"
                            referrer_msg += (
                                f"تم إضافة ${REFERRAL_BONUS:.2f} إلى رصيدك.\n"
                            )
                            referrer_msg += f"رصيدك الحالي: ${updated_referrer['referral_balance']:.2f}\n"
                            referrer_msg += f"عدد الدعوات الناجحة: {updated_referrer['invited_count']}"
                            await context.bot.send_message(
                                chat_id=referrer["user_id"], text=referrer_msg
                            )
                        except Exception as e_ref:
                            logger.warning(
                                f"Failed to notify referrer {referrer['user_id']}: {e_ref}"
                            )
                            error_msg_ref = str(e_ref).lower()
                            if (
                                "bot was blocked" in error_msg_ref
                                or "user is deactivated" in error_msg_ref
                                or "chat not found" in error_msg_ref
                            ):
                                set_user_blocked_status(referrer["user_id"], True)
                else:
                    admin_notification_text += f"دخل عن طريق رابط إحالة (<code>{referral_code_used or 'N/A'}</code>) لكن المحيل غير موجود.\n"
            conn_stats = get_db_connection()
            total_users_count_row = conn_stats.execute(
                "SELECT COUNT(*) FROM users"
            ).fetchone()
            total_users_count = total_users_count_row[0] if total_users_count_row else 0
            conn_stats.close()
            admin_notification_text += f"\nإجمالي المستخدمين الآن: {total_users_count}"
            for admin_id_notify in ADMIN_TELEGRAM_IDS:
                try:
                    await context.bot.send_message(
                        chat_id=admin_id_notify,
                        text=admin_notification_text,
                        parse_mode=ParseMode.HTML,
                    )
                except Exception as e_admin_notify:
                    logger.warning(
                        f"Failed to send new user notification to admin {admin_id_notify}: {e_admin_notify}"
                    )
        elif not is_new_user_flag and existing_user:
            await update.message.reply_text(
                f"أهلاً بعودتك يا {user.first_name}!\nاستخدم /help لمعرفة الأوامر أو /premium للاشتراك."
            )
        else:
            await update.message.reply_text("حدث خطأ ما. يرجى المحاولة مرة أخرى.")
            logger.error(
                f"Error in /start for user {user.id}: existing_user is None or add_user failed silently."
            )
    else:
        await update.message.reply_text(
            f"أهلاً بعودتك يا {user.first_name}!\nاستخدم /help لمعرفة الأوامر المتاحة أو /premium للاشتراك."
        )


async def help_command(update: Update, context: ContextTypes.DEFAULT_TYPE):
    if is_user_banned_by_admin(update.effective_user.id):
        return
    if not await try_send_action(context, update.effective_chat.id):
        return
    message = "ℹ️ <b>مساعدة SofagHub</b> ℹ️\n\n"
    message += f"🎁 يمكنك الحصول على فيديو مجاني كل {GIFT_COOLDOWN_HOURS} ساعات باستخدام الأمر: /gift (متاح للخطة المجانية فقط).\n\n"
    message += "✨ <b>خطط الاشتراك المميزة (مدى الحياة):</b>\n"
    message += f"🔹 <b>{PLANS['standard']['name_ar']}</b>: {PLANS['standard']['description_ar']} مقابل ${PLANS['standard']['price']}.\n"
    message += f"🔹 <b>{PLANS['pro']['name_ar']}</b>: {PLANS['pro']['description_ar']} مقابل ${PLANS['pro']['price']}.\n"
    message += f"🔹 <b>{PLANS['ultimate']['name_ar']}</b>: {PLANS['ultimate']['description_ar']} مقابل ${PLANS['ultimate']['price']}.\n\n"
    message += "🔗 لعرض تفاصيل الخطط والاشتراك، استخدم الأمر: /premium\n"
    message += "💰 لدعوة أصدقائك وكسب رصيد، استخدم الأمر: /all_free"
    await update.message.reply_text(message, parse_mode=ParseMode.HTML)


async def premium_command(update: Update, context: ContextTypes.DEFAULT_TYPE):
    if is_user_banned_by_admin(update.effective_user.id):
        return
    if not await try_send_action(context, update.effective_chat.id):
        return
    keyboard = []
    ordered_plans = ["standard", "pro", "ultimate"]
    for plan_key in ordered_plans:
        plan_info = PLANS.get(plan_key)
        if plan_info:
            button_text = f"{plan_info['name_ar']} - ${plan_info['price']} (مدى الحياة)"
            keyboard.append(
                [
                    InlineKeyboardButton(
                        button_text, callback_data=f"subscribe_{plan_key}"
                    )
                ]
            )
    reply_markup = InlineKeyboardMarkup(keyboard)
    await update.message.reply_text(
        "اختر خطة الاشتراك التي تناسبك (جميع الخطط مدى الحياة):",
        reply_markup=reply_markup,
    )


async def premium_callback(update: Update, context: ContextTypes.DEFAULT_TYPE):
    query = update.callback_query
    if is_user_banned_by_admin(query.from_user.id):
        await query.answer()
        return
    await query.answer()
    plan_key = query.data.split("_")[1]
    plan_info = PLANS.get(plan_key)
    if not plan_info:
        await query.edit_message_text("عذراً، الخطة المحددة غير متوفرة.")
        return
    if not await try_send_action(context, query.message.chat_id):
        return
    price_text = f"${plan_info['price']} (مدى الحياة)"
    message = f"✨ <b>تفاصيل {plan_info['name_ar']}</b> ✨\n\n"
    message += f"💰 <b>السعر:</b> {price_text}\n"
    message += f"📝 <b>الوصف الرئيسي:</b> {plan_info['description_ar']}\n\n"
    message += "<b>الميزات التفصيلية:</b>\n"
    if plan_key == "standard":
        message += "   - ✅ الوصول لجميع الفيديوهات المصنفة 'مجاني'.\n"
        message += (
            "   - ✅ مشاهدة هذه الفيديوهات بدون حد زمني (لا يوجد انتظار 4 ساعات).\n"
        )
        message += "   - ❌ لا يشمل الفيديوهات المصنفة 'برو' أو 'فائق'.\n"
        message += "   - ❌ لا يمكن تحميل الفيديوهات.\n"
    elif plan_key == "pro":
        message += "   - ✅ الوصول لجميع الفيديوهات (مجانية، برو، وفائقة).\n"
        message += "   - ✅ جودة عالية للفيديوهات.\n"
        message += "   - ✅ تحديثات مستمرة بمحتوى حصري وجديد.\n"
        message += "   - ✅ تجربة مشاهدة بدون حدود زمنية.\n"
        message += "   - ❌ لا يمكن تحميل الفيديوهات.\n"
    elif plan_key == "ultimate":
        message += "   - ✅ جميع مزايا خطة برو.\n"
        message += "   - ✅ <b>إمكانية تحميل جميع الفيديوهات على جهازك.</b>\n"
        message += "   - ✅ أولوية في الدعم الفني والمساعدة.\n"
    keyboard = [
        [
            InlineKeyboardButton(
                f"تواصل للاشتراك في {plan_info['name_ar']}",
                url=f"https://t.me/{CONTACT_ADMIN_USERNAME}?text=اريد%20الاشتراك%20في%20{plan_info['name_ar'].replace(' ', '%20')}",
            )
        ]
    ]
    reply_markup = InlineKeyboardMarkup(keyboard)
    try:
        await query.edit_message_text(
            message, reply_markup=reply_markup, parse_mode=ParseMode.HTML
        )
    except Exception as e:
        logger.info(f"Could not edit message for premium callback, sending new: {e}")
        await context.bot.send_message(
            chat_id=query.message.chat_id,
            text=message,
            reply_markup=reply_markup,
            parse_mode=ParseMode.HTML,
        )


def get_accessible_videos_for_user(
    user_id: int, plan_key: str, limit: int = 500
) -> List[sqlite3.Row]:
    conn = get_db_connection()
    user_plan_access_level = PLANS.get(plan_key, PLANS["free"])["access_level"]
    query = "SELECT video_db_id, file_id, caption FROM videos WHERE is_hidden = 0 AND ("
    conditions = []
    for vt_key, vt_info in VIDEO_UPLOAD_ACCESS_TYPES.items():
        if vt_info["level"] <= user_plan_access_level:
            conditions.append(f"access_type = '{vt_key}'")
    if not conditions:
        conn.close()
        return []
    query += " OR ".join(conditions)
    query += f") ORDER BY upload_date DESC LIMIT {limit}"
    videos = conn.execute(query).fetchall()
    conn.close()
    return videos


async def send_video_with_navigation(
    context: ContextTypes.DEFAULT_TYPE,
    chat_id: int,
    user_data: sqlite3.Row,
    target_video_db_id: Optional[int] = None,
):
    if is_user_banned_by_admin(chat_id):
        return
    current_plan_key = user_data["plan"]
    user_plan_info = PLANS[current_plan_key]
    all_accessible_videos_rows = get_accessible_videos_for_user(
        user_data["user_id"], current_plan_key
    )
    if not all_accessible_videos_rows:
        await context.bot.send_message(
            chat_id=chat_id, text="عذرًا، لا توجد فيديوهات متاحة في خطتك حاليًا."
        )
        return
    current_video_idx = -1
    video_to_send_details = None
    if target_video_db_id is not None:
        for idx, vid_row in enumerate(all_accessible_videos_rows):
            if vid_row["video_db_id"] == target_video_db_id:
                video_to_send_details = vid_row
                current_video_idx = idx
                break
        if not video_to_send_details:
            logger.warning(
                f"Target video_db_id {target_video_db_id} not found/accessible for user {chat_id} plan {current_plan_key}"
            )
            current_video_idx = 0
            video_to_send_details = all_accessible_videos_rows[current_video_idx]
    else:
        try:
            sent_db_ids_cache = json.loads(user_data["sent_videos_cache"] or "[]")
            if not isinstance(sent_db_ids_cache, list):
                sent_db_ids_cache = []
        except json.JSONDecodeError:
            sent_db_ids_cache = []
        available_for_sending = [
            v
            for v in all_accessible_videos_rows
            if v["video_db_id"] not in sent_db_ids_cache
        ]
        if available_for_sending:
            video_to_send_details = random.choice(available_for_sending)
        elif all_accessible_videos_rows:
            start_index = (user_data.get("current_video_index", 0) + 1) % len(
                all_accessible_videos_rows
            )
            video_to_send_details = all_accessible_videos_rows[start_index]

        else:
            await context.bot.send_message(
                chat_id=chat_id, text="لا توجد فيديوهات جديدة متاحة حاليًا."
            )
            return
        for idx, vid_row in enumerate(all_accessible_videos_rows):
            if vid_row["video_db_id"] == video_to_send_details["video_db_id"]:
                current_video_idx = idx
                break
    if not video_to_send_details or current_video_idx == -1:
        await context.bot.send_message(
            chat_id=chat_id, text="عذرًا، حدث خطأ في اختيار الفيديو."
        )
        return

    current_sent_cache_str = get_user(user_data["user_id"])["sent_videos_cache"]
    try:
        current_sent_cache_list = json.loads(current_sent_cache_str or "[]")
        if not isinstance(current_sent_cache_list, list):
            current_sent_cache_list = []
    except json.JSONDecodeError:
        current_sent_cache_list = []

    if video_to_send_details["video_db_id"] not in current_sent_cache_list:
        current_sent_cache_list.append(video_to_send_details["video_db_id"])

    conn_update_cache = get_db_connection()
    conn_update_cache.execute(
        "UPDATE users SET sent_videos_cache = ?, current_video_index = ? WHERE user_id = ?",
        (json.dumps(current_sent_cache_list), current_video_idx, user_data["user_id"]),
    )
    conn_update_cache.commit()
    conn_update_cache.close()

    caption = f"🎬 {video_to_send_details['caption'] or 'فيديو من SofagHub'}\n\n"
    caption += f"🎞️ الفيديو {current_video_idx + 1} من {len(all_accessible_videos_rows)} المتاح لك في خطتك."
    protect = not (
        user_data["user_id"] in ADMIN_TELEGRAM_IDS or user_plan_info["can_download"]
    )
    keyboard_nav_buttons = []
    if current_video_idx > 0:
        prev_video_db_id = all_accessible_videos_rows[current_video_idx - 1][
            "video_db_id"
        ]
        keyboard_nav_buttons.append(
            InlineKeyboardButton(
                "◀️ السابق", callback_data=f"navigatevideo_vid_{prev_video_db_id}"
            )
        )
    if current_video_idx < len(all_accessible_videos_rows) - 1:
        next_video_db_id = all_accessible_videos_rows[current_video_idx + 1][
            "video_db_id"
        ]
        keyboard_nav_buttons.append(
            InlineKeyboardButton(
                "التالي ▶️", callback_data=f"navigatevideo_vid_{next_video_db_id}"
            )
        )
    reply_markup_nav = (
        InlineKeyboardMarkup([keyboard_nav_buttons]) if keyboard_nav_buttons else None
    )
    try:
        if not await try_send_action(context, chat_id, ChatAction.UPLOAD_VIDEO):
            return
        await context.bot.send_video(
            chat_id=chat_id,
            video=video_to_send_details["file_id"],
            caption=caption,
            protect_content=protect,
            reply_markup=reply_markup_nav,
        )
    except Exception as e:
        logger.error(
            f"Failed to send video {video_to_send_details['file_id']} to {chat_id} with nav: {e}"
        )
        error_msg = str(e).lower()
        if (
            "bot was blocked" in error_msg
            or "user is deactivated" in error_msg
            or "chat not found" in error_msg
        ):
            set_user_blocked_status(chat_id, True)


async def navigate_video_callback(update: Update, context: ContextTypes.DEFAULT_TYPE):
    query = update.callback_query
    user_id = query.from_user.id
    if is_user_banned_by_admin(user_id):
        await query.answer()
        return
    await query.answer()
    if not await try_send_action(context, user_id):
        return
    user_data = get_user(user_id)
    if not user_data or user_data["plan"] == "free":
        try:
            await query.edit_message_text(
                "ميزة التنقل متاحة للمشتركين فقط.", reply_markup=None
            )
        except Exception:
            await context.bot.send_message(
                chat_id=user_id, text="ميزة التنقل متاحة للمشتركين فقط."
            )
        return
    try:
        await query.message.delete()
    except Exception as e:
        logger.warning(
            f"Could not delete previous video message for nav by user {user_id}: {e}"
        )
    parts = query.data.split("_")
    try:
        target_video_db_id = int(parts[2])
    except (IndexError, ValueError):
        logger.error(
            f"Invalid navigate_video_callback data: {query.data} for user {user_id}"
        )
        await context.bot.send_message(
            chat_id=user_id, text="حدث خطأ في بيانات التنقل. حاول مرة أخرى."
        )
        return
    await send_video_with_navigation(
        context, user_id, user_data, target_video_db_id=target_video_db_id
    )


async def gift_command(update: Update, context: ContextTypes.DEFAULT_TYPE):
    user_id = update.effective_user.id
    if is_user_banned_by_admin(user_id):
        return
    if not await try_send_action(context, user_id):
        return
    user_data = get_user(user_id)
    if not user_data:
        await update.message.reply_text(
            "يرجى استخدام الأمر /start أولاً لتسجيلك في البوت."
        )
        return
    current_plan_key = user_data["plan"]
    if current_plan_key != "free":
        plan_info = PLANS[current_plan_key]
        await update.message.reply_text(
            f"ميزة الفيديو المجاني بالعداد الزمني مخصصة للخطة المجانية.\nأنت مشترك في {plan_info['name_ar']}. يمكنك استخدام الأمر /send للحصول على فيديوهات خطتك بدون انتظار."
        )
        return
    last_gift_time_str = user_data["last_gift_time"]
    if last_gift_time_str:
        last_gift_time = datetime.datetime.fromisoformat(last_gift_time_str)
        cooldown_delta = datetime.timedelta(hours=GIFT_COOLDOWN_HOURS)
        if datetime.datetime.now() < last_gift_time + cooldown_delta:
            remaining_time = (last_gift_time + cooldown_delta) - datetime.datetime.now()
            hours, remainder = divmod(remaining_time.total_seconds(), 3600)
            minutes, _ = divmod(remainder, 60)
            await update.message.reply_text(
                f"⏳ لقد استخدمت هذه الميزة مؤخرًا. يرجى الانتظار {int(hours)} ساعة و {int(minutes)} دقيقة أخرى."
            )
            return
    conn_videos = get_db_connection()
    video_to_send = conn_videos.execute(
        "SELECT * FROM videos WHERE is_hidden = 0 AND access_type = 'free' ORDER BY RANDOM() LIMIT 1"
    ).fetchone()
    conn_videos.close()
    if video_to_send:
        conn_update_time = get_db_connection()
        conn_update_time.execute(
            "UPDATE users SET last_gift_time = ? WHERE user_id = ?",
            (datetime.datetime.now().isoformat(), user_id),
        )
        conn_update_time.commit()
        conn_update_time.close()
        caption = (
            f"🎁 هديتك من SofagHub:\n{video_to_send['caption'] or 'فيديو مميز'}\n\n"
        )
        caption += f"استمتع بالمشاهدة! يمكنك طلب فيديو آخر بعد {GIFT_COOLDOWN_HOURS} ساعات.\n<i>سيتم حذف هذا الفيديو بعد 10 دقائق.</i>"
        protect_content = True
        if not await try_send_action(context, user_id, ChatAction.UPLOAD_VIDEO):
            return
        try:
            sent_message = await context.bot.send_video(
                chat_id=user_id,
                video=video_to_send["file_id"],
                caption=caption,
                protect_content=protect_content,
                parse_mode=ParseMode.HTML,
            )

            context.job_queue.run_once(
                delete_message_job,
                when=datetime.timedelta(minutes=10),
                data={"chat_id": user_id, "message_id": sent_message.message_id},
                name=f"del_{user_id}_{sent_message.message_id}",
            )
        except Exception as e:
            logger.error(
                f"Failed to send gift video {video_to_send['file_id']} to {user_id}: {e}"
            )
            await update.message.reply_text(
                "عذرًا، حدث خطأ أثناء إرسال الفيديو. حاول لاحقًا."
            )
    else:
        await update.message.reply_text(
            "عذرًا، لا توجد فيديوهات مجانية متاحة حاليًا كهدية. حاول مرة أخرى لاحقًا."
        )


async def delete_message_job(context: ContextTypes.DEFAULT_TYPE):
    job_data = context.job.data
    chat_id = job_data["chat_id"]
    message_id = job_data["message_id"]
    try:
        await context.bot.delete_message(chat_id=chat_id, message_id=message_id)
        logger.info(
            f"Successfully deleted gift video message {message_id} from chat {chat_id}."
        )
    except BadRequest as e:
        logger.warning(
            f"Could not delete gift video message {message_id} from chat {chat_id}: {e.message}"
        )
    except Exception as e:
        logger.error(
            f"Unexpected error deleting gift video message {message_id} from chat {chat_id}: {e}"
        )


async def all_free_command(update: Update, context: ContextTypes.DEFAULT_TYPE):
    user_id = update.effective_user.id
    if is_user_banned_by_admin(user_id):
        return
    if not await try_send_action(context, user_id):
        return
    user_data = get_user(user_id)
    if not user_data:
        await update.message.reply_text(
            "يرجى استخدام الأمر /start أولاً لتسجيلك في البوت."
        )
        return
    bot_username = context.bot_data.get("bot_username", "YourBotName")
    referral_link = f"https://t.me/{bot_username}?start={user_data['referral_code']}"
    message = f"💰 <b>اكسب رصيدًا مع SofagHub!</b> 💰\n\n"
    message += f"شارك رابط الإحالة الخاص بك مع أصدقائك. لكل صديق ينضم عبر رابطك، ستحصل على رصيد بقيمة <b>${REFERRAL_BONUS:.2f}</b> يمكنك استخدامه للاشتراك في الخطط المدفوعة!\n\n"
    message += f"🔗 <b>رابط الإحالة الخاص بك:</b>\n<code>{referral_link}</code>\n\n"
    message += f"💸 <b>رصيدك الحالي:</b> ${user_data['referral_balance']:.2f}\n"
    message += f"👥 <b>عدد الأصدقاء الذين دعوتهم:</b> {user_data['invited_count']}"
    await update.message.reply_text(message, parse_mode=ParseMode.HTML)


async def send_command(update: Update, context: ContextTypes.DEFAULT_TYPE):
    user_id = update.effective_user.id
    if is_user_banned_by_admin(user_id):
        return
    if not await try_send_action(context, user_id):
        return
    user_data = get_user(user_id)
    if not user_data:
        await update.message.reply_text(
            "يرجى استخدام الأمر /start أولاً لتسجيلك في البوت."
        )
        return
    current_plan_key = user_data["plan"]
    if current_plan_key == "free":
        await update.message.reply_text(
            "أصحاب الخطة المجانية يستخدمون /gift للحصول على فيديو كل 4 ساعات. للاشتراك ومشاهدة المزيد، استخدم /premium."
        )
        return
    await send_video_with_navigation(
        context, user_id, user_data, target_video_db_id=None
    )


ADMIN_PANEL_TEXT = "🛠️ <b>لوحة تحكم المدير</b> 🛠️\nاختر الإجراء المطلوب:"


def get_admin_panel_keyboard():
    keyboard = [
        [InlineKeyboardButton("📊 عرض الإحصائيات", callback_data="admin_panel_stats")],
        [
            InlineKeyboardButton(
                "➕ تعديل خطة مستخدم", callback_data="admin_panel_manage_plan"
            )
        ],
        [
            InlineKeyboardButton(
                "🚫 حظر/إلغاء حظر مستخدم", callback_data="admin_panel_ban_user"
            )
        ],
        [
            InlineKeyboardButton(
                "📤 لرفع فيديو: أرسل الفيديو مباشرة",
                callback_data="admin_panel_info_upload",
            )
        ],
        [
            InlineKeyboardButton(
                "⚙️ وضع الرفع التلقائي المجاني",
                callback_data="admin_panel_toggle_autofree",
            )
        ],
    ]
    return InlineKeyboardMarkup(keyboard)


async def admin_command(update: Update, context: ContextTypes.DEFAULT_TYPE):
    user_id = update.effective_user.id
    if user_id not in ADMIN_TELEGRAM_IDS:
        return
    if not await try_send_action(context, user_id):
        return
    context.user_data.pop("admin_next_message_is_userid_for_action", None)
    context.user_data.pop("admin_action_type", None)
    await update.message.reply_text(
        ADMIN_PANEL_TEXT,
        reply_markup=get_admin_panel_keyboard(),
        parse_mode=ParseMode.HTML,
    )


async def admin_panel_callback(update: Update, context: ContextTypes.DEFAULT_TYPE):
    query = update.callback_query
    await query.answer()
    admin_id = query.from_user.id
    if admin_id not in ADMIN_TELEGRAM_IDS:
        return
    if not await try_send_action(context, admin_id):
        return
    action = query.data
    context.user_data.pop("admin_next_message_is_userid_for_action", None)
    context.user_data.pop("admin_action_type", None)

    if action == "admin_panel_stats":
        await stats_command_direct(update, context, called_from_panel=True)
    elif action == "admin_panel_manage_plan":
        await query.edit_message_text(
            "الرجاء إرسال <b>معرف المستخدم (User ID)</b> الذي تريد تعديل خطته:",
            parse_mode=ParseMode.HTML,
        )
        context.user_data["admin_next_message_is_userid_for_action"] = "manage_plan"
    elif action == "admin_panel_ban_user":
        await query.edit_message_text(
            "الرجاء إرسال <b>معرف المستخدم (User ID)</b> الذي تريد حظره أو إلغاء حظره:",
            parse_mode=ParseMode.HTML,
        )
        context.user_data["admin_next_message_is_userid_for_action"] = "ban_unban_user"
    elif action == "admin_panel_info_upload":
        await query.edit_message_text(
            "لرفع فيديو جديد، قم بإرسال ملف الفيديو مباشرة إلى هذه المحادثة. سأقوم بسؤالك عن نوع الوصول بعد ذلك.\n\nاستخدم /admin للعودة للوحة التحكم.",
            parse_mode=ParseMode.HTML,
        )
    elif action == "admin_panel_toggle_autofree":
        current_mode = get_bot_setting("auto_free_upload_mode") == "true"
        new_mode = not current_mode
        set_bot_setting("auto_free_upload_mode", "true" if new_mode else "false")
        await query.edit_message_text(
            f"وضع الرفع التلقائي المجاني الآن: <b>{'مفعل ✅' if new_mode else 'معطل ❌'}</b>",
            reply_markup=get_admin_panel_keyboard(),
            parse_mode=ParseMode.HTML,
        )
    elif action == "admin_export_users_txt":
        await admin_export_users_txt_callback_logic(query, context, admin_id)


async def admin_text_handler(update: Update, context: ContextTypes.DEFAULT_TYPE):
    admin_id = update.effective_user.id
    if (
        admin_id not in ADMIN_TELEGRAM_IDS
        or "admin_next_message_is_userid_for_action" not in context.user_data
    ):
        return
    if not await try_send_action(context, admin_id):
        return

    expected_context_action = context.user_data.pop(
        "admin_next_message_is_userid_for_action"
    )
    target_user_id_str = update.message.text.strip()

    if not target_user_id_str.isdigit():
        await update.message.reply_text(
            "معرف المستخدم يجب أن يكون رقمًا. حاول مرة أخرى أو أرسل /admin للبدء من جديد."
        )
        context.user_data["admin_next_message_is_userid_for_action"] = (
            expected_context_action
        )
        return

    target_user_id = int(target_user_id_str)
    target_user = get_user(target_user_id)

    if not target_user:
        await update.message.reply_text(
            f"لم يتم العثور على مستخدم بالمعرف <code>{target_user_id}</code>. تأكد من المعرف وحاول مرة أخرى.",
            parse_mode=ParseMode.HTML,
        )
        await admin_command(update, context)
        return

    if expected_context_action == "manage_plan":
        current_plan_name = PLANS.get(
            target_user["plan"], {"name_ar": target_user["plan"]}
        )["name_ar"]
        message = f"المستخدم: @{target_user['username'] or target_user['first_name']} (ID: <code>{target_user_id}</code>)\n"
        message += f"الخطة الحالية: <b>{current_plan_name}</b>\n\nاختر الإجراء أو الخطة الجديدة:"
        keyboard_manage = []
        for plan_key_loop, plan_info_loop in PLANS.items():
            if plan_key_loop == target_user["plan"] and plan_key_loop != "free":
                continue
            if plan_key_loop != "free":
                keyboard_manage.append(
                    [
                        InlineKeyboardButton(
                            f"✅ تفعيل {plan_info_loop['name_ar']}",
                            callback_data=f"setplan_{plan_key_loop}_{target_user_id}",
                        )
                    ]
                )
        if target_user["plan"] != "free":
            keyboard_manage.append(
                [
                    InlineKeyboardButton(
                        f"🗑️ إزالة الخطة (إلى المجانية)",
                        callback_data=f"setplan_free_{target_user_id}",
                    )
                ]
            )
        keyboard_manage.append(
            [
                InlineKeyboardButton(
                    "🔙 إلغاء والعودة للوحة",
                    callback_data="admin_panel_back_from_setplan",
                )
            ]
        )
        if not keyboard_manage or (
            len(keyboard_manage) == 1
            and keyboard_manage[0][0].callback_data.startswith("admin_panel_back")
        ):
            await update.message.reply_text(
                f"المستخدم <code>{target_user_id}</code> على الخطة المجانية بالفعل أو لا يمكن تعديل خطته الحالية أكثر.",
                reply_markup=get_admin_panel_keyboard(),
                parse_mode=ParseMode.HTML,
            )
        else:
            await update.message.reply_text(
                message,
                reply_markup=InlineKeyboardMarkup(keyboard_manage),
                parse_mode=ParseMode.HTML,
            )

    elif expected_context_action == "ban_unban_user":
        is_currently_banned = target_user["is_banned_by_admin"] == 1
        action_text = "إلغاء حظر" if is_currently_banned else "حظر"
        keyboard_ban = [
            [
                InlineKeyboardButton(
                    f"{'✅ إلغاء حظر' if is_currently_banned else '🚫 حظر'} المستخدم",
                    callback_data=f"confirmban_{'unban' if is_currently_banned else 'ban'}_{target_user_id}",
                )
            ],
            [
                InlineKeyboardButton(
                    "🔙 إلغاء والعودة للوحة",
                    callback_data="admin_panel_back_from_setplan",
                )
            ],
        ]
        status_text = "محظور حاليًا" if is_currently_banned else "غير محظور حاليًا"
        await update.message.reply_text(
            f"المستخدم: @{target_user['username'] or target_user['first_name']} (ID: <code>{target_user_id}</code>)\nالحالة: {status_text}.\nهل تريد {action_text} هذا المستخدم؟",
            reply_markup=InlineKeyboardMarkup(keyboard_ban),
            parse_mode=ParseMode.HTML,
        )


async def admin_confirm_ban_unban_callback(
    update: Update, context: ContextTypes.DEFAULT_TYPE
):
    query = update.callback_query
    await query.answer()
    admin_id = query.from_user.id
    if admin_id not in ADMIN_TELEGRAM_IDS:
        return

    parts = query.data.split("_")
    action_to_take = parts[1]
    target_user_id = int(parts[2])

    target_user = get_user(target_user_id)
    if not target_user:
        await query.edit_message_text(
            f"خطأ: لم يتم العثور على المستخدم بالمعرف <code>{target_user_id}</code>.",
            reply_markup=get_admin_panel_keyboard(),
            parse_mode=ParseMode.HTML,
        )
        return

    new_ban_status = 1 if action_to_take == "ban" else 0
    set_admin_ban_status(target_user_id, new_ban_status == 1)

    action_done_text = "حظره" if new_ban_status == 1 else "إلغاء حظره"
    final_message = f"✅ تم {action_done_text} المستخدم <code>{target_user_id}</code> (@{target_user['username'] or target_user['first_name']}) بنجاح."

    if new_ban_status == 1:
        if await try_send_action(context, target_user_id):
            try:
                await context.bot.send_message(
                    chat_id=target_user_id,
                    text="لقد تم حظرك من استخدام هذا البوت بواسطة الإدارة.",
                )
            except Exception as e:
                logger.warning(
                    f"Could not send ban notification to {target_user_id}: {e}"
                )

    await query.edit_message_text(
        final_message,
        reply_markup=get_admin_panel_keyboard(),
        parse_mode=ParseMode.HTML,
    )


async def admin_set_plan_callback(update: Update, context: ContextTypes.DEFAULT_TYPE):
    query = update.callback_query
    await query.answer()
    admin_id = query.from_user.id
    if admin_id not in ADMIN_TELEGRAM_IDS:
        return
    if not await try_send_action(context, admin_id):
        return
    if query.data == "admin_panel_back_from_setplan":
        await query.edit_message_text(
            ADMIN_PANEL_TEXT,
            reply_markup=get_admin_panel_keyboard(),
            parse_mode=ParseMode.HTML,
        )
        return
    parts = query.data.split("_")
    new_plan_key = parts[1]
    target_user_id = int(parts[2])
    target_user = get_user(target_user_id)
    if not target_user:
        await query.edit_message_text(
            f"خطأ: لم يتم العثور على المستخدم بالمعرف <code>{target_user_id}</code>.",
            reply_markup=get_admin_panel_keyboard(),
            parse_mode=ParseMode.HTML,
        )
        return

    can_message_user = await try_send_action(context, target_user_id, ChatAction.TYPING)
    if (
        not can_message_user
        and not target_user["is_bot_blocked"]
        and not target_user["is_banned_by_admin"]
    ):
        set_user_blocked_status(target_user_id, True)
        await query.edit_message_text(
            f"⚠️ تحذير: لا يمكن الوصول للمستخدم <code>{target_user_id}</code> (قد يكون البوت محظورًا لديه).\nالعملية ستتم في قاعدة البيانات، لكنه لن يستقبل إشعارًا فوريًا.",
            reply_markup=get_admin_panel_keyboard(),
            parse_mode=ParseMode.HTML,
        )

    success = await update_user_plan(context, target_user_id, new_plan_key)
    new_plan_name = PLANS[new_plan_key]["name_ar"]
    user_mention = (
        f"@{target_user['username']}"
        if target_user["username"]
        else target_user["first_name"]
    )
    if success:
        await query.edit_message_text(
            f"✅ تم تغيير خطة المستخدم <code>{target_user_id}</code> ({user_mention}) إلى <b>{new_plan_name}</b> بنجاح.",
            reply_markup=get_admin_panel_keyboard(),
            parse_mode=ParseMode.HTML,
        )
    else:
        await query.edit_message_text(
            f"❌ فشلت عملية تغيير خطة المستخدم <code>{target_user_id}</code> إلى <b>{new_plan_name}</b>.",
            reply_markup=get_admin_panel_keyboard(),
            parse_mode=ParseMode.HTML,
        )


async def stats_command_direct(
    update: Union[Update, CallbackQueryHandler],
    context: ContextTypes.DEFAULT_TYPE,
    called_from_panel: bool = False,
):
    effective_message = (
        update.message
        if hasattr(update, "message") and update.message
        else update.callback_query.message
    )
    user_id = effective_message.chat_id
    if user_id not in ADMIN_TELEGRAM_IDS:
        return
    if not await try_send_action(context, user_id):
        return
    try:
        await context.bot.send_chat_action(chat_id=user_id, action=ChatAction.TYPING)
        conn = get_db_connection()
        total_users_row = conn.execute("SELECT COUNT(*) as count FROM users").fetchone()
        total_users = total_users_row["count"] if total_users_row else 0
        banned_users_row = conn.execute(
            "SELECT COUNT(*) as count FROM users WHERE is_banned_by_admin = 1"
        ).fetchone()
        banned_users = banned_users_row["count"] if banned_users_row else 0

        plans_counts = {key: 0 for key in PLANS.keys()}
        rows = conn.execute(
            "SELECT plan, COUNT(*) as count FROM users WHERE is_banned_by_admin = 0 GROUP BY plan"
        ).fetchall()
        for row in rows:
            if row["plan"] in plans_counts:
                plans_counts[row["plan"]] = row["count"]

        total_videos_row = conn.execute(
            "SELECT COUNT(*) as count FROM videos WHERE is_hidden = 0"
        ).fetchone()
        total_videos = total_videos_row["count"] if total_videos_row else 0

        videos_by_access = {key: 0 for key in VIDEO_UPLOAD_ACCESS_TYPES.keys()}
        video_rows_db = conn.execute(
            "SELECT access_type, COUNT(*) as count FROM videos WHERE is_hidden = 0 GROUP BY access_type"
        ).fetchall()
        for row_vid in video_rows_db:
            if row_vid["access_type"] in videos_by_access:
                videos_by_access[row_vid["access_type"]] = row_vid["count"]
        conn.close()

        message_stats = f"📊 <b>إحصائيات SofagHub</b> ({datetime.datetime.now().strftime('%Y-%m-%d %H:%M')}) 📊\n\n"
        message_stats += f"👥 <b>إجمالي المستخدمين المسجلين:</b> {total_users}\n"
        message_stats += f"🚫 <b>المستخدمين المحظورين:</b> {banned_users}\n"
        message_stats += f"📹 <b>إجمالي الفيديوهات المتاحة:</b> {total_videos}\n\n"
        message_stats += f"📜 <b>توزيع خطط المستخدمين (النشطين):</b>\n"
        for plan_key_s, plan_info_s in PLANS.items():
            message_stats += (
                f"  - {plan_info_s['name_ar']}: {plans_counts.get(plan_key_s, 0)}\n"
            )
        message_stats += f"\n🎞️ <b>توزيع أنواع الفيديوهات المرفوعة:</b>\n"
        for type_key_s, type_info_s in VIDEO_UPLOAD_ACCESS_TYPES.items():
            message_stats += (
                f"  - {type_info_s['name_ar']}: {videos_by_access.get(type_key_s,0)}\n"
            )

        keyboard_stats = [
            [
                InlineKeyboardButton(
                    "🧾 إرسال بيانات المستخدمين (TXT)",
                    callback_data="admin_export_users_txt",
                )
            ]
        ]
        if (
            called_from_panel
            and hasattr(update, "callback_query")
            and update.callback_query
        ):
            await update.callback_query.edit_message_text(
                message_stats,
                reply_markup=InlineKeyboardMarkup(keyboard_stats),
                parse_mode=ParseMode.HTML,
            )
        elif hasattr(update, "message") and update.message:
            await update.message.reply_text(
                message_stats,
                reply_markup=InlineKeyboardMarkup(keyboard_stats),
                parse_mode=ParseMode.HTML,
            )
        else:
            await context.bot.send_message(
                chat_id=user_id,
                text=message_stats,
                reply_markup=InlineKeyboardMarkup(keyboard_stats),
                parse_mode=ParseMode.HTML,
            )
    except Exception as e:
        logger.error(f"[BOT stats_command_direct] Error: {e}")
        await effective_message.reply_text("حدث خطأ أثناء جلب الإحصائيات.")


async def admin_export_users_txt_callback_logic(
    query_or_update: Union[Update, CallbackQueryHandler],
    context: ContextTypes.DEFAULT_TYPE,
    admin_id: int,
):
    if not await try_send_action(context, admin_id, ChatAction.UPLOAD_DOCUMENT):
        return
    try:
        conn = get_db_connection()
        users_export = conn.execute(
            "SELECT user_id, username, first_name, plan, referral_code, referred_by, referral_balance, invited_count, is_banned_by_admin, strftime('%Y-%m-%d %H:%M', registration_date) as reg_date, strftime('%Y-%m-%d %H:%M', plan_start_date) as p_start, strftime('%Y-%m-%d %H:%M', plan_expiry_date) as p_expiry FROM users ORDER BY registration_date DESC"
        ).fetchall()
        conn.close()
        msg_target_export = (
            query_or_update.message
            if hasattr(query_or_update, "message") and query_or_update.message
            else query_or_update.callback_query.message
        )
        if not users_export:
            await msg_target_export.reply_text(
                "لا يوجد مستخدمون مسجلون.", reply_markup=get_admin_panel_keyboard()
            )
            return
        txt_content = f"بيانات مستخدمي SofagHub - {datetime.datetime.now().strftime('%Y-%m-%d %H:%M')}\n"
        txt_content += (
            "===============================================================\n"
        )
        for user_r_export in users_export:
            txt_content += f"User ID: {user_r_export['user_id']}\n"
            txt_content += f"  Username: @{user_r_export['username'] or 'N/A'}\n"
            txt_content += f"  First Name: {user_r_export['first_name'] or 'N/A'}\n"
            txt_content += f"  Plan: {PLANS.get(user_r_export['plan'], {'name_ar': user_r_export['plan']})['name_ar']}\n"
            if user_r_export["p_start"]:
                txt_content += f"  Plan Start: {user_r_export['p_start']}\n"
            txt_content += (
                f"  Plan Expiry: {user_r_export['p_expiry'] or 'مدى الحياة'}\n"
            )
            txt_content += f"  Referral Code: {user_r_export['referral_code']}\n"
            if user_r_export["referred_by"]:
                txt_content += f"  Referred By ID: {user_r_export['referred_by']}\n"
            txt_content += (
                f"  Referral Balance: ${user_r_export['referral_balance']:.2f}\n"
            )
            txt_content += f"  Invited Count: {user_r_export['invited_count']}\n"
            txt_content += f"  Registration Date: {user_r_export['reg_date']}\n"
            txt_content += f"  Banned by Admin: {'نعم' if user_r_export['is_banned_by_admin'] else 'لا'}\n"
            txt_content += (
                "---------------------------------------------------------------\n"
            )
        filename = (
            f"sofaghub_users_{datetime.datetime.now().strftime('%Y%m%d_%H%M%S')}.txt"
        )
        await context.bot.send_document(
            chat_id=admin_id, document=txt_content.encode("utf-8"), filename=filename
        )
        if (
            hasattr(query_or_update, "callback_query")
            and query_or_update.callback_query
        ):
            await query_or_update.callback_query.message.reply_text(
                "تم إرسال ملف بيانات المستخدمين.",
                reply_markup=get_admin_panel_keyboard(),
            )
            try:
                await query_or_update.callback_query.edit_message_reply_markup(
                    reply_markup=None
                )
            except Exception:
                pass
        elif hasattr(query_or_update, "message"):
            await query_or_update.message.reply_text(
                "تم إرسال ملف بيانات المستخدمين.",
                reply_markup=get_admin_panel_keyboard(),
            )
    except Exception as e:
        logger.error(f"Error exporting users TXT: {e}")
        msg_target_err_export = (
            query_or_update.message
            if hasattr(query_or_update, "message") and query_or_update.message
            else query_or_update.callback_query.message
        )
        await msg_target_err_export.reply_text(
            "حدث خطأ أثناء تصدير بيانات المستخدمين.",
            reply_markup=get_admin_panel_keyboard(),
        )


async def admin_export_users_txt_callback(
    update: Update, context: ContextTypes.DEFAULT_TYPE
):
    query = update.callback_query
    await query.answer("جاري تجهيز الملف...")
    admin_id = query.from_user.id
    if admin_id not in ADMIN_TELEGRAM_IDS:
        return
    await admin_export_users_txt_callback_logic(update, context, admin_id)


async def sendall_command(
    update: Update, context: ContextTypes.DEFAULT_TYPE, continuation_offset: int = 0
):
    user_id = update.effective_user.id
    if user_id != MAIN_ADMIN_ID:
        logger.warning(f"Unauthorized /sendall attempt by user {user_id}")
        return
    if not await try_send_action(context, user_id, ChatAction.TYPING):
        return

    conn = get_db_connection()

    videos = conn.execute(
        f"SELECT file_id, caption FROM videos WHERE is_hidden = 0 ORDER BY upload_date DESC LIMIT -1 OFFSET {continuation_offset}"
    ).fetchall()
    conn.close()

    if not videos:
        if continuation_offset == 0:
            await update.message.reply_text(
                "لا توجد فيديوهات في قاعدة البيانات لإرسالها."
            )
        else:
            await context.bot.send_message(
                chat_id=user_id, text="اكتمل إرسال جميع الفيديوهات المتبقية."
            )
        return

    if continuation_offset == 0:
        await update.message.reply_text(
            f"تم العثور على {len(videos)} فيديو (بدءًا من الأحدث). سأقوم بإرسالهم لك الآن. قد يستغرق هذا بعض الوقت..."
        )
    else:
        await context.bot.send_message(
            chat_id=user_id,
            text=f"جاري استكمال إرسال الفيديوهات... ({len(videos)} متبقي)",
        )

    sent_this_batch = 0
    failed_this_batch = 0
    total_processed_in_batch = 0

    for video_row_sa in videos:
        if not await try_send_action(context, user_id, ChatAction.UPLOAD_VIDEO):
            await context.bot.send_message(
                chat_id=user_id,
                text="فشلت محاولة إرسال ChatAction، ربما تم حظر البوت. توقفت العملية.",
            )
            break
        try:
            await context.bot.send_video(
                chat_id=user_id,
                video=video_row_sa["file_id"],
                caption=f"{video_row_sa['caption'] or 'فيديو من الأرشيف'}",
                protect_content=False,
            )
            sent_this_batch += 1
            await asyncio.sleep(random.uniform(0.5, 1.2))
        except Exception as e:
            logger.error(
                f"Failed to send video {video_row_sa['file_id']} to MAIN_ADMIN during /sendall: {e}"
            )
            failed_this_batch += 1
            error_msg_sa = str(e).lower()
            if (
                "bot was blocked" in error_msg_sa
                or "user is deactivated" in error_msg_sa
                or "chat not found" in error_msg_sa
            ):
                await context.bot.send_message(
                    chat_id=user_id,
                    text="تم حظر البوت أو المستخدم غير موجود. توقفت العملية.",
                )
                break
            await asyncio.sleep(0.5)

        total_processed_in_batch += 1
        if total_processed_in_batch % 100 == 0 and total_processed_in_batch < len(
            videos
        ):
            new_offset = continuation_offset + total_processed_in_batch
            keyboard_continue = [
                [
                    InlineKeyboardButton(
                        "نعم، أكمل الإرسال",
                        callback_data=f"sendall_continue_{new_offset}",
                    ),
                    InlineKeyboardButton("لا، توقف الآن", callback_data="sendall_stop"),
                ]
            ]
            await context.bot.send_message(
                chat_id=user_id,
                text=f"تم إرسال {total_processed_in_batch} فيديو حتى الآن في هذه الدفعة. هل تريد المتابعة؟",
                reply_markup=InlineKeyboardMarkup(keyboard_continue),
            )
            return

    final_message = f"✅ انتهت دفعة /sendall.\nتم إرسال {sent_this_batch} فيديو بنجاح.\nفشل إرسال {failed_this_batch} فيديو في هذه الدفعة."
    if total_processed_in_batch < len(videos):
        final_message += "\nلم يتم إرسال جميع الفيديوهات."
    await context.bot.send_message(chat_id=user_id, text=final_message)


async def sendall_callback(update: Update, context: ContextTypes.DEFAULT_TYPE):
    query = update.callback_query
    await query.answer()
    admin_id = query.from_user.id
    if admin_id != MAIN_ADMIN_ID:
        return

    action = query.data.split("_")[1]
    if action == "stop":
        await query.edit_message_text("تم إيقاف عملية /sendall بناءً على طلبك.")
    elif action == "continue":
        offset = int(query.data.split("_")[2])
        await query.edit_message_text(
            f"جاري استئناف إرسال الفيديوهات من الفيديو رقم {offset + 1}..."
        )

        await sendall_command(update, context, continuation_offset=offset)


async def upload_video_entry_point(
    update: Update, context: ContextTypes.DEFAULT_TYPE
) -> int:
    user_id = update.effective_user.id
    if user_id not in ADMIN_TELEGRAM_IDS:
        return ConversationHandler.END
    if not await try_send_action(context, user_id):
        return ConversationHandler.END

    admin_upload_data[user_id] = {}
    video = update.message.video
    if not video:
        await update.message.reply_text(
            "خطأ: لم يتم استلام الفيديو بشكل صحيح. حاول مرة أخرى."
        )
        return ConversationHandler.END

    admin_upload_data[user_id]["file_id"] = video.file_id
    admin_upload_data[user_id]["duration"] = video.duration
    video_caption = update.message.caption
    if not video_caption:
        video_caption = "حصريات تانجو"
    admin_upload_data[user_id]["caption"] = video_caption

    logger.info(
        f"Admin {user_id} sent video. File ID: {video.file_id}. Caption to use: '{video_caption}'"
    )

    auto_free_mode = get_bot_setting("auto_free_upload_mode") == "true"
    if auto_free_mode:
        admin_upload_data[user_id]["access_type"] = "free"
        logger.info(f"Auto-free mode ON. Saving video from {user_id} as free.")

        return await upload_access_type_selected_callback(update, context)

    keyboard = []
    for type_key_ul, type_info_ul in VIDEO_UPLOAD_ACCESS_TYPES.items():
        keyboard.append(
            [
                InlineKeyboardButton(
                    type_info_ul["name_ar"],
                    callback_data=f"uploadsetaccess_{type_key_ul}",
                )
            ]
        )
    reply_markup = InlineKeyboardMarkup(keyboard)
    await update.message.reply_text(
        f'تم استلام الفيديو بالكابشن: "{video_caption}".\n\nاختر نوع الوصول للفيديو (الخطة المطلوبة لمشاهدته):',
        reply_markup=reply_markup,
        parse_mode=ParseMode.HTML,
    )
    return UPLOAD_ACCESS_TYPE_CONVO_STATE


async def upload_access_type_selected_callback(
    update: Update, context: ContextTypes.DEFAULT_TYPE
) -> int:
    query = update.callback_query

    admin_id = -1
    is_auto_free_call = False

    if query and hasattr(query, "from_user"):
        admin_id = query.from_user.id
        await query.answer()
    elif (
        hasattr(update, "effective_user")
        and update.effective_user
        and get_bot_setting("auto_free_upload_mode") == "true"
    ):

        admin_id = update.effective_user.id
        is_auto_free_call = True
    else:
        logger.error(
            "Could not determine admin_id in upload_access_type_selected_callback or invalid call."
        )
        return ConversationHandler.END

    if admin_id not in ADMIN_TELEGRAM_IDS or admin_id not in admin_upload_data:
        error_message_timeout = "حدث خطأ أو انتهت مهلة الجلسة. حاول مرة أخرى."
        if not is_auto_free_call and query and hasattr(query, "edit_message_text"):
            try:
                await query.edit_message_text(error_message_timeout, reply_markup=None)
            except Exception:
                await context.bot.send_message(
                    chat_id=admin_id, text=error_message_timeout
                )
        elif not is_auto_free_call:
            await context.bot.send_message(chat_id=admin_id, text=error_message_timeout)

        if admin_id in admin_upload_data:
            del admin_upload_data[admin_id]
        return ConversationHandler.END

    if not is_auto_free_call and not await try_send_action(
        context, admin_id, ChatAction.TYPING
    ):
        if admin_id in admin_upload_data:
            del admin_upload_data[admin_id]
        return ConversationHandler.END

    if (
        not is_auto_free_call
        and query
        and hasattr(query, "data")
        and query.data
        and query.data.startswith("uploadsetaccess_")
    ):
        selected_access_type_ul = query.data.split("_")[1]
        admin_upload_data[admin_id]["access_type"] = selected_access_type_ul
    elif not admin_upload_data[admin_id].get("access_type"):
        logger.error(
            f"Access type not set for admin {admin_id} in upload callback (should be set in auto-free)."
        )
        if not is_auto_free_call:
            error_message_no_access_type = "خطأ: لم يتم تحديد نوع الوصول."
            if query and hasattr(query, "edit_message_text"):
                await query.edit_message_text(
                    error_message_no_access_type, reply_markup=None
                )
            else:
                await context.bot.send_message(
                    chat_id=admin_id, text=error_message_no_access_type
                )
        if admin_id in admin_upload_data:
            del admin_upload_data[admin_id]
        return ConversationHandler.END

    data_ul = admin_upload_data[admin_id]
    final_caption_ul = data_ul.get("caption", "حصريات تانجو")

    conn = get_db_connection()
    try:
        cursor = conn.cursor()
        cursor.execute(
            """
            INSERT INTO videos (file_id, caption, access_type, duration, uploaded_by, upload_date)
            VALUES (?, ?, ?, ?, ?, ?)
        """,
            (
                data_ul["file_id"],
                final_caption_ul,
                data_ul["access_type"],
                data_ul.get("duration"),
                admin_id,
                datetime.datetime.now(),
            ),
        )
        conn.commit()
        video_db_id_ul = cursor.lastrowid

        if not is_auto_free_call:
            success_message = f"✅ تم رفع الفيديو بنجاح!\nالكابشن: {final_caption_ul}\nنوع الوصول: {VIDEO_UPLOAD_ACCESS_TYPES[data_ul['access_type']]['name_ar']}\nمعرف الفيديو في الداتابيز: {video_db_id_ul}"
            if query and hasattr(query, "edit_message_text"):
                await query.edit_message_text(
                    success_message, reply_markup=None, parse_mode=ParseMode.HTML
                )

        logger.info(
            f"Video uploaded by {admin_id}: Caption '{final_caption_ul}', access: {data_ul['access_type']}, DB ID: {video_db_id_ul}. AutoMode: {is_auto_free_call}"
        )
    except sqlite3.IntegrityError as ie_ul:
        logger.error(
            f"Error saving video to DB (IntegrityError - possible duplicate file_id {data_ul['file_id']}): {ie_ul}"
        )
        if not is_auto_free_call:
            error_msg_upload = "حدث خطأ: يبدو أن هذا الفيديو (بنفس file_id) موجود بالفعل في قاعدة البيانات."
            if query and hasattr(query, "edit_message_text"):
                await query.edit_message_text(
                    error_msg_upload, reply_markup=None, parse_mode=ParseMode.HTML
                )
            else:
                await context.bot.send_message(
                    chat_id=admin_id, text=error_msg_upload, parse_mode=ParseMode.HTML
                )
    except Exception as e_ul:
        logger.error(f"Error saving video to DB: {e_ul}")
        if not is_auto_free_call:
            error_msg_upload_generic = "حدث خطأ أثناء حفظ الفيديو في قاعدة البيانات."
            if query and hasattr(query, "edit_message_text"):
                await query.edit_message_text(
                    error_msg_upload_generic,
                    reply_markup=None,
                    parse_mode=ParseMode.HTML,
                )
            else:
                await context.bot.send_message(
                    chat_id=admin_id,
                    text=error_msg_upload_generic,
                    parse_mode=ParseMode.HTML,
                )
    finally:
        conn.close()
        if admin_id in admin_upload_data:
            del admin_upload_data[admin_id]
    return ConversationHandler.END


async def cancel_upload_command(
    update: Update, context: ContextTypes.DEFAULT_TYPE
) -> int:
    user_id = update.effective_user.id
    if user_id in admin_upload_data:
        del admin_upload_data[user_id]
    await update.message.reply_text(
        "تم إلغاء عملية رفع الفيديو.", reply_markup=ReplyKeyboardRemove()
    )
    return ConversationHandler.END


async def ban_user_command(update: Update, context: ContextTypes.DEFAULT_TYPE):
    admin_id = update.effective_user.id
    if admin_id not in ADMIN_TELEGRAM_IDS:
        return
    if not context.args:
        await update.message.reply_text("الاستخدام: /ban <user_id>")
        return
    try:
        target_user_id = int(context.args[0])
    except ValueError:
        await update.message.reply_text("معرف المستخدم يجب أن يكون رقمًا.")
        return

    target_user = get_user(target_user_id)
    if not target_user:
        await update.message.reply_text(
            f"لم يتم العثور على مستخدم بالمعرف {target_user_id}."
        )
        return

    set_admin_ban_status(target_user_id, True)
    await update.message.reply_text(
        f"تم حظر المستخدم {target_user_id} (@{target_user['username'] or target_user['first_name']}) بنجاح."
    )
    if not target_user["is_bot_blocked"]:
        try:
            await context.bot.send_message(
                chat_id=target_user_id,
                text="لقد تم حظرك من استخدام هذا البوت بواسطة الإدارة. لن تتمكن من استخدام الأوامر أو تلقي التحديثات.",
            )
        except Exception as e:
            logger.warning(f"Could not send ban notification to {target_user_id}: {e}")
            set_user_blocked_status(target_user_id, True)


async def unban_user_command(update: Update, context: ContextTypes.DEFAULT_TYPE):
    admin_id = update.effective_user.id
    if admin_id not in ADMIN_TELEGRAM_IDS:
        return
    if not context.args:
        await update.message.reply_text("الاستخدام: /unban <user_id>")
        return
    try:
        target_user_id = int(context.args[0])
    except ValueError:
        await update.message.reply_text("معرف المستخدم يجب أن يكون رقمًا.")
        return

    target_user = get_user(target_user_id)
    if not target_user:
        await update.message.reply_text(
            f"لم يتم العثور على مستخدم بالمعرف {target_user_id}."
        )
        return

    set_admin_ban_status(target_user_id, False)
    set_user_blocked_status(target_user_id, False)
    await update.message.reply_text(
        f"تم إلغاء حظر المستخدم {target_user_id} (@{target_user['username'] or target_user['first_name']}) بنجاح."
    )
    try:
        await context.bot.send_message(
            chat_id=target_user_id,
            text="تم إلغاء حظرك. يمكنك الآن استخدام البوت مرة أخرى.",
        )
    except Exception:
        pass


async def autofreeon_command(update: Update, context: ContextTypes.DEFAULT_TYPE):
    admin_id = update.effective_user.id
    if admin_id not in ADMIN_TELEGRAM_IDS:
        return
    set_bot_setting("auto_free_upload_mode", "true")
    await update.message.reply_text(
        "✅ تم تفعيل وضع الرفع التلقائي المجاني. أي فيديو ترسله الآن سيتم حفظه كمجاني تلقائيًا."
    )


async def autofreeoff_command(update: Update, context: ContextTypes.DEFAULT_TYPE):
    admin_id = update.effective_user.id
    if admin_id not in ADMIN_TELEGRAM_IDS:
        return
    set_bot_setting("auto_free_upload_mode", "false")
    await update.message.reply_text(
        "❌ تم تعطيل وضع الرفع التلقائي المجاني. سيتم سؤالك عن نوع الوصول لكل فيديو."
    )


async def broadcast_command_entry(
    update: Update, context: ContextTypes.DEFAULT_TYPE
) -> int:
    admin_id = update.effective_user.id
    if admin_id not in ADMIN_TELEGRAM_IDS:
        return ConversationHandler.END

    if not update.message.reply_to_message:
        await update.message.reply_text(
            "الرجاء الرد على الرسالة التي تريد بثها باستخدام الأمر /broadcast."
        )
        return ConversationHandler.END

    broadcast_data[admin_id] = {"message_to_broadcast": update.message.reply_to_message}

    conn = get_db_connection()

    active_users_count = conn.execute(
        "SELECT COUNT(*) FROM users WHERE is_bot_blocked = 0 AND is_banned_by_admin = 0"
    ).fetchone()[0]
    conn.close()

    if active_users_count == 0:
        await update.message.reply_text("لا يوجد مستخدمون نشطون لبث الرسالة إليهم.")
        del broadcast_data[admin_id]
        return ConversationHandler.END

    keyboard = [
        [
            InlineKeyboardButton(
                "✅ نعم، بث الآن", callback_data="confirm_broadcast_yes"
            ),
            InlineKeyboardButton("❌ إلغاء", callback_data="confirm_broadcast_no"),
        ]
    ]
    await update.message.reply_text(
        f"هل أنت متأكد أنك تريد بث هذه الرسالة إلى حوالي {active_users_count} مستخدم نشط؟",
        reply_markup=InlineKeyboardMarkup(keyboard),
    )
    return BROADCAST_CONFIRM_STATE


async def broadcast_confirm_callback(
    update: Update, context: ContextTypes.DEFAULT_TYPE
) -> int:
    query = update.callback_query
    await query.answer()
    admin_id = query.from_user.id

    if admin_id not in ADMIN_TELEGRAM_IDS or admin_id not in broadcast_data:
        await query.edit_message_text("انتهت صلاحية هذا الإجراء أو حدث خطأ.")
        return ConversationHandler.END

    if query.data == "confirm_broadcast_no":
        await query.edit_message_text("تم إلغاء البث.")
        del broadcast_data[admin_id]
        return ConversationHandler.END

    message_to_broadcast = broadcast_data[admin_id]["message_to_broadcast"]
    del broadcast_data[admin_id]

    await query.edit_message_text("⏳ جاري بدء عملية البث...")

    context.job_queue.run_once(
        do_broadcast_job,
        when=1,
        data={
            "admin_id": admin_id,
            "message_id": message_to_broadcast.message_id,
            "chat_id": message_to_broadcast.chat_id,
        },
        name=f"broadcast_{admin_id}_{message_to_broadcast.message_id}",
    )
    return ConversationHandler.END


async def do_broadcast_job(context: ContextTypes.DEFAULT_TYPE):
    job_data = context.job.data
    admin_id = job_data["admin_id"]
    original_message_id = job_data["message_id"]
    original_chat_id = job_data["chat_id"]

    conn = get_db_connection()

    users_to_broadcast = conn.execute(
        "SELECT user_id FROM users WHERE is_bot_blocked = 0 AND is_banned_by_admin = 0"
    ).fetchall()
    conn.close()

    total_users = len(users_to_broadcast)
    if total_users == 0:
        await context.bot.send_message(
            chat_id=admin_id, text="لا يوجد مستخدمون مؤهلون لاستقبال البث."
        )
        return

    sent_count = 0
    failed_count = 0
    blocked_during_broadcast = []

    status_message_text = f"📢 جاري البث لـ {total_users} مستخدم...\nمرسل: {sent_count}\nفشل: {failed_count}\nمتبقي: {total_users - sent_count - failed_count}"
    status_message = await context.bot.send_message(
        chat_id=admin_id, text=status_message_text
    )
    last_status_update_time = datetime.datetime.now()

    batch_size = 10
    batch_delay_short = 1
    batch_delay_long = 5
    batch_counter = 0

    for i, user_row in enumerate(users_to_broadcast):
        target_user_id = user_row["user_id"]
        if not await try_send_action(context, target_user_id, ChatAction.TYPING):
            failed_count += 1
            blocked_during_broadcast.append(target_user_id)
            set_user_blocked_status(target_user_id, True)
            continue

        try:

            await context.bot.copy_message(
                chat_id=target_user_id,
                from_chat_id=original_chat_id,
                message_id=original_message_id,
                protect_content=True,
            )
            sent_count += 1
        except Forbidden:
            failed_count += 1
            blocked_during_broadcast.append(target_user_id)
            set_user_blocked_status(target_user_id, True)
        except BadRequest as br:
            logger.warning(
                f"BadRequest during broadcast to {target_user_id}: {br.message}"
            )
            failed_count += 1
            blocked_during_broadcast.append(target_user_id)
            if (
                "chat not found" in br.message.lower()
                or "user is deactivated" in br.message.lower()
            ):
                set_user_blocked_status(target_user_id, True)
        except Exception as e:
            logger.error(f"Unexpected error broadcasting to {target_user_id}: {e}")
            failed_count += 1

        current_time = datetime.datetime.now()
        if (current_time - last_status_update_time).total_seconds() >= 3:
            try:
                remaining = total_users - sent_count - failed_count
                est_time_remaining_s = (
                    (remaining / batch_size)
                    * (batch_delay_short * 2 + batch_delay_long)
                    if batch_size > 0
                    else 0
                )
                est_time_remaining_str = str(
                    datetime.timedelta(seconds=int(est_time_remaining_s))
                )

                status_message_text = (
                    f"📢 جاري البث لـ {total_users} مستخدم...\n"
                    f"✅ مرسل: {sent_count}\n"
                    f"❌ فشل/محظور: {failed_count}\n"
                    f"⏳ متبقي: {remaining}\n"
                    f"⏱️ الوقت المتوقع للانتهاء: ~{est_time_remaining_str}"
                )
                await status_message.edit_text(text=status_message_text)
                last_status_update_time = current_time
            except BadRequest:
                pass
            except Exception as e_status:
                logger.warning(f"Could not update broadcast status message: {e_status}")

        if (i + 1) % batch_size == 0:
            batch_counter += 1
            if batch_counter % 2 == 0:
                await asyncio.sleep(batch_delay_long)
                batch_counter = 0
            else:
                await asyncio.sleep(batch_delay_short)
        elif (i + 1) % 3 == 0:
            await asyncio.sleep(0.2)

    final_summary = (
        f"🏁 انتهى البث!\n\n"
        f"إجمالي المستهدفين: {total_users}\n"
        f"✅ تم الإرسال بنجاح إلى: {sent_count} مستخدم\n"
        f"❌ فشل الإرسال (أو محظور): {failed_count} مستخدم"
    )
    if blocked_during_broadcast:
        final_summary += f"\nIDs المستخدمين الذين لم يتمكن البوت من مراسلتهم: {len(blocked_during_broadcast)}"

    await status_message.edit_text(text=final_summary)


async def cancel_broadcast_command(
    update: Update, context: ContextTypes.DEFAULT_TYPE
) -> int:
    admin_id = update.effective_user.id
    if admin_id in broadcast_data:
        del broadcast_data[admin_id]
        await update.message.reply_text("تم إلغاء عملية البث.")
    else:
        await update.message.reply_text("لا توجد عملية بث نشطة لإلغائها.")
    return ConversationHandler.END


async def post_init_actions(application: Application):
    bot_user = await application.bot.get_me()
    application.bot_data["bot_username"] = bot_user.username
    logger.info(f"Bot @{bot_user.username} started successfully!")
    user_commands = [
        BotCommand("start", "بدء استخدام البوت / عرض الأوامر"),
        BotCommand("help", "عرض المساعدة ومعلومات الخطط"),
        BotCommand("premium", "عرض خطط الاشتراك المميزة"),
        BotCommand("gift", "الحصول على فيديو مجاني (للخطة المجانية)"),
        BotCommand("all_free", "الحصول على رابط الإحالة الخاص بك"),
        BotCommand("send", "للمشتركين: إرسال فيديو مع تنقل"),
    ]
    try:
        await application.bot.set_my_commands(user_commands)
    except Exception as e:
        logger.error(f"Failed to set default bot commands: {e}")

    admin_base_commands = [
        BotCommand("admin", "فتح لوحة تحكم المدير"),
        BotCommand("stats", "عرض إحصائيات البوت"),
        BotCommand("ban", "حظر مستخدم (مثال: /ban 12345)"),
        BotCommand("unban", "إلغاء حظر مستخدم (مثال: /unban 12345)"),
        BotCommand("autofreeon", "تفعيل وضع الرفع المجاني التلقائي"),
        BotCommand("autofreeoff", "تعطيل وضع الرفع المجاني التلقائي"),
        BotCommand("broadcast", "بث رسالة (بالرد على الرسالة المراد بثها)"),
    ]
    for admin_id_cmd in ADMIN_TELEGRAM_IDS:
        current_admin_cmds = user_commands + admin_base_commands
        if admin_id_cmd == MAIN_ADMIN_ID:
            current_admin_cmds.append(
                BotCommand("sendall", "إرسال جميع الفيديوهات (للمدير الرئيسي)")
            )
        try:
            await application.bot.set_my_commands(
                current_admin_cmds, scope={"type": "chat", "chat_id": admin_id_cmd}
            )
        except Exception as e:
            logger.warning(f"Could not set commands for admin {admin_id_cmd}: {e}")


def main():
    create_tables()
    application = (
        Application.builder().token(BOT_TOKEN).post_init(post_init_actions).build()
    )

    upload_conv = ConversationHandler(
        entry_points=[
            MessageHandler(
                filters.VIDEO & filters.User(ADMIN_TELEGRAM_IDS) & (~filters.COMMAND),
                upload_video_entry_point,
            )
        ],
        states={
            UPLOAD_ACCESS_TYPE_CONVO_STATE: [
                CallbackQueryHandler(
                    upload_access_type_selected_callback, pattern=r"^uploadsetaccess_"
                )
            ]
        },
        fallbacks=[
            CommandHandler(
                "cancel_upload",
                cancel_upload_command,
                filters=filters.User(ADMIN_TELEGRAM_IDS),
            )
        ],
        conversation_timeout=10 * 60,
    )
    application.add_handler(upload_conv)

    broadcast_conv = ConversationHandler(
        entry_points=[
            CommandHandler(
                "broadcast",
                broadcast_command_entry,
                filters=filters.User(ADMIN_TELEGRAM_IDS) & filters.REPLY,
            )
        ],
        states={
            BROADCAST_CONFIRM_STATE: [
                CallbackQueryHandler(
                    broadcast_confirm_callback, pattern=r"^confirm_broadcast_"
                )
            ]
        },
        fallbacks=[
            CommandHandler(
                "cancel_broadcast",
                cancel_broadcast_command,
                filters=filters.User(ADMIN_TELEGRAM_IDS),
            )
        ],
        conversation_timeout=5 * 60,
    )
    application.add_handler(broadcast_conv)

    application.add_handler(CommandHandler("start", start_command))
    application.add_handler(CommandHandler("help", help_command))
    application.add_handler(CommandHandler("premium", premium_command))
    application.add_handler(
        CallbackQueryHandler(premium_callback, pattern=r"^subscribe_")
    )
    application.add_handler(CommandHandler("gift", gift_command))
    application.add_handler(CommandHandler("all_free", all_free_command))
    application.add_handler(CommandHandler("send", send_command))
    application.add_handler(
        CallbackQueryHandler(navigate_video_callback, pattern=r"^navigatevideo_vid_")
    )

    application.add_handler(
        CommandHandler("admin", admin_command, filters=filters.User(ADMIN_TELEGRAM_IDS))
    )
    application.add_handler(
        CallbackQueryHandler(admin_panel_callback, pattern=r"^admin_panel_")
    )

    application.add_handler(
        MessageHandler(
            filters.TEXT & (~filters.COMMAND) & filters.User(ADMIN_TELEGRAM_IDS),
            admin_text_handler,
        )
    )
    application.add_handler(
        CallbackQueryHandler(admin_set_plan_callback, pattern=r"^setplan_")
    )
    application.add_handler(
        CallbackQueryHandler(admin_confirm_ban_unban_callback, pattern=r"^confirmban_")
    )
    application.add_handler(
        CommandHandler(
            "stats", stats_command_direct, filters=filters.User(ADMIN_TELEGRAM_IDS)
        )
    )
    application.add_handler(
        CallbackQueryHandler(
            admin_export_users_txt_callback, pattern=r"^admin_export_users_txt$"
        )
    )
    application.add_handler(
        CommandHandler(
            "sendall", sendall_command, filters=filters.User(user_id=MAIN_ADMIN_ID)
        )
    )
    application.add_handler(
        CommandHandler(
            "ban", ban_user_command, filters=filters.User(ADMIN_TELEGRAM_IDS)
        )
    )
    application.add_handler(
        CommandHandler(
            "unban", unban_user_command, filters=filters.User(ADMIN_TELEGRAM_IDS)
        )
    )
    application.add_handler(
        CommandHandler(
            "autofreeon", autofreeon_command, filters=filters.User(ADMIN_TELEGRAM_IDS)
        )
    )
    application.add_handler(
        CommandHandler(
            "autofreeoff", autofreeoff_command, filters=filters.User(ADMIN_TELEGRAM_IDS)
        )
    )

    logger.info("Starting bot polling...")
    application.run_polling(allowed_updates=Update.ALL_TYPES)


if __name__ == "__main__":
    main()
