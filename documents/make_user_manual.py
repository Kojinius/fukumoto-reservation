"""
Online Appointment System ユーザーマニュアル
PowerPoint 生成スクリプト（実スクリーンショット版）

使い方:
  PYTHONUTF8=1 python make_user_manual.py

出力: documents/OnlineAppointSystem_ユーザーマニュアル.pptx
"""

from pathlib import Path
from pptx import Presentation
from pptx.util import Inches, Pt, Emu
from pptx.dml.color import RGBColor
from pptx.enum.text import PP_ALIGN

# ── アプリカラー ──
C_BROWN  = RGBColor(0x73, 0x57, 0x63)
C_ORANGE = RGBColor(0xF7, 0x93, 0x21)
C_BEIGE  = RGBColor(0xFC, 0xF0, 0xDE)
C_WHITE  = RGBColor(0xFF, 0xFF, 0xFF)
C_DARK   = RGBColor(0x4A, 0x30, 0x40)
C_MUTED  = RGBColor(0x9B, 0x7E, 0x8E)
C_LIGHT  = RGBColor(0xF5, 0xF0, 0xF5)
C_GRAY   = RGBColor(0xCC, 0xCC, 0xCC)
C_GREEN  = RGBColor(0x3A, 0x8A, 0x5C)
C_RED    = RGBColor(0xC0, 0x39, 0x2B)

SCREENSHOTS = Path(__file__).parent / "screenshots"
OUT_PATH    = Path(__file__).parent / "OnlineAppointSystem_ユーザーマニュアル.pptx"

W = Inches(13.33)
H = Inches(7.5)

prs = Presentation()
prs.slide_width  = W
prs.slide_height = H
blank = prs.slide_layouts[6]


# ── 共通ヘルパー ──
def add_rect(slide, x, y, w, h, fill=None, border=None, bw=Pt(1)):
    s = slide.shapes.add_shape(1, x, y, w, h)
    if fill:
        s.fill.solid()
        s.fill.fore_color.rgb = fill
    else:
        s.fill.background()
    if border:
        s.line.color.rgb = border
        s.line.width = bw
    else:
        s.line.fill.background()
    return s


def add_text(slide, text, x, y, w, h, size=18, bold=False, color=C_DARK,
             align=PP_ALIGN.LEFT, wrap=True):
    tb = slide.shapes.add_textbox(x, y, w, h)
    tf = tb.text_frame
    tf.word_wrap = wrap
    p = tf.paragraphs[0]
    p.alignment = align
    run = p.add_run()
    run.text = text
    run.font.size = Pt(size)
    run.font.bold = bold
    run.font.color.rgb = color
    return tb


def add_image_fit(slide, img_path, x, y, max_w, max_h):
    """
    画像を max_w x max_h の枠内にアスペクト比を保って中央配置する。
    """
    from PIL import Image as PILImage
    try:
        with PILImage.open(img_path) as im:
            iw, ih = im.size
    except Exception:
        # PIL が使えない場合はそのまま追加
        slide.shapes.add_picture(str(img_path), x, y, max_w, max_h)
        return

    # スケール計算
    scale_w = max_w / iw
    scale_h = max_h / ih
    scale   = min(scale_w, scale_h)
    disp_w  = int(iw * scale)
    disp_h  = int(ih * scale)

    # 中央配置オフセット
    off_x = (max_w - disp_w) // 2
    off_y = (max_h - disp_h) // 2

    slide.shapes.add_picture(str(img_path), x + off_x, y + off_y, disp_w, disp_h)


def title_bar(slide, title, subtitle=""):
    """スライド上部のタイトルバー"""
    add_rect(slide, 0, 0, W, Inches(0.85), fill=C_BROWN)
    add_text(slide, title, Inches(0.3), Inches(0.05), Inches(9), Inches(0.75),
             size=26, bold=True, color=C_WHITE)
    if subtitle:
        add_text(slide, subtitle, Inches(0.3), Inches(0.6), Inches(9), Inches(0.3),
                 size=13, color=C_BEIGE)


