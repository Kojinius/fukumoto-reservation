const { setGlobalOptions }   = require("firebase-functions");
const { onRequest }          = require("firebase-functions/https");
const { onSchedule }         = require("firebase-functions/scheduler");
const { defineSecret }       = require("firebase-functions/params");
const { Resend }             = require("resend");
const { getAuth }            = require("firebase-admin/auth");
const { getFirestore }       = require("firebase-admin/firestore");
const { initializeApp }      = require("firebase-admin/app");

initializeApp();
setGlobalOptions({ maxInstances: 10 });

const resendApiKey = defineSecret("RESEND_API_KEY");
const ADMIN_EMAIL  = "admin@kojinius.jp";

// ── HTMLエスケープ（メール本文のインジェクション対策）──
function escHtml(s) {
  return String(s ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

// ── 共通：Firestoreから院名を取得 ──
async function getClinicSettings() {
  const db   = getFirestore();
  const snap = await db.collection("settings").doc("clinic").get();
  return snap.exists ? snap.data() : {};
}

// ── 共通：メール送信ヘルパー ──
async function sendMail(resend, { from, to, subject, html }) {
  const { data, error } = await resend.emails.send({ from, to: [to], subject, html });
  if (error) throw new Error(`Resend エラー: ${JSON.stringify(error)}`);
  return data;
}

// ── 共通：CORSヘッダー設定 ──
function setCorsHeaders(req, res) {
  const allowed = ["https://kojinius.jp"];
  const origin  = req.headers.origin;
  res.set("Access-Control-Allow-Origin",  allowed.includes(origin) ? origin : "https://kojinius.jp");
  res.set("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.set("Access-Control-Allow-Headers", "Content-Type");
}

/**
 * 【3-1】患者への予約確認メールを送信する
 * POST /sendReservationEmail
 * Body: { to, name, date, time, menu, id }
 */
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

    // メールアドレス形式チェック
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) {
      res.status(400).json({ error: "メールアドレスの形式が不正です" });
      return;
    }

    const resend  = new Resend(resendApiKey.value());
    const { clinicName: cn = '院名未設定', phone: ph = '', clinicAddress: addr = '', clinicUrl: siteUrl = '' } = await getClinicSettings();
    const mapUrl  = addr ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(addr)}` : '';
    try {
      const data = await sendMail(resend, {
        from:    `${escHtml(cn)} <noreply@kojinius.jp>`,
        to,
        subject: `【${escHtml(cn)}】ご予約確認`,
        html: `
          <div style="font-family:sans-serif;max-width:600px;margin:0 auto;color:#333;">
            <div style="background:#72586f;padding:24px 32px;">
              <h1 style="margin:0;color:#fff;font-size:20px;">ご予約ありがとうございます</h1>
            </div>
            <div style="padding:24px 32px;">
              <p>${escHtml(name)} 様</p>
              <p>以下の内容でご予約を承りました。</p>
              <table style="border-collapse:collapse;width:100%;margin-bottom:24px;">
                <tr>
                  <td style="padding:10px 12px;border:1px solid #ddd;background:#f9f9f9;width:30%;font-weight:bold;">予約番号</td>
                  <td style="padding:10px 12px;border:1px solid #ddd;font-family:monospace;">${escHtml(id || '-')}</td>
                </tr>
                <tr>
                  <td style="padding:10px 12px;border:1px solid #ddd;background:#f9f9f9;font-weight:bold;">日時</td>
                  <td style="padding:10px 12px;border:1px solid #ddd;">${escHtml(date)} ${escHtml(time)}〜</td>
                </tr>
                <tr>
                  <td style="padding:10px 12px;border:1px solid #ddd;background:#f9f9f9;font-weight:bold;">メニュー</td>
                  <td style="padding:10px 12px;border:1px solid #ddd;">${escHtml(menu)}</td>
                </tr>
              </table>
              <div style="background:#fff8f0;border-left:4px solid #f5913e;padding:12px 16px;margin-bottom:24px;">
                <p style="margin:0 0 8px;font-weight:bold;">キャンセルについて</p>
                <p style="margin:0;font-size:14px;">ご予約のキャンセル・変更は、お電話にてご連絡ください。<br>
                  <strong>電話番号：${escHtml(ph)}</strong>（受付時間：診療時間内）</p>
              </div>
              <p>ご不明な点がございましたら、お気軽にお問い合わせください。</p>
            </div>
            <div style="background:#f5f5f5;padding:16px 32px;">
              <p style="margin:0;color:#555;font-size:13px;font-weight:bold;">${escHtml(cn)}</p>
              ${addr     ? `<p style="margin:4px 0 0;color:#888;font-size:12px;">📍 ${escHtml(addr)}</p>` : ''}
              ${ph       ? `<p style="margin:4px 0 0;color:#888;font-size:12px;">📞 ${escHtml(ph)}</p>` : ''}
              ${siteUrl  ? `<p style="margin:4px 0 0;font-size:12px;"><a href="${escHtml(siteUrl)}" style="color:#72586f;">${escHtml(siteUrl)}</a></p>` : ''}
              ${mapUrl   ? `<p style="margin:12px 0 0;"><a href="${mapUrl}" style="display:inline-block;background:#72586f;color:#fff;padding:8px 16px;border-radius:6px;font-size:13px;text-decoration:none;">🗺 Googleマップで見る</a></p>` : ''}
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

    const resend  = new Resend(resendApiKey.value());
    const { clinicName: cn = '院名未設定' } = await getClinicSettings();
    try {
      const data = await sendMail(resend, {
        from:    `${escHtml(cn)} <noreply@kojinius.jp>`,
        to:      ADMIN_EMAIL,
        subject: `【新規予約】${escHtml(name)} 様 - ${escHtml(date)} ${escHtml(time)}〜`,
        html: `
          <div style="font-family:sans-serif;max-width:600px;margin:0 auto;color:#333;">
            <div style="background:#72586f;padding:24px 32px;">
              <h1 style="margin:0;color:#fff;font-size:20px;">新規予約が入りました</h1>
            </div>
            <div style="padding:24px 32px;">
              <table style="border-collapse:collapse;width:100%;">
                <tr>
                  <td style="padding:10px 12px;border:1px solid #ddd;background:#f9f9f9;width:30%;font-weight:bold;">予約番号</td>
                  <td style="padding:10px 12px;border:1px solid #ddd;font-family:monospace;">${escHtml(id || '-')}</td>
                </tr>
                <tr>
                  <td style="padding:10px 12px;border:1px solid #ddd;background:#f9f9f9;font-weight:bold;">日時</td>
                  <td style="padding:10px 12px;border:1px solid #ddd;">${escHtml(date)} ${escHtml(time)}〜</td>
                </tr>
                <tr>
                  <td style="padding:10px 12px;border:1px solid #ddd;background:#f9f9f9;font-weight:bold;">患者名</td>
                  <td style="padding:10px 12px;border:1px solid #ddd;">${escHtml(name)}（${escHtml(furigana || '-')}）</td>
                </tr>
                <tr>
                  <td style="padding:10px 12px;border:1px solid #ddd;background:#f9f9f9;font-weight:bold;">初・再診</td>
                  <td style="padding:10px 12px;border:1px solid #ddd;">${escHtml(visitType || '-')}</td>
                </tr>
                <tr>
                  <td style="padding:10px 12px;border:1px solid #ddd;background:#f9f9f9;font-weight:bold;">保険区分</td>
                  <td style="padding:10px 12px;border:1px solid #ddd;">${escHtml(insurance || '-')}</td>
                </tr>
                <tr>
                  <td style="padding:10px 12px;border:1px solid #ddd;background:#f9f9f9;font-weight:bold;">電話番号</td>
                  <td style="padding:10px 12px;border:1px solid #ddd;">${escHtml(phone)}</td>
                </tr>
                <tr>
                  <td style="padding:10px 12px;border:1px solid #ddd;background:#f9f9f9;font-weight:bold;">症状・お悩み</td>
                  <td style="padding:10px 12px;border:1px solid #ddd;">${escHtml(symptoms || '-')}</td>
                </tr>
                <tr>
                  <td style="padding:10px 12px;border:1px solid #ddd;background:#f9f9f9;font-weight:bold;">連絡方法</td>
                  <td style="padding:10px 12px;border:1px solid #ddd;">${escHtml(contactMethod || '-')}</td>
                </tr>
              </table>
            </div>
            <div style="background:#f5f5f5;padding:16px 32px;">
              <p style="margin:0;color:#888;font-size:12px;">${escHtml(cn)} 予約システム</p>
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
    const [reservationsSnap, { clinicName: cn = '院名未設定', phone: ph = '' }] = await Promise.all([
      db.collection("reservations")
        .where("date", "==", tomorrowStr)
        .where("status", "!=", "cancelled")
        .get(),
      getClinicSettings(),
    ]);

    if (reservationsSnap.empty) {
      console.log(`${tomorrowStr} の予約なし。リマインダー送信をスキップ。`);
      return;
    }

    const resend = new Resend(resendApiKey.value());
    const tasks  = reservationsSnap.docs
      .map(d => d.data())
      .filter(r => r.email)
      .map(r =>
        sendMail(resend, {
          from:    `${escHtml(cn)} <noreply@kojinius.jp>`,
          to:      r.email,
          subject: `【${escHtml(cn)}】明日のご予約リマインダー`,
          html: `
            <div style="font-family:sans-serif;max-width:600px;margin:0 auto;color:#333;">
              <div style="background:#72586f;padding:24px 32px;">
                <h1 style="margin:0;color:#fff;font-size:20px;">明日のご予約リマインダー</h1>
              </div>
              <div style="padding:24px 32px;">
                <p>${escHtml(r.name)} 様</p>
                <p>明日のご予約をお知らせします。</p>
                <table style="border-collapse:collapse;width:100%;margin-bottom:24px;">
                  <tr>
                    <td style="padding:10px 12px;border:1px solid #ddd;background:#f9f9f9;width:30%;font-weight:bold;">日時</td>
                    <td style="padding:10px 12px;border:1px solid #ddd;">${escHtml(r.date)} ${escHtml(r.time)}〜</td>
                  </tr>
                  <tr>
                    <td style="padding:10px 12px;border:1px solid #ddd;background:#f9f9f9;font-weight:bold;">メニュー</td>
                    <td style="padding:10px 12px;border:1px solid #ddd;">${escHtml(r.visitType || '診療')}</td>
                  </tr>
                </table>
                <div style="background:#fff8f0;border-left:4px solid #f5913e;padding:12px 16px;margin-bottom:24px;">
                  <p style="margin:0;font-size:14px;">キャンセル・変更はお電話にてご連絡ください。<br>
                    <strong>電話番号：${escHtml(ph)}</strong></p>
                </div>
                <p>ご来院をお待ちしております。</p>
              </div>
              <div style="background:#f5f5f5;padding:16px 32px;">
                <p style="margin:0;color:#888;font-size:12px;">
                  ${escHtml(cn)}<br>
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
