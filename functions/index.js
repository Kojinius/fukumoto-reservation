const { setGlobalOptions }   = require("firebase-functions");
const { onRequest }          = require("firebase-functions/https");
const { onSchedule }         = require("firebase-functions/scheduler");
const { defineSecret }       = require("firebase-functions/params");
const { Resend }             = require("resend");
const { getAuth }            = require("firebase-admin/auth");
const { getFirestore }       = require("firebase-admin/firestore");
const { initializeApp }      = require("firebase-admin/app");
const crypto                 = require("crypto");

initializeApp();
setGlobalOptions({ maxInstances: 10 });

// ── レート制限（インメモリ・IPベース）──
const _rateMap = new Map();
const RATE_LIMIT_WINDOW_MS = 60_000; // 1分
const RATE_LIMIT_MAX       = 5;      // 1分あたり最大5リクエスト

function isRateLimited(ip) {
  const now = Date.now();

  // [SEC-8] 期限切れエントリの定期クリーンアップ（60秒超過分を除去）
  for (const [key, val] of _rateMap) {
    if (now - val.start > RATE_LIMIT_WINDOW_MS) {
      _rateMap.delete(key);
    }
  }

  const entry = _rateMap.get(ip);
  if (!entry || now - entry.start > RATE_LIMIT_WINDOW_MS) {
    _rateMap.set(ip, { start: now, count: 1 });
    return false;
  }
  entry.count++;
  return entry.count > RATE_LIMIT_MAX;
}

const resendApiKey = defineSecret("RESEND_API_KEY");

/** リマインダー配信停止トークン生成（HMAC-SHA256） */
function generateOptOutToken(reservationId, email) {
  return crypto.createHmac("sha256", "oas-opt-out-salt")
    .update(`${reservationId}:${email}`)
    .digest("hex")
    .slice(0, 24);
}

/** OAS予約システムのベースURL（メール内リンク用） */
function getOasBaseUrl() {
  return process.env.FUNCTIONS_EMULATOR === "true"
    ? "http://localhost:5174"
    : "https://oas.kojinius.jp";
}

// ── [SEC-14] 監査ログ（Cloud Logging へ構造化ログ出力）──
function auditLog(event, data = {}) {
  // 個人情報を含まない構造化ログ。Cloud Functions は console.log を GCP Cloud Logging に転送する
  console.log(JSON.stringify({ severity: "INFO", event, ...data, timestamp: new Date().toISOString() }));
}

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
  const allowed = ["https://kojinius.jp", "https://oas.kojinius.jp"];
  const origin  = req.headers.origin || "";
  const isLocal = origin.startsWith("http://localhost:") || origin.startsWith("http://127.0.0.1:");
  res.set("Access-Control-Allow-Origin",  allowed.includes(origin) || isLocal ? origin : "https://kojinius.jp");
  res.set("Access-Control-Allow-Methods", "GET, POST, DELETE, OPTIONS");
  res.set("Access-Control-Allow-Headers", "Content-Type, Authorization");
}

/**
 * 【SEC-C2】予約済みスロット取得（CF proxy — reservationId 漏洩防止）
 * GET /getBookedSlots?date=2026-03-16
 * 患者向け予約画面が利用。認証不要。time 配列のみ返却し reservationId を隠蔽する。
 * レート制限: IP あたり 5回/分
 */
exports.getBookedSlots = onRequest(
  { invoker: "public" },
  async (req, res) => {
    setCorsHeaders(req, res);
    if (req.method === "OPTIONS") { res.status(204).send(""); return; }
    if (req.method !== "GET")     { res.status(405).json({ error: "Method Not Allowed" }); return; }

    const clientIp = (req.headers["x-forwarded-for"] || "").split(",")[0].trim() || req.ip;
    if (isRateLimited(clientIp)) {
      res.status(429).json({ error: "リクエストが多すぎます。しばらくお待ちください。" });
      return;
    }

    const date = req.query.date;
    if (!date || typeof date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      res.status(400).json({ error: "日付パラメータが不正です" });
      return;
    }

    try {
      const db   = getFirestore();
      const snap = await db.collection("slots").where("date", "==", date).get();
      const bookedTimes = snap.docs
        .map(d => d.data())
        .filter(s => s.status !== "cancelled")
        .map(s => s.time);

      res.status(200).json({ bookedTimes });
    } catch (err) {
      console.error("[getBookedSlots] エラー:", err);
      res.status(500).json({ error: "スロット情報の取得に失敗しました" });
    }
  }
);

/**
 * 【SEC-18】予約作成（スロット確保 + 予約登録のトランザクション）
 * POST /createReservation
 * Body: { date, time, name, furigana, birthdate, zip, address,
 *         phone, email, gender, visitType, insurance, symptoms,
 *         notes, contactMethod }
 * レート制限: IP あたり 5回/分
 */
