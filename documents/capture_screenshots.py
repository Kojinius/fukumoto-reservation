"""
OAS スクリーンショット撮影スクリプト（React SPA + devサーバー対応版）
実行: PYTHONUTF8=1 python documents/capture_screenshots.py
依存: pip install playwright pillow && playwright install chromium
前提: firebase emulators + vite dev server が起動済み（emu-reset oas）
"""
import os
import uuid
from pathlib import Path
from playwright.sync_api import sync_playwright

BASE_URL    = "http://localhost:5173"
ADMIN_EMAIL = os.environ.get("ADMIN_EMAIL", "admin@oas-test.local")
ADMIN_PASS  = os.environ.get("ADMIN_PASS",  "Admin001!")

OUT_DIR = Path(__file__).parent / "screenshots"
OUT_DIR.mkdir(exist_ok=True)

VIEWPORT        = {"width": 1280, "height": 800}
VIEWPORT_MOBILE = {"width": 390,  "height": 844}


def shot(page, name, wait_ms=1200):
    """スクリーンショットを撮影して保存する"""
    page.wait_for_timeout(wait_ms)
    path = str(OUT_DIR / f"{name}.png")
    page.screenshot(path=path, full_page=False)
    print(f"  撮影: {name}.png")


def wait_for_react(page, timeout=10000):
    """React の初期レンダリング完了を待つ（Firebase リスナー対策で networkidle は使わない）"""
    page.wait_for_load_state("domcontentloaded", timeout=timeout)
    page.wait_for_timeout(1800)


