import { describe, it, expect } from 'vitest';
import { createConnectionSchema, updateConnectionSchema, validateSSHConnection, getFieldErrors } from '../../src/hooks/useSSHConnectionValidation';

describe('useSSHConnectionValidation', () => {
  describe('createConnectionSchema', () => {
    it('should validate required fields for creating a connection', () => {
      const invalidData = {};
      const result = createConnectionSchema.safeParse(invalidData);
      expect(result.success).toBe(false);

      if (!result.success) {
        const errorFields = result.error.issues.map(issue => issue.path[0]);
        expect(errorFields).toEqual(expect.arrayContaining(['name', 'host', 'username', 'auth_type']));
      }
    });

    it('should reject invalid host format', () => {
      const invalidData = {
        name: 'Test',
        host: 'invalid@host',
        port: 22,
        username: 'test',
        auth_type: 'password',
        password: '123456'
      };

      const result = createConnectionSchema.safeParse(invalidData);
      expect(result.success).toBe(false);

      if (!result.success) {
        const hostErrors = result.error.issues.filter(issue => issue.path[0] === 'host');
        expect(hostErrors.length).toBeGreaterThan(0);
      }
    });

    it('should reject invalid IPv4 address range', () => {
      const invalidData = {
        name: 'Test',
        host: '999.999.999.999',
        port: 22,
        username: 'test',
        auth_type: 'password',
        password: '123456'
      };
      expect(createConnectionSchema.safeParse(invalidData).success).toBe(false);
    });

    it('should accept valid hostname', () => {
      const validData = {
        name: 'Test',
        host: 'example.com',
        port: 22,
        username: 'test',
        auth_type: 'password',
        password: '123456'
      };
      expect(createConnectionSchema.safeParse(validData).success).toBe(true);
    });

    it('should reject invalid port range', () => {
      const invalidData1 = {
        name: 'Test',
        host: 'localhost',
        port: 0,
        username: 'test',
        auth_type: 'password',
        password: '123456'
      };

      const invalidData2 = {
        name: 'Test',
        host: 'localhost',
        port: 65536,
        username: 'test',
        auth_type: 'password',
        password: '123456'
      };

      expect(createConnectionSchema.safeParse(invalidData1).success).toBe(false);
      expect(createConnectionSchema.safeParse(invalidData2).success).toBe(false);
    });

    it('should reject non-integer port', () => {
      const invalidData = {
        name: 'Test',
        host: 'localhost',
        port: 22.5,
        username: 'test',
        auth_type: 'password',
        password: '123456'
      };
      expect(createConnectionSchema.safeParse(invalidData).success).toBe(false);
    });

    it('should reject invalid username format', () => {
      const invalidData = {
        name: 'Test',
        host: 'localhost',
        port: 22,
        username: 'bad!user',
        auth_type: 'password',
        password: '123456'
      };
      const result = createConnectionSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      if (!result.success) {
        const usernameErrors = result.error.issues.filter(issue => issue.path[0] === 'username');
        expect(usernameErrors.length).toBeGreaterThan(0);
      }
    });

    it('should reject missing password when auth_type is password', () => {
      const invalidData = {
        name: 'Test',
        host: 'localhost',
        port: 22,
        username: 'test',
        auth_type: 'password',
        password: ''
      };

      const result = createConnectionSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('should reject missing private_key when auth_type is privateKey', () => {
      const invalidData = {
        name: 'Test',
        host: 'localhost',
        port: 22,
        username: 'test',
        auth_type: 'privateKey',
        private_key: ''
      };

      const result = createConnectionSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('should validate valid connection data for password auth', () => {
      const validData = {
        name: 'Test Connection',
        host: 'localhost',
        port: 22,
        username: 'testuser',
        auth_type: 'password',
        password: 'securepassword123'
      };

      const result = createConnectionSchema.safeParse(validData);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual(expect.objectContaining(validData));
      }
    });

    it('should validate valid connection data for private key auth', () => {
      const validData = {
        name: 'Test Connection',
        host: 'localhost',
        port: 22,
        username: 'testuser',
        auth_type: 'privateKey',
        private_key: '-----BEGIN RSA PRIVATE KEY-----\ntestkey\n-----END RSA PRIVATE KEY-----'
      };

      const result = createConnectionSchema.safeParse(validData);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual(expect.objectContaining(validData));
      }
    });
  });

  describe('updateConnectionSchema', () => {
    it('should allow partial updates', () => {
      const partialData = {
        name: 'Updated Connection'
      };

      const result = updateConnectionSchema.safeParse(partialData);
      expect(result.success).toBe(true);
    });

    it('should reject invalid field values in updates', () => {
      const invalidData = {
        port: 0
      };

      const result = updateConnectionSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('should enforce auth_type and credential consistency in updates', () => {
      const invalidData = {
        auth_type: 'password',
        password: ''
      };
      expect(updateConnectionSchema.safeParse(invalidData).success).toBe(false);
    });
  });

  describe('validateSSHConnection', () => {
    it('should validate creation data correctly', () => {
      const validData = {
        name: 'Test',
        host: 'localhost',
        port: 22,
        username: 'test',
        auth_type: 'password',
        password: '123456'
      };

      const result = validateSSHConnection.create(validData);
      expect(result.success).toBe(true);
    });

    it('should validate update data correctly', () => {
      const validData = {
        name: 'Updated Test'
      };

      const result = validateSSHConnection.update(validData);
      expect(result.success).toBe(true);
    });
  });

  describe('getFieldErrors', () => {
    it('should return field error message', () => {
      const invalidData = {
        name: '',
        host: 'localhost',
        port: 22,
        username: 'test',
        auth_type: 'password',
        password: '123456'
      };

      const nameError = getFieldErrors(invalidData, 'name');
      expect(nameError).not.toBeNull();
      expect(typeof nameError).toBe('string');
    });

    it('should return null for valid fields', () => {
      const validData = {
        name: 'Test',
        host: 'localhost',
        port: 22,
        username: 'test',
        auth_type: 'password',
        password: '123456'
      };

      expect(getFieldErrors(validData, 'name')).toBeNull();
    });
  });
});