def section_label(slide, text, color=C_ORANGE):
    """右上のセクションラベル"""
    add_rect(slide, Inches(10.83), Inches(0.12), Inches(2.3), Inches(0.55), fill=color)
    add_text(slide, text, Inches(10.83), Inches(0.12), Inches(2.3), Inches(0.55),
             size=13, bold=True, color=C_WHITE, align=PP_ALIGN.CENTER)


def screen_slide(title, subtitle, desc_lines, img_name, label="患者向け"):
    """
    スクリーンショット付きスライドを作成する。
    左: タイトル + 説明文
    右: 実スクリーンショット
    """
    slide = prs.slides.add_slide(blank)

    # 背景
    add_rect(slide, 0, 0, W, H, fill=C_LIGHT)

    # タイトルバー
    title_bar(slide, title, subtitle)
    section_label(slide, label)

    # 左ペイン（説明）
    LEFT_W = Inches(4.3)
    CONTENT_Y = Inches(0.95)
    CONTENT_H = H - Inches(1.1)

    add_rect(slide, Inches(0.1), CONTENT_Y, LEFT_W, CONTENT_H,
             fill=C_WHITE, border=C_GRAY, bw=Pt(0.5))

    y = CONTENT_Y + Inches(0.2)
    for line in desc_lines:
        if line.startswith("##"):
            add_text(slide, line[2:].strip(), Inches(0.25), y, Inches(3.9), Inches(0.45),
                     size=14, bold=True, color=C_BROWN)
            y += Inches(0.45)
        elif line.startswith("・"):
            add_text(slide, line, Inches(0.3), y, Inches(3.85), Inches(0.38),
                     size=12, color=C_DARK)
            y += Inches(0.38)
        elif line == "":
            y += Inches(0.18)
        else:
            add_text(slide, line, Inches(0.3), y, Inches(3.85), Inches(0.38),
                     size=12, color=C_MUTED)
            y += Inches(0.38)

    # 右ペイン（スクリーンショット）
    RIGHT_X  = LEFT_W + Inches(0.3)
    RIGHT_W  = W - RIGHT_X - Inches(0.15)
    IMG_Y    = CONTENT_Y + Inches(0.1)
    IMG_H    = CONTENT_H - Inches(0.2)

    img_path = SCREENSHOTS / img_name
    if img_path.exists():
        add_image_fit(slide, img_path, RIGHT_X, IMG_Y, RIGHT_W, IMG_H)
    else:
        add_rect(slide, RIGHT_X, IMG_Y, RIGHT_W, IMG_H,
                 fill=RGBColor(0xEE, 0xEE, 0xEE), border=C_GRAY)
        add_text(slide, f"[画像なし: {img_name}]", RIGHT_X, IMG_Y + Inches(2.5),
                 RIGHT_W, Inches(0.5), size=14, color=C_MUTED, align=PP_ALIGN.CENTER)


def divider_slide(section_title, items):
    """セクション区切りスライド"""
    slide = prs.slides.add_slide(blank)
    add_rect(slide, 0, 0, W, H, fill=C_BROWN)
    add_rect(slide, Inches(0.5), Inches(2.0), Inches(12.33), Inches(0.08), fill=C_ORANGE)

    add_text(slide, section_title,
             Inches(0.5), Inches(1.1), Inches(12), Inches(1.0),
             size=40, bold=True, color=C_WHITE, align=PP_ALIGN.LEFT)

    y = Inches(2.3)
    for item in items:
        add_text(slide, "  " + item, Inches(0.7), y, Inches(12), Inches(0.5),
                 size=16, color=C_BEIGE)
        y += Inches(0.5)


# ──────────────────────────────────────────────
# スライド 01: カバー
# ──────────────────────────────────────────────
slide = prs.slides.add_slide(blank)
add_rect(slide, 0, 0, W, H, fill=C_BROWN)
add_rect(slide, 0, H - Inches(1.5), W, Inches(1.5), fill=C_ORANGE)
add_rect(slide, Inches(0.5), Inches(2.5), Inches(12.33), Inches(0.08), fill=C_BEIGE)