exports.createReservation = onRequest(
  { invoker: "public", secrets: [resendApiKey] },
  async (req, res) => {
    setCorsHeaders(req, res);

    if (req.method === "OPTIONS") { res.status(204).send(""); return; }
    if (req.method !== "POST")    { res.status(405).json({ error: "Method Not Allowed" }); return; }

    // レート制限チェック
    const clientIp = (req.headers["x-forwarded-for"] || "").split(",")[0].trim() || req.ip;
    if (isRateLimited(clientIp)) {
      auditLog("rate_limit.exceeded", { endpoint: "createReservation", ip: clientIp });
      res.status(429).json({ error: "リクエストが多すぎます。しばらくお待ちください。" });
      return;
    }

    const d = req.body;

    // ── 必須フィールド検証 ──
    if (!d.date || !d.time || !d.name || !d.furigana || !d.phone) {
      res.status(400).json({ error: "必須パラメータが不足しています" });
      return;
    }

    // ── [C1] 要配慮個人情報の同意検証（個人情報保護法 第20条第2項） ──
    // 症状フィールドが含まれる場合、明示的な同意フラグが必須
    if (d.hasSensitiveDataConsent !== true) {
      res.status(400).json({ error: "健康情報の取り扱いへの同意が必要です" });
      return;
    }

    // ── 型・長さバリデーション（Firestore Rules の isValidReservation と同等）──
    const checks = [
      [typeof d.name     === "string" && d.name.length     <= 50,  "name"],
      [typeof d.furigana === "string" && d.furigana.length <= 50,  "furigana"],
      [typeof d.phone    === "string" && d.phone.length    <= 20,  "phone"],
      [typeof d.date     === "string" && /^\d{4}-\d{2}-\d{2}$/.test(d.date), "date"],
      [typeof d.time     === "string" && d.time.length     <= 10,  "time"],
    ];
    const failed = checks.find(([ok]) => !ok);
    if (failed) {
      res.status(400).json({ error: `パラメータが不正です: ${failed[1]}` });
      return;
    }

    // ── オプションフィールド長さ制限 ──
    const optLimits = {
      email: 200, zip: 8, address: 200, symptoms: 1000,
      notes: 500, visitType: 50, insurance: 50, gender: 20,
      birthdate: 10, contactMethod: 50,
    };
    for (const [key, max] of Object.entries(optLimits)) {
      if (d[key] != null && (typeof d[key] !== "string" || d[key].length > max)) {
        res.status(400).json({ error: `パラメータが不正です: ${key}` });
        return;
      }
    }

    // ── 日付の妥当性チェック（過去日付を拒否、当日は許可）──
    // 文字列比較でタイムゾーンずれを回避（ISO日付は辞書順 = 日付順）
    const jstNow  = new Date(Date.now() + 9 * 3600000);
    const todayStr = jstNow.toISOString().split("T")[0];
    if (d.date < todayStr) {
      res.status(400).json({ error: "過去の日付は予約できません" });
      return;
    }

    const db        = getFirestore();
    const bookingId = crypto.randomUUID();
    const slotId    = `${d.date}_${d.time.replace(":", "")}`;

    // ── 管理者代行入力フラグの検証 ──
    // inputBy: 'admin' が送られてきた場合、IDトークンを検証して admin クレームを確認
    let bookedBy = undefined;
    if (d.inputBy === "admin") {
      const authHeader = req.headers.authorization || "";
      const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;
      if (token) {
        try {
          const decoded = await getAuth().verifyIdToken(token);
          if (decoded.admin) bookedBy = "admin";
        } catch { /* 認証失敗時は代行フラグなしで続行 */ }
      }
    }

    try {
      await db.runTransaction(async (tx) => {
        const slotRef = db.collection("slots").doc(slotId);
        const slotSnap = await tx.get(slotRef);

        if (slotSnap.exists && slotSnap.data().status !== "cancelled") {
          throw new Error("SLOT_TAKEN");
        }

        tx.set(slotRef, {
          date: d.date,
          time: d.time,
          reservationId: bookingId,
          status: "pending",
        });

        tx.set(db.collection("reservations").doc(bookingId), {
          id:            bookingId,
          date:          d.date,
          time:          d.time,
          name:          d.name,
          furigana:      d.furigana,
          birthdate:     d.birthdate || "",
          zip:           d.zip || "",
          address:       d.address || "",
          phone:         d.phone,
          email:         d.email || "",
          gender:        d.gender || "",
          visitType:     d.visitType || "",
          insurance:     d.insurance || "",
          symptoms:      d.symptoms || "",
          notes:         d.notes || "",
          contactMethod: d.contactMethod || "",
          hasSensitiveDataConsent: true,  // [C1] 同意証跡（サーバー検証済み）
          reminderEmailConsent: d.reminderEmailConsent === true,  // [H2] リマインダーメール同意
          status:        "pending",
          createdAt:     new Date().toISOString(),
          ...(bookedBy ? { bookedBy } : {}),
        });
      });

      auditLog("reservation.created", { reservationId: bookingId, date: d.date, time: d.time });

      // ── メール送信（ベストエフォート：失敗しても予約は成立）──
      // 患者確認メール（メールアドレスがある場合のみ）
      if (d.email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(d.email)) {
        _sendReservationEmail({
          to: d.email, name: d.name, date: d.date, time: d.time,
          menu: d.visitType || '診療', id: bookingId,
        }).catch(e => console.error("患者確認メール送信エラー（予約は成立済み）:", e));
      }
      // 管理者通知メール
      _notifyAdminOnReservation({
        id: bookingId, name: d.name, furigana: d.furigana || '',
        date: d.date, time: d.time, visitType: d.visitType || '',
        insurance: d.insurance || '', phone: d.phone,
        symptoms: d.symptoms || '', contactMethod: d.contactMethod || '',
      }).catch(e => console.error("管理者通知メール送信エラー（予約は成立済み）:", e));

      res.status(200).json({ success: true, reservationId: bookingId });
    } catch (err) {
      if (err.message === "SLOT_TAKEN") {
        auditLog("reservation.slot_taken", { date: d.date, time: d.time, ip: clientIp });
        res.status(409).json({ error: "SLOT_TAKEN", message: "この時間はすでに予約が入っています" });
      } else {
        console.error("予約作成エラー:", err);
        res.status(500).json({ error: "予約の作成に失敗しました" });
      }
    }
  }
);

/**
 * 【SEC-3】予約照会（サーバーサイド電話番号検証後にデータ返却）
 * POST /verifyReservation
 * Body: { reservationId, phone }
 * レート制限: IP あたり 5回/分
 */
exports.verifyReservation = onRequest(
  { invoker: "public" },
  async (req, res) => {
    setCorsHeaders(req, res);

    if (req.method === "OPTIONS") { res.status(204).send(""); return; }
    if (req.method !== "POST")    { res.status(405).json({ error: "Method Not Allowed" }); return; }

    // レート制限チェック
    const clientIp = (req.headers["x-forwarded-for"] || "").split(",")[0].trim() || req.ip;
    if (isRateLimited(clientIp)) {
      res.status(429).json({ error: "リクエストが多すぎます。しばらくお待ちください。" });
      return;
    }

    const { reservationId, phone } = req.body;

    if (!reservationId || typeof reservationId !== "string" || reservationId.length > 100) {
      res.status(400).json({ error: "予約番号が不正です" });
      return;
    }
    if (!phone || typeof phone !== "string" || phone.length > 20) {
      res.status(400).json({ error: "電話番号が不正です" });
      return;
    }

    try {
      const db      = getFirestore();
      const resSnap = await db.collection("reservations").doc(reservationId).get();

      if (!resSnap.exists) {
        res.status(404).json({ error: "予約が見つかりません" });
        return;
      }

      const booking   = resSnap.data();
      const normalize = (p) => p.replace(/[-\s]/g, "");
      if (normalize(booking.phone) !== normalize(phone)) {
        // 電話番号不一致でも同じエラー（列挙攻撃防止）
        res.status(404).json({ error: "予約が見つかりません" });
        return;
      }

      // 返却するフィールドを明示的に絞る（個人情報最小化）
      res.status(200).json({
        success: true,
        reservation: {
          id:        booking.id,
          date:      booking.date,
          time:      booking.time,
          name:      booking.name,
          phone:     booking.phone,
          visitType: booking.visitType || "",
          symptoms:  booking.symptoms || "",
          status:    booking.status,
        },
      });
    } catch (err) {
      console.error("[verifyReservation] エラー:", err);
      res.status(500).json({ error: "予約の照会に失敗しました" });
    }
  }
);

