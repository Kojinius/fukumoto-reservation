const { setGlobalOptions }            = require("firebase-functions");
const { onRequest, onCall, HttpsError } = require("firebase-functions/https");
const { onSchedule }                  = require("firebase-functions/scheduler");
const { defineSecret }                = require("firebase-functions/params");
const { Resend }                      = require("resend");
const { getAuth }                     = require("firebase-admin/auth");
const { getFirestore }                = require("firebase-admin/firestore");
const { initializeApp }               = require("firebase-admin/app");

initializeApp();
setGlobalOptions({ maxInstances: 10 });

const resendApiKey = defineSecret("RESEND_API_KEY");
const ADMIN_EMAIL  = "admin@kojinius.jp";
const FROM_ADDRESS = "福元鍼灸整骨院 <noreply@kojinius.jp>";

// ── 共通：メール送信ヘルパー ──
async function sendMail(resend, { to, subject, html }) {
  const { data, error } = await resend.emails.send({ from: FROM_ADDRESS, to: [to], subject, html });
  if (error) throw new Error(`Resend エラー: ${JSON.stringify(error)}`);
  return data;
}

/**
 * 【3-1】患者への予約確認メールを送信する
 * POST /sendReservationEmail
 * Body: { to, name, date, time, menu, id }
 */
