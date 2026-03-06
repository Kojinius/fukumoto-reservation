const { setGlobalOptions }       = require("firebase-functions");
const { onRequest, onCall, HttpsError } = require("firebase-functions/https");
const { defineSecret }           = require("firebase-functions/params");
const { Resend }                 = require("resend");
const { getAuth }                = require("firebase-admin/auth");
const { initializeApp }          = require("firebase-admin/app");

initializeApp();
setGlobalOptions({ maxInstances: 10 });

const resendApiKey = defineSecret("RESEND_API_KEY");

/**
 * 予約確認メールを送信する
 * POST /sendReservationEmail
 * Body: { to, name, date, time, menu }
 */
exports.sendReservationEmail = onRequest(
  { secrets: [resendApiKey], invoker: "public" },
  async (req, res) => {
    res.set("Access-Control-Allow-Origin",  "https://kojinius.jp");
    res.set("Access-Control-Allow-Methods", "POST, OPTIONS");
    res.set("Access-Control-Allow-Headers", "Content-Type");

    if (req.method === "OPTIONS") { res.status(204).send(""); return; }
    if (req.method !== "POST")    { res.status(405).json({ error: "Method Not Allowed" }); return; }

    const { to, name, date, time, menu } = req.body;
    if (!to || !name || !date || !time || !menu) {
      res.status(400).json({ error: "必須パラメータが不足しています" });
      return;
    }

    const resend = new Resend(resendApiKey.value());
    try {
      const { data, error } = await resend.emails.send({
        from:    "福元鍼灸整骨院 <noreply@kojinius.jp>",
        to:      [to],
        subject: "【福元鍼灸整骨院】ご予約確認",
        html: `
          <div style="font-family:sans-serif;max-width:600px;margin:0 auto;">
            <h2>ご予約ありがとうございます</h2>
            <p>${name} 様</p>
            <p>以下の内容でご予約を承りました。</p>
            <table style="border-collapse:collapse;width:100%;">
              <tr>
                <td style="padding:8px;border:1px solid #ddd;background:#f9f9f9;width:30%;">日時</td>
                <td style="padding:8px;border:1px solid #ddd;">${date} ${time}</td>
              </tr>
              <tr>
                <td style="padding:8px;border:1px solid #ddd;background:#f9f9f9;">メニュー</td>
                <td style="padding:8px;border:1px solid #ddd;">${menu}</td>
              </tr>
            </table>
            <p style="margin-top:24px;">ご不明な点がございましたら、お気軽にお問い合わせください。</p>
            <hr style="margin:24px 0;border:none;border-top:1px solid #eee;">
            <p style="color:#888;font-size:12px;">
              福元鍼灸整骨院<br>https://kojinius.jp
            </p>
          </div>
        `,
      });

      if (error) {
        console.error("Resend エラー:", error);
        res.status(500).json({ error: "メール送信に失敗しました" });
        return;
      }
      res.status(200).json({ success: true, id: data.id });
    } catch (err) {
      console.error("予期せぬエラー:", err);
      res.status(500).json({ error: "サーバーエラーが発生しました" });
    }
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
