# Remaining Tasks — fukumoto-reservation

## Portfolio SPA (kojinius.jp)

| Status | ID | Task | Priority |
|--------|-----|------|----------|
| ✅ | PORTFOLIO-T01 | ResumeCreator React 移行 | P1 |
| ✅ | PORTFOLIO-T02 | CVCreator React 移行 | P1 |
| ✅ | PORTFOLIO-T03 | A4プレビューフォントサイズ拡大 | P1 |
| ✅ | PORTFOLIO-T04 | PhotoUpload 高解像度対応 | P2 |
| ✅ | PORTFOLIO-T05 | レガシーURL 301リダイレクト | P1 |
| ⬜ | PORTFOLIO-T06 | PDF生成フォントサイズ同期（プレビューに合わせる） | P3 |
| ✅ | PORTFOLIO-T07 | モバイル最適化（A4スケーリング + パネル表示修正） | P2 |

## OAS SPA (oas.kojinius.jp)

| Status | ID | Task | Priority |
|--------|-----|------|----------|
| ✅ | OAS-DOC-T01 | 詳細設計書 v2 | P1 |
| ✅ | OAS-DOC-T02 | ユーザーマニュアル v2 | P1 |
| ✅ | OAS-DOC-T03 | スクリーンショットスクリプト SPA対応 | P2 |
| ✅ | OAS-PW-T01 | PasswordInput コンポーネント（表示/非表示トグル） | P2 |
| ✅ | LEGAL-C1 | 要配慮個人情報の明示的同意（APPI 第20条第2項） | P0 |
| ✅ | LEGAL-C2 | 管理者利用規約＆PP同意モーダル（APPI 第15条） | P1 |
| ✅ | LEGAL-H1 | データ保存期間ポリシー設定 | P2 |
| ✅ | LEGAL-H2 | リマインダーメール配信同意 | P2 |
| ✅ | LEGAL-H3 | 患者権利行使機能（開示・訂正・利用停止） | P2 |
| ✅ | LEGAL-M1 | 利用規約タブ（Settings画面）— C2で実装済 | P3 |
| ⬜ | LEGAL-M2 | PPデフォルトテンプレート | P3 |
| ✅ | OAS-UX-T02 | キャンセルフロー改修（管理者強制理由入力+患者通知、患者任意理由+管理者通知） | P1 |
| ✅ | OAS-UX-T03 | 予約一覧ソート（SortableHeader、AMS移植） | P2 |
| ✅ | OAS-UX-T04 | UI/UX改善（ペンディングバッジ、モーダルスクロール、最終ログイン表示、アナウンスバナー改行） | P2 |
| ✅ | OAS-UX-T05 | ポリシー再生成機能（確認ダイアログ付き） | P2 |
| ⬜ | OAS-UX-T01 | 管理ヘッダーにTOS確認アイコン（低優先） | P3 |
| ✅ | OAS-FUTURE-T01 | 多国語対応（i18n）— 7か国語、AMS同等 | P2 |
| ✅ | OAS-HIST-T01 | 患者別診察履歴管理（completeVisit CF + /admin/history画面 + Dashboard連携） | P1 |
| ⬜ | OAS-FUTURE-T02 | 顧客管理システム（新規プロジェクト候補） | P3 |

## Security (SEC) — Remaining

| Status | ID | Task | Severity | Effort |
|--------|-----|------|----------|--------|
| ✅ | SEC-22 | [共通] settingsコレクションのlist許可 | P2-Medium | S |
| ⬜ | SEC-20 | [AMS] admin.htmlグローバル関数公開+onclick | P3-Low | M |
| ⬜ | SEC-9 | [AMS] sessionStorageに勤務情報保存 | P2-Medium | M |
| ⬜ | SEC-21 | [共通] CDNスクリプトにSRIハッシュなし | P3-Low | S |
| ⬜ | SEC-16 | [AMS] console.logデバッグコード残存 | P3-Low | S |

## Code Review Findings (Noted for Future)

| Status | Source | Finding | Priority |
|--------|--------|---------|----------|
| ⬜ | CR-PR7 | リマインダーメール opt-out 機構（特定電子メール法対応） | P2 |
| ⬜ | CR-PR7 | メール削除時の reminderEmailConsent リセット | P2 |
| ⬜ | CR-PR7 | 新規Textareaフィールドの max-length 統一 | P3 |
| ⬜ | CR-PR7 | iframe sandbox 属性追加（PR #7で部分対応、Google Maps embed fix済み） | P3 |
| ⬜ | CR-PR7 | 時刻フォーマットのゼロパディング互換性確認 | P3 |
| ⬜ | CR-PR15 | visit_histories フルスキャン → ページネーション/クエリ上限対応（大規模データ対策） | P2 |
| ⬜ | CR-PR15 | completeVisit CF: スロットステータス確認追加（二重完了防止強化） | P2 |
| ⬜ | CR-PR15 | Dashboard KPI: `completed` ステータスを件数カウントに含める | P3 |
| ⬜ | CR-PR15 | toLocaleString ロケールハードコード → i18n対応の日付フォーマット | P3 |

**Completed: 31 / Remaining: 15**