add_text(slide, "Online Appointment System",
         Inches(0.5), Inches(0.6), Inches(12), Inches(1.1),
         size=42, bold=True, color=C_WHITE, align=PP_ALIGN.LEFT)
add_text(slide, "ユーザーマニュアル",
         Inches(0.5), Inches(1.6), Inches(12), Inches(0.9),
         size=32, bold=False, color=C_BEIGE, align=PP_ALIGN.LEFT)
add_text(slide, "患者向け予約操作 ／ 管理者向け管理操作",
         Inches(0.5), Inches(2.7), Inches(12), Inches(0.6),
         size=18, color=C_BEIGE, align=PP_ALIGN.LEFT)
add_text(slide, "実画面キャプチャ版",
         Inches(0.5), H - Inches(1.3), Inches(6), Inches(0.5),
         size=15, color=C_WHITE, align=PP_ALIGN.LEFT)

# ──────────────────────────────────────────────
# スライド 02: 目次
# ──────────────────────────────────────────────
slide = prs.slides.add_slide(blank)
add_rect(slide, 0, 0, W, H, fill=C_LIGHT)
title_bar(slide, "目次", "本マニュアルで説明する操作一覧")

# 患者側
add_rect(slide, Inches(0.3), Inches(1.1), Inches(6.0), Inches(5.9),
         fill=C_WHITE, border=C_GRAY, bw=Pt(0.5))
add_rect(slide, Inches(0.3), Inches(1.1), Inches(6.0), Inches(0.5), fill=C_BROWN)
add_text(slide, "患者向け操作", Inches(0.3), Inches(1.1), Inches(6.0), Inches(0.5),
         size=16, bold=True, color=C_WHITE, align=PP_ALIGN.CENTER)

patient_items = [
    "01  トップページ（カレンダー表示）",
    "02  診察日・時間スロット選択",
    "03  予約フォーム入力",
    "04  予約内容の確認・送信",
    "05  予約のキャンセル方法",
    "06  プライバシーポリシー",
    "07  モバイル表示",
]
for i, item in enumerate(patient_items):
    add_text(slide, item, Inches(0.5), Inches(1.75) + Inches(0.6) * i,
             Inches(5.8), Inches(0.55), size=14, color=C_DARK)

# 管理者側
add_rect(slide, Inches(6.9), Inches(1.1), Inches(6.2), Inches(5.9),
         fill=C_WHITE, border=C_GRAY, bw=Pt(0.5))
add_rect(slide, Inches(6.9), Inches(1.1), Inches(6.2), Inches(0.5), fill=C_ORANGE)
add_text(slide, "管理者向け操作", Inches(6.9), Inches(1.1), Inches(6.2), Inches(0.5),
         size=16, bold=True, color=C_WHITE, align=PP_ALIGN.CENTER)

admin_items = [
    "08  ログインページ",
    "09  ダッシュボード（予約一覧）",
    "10  予約詳細モーダル",
    "11  設定 — 院内情報",
    "12  設定 — 営業時間",
    "13  設定 — 休日設定",
    "14  設定 — お知らせ",
    "15  設定 — アカウント管理",
]
for i, item in enumerate(admin_items):
    add_text(slide, item, Inches(7.1), Inches(1.75) + Inches(0.6) * i,
             Inches(6.0), Inches(0.55), size=14, color=C_DARK)


# ──────────────────────────────────────────────
# セクション区切り: 患者向け
# ──────────────────────────────────────────────
divider_slide("患者向け操作", [
    "予約の取り方（カレンダー → スロット選択 → フォーム入力 → 確認 → 送信）",
    "予約キャンセルの方法",
    "プライバシーポリシーの確認",
    "スマートフォンでの利用",
])

