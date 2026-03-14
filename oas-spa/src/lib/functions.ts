import { firebaseConfig } from './config';

const REGION = 'us-central1';

/** Cloud Function の URL を環境に応じて返す */
export function getFunctionUrl(name: string): string {
  if (location.hostname === 'localhost' || location.hostname === '127.0.0.1') {
    return `http://localhost:5001/${firebaseConfig.projectId}/${REGION}/${name}`;
  }
  return `https://${REGION}-${firebaseConfig.projectId}.cloudfunctions.net/${name}`;
}

/** Cloud Function を呼び出す汎用ヘルパー */
export async function callFunction<T = unknown>(name: string, data: Record<string, unknown>): Promise<T> {
  const res = await fetch(getFunctionUrl(name), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  const json = await res.json();
  if (!res.ok) throw json;
  return json as T;
}
