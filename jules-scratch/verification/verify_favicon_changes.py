from playwright.sync_api import sync_playwright, expect

def run():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        try:
            # Go to the page
            page.goto("http://localhost:3000", timeout=30000)

            # Wait for the page to be fully loaded
            page.wait_for_load_state('networkidle')

            # Check if the main heading is visible to confirm the page loaded
            heading = page.get_by_role("heading", name="雑談テーマガチャ")
            expect(heading).to_be_visible()

            # Take a screenshot
            page.screenshot(path="jules-scratch/verification/verification.png")
            print("Screenshot taken successfully.")

        except Exception as e:
            print(f"An error occurred: {e}")
            # Try to get more logs from the browser console
            logs = page.evaluate("() => window.console_logs || []")
            print("Browser console logs:", logs)


        finally:
            browser.close()

if __name__ == "__main__":
    run()
