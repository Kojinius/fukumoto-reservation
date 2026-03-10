"""
Online Appointment System ユーザーマニュアル PPTX 生成スクリプト
実行: PYTHONUTF8=1 python documents/make_user_manual.py
     (fukumoto-reservation ディレクトリから実行)
"""

from pathlib import Path
from pptx import Presentation
from pptx.util import Inches, Pt, Emu
from pptx.dml.color import RGBColor
from pptx.enum.text import PP_ALIGN
from pptx.util import Inches
from PIL import Image as PILImage

# ─── スライドサイズ ───────────────────────────────────────
W = Inches(13.33)
H = Inches(7.5)

# ─── ブランドカラー ──────────────────────────────────────
C_PRIMARY = RGBColor(0x73, 0x57, 0x63)  # ブラウン
C_ACCENT  = RGBColor(0xF7, 0x93, 0x21)  # オレンジ
C_BASE    = RGBColor(0xFC, 0xF0, 0xDE)  # ベージュ
C_WHITE   = RGBColor(0xFF, 0xFF, 0xFF)
C_DARK    = RGBColor(0x3D, 0x2B, 0x1F)
C_MUTED   = RGBColor(0x8B, 0x73, 0x55)

# ─── フォント ─────────────────────────────────────────────
FONT_PRIMARY = "Noto Sans JP"
FONT_FALLBACK = "Meiryo"

# ─── パス設定 ─────────────────────────────────────────────
BASE_DIR    = Path(__file__).parent.parent          # fukumoto-reservation/
DOC_DIR     = BASE_DIR / "documents"
SS_DIR      = DOC_DIR / "screenshots"
OUTPUT_DIR  = DOC_DIR / "manuals"
OUTPUT_FILE = OUTPUT_DIR / "OnlineAppointSystem_ユーザーマニュアル.pptx"


# ─── 部品関数 ─────────────────────────────────────────────

def _font_name():
    """フォント名を返す（Noto Sans JP 優先）"""
    return FONT_PRIMARY


def add_shape(slide, x, y, w, h, fill_color=None, line_color=None):
    """矩形シェイプを追加"""
    from pptx.util import Emu
    shape = slide.shapes.add_shape(
        1,  # MSO_SHAPE_TYPE.RECTANGLE
        x, y, w, h
    )
    fill = shape.fill
    if fill_color:
        fill.solid()
        fill.fore_color.rgb = fill_color
    else:
        fill.background()
    line = shape.line
    if line_color:
        line.color.rgb = line_color
    else:
        line.fill.background()
    return shape


def add_text(slide, text, x, y, w, h,
             font_size=18, bold=False, color=None,
             align=PP_ALIGN.LEFT, line_spacing=None,
             font_name=None):
    """テキストボックスを追加"""
    from pptx.util import Pt
    txBox = slide.shapes.add_textbox(x, y, w, h)
    tf = txBox.text_frame
    tf.word_wrap = True

    fn = font_name or _font_name()

    for i, line in enumerate(text.split("\n")):
        if i == 0:
            p = tf.paragraphs[0]
        else:
            p = tf.add_paragraph()
        p.alignment = align
        run = p.add_run()
        run.text = line
        run.font.name = fn
        run.font.size = Pt(font_size)
        run.font.bold = bold
        if color:
            run.font.color.rgb = color
        if line_spacing:
            from pptx.util import Pt as Pt2
            p.line_spacing = Pt2(line_spacing)

    return txBox


def header_bar(slide, title_text, badge_text=None, badge_color=C_ACCENT):
    """上部ヘッダーバーを描画"""
    bar_h = Inches(0.65)
    add_shape(slide, 0, 0, W, bar_h, fill_color=C_PRIMARY)

    add_text(slide, title_text,
             Inches(0.3), Inches(0.08),
             Inches(9.5), bar_h,
             font_size=22, bold=True, color=C_WHITE,
             align=PP_ALIGN.LEFT)

    if badge_text:
        badge_w = Inches(2.2)
        badge_x = W - badge_w - Inches(0.2)
        badge_shape = add_shape(slide, badge_x, Inches(0.1),
                                badge_w, Inches(0.45),
                                fill_color=badge_color)
        badge_shape.line.fill.background()
        add_text(slide, badge_text,
                 badge_x, Inches(0.1),
                 badge_w, Inches(0.45),
                 font_size=13, bold=True, color=C_WHITE,
                 align=PP_ALIGN.CENTER)