// ── 共通：CORSヘッダー設定 ──
function setCorsHeaders(req, res) {
  const allowed = ["https://kojinius.jp", "http://localhost:5000"];
  const origin  = req.headers.origin;
  res.set("Access-Control-Allow-Origin",  allowed.includes(origin) ? origin : "https://kojinius.jp");
  res.set("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.set("Access-Control-Allow-Headers", "Content-Type");
}

exports.sendReservationEmail = onRequest(
  { secrets: [resendApiKey], invoker: "public" },
  async (req, res) => {
    setCorsHeaders(req, res);

    if (req.method === "OPTIONS") { res.status(204).send(""); return; }
    if (req.method !== "POST")    { res.status(405).json({ error: "Method Not Allowed" }); return; }

    const { to, name, date, time, menu, id } = req.body;
    if (!to || !name || !date || !time || !menu) {
      res.status(400).json({ error: "必須パラメータが不足しています" });
      return;
    }

    const resend = new Resend(resendApiKey.value());
    try {
      const data = await sendMail(resend, {
        to,
        subject: "【福元鍼灸整骨院】ご予約確認",
        html: `
          <div style="font-family:sans-serif;max-width:600px;margin:0 auto;color:#333;">
            <div style="background:#72586f;padding:24px 32px;">
              <h1 style="margin:0;color:#fff;font-size:20px;">ご予約ありがとうございます</h1>
            </div>
            <div style="padding:24px 32px;">
              <p>${name} 様</p>
              <p>以下の内容でご予約を承りました。</p>
              <table style="border-collapse:collapse;width:100%;margin-bottom:24px;">
                <tr>
                  <td style="padding:10px 12px;border:1px solid #ddd;background:#f9f9f9;width:30%;font-weight:bold;">予約番号</td>
                  <td style="padding:10px 12px;border:1px solid #ddd;font-family:monospace;">${id || '-'}</td>
                </tr>
                <tr>
                  <td style="padding:10px 12px;border:1px solid #ddd;background:#f9f9f9;font-weight:bold;">日時</td>
                  <td style="padding:10px 12px;border:1px solid #ddd;">${date} ${time}〜</td>
                </tr>
                <tr>
                  <td style="padding:10px 12px;border:1px solid #ddd;background:#f9f9f9;font-weight:bold;">メニュー</td>
                  <td style="padding:10px 12px;border:1px solid #ddd;">${menu}</td>
                </tr>
              </table>
              <div style="background:#fff8f0;border-left:4px solid #f5913e;padding:12px 16px;margin-bottom:24px;">
                <p style="margin:0 0 8px;font-weight:bold;">キャンセルについて</p>
                <p style="margin:0;font-size:14px;">ご予約のキャンセル・変更は、お電話にてご連絡ください。<br>
                  <strong>電話番号：0120-XXX-XXX</strong>（受付時間：診療時間内）</p>
              </div>
              <p>ご不明な点がございましたら、お気軽にお問い合わせください。</p>
            </div>
            <div style="background:#f5f5f5;padding:16px 32px;">
              <p style="margin:0;color:#888;font-size:12px;">
                福元鍼灸整骨院<br>
                月〜金 9:00〜19:30 / 土 9:00〜17:00 / 日・祝 休診<br>
                https://kojinius.jp
              </p>
            </div>
          </div>
        `,
      });
      res.status(200).json({ success: true, id: data.id });
    } catch (err) {
      console.error("患者確認メール送信エラー:", err);
      res.status(500).json({ error: "メール送信に失敗しました" });
    }
  }
);

/**
 * 【3-2】管理者への新規予約通知
 * POST /notifyAdminOnReservation
 * Body: { id, name, furigana, date, time, visitType, insurance, phone, symptoms, contactMethod }
 */
exports.notifyAdminOnReservation = onRequest(
  { secrets: [resendApiKey], invoker: "public" },
  async (req, res) => {
    setCorsHeaders(req, res);

    if (req.method === "OPTIONS") { res.status(204).send(""); return; }
    if (req.method !== "POST")    { res.status(405).json({ error: "Method Not Allowed" }); return; }

    const { id, name, furigana, date, time, visitType, insurance, phone, symptoms, contactMethod } = req.body;
    if (!name || !date || !time || !phone) {
      res.status(400).json({ error: "必須パラメータが不足しています" });
      return;
    }

    const resend = new Resend(resendApiKey.value());
    try {
      const data = await sendMail(resend, {
        to: ADMIN_EMAIL,
        subject: `【新規予約】${name} 様 - ${date} ${time}〜`,
        html: `
          <div style="font-family:sans-serif;max-width:600px;margin:0 auto;color:#333;">
            <div style="background:#72586f;padding:24px 32px;">
              <h1 style="margin:0;color:#fff;font-size:20px;">新規予約が入りました</h1>
            </div>
            <div style="padding:24px 32px;">
              <table style="border-collapse:collapse;width:100%;">
                <tr>
                  <td style="padding:10px 12px;border:1px solid #ddd;background:#f9f9f9;width:30%;font-weight:bold;">予約番号</td>
                  <td style="padding:10px 12px;border:1px solid #ddd;font-family:monospace;">${id || '-'}</td>
                </tr>
                <tr>
                  <td style="padding:10px 12px;border:1px solid #ddd;background:#f9f9f9;font-weight:bold;">日時</td>
                  <td style="padding:10px 12px;border:1px solid #ddd;">${date} ${time}〜</td>
                </tr>
                <tr>
                  <td style="padding:10px 12px;border:1px solid #ddd;background:#f9f9f9;font-weight:bold;">患者名</td>
                  <td style="padding:10px 12px;border:1px solid #ddd;">${name}（${furigana || '-'}）</td>
                </tr>
                <tr>
                  <td style="padding:10px 12px;border:1px solid #ddd;background:#f9f9f9;font-weight:bold;">初・再診</td>
                  <td style="padding:10px 12px;border:1px solid #ddd;">${visitType || '-'}</td>
                </tr>
                <tr>
                  <td style="padding:10px 12px;border:1px solid #ddd;background:#f9f9f9;font-weight:bold;">保険区分</td>
                  <td style="padding:10px 12px;border:1px solid #ddd;">${insurance || '-'}</td>
                </tr>
                <tr>
                  <td style="padding:10px 12px;border:1px solid #ddd;background:#f9f9f9;font-weight:bold;">電話番号</td>
                  <td style="padding:10px 12px;border:1px solid #ddd;">${phone}</td>
                </tr>
                <tr>
                  <td style="padding:10px 12px;border:1px solid #ddd;background:#f9f9f9;font-weight:bold;">症状・お悩み</td>
                  <td style="padding:10px 12px;border:1px solid #ddd;">${symptoms || '-'}</td>
                </tr>
                <tr>
                  <td style="padding:10px 12px;border:1px solid #ddd;background:#f9f9f9;font-weight:bold;">連絡方法</td>
                  <td style="padding:10px 12px;border:1px solid #ddd;">${contactMethod || '-'}</td>
                </tr>
              </table>
            </div>
            <div style="background:#f5f5f5;padding:16px 32px;">
              <p style="margin:0;color:#888;font-size:12px;">福元鍼灸整骨院 予約システム</p>
            </div>
          </div>
        `,
      });
      res.status(200).json({ success: true, id: data.id });
    } catch (err) {
      console.error("管理者通知メール送信エラー:", err);
      res.status(500).json({ error: "メール送信に失敗しました" });
    }
  }
);

/**
 * 【3-3】前日リマインダー（毎日 15:00 JST に実行）
 * メールアドレスがある翌日の予約者に自動送信
 */
exports.sendDailyReminders = onSchedule(
  { schedule: "0 15 * * *", timeZone: "Asia/Tokyo", secrets: [resendApiKey] },
  async () => {
    // JST で翌日の日付文字列を生成
    const jstNow   = new Date(Date.now() + 9 * 3600000);
    const tomorrow = new Date(jstNow);
    tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
    const yyyy = tomorrow.getUTCFullYear();
    const mm   = String(tomorrow.getUTCMonth() + 1).padStart(2, "0");
    const dd   = String(tomorrow.getUTCDate()).padStart(2, "0");
    const tomorrowStr = `${yyyy}-${mm}-${dd}`;

    const db   = getFirestore();
    const snap = await db.collection("reservations")
      .where("date", "==", tomorrowStr)
      .where("status", "!=", "cancelled")
      .get();

    if (snap.empty) {
      console.log(`${tomorrowStr} の予約なし。リマインダー送信をスキップ。`);
      return;
    }

    const resend = new Resend(resendApiKey.value());
    const tasks  = snap.docs
      .map(d => d.data())
      .filter(r => r.email)
      .map(r =>
        sendMail(resend, {
          to:      r.email,
          subject: `【福元鍼灸整骨院】明日のご予約リマインダー`,
          html: `
            <div style="font-family:sans-serif;max-width:600px;margin:0 auto;color:#333;">
              <div style="background:#72586f;padding:24px 32px;">
                <h1 style="margin:0;color:#fff;font-size:20px;">明日のご予約リマインダー</h1>
              </div>
              <div style="padding:24px 32px;">
                <p>${r.name} 様</p>
                <p>明日のご予約をお知らせします。</p>
                <table style="border-collapse:collapse;width:100%;margin-bottom:24px;">
                  <tr>
                    <td style="padding:10px 12px;border:1px solid #ddd;background:#f9f9f9;width:30%;font-weight:bold;">日時</td>
                    <td style="padding:10px 12px;border:1px solid #ddd;">${r.date} ${r.time}〜</td>
                  </tr>
                  <tr>
                    <td style="padding:10px 12px;border:1px solid #ddd;background:#f9f9f9;font-weight:bold;">メニュー</td>
                    <td style="padding:10px 12px;border:1px solid #ddd;">${r.visitType || '診療'}</td>
                  </tr>
                </table>
                <div style="background:#fff8f0;border-left:4px solid #f5913e;padding:12px 16px;margin-bottom:24px;">
                  <p style="margin:0;font-size:14px;">キャンセル・変更はお電話にてご連絡ください。<br>
                    <strong>電話番号：0120-XXX-XXX</strong></p>
                </div>
                <p>ご来院をお待ちしております。</p>
              </div>
              <div style="background:#f5f5f5;padding:16px 32px;">
                <p style="margin:0;color:#888;font-size:12px;">
                  福元鍼灸整骨院<br>
                  月〜金 9:00〜19:30 / 土 9:00〜17:00 / 日・祝 休診<br>
                  https://kojinius.jp
                </p>
              </div>
            </div>
          `,
        }).catch(e => console.error(`リマインダー送信失敗 (${r.id}):`, e))
      );

    await Promise.all(tasks);
    console.log(`リマインダー送信完了: ${tasks.length} 件 (${tomorrowStr})`);
  }
);

/**
 * 初期管理者の admin クレームを設定する（初回セットアップ用）
 * !! セットアップ完了後は Firebase コンソールからこの Function を削除すること !!
 * 呼び出し例:
 *   firebase functions:call setInitialAdmin --data '{"email":"xxx@xxx.com","setupKey":"YOUR_KEY"}'
 */
exports.setInitialAdmin = onCall(async (request) => {
  const { email, setupKey } = request.data;

  // デプロイ前に必ず変更し、使用後は Function ごと削除すること
  if (setupKey !== "fukumoto-setup-2026") {
    throw new HttpsError("permission-denied", "無効なセットアップキーです");
  }

  try {
    const user = await getAuth().getUserByEmail(email);
    await getAuth().setCustomUserClaims(user.uid, { admin: true });
    return { success: true, message: `${email} に admin クレームを付与しました` };
  } catch (err) {
    throw new HttpsError("internal", err.message);
  }
});
