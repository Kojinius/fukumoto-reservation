# -*- coding: utf-8 -*-
"""
Online Appointment System 詳細設計書 PPTX 生成スクリプト
実行: PYTHONUTF8=1 python documents/make_design_doc.py
     （fukumoto-reservation ディレクトリから）
"""

from pptx import Presentation
from pptx.util import Inches, Pt, Emu
from pptx.dml.color import RGBColor
from pptx.enum.text import PP_ALIGN
from pathlib import Path
from PIL import Image as PILImage

# ─────────────────────────────────────────────
# カラー定義（OAS ブランドカラー）
# ─────────────────────────────────────────────
C_PRIMARY = RGBColor(0x73, 0x57, 0x63)  # ブラウン
C_ACCENT  = RGBColor(0xF7, 0x93, 0x21)  # オレンジ
C_BASE    = RGBColor(0xFC, 0xF0, 0xDE)  # ベージュ
C_WHITE   = RGBColor(0xFF, 0xFF, 0xFF)
C_DARK    = RGBColor(0x3D, 0x2B, 0x1F)
C_MUTED   = RGBColor(0x8B, 0x73, 0x55)

# ─────────────────────────────────────────────
# パス設定
# ─────────────────────────────────────────────
BASE_DIR    = Path(__file__).parent.parent          # fukumoto-reservation/
SS_DIR      = BASE_DIR / "documents" / "screenshots"
OUTPUT_PATH = BASE_DIR / "documents" / "specs" / "OnlineAppointSystem_詳細設計書.pptx"

W = Inches(13.33)
H = Inches(7.5)

# ─────────────────────────────────────────────
# 共通ヘルパー関数
# ─────────────────────────────────────────────

def add_shape(slide, x, y, w, h, fill_color=None):
    """矩形シェイプを追加する"""
    shape = slide.shapes.add_shape(1, x, y, w, h)
    shape.line.fill.background()
    if fill_color:
        shape.fill.solid()
        shape.fill.fore_color.rgb = fill_color
    else:
        shape.fill.background()
    return shape


def add_text(slide, text, x, y, w, h, font_size=18, bold=False, color=None,
             align=PP_ALIGN.LEFT, line_spacing=None, font_name="Noto Sans JP"):
    """テキストボックスを追加する"""
    txBox = slide.shapes.add_textbox(x, y, w, h)
    tf = txBox.text_frame
    tf.word_wrap = True
    for i, line in enumerate(text.split("\n")):
        p = tf.paragraphs[0] if i == 0 else tf.add_paragraph()
        p.alignment = align
        run = p.add_run()
        run.text = line
        run.font.size = Pt(font_size)
        run.font.bold = bold
        run.font.name = font_name
        if color:
            run.font.color.rgb = color
        if line_spacing:
            p.line_spacing = line_spacing
    return txBox


def header_bar(slide, title_text, badge_text=None, badge_color=None):
    """ページ上部のヘッダーバーを描画する"""
    if badge_color is None:
        badge_color = C_ACCENT
    add_shape(slide, Inches(0), Inches(0), W, Inches(0.9), fill_color=C_PRIMARY)
    add_text(slide, title_text, Inches(0.4), Inches(0.08), Inches(10), Inches(0.75),
             font_size=28, bold=True, color=C_WHITE)
    if badge_text:
        s = add_shape(slide, Inches(11.5), Inches(0.2), Inches(1.5), Inches(0.5),
                      fill_color=badge_color)
        tf = s.text_frame
        p = tf.paragraphs[0]
        p.alignment = PP_ALIGN.CENTER
        run = p.add_run()
        run.text = badge_text
        run.font.size = Pt(12)
        run.font.bold = True
        run.font.name = "Noto Sans JP"
        run.font.color.rgb = C_WHITE


def card(slide, x, y, w, h, bg=None):
    """カードシェイプを追加する"""
    if bg is None:
        bg = C_BASE
    return add_shape(slide, x, y, w, h, fill_color=bg)


def add_image_fit(slide, img_path, x, y, max_w, max_h):
    """アスペクト比を維持してセル内に画像を中央配置する"""
    try:
        with PILImage.open(img_path) as im:
            iw, ih = im.size
        scale = min(max_w / iw, max_h / ih)
        disp_w = int(iw * scale)
        disp_h = int(ih * scale)
        off_x = (max_w - disp_w) // 2
        off_y = (max_h - disp_h) // 2
        slide.shapes.add_picture(str(img_path), x + off_x, y + off_y, disp_w, disp_h)
    except Exception:
        slide.shapes.add_picture(str(img_path), x, y, max_w, max_h)