/**
 * 【SEC-5】予約キャンセル（サーバーサイド電話番号検証 + スロット開放）
 * POST /cancelReservation
 * Body: { reservationId, phone, cancelReason? }
 * Headers: Authorization: Bearer <idToken> （管理者キャンセル時のみ）
 * レート制限: IP あたり 5回/分
 */
exports.cancelReservation = onRequest(
  { invoker: "public", secrets: [resendApiKey] },
  async (req, res) => {
    setCorsHeaders(req, res);

    if (req.method === "OPTIONS") { res.status(204).send(""); return; }
    if (req.method !== "POST")    { res.status(405).json({ error: "Method Not Allowed" }); return; }

    // レート制限チェック
    const clientIp = (req.headers["x-forwarded-for"] || "").split(",")[0].trim() || req.ip;
    if (isRateLimited(clientIp)) {
      res.status(429).json({ error: "リクエストが多すぎます。しばらくお待ちください。" });
      return;
    }

    const { reservationId, phone, cancelReason } = req.body;
    const reason = (typeof cancelReason === "string" ? cancelReason.slice(0, 200) : "") || "";

    // ── [SEC-CR1] cancelledBy はサーバー側で判定（クライアント信用しない）──
    let by = "patient";
    const authHeader = req.headers.authorization;
    if (authHeader?.startsWith("Bearer ")) {
      try {
        const decoded = await getAuth().verifyIdToken(authHeader.split("Bearer ")[1]);
        if (decoded.admin) by = "admin";
      } catch (_) { /* トークン不正 → 患者扱い */ }
    }

    // ── 必須フィールド検証 ──
    if (!reservationId || typeof reservationId !== "string" || reservationId.length > 100) {
      res.status(400).json({ error: "予約番号が不正です" });
      return;
    }
    if (!phone || typeof phone !== "string" || phone.length > 20) {
      res.status(400).json({ error: "電話番号が不正です" });
      return;
    }

    const db = getFirestore();

    try {
      // ── 予約ドキュメント取得 ──
      const resRef  = db.collection("reservations").doc(reservationId);
      const resSnap = await resRef.get();

      if (!resSnap.exists) {
        // 存在しない場合も「見つからない」で統一（情報漏洩防止）
        res.status(404).json({ error: "予約が見つかりません" });
        return;
      }

      const booking = resSnap.data();

      // ── 電話番号照合（サーバーサイド検証）──
      const normalize = (p) => p.replace(/[-\s]/g, "");
      if (normalize(booking.phone) !== normalize(phone)) {
        // 電話番号不一致でも同じエラーメッセージ（列挙攻撃防止）
        res.status(404).json({ error: "予約が見つかりません" });
        return;
      }

      // ── キャンセル済みチェック ──
      if (booking.status === "cancelled") {
        res.status(400).json({ error: "この予約はすでにキャンセル済みです" });
        return;
      }

      // ── キャンセル期限チェック（患者キャンセルのみ適用、管理者は制限なし）──
      const settings       = await getClinicSettings();
      if (by === "patient") {
        const cutoffMinutes  = settings.cancelCutoffMinutes ?? 60;
        const [bY, bM, bD]  = booking.date.split("-").map(Number);
        const [bH, bMin]    = booking.time.split(":").map(Number);
        const bookingMs      = new Date(bY, bM - 1, bD, bH, bMin).getTime();
        const cutoffMs       = cutoffMinutes * 60 * 1000;

        if (Date.now() >= bookingMs - cutoffMs) {
          res.status(400).json({
            error: `予約時刻の${cutoffMinutes}分前を過ぎているため、オンラインではキャンセルできません。お電話にてご連絡ください。`,
          });
          return;
        }
      }

      // ── [SEC-8] トランザクションで予約+スロットを同時キャンセル（TOCTOU防止のため内部で再確認）──
      const slotId = `${booking.date}_${booking.time.replace(":", "")}`;
      await db.runTransaction(async (tx) => {
        const slotRef   = db.collection("slots").doc(slotId);
        // トランザクション内で予約ステータスを再確認（並行キャンセル多重実行防止）
        const resSnap2  = await tx.get(resRef);
        const slotSnap  = await tx.get(slotRef);

        if (!resSnap2.exists || resSnap2.data().status === "cancelled") {
          const alreadyCancelled = new Error("ALREADY_CANCELLED");
          alreadyCancelled.isExpected = true;
          throw alreadyCancelled;
        }

        tx.update(resRef, {
          status: "cancelled",
          cancelledBy: by,
          cancelReason: reason,
          cancelledAt: new Date().toISOString(),
        });

        if (slotSnap.exists && slotSnap.data().status !== "cancelled") {
          tx.update(slotRef, { status: "cancelled" });
        }
      });

      auditLog("reservation.cancelled", { reservationId, cancelledBy: by, cancelReason: reason });

      // ── キャンセル通知メール ──
      try {
        if (by === "admin" && booking.email) {
          // 管理者キャンセル → 患者に通知（理由含む）
          await _sendCancellationEmail({
            to: booking.email,
            name: booking.name,
            date: booking.date,
            time: booking.time,
            reason,
            settings,
          });
        }
        if (by === "patient") {
          // 患者キャンセル → 管理者に通知
          await _notifyAdminOnCancellation({
            id: reservationId,
            name: booking.name,
            date: booking.date,
            time: booking.time,
            reason,
          });
        }
      } catch (mailErr) {
        console.error("[cancelReservation] キャンセル通知メール送信失敗:", mailErr);
        // メール失敗でもキャンセル自体は成功
      }

      res.status(200).json({ success: true, message: "予約をキャンセルしました" });
    } catch (err) {
      if (err.message === "ALREADY_CANCELLED") {
        res.status(400).json({ error: "この予約はすでにキャンセル済みです" });
        return;
      }
      console.error("[cancelReservation] エラー:", err);
      res.status(500).json({ error: "キャンセル処理に失敗しました" });
    }
  }
);

