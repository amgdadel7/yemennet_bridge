import fs from 'fs';
import path from 'path';
import { INITIAL_ACCOUNTS } from './demoData';

const isServerless = !!(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME);
const dataDir = isServerless ? path.join('/tmp', 'data') : path.join(process.cwd(), 'data');
const dataFilePath = path.join(dataDir, 'accounts.json');

export function ensureDataFile() {
  try {
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
  } catch (e) {}

  try {
    if (!fs.existsSync(dataFilePath)) {
      const seedPath = path.join(process.cwd(), 'data', 'accounts.json');
      if (fs.existsSync(seedPath)) {
        const seedData = fs.readFileSync(seedPath, 'utf-8');
        fs.writeFileSync(dataFilePath, seedData, 'utf-8');
      } else {
        fs.writeFileSync(dataFilePath, JSON.stringify(INITIAL_ACCOUNTS, null, 2), 'utf-8');
      }
    }
  } catch (e) {}
}

export function readAccounts() {
  ensureDataFile();
  try {
    if (fs.existsSync(dataFilePath)) {
      const raw = fs.readFileSync(dataFilePath, 'utf-8');
      return JSON.parse(raw);
    }
    const seedPath = path.join(process.cwd(), 'data', 'accounts.json');
    if (fs.existsSync(seedPath)) {
      return JSON.parse(fs.readFileSync(seedPath, 'utf-8'));
    }
  } catch (err) {}
  return INITIAL_ACCOUNTS;
}

export function saveAccounts(accounts) {
  try {
    ensureDataFile();
    fs.writeFileSync(dataFilePath, JSON.stringify(accounts, null, 2), 'utf-8');
  } catch (e) {
    console.warn('saveAccounts serverless write warning:', e.message);
  }
}

export function getAccounts(userId, id) {
  let accounts = readAccounts();
  if (id) {
    return accounts.filter((a) => String(a.id) === String(id));
  }
  if (userId) {
    const userAccounts = accounts.filter((a) => a.user_id === userId);
    if (userAccounts.length > 0) return userAccounts;
  }
  return accounts;
}

export function addAccount(accountData) {
  const accounts = readAccounts();
  const newAccount = {
    id: accountData.id || Date.now().toString(),
    user_id: accountData.user_id || 'user_naqib_01',
    label: accountData.label || 'حساب جديد',
    username: accountData.username || '',
    password: accountData.password || '',
    balance: accountData.balance || '50.00 GB',
    expiry: accountData.expiry || '30/11/2026',
    status: accountData.status || 'نشط 🟢',
    type: accountData.type || (accountData.username?.startsWith('7') ? '4G' : 'ADSL'),
    speed: accountData.speed || '8 Mbps',
    ip: accountData.ip || '10.140.22.8',
    created_at: accountData.created_at || new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
  const updated = [newAccount, ...accounts];
  saveAccounts(updated);
  return newAccount;
}

export function updateAccount(id, updates) {
  const accounts = readAccounts();
  let updatedAccount = null;
  const newAccounts = accounts.map((a) => {
    if (String(a.id) === String(id)) {
      updatedAccount = { ...a, ...updates, updated_at: new Date().toISOString() };
      return updatedAccount;
    }
    return a;
  });
  saveAccounts(newAccounts);
  return updatedAccount;
}

export function deleteAccount(id) {
  const accounts = readAccounts();
  const filtered = accounts.filter((a) => String(a.id) !== String(id));
  saveAccounts(filtered);
  return true;
}
