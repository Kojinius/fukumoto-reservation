export interface Project {
  name: string;
  description: string;
  emoji: string;
  url: string;
  stack: string[];
  external?: boolean;
}

export const projects: Project[] = [
  {
    name: '医療業界特化型オンライン予約システム',
    description:
      '患者が 24 時間予約できる Web アプリ。スタッフ向け管理ダッシュボード・メール通知・PDF出力などを実装。',
    emoji: '🏥',
    url: 'https://oas.kojinius.jp',
    stack: ['React', 'TypeScript', 'Tailwind CSS', 'Firebase', 'Cloud Functions', 'Resend'],
    external: true,
  },
  {
    name: '職務経歴書作成ツール',
    description:
      'ブラウザだけで動作する日本語職務経歴書メーカー。リアルタイム A4 プレビュー・証明写真ドラッグ＆ドロップ・PDF ダウンロードをサーバー不要で実現。郵便番号からの住所自動入力にも対応。',
    emoji: '📋',
    url: '/cv',
    stack: ['React', 'TypeScript', 'pdf-lib', 'Tailwind CSS'],
  },
  {
    name: '勤怠管理システム',
    description:
      '社員の勤怠打刻・照会・修正・シフト申請をオンラインで完結する業務 Web アプリ。管理者によるユーザー管理・全社員の勤怠検索・シフト承認・CSV／PDF 出力に対応。Firebase Auth のカスタムクレームでロールベースアクセス制御を実装。',
    emoji: '🕐',
    url: 'https://ams.kojinius.jp',
    stack: ['React', 'TypeScript', 'Tailwind CSS', 'Firebase Auth', 'Firestore', 'Cloud Functions'],
    external: true,
  },
  {
    name: '履歴書作成ツール',
    description:
      'ブラウザだけで動作する日本語履歴書メーカー。リアルタイム A4 プレビュー・証明写真ドラッグ＆ドロップ・PDF ダウンロードをサーバー不要で実現。',
    emoji: '📄',
    url: '/resume',
    stack: ['React', 'TypeScript', 'pdf-lib', 'Tailwind CSS'],
  },
];
