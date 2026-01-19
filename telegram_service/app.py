import asyncio
import os
from typing import List, Optional

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from telethon import TelegramClient
from telethon.errors import FloodWaitError, RPCError, SessionPasswordNeededError


API_ID = os.getenv("TELEGRAM_API_ID")
API_HASH = os.getenv("TELEGRAM_API_HASH")
SESSION_PATH = os.getenv("TELEGRAM_SESSION_PATH", os.path.join(os.path.dirname(__file__), "telegram.session"))

app = FastAPI()
client: Optional[TelegramClient] = None
client_lock = asyncio.Lock()


class LoginStart(BaseModel):
    phone: str


class LoginConfirm(BaseModel):
    phone: str
    code: str
    password: Optional[str] = None


class SendMessage(BaseModel):
    to: str
    message: str


class MarkReadRequest(BaseModel):
    chatIds: Optional[List[str]] = None
    chatId: Optional[str] = None
    maxMessageId: Optional[int] = None


def ensure_configured() -> None:
    if not API_ID or not API_HASH:
        raise HTTPException(status_code=400, detail="TELEGRAM_API_ID or TELEGRAM_API_HASH not set")


async def get_client() -> TelegramClient:
    ensure_configured()
    global client
    async with client_lock:
        if client is None:
            client = TelegramClient(SESSION_PATH, int(API_ID), API_HASH)
            await client.connect()
        elif not client.is_connected():
            await client.connect()
    return client


async def require_authorized(telegram: TelegramClient) -> None:
    authorized = await telegram.is_user_authorized()
    if not authorized:
        raise HTTPException(status_code=401, detail="Telegram not authorized")


async def safe_get_messages(telegram: TelegramClient, entity, limit: int, timeout_s: float = 10.0):
    for attempt in range(3):
        try:
            return await asyncio.wait_for(
                telegram.get_messages(entity, limit=limit),
                timeout=timeout_s,
            )
        except FloodWaitError as exc:
            raise HTTPException(
                status_code=429,
                detail=f"Telegram rate limited. Retry after {exc.seconds}s"
            ) from exc
        except (RPCError, ValueError) as exc:
            if attempt < 2 and "Request was unsuccessful" in str(exc):
                await asyncio.sleep(0.5 * (attempt + 1))
                continue
            raise
        except asyncio.TimeoutError as exc:
            if attempt < 2:
                await asyncio.sleep(0.5 * (attempt + 1))
                continue
            raise HTTPException(status_code=504, detail="Telegram request timed out") from exc


def normalize_message(dialog, message):
    unread_attr = getattr(message, "unread", None)
    if unread_attr is None:
        is_read_attr = getattr(message, "is_read", None)
        unread_attr = False if is_read_attr is None else not is_read_attr

    chat_id = str(dialog.entity.id)
    name = dialog.name or chat_id
    timestamp_ms = int(message.date.timestamp() * 1000) if message.date else 0
    is_group = bool(getattr(dialog, "is_group", False) or getattr(dialog, "is_channel", False))
    text = message.message or ""

    return {
        "id": str(message.id),
        "senderId": chat_id,
        "senderName": name,
        "type": "text",
        "content": {"type": "text", "text": text},
        "timestamp": timestamp_ms,
        "isGroupMessage": is_group,
        "fromMe": bool(message.out),
        "unread": bool(unread_attr),
        "priority": "normal",
        "groupId": chat_id if is_group else None,
        "groupName": name if is_group else None,
        "messageId": str(message.id),
    }


def is_unread(message) -> bool:
    unread_attr = getattr(message, "unread", None)
    if unread_attr is not None:
        return bool(unread_attr)
    is_read_attr = getattr(message, "is_read", None)
    if is_read_attr is None:
        return False
    return not is_read_attr


@app.on_event("startup")
async def startup():
  if not API_ID or not API_HASH:
    return
  await get_client()


@app.get("/health")
async def health():
  return {"status": "ok"}


@app.get("/status")
async def status():
    ensure_configured()
    telegram = await get_client()
    authorized = await telegram.is_user_authorized()
    user = await telegram.get_me() if authorized else None
    return {
        "status": "connected" if authorized else "not_authorized",
        "user": {"id": user.id, "username": user.username} if user else None
    }


