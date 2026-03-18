import { z } from 'zod';

const isValidIPv4 = (value: string) => {
  const parts = value.split('.');
  if (parts.length !== 4) return false;
  return parts.every(part => {
    if (!/^\d+$/.test(part)) return false;
    const n = Number(part);
    return n >= 0 && n <= 255;
  });
};

const isValidHost = (value: string) => {
  const v = value.trim();
  if (v.length === 0) return false;
  const ipv4LikeParts = v.split('.');
  const isIpv4Like = ipv4LikeParts.length === 4 && ipv4LikeParts.every(p => /^\d+$/.test(p));
  if (isIpv4Like) return isValidIPv4(v);
  if (isValidIPv4(v)) return true;
  // Basic hostname rule: labels of letters/digits/hyphen separated by dots, no leading/trailing hyphen
  if (v.length > 253) return false;
  const labels = v.split('.');
  return labels.every(label => /^[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?$/.test(label));
};

const isValidUsername = (value: string) => /^[a-zA-Z0-9_-]+$/.test(value);

const baseConnectionObject = z.object({
  name: z.string().min(1, '连接名称不能为空').max(100, '连接名称过长'),
  host: z.string()
    .min(1, '主机地址不能为空')
    .refine(isValidHost, '主机地址格式无效'),
  port: z.number().int().min(1).max(65535).default(22),
  username: z.string().min(1, '用户名不能为空').max(100, '用户名过长'),
  auth_type: z.enum(['password', 'privateKey']),
  password: z.string().optional(),
  private_key: z.string().optional(),
  passphrase: z.string().optional(),
  terminal_type: z.string().default('xterm-256color'),
  font_size: z.number().int().min(8).max(32).default(14),
  theme: z.string().default('dark'),
});

// 与后端完全一致的验证 schema（创建）
export const createConnectionSchema = baseConnectionObject
  .superRefine((data, ctx) => {
    if (!isValidUsername(data.username)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['username'],
        message: '用户名格式无效',
      });
    }
  })
  .refine(data => {
    if (data.auth_type === 'password') {
      return !!data.password && data.password.trim().length > 0;
    }
    if (data.auth_type === 'privateKey') {
      return !!data.private_key && data.private_key.trim().length > 0;
    }
    return true;
  }, {
    message: '密码认证需要提供密码，私钥认证需要提供私钥',
    path: ['auth_type']
  });

// 与后端完全一致的验证 schema（更新）
export const updateConnectionSchema = baseConnectionObject
  .partial()
  .superRefine((data, ctx) => {
    if (data.username !== undefined && !isValidUsername(data.username)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['username'],
        message: '用户名格式无效',
      });
    }
  })
  .refine(data => {
    if (data?.auth_type === 'password') {
      return data.password === undefined || (!!data.password && data.password.trim().length > 0);
    }
    if (data?.auth_type === 'privateKey') {
      return data.private_key === undefined || (!!data.private_key && data.private_key.trim().length > 0);
    }
    return true;
  }, {
    message: '密码认证需要提供密码，私钥认证需要提供私钥',
    path: ['auth_type']
  });

export const validateSSHConnection = {
  create: (data: any) => createConnectionSchema.safeParse(data),
  update: (data: any) => updateConnectionSchema.safeParse(data),
};

// 获取字段错误信息
export const getFieldErrors = (data: any, fieldName: string) => {
  const result = createConnectionSchema.safeParse(data);
  if (result.success) return null;

  const fieldErrors = result.error.issues
    .filter(issue => issue.path[0] === fieldName)
    .map(issue => issue.message);

  return fieldErrors.length > 0 ? fieldErrors[0] : null;
};