def divider_slide(prs, blank_layout, section_title, items):
    """章区切りスライドを生成する"""
    slide = prs.slides.add_slide(blank_layout)
    add_shape(slide, Inches(0), Inches(0), W, H, fill_color=C_PRIMARY)
    add_shape(slide, Inches(0), H - Inches(1.2), W, Inches(1.2), fill_color=C_ACCENT)
    add_shape(slide, Inches(0.5), Inches(2.0), Inches(12.33), Inches(0.06),
              fill_color=C_ACCENT)
    add_text(slide, section_title, Inches(0.5), Inches(1.0), Inches(12), Inches(1.0),
             font_size=40, bold=True, color=C_WHITE)
    y = Inches(2.3)
    for item in items:
        add_text(slide, "  " + item, Inches(0.7), y, Inches(12), Inches(0.5),
                 font_size=16, color=C_BASE)
        y += Inches(0.5)


def three_col_cards(slide, cards_data, top=Inches(1.1)):
    """
    3カラムカードを描画する。
    cards_data: [(タイトル, [行テキスト, ...]), ...]  （3要素）
    """
    col_w = Inches(3.9)
    gap   = Inches(0.3)
    card_h = Inches(5.8)
    starts = [Inches(0.4), Inches(0.4) + col_w + gap,
              Inches(0.4) + (col_w + gap) * 2]

    for idx, (title, lines) in enumerate(cards_data):
        cx = starts[idx]
        # カード背景
        card(slide, cx, top, col_w, card_h)
        # タイトルバー
        add_shape(slide, cx, top, col_w, Inches(0.55), fill_color=C_PRIMARY)
        add_text(slide, title, cx + Inches(0.1), top + Inches(0.05),
                 col_w - Inches(0.2), Inches(0.5),
                 font_size=15, bold=True, color=C_WHITE)
        # 本文行
        body_text = "\n".join(lines)
        add_text(slide, body_text,
                 cx + Inches(0.15), top + Inches(0.65),
                 col_w - Inches(0.3), card_h - Inches(0.75),
                 font_size=13, color=C_DARK, line_spacing=Pt(20))


def two_col_cards(slide, left_title, left_lines, right_title, right_lines,
                  top=Inches(1.1)):
    """2カラムカードを描画する"""
    col_w = Inches(5.9)
    gap   = Inches(0.4)
    card_h = Inches(5.8)
    left_x  = Inches(0.5)
    right_x = left_x + col_w + gap

    for cx, title, lines in [(left_x, left_title, left_lines),
                              (right_x, right_title, right_lines)]:
        card(slide, cx, top, col_w, card_h)
        add_shape(slide, cx, top, col_w, Inches(0.55), fill_color=C_PRIMARY)
        add_text(slide, title, cx + Inches(0.1), top + Inches(0.05),
                 col_w - Inches(0.2), Inches(0.5),
                 font_size=15, bold=True, color=C_WHITE)
        body_text = "\n".join(lines)
        add_text(slide, body_text,
                 cx + Inches(0.15), top + Inches(0.65),
                 col_w - Inches(0.3), card_h - Inches(0.75),
                 font_size=13, color=C_DARK, line_spacing=Pt(20))


def image_with_notes(slide, img_path, notes_lines, top=Inches(1.1)):
    """
    左に画像・右に箇条書きノートを配置する画面説明スライド。
    """
    img_x, img_y = Inches(0.4), top
    img_max_w, img_max_h = Inches(8.0), Inches(5.8)
    note_x = Inches(8.7)
    note_w = Inches(4.3)

    # 画像
    if img_path and img_path.exists():
        add_image_fit(slide, img_path, img_x, img_y, img_max_w, img_max_h)
    else:
        placeholder = card(slide, img_x, img_y, img_max_w, img_max_h, bg=C_MUTED)

    # ノートカード
    card(slide, note_x, top, note_w, Inches(5.8))
    body_text = "\n".join(notes_lines)
    add_text(slide, body_text,
             note_x + Inches(0.15), top + Inches(0.2),
             note_w - Inches(0.3), Inches(5.4),
             font_size=13, color=C_DARK, line_spacing=Pt(22))