def card(slide, x, y, w, h, bg=C_BASE):
    """カード背景を描画"""
    shape = add_shape(slide, x, y, w, h, fill_color=bg)
    shape.line.fill.background()
    return shape


def add_image_fit(slide, img_path, x, y, max_w, max_h):
    """アスペクト比を維持して画像を配置"""
    if not img_path or not Path(img_path).exists():
        # グレーボックスで代替
        box = add_shape(slide, x, y, max_w, max_h,
                        fill_color=RGBColor(0xCC, 0xCC, 0xCC))
        add_text(slide, "（スクリーンショット準備中）",
                 x, y + max_h // 2 - Inches(0.3),
                 max_w, Inches(0.6),
                 font_size=14, color=RGBColor(0x66, 0x66, 0x66),
                 align=PP_ALIGN.CENTER)
        return

    try:
        with PILImage.open(img_path) as img:
            iw, ih = img.size
    except Exception:
        add_shape(slide, x, y, max_w, max_h,
                  fill_color=RGBColor(0xCC, 0xCC, 0xCC))
        return

    scale = min(max_w / iw, max_h / ih)
    draw_w = int(iw * scale)
    draw_h = int(ih * scale)

    # 中央揃え
    cx = x + (max_w - draw_w) // 2
    cy = y + (max_h - draw_h) // 2

    slide.shapes.add_picture(str(img_path), cx, cy, draw_w, draw_h)


def screen_slide(prs, blank_layout, title, subtitle, desc_lines, img_path,
                 label_text="患者向け", label_color=C_ACCENT,
                 left_w=Inches(4.3)):
    """
    左ペイン: 説明テキスト
    右ペイン: スクリーンショット
    """
    slide = prs.slides.add_slide(blank_layout)

    # 背景
    add_shape(slide, 0, 0, W, H, fill_color=C_WHITE)

    # ヘッダー
    header_bar(slide, title, badge_text=label_text, badge_color=label_color)

    bar_h = Inches(0.65)
    content_y = bar_h + Inches(0.1)
    content_h = H - content_y - Inches(0.15)

    # 左ペイン背景
    card(slide, 0, content_y, left_w, content_h, bg=C_BASE)

    # サブタイトル
    if subtitle:
        add_text(slide, subtitle,
                 Inches(0.25), content_y + Inches(0.15),
                 left_w - Inches(0.3), Inches(0.5),
                 font_size=13, bold=False, color=C_MUTED)

    # 説明テキスト（## でセクション見出し、・で箇条書き）
    text_y = content_y + (Inches(0.55) if subtitle else Inches(0.2))
    text_h = content_h - (Inches(0.55) if subtitle else Inches(0.2)) - Inches(0.1)
    txBox = slide.shapes.add_textbox(
        Inches(0.25), text_y,
        left_w - Inches(0.3), text_h
    )
    tf = txBox.text_frame
    tf.word_wrap = True

    fn = _font_name()
    first = True
    for line in desc_lines:
        if first:
            p = tf.paragraphs[0]
            first = False
        else:
            p = tf.add_paragraph()

        if line.startswith("## "):
            # セクション見出し
            run = p.add_run()
            run.text = line[3:]
            run.font.name = fn
            run.font.size = Pt(15)
            run.font.bold = True
            run.font.color.rgb = C_PRIMARY
        elif line.startswith("・"):
            # 箇条書き
            p.level = 1
            run = p.add_run()
            run.text = line
            run.font.name = fn
            run.font.size = Pt(13)
            run.font.color.rgb = C_DARK
        elif line == "":
            # 空行（スペーサー）
            run = p.add_run()
            run.text = ""
            run.font.size = Pt(6)
        else:
            run = p.add_run()
            run.text = line
            run.font.name = fn
            run.font.size = Pt(13)
            run.font.color.rgb = C_DARK

    # 右ペイン
    right_x = left_w + Inches(0.25)
    right_w = W - right_x - Inches(0.2)
    right_y = content_y + Inches(0.2)
    right_h = content_h - Inches(0.4)

    add_image_fit(slide, img_path, right_x, right_y, right_w, right_h)

    return slide


