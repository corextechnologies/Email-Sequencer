import { User } from '../types';
export declare class ProfileService {
    static updateEmail(userId: number, newEmail: string, currentPassword: string): Promise<User>;
    static changePassword(userId: number, currentPassword: string, newPassword: string): Promise<void>;
    static getProfile(userId: number): Promise<User>;
}
//# sourceMappingURL=profileService.d.ts.map