import { useState, useEffect } from 'react';

export function useUserId(): string {
  const [userId, setUserId] = useState<string | null>(null);

  // 在组件初始化阶段直接获取或生成用户 ID
  const getOrGenerateUserId = (): string => {
    // 尝试从 localStorage 加载
    const stored = localStorage.getItem('user_id');

    if (stored) {
      return stored;
    } else {
      // 生成一个简单的指纹（使用 navigator API）
      const fingerprint = generateBrowserFingerprint();
      localStorage.setItem('user_id', fingerprint);
      return fingerprint;
    }
  };

  // 立即计算用户 ID，避免返回 null
  const initialUserId = getOrGenerateUserId();
  if (!userId) {
    setUserId(initialUserId);
  }

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

  return initialUserId;
}