def divider_slide(prs, blank_layout, section_title, items,
                  bg=C_PRIMARY, accent=C_ACCENT, fg=C_BASE):
    """章区切りスライド"""
    slide = prs.slides.add_slide(blank_layout)

    # 全面背景
    add_shape(slide, 0, 0, W, H, fill_color=bg)

    # アクセントライン（左端）
    add_shape(slide, 0, 0, Inches(0.18), H, fill_color=accent)

    # セクションタイトル
    add_text(slide, section_title,
             Inches(0.5), Inches(2.5),
             Inches(8), Inches(1.2),
             font_size=42, bold=True, color=fg,
             align=PP_ALIGN.LEFT)

    # アクセントアンダーライン
    add_shape(slide, Inches(0.5), Inches(3.6),
              Inches(3.5), Inches(0.06),
              fill_color=accent)

    # サブ項目リスト
    if items:
        y_start = Inches(4.0)
        for i, item in enumerate(items):
            add_text(slide, f"▸  {item}",
                     Inches(0.8), y_start + Inches(0.45) * i,
                     Inches(10), Inches(0.45),
                     font_size=16, color=RGBColor(0xFF, 0xD5, 0xA0),
                     align=PP_ALIGN.LEFT)

    return slide


def cover_slide(prs, blank_layout):
    """カバースライド（1枚目）"""
    slide = prs.slides.add_slide(blank_layout)

    # 背景グラデーション代替（2分割）
    add_shape(slide, 0, 0, W, Inches(4.5), fill_color=C_PRIMARY)
    add_shape(slide, 0, Inches(4.5), W, Inches(3.0), fill_color=C_BASE)

    # 左アクセントライン
    add_shape(slide, 0, 0, Inches(0.18), H, fill_color=C_ACCENT)

    # システム名
    add_text(slide, "Online Appointment System",
             Inches(0.6), Inches(1.4),
             Inches(11), Inches(1.3),
             font_size=46, bold=True, color=C_WHITE,
             align=PP_ALIGN.LEFT)

    # サブタイトル
    add_text(slide, "ユーザーマニュアル",
             Inches(0.6), Inches(2.8),
             Inches(8), Inches(0.9),
             font_size=28, bold=False, color=C_ACCENT,
             align=PP_ALIGN.LEFT)

    # 区切り線
    add_shape(slide, Inches(0.6), Inches(3.7),
              Inches(4.5), Inches(0.05),
              fill_color=C_ACCENT)

    # 日付
    add_text(slide, "2026年3月",
             Inches(0.6), Inches(3.9),
             Inches(4), Inches(0.6),
             font_size=18, color=C_MUTED,
             align=PP_ALIGN.LEFT)

    # ロゴ的テキスト（右下）
    add_text(slide, "OAS",
             Inches(10.5), Inches(5.5),
             Inches(2.5), Inches(1.5),
             font_size=72, bold=True, color=C_PRIMARY,
             align=PP_ALIGN.CENTER)

    return slide


def toc_slide(prs, blank_layout):
    """目次スライド（2枚目）"""
    slide = prs.slides.add_slide(blank_layout)
    add_shape(slide, 0, 0, W, H, fill_color=C_WHITE)
    header_bar(slide, "目次", badge_text="Table of Contents", badge_color=C_MUTED)

    bar_h = Inches(0.65)
    col_y = bar_h + Inches(0.3)

    # 患者向け列
    left_x = Inches(0.4)
    col_w  = Inches(5.8)
    add_text(slide, "患者向け機能",
             left_x, col_y, col_w, Inches(0.55),
             font_size=18, bold=True, color=C_PRIMARY)
    add_shape(slide, left_x, col_y + Inches(0.52),
              Inches(2.5), Inches(0.04), fill_color=C_ACCENT)

    patient_items = [
        "01  トップページ（カレンダー）",
        "02  時間枠の選択",
        "03  お客様情報入力（Step 2）",
        "04  確認画面（Step 3）",
        "05  予約キャンセル",
        "06  プライバシーポリシー",
        "07  モバイル対応",
    ]
    for i, item in enumerate(patient_items):
        add_text(slide, item,
                 left_x + Inches(0.1), col_y + Inches(0.75) + Inches(0.47) * i,
                 col_w - Inches(0.1), Inches(0.45),
                 font_size=14, color=C_DARK)

    # 管理者向け列
    right_x = Inches(6.8)
    add_text(slide, "管理者向け機能",
             right_x, col_y, col_w, Inches(0.55),
             font_size=18, bold=True, color=C_PRIMARY)
    add_shape(slide, right_x, col_y + Inches(0.52),
              Inches(2.5), Inches(0.04), fill_color=C_ACCENT)

    admin_items = [
        "08  管理者ログイン",
        "09  予約ダッシュボード",
        "10  予約詳細モーダル",
        "11  設定 - 院内情報",
        "12  設定 - 営業時間",
        "13  設定 - 休日設定",
        "14  設定 - お知らせ",
        "15  設定 - アカウント",
        "16  ユーザー管理",
        "17  通知メール設定",
    ]
    for i, item in enumerate(admin_items):
        add_text(slide, item,
                 right_x + Inches(0.1), col_y + Inches(0.75) + Inches(0.44) * i,
                 col_w - Inches(0.1), Inches(0.43),
                 font_size=14, color=C_DARK)

    return slide