# ──────────────────────────────────────────────
# スライド 03〜09: 患者向け各画面
# ──────────────────────────────────────────────
patient_slides = [
    (
        "トップページ — カレンダー表示",
        "予約可能日の確認",
        [
            "## アクセス方法",
            "・ブラウザでシステムURLを開く",
            "・月単位のカレンダーが表示される",
            "",
            "## カレンダーの見方",
            "・グレー表示 = 予約受付なし・満枠",
            "・通常表示 = 予約可能日",
            "・予約したい日付をクリックする",
            "",
            "## 注意事項",
            "・受付時間外の日付は選択不可",
        ],
        "01_calendar_top.png",
        "患者向け",
    ),
    (
        "診察日・時間スロット選択",
        "希望する時間帯を選ぶ",
        [
            "## 時間スロットの確認",
            "・日付を選ぶと時間帯一覧が表示",
            "・「空き」ボタン = 予約可能",
            "・「×」ボタン = 満枠で選択不可",
            "",
            "## スロットの選択",
            "・希望の時間をクリックして選択",
            "・選択後「次へ」ボタンで進む",
            "",
            "## 変更したい場合",
            "・別の時間をクリックで変更可能",
        ],
        "02b_slot_selected.png",
        "患者向け",
    ),
    (
        "予約フォーム入力",
        "患者情報の入力",
        [
            "## 必須入力項目",
            "・お名前（漢字）",
            "・ふりがな",
            "・電話番号",
            "・メールアドレス",
            "・郵便番号（自動補完対応）",
            "・住所",
            "",
            "## 任意入力",
            "・症状・伝達事項",
            "",
            "## 個人情報同意",
            "・同意チェックを入れてから進む",
        ],
        "04b_form_filled.png",
        "患者向け",
    ),
    (
        "予約内容の確認・送信",
        "入力内容の最終確認",
        [
            "## 確認画面でできること",
            "・入力した全情報を一覧表示",
            "・「戻る」で修正も可能",
            "",
            "## 予約送信",
            "・「予約を確定する」ボタンで送信",
            "・送信後、確認メールが届く",
            "",
            "## 確認メールの内容",
            "・予約日時・氏名・予約ID",
            "・キャンセル用リンク",
            "・院内情報（住所・電話番号）",
        ],
        "05_confirm_step3.png",
        "患者向け",
    ),
    (
        "予約のキャンセル",
        "予約確認メールからキャンセルを行う",
        [
            "## キャンセル方法",
            "・確認メール内のキャンセルリンクをクリック",
            "・またはシステムの「キャンセル」ページへ",
            "",
            "## キャンセルページ操作",
            "・予約IDを入力",
            "・電話番号の末尾4桁を入力",
            "・「キャンセルする」ボタンをクリック",
            "",
            "## 注意事項",
            "・キャンセル後は元に戻せない",
            "・再予約は新しく予約が必要",
        ],
        "06_cancel_page.png",
        "患者向け",
    ),
    (
        "プライバシーポリシー",
        "個人情報の取り扱いについて",
        [
            "## アクセス方法",
            "・予約フォームの同意リンクから確認",
            "・または直接URLでアクセス可能",
            "",
            "## 記載内容",
            "・収集する個人情報の種類",
            "・利用目的",
            "・第三者への提供",
            "・お問い合わせ窓口",
            "",
            "## 同意について",
            "・予約前に必ずご確認ください",
        ],
        "07_privacy_policy.png",
        "患者向け",
    ),
    (
        "モバイル表示",
        "スマートフォンからの予約",
        [
            "## レスポンシブ対応",
            "・スマートフォン・タブレットに最適化",
            "・操作手順はPC版と同じ",
            "",
            "## モバイルでの操作",
            "・カレンダーをタップして日付選択",
            "・スロットをタップして時間選択",
            "・フォーム入力 → 確認 → 送信",
            "",
            "## 推奨環境",
            "・iOS Safari / Android Chrome",
            "・最新バージョン推奨",
        ],
        "m01_calendar_mobile.png",
        "患者向け",
    ),
]

