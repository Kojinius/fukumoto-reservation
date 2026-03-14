# OAS SPA — オンライン予約システム

Vite 8 + React 19 + TypeScript 5.8 + Tailwind CSS 3.4 で構築されたオンライン予約システム。
既存の Vanilla HTML/CSS/JS MPA を全面移行した SPA。

## 技術スタック

| カテゴリ | 技術 |
|---------|------|
| フレームワーク | React 19 + TypeScript 5.8 |
| ビルド | Vite 8 (Rolldown) |
| スタイル | Tailwind CSS 3.4 |
| 認証 | Firebase Auth (email/password) |
| データベース | Cloud Firestore |
| Functions | Cloud Functions (us-central1) |
| PDF | pdf-lib + fontkit |
| ルーティング | React Router 7.6 |

## デザインテーマ: Bold Navy × Gold (V3)

AMS品質のモダンデザイン。Navy + Gold アクセント。
- `navy-700`〜`navy-900`: ダークネイビー基調
- `gold`: #B8860B (ゴールドアクセント)
- `cream`: #EDE9E0 (温かみのある背景)
- AuthLayout: スプリットスクリーン（Navy左パネル + 金の同心円装飾）
- Input/Select: ボックス型 + `focus:ring-gold/30` 光彩リング
- Button: `shadow-sm → hover:shadow-md` 昇降 + `hover:-translate-y-px` リフト
- Card: `rounded-xl` + `shadow-sm`
- Dark Mode 対応 (OS検出 + 手動トグル)

## 機能

### 患者向け
- 4ステップ予約ウィザード（日時選択 → 情報入力 → 確認 → 完了）
- カレンダー + タイムスロット（営業時間・休日・予約済み連動）
- 郵便番号から住所自動入力（zipcloud API）
- 予約キャンセル（予約番号 + 電話番号認証）
- プライバシーポリシー表示

### 管理者向け
- ダッシュボード（KPI + 予約一覧 + フィルター + CSV出力）
- 予約ステータス管理（未確認 → 確認済み / キャンセル）
- 設定パネル（基本情報・営業時間・休日・お知らせ・アカウント）
- パスワード変更（強制変更モード + 任意変更）
- 管理者ユーザー管理（作成・削除・上限2名）
- 祝日自動取得（holidays-jp API）

### セキュリティ
- メール送信: Cloud Functions内部ヘルパー化（HTTP未公開）
- CORS: 本番ドメイン + localhost ホワイトリスト
- Rate Limiting: メモリリーク防止付き
- エラーメッセージ: 汎用フォールバック（内部情報非漏洩）
- CSP: 厳格なContent-Security-Policy
- Firestore Rules: 監査ログ・予約バリデーション分離
- 入力検証: 電話番号・メール・ふりがな・郵便番号

## 開発

```bash
npm install
npm run dev          # http://localhost:5174
npm run build        # dist/ に出力
npx tsc --noEmit     # 型チェック
```

## Firebase

同一プロジェクト: `project-3040e21e-879f-4c66-a7d`（AMSと共有）
- Functions リージョン: `us-central1`
- Hosting target: `oas` → `oas-spa/dist`

## ビルドサイズ

| チャンク | サイズ | gzip |
|---------|--------|------|
| firebase | 336 KB | 102 KB |
| vendor | 231 KB | 74 KB |
| app | 114 KB | 31 KB |
| CSS | 43 KB | 8 KB |
| **合計** | **724 KB** | **215 KB** |