# ─────────────────────────────────────────────
# スライド生成関数群
# ─────────────────────────────────────────────

def slide_01_cover(prs, blank_layout):
    """スライド1: カバー"""
    slide = prs.slides.add_slide(blank_layout)

    # 背景
    add_shape(slide, Inches(0), Inches(0), W, H, fill_color=C_PRIMARY)
    # アクセントバー（下部）
    add_shape(slide, Inches(0), H - Inches(1.5), W, Inches(1.5), fill_color=C_ACCENT)
    # 装飾ライン
    add_shape(slide, Inches(0.5), Inches(2.8), Inches(12.33), Inches(0.08),
              fill_color=C_ACCENT)

    # メインタイトル
    add_text(slide, "Online Appointment System",
             Inches(0.5), Inches(1.2), Inches(12), Inches(1.1),
             font_size=44, bold=True, color=C_WHITE, align=PP_ALIGN.CENTER)
    # サブタイトル
    add_text(slide, "詳細設計書",
             Inches(0.5), Inches(3.0), Inches(12), Inches(0.9),
             font_size=36, bold=True, color=C_BASE, align=PP_ALIGN.CENTER)
    # 日付
    add_text(slide, "2026年3月",
             Inches(0.5), Inches(3.9), Inches(12), Inches(0.6),
             font_size=20, color=C_BASE, align=PP_ALIGN.CENTER)


def slide_02_toc(prs, blank_layout):
    """スライド2: 目次"""
    slide = prs.slides.add_slide(blank_layout)
    add_shape(slide, Inches(0), Inches(0), W, H, fill_color=C_BASE)
    header_bar(slide, "目次")

    toc_items = [
        ("1", "システム概要",        "p.4"),
        ("2", "技術スタック",        "p.5"),
        ("3", "アーキテクチャ設計",  "p.7"),
        ("4", "Firestore データモデル", "p.8"),
        ("5", "Cloud Functions 設計", "p.9"),
        ("6", "セキュリティ設計",    "p.11"),
        ("7", "Firestore セキュリティルール", "p.12"),
        ("8", "XSS・入力バリデーション", "p.13"),
        ("9", "患者向け予約フロー",  "p.15"),
        ("10", "管理者ダッシュボード", "p.16"),
        ("11", "設定画面",           "p.17"),
        ("12", "デプロイ構成",       "p.19"),
    ]

    left_items  = toc_items[:6]
    right_items = toc_items[6:]

    for col_idx, items in enumerate([left_items, right_items]):
        cx = Inches(0.5) + Inches(6.3) * col_idx
        y  = Inches(1.1)
        for num, title, page in items:
            # 番号バッジ
            badge = add_shape(slide, cx, y + Inches(0.05),
                              Inches(0.5), Inches(0.4), fill_color=C_PRIMARY)
            tf = badge.text_frame
            p  = tf.paragraphs[0]
            p.alignment = PP_ALIGN.CENTER
            run = p.add_run()
            run.text = num
            run.font.size = Pt(12)
            run.font.bold = True
            run.font.name = "Noto Sans JP"
            run.font.color.rgb = C_WHITE

            add_text(slide, title,
                     cx + Inches(0.6), y, Inches(4.5), Inches(0.5),
                     font_size=14, color=C_DARK)
            add_text(slide, page,
                     cx + Inches(5.3), y, Inches(0.8), Inches(0.5),
                     font_size=13, color=C_MUTED, align=PP_ALIGN.RIGHT)

            # 区切り線
            add_shape(slide, cx, y + Inches(0.5), Inches(6.0), Inches(0.02),
                      fill_color=C_MUTED)
            y += Inches(0.55)


def slide_04_overview(prs, blank_layout):
    """スライド4: システム概要（3カラムカード）"""
    slide = prs.slides.add_slide(blank_layout)
    add_shape(slide, Inches(0), Inches(0), W, H, fill_color=C_BASE)
    header_bar(slide, "システム概要", badge_text="概要")

    three_col_cards(slide, [
        ("システム目的", [
            "・鍼灸整骨院向けオンライン予約",
            "・24時間受付対応",
            "・管理者はリアルタイムで予約管理",
        ]),
        ("主要機能", [
            "・患者向け予約フロー（3ステップ）",
            "・予約管理ダッシュボード",
            "・設定管理",
            "　（営業時間・休日・お知らせ）",
            "・ユーザー管理",
        ]),
        ("非機能要件", [
            "・セキュリティ",
            "　（XSS・Firestore Rules）",
            "・モバイル対応（レスポンシブ）",
            "・日本語フォント対応",
            "・SSL/TLS（Let's Encrypt）",
        ]),
    ])


