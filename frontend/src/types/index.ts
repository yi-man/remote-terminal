export type AuthType = 'password' | 'privateKey';

export interface SSHConnection {
  id: string;
  user_id: string;
  name: string;
  host: string;
  port: number;
  username: string;
  auth_type: AuthType;
  password?: string;
  private_key?: string;
  passphrase?: string;
  terminal_type?: string;
  font_size?: number;
  theme?: string;
  created_at: number;
  updated_at: number;
  last_used_at?: number;
}

export type CreateSSHConnection = Omit<SSHConnection, 'id' | 'created_at' | 'updated_at' | 'last_used_at'>;
export type UpdateSSHConnection = Partial<CreateSSHConnection>;
