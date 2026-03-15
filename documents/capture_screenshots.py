"""
OAS スクリーンショット撮影スクリプト（React SPA 対応版）
実行: PYTHONUTF8=1 python documents/capture_screenshots.py
依存: pip install playwright pillow && playwright install chromium
"""
import os
from pathlib import Path
from playwright.sync_api import sync_playwright

BASE_URL    = "https://oas.kojinius.jp"
ADMIN_EMAIL = os.environ.get("ADMIN_EMAIL", "")
ADMIN_PASS  = os.environ.get("ADMIN_PASS",  "")

OUT_DIR = Path(__file__).parent / "screenshots"
OUT_DIR.mkdir(exist_ok=True)

VIEWPORT = {"width": 1280, "height": 800}


def shot(page, name, wait_ms=1200):
    """スクリーンショットを撮影して保存する"""
    page.wait_for_timeout(wait_ms)
    path = str(OUT_DIR / f"{name}.png")
    page.screenshot(path=path, full_page=False)
    print(f"  撮影: {name}.png")


def wait_for_react(page, timeout=10000):
    """React の初期レンダリング完了を待つ（Firebase リアルタイムリスナー対策で networkidle は使わない）"""
    page.wait_for_load_state("domcontentloaded", timeout=timeout)
    page.wait_for_timeout(1500)


def run():
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

        # 02 時間枠の選択
        try:
            page.locator("button[data-date]:not([disabled])").first.click(timeout=8000)
            page.wait_for_timeout(800)
            shot(page, "02_time_slots")

            # 空き枠をクリック
            try:
                page.locator("button[data-slot]:not([disabled])").first.click(timeout=5000)
                page.wait_for_timeout(600)
                shot(page, "02b_slot_selected")
            except Exception:
                pass
        except Exception as e:
            print(f"  スキップ(02): {e}")

        # 03 情報入力フォーム（Step 2）
        try:
            page.locator("button").filter(has_text="次へ").first.click(timeout=5000)
            wait_for_react(page)
            shot(page, "03_form_step2")

            # フォーム入力（ダミーデータ）
            try:
                page.get_by_label("お名前", exact=True).fill("山田 太郎")
                page.get_by_label("ふりがな", exact=True).fill("やまだ たろう")
                page.get_by_label("電話番号", exact=True).fill("090-1234-5678")
                page.wait_for_timeout(400)
                shot(page, "03b_form_filled")
            except Exception:
                pass

            # 確認ページへ
            page.locator("button").filter(has_text="確認へ").first.click(timeout=5000)
            wait_for_react(page)
            shot(page, "05_confirm_step3")
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

        ctx.close()

        # ─────────────────────────────────────────────
        # 患者向けセクション（モバイル）
        # ─────────────────────────────────────────────
        ctx_m = browser.new_context(viewport={"width": 390, "height": 844})
        page_m = ctx_m.new_page()
        page_m.goto(BASE_URL, wait_until="load")
        wait_for_react(page_m)
        shot(page_m, "m01_calendar_mobile")
        ctx_m.close()

        if not ADMIN_EMAIL:
            print("  ⚠ ADMIN_EMAIL が未設定のため管理者スクリーンショットをスキップ")
            browser.close()
            return

        # ─────────────────────────────────────────────
        # 管理者セクション
        # ─────────────────────────────────────────────
        ctx_a = browser.new_context(viewport=VIEWPORT)
        page_a = ctx_a.new_page()

        # 08 管理者ログイン画面
        page_a.goto(f"{BASE_URL}/login", wait_until="load")
        wait_for_react(page_a)
        shot(page_a, "08_login_page")

        # ログイン実行
        page_a.get_by_label("メールアドレス", exact=True).fill(ADMIN_EMAIL)
        page_a.get_by_label("パスワード", exact=True).fill(ADMIN_PASS)
        page_a.get_by_role("button", name="ログイン").click()
        page_a.wait_for_url(f"{BASE_URL}/admin**", timeout=20000)
        wait_for_react(page_a)

        # 09 予約ダッシュボード
        shot(page_a, "09_dashboard")

        # 10 予約詳細モーダル
        try:
            page_a.locator("table tbody tr").first.click(timeout=5000)
            page_a.wait_for_selector("[role='dialog']", timeout=4000)
            shot(page_a, "10_reservation_detail_modal")
            page_a.keyboard.press("Escape")
            page_a.wait_for_timeout(400)
        except Exception as e:
            print(f"  スキップ(10): {e}")

        # 設定画面（各タブ）
        page_a.goto(f"{BASE_URL}/admin/settings", wait_until="load")
        wait_for_react(page_a)

        settings_tabs = [
            ("基本情報",   "11_settings_clinic_info"),
            ("営業時間",   "12_settings_business_hours"),
            ("休日",       "13_settings_holidays"),
            ("お知らせ",   "14_settings_announcement"),
            ("アカウント", "15_settings_account"),
        ]
        for tab_name, filename in settings_tabs:
            try:
                page_a.get_by_role("button", name=tab_name, exact=True).click(timeout=5000)
                page_a.wait_for_timeout(600)
                shot(page_a, filename)
            except Exception as e:
                print(f"  スキップ({filename}): {e}")

        # 16 パスワード変更画面
        try:
            page_a.goto(f"{BASE_URL}/admin/change-password", wait_until="load")
            wait_for_react(page_a)
            shot(page_a, "16_change_password")
        except Exception as e:
            print(f"  スキップ(16): {e}")

        ctx_a.close()
        browser.close()

    print(f"\n完了！ {OUT_DIR} に保存されました。")


if __name__ == "__main__":
    run()
