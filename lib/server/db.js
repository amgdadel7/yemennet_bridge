import fs from 'fs';
import path from 'path';
import { INITIAL_ACCOUNTS, INITIAL_USER, INITIAL_SETTINGS, INITIAL_LOGS } from '../demoData';

const isServerless = !!(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME);
const dataDir = isServerless ? path.join('/tmp', 'data') : path.join(process.cwd(), 'data');

function ensureDir(dir) {
  try {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  } catch (e) {
    // Ignore in read-only environment
  }
}

function getFilePath(table) {
  ensureDir(dataDir);
  return path.join(dataDir, `${table}.json`);
}

function readTable(table, defaultData = []) {
  try {
    const filePath = getFilePath(table);
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, 'utf-8');
      return JSON.parse(content);
    }

    // In serverless, if not in /tmp, check read-only project bundle
    const seedPath = path.join(process.cwd(), 'data', `${table}.json`);
    if (fs.existsSync(seedPath)) {
      const content = fs.readFileSync(seedPath, 'utf-8');
      const parsed = JSON.parse(content);
      // Try to seed /tmp
      try {
        ensureDir(dataDir);
        fs.writeFileSync(filePath, JSON.stringify(parsed, null, 2), 'utf-8');
      } catch {}
      return parsed;
    }
  } catch (err) {
    console.warn(`readTable warning for ${table}:`, err.message);
  }
  return defaultData;
}

function writeTable(table, data) {
  try {
    ensureDir(dataDir);
    const filePath = path.join(dataDir, `${table}.json`);
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
  } catch (err) {
    console.warn(`writeTable warning for ${table} (read-only filesystem ignored):`, err.message);
  }
}

// Generate 14-day history for an account
export function generateInitialHistory(rawBalance = 50) {
  const points = [];
  let cur = rawBalance + 22.5;

  for (let i = 13; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    if (i < 13) cur -= 1.8 * (0.8 + (i % 3) * 0.2);
    points.push({
      id: `${Date.now()}_${i}`,
      date: d.toISOString().split('T')[0],
      displayDate: d.toLocaleDateString('ar-YE', { day: 'numeric', month: 'short' }),
      balance_gb: Math.max(0, parseFloat(cur.toFixed(2))),
      usage_gb: parseFloat((1.5 + ((i * 1.3) % 2.5)).toFixed(2)),
    });
  }
  if (points.length > 0) {
    points[points.length - 1].balance_gb = rawBalance;
  }
  return points;
}

