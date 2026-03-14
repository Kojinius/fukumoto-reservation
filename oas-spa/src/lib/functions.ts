import { firebaseConfig } from './config';
import { auth } from './firebase';

const REGION = 'us-central1';

/** Cloud Function の URL を環境に応じて返す */
export function getFunctionUrl(name: string): string {
  if (location.hostname === 'localhost' || location.hostname === '127.0.0.1') {
    return `http://localhost:5001/${firebaseConfig.projectId}/${REGION}/${name}`;
  }
  return `https://${REGION}-${firebaseConfig.projectId}.cloudfunctions.net/${name}`;
}

/** Cloud Function を呼び出す汎用ヘルパー（認証ヘッダー自動付与） */
export async function callFunction<T = unknown>(
  name: string,
  data: Record<string, unknown>,
  method: 'GET' | 'POST' | 'DELETE' = 'POST',
): Promise<T> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  const user = auth.currentUser;
  if (user) {
    headers['Authorization'] = `Bearer ${await user.getIdToken()}`;
  }

  const isBodyMethod = method === 'POST' || method === 'DELETE';
  const res = await fetch(getFunctionUrl(name), {
    method,
    headers,
    ...(isBodyMethod ? { body: JSON.stringify(data) } : {}),
  });
  const json = await res.json();
  if (!res.ok) throw json;
  return json as T;
}