/**
 * 【3-1】患者への予約確認メール送信（内部ヘルパー）
 * createReservation 内部からのみ呼び出される。外部HTTPエンドポイントではない。
 * @param {{ to: string, name: string, date: string, time: string, menu: string, id: string }} params
 */
async function _sendReservationEmail({ to, name, date, time, menu, id }) {
  const resend  = new Resend(resendApiKey.value());
  const { clinicName: cn = '院名未設定', phone: ph = '', clinicAddress: addr = '', clinicUrl: siteUrl = '' } = await getClinicSettings();
  const mapUrl  = addr ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(addr)}` : '';

  await sendMail(resend, {
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
            <p style="margin:0 0 8px;font-size:14px;">ご予約のキャンセルは下記リンクから手続きできます。</p>
            <p style="margin:0 0 8px;"><a href="${getOasBaseUrl()}/cancel?id=${encodeURIComponent(id)}" style="display:inline-block;background:#72586f;color:#fff;padding:8px 16px;border-radius:6px;font-size:13px;text-decoration:none;">予約をキャンセルする</a></p>
            <p style="margin:0;font-size:12px;color:#888;">お電話でもキャンセルを承ります: <strong>${escHtml(ph)}</strong>（受付時間：診療時間内）</p>
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
}

/**
 * 【3-3】キャンセル通知メール（管理者キャンセル時に患者へ送信）
 * @param {{ to: string, name: string, date: string, time: string, reason: string, settings: object }} params
 */
async function _sendCancellationEmail({ to, name, date, time, reason, settings }) {
  const resend = new Resend(resendApiKey.value());
  const cn = settings.clinicName || '院名未設定';
  const ph = settings.phone || '';

  await sendMail(resend, {
    from:    `${escHtml(cn)} <noreply@kojinius.jp>`,
    to,
    subject: `【${escHtml(cn)}】ご予約キャンセルのお知らせ`,
    html: `
      <div style="font-family:sans-serif;max-width:600px;margin:0 auto;color:#333;">
        <div style="background:#72586f;padding:24px 32px;">
          <h1 style="margin:0;color:#fff;font-size:20px;">ご予約キャンセルのお知らせ</h1>
        </div>
        <div style="padding:24px 32px;">
          <p>${escHtml(name)} 様</p>
          <p>誠に申し訳ございませんが、以下のご予約がキャンセルとなりました。</p>
          <table style="border-collapse:collapse;width:100%;margin-bottom:24px;">
            <tr>
              <td style="padding:10px 12px;border:1px solid #ddd;background:#f9f9f9;width:30%;font-weight:bold;">日時</td>
              <td style="padding:10px 12px;border:1px solid #ddd;">${escHtml(date)} ${escHtml(time)}〜</td>
            </tr>
            ${reason ? `<tr>
              <td style="padding:10px 12px;border:1px solid #ddd;background:#f9f9f9;font-weight:bold;">理由</td>
              <td style="padding:10px 12px;border:1px solid #ddd;">${escHtml(reason)}</td>
            </tr>` : ''}
          </table>
          <p>ご不便をおかけし申し訳ございません。改めてのご予約をお待ちしております。</p>
          ${ph ? `<p style="font-size:14px;">ご不明な点がございましたら、お電話にてお問い合わせください。<br><strong>電話番号：${escHtml(ph)}</strong></p>` : ''}
        </div>
        <div style="background:#f5f5f5;padding:16px 32px;">
          <p style="margin:0;color:#888;font-size:12px;">${escHtml(cn)} 予約システム</p>
        </div>
      </div>
    `,
  });
}

/**
 * 【3-4】患者キャンセル時の管理者通知（内部ヘルパー）
 * [SEC-10] 件名に患者名を含めない
 */
async function _notifyAdminOnCancellation({ id, name, date, time, reason }) {
  const resend = new Resend(resendApiKey.value());
  const [{ clinicName: cn = '院名未設定' }, adminEmails] = await Promise.all([
    getClinicSettings(),
    getAdminEmails(),
  ]);
  if (adminEmails.length === 0) return;

  await Promise.all(adminEmails.map(to => sendMail(resend, {
    from:    `${escHtml(cn)} <noreply@kojinius.jp>`,
    to,
    subject: `【キャンセル】予約がキャンセルされました`,
    html: `
      <div style="font-family:sans-serif;max-width:600px;margin:0 auto;color:#333;">
        <div style="background:#c0392b;padding:24px 32px;">
          <h1 style="margin:0;color:#fff;font-size:20px;">予約キャンセル通知</h1>
        </div>
        <div style="padding:24px 32px;">
          <p>患者様から予約のキャンセルがありました。</p>
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
              <td style="padding:10px 12px;border:1px solid #ddd;background:#f9f9f9;font-weight:bold;">患者名</td>
              <td style="padding:10px 12px;border:1px solid #ddd;">${escHtml(name)}</td>
            </tr>
            ${reason ? `<tr>
              <td style="padding:10px 12px;border:1px solid #ddd;background:#f9f9f9;font-weight:bold;">理由</td>
              <td style="padding:10px 12px;border:1px solid #ddd;">${escHtml(reason)}</td>
            </tr>` : ''}
          </table>
          <p style="color:#888;font-size:13px;">該当の時間枠は再予約可能になりました。</p>
        </div>
        <div style="background:#f5f5f5;padding:16px 32px;">
          <p style="margin:0;color:#888;font-size:12px;">${escHtml(cn)} 予約システム</p>
        </div>
      </div>
    `,
  })));
}

/**
 * 【3-2】管理者への新規予約通知（内部ヘルパー）
 * createReservation 内部からのみ呼び出される。外部HTTPエンドポイントではない。
 * [SEC-10] 件名に患者名を含めない（個人情報保護）
 * @param {{ id: string, name: string, furigana: string, date: string, time: string, visitType: string, insurance: string, phone: string, symptoms: string, contactMethod: string }} params
 */
async function _notifyAdminOnReservation({ id, name, furigana, date, time, visitType, insurance, phone, symptoms, contactMethod }) {
  const resend  = new Resend(resendApiKey.value());
  const [{ clinicName: cn = '院名未設定' }, adminEmails] = await Promise.all([
    getClinicSettings(),
    getAdminEmails(),
  ]);
  if (adminEmails.length === 0) {
    console.log("管理者通知スキップ: 通知先管理者なし");
    return;
  }

  await Promise.all(adminEmails.map(to => sendMail(resend, {
    from:    `${escHtml(cn)} <noreply@kojinius.jp>`,
    to,
    // [SEC-10] 件名に患者名を含めない — メール件名は平文で中継サーバーに記録されるため
    subject: `【新規予約】新しい予約が入りました`,
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
  })));
}

// ── [SEC-19] 入力バリデーション（Input-Validation スキル準拠）──

/** パスワード複雑性チェック: 8文字以上 + 英大文字・小文字・数字・記号をすべて含む */
function validatePasswordComplexity(password) {
  if (typeof password !== "string" || password.length < 8) return "パスワードは8文字以上必要です";
  if (password.length > 128) return "パスワードは128文字以内で入力してください";
  if (!/[A-Z]/.test(password)) return "パスワードに英大文字を含めてください";
  if (!/[a-z]/.test(password)) return "パスワードに英小文字を含めてください";
  if (!/[0-9]/.test(password)) return "パスワードに数字を含めてください";
  if (!/[^A-Za-z0-9]/.test(password)) return "パスワードに記号（!@#$など）を含めてください";
  return null;
}

/** メールアドレス形式チェック: 連続ドット・末尾ドット・TLD不正を拒否 */
const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9]([a-zA-Z0-9.-]*[a-zA-Z0-9])?\.[a-zA-Z]{2,}$/;
function validateEmail(email) {
  if (typeof email !== "string" || email.length > 254) return "メールアドレスの形式が不正です";
  if (!EMAIL_REGEX.test(email) || /\.\./.test(email)) return "メールアドレスの形式が不正です";
  return null;
}

/** 電話番号形式チェック: 数字・ハイフン・プラス・括弧・スペースのみ許可（7〜20文字） */
const PHONE_REGEX = /^[0-9\-+() ]{7,20}$/;
function validatePhone(phone) {
  if (typeof phone !== "string") return "電話番号の形式が不正です";
  if (!PHONE_REGEX.test(phone)) return "電話番号の形式が不正です";
  return null;
}

/** 郵便番号形式チェック: 123-4567 または 1234567 形式 */
const ZIP_REGEX = /^\d{3}-?\d{4}$/;
function validateZip(zip) {
  if (typeof zip !== "string") return "郵便番号の形式が不正です";
  if (!ZIP_REGEX.test(zip)) return "郵便番号の形式が不正です";
  return null;
}

/** フリガナ形式チェック: ひらがな・カタカナ・長音符・スペースのみ許可 */
const FURIGANA_REGEX = /^[\u3040-\u309F\u30A0-\u30FF\u30FC\s]+$/;
function validateFurigana(furigana) {
  if (typeof furigana !== "string") return "フリガナの形式が不正です（カタカナまたはひらがな）";
  if (!FURIGANA_REGEX.test(furigana)) return "フリガナの形式が不正です（カタカナまたはひらがな）";
  return null;
}

// ── 共通：admin クレームを持つユーザーのメール一覧を取得 ──
async function getAdminEmails() {
  const result = await getAuth().listUsers(100);
  return result.users
    .filter(u => u.customClaims?.admin && u.email && !u.email.endsWith('@ams.local'))
    .map(u => u.email);
}

// ── 共通：IDトークン検証・admin クレーム確認 ──
async function verifyAdmin(req) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    const err = new Error("認証が必要です"); err.httpCode = 401; throw err;
  }
  const decoded = await getAuth().verifyIdToken(authHeader.split("Bearer ")[1]);
  if (!decoded.admin) {
    const err = new Error("管理者権限が必要です"); err.httpCode = 403; throw err;
  }
  return decoded;
}

/**
 * 【3-4】管理者によるユーザー作成
 * POST /createAdminUser
 * Body: { email, password, isAdmin }
 * Headers: Authorization: Bearer <idToken>
 */
exports.createAdminUser = onRequest(
  { invoker: "public" },
  async (req, res) => {
    setCorsHeaders(req, res);
    if (req.method === "OPTIONS") { res.status(204).send(""); return; }
    if (req.method !== "POST") { res.status(405).json({ error: "Method Not Allowed" }); return; }

    // [SEC-11] レート制限
    const clientIp = (req.headers["x-forwarded-for"] || "").split(",")[0].trim() || req.ip;
    if (isRateLimited(clientIp)) {
      res.status(429).json({ error: "リクエストが多すぎます。しばらくお待ちください。" }); return;
    }

    try {
      await verifyAdmin(req);

      const { email, password, isAdmin = false } = req.body;
      if (!email || !password) {
        res.status(400).json({ error: "メールアドレスとパスワードは必須です" }); return;
      }
      // [SEC-19] メールアドレス形式チェック
      const emailErr = validateEmail(email);
      if (emailErr) { res.status(400).json({ error: emailErr }); return; }
      // [SEC-19] パスワード複雑性チェック
      const pwErr = validatePasswordComplexity(password);
      if (pwErr) { res.status(400).json({ error: pwErr }); return; }

      // 管理者上限チェック（最大2人）
      const adminEmails = await getAdminEmails();
      if (adminEmails.length >= 2) {
        res.status(400).json({ error: "管理者は最大2名までです" }); return;
      }

      const userRecord = await getAuth().createUser({ email, password });
      if (isAdmin) {
        await getAuth().setCustomUserClaims(userRecord.uid, { admin: true });
      }
      // [SEC-4] 初期パスワード強制変更フラグ — 失敗時はAuthユーザーを削除してロールバック
      try {
        await getFirestore().collection('users').doc(userRecord.uid).set({ mustChangePassword: true });
      } catch (fsErr) {
        console.error('mustChangePassword フラグ設定失敗、ユーザーをロールバック:', fsErr);
        await getAuth().deleteUser(userRecord.uid).catch(() => {});
        res.status(500).json({ error: "ユーザー作成に失敗しました。再度お試しください。" });
        return;
      }
      auditLog("user.created", { uid: userRecord.uid, isAdmin, emailDomain: email.split("@")[1] ?? "" });
      res.status(200).json({ success: true, uid: userRecord.uid, email: userRecord.email });
    } catch (err) {
      if (err.httpCode) { res.status(err.httpCode).json({ error: err.message }); return; }
      const msgs = {
        "auth/email-already-exists": "そのメールアドレスはすでに使用されています",
        "auth/invalid-email":        "メールアドレスの形式が正しくありません",
        "auth/weak-password":        "パスワードが脆弱です",
      };
      // [SEC-6] エラー情報漏洩防止: err.message をクライアントに返さない
      res.status(400).json({ error: msgs[err.code] || "ユーザー作成に失敗しました" });
    }
  }
);

/**
 * 【3-5】管理者によるユーザー一覧取得
 * GET /listUsers
 * Headers: Authorization: Bearer <idToken>
 */
exports.listUsers = onRequest(
  { invoker: "public" },
  async (req, res) => {
    setCorsHeaders(req, res);
    if (req.method === "OPTIONS") { res.status(204).send(""); return; }
    if (req.method !== "GET") { res.status(405).json({ error: "Method Not Allowed" }); return; }

    // [SEC-11] レート制限
    const clientIp = (req.headers["x-forwarded-for"] || "").split(",")[0].trim() || req.ip;
    if (isRateLimited(clientIp)) {
      res.status(429).json({ error: "リクエストが多すぎます。しばらくお待ちください。" }); return;
    }

    try {
      await verifyAdmin(req);
      const result = await getAuth().listUsers(100);
      const users  = result.users.map(u => ({
        uid:        u.uid,
        email:      u.email,
        isAdmin:    !!(u.customClaims?.admin),
        createdAt:  u.metadata.creationTime,
        lastSignIn: u.metadata.lastSignInTime,
        disabled:   u.disabled,
      }));
      res.status(200).json({ users });
    } catch (err) {
      if (err.httpCode) { res.status(err.httpCode).json({ error: err.message }); return; }
      console.error("listUsers error:", err);
      res.status(500).json({ error: "ユーザー一覧の取得に失敗しました" });
    }
  }
);

/**
 * 【3-6】管理者によるユーザー削除
 * DELETE /deleteUser
 * Body: { uid }
 * Headers: Authorization: Bearer <idToken>
 */
exports.deleteUser = onRequest(
  { invoker: "public" },
  async (req, res) => {
    setCorsHeaders(req, res);
    if (req.method === "OPTIONS") { res.status(204).send(""); return; }
    if (req.method !== "DELETE") { res.status(405).json({ error: "Method Not Allowed" }); return; }

    // [SEC-11] レート制限
    const clientIp = (req.headers["x-forwarded-for"] || "").split(",")[0].trim() || req.ip;
    if (isRateLimited(clientIp)) {
      res.status(429).json({ error: "リクエストが多すぎます。しばらくお待ちください。" }); return;
    }

    try {
      const decoded = await verifyAdmin(req);
      const { uid } = req.body;
      if (!uid) { res.status(400).json({ error: "uid は必須です" }); return; }
      if (uid === decoded.uid) { res.status(400).json({ error: "自分自身は削除できません" }); return; }

      await getAuth().deleteUser(uid);
      auditLog("user.deleted", { uid, deletedBy: decoded.uid });
      res.status(200).json({ success: true });
    } catch (err) {
      if (err.httpCode) { res.status(err.httpCode).json({ error: err.message }); return; }
      console.error("deleteUser error:", err);
      res.status(400).json({ error: "ユーザー削除に失敗しました" });
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
    const cfBase = process.env.FUNCTIONS_EMULATOR === "true"
      ? "http://localhost:5001/kojinius/us-central1"
      : "https://us-central1-kojinius.cloudfunctions.net";
    const tasks  = reservationsSnap.docs
      .map(d => ({ ...d.data(), id: d.id }))
      .filter(r => r.email && r.reminderEmailConsent === true)
      .map(r => {
        const optOutToken = generateOptOutToken(r.id, r.email);
        const optOutUrl   = `${cfBase}/optOutReminder?id=${encodeURIComponent(r.id)}&token=${optOutToken}`;
        return sendMail(resend, {
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
                <p style="margin:8px 0 0;color:#aaa;font-size:11px;">
                  今後リマインダーメールの配信を希望されない場合は
                  <a href="${optOutUrl}" style="color:#aaa;">こちら</a>
                  から配信停止できます。
                </p>
              </div>
            </div>
          `,
        }).catch(e => console.error(`リマインダー送信失敗 (${r.id}):`, e));
      });

    await Promise.all(tasks);
    console.log(`リマインダー送信完了: ${tasks.length} 件 (${tomorrowStr})`);
  }
);