// ==========================================
// USERS REPOSITORY
// ==========================================
export const UsersDb = {
  getAll: () => readTable('users', [
    {
      id: 'usr_777000111',
      phone: '777000111',
      name: 'النقيب للمعلومات',
      // Default demo password hash for '123456'
      password_hash: '8d969eef6ecad3c29a3a629280e686cf0c3f5d5a86aff3ca12020c923adc6c92', // sha256 of 123456
      role: 'admin',
      created_at: '2026-01-01T00:00:00Z',
    }
  ]),
  findByPhone: (phone) => {
    const users = UsersDb.getAll();
    return users.find((u) => u.phone === phone);
  },
  findById: (id) => {
    const users = UsersDb.getAll();
    return users.find((u) => u.id === id);
  },
  create: (userData) => {
    const users = UsersDb.getAll();
    const newUser = {
      id: userData.id || `usr_${userData.phone.replace(/\D/g, '')}`,
      phone: userData.phone,
      name: userData.name || `مستخدم (${userData.phone})`,
      password_hash: userData.password_hash,
      role: userData.role || 'user',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    users.push(newUser);
    writeTable('users', users);
    return newUser;
  },
  updatePassword: (id, newPasswordHash) => {
    const users = UsersDb.getAll();
    const index = users.findIndex((u) => u.id === id);
    if (index !== -1) {
      users[index].password_hash = newPasswordHash;
      users[index].updated_at = new Date().toISOString();
      writeTable('users', users);
      return true;
    }
    return false;
  },
};

// ==========================================
// ACCOUNTS REPOSITORY
// ==========================================
export const AccountsDb = {
  getAll: (userId) => {
    const accounts = readTable('accounts', INITIAL_ACCOUNTS);
    if (userId) {
      const filtered = accounts.filter((a) => a.user_id === userId);
      return filtered.length > 0 ? filtered : accounts;
    }
    return accounts;
  },
  getById: (id) => {
    const accounts = readTable('accounts', INITIAL_ACCOUNTS);
    return accounts.find((a) => String(a.id) === String(id));
  },
  create: (accountData) => {
    const accounts = readTable('accounts', INITIAL_ACCOUNTS);
    const num = parseFloat(String(accountData.balance || '50').replace(/[^\d.]/g, '') || '50');
    const newAcc = {
      id: accountData.id || Date.now().toString(),
      user_id: accountData.user_id || 'usr_777000111',
      label: accountData.label || 'اشتراك جديد',
      username: accountData.username || '',
      password: accountData.password || '',
      balance: accountData.balance?.includes('GB') ? accountData.balance : `${num.toFixed(2)} GB`,
      expiry: accountData.expiry || '30/11/2026',
      status: num === 0 ? 'منتهي 🔴' : num < 5 ? 'تحذير 🟡' : 'نشط 🟢',
      type: accountData.type || (accountData.username?.startsWith('7') ? '4G' : 'ADSL'),
      speed: accountData.speed || '8 Mbps',
      ip: accountData.ip || '10.140.22.8',
      last_synced: new Date().toISOString(),
      created_at: accountData.created_at || new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    const updated = [newAcc, ...accounts];
    writeTable('accounts', updated);

    // Also initialize history for this new account
    UsageDb.initForAccount(newAcc.id, num);

    return newAcc;
  },
  update: (id, updates) => {
    const accounts = readTable('accounts', INITIAL_ACCOUNTS);
    let updatedAcc = null;
    const newAccounts = accounts.map((a) => {
      if (String(a.id) === String(id)) {
        updatedAcc = {
          ...a,
          ...updates,
          updated_at: new Date().toISOString(),
        };
        return updatedAcc;
      }
      return a;
    });
    writeTable('accounts', newAccounts);
    return updatedAcc;
  },
  delete: (id) => {
    const accounts = readTable('accounts', INITIAL_ACCOUNTS);
    const filtered = accounts.filter((a) => String(a.id) !== String(id));
    writeTable('accounts', filtered);
    UsageDb.deleteForAccount(id);
    return true;
  },
};

// ==========================================
// DAILY USAGE & HISTORY REPOSITORY
// ==========================================
export const UsageDb = {
  getAll: () => readTable('daily_usage', []),
  getForAccount: (accountId) => {
    const all = readTable('daily_usage', []);
    let history = all.filter((u) => String(u.account_id) === String(accountId));
    if (history.length === 0) {
      // Find account balance and generate points
      const acc = AccountsDb.getById(accountId);
      const bal = parseFloat(acc?.balance?.replace(/[^\d.]/g, '') || '50');
      const generated = generateInitialHistory(bal).map((p) => ({
        ...p,
        account_id: String(accountId),
      }));
      const updatedAll = [...all, ...generated];
      writeTable('daily_usage', updatedAll);
      return generated;
    }
    return history.sort((a, b) => new Date(a.date) - new Date(b.date));
  },
  initForAccount: (accountId, initialBalance = 50) => {
    const all = readTable('daily_usage', []);
    const points = generateInitialHistory(initialBalance).map((p) => ({
      ...p,
      account_id: String(accountId),
    }));
    writeTable('daily_usage', [...all, ...points]);
    return points;
  },
  recordSync: (accountId, newBalanceGb, dailyUsageGb = 1.8) => {
    const all = readTable('daily_usage', []);
    const today = new Date().toISOString().split('T')[0];
    const displayDate = new Date().toLocaleDateString('ar-YE', { day: 'numeric', month: 'short' });

    const existingIdx = all.findIndex((u) => String(u.account_id) === String(accountId) && u.date === today);

    if (existingIdx !== -1) {
      all[existingIdx].balance_gb = newBalanceGb;
      all[existingIdx].usage_gb = parseFloat((all[existingIdx].usage_gb + dailyUsageGb).toFixed(2));
    } else {
      all.push({
        id: Date.now().toString(),
        account_id: String(accountId),
        date: today,
        displayDate: displayDate,
        balance_gb: newBalanceGb,
        usage_gb: dailyUsageGb,
      });
    }
    writeTable('daily_usage', all);
  },
  deleteForAccount: (accountId) => {
    const all = readTable('daily_usage', []);
    const filtered = all.filter((u) => String(u.account_id) !== String(accountId));
    writeTable('daily_usage', filtered);
  }
};

// ==========================================
// ACTIVITY LOGS REPOSITORY
// ==========================================
export const ActivityDb = {
  getAll: (userId) => {
    const logs = readTable('activity_logs', INITIAL_LOGS);
    return logs.sort((a, b) => new Date(b.created_at || b.date) - new Date(a.created_at || a.date));
  },
  log: (entry) => {
    const logs = readTable('activity_logs', INITIAL_LOGS);
    const newLog = {
      id: Date.now().toString(),
      user_id: entry.user_id || 'usr_777000111',
      account_id: entry.account_id || null,
      title: entry.title,
      details: entry.details || '',
      type: entry.type || 'info', // 'success' | 'warning' | 'error' | 'info'
      date: new Date().toLocaleDateString('ar-YE', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }),
      created_at: new Date().toISOString(),
    };
    logs.unshift(newLog);
    // Keep last 150 entries
    if (logs.length > 150) logs.length = 150;
    writeTable('activity_logs', logs);
    return newLog;
  },
};

// ==========================================
// USER SETTINGS REPOSITORY
// ==========================================
export const SettingsDb = {
  get: (userId = 'usr_777000111') => {
    const all = readTable('user_settings', [{ user_id: userId, ...INITIAL_SETTINGS }]);
    const found = all.find((s) => s.user_id === userId);
    return found || { user_id: userId, ...INITIAL_SETTINGS };
  },
  save: (userId = 'usr_777000111', updates) => {
    const all = readTable('user_settings', []);
    const idx = all.findIndex((s) => s.user_id === userId);
    const merged = { user_id: userId, ...INITIAL_SETTINGS, ...(idx !== -1 ? all[idx] : {}), ...updates, updated_at: new Date().toISOString() };
    if (idx !== -1) {
      all[idx] = merged;
    } else {
      all.push(merged);
    }
    writeTable('user_settings', all);
    return merged;
  },
};

// ==========================================
// NOTIFICATIONS REPOSITORY
// ==========================================
export const NotificationsDb = {
  getAll: (userId = 'usr_777000111') => {
    const all = readTable('notifications', [
      {
        id: 'notif_1',
        user_id: userId,
        title: 'مرحباً بك في نظام يمن نت مونيتور',
        message: 'تم تفعيل التنبيهات التلقائية ومراقبة رصيد الاشتراكات بنجاح.',
        type: 'info',
        read: false,
        created_at: new Date().toISOString(),
      }
    ]);
    return all.filter((n) => !userId || n.user_id === userId);
  },
  create: (userId, title, message, type = 'info') => {
    const all = readTable('notifications', []);
    const newNotif = {
      id: `notif_${Date.now()}`,
      user_id: userId || 'usr_777000111',
      title,
      message,
      type,
      read: false,
      created_at: new Date().toISOString(),
    };
    all.unshift(newNotif);
    writeTable('notifications', all);
    return newNotif;
  },
  markAsRead: (id) => {
    const all = readTable('notifications', []);
    const found = all.find((n) => n.id === id);
    if (found) {
      found.read = true;
      writeTable('notifications', all);
    }
    return true;
  }
};
