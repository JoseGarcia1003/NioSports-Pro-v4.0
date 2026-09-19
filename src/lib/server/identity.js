import { createRemoteJWKSet, jwtVerify } from 'jose';
import { error } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
import { env as publicEnv } from '$env/dynamic/public';

const keys = createRemoteJWKSet(new URL('https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com'));

export async function verifyFirebaseToken(token, projectId, keySet = keys) {
  const { payload } = await jwtVerify(token, keySet, {
    algorithms: ['RS256'], audience: projectId,
    issuer: `https://securetoken.google.com/${projectId}`,
    requiredClaims: ['exp', 'iat', 'sub', 'auth_time'],
  });
  const now = Math.floor(Date.now() / 1000);
  if (typeof payload.sub !== 'string' || !payload.sub.length || payload.sub.length > 128 ||
      !Number.isInteger(payload.iat) || payload.iat > now ||
      !Number.isInteger(payload.auth_time) || payload.auth_time > now) throw new Error('Invalid identity claims');
  return { uid: payload.sub, email: payload.email_verified === true ? payload.email : undefined };
}

export async function requireIdentity(request) {
  const match = /^Bearer ([^\s]+)$/i.exec(request.headers.get('authorization') || '');
  if (!match || match[1].length > 16384) error(401, 'Authentication required');
  const privateProjectId = env.FIREBASE_PROJECT_ID?.trim();
  const publicProjectId = publicEnv.PUBLIC_FIREBASE_PROJECT_ID?.trim();
  // Browser and server must verify identities from the same Firebase project.
  if (privateProjectId && publicProjectId && privateProjectId !== publicProjectId) error(503, 'Authentication unavailable');
  const projectId = privateProjectId || publicProjectId;
  if (!projectId) error(503, 'Authentication unavailable');
  try { return await verifyFirebaseToken(match[1], projectId); }
  catch { error(401, 'Invalid or expired session'); }
}