// ── リマインダー配信停止（特定電子メール法対応 opt-out）──
exports.optOutReminder = onRequest(
  { invoker: "public" },
  async (req, res) => {
    setCorsHeaders(req, res);
    if (req.method === "OPTIONS") { res.status(204).send(""); return; }
    if (req.method !== "GET") { res.status(405).send("Method Not Allowed"); return; }

    const { id, token } = req.query;
    if (!id || !token || typeof id !== "string" || typeof token !== "string") {
      res.status(400).send("パラメータが不正です"); return;
    }

    const db = getFirestore();
    const resRef = db.collection("reservations").doc(id);
    const resSnap = await resRef.get();

    if (!resSnap.exists) {
      res.status(404).send("予約が見つかりません"); return;
    }

    const data = resSnap.data();
    const expectedToken = generateOptOutToken(id, data.email || "");
    if (token !== expectedToken) {
      res.status(403).send("トークンが無効です"); return;
    }

    await resRef.update({ reminderEmailConsent: false });

    auditLog("reminder_opt_out", { reservationId: id });

    res.status(200).send(`
      <!DOCTYPE html>
      <html lang="ja">
      <head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
      <title>配信停止完了</title>
      <style>body{font-family:sans-serif;display:flex;justify-content:center;align-items:center;min-height:100vh;margin:0;background:#faf8f5;color:#1e293b;}
      .card{text-align:center;padding:2rem;border-radius:12px;background:#fff;box-shadow:0 2px 8px rgba(0,0,0,.08);max-width:400px;}
      h1{font-size:1.25rem;margin:0 0 .5rem;}p{color:#64748b;font-size:.875rem;margin:0;}</style></head>
      <body><div class="card"><h1>配信停止が完了しました</h1><p>今後、リマインダーメールは送信されません。</p></div></body>
      </html>
    `);
  }
);

