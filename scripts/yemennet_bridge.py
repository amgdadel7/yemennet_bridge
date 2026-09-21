import os
import sys
import time
import uuid
import base64
import asyncio
from typing import Optional, Dict
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from playwright.async_api import async_playwright
from bs4 import BeautifulSoup
import re

app = FastAPI(title="Yemen Net Playwright Bridge")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Store active sessions in memory: session_id -> { "page": page, "context": context, "created_at": float, ... }
active_sessions: Dict[str, dict] = {}
playwright_instance = None
browser_instance = None


class CaptchaRequest(BaseModel):
    username: str
    password: Optional[str] = ""


class VerifyRequest(BaseModel):
    session_id: str
    captcha: str


class SessionSyncRequest(BaseModel):
    cookie_str: str


async def cleanup_expired_sessions():
    now = time.time()
    expired = [sid for sid, s in active_sessions.items() if now - s["created_at"] > 300]
    for sid in expired:
        try:
            s = active_sessions.pop(sid, None)
            if s and "page" in s and not s["page"].is_closed():
                await s["page"].close()
            if s and "context" in s:
                await s["context"].close()
        except Exception:
            pass


async def get_browser():
    global playwright_instance, browser_instance
    if playwright_instance is None:
        playwright_instance = await async_playwright().start()
    if browser_instance is None or not browser_instance.is_connected():
        browser_instance = await playwright_instance.chromium.launch(
            headless=True,
            args=[
                "--disable-blink-features=AutomationControlled",
                "--no-sandbox",
                "--disable-infobars"
            ]
        )
    return browser_instance


@app.get("/api/health")
async def health_check():
    return {"status": "ok", "active_sessions": len(active_sessions)}