def slide_05_tech_stack(prs, blank_layout):
    """スライド5: 技術スタック（3カラムカード）"""
    slide = prs.slides.add_slide(blank_layout)
    add_shape(slide, Inches(0), Inches(0), W, H, fill_color=C_BASE)
    header_bar(slide, "技術スタック", badge_text="技術")

    three_col_cards(slide, [
        ("フロントエンド", [
            "・HTML5 / CSS3 / JavaScript",
            "・Firebase v10 ESM CDN",
            "・pdf-lib / fontkit",
            "　（PDF生成）",
            "・Playwright（自動テスト）",
        ]),
        ("バックエンド", [
            "・Firebase Authentication",
            "・Cloud Firestore",
            "　（asia-northeast1）",
            "・Cloud Functions",
            "　（Node.js 22）",
            "・firebase-admin v12",
        ]),
        ("インフラ", [
            "・Firebase Hosting",
            "・カスタムドメイン:",
            "　oas.kojinius.jp",
            "・さくらインターネット DNS",
            "・Let's Encrypt SSL",
        ]),
    ])


def slide_07_directory(prs, blank_layout):
    """スライド7: ディレクトリ構成"""
    slide = prs.slides.add_slide(blank_layout)
    add_shape(slide, Inches(0), Inches(0), W, H, fill_color=C_BASE)
    header_bar(slide, "ディレクトリ構成", badge_text="構成")

    card(slide, Inches(0.5), Inches(1.1), Inches(12.33), Inches(5.8))

    tree_text = (
        "apps/OnlineAppointSystem/\n"
        "├── index.html          # 患者向けトップ\n"
        "├── cancel.html         # 予約キャンセル\n"
        "├── auth-action.html    # メール認証アクション\n"
        "├── privacy.html        # プライバシーポリシー\n"
        "├── admin.html          # 管理者ダッシュボード\n"
        "├── login.html          # 管理者ログイン\n"
        "├── css/style.css       # 共通スタイル\n"
        "├── js/\n"
        "│   ├── app.js          # 患者向けロジック\n"
        "│   ├── admin.js        # 管理者ロジック\n"
        "│   └── auth.js         # 認証モジュール\n"
        "└── fonts/              # 日本語フォント\n"
        "\n"
        "functions/\n"
        "├── index.js            # Cloud Functions\n"
        "└── package.json"
    )
    add_text(slide, tree_text,
             Inches(0.8), Inches(1.3), Inches(11.8), Inches(5.5),
             font_size=14, color=C_DARK, font_name="Courier New",
             line_spacing=Pt(22))


def slide_08_datamodel(prs, blank_layout):
    """スライド8: Firestore データモデル（2カラム）"""
    slide = prs.slides.add_slide(blank_layout)
    add_shape(slide, Inches(0), Inches(0), W, H, fill_color=C_BASE)
    header_bar(slide, "Firestore データモデル", badge_text="DB")

    two_col_cards(slide,
        "コレクション一覧",
        [
            "reservations",
            "・id, date, time",
            "・name, phone, email",
            "・address, note",
            "・status, createdAt",
            "",
            "settings/clinic",
            "・clinicName, address, phone",
            "・businessHours, holidays",
            "・announcement",
            "",
            "users",
            "・email, role, createdAt",
        ],
        "status の値",
        [
            "・pending",
            "　→ 未対応",
            "",
            "・done",
            "　→ 対応済み",
            "",
            "・cancelled",
            "　→ キャンセル",
        ],
    )


