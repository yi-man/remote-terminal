import { z } from 'zod';

// 与后端完全一致的验证 schema
const baseConnectionSchema = z.object({
  name: z.string().min(1, '连接名称不能为空').max(100, '连接名称过长'),
  host: z.string()
    .min(1, '主机地址不能为空')
    .refine(val => /^[a-zA-Z0-9.-]+$/.test(val) || /^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(val),
      '主机地址格式无效'),
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

export const createConnectionSchema = baseConnectionSchema.refine(data => {
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

export const updateConnectionSchema = baseConnectionSchema.partial()
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
