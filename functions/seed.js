/**
 * seed.js — OAS エミュレーター用テストデータ作成
 *
 * 使い方: node functions/seed.js
 * 前提: firebase emulators:start 起動済み
 *
 * 作成されるデータ:
 *   - settings/clinic（クリニック基本設定 + 営業時間 + PP）
 *   - 管理者ユーザー2名（Auth + Firestore + admin カスタムクレーム）
 *   - サンプル予約6件 + 対応スロット（今日〜2日後）
 *   - 監査ログサンプル1件
 *
 * ログイン情報:
 *   [管理者]   admin@oas-test.local / Admin001!（パスワード変更不要）
 *   [スタッフ] staff@oas-test.local / Staff001!（初回パスワード変更必要）
 */

process.env.FIREBASE_AUTH_EMULATOR_HOST = "localhost:9099";
process.env.FIRESTORE_EMULATOR_HOST     = "localhost:8080";

const admin  = require("firebase-admin");
const crypto = require("crypto");

admin.initializeApp({
  projectId:  "project-3040e21e-879f-4c66-a7d",
  credential: admin.credential.applicationDefault(),
});

const db   = admin.firestore();
const auth = admin.auth();

// ── クリニック設定 ────────────────────────────────────────────────
const CLINIC_SETTINGS = {
  clinicName:      "テストクリニック",
  phone:           "03-1234-5678",
  clinicUrl:       "https://example.com",
  clinicZip:       "100-0001",
  clinicAddress:   "東京都千代田区千代田1-1",
  clinicAddressSub: "テストビル2F",
  clinicLogo:      "",
  businessHours: {
    "0": { open: false, amOpen: false, amStart: "9:00", amEnd: "12:00", pmOpen: false, pmStart: "14:00", pmEnd: "18:00" },
    "1": { open: true,  amOpen: true,  amStart: "9:00", amEnd: "12:00", pmOpen: true,  pmStart: "14:00", pmEnd: "18:00" },
    "2": { open: true,  amOpen: true,  amStart: "9:00", amEnd: "12:00", pmOpen: true,  pmStart: "14:00", pmEnd: "18:00" },
    "3": { open: true,  amOpen: true,  amStart: "9:00", amEnd: "12:00", pmOpen: false, pmStart: "14:00", pmEnd: "18:00" },
    "4": { open: true,  amOpen: true,  amStart: "9:00", amEnd: "12:00", pmOpen: true,  pmStart: "14:00", pmEnd: "18:00" },
    "5": { open: true,  amOpen: true,  amStart: "9:00", amEnd: "12:00", pmOpen: true,  pmStart: "14:00", pmEnd: "18:00" },
    "6": { open: true,  amOpen: true,  amStart: "9:00", amEnd: "12:00", pmOpen: false, pmStart: "14:00", pmEnd: "18:00" },
  },
  holidays:     [],
  holidayNames: {},
  bookingCutoffMinutes: 60,
  cancelCutoffMinutes:  120,
  announcement: { active: false, type: "info", message: "", startDate: null, endDate: null },
  maintenance:  { startDate: null, endDate: null },
  privacyPolicy: [
    "当院は、患者様の個人情報を適切に管理し、以下の目的にのみ使用いたします。",
    "",
    "1. 診療および治療に関する業務",
    "2. 予約管理および確認連絡",
    "3. 医療保険事務",
    "4. 当院内部での医療サービス向上のための分析",
    "",
    "個人情報の第三者への提供は、法令に基づく場合を除き、患者様の同意なく行いません。",
    "",
    "個人情報に関するお問い合わせは、受付窓口までお願いいたします。",
  ].join("\n"),
  sensitiveDataConsentText: '',  // 空 = デフォルト文言使用
  updatedAt: new Date().toISOString(),
};

// ── 管理者ユーザー ────────────────────────────────────────────────
const ADMIN_USERS = [
  {
    email:       "admin@oas-test.local",
    password:    "Admin001!",
    displayName: "管理者テスト",
    mustChangePassword: false,  // テスト用 — すぐログイン可能
  },
  {
    email:       "staff@oas-test.local",
    password:    "Staff001!",
    displayName: "スタッフテスト",
    mustChangePassword: true,   // 初回パスワード変更フロー確認用
  },
];

// ── サンプル予約 ──────────────────────────────────────────────────
function dateStr(daysFromToday) {
  const d = new Date();
  d.setDate(d.getDate() + daysFromToday);
  return d.toISOString().split("T")[0];
}

