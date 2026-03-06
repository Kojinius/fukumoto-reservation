# 福元鍼灸整骨院 — オンライン予約システム プロトタイプ

> 福元鍼灸整骨院（https://fukumoto.group/acupuncture/）向けに設計した予約システムのプロトタイプです。
> サーバー不要・静的HTML構成のため、そのままブラウザで動作します。

---

## デモURL（GitHub Pages）

**🔗 [予約ページ（患者側）](https://kojinius.github.io/fukumoto-reservation/)**
**🔗 [管理画面（スタッフ側）](https://kojinius.github.io/fukumoto-reservation/admin.html)**

> ※ GitHub Pages を有効化した後、上記URLにアクセスできます（設定方法は下記参照）。

---

## スクリーンショット

| 患者側：日時選択 | 患者側：入力フォーム |
|---|---|
| カレンダー + 30分間隔スロット | 基本情報・診療情報フォーム |

| 患者側：完了画面 | 管理側：ダッシュボード |
|---|---|
| 予約票PDF出力 | KPI・予約一覧・フィルタリング |

---

## 機能一覧

### 患者側（`index.html`）

| # | 機能 | 詳細 |
|---|------|------|
| 1 | 4ステップ予約フロー | 日時選択 → 情報入力 → 確認 → 完了 |
| 2 | カレンダー | 月表示・過去日/日曜/休診日を自動グレーアウト |
| 3 | 時間スロット | 30分間隔・午前/午後区分・既予約スロットは満枠表示・当日の過去時間は選択不可（モバイル対応）|
| 4 | 入力フォーム | 氏名/ふりがな/住所/初診・再診/保険証/電話/生年月日 |
| 5 | 年齢自動計算 | 生年月日入力で現在の年齢をリアルタイム表示 |
| 6 | 症状・伝達事項 | フリーテキスト入力 |
| 7 | 連絡方法選択 | メール / 電話 |
| 8 | 予約票PDF出力 | pdf-lib を使用したPDFダウンロード |
| 9 | 管理者メール通知 | 予約確定時に `mailto:` で管理者へ通知 |
| 10 | レスポンシブ対応 | PC / タブレット / スマートフォン（レイアウトに依存しない方向表記）|

### 管理側（`admin.html`）

| # | 機能 | 詳細 |
|---|------|------|
| 1 | KPIカード | 本日の予約・今月の予約数・新規患者数・未確認予約 |
| 2 | 予約一覧テーブル | 日付降順・患者名・初診区分・症状・ステータス |
| 3 | 検索 | 患者名・ふりがなでリアルタイム絞り込み |
| 4 | フィルタリング | 日付・ステータス（全て/未確認/確認済み/キャンセル）|
| 5 | 詳細モーダル | 全情報表示・ステータス変更・電話発信ボタン |
| 6 | CSV出力 | 全予約データをUTF-8 BOMありCSVでダウンロード |
| 7 | 管理者メール設定 | localStorage に管理者メールアドレスを保存 |
| 8 | デモデータ | 初回アクセス時にサンプル予約5件を自動生成 |

---

## 営業時間設定

`app.js` の `BUSINESS_HOURS` オブジェクトで変更可能：

```js
const BUSINESS_HOURS = {
    1: { am: ['9:00','9:30',...], pm: ['14:00','14:30',...] }, // 月
    2: { ... },  // 火
    ...
    6: { am: [...], pm: ['14:00',...,'16:00'] }, // 土（17:00まで）
    // 0（日）は定義なし → 休診
};
```

---

## 技術スタック

| 項目 | 内容 |
|------|------|
| 構成 | 静的HTML/CSS/Vanilla JS + Firebase |
| ホスティング | Firebase Hosting（カスタムドメイン: kojinius.jp）|
| データ永続化 | `localStorage`（移行予定: Firestore）|
| メール送信 | Firebase Functions + Resend（`noreply@kojinius.jp`）|
| シークレット管理 | Firebase Secret Manager |
| PDF生成 | [pdf-lib](https://pdf-lib.js.org/) v1.17.1 |
| フォント | Noto Sans JP（Google Fonts）|
| デザイン | Pencil（UIプロトタイプ）→ CSS実装 |
| カラー | 茶 `#735763` / オレンジ `#F79321` / ベージュ `#FCF0DE` |

---

## 簡単に共有する方法

### 方法①：GitHub Pages（推奨・永続URL）

1. このリポジトリの **Settings → Pages**
2. Source: `Deploy from a branch` → Branch: `main` / `/ (root)` → **Save**
3. 数分後に `https://<ユーザー名>.github.io/fukumoto-reservation/` でアクセス可能

> **注意**: GitHub Pages は **Public リポジトリ**または **GitHub Pro** 以上で有効化できます。
> 企業へのデモ用途であれば、一時的にリポジトリを Public に変更することを推奨します。

### 方法②：Netlify Drop（最速・登録不要）

1. [Netlify Drop](https://app.netlify.com/drop) にアクセス
2. `fukumoto-reservation/` フォルダをドラッグ＆ドロップ
3. 即座にランダムURLが発行される（例: `https://magical-fox-123456.netlify.app`）

### 方法③：ローカルで動かす

```bash
# Pythonがある場合
cd fukumoto-reservation
python -m http.server 8080
# → http://localhost:8080 でアクセス
```

> `file://` プロトコルでの直接開放も動作します（PDF出力は一部ブラウザで制限あり）。

---

## 本番実装に向けた拡張ポイント

| 項目 | 現状（プロトタイプ） | 本番向け対応 |
|------|---------------------|-------------|
| データ保存 | localStorage | Firebase / Supabase / バックエンドDB |
| メール通知 | mailto: リンク | SendGrid / EmailJS / AWS SES |
| SMS通知 | 未実装 | Twilio / Vonage |
| 認証 | なし（管理画面オープン）| パスワード認証 / Firebase Auth |
| 複数院舗 | 未対応 | 院舗IDパラメータで切り替え |
| 祝日対応 | 未実装 | 祝日APIを利用した自動判定 |

---

## ディレクトリ構成

```
fukumoto-reservation/
├── index.html          # 患者側：予約フロー（4ステップ）
├── admin.html          # 管理側：予約管理ダッシュボード
├── 404.html            # 404エラーページ
├── css/
│   └── style.css       # 共通スタイル
├── js/
│   ├── utils.js        # 共通ユーティリティ（esc / DAY_NAMES / formatDate 等）
│   ├── app.js          # 患者側ロジック
│   └── admin.js        # 管理側ロジック
├── firebase.json       # Firebase設定
├── firestore.rules     # Firestoreセキュリティルール
├── functions/
│   ├── index.js        # Cloud Functions（メール送信）
│   └── package.json
└── README.md           # このファイル
```

---

## ライセンス

このプロジェクトはプロトタイプ用途で作成されました。商用利用・本番デプロイにあたっては別途ご相談ください。