def slide_09_functions(prs, blank_layout):
    """スライド9: Cloud Functions 設計"""
    slide = prs.slides.add_slide(blank_layout)
    add_shape(slide, Inches(0), Inches(0), W, H, fill_color=C_BASE)
    header_bar(slide, "Cloud Functions 設計", badge_text="Functions")

    funcs = [
        ("sendReservationEmail", [
            "・Firestore reservations トリガー",
            "・予約完了時に患者へメール送信",
            "・院内情報の連絡先を差出人に設定",
        ]),
        ("sendCancellationEmail", [
            "・キャンセル時に通知メールを送信",
        ]),
        ("createAdminUser", [
            "・管理者アカウント作成（onCall）",
            "・admin カスタムクレームを付与",
        ]),
        ("deleteUser", [
            "・ユーザー削除（onCall）",
        ]),
    ]

    y = Inches(1.1)
    for func_name, lines in funcs:
        # 関数名バー
        add_shape(slide, Inches(0.5), y, Inches(12.33), Inches(0.5),
                  fill_color=C_PRIMARY)
        add_text(slide, func_name,
                 Inches(0.7), y + Inches(0.05),
                 Inches(11.8), Inches(0.45),
                 font_size=15, bold=True, color=C_WHITE)
        y += Inches(0.5)
        # 説明行
        card(slide, Inches(0.5), y, Inches(12.33), Inches(len(lines) * 0.42 + 0.1))
        body = "\n".join(lines)
        add_text(slide, body,
                 Inches(0.8), y + Inches(0.05),
                 Inches(12.0), Inches(len(lines) * 0.42),
                 font_size=13, color=C_DARK, line_spacing=Pt(20))
        y += Inches(len(lines) * 0.42 + 0.2)


def slide_11_auth(prs, blank_layout):
    """スライド11: 認証・認可設計"""
    slide = prs.slides.add_slide(blank_layout)
    add_shape(slide, Inches(0), Inches(0), W, H, fill_color=C_BASE)
    header_bar(slide, "認証・認可設計", badge_text="Auth")

    content = (
        "## 認証方式\n"
        "・Firebase Authentication（Email/Password）\n"
        "・管理者: admin カスタムクレーム\n"
        "・セッション: browserSessionPersistence\n"
        "\n"
        "## 認可ルール\n"
        "・患者向けページ: 認証不要\n"
        "・管理者ページ: admin クレーム必須\n"
        "・Firestore Rules: 読み書きを認証ユーザーに限定\n"
        "\n"
        "## パスワードリセット\n"
        "・sendPasswordResetEmail で再設定リンク送信\n"
        "・actionURL は import.meta.url で動的解決"
    )
    card(slide, Inches(0.5), Inches(1.1), Inches(12.33), Inches(5.8))
    add_text(slide, content,
             Inches(0.8), Inches(1.3), Inches(12.0), Inches(5.5),
             font_size=14, color=C_DARK, line_spacing=Pt(24))


def slide_12_firestore_rules(prs, blank_layout):
    """スライド12: Firestore セキュリティルール"""
    slide = prs.slides.add_slide(blank_layout)
    add_shape(slide, Inches(0), Inches(0), W, H, fill_color=C_BASE)
    header_bar(slide, "Firestore セキュリティルール", badge_text="Security")

    # コードブロック風カード（濃い背景）
    card(slide, Inches(0.5), Inches(1.1), Inches(12.33), Inches(5.8),
         bg=C_DARK)

    rules_text = (
        "rules_version = '2';\n"
        "service cloud.firestore {\n"
        "  match /databases/{database}/documents {\n"
        "\n"
        "    // reservations: 認証ユーザーのみ読み書き\n"
        "    match /reservations/{id} {\n"
        "      allow read, write: if request.auth != null;\n"
        "    }\n"
        "\n"
        "    // settings: 認証ユーザーのみ読み書き\n"
        "    match /settings/{id} {\n"
        "      allow read, write: if request.auth != null;\n"
        "    }\n"
        "\n"
        "    // users: 認証ユーザーのみ読み書き\n"
        "    match /users/{id} {\n"
        "      allow read, write: if request.auth != null;\n"
        "    }\n"
        "\n"
        "    // 未認証: すべて拒否\n"
        "    match /{document=**} {\n"
        "      allow read, write: if false;\n"
        "    }\n"
        "  }\n"
        "}"
    )
    add_text(slide, rules_text,
             Inches(0.8), Inches(1.3), Inches(12.0), Inches(5.4),
             font_size=13, color=C_BASE, font_name="Courier New",
             line_spacing=Pt(20))


