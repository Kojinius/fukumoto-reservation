// エミュレーター上で admin クレームを付与するスクリプト
// 使い方: node set-admin-emulator.js <メールアドレス> <パスワード>

process.env.FIREBASE_AUTH_EMULATOR_HOST = 'localhost:9099';

const admin = require('firebase-admin');
admin.initializeApp({
  projectId: 'project-3040e21e-879f-4c66-a7d',
  credential: admin.credential.applicationDefault(),
});

const [,, email, password] = process.argv;
if (!email || !password) {
  console.error('使い方: node set-admin-emulator.js <メールアドレス> <パスワード>');
  process.exit(1);
}

const auth = admin.auth();
auth.createUser({ email, password })
  .then(u => {
    console.log('ユーザー作成:', u.uid);
    return auth.setCustomUserClaims(u.uid, { admin: true });
  })
  .then(() => { console.log('admin クレーム付与完了！'); process.exit(0); })
  .catch(e => { console.error(e.message); process.exit(1); });
