"""
Online Appointment System — スクリーンショット一括撮影スクリプト
使い方:
  ADMIN_EMAIL=xxx@kojinius.jp ADMIN_PASSWORD=yourpass PYTHONUTF8=1 python capture_screenshots.py

出力先: documents/screenshots/
"""

import os
import time
from pathlib import Path
from playwright.sync_api import sync_playwright

BASE_URL     = "https://kojinius.jp/apps/OnlineAppointSystem"
ADMIN_EMAIL  = os.environ.get("ADMIN_EMAIL", "")
ADMIN_PASSWORD = os.environ.get("ADMIN_PASSWORD", "")
OUT_DIR      = Path(__file__).parent / "screenshots"
VIEWPORT     = {"width": 1280, "height": 800}
MOBILE_VP    = {"width": 390, "height": 844}   # iPhone 14 相当
WAIT_SEC     = 3.5   # Firebase 非同期ロード待ち（秒）


def wait(page, sec=WAIT_SEC):
    time.sleep(sec)


def shot(page, name, full=False):
    path = OUT_DIR / f"{name}.png"
    page.screenshot(path=str(path), full_page=full)
    print(f"  [撮影] {name}.png")


def main():
    OUT_DIR.mkdir(exist_ok=True)

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        ctx = browser.new_context(viewport=VIEWPORT)
        page = ctx.new_page()

        # ─────────────────────────────────────────
        # 患者側
        # ─────────────────────────────────────────
        print("\n=== 患者側 ===")

        # 01. トップ（カレンダー）
        page.goto(BASE_URL + "/", wait_until="domcontentloaded", timeout=30000)
        wait(page)
        shot(page, "01_calendar_top")

        # 02. 日付をクリックしてスロット表示
        #   翌営業日の日付セルを探してクリック
        try:
            # 最初の .cal-cell:not(.disabled) をクリック
            page.locator(".cal-cell:not(.disabled):not(.empty)").first.click()
            wait(page, 2)
            shot(page, "02_time_slots")
        except Exception as e:
            print(f"  [SKIP] スロット表示失敗: {e}")

        # 03. スロット選択 → 「次へ」ボタン（#nextBtnWrap 内）
        try:
            page.locator("button.time-slot:not([disabled])").first.click()
            wait(page, 1)
            shot(page, "02b_slot_selected")
            page.locator("#nextBtnWrap button").click()
            wait(page, 1.5)
            shot(page, "03_form_step2", full=True)
        except Exception as e:
            print(f"  [SKIP] フォーム遷移失敗: {e}")

        # 04. フォームに入力して確認画面へ
        try:
            page.fill("#name",     "山田 太郎")
            page.fill("#furigana", "やまだ たろう")
            page.fill("#phone",    "090-1234-5678")
            page.fill("#email",    "test@example.com")
            page.fill("#zip",      "8120011")
            wait(page, 1.5)  # zipcloud 自動補完待ち
            shot(page, "04_form_zip_filled")
            page.fill("#addressSub", "101号室")
            page.locator("#consentLabel").click()  # カスタムチェックボックスは label をクリック
            shot(page, "04b_form_filled", full=True)
            # 「確認画面へ」ボタン
            page.locator("button", has_text="確認画面へ").click()
            wait(page, 1.5)
            shot(page, "05_confirm_step3")
        except Exception as e:
            print(f"  [SKIP] フォーム入力失敗: {e}")

        # 06. キャンセルページ
        page.goto(BASE_URL + "/cancel.html", wait_until="domcontentloaded", timeout=20000)
        wait(page)
        shot(page, "06_cancel_page")

        # 07. プライバシーポリシー
        page.goto(BASE_URL + "/privacy-policy.html", wait_until="domcontentloaded", timeout=20000)
        wait(page)
        shot(page, "07_privacy_policy", full=True)

        # ─────────────────────────────────────────
        # 管理者側（要ログイン）
        # ─────────────────────────────────────────
        if not ADMIN_EMAIL or not ADMIN_PASSWORD:
            print("\n=== 管理者側 SKIP（ADMIN_EMAIL / ADMIN_PASSWORD 未設定）===")
            print("  → 環境変数を設定して再実行してください")
            print("  例: ADMIN_EMAIL=admin@kojinius.jp ADMIN_PASSWORD=pass python capture_screenshots.py")
        else:
            print("\n=== 管理者側 ===")

            # 08. ログインページ
            page.goto(BASE_URL + "/login.html", wait_until="domcontentloaded", timeout=20000)
            wait(page)
            shot(page, "08_login_page")

            # ログイン実行
            page.fill("#loginEmail",    ADMIN_EMAIL)
            page.fill("#loginPassword", ADMIN_PASSWORD)
            page.locator("#loginBtn").click()

            # admin.html への遷移を待機（Firebase Auth の非同期処理を考慮）
            try:
                page.wait_for_url("**/admin.html", timeout=30000)
                wait(page, WAIT_SEC)  # Firebase データロード待ち
            except Exception:
                pass

            if "admin.html" not in page.url:
                print("  [ERROR] ログイン失敗。メールアドレス・パスワードを確認してください。")
                print(f"  現在URL: {page.url}")
            else:
                # 09. ダッシュボード
                shot(page, "09_dashboard")
                shot(page, "09_dashboard_full", full=True)

                # 10. 予約詳細モーダル（最初の詳細ボタンをクリック）
                try:
                    page.locator(".btn-detail").first.click()
                    wait(page, 1)
                    shot(page, "10_reservation_detail_modal")
                    # JS で直接クローズ（pointer-events 干渉を回避）
                    page.evaluate("closeModal('detailModal')")
                    wait(page, 1)
                except Exception as e:
                    print(f"  [SKIP] 詳細モーダル失敗: {e}")

                # 11. 設定モーダル（院内情報タブ）
                try:
                    page.evaluate("openSettings()")
                    wait(page, 1.5)
                    shot(page, "11_settings_clinic_info")
                except Exception as e:
                    print(f"  [SKIP] 設定モーダル失敗: {e}")

                # 12〜15. 各設定タブ（JS経由でタブ切り替え）
                for tab_name, shot_name in [
                    ("BusinessHours", "12_settings_business_hours"),
                    ("Holiday",       "13_settings_holidays"),
                    ("Announcement",  "14_settings_announcement"),
                    ("Account",       "15_settings_account"),
                ]:
                    try:
                        page.evaluate(
                            f"switchSettingsTab('{tab_name}', "
                            f"document.querySelector('button.settings-tab[onclick*=\"{tab_name}\"]'))"
                        )
                        wait(page, 0.5)
                        shot(page, shot_name)
                    except Exception as e:
                        print(f"  [SKIP] {shot_name} 失敗: {e}")

                # モーダルを閉じる
                try:
                    page.evaluate("closeModal('settingsModal')")
                except Exception:
                    pass

        # ─────────────────────────────────────────
        # モバイル版（患者側のみ）
        # ─────────────────────────────────────────
        print("\n=== モバイル版（患者側） ===")
        ctx_mobile = browser.new_context(viewport=MOBILE_VP)
        m = ctx_mobile.new_page()

        m.goto(BASE_URL + "/", wait_until="domcontentloaded", timeout=30000)
        wait(m)
        shot(m, "m01_calendar_mobile")

        ctx_mobile.close()
        browser.close()

    print(f"\n完了！ {OUT_DIR} に保存しました。")


if __name__ == "__main__":
    main()
