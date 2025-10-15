import { User, CreateUserRequest, LoginRequest, AuthResponse } from '../types';
export declare class AuthService {
    static register(userData: CreateUserRequest): Promise<AuthResponse>;
    static login(credentials: LoginRequest): Promise<AuthResponse>;
    static getUserById(userId: number): Promise<Omit<User, 'password_hash'> | null>;
    static getUserByEmail(email: string): Promise<Omit<User, 'password_hash'> | null>;
}
//# sourceMappingURL=authService.d.ts.map