def closing_slide(prs, blank_layout):
    """クロージングスライド（最終枚）"""
    slide = prs.slides.add_slide(blank_layout)
    add_shape(slide, 0, 0, W, H, fill_color=C_PRIMARY)
    add_shape(slide, 0, 0, Inches(0.18), H, fill_color=C_ACCENT)

    add_text(slide, "ご利用ありがとうございます",
             Inches(0.6), Inches(2.6),
             Inches(12), Inches(1.4),
             font_size=40, bold=True, color=C_WHITE,
             align=PP_ALIGN.CENTER)

    add_shape(slide, Inches(3.5), Inches(4.0),
              Inches(6.3), Inches(0.06),
              fill_color=C_ACCENT)

    add_text(slide, "Online Appointment System",
             Inches(0.6), Inches(4.3),
             Inches(12), Inches(0.7),
             font_size=20, color=C_ACCENT,
             align=PP_ALIGN.CENTER)

    add_text(slide, "https://oas.kojinius.jp",
             Inches(0.6), Inches(5.1),
             Inches(12), Inches(0.6),
             font_size=16, color=RGBColor(0xCC, 0xCC, 0xCC),
             align=PP_ALIGN.CENTER)

    return slide


# ─── メイン処理 ───────────────────────────────────────────

def build_pptx():
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

    prs = Presentation()
    prs.slide_width  = W
    prs.slide_height = H

    blank_layout = prs.slide_layouts[6]  # 完全白紙レイアウト

    # ── 1. カバー ──────────────────────────────────────────
    cover_slide(prs, blank_layout)

    # ── 2. 目次 ──────────────────────────────────────────
    toc_slide(prs, blank_layout)

    # ── 3. 章区切り：患者向け ─────────────────────────────
    divider_slide(prs, blank_layout,
                  "患者向け機能",
                  [
                      "トップページ（カレンダー）",
                      "時間枠の選択",
                      "お客様情報入力",
                      "確認画面",
                      "予約キャンセル",
                      "プライバシーポリシー",
                      "モバイル対応",
                  ])

    # ── 4. トップページ（カレンダー） ─────────────────────
    screen_slide(
        prs, blank_layout,
        title="トップページ（カレンダー）",
        subtitle="予約受付の入口",
        desc_lines=[
            "## アクセス方法",
            "・ブラウザで https://oas.kojinius.jp を開く",
            "・予約可能日はカレンダーで表示",
            "",
            "## カレンダーの見方",
            "・グレー = 予約不可（休業日・過去日）",
            "・通常 = 予約可能な日",
        ],
        img_path=SS_DIR / "01_calendar_top.png",
        label_text="患者向け",
        label_color=C_ACCENT,
    )

    # ── 5. 時間枠の選択 ───────────────────────────────────
    screen_slide(
        prs, blank_layout,
        title="時間枠の選択",
        subtitle="希望の時間帯を選ぶ",
        desc_lines=[
            "## 時間枠を選ぶ",
            "・希望日をクリックして時間枠を表示",
            "・「予約済み」は選択不可",
            "・選択した枠はハイライト表示",
            "",
            "## 次のステップ",
            "・枠選択後「次へ → 情報入力」ボタンが有効に",
        ],
        img_path=SS_DIR / "02_time_slots.png",
        label_text="患者向け",
        label_color=C_ACCENT,
    )

    # ── 6. お客様情報入力（Step 2） ───────────────────────
    screen_slide(
        prs, blank_layout,
        title="お客様情報入力（Step 2）",
        subtitle="必要事項をご入力ください",
        desc_lines=[
            "## 入力項目",
            "・お名前（必須）",
            "・電話番号（必須）",
            "・メールアドレス（任意）",
            "・住所（郵便番号で自動入力）",
            "・症状・伝達事項（任意）",
            "",
            "## 郵便番号機能",
            "・7桁入力で住所を自動補完",
        ],
        img_path=SS_DIR / "03_form_step2.png",
        label_text="患者向け",
        label_color=C_ACCENT,
    )

    # ── 7. 確認画面（Step 3） ─────────────────────────────
    screen_slide(
        prs, blank_layout,
        title="確認画面（Step 3）",
        subtitle="予約内容を最終確認",
        desc_lines=[
            "## 予約内容の確認",
            "・日時・お名前・連絡先を最終確認",
            "・「この内容で予約する」で完了",
            "",
            "## 予約完了後",
            "・予約IDが発行されます",
            "・確認メールが送信されます",
        ],
        img_path=SS_DIR / "05_confirm_step3.png",
        label_text="患者向け",
        label_color=C_ACCENT,
    )

    # ── 8. 予約キャンセル ─────────────────────────────────
    screen_slide(
        prs, blank_layout,
        title="予約キャンセル",
        subtitle="キャンセルの手順",
        desc_lines=[
            "## キャンセル方法",
            "・予約IDを入力してキャンセル",
            "・確認後、取り消しが完了",
            "",
            "## 注意事項",
            "・前日までのキャンセルを推奨",
            "・キャンセル通知メールが届きます",
        ],
        img_path=SS_DIR / "06_cancel_page.png",
        label_text="患者向け",
        label_color=C_ACCENT,
    )

    # ── 9. プライバシーポリシー ───────────────────────────
    screen_slide(
        prs, blank_layout,
        title="プライバシーポリシー",
        subtitle="個人情報の取り扱いについて",
        desc_lines=[
            "## 個人情報の取り扱い",
            "・入力情報は予約管理のみに使用",
            "・第三者への提供は行いません",
            "・問い合わせは院内窓口まで",
        ],
        img_path=SS_DIR / "07_privacy_policy.png",
        label_text="患者向け",
        label_color=C_ACCENT,
    )

    # ── 10. モバイル対応 ──────────────────────────────────
    screen_slide(
        prs, blank_layout,
        title="モバイル対応",
        subtitle="スマートフォンからも利用可能",
        desc_lines=[
            "## スマートフォンでも利用可能",
            "・iOS・Android 対応",
            "・ブラウザでアクセスするだけ",
            "・アプリインストール不要",
        ],
        img_path=SS_DIR / "m01_calendar_mobile.png",
        label_text="患者向け",
        label_color=C_ACCENT,
    )

    # ── 11. 章区切り：管理者向け ──────────────────────────
    divider_slide(prs, blank_layout,
                  "管理者向け機能",
                  [
                      "管理者ログイン",
                      "予約ダッシュボード",
                      "予約詳細モーダル",
                      "設定（院内情報・営業時間・休日・お知らせ・アカウント）",
                      "ユーザー管理",
                      "通知メール設定",
                  ])

    # ── 12. 管理者ログイン ────────────────────────────────
    screen_slide(
        prs, blank_layout,
        title="管理者ログイン",
        subtitle="管理画面へのアクセス",
        desc_lines=[
            "## ログイン方法",
            "・メールアドレスとパスワードを入力",
            "・「ログイン」ボタンをクリック",
            "",
            "## パスワード忘れた場合",
            "・「パスワードを忘れた方」から",
            "　リセットメール送信",
        ],
        img_path=SS_DIR / "08_login_page.png",
        label_text="管理者向け",
        label_color=C_PRIMARY,
    )

    # ── 13. 予約ダッシュボード ────────────────────────────
    screen_slide(
        prs, blank_layout,
        title="予約ダッシュボード",
        subtitle="本日の予約を一括管理",
        desc_lines=[
            "## ダッシュボード概要",
            "・本日の予約一覧が表示",
            "・患者名・時間・ステータスを一覧確認",
            "",
            "## 操作",
            "・行をクリックで詳細モーダル表示",
            "・CSV 出力・PDF 印刷に対応",
        ],
        img_path=SS_DIR / "09_dashboard.png",
        label_text="管理者向け",
        label_color=C_PRIMARY,
    )

    # ── 14. 予約詳細モーダル ──────────────────────────────
    screen_slide(
        prs, blank_layout,
        title="予約詳細モーダル",
        subtitle="予約情報の確認と更新",
        desc_lines=[
            "## 詳細情報",
            "・予約者の全情報を確認",
            "・症状・伝達事項を確認",
            "",
            "## ステータス変更",
            "・対応済み / キャンセル に変更可",
            "・変更は即時 Firestore に反映",
        ],
        img_path=SS_DIR / "10_reservation_detail_modal.png",
        label_text="管理者向け",
        label_color=C_PRIMARY,
    )

    # ── 15. 設定 - 院内情報 ───────────────────────────────
    screen_slide(
        prs, blank_layout,
        title="設定 - 院内情報",
        subtitle="クリニック基本情報の管理",
        desc_lines=[
            "## 院内情報の編集",
            "・院名・住所・電話番号を設定",
            "・トップページに表示される情報",
            "",
            "## 保存",
            "・「保存」ボタンで即時反映",
        ],
        img_path=SS_DIR / "11_settings_clinic_info.png",
        label_text="管理者向け",
        label_color=C_PRIMARY,
    )

    # ── 16. 設定 - 営業時間 ───────────────────────────────
    screen_slide(
        prs, blank_layout,
        title="設定 - 営業時間",
        subtitle="予約受付時間の設定",
        desc_lines=[
            "## 営業時間の設定",
            "・曜日ごとに ON/OFF 切り替え",
            "・開始・終了時間を入力",
            "・カレンダーの予約可否に即反映",
        ],
        img_path=SS_DIR / "12_settings_business_hours.png",
        label_text="管理者向け",
        label_color=C_PRIMARY,
    )

    # ── 17. 設定 - 休日設定 ───────────────────────────────
    screen_slide(
        prs, blank_layout,
        title="設定 - 休日設定",
        subtitle="休診日・祝日の登録",
        desc_lines=[
            "## 休日の登録",
            "・カレンダーから休日を選択",
            "・祝日名を任意入力可能",
            "・登録した日はカレンダーで予約不可に",
        ],
        img_path=SS_DIR / "13_settings_holidays.png",
        label_text="管理者向け",
        label_color=C_PRIMARY,
    )

    # ── 18. 設定 - お知らせ ───────────────────────────────
    screen_slide(
        prs, blank_layout,
        title="設定 - お知らせ",
        subtitle="患者向けバナーメッセージ",
        desc_lines=[
            "## お知らせ機能",
            "・トップページにバナー表示",
            "・テキストと表示 ON/OFF を設定",
            "・休診のお知らせなどに活用",
        ],
        img_path=SS_DIR / "14_settings_announcement.png",
        label_text="管理者向け",
        label_color=C_PRIMARY,
    )

    # ── 19. 設定 - アカウント ─────────────────────────────
    screen_slide(
        prs, blank_layout,
        title="設定 - アカウント",
        subtitle="管理者アカウント情報の変更",
        desc_lines=[
            "## アカウント設定",
            "・管理者メールアドレスの変更",
            "・パスワードの変更",
            "・変更後は再ログインが必要",
        ],
        img_path=SS_DIR / "15_settings_account.png",
        label_text="管理者向け",
        label_color=C_PRIMARY,
    )

    # ── 20. ユーザー管理 ──────────────────────────────────
    screen_slide(
        prs, blank_layout,
        title="ユーザー管理",
        subtitle="管理者アカウントの追加・削除",
        desc_lines=[
            "## ユーザー管理機能",
            "・管理者アカウントの追加・削除",
            "・メールアドレスで新規招待",
            "",
            "## 権限",
            "・管理者権限は admin クレームで制御",
            "・一般ユーザーは管理画面にアクセス不可",
        ],
        img_path=SS_DIR / "16_settings_user_mgmt.png",
        label_text="管理者向け",
        label_color=C_PRIMARY,
    )

    # ── 21. 通知メール設定（スクショなし） ────────────────
    screen_slide(
        prs, blank_layout,
        title="通知メール設定",
        subtitle="自動メール配信の仕組み",
        desc_lines=[
            "## 予約通知メール",
            "・予約完了時に患者へ自動送信",
            "・院内情報の連絡先が差出人に設定",
            "・キャンセル時も通知メールを送信",
            "",
            "## カスタマイズ",
            "・メール文面は Firebase Functions で管理",
        ],
        img_path=None,  # スクショなし → グレーボックス
        label_text="管理者向け",
        label_color=C_PRIMARY,
    )

    # ── 22. クロージング ──────────────────────────────────
    closing_slide(prs, blank_layout)

    # ─── 保存 ────────────────────────────────────────────
    prs.save(str(OUTPUT_FILE))
    print(f"✅ 生成完了: {OUTPUT_FILE}")
    print(f"   スライド枚数: {len(prs.slides)}")


if __name__ == "__main__":
    build_pptx()
