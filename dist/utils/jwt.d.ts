import { JwtPayload } from '../types';
export declare class JwtHelper {
    private static readonly secret;
    static generateToken(payload: JwtPayload): string;
    static verifyToken(token: string): JwtPayload;
    static decodeToken(token: string): JwtPayload | null;
}
//# sourceMappingURL=jwt.d.ts.map