def slide_13_xss(prs, blank_layout):
    """スライド13: XSS・入力バリデーション"""
    slide = prs.slides.add_slide(blank_layout)
    add_shape(slide, Inches(0), Inches(0), W, H, fill_color=C_BASE)
    header_bar(slide, "XSS・入力バリデーション", badge_text="Security")

    content = (
        "## XSS 対策\n"
        "・innerHTML に直接文字列を代入しない\n"
        "・textContent を使用\n"
        "・サーバーサイドバリデーションも実施\n"
        "\n"
        "## 入力バリデーション\n"
        "・電話番号: 数字・ハイフンのみ許可\n"
        "・メールアドレス: RFC 準拠フォーマット\n"
        "・フォームの必須チェック\n"
        "\n"
        "## セキュリティヘッダー\n"
        "・X-Content-Type-Options\n"
        "・X-Frame-Options\n"
        "・Strict-Transport-Security"
    )
    card(slide, Inches(0.5), Inches(1.1), Inches(12.33), Inches(5.8))
    add_text(slide, content,
             Inches(0.8), Inches(1.3), Inches(12.0), Inches(5.5),
             font_size=14, color=C_DARK, line_spacing=Pt(24))


def slide_15_patient_flow(prs, blank_layout):
    """スライド15: 患者向け予約フロー"""
    slide = prs.slides.add_slide(blank_layout)
    add_shape(slide, Inches(0), Inches(0), W, H, fill_color=C_BASE)
    header_bar(slide, "患者向け予約フロー", badge_text="画面")

    notes = [
        "## Step 1: 日時選択",
        "・カレンダーで希望日を選択",
        "・利用可能な時間枠をクリック",
        "",
        "## Step 2: 情報入力",
        "・氏名・電話番号・住所を入力",
        "・郵便番号から住所を自動補完",
        "",
        "## Step 3: 確認・完了",
        "・予約内容を確認して送信",
        "・完了画面で予約IDを表示",
    ]
    image_with_notes(slide, SS_DIR / "01_calendar_top.png", notes)


def slide_16_dashboard(prs, blank_layout):
    """スライド16: 管理者ダッシュボード"""
    slide = prs.slides.add_slide(blank_layout)
    add_shape(slide, Inches(0), Inches(0), W, H, fill_color=C_BASE)
    header_bar(slide, "管理者ダッシュボード", badge_text="画面")

    notes = [
        "## ダッシュボード機能",
        "・当日の予約一覧表示",
        "・ステータス管理",
        "　（未対応 / 対応済 / キャンセル）",
        "・CSV 出力・PDF 印刷",
        "",
        "## 詳細モーダル",
        "・予約者全情報の確認",
        "・ステータス変更",
    ]
    image_with_notes(slide, SS_DIR / "09_dashboard.png", notes)


def slide_17_settings(prs, blank_layout):
    """スライド17: 設定画面"""
    slide = prs.slides.add_slide(blank_layout)
    add_shape(slide, Inches(0), Inches(0), W, H, fill_color=C_BASE)
    header_bar(slide, "設定画面", badge_text="画面")

    notes = [
        "## 設定項目",
        "・院内情報（院名・連絡先）",
        "・営業時間（曜日別）",
        "・休日設定",
        "・お知らせバナー",
        "・アカウント設定",
        "・ユーザー管理（新機能）",
    ]
    image_with_notes(slide, SS_DIR / "11_settings_clinic_info.png", notes)


def slide_19_deploy(prs, blank_layout):
    """スライド19: デプロイ構成"""
    slide = prs.slides.add_slide(blank_layout)
    add_shape(slide, Inches(0), Inches(0), W, H, fill_color=C_BASE)
    header_bar(slide, "デプロイ構成", badge_text="運用")

    content = (
        "## Firebase Hosting マルチサイト\n"
        "・portfolio サイト:\n"
        "　project-3040e21e-879f-4c66-a7d  →  kojinius.jp\n"
        "・oas サイト:\n"
        "　oas-kojinius  →  oas.kojinius.jp\n"
        "\n"
        "## デプロイコマンド\n"
        "・firebase deploy --only hosting\n"
        "・firebase deploy --only functions\n"
        "\n"
        "## 環境\n"
        "・本番: oas.kojinius.jp\n"
        "・Firebase プロジェクト: project-3040e21e-879f-4c66-a7d"
    )
    card(slide, Inches(0.5), Inches(1.1), Inches(12.33), Inches(5.8))
    add_text(slide, content,
             Inches(0.8), Inches(1.3), Inches(12.0), Inches(5.5),
             font_size=14, color=C_DARK, line_spacing=Pt(26))