// ── 診察完了（visit_histories にスナップショット保存 + ステータス更新）──
exports.completeVisit = onRequest(
  { invoker: "public" },
  async (req, res) => {
    setCorsHeaders(req, res);
    if (req.method === "OPTIONS") { res.status(204).send(""); return; }
    if (req.method !== "POST")    { res.status(405).json({ error: "Method Not Allowed" }); return; }

    // [SEC-11] レート制限
    const clientIp = (req.headers["x-forwarded-for"] || "").split(",")[0].trim() || req.ip;
    if (isRateLimited(clientIp)) {
      res.status(429).json({ error: "リクエストが多すぎます。しばらくお待ちください。" }); return;
    }

    // ── 管理者認証チェック ──
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith("Bearer ")) {
      res.status(401).json({ error: "認証が必要です" }); return;
    }
    let decoded;
    try {
      decoded = await getAuth().verifyIdToken(authHeader.split("Bearer ")[1]);
      if (!decoded.admin) { res.status(403).json({ error: "管理者権限が必要です" }); return; }
    } catch (_) {
      res.status(401).json({ error: "認証トークンが無効です" }); return;
    }

    const { reservationId } = req.body;
    if (!reservationId || typeof reservationId !== "string" || reservationId.length > 100) {
      res.status(400).json({ error: "予約IDが不正です" }); return;
    }

    const db = getFirestore();

    try {
      const result = await db.runTransaction(async (tx) => {
        // 予約ドキュメント取得
        const resRef  = db.collection("reservations").doc(reservationId);
        const resSnap = await tx.get(resRef);
        if (!resSnap.exists) return { status: 404, error: "予約が見つかりません" };

        // ステータス確認（confirmed のみ完了可能）
        const currentStatus = resSnap.data().status;
        if (currentStatus === "completed") return { status: 409, error: "ALREADY_COMPLETED" };
        if (currentStatus !== "confirmed") {
          return { status: 400, error: `ステータスが「${currentStatus}」のため診察完了にできません。確定済み予約のみ完了可能です。` };
        }

        // 二重完了防止（visit_histories 側も確認）
        const dupQuery = db.collection("visit_histories").where("reservationId", "==", reservationId).limit(1);
        const dupSnap  = await tx.get(dupQuery);
        if (!dupSnap.empty) return { status: 409, error: "ALREADY_COMPLETED" };

        const booking = resSnap.data();
        const now     = new Date().toISOString();
        const histRef = db.collection("visit_histories").doc();

        // スナップショット作成
        const snapshot = {
          id:                      histRef.id,
          reservationId,
          // 患者情報
          date:                    booking.date    || "",
          time:                    booking.time    || "",
          name:                    booking.name    || "",
          furigana:                booking.furigana || "",
          birthdate:               booking.birthdate || "",
          zip:                     booking.zip     || "",
          address:                 booking.address || "",
          phone:                   booking.phone   || "",
          email:                   booking.email   || "",
          gender:                  booking.gender  || "",
          visitType:               booking.visitType || "",
          insurance:               booking.insurance || "",
          symptoms:                booking.symptoms || "",
          notes:                   booking.notes   || "",
          contactMethod:           booking.contactMethod || "",
          hasSensitiveDataConsent: booking.hasSensitiveDataConsent || false,
          reminderEmailConsent:    booking.reminderEmailConsent || false,
          // 予約メタデータ
          reservationCreatedAt:    booking.createdAt || "",
          reservationStatus:       booking.status || "",
          // キャンセル情報（あれば）
          ...(booking.cancelledBy  ? { cancelledBy: booking.cancelledBy }   : {}),
          ...(booking.cancelReason ? { cancelReason: booking.cancelReason } : {}),
          ...(booking.cancelledAt  ? { cancelledAt: booking.cancelledAt }   : {}),
          // 代行入力フラグ（あれば）
          ...(booking.bookedBy     ? { bookedBy: booking.bookedBy }         : {}),
          // 診察完了メタデータ
          completedAt:             now,
          completedBy:             decoded.uid,
          completedByEmail:        decoded.email || "",
          createdAt:               now,
        };

        tx.create(histRef, snapshot);
        tx.update(resRef, { status: "completed" });

        return { status: 200, visitHistoryId: histRef.id };
      });

      if (result.status !== 200) {
        res.status(result.status).json({ error: result.error });
        return;
      }

      auditLog("visit_completed", {
        reservationId,
        visitHistoryId: result.visitHistoryId,
        adminUid: decoded.uid,
        adminEmail: decoded.email,
      });

      res.status(200).json({ ok: true, visitHistoryId: result.visitHistoryId });
    } catch (err) {
      console.error("completeVisit エラー:", err);
      res.status(500).json({ error: "内部エラーが発生しました" });
    }
  }
);

