/**
 * Firebase SDK（v10）初期化モジュール
 * OAS は us-central1 リージョン（AMS の asia-northeast1 と異なる）
 * localhost ではエミュレーターに接続する
 */
import { initializeApp } from 'firebase/app';
import { getAuth, connectAuthEmulator } from 'firebase/auth';
import {
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
  connectFirestoreEmulator,
} from 'firebase/firestore';
import { getFunctions, connectFunctionsEmulator } from 'firebase/functions';
import { firebaseConfig } from './config';

const app       = initializeApp(firebaseConfig);
const auth      = getAuth(app);
const db        = initializeFirestore(app, {
  localCache: persistentLocalCache({
    tabManager: persistentMultipleTabManager(),
  }),
});
const functions = getFunctions(app, 'us-central1');

// localhost ではエミュレーターに接続
if (location.hostname === 'localhost' || location.hostname === '127.0.0.1') {
  connectAuthEmulator(auth, 'http://localhost:9099', { disableWarnings: true });
  connectFirestoreEmulator(db, 'localhost', 8080);
  connectFunctionsEmulator(functions, 'localhost', 5001);
}

export { app, auth, db, functions };