def run():
    # 問診票は任意のUUIDでフォーム表示（Firestoreルールにより emulator REST API は403）
    questionnaire_id = str(uuid.uuid4())
    print(f"  問診票用仮ID: {questionnaire_id}")

    with sync_playwright() as pw:
        browser = pw.chromium.launch(headless=True)

        # ─────────────────────────────────────────────
        # 患者向けセクション（デスクトップ）
        # ─────────────────────────────────────────────
        ctx = browser.new_context(viewport=VIEWPORT)
        page = ctx.new_page()

        # 01 トップページ（カレンダー）
        page.goto(BASE_URL, wait_until="load")
        wait_for_react(page)
        shot(page, "01_calendar_top")

        # 02 日付選択 → 時間枠選択
        try:
            # カレンダーグリッド内の有効な日付ボタンを複数試行（今日は満席/過去の可能性があるため）
            date_btns = page.locator("div.grid button:not([disabled])")
            clicked_date = False
            for i in range(min(date_btns.count(), 10)):
                date_btns.nth(i).click()
                page.wait_for_timeout(1200)
                # 有効な時間枠ボタンがあるか JS で確認
                found = page.evaluate(
                    "() => !!document.querySelector('button:not([disabled])[class*=font-mono]')"
                )
                if found:
                    clicked_date = True
                    break

            if clicked_date:
                shot(page, "02_time_slots")
                # 時間枠ボタンを JS で取得してクリック
                slot_clicked = page.evaluate("""
                    () => {
                        const btn = document.querySelector('button:not([disabled])[class*=font-mono]');
                        if (btn) { btn.click(); return btn.textContent.trim(); }
                        return null;
                    }
                """)
                if slot_clicked:
                    page.wait_for_timeout(600)
                    shot(page, "02b_slot_selected")
            else:
                # 有効スロットが見つからなくても時間枠UI を撮影
                date_btns.first.click()
                page.wait_for_timeout(1000)
                shot(page, "02_time_slots")
        except Exception as e:
            print(f"  スキップ(02): {e}")

        # 03 情報入力フォーム（Step 2）— 時間枠選択後に「次へ」が有効化される
        try:
            next_btn = page.locator("button:not([disabled])").filter(has_text="次へ")
            next_btn.first.click(timeout=6000)
            wait_for_react(page)
            shot(page, "03_form_step2")

            # フォーム入力（ダミーデータ）
            try:
                page.get_by_label("お名前", exact=True).fill("山田 太郎")
                page.get_by_label("ふりがな", exact=True).fill("やまだ たろう")
                page.get_by_label("電話番号", exact=True).fill("090-1234-5678")
                page.get_by_label("メールアドレス", exact=True).fill("yamada@example.com")
                page.wait_for_timeout(300)

                # 要配慮個人情報同意チェックボックスをクリック（チェックされていなければ）
                page.evaluate("""
                    () => {
                        const boxes = Array.from(document.querySelectorAll('input[type=checkbox]'));
                        boxes.forEach(b => { if (!b.checked) b.click(); });
                    }
                """)
                page.wait_for_timeout(300)

                # 症状・お悩み入力
                try:
                    page.get_by_label("症状・お悩み", exact=True).fill("腰の痛みが続いています。")
                except Exception:
                    pass
                page.wait_for_timeout(400)
                shot(page, "03b_form_filled")
            except Exception:
                pass

            # 確認画面へ（i18n: booking.patientForm.toConfirm = "確認画面へ"）
            try:
                page.get_by_role("button", name="確認画面へ").click(timeout=5000)
                wait_for_react(page)
                shot(page, "05_confirm_step3")
            except Exception as e:
                print(f"  スキップ(05): {e}")
        except Exception as e:
            print(f"  スキップ(03-05): {e}")

        # 06 キャンセルページ
        page.goto(f"{BASE_URL}/cancel", wait_until="load")
        wait_for_react(page)
        shot(page, "06_cancel_page")

        # 07 プライバシーポリシー
        page.goto(f"{BASE_URL}/privacy-policy", wait_until="load")
        wait_for_react(page)
        shot(page, "07_privacy_policy")

        # 08 問診票ページ（仮IDでフォーム表示）
        try:
            page.goto(f"{BASE_URL}/questionnaire?bookingId={questionnaire_id}", wait_until="load")
            wait_for_react(page)
            shot(page, "08_questionnaire")
        except Exception as e:
            print(f"  スキップ(08): {e}")

        ctx.close()

        # ─────────────────────────────────────────────
        # 患者向けセクション（モバイル）
        # ─────────────────────────────────────────────
        ctx_m = browser.new_context(viewport=VIEWPORT_MOBILE)
        page_m = ctx_m.new_page()
        page_m.goto(BASE_URL, wait_until="load")
        wait_for_react(page_m)
        shot(page_m, "m01_calendar_mobile")
        ctx_m.close()

        # ─────────────────────────────────────────────
        # 管理者セクション（デスクトップ）
        # ─────────────────────────────────────────────
        ctx_a = browser.new_context(viewport=VIEWPORT)
        page_a = ctx_a.new_page()

        # 09 管理者ログイン画面
        page_a.goto(f"{BASE_URL}/login", wait_until="load")
        wait_for_react(page_a)
        shot(page_a, "09_login_page")

        # ログイン実行
        page_a.get_by_label("メールアドレス", exact=True).fill(ADMIN_EMAIL)
        page_a.get_by_label("パスワード", exact=True).fill(ADMIN_PASS)
        page_a.get_by_role("button", name="ログイン").click()
        page_a.wait_for_url(f"{BASE_URL}/admin**", timeout=20000)
        wait_for_react(page_a)

        # 10 予約ダッシュボード
        shot(page_a, "10_dashboard")

        # 11 予約詳細モーダル（「詳細」ボタンをクリック）
        try:
            page_a.get_by_role("button", name="詳細").first.click(timeout=5000)
            page_a.wait_for_selector("[role='dialog']", timeout=5000)
            shot(page_a, "11_reservation_detail_modal")
            page_a.keyboard.press("Escape")
            page_a.wait_for_timeout(500)
        except Exception as e:
            print(f"  スキップ(11): {e}")

        # 12 診察履歴ページ
        try:
            page_a.goto(f"{BASE_URL}/admin/history", wait_until="load")
            wait_for_react(page_a)
            shot(page_a, "12_history_page")

            # 診察履歴詳細モーダル（「詳細」ボタンをクリック）
            try:
                page_a.get_by_role("button", name="詳細").first.click(timeout=5000)
                page_a.wait_for_selector("[role='dialog']", timeout=5000)
                shot(page_a, "12b_history_detail_modal")
                page_a.keyboard.press("Escape")
                page_a.wait_for_timeout(500)
            except Exception:
                pass
        except Exception as e:
            print(f"  スキップ(12): {e}")

        # 設定画面（各タブ）
        page_a.goto(f"{BASE_URL}/admin/settings", wait_until="load")
        wait_for_react(page_a)

        settings_tabs = [
            ("基本情報",   "13_settings_basic_info"),
            ("営業日設定", "14_settings_business_days"),
            ("お知らせ",   "15_settings_announcement"),
            ("利用規約",   "16_settings_terms"),
            ("ポリシー",   "17_settings_policy"),
            ("アカウント", "18_settings_accounts"),
        ]
        for tab_name, filename in settings_tabs:
            try:
                page_a.get_by_role("button", name=tab_name, exact=True).click(timeout=5000)
                page_a.wait_for_timeout(700)
                shot(page_a, filename)
            except Exception as e:
                print(f"  スキップ({filename}): {e}")

        # 19 パスワード変更画面
        try:
            page_a.goto(f"{BASE_URL}/admin/change-password", wait_until="load")
            wait_for_react(page_a)
            shot(page_a, "19_change_password")
        except Exception as e:
            print(f"  スキップ(19): {e}")

        # ストレージ状態を保存してモバイルコンテキストでも使用
        storage_state = ctx_a.storage_state()
        ctx_a.close()

        # ─────────────────────────────────────────────
        # 管理者セクション（モバイル — 新ナビ確認用）
        # ─────────────────────────────────────────────
        ctx_am = browser.new_context(viewport=VIEWPORT_MOBILE, storage_state=storage_state)
        page_am = ctx_am.new_page()
        try:
            page_am.goto(f"{BASE_URL}/admin", wait_until="load")
            wait_for_react(page_am)
            shot(page_am, "m02_admin_mobile_nav")

            # 診察履歴タブをタップ（モバイルナビのリンク）
            try:
                page_am.get_by_role("link", name="診察履歴").first.click(timeout=4000)
                wait_for_react(page_am)
                shot(page_am, "m03_admin_mobile_history")
            except Exception:
                pass
        except Exception as e:
            print(f"  スキップ(モバイル管理): {e}")
        ctx_am.close()

        browser.close()

    total = len(list(OUT_DIR.glob("*.png")))
    print(f"\n完了！ {total}枚 → {OUT_DIR}")


if __name__ == "__main__":
    run()