const SAMPLE_RESERVATIONS = [
  // 今日 — 午前2件 + 午後1件
  {
    date: dateStr(0), time: "9:00",
    name: "山田太郎", furigana: "ヤマダタロウ", birthdate: "1985-04-15",
    zip: "100-0001", address: "東京都千代田区千代田1-2-3",
    phone: "090-1234-5678", email: "yamada@example.com",
    gender: "男性", visitType: "初診", insurance: "社保",
    symptoms: "頭痛が3日間続いています", notes: "", contactMethod: "電話",
    status: "confirmed",
    hasSensitiveDataConsent: true,
  },
  {
    date: dateStr(0), time: "10:00",
    name: "佐藤花子", furigana: "サトウハナコ", birthdate: "1990-08-22",
    zip: "150-0001", address: "東京都渋谷区神宮前2-3-4",
    phone: "080-2345-6789", email: "sato@example.com",
    gender: "女性", visitType: "再診", insurance: "国保",
    symptoms: "定期検診", notes: "前回の血液検査結果確認", contactMethod: "メール",
    status: "confirmed",
    hasSensitiveDataConsent: true,
  },
  {
    date: dateStr(0), time: "14:00",
    name: "鈴木一郎", furigana: "スズキイチロウ", birthdate: "1975-12-01",
    zip: "160-0001", address: "東京都新宿区片町1-2",
    phone: "070-3456-7890", email: "",
    gender: "男性", visitType: "初診", insurance: "社保",
    symptoms: "腰の痛みが1週間ほど続いている", notes: "", contactMethod: "電話",
    status: "pending",
    hasSensitiveDataConsent: true,
  },
  // 明日 — 2件
  {
    date: dateStr(1), time: "9:30",
    name: "田中美咲", furigana: "タナカミサキ", birthdate: "2000-03-10",
    zip: "110-0001", address: "東京都台東区谷中3-4-5",
    phone: "090-4567-8901", email: "tanaka@example.com",
    gender: "女性", visitType: "初診", insurance: "社保",
    symptoms: "咳が続いている", notes: "", contactMethod: "メール",
    status: "pending",
    hasSensitiveDataConsent: true,
  },
  {
    date: dateStr(1), time: "15:00",
    name: "高橋健太", furigana: "タカハシケンタ", birthdate: "1968-07-20",
    zip: "170-0001", address: "東京都豊島区西巣鴨4-5-6",
    phone: "080-5678-9012", email: "takahashi@example.com",
    gender: "男性", visitType: "再診", insurance: "国保",
    symptoms: "血圧の経過観察", notes: "降圧剤服用中", contactMethod: "電話",
    status: "pending",
    hasSensitiveDataConsent: true,
  },
  // 明後日 — キャンセル済み1件
  {
    date: dateStr(2), time: "11:00",
    name: "渡辺由美", furigana: "ワタナベユミ", birthdate: "1995-11-30",
    zip: "180-0001", address: "東京都武蔵野市吉祥寺1-2-3",
    phone: "090-6789-0123", email: "watanabe@example.com",
    gender: "女性", visitType: "初診", insurance: "社保",
    symptoms: "皮膚のかゆみ", notes: "", contactMethod: "メール",
    status: "cancelled",
    hasSensitiveDataConsent: true,
  },
];

// ── メイン ────────────────────────────────────────────────────────
async function main() {
  console.log("=== OAS シードデータ投入開始 ===\n");

  // 1. クリニック設定
  console.log("[1/4] settings/clinic を作成...");
  await db.collection("settings").doc("clinic").set(CLINIC_SETTINGS);
  console.log("  ✓ クリニック設定作成完了");

  // 2. 管理者ユーザー（Auth + Firestore + カスタムクレーム）
  console.log("[2/4] 管理者ユーザーを作成...");
  for (const u of ADMIN_USERS) {
    try {
      const rec = await auth.createUser({
        email:       u.email,
        password:    u.password,
        displayName: u.displayName,
      });
      await auth.setCustomUserClaims(rec.uid, { admin: true });
      await db.collection("users").doc(rec.uid).set({
        uid:                 rec.uid,
        email:               u.email,
        displayName:         u.displayName,
        isAdmin:             true,
        mustChangePassword:  u.mustChangePassword,
        createdAt:           new Date().toISOString(),
      });
      console.log(`  ✓ ${u.email} (UID: ${rec.uid}) — mustChangePassword: ${u.mustChangePassword}`);
    } catch (err) {
      if (err.code === "auth/email-already-exists") {
        console.log(`  ⚠ ${u.email} は既に存在（スキップ）`);
      } else {
        throw err;
      }
    }
  }

  // 3. サンプル予約 + スロット
  console.log("[3/4] サンプル予約・スロットを作成...");
  for (const r of SAMPLE_RESERVATIONS) {
    const id     = crypto.randomUUID();
    const slotId = `${r.date}_${r.time.replace(":", "")}`;

    await db.collection("slots").doc(slotId).set({
      date:          r.date,
      time:          r.time,
      reservationId: id,
      status:        r.status === "cancelled" ? "cancelled" : "pending",
    });

    await db.collection("reservations").doc(id).set({
      id,
      date:          r.date,
      time:          r.time,
      name:          r.name,
      furigana:      r.furigana,
      birthdate:     r.birthdate,
      zip:           r.zip,
      address:       r.address,
      phone:         r.phone,
      email:         r.email,
      gender:        r.gender,
      visitType:     r.visitType,
      insurance:     r.insurance,
      symptoms:      r.symptoms,
      notes:         r.notes,
      contactMethod: r.contactMethod,
      hasSensitiveDataConsent: r.hasSensitiveDataConsent ?? false,
      status:        r.status,
      createdAt:     new Date().toISOString(),
    });

    console.log(`  ✓ ${r.date} ${r.time} — ${r.name}（${r.status}）`);
  }

  // 4. 監査ログサンプル
  console.log("[4/4] 監査ログサンプルを作成...");
  await db.collection("audit_logs").add({
    action:      "seed_executed",
    performedBy: "system",
    timestamp:   new Date().toISOString(),
    details:     "テストデータ投入（OAS シードスクリプト）",
  });
  console.log("  ✓ 監査ログ作成完了");

  // ── 完了レポート ──
  console.log("\n=== OAS シードデータ投入完了 ===");
  console.log("\nログイン情報:");
  console.log("  [管理者]   admin@oas-test.local / Admin001!（パスワード変更不要）");
  console.log("  [スタッフ] staff@oas-test.local / Staff001!（初回パスワード変更必要）");
  console.log("\n予約サンプル:");
  console.log(`  今日     (${dateStr(0)}): 3件（確定2 + 保留1）`);
  console.log(`  明日     (${dateStr(1)}): 2件（保留2）`);
  console.log(`  明後日   (${dateStr(2)}): 1件（キャンセル済み）`);

  process.exit(0);
}

main().catch((err) => {
  console.error("シード投入エラー:", err);
  process.exit(1);
});
