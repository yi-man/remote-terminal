import { useState, useEffect } from 'react';

export function useUserId(): string {
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    // 尝试从 localStorage 加载
    const stored = localStorage.getItem('user_id');

    if (stored) {
      setUserId(stored);
    } else {
      // 生成一个简单的指纹（使用 navigator API）
      const fingerprint = generateBrowserFingerprint();
      localStorage.setItem('user_id', fingerprint);
      setUserId(fingerprint);
    }
  }, []);

  function generateBrowserFingerprint(): string {
    // 简单的浏览器指纹生成（实际项目中应使用 FingerprintJS2）
    const components = [
      navigator.userAgent,
      navigator.language,
      navigator.platform,
      navigator.hardwareConcurrency,
      screen.width + 'x' + screen.height,
    ];

    return btoa(components.join('|'));
  }

  return userId as string;
}