// ── [AUDIT-01] 診察履歴の訂正（APPI第34条 訂正権対応）──
exports.correctVisitHistory = onRequest(
  { invoker: "public", secrets: [resendApiKey] },
  async (req, res) => {
    setCorsHeaders(req, res);
    if (req.method === "OPTIONS") { res.status(204).send(""); return; }
    if (req.method !== "POST")    { res.status(405).json({ error: "Method Not Allowed" }); return; }

    // [SEC-11] レート制限
    const clientIp = (req.headers["x-forwarded-for"] || "").split(",")[0].trim() || req.ip;
    if (isRateLimited(clientIp)) {
      auditLog("rate_limit.exceeded", { endpoint: "correctVisitHistory", ip: clientIp });
      res.status(429).json({ error: "リクエストが多すぎます。しばらくお待ちください。" }); return;
    }

    // ── 管理者認証チェック ──
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith("Bearer ")) {
      res.status(401).json({ error: "認証が必要です" }); return;
    }
    let decoded;
    try {
      decoded = await getAuth().verifyIdToken(authHeader.split("Bearer ")[1]);
      if (!decoded.admin) { res.status(403).json({ error: "管理者権限が必要です" }); return; }
    } catch (_) {
      res.status(401).json({ error: "認証トークンが無効です" }); return;
    }

    // ── 入力バリデーション ──
    const { historyId, reason, fields, addendum } = req.body;

    if (!historyId || typeof historyId !== "string" || historyId.length > 100) {
      res.status(400).json({ error: "履歴IDが不正です" }); return;
    }
    if (!reason || typeof reason !== "string" || reason.trim().length === 0 || reason.length > 500) {
      res.status(400).json({ error: "訂正理由は1〜500文字で入力してください" }); return;
    }
    if (!fields && !addendum) {
      res.status(400).json({ error: "訂正フィールドまたは補記のいずれかが必要です" }); return;
    }
    if (addendum !== undefined && addendum !== null) {
      if (typeof addendum !== "string" || addendum.trim().length === 0 || addendum.length > 500) {
        res.status(400).json({ error: "補記は1〜500文字で入力してください" }); return;
      }
    }

    // フィールドのホワイトリスト検証
    const ALLOWED_FIELDS = ['name','furigana','birthdate','zip','address','phone','email','gender','insurance','date','time'];
    let validatedFields = null;
    if (fields) {
      if (typeof fields !== "object" || Array.isArray(fields)) {
        res.status(400).json({ error: "訂正フィールドの形式が不正です" }); return;
      }
      const keys = Object.keys(fields);
      if (keys.length === 0) {
        res.status(400).json({ error: "訂正フィールドが空です" }); return;
      }
      for (const key of keys) {
        if (!ALLOWED_FIELDS.includes(key)) {
          res.status(400).json({ error: `許可されていないフィールド: ${key}` }); return;
        }
        // gender は「未設定」を表す空文字列が有効値のため、空値チェックから除外する
        const isSelectField = key === "gender";
        if (typeof fields[key] !== "string" || (!isSelectField && fields[key].trim().length === 0) || fields[key].length > 200) {
          res.status(400).json({ error: `フィールド "${key}" は${isSelectField ? "0〜" : "1〜"}200文字の文字列で入力してください` }); return;
        }
        if (key === "email" && validateEmail(fields[key]) !== null) {
          res.status(400).json({ error: "メールアドレスの形式が不正です" }); return;
        }
        if (key === "phone" && validatePhone(fields[key]) !== null) {
          res.status(400).json({ error: "電話番号の形式が不正です" }); return;
        }
        if (key === "zip" && validateZip(fields[key]) !== null) {
          res.status(400).json({ error: "郵便番号の形式が不正です" }); return;
        }
        if (key === "furigana" && validateFurigana(fields[key]) !== null) {
          res.status(400).json({ error: "フリガナの形式が不正です（カタカナまたはひらがな）" }); return;
        }
      }
      validatedFields = {};
      for (const key of keys) {
        validatedFields[key] = fields[key];
      }
    }

    const db = getFirestore();

    try {
      // ── トランザクション：履歴存在確認 + 訂正レコード作成 ──
      const result = await db.runTransaction(async (tx) => {
        const histRef  = db.collection("visit_histories").doc(historyId);
        const histSnap = await tx.get(histRef);
        if (!histSnap.exists) return { status: 404, error: "診察履歴が見つかりません" };

        const histData    = histSnap.data();
        const corrRef     = histRef.collection("corrections").doc();

        // 訂正前の値を保存（イベントソーシング: beforeValues で監査証跡を完全に維持）
        const beforeValues = {};
        if (validatedFields) {
          for (const key of Object.keys(validatedFields)) {
            beforeValues[key] = histData[key] ?? "";
          }
        }

        const correctionDoc = {
          correctedBy:      decoded.uid,
          correctedByEmail: decoded.email || "",
          correctedAt:      new Date().toISOString(),
          reason:           reason.trim(),
          fields:           validatedFields,
          beforeValues:     Object.keys(beforeValues).length > 0 ? beforeValues : null,
          addendum:         addendum || null,
          notifiedAt:       null,
        };

        tx.create(corrRef, correctionDoc);

        // 訂正値を親ドキュメントに反映（マテリアライズドビュー — onSnapshot で一覧に即反映）
        // beforeValues はサブコレクションに保存済みなので監査証跡は維持される
        const updateData = { lastCorrectedAt: new Date().toISOString() };
        if (validatedFields && Object.keys(validatedFields).length > 0) {
          Object.assign(updateData, validatedFields);
          // メール訂正時は reminderEmailConsent を自動リセット（特定電子メール法対応）
          if ("email" in validatedFields && validatedFields.email !== histData.email) {
            updateData.reminderEmailConsent = false;
          }
        }
        tx.update(histRef, updateData);

        // メール訂正の場合は新しいアドレスを通知先として使用
        const effectiveEmail = (validatedFields && validatedFields.email) || histData.email || null;

        return {
          status:       200,
          correctionId: corrRef.id,
          patientEmail: effectiveEmail,
        };
      });

      if (result.status !== 200) {
        res.status(result.status).json({ error: result.error });
        return;
      }

      // ── メール通知（患者のemail が存在する場合のみ）──
      let notified = false;
      if (result.patientEmail) {
        try {
          const resend   = new Resend(resendApiKey.value());
          const settings = await getClinicSettings();
          const cn       = settings.clinicName || "院名未設定";

          await sendMail(resend, {
            from:    `${cn} <noreply@kojinius.jp>`,
            to:      result.patientEmail,
            subject: `【${cn}】個人情報の訂正に関するお知らせ`,
            html: `
              <div style="font-family:sans-serif;max-width:600px;margin:0 auto;color:#333;">
                <div style="background:#72586f;padding:24px 32px;">
                  <h1 style="margin:0;color:#fff;font-size:20px;">個人情報の訂正に関するお知らせ</h1>
                </div>
                <div style="padding:24px 32px;">
                  <p>お客様の診察履歴情報に訂正が行われました。</p>
                  <p>詳細につきましては、お電話またはご来院の際にお問い合わせください。</p>
                </div>
                <div style="background:#f5f5f5;padding:16px 32px;">
                  <p style="margin:0;color:#888;font-size:12px;">${escHtml(cn)} 予約システム</p>
                </div>
              </div>
            `,
          });

          // 送信成功 → notifiedAt を更新
          // ※ メール送信はトランザクション外（Firestore tx はDB操作のみ対応）
          // ※ 送信〜更新間のクラッシュは監査ログ（notified フラグ）で検出可能
          try {
            const corrRef = db.collection("visit_histories").doc(historyId)
                              .collection("corrections").doc(result.correctionId);
            await corrRef.update({ notifiedAt: new Date().toISOString() });
          } catch (updateErr) {
            console.error("correctVisitHistory: notifiedAt 更新失敗（メールは送信済み）:", updateErr);
          }
          notified = true;
        } catch (mailErr) {
          // メール送信失敗は訂正処理自体を失敗にしない
          console.error("correctVisitHistory エラー: メール送信失敗:", mailErr);
        }
      }

      // ── 監査ログ ──
      auditLog("visit_history_corrected", {
        historyId,
        correctionId: result.correctionId,
        adminUid:     decoded.uid,
        adminEmail:   decoded.email,
      });

      res.status(200).json({ ok: true, correctionId: result.correctionId, notified });
    } catch (err) {
      console.error("correctVisitHistory エラー:", err);
      res.status(500).json({ error: "内部エラーが発生しました" });
    }
  }
);
