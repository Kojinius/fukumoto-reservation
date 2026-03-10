"""
OAS スクリーンショット撮影スクリプト
実行: PYTHONUTF8=1 python documents/capture_screenshots.py
"""
import os
import time
from pathlib import Path
from playwright.sync_api import sync_playwright

BASE_URL   = "https://oas.kojinius.jp"
ADMIN_EMAIL = os.environ.get("ADMIN_EMAIL", "admin@kojinius.jp")
ADMIN_PASS  = os.environ.get("ADMIN_PASSWORD", "password123")
OUT_DIR     = Path(__file__).parent / "screenshots"
OUT_DIR.mkdir(exist_ok=True)

def shot(page, name):
    path = str(OUT_DIR / f"{name}.png")
    page.screenshot(path=path, full_page=False)
    print(f"  撮影: {name}.png")

def run():
    with sync_playwright() as pw:
        browser = pw.chromium.launch(headless=True)

        # ── 患者向け（デスクトップ） ──
        ctx = browser.new_context(viewport={"width": 1280, "height": 800})
        page = ctx.new_page()

        # 01 カレンダートップ
        page.goto(BASE_URL, wait_until="load")
        shot(page, "01_calendar_top")

        # 02 時間枠選択
        try:
            page.wait_for_selector(".cal-cell:not(.disabled):not(.empty)", timeout=8000)
            page.locator(".cal-cell:not(.disabled):not(.empty)").first.click()
            page.wait_for_selector(".time-slot", timeout=8000)
            shot(page, "02_time_slots")
            page.locator(".time-slot:not(.booked):not(.past)").first.click()
            page.wait_for_timeout(600)
            shot(page, "02b_slot_selected")
        except Exception as e:
            print(f"  スキップ(02): {e}")

        # 03 予約フォーム Step2
        try:
            page.wait_for_selector("#nextBtnWrap button", timeout=5000)
            page.evaluate("goToStep2()")
            page.wait_for_timeout(800)
            shot(page, "03_form_step2")
        except Exception as e:
            print(f"  スキップ(03): {e}")

        # 06 キャンセルページ
        page.goto(f"{BASE_URL}/cancel.html", wait_until="load")
        shot(page, "06_cancel_page")

        # 07 プライバシーポリシー
        page.goto(f"{BASE_URL}/privacy.html", wait_until="load")
        shot(page, "07_privacy_policy")

        ctx.close()

        # ── モバイル ──
        ctx_m = browser.new_context(viewport={"width": 390, "height": 844})
        page_m = ctx_m.new_page()
        page_m.goto(BASE_URL, wait_until="load")
        shot(page_m, "m01_calendar_mobile")
        ctx_m.close()

        # ── 管理者向け ──
        ctx_a = browser.new_context(viewport={"width": 1280, "height": 800})
        page_a = ctx_a.new_page()

        # 08 ログイン画面
        page_a.goto(f"{BASE_URL}/login.html", wait_until="load")
        shot(page_a, "08_login_page")

        # ログイン実行
        page_a.fill("input[type='email'], input[name='email']", ADMIN_EMAIL)
        page_a.fill("input[type='password']", ADMIN_PASS)
        page_a.locator("#loginBtn").click()
        page_a.wait_for_url("**/admin.html", timeout=15000)

        # 09 ダッシュボード
        page_a.wait_for_selector(".reservation-table, table, .dashboard", timeout=10000)
        shot(page_a, "09_dashboard")
        page_a.evaluate("window.scrollTo(0, document.body.scrollHeight)")
        page_a.wait_for_timeout(500)
        shot(page_a, "09_dashboard_full")
        page_a.evaluate("window.scrollTo(0, 0)")

        # 10 予約詳細モーダル
        try:
            page_a.locator("tr[data-id], .reservation-row, tbody tr").first.click()
            page_a.wait_for_selector(".modal, [class*='modal']", timeout=5000)
            shot(page_a, "10_reservation_detail_modal")
            page_a.evaluate("closeModal('detailModal')") if page_a.locator("#detailModal").count() else page_a.keyboard.press("Escape")
            page_a.wait_for_timeout(300)
        except Exception as e:
            print(f"  スキップ(10): {e}")

        # 11〜16 設定モーダル各タブ
        settings_tabs = [
            ("院内情報",         "11_settings_clinic_info"),
            ("営業時間",         "12_settings_business_hours"),
            ("休日設定",         "13_settings_holidays"),
            ("お知らせ",         "14_settings_announcement"),
            ("アカウント設定",   "15_settings_account"),
            ("ユーザー管理",     "16_settings_user_mgmt"),
        ]
        try:
            page_a.evaluate("openSettings()")
            page_a.wait_for_selector("#settingsModal", timeout=5000)
            page_a.wait_for_timeout(500)
            for tab_text, name in settings_tabs:
                try:
                    page_a.locator(f"button.settings-tab:has-text('{tab_text}')").click()
                    page_a.wait_for_timeout(500)
                    shot(page_a, name)
                except Exception as e:
                    print(f"  スキップ({name}): {e}")
            page_a.keyboard.press("Escape")
            page_a.wait_for_timeout(300)
        except Exception as e:
            print(f"  スキップ(設定モーダル): {e}")

        # 16 ユーザー管理タブ
        try:
            page_a.locator("button:has-text('ユーザー管理'), [data-tab='users'], a:has-text('ユーザー')").first.click()
            page_a.wait_for_timeout(1000)
            shot(page_a, "16_user_management")
        except Exception as e:
            print(f"  スキップ(16): {e}")

        ctx_a.close()
        browser.close()

    print(f"\n完了！ {OUT_DIR} に保存されました。")

if __name__ == "__main__":
    run()