@app.post("/api/captcha")
async def get_captcha(req: CaptchaRequest):
    await cleanup_expired_sessions()
    browser = await get_browser()

    context = await browser.new_context(
        user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
        locale="ar-YE",
        viewport={"width": 1280, "height": 720}
    )
    page = await context.new_page()

    try:
        login_url = "https://adsl.yemen.net.ye/login"
        # Go to login page and wait for SafeLine WAF redirect
        await page.goto(login_url, wait_until="networkidle", timeout=30000)

        # Fill username and password
        if req.username and await page.query_selector("#Username"):
            await page.fill("#Username", str(req.username).strip())
        if req.password and await page.query_selector("#Password"):
            await page.fill("#Password", str(req.password).strip())

        # Wait for captcha element
        captcha_img = await page.wait_for_selector("#capti", timeout=15000)
        if not captcha_img:
            raise HTTPException(status_code=500, detail="لم يتم العثور على صورة الكابتشا في صفحة يمن نت")

        img_bytes = await captcha_img.screenshot()
        b64 = base64.b64encode(img_bytes).decode("utf-8")

        session_id = str(uuid.uuid4())
        active_sessions[session_id] = {
            "context": context,
            "page": page,
            "username": req.username,
            "created_at": time.time()
        }

        return {
            "success": True,
            "session_id": session_id,
            "captcha": f"data:image/png;base64,{b64}"
        }
    except Exception as e:
        try:
            await page.close()
            await context.close()
        except Exception:
            pass
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/verify")
async def verify_captcha(req: VerifyRequest):
    await cleanup_expired_sessions()
    session = active_sessions.get(req.session_id)
    if not session:
        raise HTTPException(status_code=400, detail="انتهت صلاحية جلسة الكابتشا، يرجى إعادة طلب صورة جديدة")

    page = session["page"]
    context = session["context"]

    try:
        # Fill captcha
        await page.fill("#CapatchInput", str(req.captcha).strip())

        # Click submit
        submit_btn = await page.query_selector('button[type="submit"]') or await page.query_selector('.btn.font-weight-bold')
        if submit_btn:
            await submit_btn.click()
        else:
            await page.keyboard.press("Enter")

        try:
            await page.wait_for_load_state("networkidle", timeout=15000)
        except Exception:
            pass

        # Check if redirected to /acct
        current_url = page.url
        if "/acct" not in current_url:
            # Check for error message on login page
            err_elem = await page.query_selector(".text-danger") or await page.query_selector(".validation-summary-errors")
            err_text = await err_elem.inner_text() if err_elem else "رمز التحقق أو كلمة المرور غير صحيحة"
            return {
                "success": False,
                "error": err_text.strip() or "رمز التحقق غير صحيح، يرجى المحاولة مجدداً"
            }

        # Successfully logged in, scrape /acct
        html = await page.content()
        soup = BeautifulSoup(html, "html.parser")
        full_text = soup.get_text()

        data = {}

        # 1. Parse tables
        for row in soup.find_all("tr"):
            cols = row.find_all(["td", "th"])
            if len(cols) == 2:
                k = cols[0].get_text(strip=True)
                v = cols[1].get_text(strip=True)
                if k and v:
                    data[k] = v

        clean_text = full_text.replace('\u066b', '.').replace('\u066c', '')

        # 2. Parse Balance (exact 80.74 GB)
        bal_match = re.search(r'(?:الرصيد المتبقي|الرصيد الحالي|Remaining Balance|Current Credit|الرصيد)[^:\d<]*[:=><\s]+([\d.]+)\s*(Gigabyte|GB|MB|جيجابايت|ميجابايت)?', clean_text, re.IGNORECASE)
        if bal_match:
            raw_val = float(bal_match.group(1))
            unit = (bal_match.group(2) or '').lower()
            if 'mb' in unit or 'ميجابايت' in unit or (raw_val > 1000 and not unit):
                raw_val = round(raw_val / 1024.0, 2)
            else:
                raw_val = round(raw_val, 2)
            data["balance"] = f"{raw_val:.2f} GB"
            data["balance_val"] = raw_val

        # 3. Parse Subscriber Name
        title_text = soup.title.string if soup.title else ""
        title_match = re.search(r'خدمة سوبرنت ADSL\s*-\s*([^\n\r<]+)', title_text) or re.search(r'خدمة سوبرنت ADSL\s*-\s*([^\n\r<]+)', full_text)
        if title_match:
            data["subscriber_name"] = title_match.group(1).strip()
        else:
            name_match = re.search(r'(?:مرحباً|مرحبا|المشترك|اسم المشترك|Subscriber Name)[:\s]+([^<\n\r\t]+)', full_text, re.IGNORECASE)
            if name_match:
                clean_name = name_match.group(1).replace('مرحباً', '').replace('مرحبا', '').replace(':', '').strip()
                if clean_name and len(clean_name) > 2 and 'تسجيل الدخول' not in clean_name and 'تسجيل الخروج' not in clean_name:
                    data["subscriber_name"] = clean_name

        # 4. Parse Package Name
        pkg_match = re.search(r'(?:الباقة|نوع الباقة|اسم الباقة|Package)[:\s]+([^<\n\r\t]+)', full_text, re.IGNORECASE) or re.search(r'(سوبرشامل[^\n\r<]+)', full_text)
        if pkg_match:
            data["package_name"] = pkg_match.group(1).replace(':', '').strip()

        # 5. Parse Registration Date
        reg_match = re.search(r'(?:تاريخ التسجيل|تاريخ الاشتراك|Registration Date)[:\s]+(\d{1,2}[/-]\d{1,2}[/-]\d{4})', full_text, re.IGNORECASE)
        if reg_match:
            data["registration_date"] = reg_match.group(1).replace('-', '/')

        # 6. Parse Expiry Date & Time
        exp_match = re.search(r'(?:تاريخ الانتهاء|تاريخ انتهاء الاشتراك|Expiry Date)[:\s]+(\d{1,2}[/-]\d{1,2}[/-]\d{4}(?:\s+\d{1,2}:\d{2}(?::\d{2})?(?:\s*[AP]M)?)?)', full_text, re.IGNORECASE)
        if exp_match:
            full_exp = exp_match.group(1).strip().replace('-', '/')
            data["expiry"] = full_exp
            time_part = re.search(r'\d{1,2}:\d{2}(?::\d{2})?(?:\s*[AP]M)?', full_exp, re.IGNORECASE)
            if time_part:
                data["expiry_time"] = time_part.group(0)

        # 7. Parse Speed
        speed_match = re.search(r'(?:سرعة الخط|السرعة|Speed)[:\s]+([\d.]+\s*(?:Mbps|Kbps|ميجابت|كيلوبت))', full_text, re.IGNORECASE)
        if speed_match:
            data["speed"] = speed_match.group(1).strip()

        # 8. Parse IP
        ip_match = re.search(r'10\.\d{1,3}\.\d{1,3}\.\d{1,3}', full_text)
        if ip_match:
            data["ip"] = ip_match.group(0)

        # 6. Cookies
        pw_cookies = await context.cookies()
        cookie_dict = {c["name"]: c["value"] for c in pw_cookies}
        session_cookie_str = "; ".join([f"{k}={v}" for k, v in cookie_dict.items()])

        # Clean up session
        active_sessions.pop(req.session_id, None)
        await page.close()
        await context.close()

        return {
            "success": True,
            "data": data,
            "cookies": cookie_dict,
            "sessionCookie": session_cookie_str
        }

    except Exception as e:
        active_sessions.pop(req.session_id, None)
        try:
            await page.close()
            await context.close()
        except Exception:
            pass
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/session-sync")
async def sync_with_session(req: SessionSyncRequest):
    if not req.cookie_str:
        raise HTTPException(status_code=400, detail="رمز الجلسة غير موجود")

    browser = await get_browser()
    context = await browser.new_context(
        user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
        locale="ar-YE"
    )

    cookies_list = []
    for item in req.cookie_str.split(";"):
        if "=" in item:
            k, v = item.strip().split("=", 1)
            cookies_list.append({
                "name": k.strip(),
                "value": v.strip(),
                "domain": "adsl.yemen.net.ye",
                "path": "/"
            })

    await context.add_cookies(cookies_list)
    page = await context.new_page()

    try:
        await page.goto("https://adsl.yemen.net.ye/acct", wait_until="networkidle", timeout=30000)

        # Check if session redirected to /login (meaning expired)
        current_url = page.url
        if "/acct" not in current_url:
            await page.close()
            await context.close()
            return {
                "success": False,
                "expired": True,
                "error": "انتهت صلاحية الجلسة، يرجى تسجيل الدخول مجدداً"
            }

        html = await page.content()
        soup = BeautifulSoup(html, "html.parser")
        full_text = soup.get_text()
        clean_text = full_text.replace('\u066b', '.').replace('\u066c', '')

        data = {}

        # 1. Parse tables
        for row in soup.find_all("tr"):
            cols = row.find_all(["td", "th"])
            if len(cols) == 2:
                k = cols[0].get_text(strip=True)
                v = cols[1].get_text(strip=True)
                if k and v:
                    data[k] = v

        # 2. Parse Balance (exact decimal 80.74 GB)
        bal_match = re.search(r'(?:الرصيد المتبقي|الرصيد الحالي|Remaining Balance|Current Credit|الرصيد)[^:\d<]*[:=><\s]+([\d.]+)\s*(Gigabyte|GB|MB|جيجابايت|ميجابايت)?', clean_text, re.IGNORECASE)
        if bal_match:
            raw_val = float(bal_match.group(1))
            unit = (bal_match.group(2) or '').lower()
            if 'mb' in unit or 'ميجابايت' in unit or (raw_val > 1000 and not unit):
                raw_val = round(raw_val / 1024.0, 2)
            else:
                raw_val = round(raw_val, 2)
            data["balance"] = f"{raw_val:.2f} GB"
            data["balance_val"] = raw_val

        # 3. Parse Subscriber Name
        title_text = soup.title.string if soup.title else ""
        title_match = re.search(r'خدمة سوبرنت ADSL\s*-\s*([^\n\r<]+)', title_text) or re.search(r'خدمة سوبرنت ADSL\s*-\s*([^\n\r<]+)', full_text)
        if title_match:
            data["subscriber_name"] = title_match.group(1).strip()
        else:
            name_match = re.search(r'(?:مرحباً|مرحبا|المشترك|اسم المشترك|Subscriber Name)[:\s]+([^<\n\r\t]+)', full_text, re.IGNORECASE)
            if name_match:
                clean_name = name_match.group(1).replace('مرحباً', '').replace('مرحبا', '').replace(':', '').strip()
                if clean_name and len(clean_name) > 2 and 'تسجيل الدخول' not in clean_name and 'تسجيل الخروج' not in clean_name:
                    data["subscriber_name"] = clean_name

        # 4. Parse Package Name
        pkg_match = re.search(r'(?:الباقة|نوع الباقة|اسم الباقة|Package)[:\s]+([^<\n\r\t]+)', full_text, re.IGNORECASE) or re.search(r'(سوبرشامل[^\n\r<]+)', full_text)
        if pkg_match:
            data["package_name"] = pkg_match.group(1).replace(':', '').strip()

        # 5. Parse Registration Date
        reg_match = re.search(r'(?:تاريخ التسجيل|تاريخ الاشتراك|Registration Date)[:\s]+(\d{1,2}[/-]\d{1,2}[/-]\d{4})', full_text, re.IGNORECASE)
        if reg_match:
            data["registration_date"] = reg_match.group(1).replace('-', '/')

        # 6. Parse Expiry Date & Time
        exp_match = re.search(r'(?:تاريخ الانتهاء|تاريخ انتهاء الاشتراك|Expiry Date)[:\s]+(\d{1,2}[/-]\d{1,2}[/-]\d{4}(?:\s+\d{1,2}:\d{2}(?::\d{2})?(?:\s*[AP]M)?)?)', full_text, re.IGNORECASE)
        if exp_match:
            full_exp = exp_match.group(1).strip().replace('-', '/')
            data["expiry"] = full_exp
            time_part = re.search(r'\d{1,2}:\d{2}(?::\d{2})?(?:\s*[AP]M)?', full_exp, re.IGNORECASE)
            if time_part:
                data["expiry_time"] = time_part.group(0)

        # 7. Parse Speed
        speed_match = re.search(r'(?:سرعة الخط|السرعة|Speed)[:\s]+([\d.]+\s*(?:Mbps|Kbps|ميجابت|كيلوبت))', full_text, re.IGNORECASE)
        if speed_match:
            data["speed"] = speed_match.group(1).strip()

        # 8. Parse IP
        ip_match = re.search(r'10\.\d{1,3}\.\d{1,3}\.\d{1,3}', full_text)
        if ip_match:
            data["ip"] = ip_match.group(0)

        # Refresh cookies
        pw_cookies = await context.cookies()
        cookie_dict = {c["name"]: c["value"] for c in pw_cookies}
        session_cookie_str = "; ".join([f"{k}={v}" for k, v in cookie_dict.items()])

        await page.close()
        await context.close()

        return {
            "success": True,
            "expired": False,
            "data": data,
            "cookies": cookie_dict,
            "sessionCookie": session_cookie_str
        }

    except Exception as e:
        try:
            await page.close()
            await context.close()
        except Exception:
            pass
        return {
            "success": False,
            "expired": True,
            "error": str(e)
        }


if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", os.environ.get("YEMENNET_BRIDGE_PORT", 5055)))
    host = os.environ.get("HOST", "0.0.0.0")
    print(f"Starting Yemen Net Bridge on {host}:{port}...")
    uvicorn.run(app, host=host, port=port, log_level="info")