for title, subtitle, desc, img, label in patient_slides:
    screen_slide(title, subtitle, desc, img, label)


# ──────────────────────────────────────────────
# セクション区切り: 管理者向け
# ──────────────────────────────────────────────
divider_slide("管理者向け操作", [
    "スタッフログインとダッシュボードの操作",
    "予約詳細の確認とステータス管理",
    "院内設定（院内情報・営業時間・休日・お知らせ・アカウント）",
])


# ──────────────────────────────────────────────
# スライド: 管理者向け各画面
# ──────────────────────────────────────────────
admin_slides = [
    (
        "ログインページ",
        "管理者アカウントでログインする",
        [
            "## アクセス方法",
            "・システムURL + /login.html",
            "",
            "## ログイン手順",
            "・メールアドレスを入力",
            "・パスワードを入力",
            "・「ログイン」ボタンをクリック",
            "",
            "## セキュリティ仕様",
            "・セッションは閉じると自動失効",
            "・管理者権限がない場合は拒否",
            "",
            "## パスワード忘れ",
            "・「パスワードを忘れた方」リンクから",
            "  リセットメールを送信できる",
        ],
        "08_login_page.png",
        "管理者向け",
    ),
    (
        "ダッシュボード",
        "予約一覧とKPI確認",
        [
            "## 画面構成",
            "・上部: KPI（今月の予約数・新規患者数）",
            "・中央: 予約一覧テーブル",
            "",
            "## 予約一覧の操作",
            "・「詳細」ボタンで予約詳細を確認",
            "・ステータスフィルターで絞り込み",
            "・氏名・日付で検索可能",
            "",
            "## ヘッダーの操作",
            "・「設定」ボタンで各種設定を開く",
            "・「ログアウト」でセッション終了",
        ],
        "09_dashboard.png",
        "管理者向け",
    ),
    (
        "予約詳細モーダル",
        "個別予約の詳細確認とステータス変更",
        [
            "## 表示される情報",
            "・氏名・ふりがな・電話番号",
            "・メールアドレス・住所",
            "・予約日時・予約ID",
            "・症状・伝達事項",
            "",
            "## ステータス変更",
            "・「確定」「キャンセル」「完了」に変更可",
            "",
            "## その他の操作",
            "・「PDF出力」で予約票を印刷",
            "・「×」ボタンで閉じる",
        ],
        "10_reservation_detail_modal.png",
        "管理者向け",
    ),
    (
        "設定 — 院内情報",
        "院名・住所・電話番号・ロゴ等の設定",
        [
            "## 設定できる項目",
            "・院名",
            "・メールアドレス",
            "・電話番号",
            "・郵便番号・住所",
            "・院内ロゴ画像（PNG/JPG/WEBP）",
            "・カラーテーマ（6色から選択）",
            "",
            "## 保存方法",
            "・入力後「保存する」ボタンをクリック",
            "・変更は即座に全画面に反映される",
        ],
        "11_settings_clinic_info.png",
        "管理者向け",
    ),
    (
        "設定 — 営業時間",
        "曜日ごとの受付時間・スロット間隔の設定",
        [
            "## 設定できる項目",
            "・曜日ごとの営業ON/OFF",
            "・診察開始・終了時間",
            "・スロット間隔（例: 30分）",
            "・最終受付の締め切り分数",
            "",
            "## スロット生成ルール",
            "・設定した間隔で自動生成",
            "・締め切り前のスロットは受付停止",
            "",
            "## 保存方法",
            "・変更後「保存する」ボタンをクリック",
        ],
        "12_settings_business_hours.png",
        "管理者向け",
    ),
    (
        "設定 — 休日設定",
        "定休日・臨時休業日の管理",
        [
            "## 設定できる項目",
            "・定休曜日（営業時間設定と連動）",
            "・個別の休日日付を追加",
            "",
            "## 休日の追加方法",
            "・カレンダーから日付を選択",
            "・「追加」ボタンでリストに登録",
            "",
            "## 休日の削除",
            "・登録済みの日付のゴミ箱アイコンで削除",
            "",
            "## 反映タイミング",
            "・保存後、患者側カレンダーに即反映",
        ],
        "13_settings_holidays.png",
        "管理者向け",
    ),
    (
        "設定 — お知らせ",
        "患者向けのお知らせ文の掲載",
        [
            "## 用途",
            "・休診のご案内",
            "・院内からのお知らせ",
            "・注意事項の掲載",
            "",
            "## 設定方法",
            "・テキストエリアにお知らせ文を入力",
            "・「表示する」をONにして保存",
            "",
            "## 表示場所",
            "・患者側トップページの上部に表示",
            "・非表示設定で一時的に隠せる",
        ],
        "14_settings_announcement.png",
        "管理者向け",
    ),
    (
        "設定 — アカウント管理",
        "メールアドレス・パスワードの変更",
        [
            "## 変更できる項目",
            "・ログイン用メールアドレス",
            "・ログイン用パスワード",
            "",
            "## パスワード変更手順",
            "・現在のパスワードで再認証",
            "・新しいパスワードを2回入力",
            "・8文字以上で設定",
            "",
            "## メールアドレス変更",
            "・新しいアドレスに確認メールが届く",
            "・メール内のリンクで変更完了",
            "",
            "## セキュリティ",
            "・変更時は必ず再認証が必要",
        ],
        "15_settings_account.png",
        "管理者向け",
    ),
]

