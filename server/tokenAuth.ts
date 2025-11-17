import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'aimagicbox-jwt-secret-key-2025-secure';
const TOKEN_EXPIRY = '30d'; // 30 days

export interface TokenPayload {
  userId: string;
  email: string;
}

export function generateToken(payload: TokenPayload): string {
  console.log('[TokenAuth] generateToken called with:', typeof payload, JSON.stringify(payload));
  console.log('[TokenAuth] JWT_SECRET:', JWT_SECRET ? 'SET' : 'NOT SET');
  console.log('[TokenAuth] TOKEN_EXPIRY:', TOKEN_EXPIRY);
  return jwt.sign(payload, JWT_SECRET, { expiresIn: TOKEN_EXPIRY });
}

export function verifyToken(token: string): TokenPayload | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as TokenPayload;
    return decoded;
  } catch (error) {
    console.error('[TokenAuth] Token verification failed:', error);
    return null;
  }
}

export function extractTokenFromHeader(req: any): string | null {
  const authHeader = req.headers.authorization || req.headers.Authorization;
  if (!authHeader) return null;
  
  // Support both "Bearer <token>" and just "<token>"
  if (authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }
  
  return authHeader;
}
