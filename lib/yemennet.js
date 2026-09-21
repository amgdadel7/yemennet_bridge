/**
 * Yemen Net ADSL Real-time Synchronizer & Data Parser
 * 
 * Provides integration methods to fetch real subscriber account balance
 * from the official Yemen Net ADSL portal (https://adsl.yemen.net.ye)
 * and supports parsing yadsl output.
 */

export function parseYemenNetData(input) {
  if (!input) return null;

  // If input is already an object (e.g., from yadsl fetch_data)
  if (typeof input === 'object') {
    return normalizeYadslDict(input);
  }

  // Replace Arabic decimal separators (٫) with standard dot (.)
  const text = String(input).replace(/\u066b/g, '.').replace(/\u066c/g, '');

  try {
    const result = {};

    // 1. Parse Remaining Balance (الرصيد المتبقي)
    // Matches patterns like: 80.74 Gigabyte or 80.74 جيجابايت or 45000 ميجابايت
    const balanceMatch =
      text.match(/(?:الرصيد المتبقي|الرصيد الحالي|Remaining Balance|Current Credit|balance)[^:\d<]*[:=><\s]+([\d.]+)\s*(Gigabyte|GB|MB|جيجابايت|ميجابايت)?/i) ||
      text.match(/([\d.]+)\s*(?:Gigabyte|GB|جيجابايت)/i) ||
      text.match(/([\d.]+)\s*(?:MB|ميجابايت)/i);

    if (balanceMatch) {
      let val = parseFloat(balanceMatch[1]);
      const unit = (balanceMatch[2] || '').toLowerCase();

      // If unit is MB or value is large (> 500 without unit), convert MB to GB
      if (unit.includes('mb') || unit.includes('ميجابايت') || (val > 1000 && !unit)) {
        val = parseFloat((val / 1024).toFixed(2));
      } else {
        val = parseFloat(val.toFixed(2));
      }
      result.balance = `${val.toFixed(2)} GB`;
      result.balance_val = val;
    }

    // 2. Parse Subscriber Name (اسم المشترك)
    const nameMatch =
      text.match(/(?:مرحباً|مرحبا|المشترك|اسم المشترك|Subscriber Name)[:\s]+([^<\n\r\t]+)/i) ||
      text.match(/id=["'](?:labWelcome|userName|user)["'][^>]*>([^<]+)/i);
    if (nameMatch) {
      const cleanName = nameMatch[1].replace(/مرحباً/g, '').replace(/مرحبا/g, '').replace(/[:]/g, '').trim();
      if (cleanName && cleanName.length > 2 && !cleanName.includes('تسجيل الدخول')) {
        result.subscriber_name = cleanName;
      }
    }

    // 3. Parse Subscription Package (اسم الباقة)
    const pkgMatch =
      text.match(/(?:الباقة|نوع الباقة|اسم الباقة|Package)[:\s]+([^<\n\r\t]+)/i) ||
      text.match(/(سوبرشامل[^\n\r<]+)/i);
    if (pkgMatch) {
      result.package_name = pkgMatch[1].replace(/[:]/g, '').trim();
    }

    // 4. Parse Registration Date (تاريخ التسجيل)
    const regMatch = text.match(/(?:تاريخ التسجيل|تاريخ الاشتراك|Registration Date)[:\s]+(\d{1,2}[/-]\d{1,2}[/-]\d{4})/i);
    if (regMatch) {
      result.registration_date = regMatch[1].replace(/-/g, '/');
    }

    // 5. Parse Expiry Date & Exact Time (تاريخ ووقت الانتهاء)
    const expiryFullMatch = text.match(
      /(?:تاريخ الانتهاء|تاريخ انتهاء الاشتراك|Expiry Date)[:\s]+(\d{1,2}[/-]\d{1,2}[/-]\d{4}(?:\s+\d{1,2}:\d{2}(?::\d{2})?(?:\s*[AP]M)?)?)/i
    );
    if (expiryFullMatch) {
      const fullExp = expiryFullMatch[1].trim();
      result.expiry = fullExp.replace(/-/g, '/');
      const timePart = fullExp.match(/\d{1,2}:\d{2}(?::\d{2})?(?:\s*[AP]M)?/i);
      if (timePart) {
        result.expiry_time = timePart[0];
      }
    }

    // 6. Parse Speed (سرعة الخط)
    const speedMatch =
      text.match(/(?:سرعة الخط|السرعة|Speed)[:\s]+([\d.]+\s*(?:Mbps|Kbps|ميجابت|كيلوبت))/i) ||
      text.match(/([\d.]+\s*Mbps)/i);
    if (speedMatch) {
      result.speed = speedMatch[1].trim();
    }

    // 7. Parse IP
    const ipMatch = text.match(/(?:10\.\d{1,3}\.\d{1,3}\.\d{1,3})/);
    if (ipMatch) {
      result.ip = ipMatch[0];
    }

    // 8. Status determination
    if (result.balance) {
      const num = parseFloat(result.balance.replace(/[^\d.]/g, '') || '0');
      if (num === 0) {
        result.status = 'منتهي 🔴';
      } else if (num < 5) {
        result.status = 'تحذير 🟡';
      } else {
        result.status = 'نشط 🟢';
      }
    }

    return Object.keys(result).length > 0 ? result : null;
  } catch (e) {
    console.error('Error parsing Yemen Net input:', e);
    return null;
  }
}

export function parseYemenNetHtml(html) {
  return parseYemenNetData(html);
}

/**
 * Normalizes dictionary returned by yadsl.fetch_data()
 */
export function normalizeYadslDict(dict) {
  const result = {};

  for (const [key, rawVal] of Object.entries(dict)) {
    const k = key.trim().toLowerCase();
    const val = String(rawVal).trim();

    if (k.includes('الرصيد') || k.includes('balance') || k.includes('remaining')) {
      const parsed = parseYemenNetData(`الرصيد: ${val}`);
      if (parsed?.balance) result.balance = parsed.balance;
    } else if (k.includes('انتهاء') || k.includes('expiry') || k.includes('date')) {
      const parsed = parseYemenNetData(`تاريخ: ${val}`);
      if (parsed?.expiry) result.expiry = parsed.expiry;
    } else if (k.includes('سرعة') || k.includes('speed')) {
      result.speed = val.includes('Mbps') ? val : `${val} Mbps`;
    } else if (k.includes('ip') || k.includes('عنوان')) {
      result.ip = val;
    } else if (k.includes('حالة') || k.includes('status')) {
      result.status = val.includes('نشط') || val.includes('active') ? 'نشط 🟢' : 'منتهي 🔴';
    }
  }

  if (result.balance && !result.status) {
    const num = parseFloat(result.balance.replace(/[^\d.]/g, '') || '0');
    result.status = num === 0 ? 'منتهي 🔴' : num < 5 ? 'تحذير 🟡' : 'نشط 🟢';
  }

  return result;
}

/**
 * Fetch real account data using an active session cookie
 * @param {string} cookie - The ASP.NET_SessionId or session cookie obtained from adsl.yemen.net.ye
 */
export async function fetchWithSessionCookie(cookie) {
  const cookieStr = cookie.includes('=') ? cookie : `ASP.NET_SessionId=${cookie}`;

  // 1. Try via Playwright Bridge (Bypasses SafeLine WAF and TLS fingerprinting)
  try {
    const bridgePort = process.env.YEMENNET_BRIDGE_PORT || '5055';
    const bridgeUrl = process.env.YEMENNET_BRIDGE_URL || `http://127.0.0.1:${bridgePort}`;
    const bridgeRes = await fetch(`${bridgeUrl}/api/session-sync`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cookie_str: cookieStr }),
      signal: AbortSignal.timeout(25000),
    });

    if (bridgeRes.ok) {
      const json = await bridgeRes.json();
      if (json.success && json.data && json.data.balance) {
        return {
          ...json.data,
          session_cookie: json.sessionCookie || cookieStr,
        };
      }
      if (json.expired) {
        const err = new Error(json.error || 'انتهت صلاحية جلسة يمن نت، يرجى تسجيل الدخول مجدداً');
        err.isSessionExpired = true;
        throw err;
      }
    }
  } catch (bridgeErr) {
    if (bridgeErr.isSessionExpired) throw bridgeErr;
    console.warn('Bridge session-sync attempt failed, falling back to direct fetch:', bridgeErr.message);
  }

  // 2. Direct fetch fallback
  const urls = [
    'https://adsl.yemen.net.ye/acct',
    'https://adsl.yemen.net.ye/ar/user_main.aspx'
  ];
  const headers = {
    'User-Agent':
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
    Cookie: cookieStr,
    Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
    'Accept-Language': 'ar,en-US;q=0.7,en;q=0.3',
  };

  let lastHtml = '';
  for (const url of urls) {
    try {
      const response = await fetch(url, { headers, redirect: 'follow' });
      if (response.ok) {
        const html = await response.text();
        lastHtml = html;
        const parsed = parseYemenNetHtml(html);
        if (parsed && parsed.balance) {
          return parsed;
        }
      }
    } catch (e) {
      console.warn(`Fetch error for ${url}:`, e);
    }
  }

  if (
    lastHtml.includes('Username') ||
    lastHtml.includes('CapatchInput') ||
    lastHtml.includes('login') ||
    lastHtml.includes('تسجيل الدخول')
  ) {
    const err = new Error('انتهت صلاحية جلسة يمن نت، يرجى تسجيل الدخول مجدداً');
    err.isSessionExpired = true;
    throw err;
  }

  throw new Error('لم نتمكن من استخراج بيانات الرصيد باستخدام الجلسة الحالية');
}