@app.post("/login/start")
async def login_start(payload: LoginStart):
    telegram = await get_client()
    await telegram.send_code_request(payload.phone)
    return {"status": "code_sent"}


@app.post("/login/confirm")
async def login_confirm(payload: LoginConfirm):
    telegram = await get_client()
    try:
        await telegram.sign_in(payload.phone, payload.code)
    except SessionPasswordNeededError:
        if not payload.password:
            raise HTTPException(status_code=401, detail="2FA password required")
        await telegram.sign_in(password=payload.password)
    return {"status": "authorized"}


@app.get("/chats")
async def list_chats(limit: int = 50):
    telegram = await get_client()
    await require_authorized(telegram)
    dialogs = await telegram.get_dialogs(limit=limit)
    return {
        "status": "success",
        "chats": [
            {
                "id": str(d.entity.id),
                "name": d.name or str(d.entity.id),
                "isGroup": bool(getattr(d, "is_group", False) or getattr(d, "is_channel", False)),
                "unread": d.unread_count,
                "lastMessage": None,
                "timestamp": int(d.date.timestamp() * 1000) if d.date else 0,
            }
            for d in dialogs
        ],
    }


@app.get("/messages")
async def list_messages(chat_limit: int = 100, messages_per_chat: int = 35, delay_ms: int = 200):
    telegram = await get_client()
    await require_authorized(telegram)
    dialogs = await telegram.get_dialogs(limit=chat_limit)
    results = []
    for dialog in dialogs:
        try:
            messages = await safe_get_messages(telegram, dialog.entity, limit=messages_per_chat)
        except HTTPException:
            raise
        except Exception as exc:
            print(f"Failed to fetch messages for dialog {dialog.entity.id}: {exc}")
            continue
        results.extend([normalize_message(dialog, msg) for msg in messages])
        if delay_ms > 0:
            await asyncio.sleep(delay_ms / 1000.0)
    return {"status": "success", "messages": results, "count": len(results)}


@app.get("/unread")
async def list_unread(limit: int = 50, dialog_limit: int = 50, messages_per_chat: int = 10):
    telegram = await get_client()
    await require_authorized(telegram)
    dialogs = await telegram.get_dialogs(limit=dialog_limit)
    results = []
    for dialog in dialogs:
        if getattr(dialog, "unread_count", 0) == 0:
            continue
        try:
            messages = await safe_get_messages(telegram, dialog.entity, limit=messages_per_chat)
        except HTTPException:
            raise
        except Exception as exc:
            print(f"Failed to fetch unread messages for dialog {dialog.entity.id}: {exc}")
            continue
        for msg in messages:
            if is_unread(msg):
                results.append(normalize_message(dialog, msg))
            if len(results) >= limit:
                return {"status": "success", "messages": results, "count": len(results)}
    return {"status": "success", "messages": results, "count": len(results)}


@app.get("/history/{chat_id}")
async def history(chat_id: str, limit: int = 50):
    telegram = await get_client()
    await require_authorized(telegram)
    entity = await telegram.get_entity(int(chat_id))
    messages = await safe_get_messages(telegram, entity, limit=limit)
    dialog = await telegram.get_dialogs(limit=1, search=chat_id)
    dialog_info = dialog[0] if dialog else None
    if dialog_info is None:
        dialog_info = type("Dialog", (), {"entity": entity, "name": str(chat_id), "is_group": False, "is_channel": False})
    return {
        "status": "success",
        "messages": [normalize_message(dialog_info, msg) for msg in messages],
        "count": len(messages),
    }


@app.post("/send")
async def send_message(payload: SendMessage):
    telegram = await get_client()
    await telegram.send_message(int(payload.to), payload.message)
    return {"status": "success"}


@app.post("/mark-read")
async def mark_read(payload: MarkReadRequest):
    telegram = await get_client()
    chat_ids = payload.chatIds or ([] if payload.chatId is None else [payload.chatId])
    if not chat_ids:
        raise HTTPException(status_code=400, detail="Missing chatId(s)")

    for chat_id in chat_ids:
        entity = await telegram.get_entity(int(chat_id))
        max_id = payload.maxMessageId
        if max_id is None:
            messages = await telegram.get_messages(entity, limit=1)
            if messages:
                max_id = messages[0].id
        await telegram.send_read_acknowledge(entity, max_id=max_id)

    return {"status": "success", "count": len(chat_ids)}