def slide_20_closing(prs, blank_layout):
    """スライド20: クロージング"""
    slide = prs.slides.add_slide(blank_layout)
    add_shape(slide, Inches(0), Inches(0), W, H, fill_color=C_PRIMARY)
    add_shape(slide, Inches(0), H - Inches(1.5), W, Inches(1.5), fill_color=C_ACCENT)
    add_shape(slide, Inches(0.5), Inches(3.3), Inches(12.33), Inches(0.08),
              fill_color=C_ACCENT)

    add_text(slide, "Online Appointment System",
             Inches(0.5), Inches(1.5), Inches(12), Inches(0.9),
             font_size=36, bold=True, color=C_WHITE, align=PP_ALIGN.CENTER)
    add_text(slide, "詳細設計書  以上",
             Inches(0.5), Inches(2.5), Inches(12), Inches(0.7),
             font_size=26, color=C_BASE, align=PP_ALIGN.CENTER)
    add_text(slide, "oas.kojinius.jp",
             Inches(0.5), Inches(3.5), Inches(12), Inches(0.6),
             font_size=18, color=C_ACCENT, align=PP_ALIGN.CENTER)


# ─────────────────────────────────────────────
# メイン処理
# ─────────────────────────────────────────────

def main():
    prs = Presentation()
    prs.slide_width  = W
    prs.slide_height = H

    blank_layout = prs.slide_layouts[6]  # 完全ブランク

    # スライド1: カバー
    slide_01_cover(prs, blank_layout)

    # スライド2: 目次
    slide_02_toc(prs, blank_layout)

    # スライド3: 章区切り「システム概要」
    divider_slide(prs, blank_layout, "1. システム概要", [
        "システム目的・主要機能・非機能要件",
        "技術スタック",
    ])

    # スライド4: システム概要
    slide_04_overview(prs, blank_layout)

    # スライド5: 技術スタック
    slide_05_tech_stack(prs, blank_layout)

    # スライド6: 章区切り「アーキテクチャ設計」
    divider_slide(prs, blank_layout, "2. アーキテクチャ設計", [
        "ディレクトリ構成",
        "Firestore データモデル",
        "Cloud Functions 設計",
    ])

    # スライド7: ディレクトリ構成
    slide_07_directory(prs, blank_layout)

    # スライド8: Firestore データモデル
    slide_08_datamodel(prs, blank_layout)

    # スライド9: Cloud Functions 設計
    slide_09_functions(prs, blank_layout)

    # スライド10: 章区切り「セキュリティ設計」
    divider_slide(prs, blank_layout, "3. セキュリティ設計", [
        "認証・認可設計",
        "Firestore セキュリティルール",
        "XSS・入力バリデーション",
    ])

    # スライド11: 認証・認可設計
    slide_11_auth(prs, blank_layout)

    # スライド12: Firestore セキュリティルール
    slide_12_firestore_rules(prs, blank_layout)

    # スライド13: XSS・入力バリデーション
    slide_13_xss(prs, blank_layout)

    # スライド14: 章区切り「画面設計」
    divider_slide(prs, blank_layout, "4. 画面設計", [
        "患者向け予約フロー（3ステップ）",
        "管理者ダッシュボード",
        "設定画面",
    ])

    # スライド15: 患者向け予約フロー
    slide_15_patient_flow(prs, blank_layout)

    # スライド16: 管理者ダッシュボード
    slide_16_dashboard(prs, blank_layout)

    # スライド17: 設定画面
    slide_17_settings(prs, blank_layout)

    # スライド18: 章区切り「運用・デプロイ」
    divider_slide(prs, blank_layout, "5. 運用・デプロイ", [
        "Firebase Hosting マルチサイト構成",
        "デプロイコマンド・環境情報",
    ])

    # スライド19: デプロイ構成
    slide_19_deploy(prs, blank_layout)

    # スライド20: クロージング
    slide_20_closing(prs, blank_layout)

    # 出力
    OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    prs.save(str(OUTPUT_PATH))
    print(f"保存完了: {OUTPUT_PATH}")
    print(f"スライド数: {len(prs.slides)}")


if __name__ == "__main__":
    main()
