import bcrypt from 'bcryptjs';
import { Database } from '../database/connection';
import { User, CreateUserRequest, LoginRequest, AuthResponse } from '../types';
import { JwtHelper } from '../utils/jwt';

export class AuthService {
  static async register(userData: CreateUserRequest): Promise<AuthResponse> {
    const { email, password } = userData;

    // Check if user already exists
    const existingUser = await Database.query(
      'SELECT id FROM users WHERE email = $1',
      [email]
    );

    if (existingUser.rows.length > 0) {
      throw new Error('User with this email already exists');
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    // Create user
    const result = await Database.query(
      'INSERT INTO users (email, password_hash) VALUES ($1, $2) RETURNING id, email, created_at',
      [email, passwordHash]
    );

    const user = result.rows[0];
    
    // Generate JWT token
    const token = JwtHelper.generateToken({
      userId: user.id,
      email: user.email
    });

    return {
      user: {
        id: user.id,
        email: user.email,
        created_at: user.created_at,
        updated_at: user.created_at
      },
      token
    };
  }

  static async login(credentials: LoginRequest): Promise<AuthResponse> {
    const { email, password } = credentials;

    // Find user
    const result = await Database.query(
      'SELECT id, email, password_hash, created_at, updated_at FROM users WHERE email = $1',
      [email]
    );

    if (result.rows.length === 0) {
      throw new Error('Invalid email or password');
    }

    const user = result.rows[0];

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password_hash);
    
    if (!isValidPassword) {
      throw new Error('Invalid email or password');
    }

    // Generate JWT token
    const token = JwtHelper.generateToken({
      userId: user.id,
      email: user.email
    });

    return {
      user: {
        id: user.id,
        email: user.email,
        created_at: user.created_at,
        updated_at: user.updated_at
      },
      token
    };
  }

  static async getUserById(userId: number): Promise<Omit<User, 'password_hash'> | null> {
    const result = await Database.query(
      'SELECT id, email, created_at, updated_at FROM users WHERE id = $1',
      [userId]
    );

    if (result.rows.length === 0) {
      return null;
    }

    return result.rows[0];
  }

  static async getUserByEmail(email: string): Promise<Omit<User, 'password_hash'> | null> {
    const result = await Database.query(
      'SELECT id, email, created_at, updated_at FROM users WHERE email = $1',
      [email]
    );

    if (result.rows.length === 0) {
      return null;
    }

    return result.rows[0];
  }
}
