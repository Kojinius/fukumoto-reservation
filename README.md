# 福元鍼灸整骨院 — オンライン予約システム プロトタイプ

> 福元鍼灸整骨院（https://fukumoto.group/acupuncture/）向けに設計した予約システムのプロトタイプです。
> サーバー不要・静的HTML構成のため、そのままブラウザで動作します。

---

## 本番URL

| ページ | URL |
|---|---|
| ポートフォリオ（ルート） | `https://kojinius.jp/` |
| 予約ページ（患者側） | `https://oas.kojinius.jp/` |
| 管理画面（スタッフ側） | `https://oas.kojinius.jp/admin.html` |
| 履歴書作成ツール | `https://kojinius.jp/resume` |
| 職務経歴書作成ツール | `https://kojinius.jp/cv` |

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

### 患者側

| # | 機能 | 詳細 |
|---|------|------|
| 1 | 4ステップ予約フロー | 日時選択 → 情報入力 → 確認 → 完了 |
| 2 | カレンダー | 月表示・過去日/日曜/休診日を自動グレーアウト |
| 3 | 時間スロット | 30分間隔・午前/午後区分・既予約スロットは満枠表示 |
| 4 | 入力フォーム | 氏名/ふりがな/住所/初診・再診/保険証/電話/生年月日 |
| 5 | 要配慮個人情報同意 | 健康情報取り扱いの明示的同意（APPI 第20条第2項） |
| 6 | 予約キャンセル | 予約番号+電話番号認証・理由任意（法令準拠）|
| 7 | 問診票 | 予約完了後に記入可能・18項目・痛み部位チップ選択 |
| 8 | PWA対応 | ホーム画面インストール・オフラインキャッシュ（Workbox）|
| 9 | 7言語対応 | ja / en / ko / zh-CN / vi / pt-BR / tl |
| 10 | リマインダーメール | opt-in / opt-out対応（特定電子メール法準拠）|

### 管理側

| # | 機能 | 詳細 |
|---|------|------|
| 1 | KPIカード | 本日の予約・今月の予約数・新規患者数・未確認予約 |
| 2 | 予約一覧 | ソート・検索・ステータスフィルタ・CSV出力 |
| 3 | 詳細モーダル | 全情報表示・ステータス変更・問診票PDFダウンロード |
| 4 | 診察履歴 | 完了済み予約の永続管理・検索・CSV出力 |
| 5 | 訂正権対応 | APPI第34条準拠・訂正履歴サブコレクション保存 |
| 6 | 問診票PDF出力 | pdf-lib + fontkit + Noto Sans JP・7言語対応 |
| 7 | アクセスログ | 詳細モーダル閲覧・PDF出力の閲覧トレーサビリティ |
| 8 | 利用規約・PP管理 | 管理者同意モーダル・バージョン管理・AI生成機能 |
| 9 | 設定画面 | 営業時間・お知らせ・保存期間ポリシー・患者権利連絡先 |
| 10 | スタッフ管理 | 管理者追加・削除（最大2名） |

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
| 構成 | OAS: Vite + React 19 + TypeScript 5 + Tailwind CSS / Portfolio: 同構成の SPA / Firebase |
| ホスティング | Firebase Hosting マルチサイト（portfolio: kojinius.jp / oas: oas.kojinius.jp）|
| データ永続化 | Firebase Firestore |
| メール送信 | Firebase Functions + Resend（`noreply@kojinius.jp`）患者確認・管理者通知・前日リマインダー |
| シークレット管理 | Firebase Secret Manager |
| PDF生成 | [pdf-lib](https://pdf-lib.js.org/) + fontkit（問診票・日本語フォント埋め込み）|
| フォント | Noto Sans JP（jsDelivr CDN）|
| PWA | vite-plugin-pwa + Workbox（オフラインキャッシュ・インストール対応）|
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

| 項目 | 現状 | 残課題 |
|------|------|--------|
| データ保存 | ✅ Firebase Firestore 移行済み | — |
| メール通知 | ✅ Firebase Functions + Resend 実装済み | — |
| 認証 | ✅ Firebase Auth（adminクレーム）実装済み | — |
| SMS通知 | 未実装 | Twilio / Vonage |
| 複数院舗 | 未対応 | 院舗IDパラメータで切り替え |
| 祝日・休日設定 | 未実装 | 管理画面から任意の休日・祝日を設定（Phase 6） |
| スタッフ管理 | ✅ 実装済み | 管理画面から管理者アカウントの追加・削除（最大2名） |
| 個人情報同意 | ✅ 実装済み | プライバシーポリシー同意チェックボックス |

---

## ディレクトリ構成

```
fukumoto-reservation/
├── index.html                        # ポートフォリオページ（kojinius.jp/）
├── firebase.json                     # Firebase設定（マルチサイト: portfolio / oas）
├── .firebaserc                       # ターゲット設定
├── firestore.rules                   # Firestoreセキュリティルール
├── firestore.indexes.json
├── functions/
│   ├── index.js                      # Cloud Functions（メール・リマインダー等）
│   └── package.json
├── portfolio-spa/                       # ポートフォリオSPA（kojinius.jp）— Vite + React + TypeScript + Tailwind
│   └── src/
│       ├── pages/
│       │   ├── Home.tsx                 # トップページ
│       │   ├── ResumeCreator.tsx        # 履歴書作成ツール（/resume）
│       │   └── CVCreator.tsx            # 職務経歴書作成ツール（/cv）
│       ├── components/tools/            # A4Preview, FormField, PhotoUpload 等
│       ├── hooks/                       # useAutoSave, useZipcode 等
│       ├── utils/                       # pdf.ts（pdf-lib）, storage.ts 等
│       └── types/                       # resume.ts, cv.ts
├── oas-spa/                             # OAS SPA（oas.kojinius.jp）— 同構成
├── apps/                                # レガシーアプリ（ビルド時 dist/apps/ にコピー）
├── documents/
│   ├── capture_screenshots.py        # Playwright スクリーンショット撮影スクリプト
│   ├── make_user_manual.py           # ユーザーマニュアル pptx 生成スクリプト
│   ├── make_design_doc.py            # 詳細設計書 pptx 生成スクリプト
│   ├── screenshots/                  # 撮影済みスクリーンショット
│   ├── manuals/                      # ユーザーマニュアル (.pptx)
│   └── specs/                        # 詳細設計書 (.pptx)
└── README.md
```

---

## ライセンス

このプロジェクトはプロトタイプ用途で作成されました。商用利用・本番デプロイにあたっては別途ご相談ください。