for title, subtitle, desc, img, label in admin_slides:
    screen_slide(title, subtitle, desc, img, label)


# ──────────────────────────────────────────────
# 最終スライド: まとめ
# ──────────────────────────────────────────────
slide = prs.slides.add_slide(blank)
add_rect(slide, 0, 0, W, H, fill=C_BROWN)
add_rect(slide, 0, H - Inches(1.2), W, Inches(1.2), fill=C_ORANGE)

add_text(slide, "ご利用にあたって",
         Inches(0.5), Inches(0.5), Inches(12), Inches(0.9),
         size=36, bold=True, color=C_WHITE, align=PP_ALIGN.LEFT)
add_rect(slide, Inches(0.5), Inches(1.3), Inches(12.33), Inches(0.06), fill=C_BEIGE)

notes = [
    ("患者向け",   "PC・スマートフォン両対応。最新のブラウザ（Chrome / Safari）を推奨します。"),
    ("予約確認",   "予約完了後、入力されたメールアドレスに確認メールが送信されます。"),
    ("キャンセル", "確認メール内のキャンセルリンク、またはキャンセルページから手続きできます。"),
    ("管理者",     "管理者アカウントの新規作成は Firebase コンソールから行います。"),
    ("お問い合わせ", "システムに関するお問い合わせは管理者までご連絡ください。"),
]
for i, (head, body) in enumerate(notes):
    y = Inches(1.5) + Inches(0.95) * i
    add_rect(slide, Inches(0.5), y, Inches(2.3), Inches(0.7), fill=C_ORANGE)
    add_text(slide, head, Inches(0.5), y, Inches(2.3), Inches(0.7),
             size=16, bold=True, color=C_WHITE, align=PP_ALIGN.CENTER)
    add_rect(slide, Inches(2.9), y, Inches(10.0), Inches(0.7),
             fill=RGBColor(0x5A, 0x40, 0x50), border=None)
    add_text(slide, body, Inches(3.1), y, Inches(9.7), Inches(0.7),
             size=14, color=C_BEIGE)

add_text(slide, "Online Appointment System",
         Inches(0.5), H - Inches(1.0), Inches(12), Inches(0.5),
         size=14, color=C_WHITE, align=PP_ALIGN.CENTER)


# ── 保存 ──
prs.save(str(OUT_PATH))
print(f"保存完了: {OUT_PATH}")
print(f"総スライド数: {len(prs.slides)} 枚")
