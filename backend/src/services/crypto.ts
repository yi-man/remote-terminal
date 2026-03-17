import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from 'crypto';

const ALGORITHM = 'aes-256-ctr';
const SALT = process.env.ENCRYPTION_SALT || 'default-salt';
const KEY = scryptSync(process.env.ENCRYPTION_KEY || 'default-key', SALT, 32);

export function encrypt(text: string | null | undefined): string | null {
  if (text == null) {
    return null;
  }
  const iv = randomBytes(16);
  const cipher = createCipheriv(ALGORITHM, KEY, iv);
  const encrypted = Buffer.concat([cipher.update(text), cipher.final()]);

  return `${iv.toString('hex')}:${encrypted.toString('hex')}`;
}

export function decrypt(text: string | null | undefined): string | null {
  if (text == null) {
    return null;
  }

  // 检查文本是否是加密格式（包含 : 分隔符）
  if (!text.includes(':')) {
    // 如果不是加密格式，可能是未加密的旧数据
    return null;
  }

  const [ivHex, encryptedHex] = text.split(':');
  if (!ivHex || !encryptedHex) {
    return null; // 如果格式不正确，返回 null
  }

  try {
    const iv = Buffer.from(ivHex, 'hex');
    const encrypted = Buffer.from(encryptedHex, 'hex');

    const decipher = createDecipheriv(ALGORITHM, KEY, iv);
    const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);

    return decrypted.toString();
  } catch (err) {
    console.warn('Decryption failed:', err);
    return null;
  }
}
