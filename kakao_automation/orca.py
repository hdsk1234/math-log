"""orca.py
Playwright를 이용한 Orca Math Lab 웹페이지 자동화 및 정제 텍스트 붙여넣기 모듈.
"""

import logging
import time
from playwright.sync_api import sync_playwright, TimeoutError as PlaywrightTimeoutError

from config import (
    ORCA_URL,
    ORCA_INPUT_SELECTOR,
    ORCA_SUBMIT_BUTTON_SELECTOR,
    ORCA_HEADLESS,
    PAGE_LOAD_TIMEOUT_MS,
    DEBUG_MODE,
)
from clipboard_utils import set_clipboard_text, save_debug_screenshot

logger = logging.getLogger(__name__)


def paste_to_orca(cleaned_text: str, click_submit: bool = False) -> bool:
    """Orca Math Lab 웹페이지에 접속하여 정제된 대화 텍스트를 Quick 입력 영역에 붙여넣습니다.

    Args:
        cleaned_text: 붙여넣을 정제된 텍스트.
        click_submit: 입력 후 '파싱 실행' 버튼까지 클릭할지 여부.

    Returns:
        성공 시 True.

    Raises:
        RuntimeError: 웹 페이지 접속 또는 엘리먼트 입력 실패 시.
    """
    logger.info(f"Orca 웹 페이지 접속 시작: {ORCA_URL}")

    # 1. 텍스트를 클립보드에 준비
    set_clipboard_text(cleaned_text)

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=ORCA_HEADLESS)
        context = browser.new_context()
        page = context.new_page()

        try:
            # 2. 페이지 접속
            logger.info("페이지 로딩 중...")
            page.goto(ORCA_URL, wait_until="networkidle", timeout=PAGE_LOAD_TIMEOUT_MS)
            time.sleep(1.0)

            # 3. 입력 textarea 탐색
            logger.info(f"입력 엘리먼트 탐색: {ORCA_INPUT_SELECTOR}")
            try:
                textarea = page.wait_for_selector(ORCA_INPUT_SELECTOR, timeout=10000)
            except PlaywrightTimeoutError as te:
                if DEBUG_MODE:
                    save_debug_screenshot("orca_selector_timeout")
                err_msg = (
                    f"Orca 입력 영역({ORCA_INPUT_SELECTOR})을 찾을 수 없습니다. "
                    "로그인이 필요하거나 URL에 권한이 있는지 확인하세요."
                )
                logger.error(err_msg)
                raise RuntimeError(err_msg) from te

            if textarea is None:
                raise RuntimeError("입력 textarea 엘리먼트가 None입니다.")

            # 4. 입력 영역 클릭 및 클립보드 붙여넣기 (Cmd+V)
            logger.info("입력 영역 클릭 및 클립보드 붙여넣기(Cmd+V)...")
            textarea.click()
            time.sleep(0.3)

            # macOS 기준 Meta+V 키 입력
            page.keyboard.press("Meta+v")
            time.sleep(0.5)

            # 만약 Meta+V로 값이 들어가지 않았을 경우를 대비한 fill() 보조 로직
            current_value = textarea.input_value()
            if not current_value.strip():
                logger.warning("Cmd+V 후 입력창이 비어 있어 playwright fill()로 대체 시도합니다.")
                textarea.fill(cleaned_text)
                time.sleep(0.5)

            logger.info("텍스트 입력 완료.")

            # 5. (선택 사항) 파싱 실행 버튼 클릭
            if click_submit and ORCA_SUBMIT_BUTTON_SELECTOR:
                try:
                    submit_btn = page.query_selector(ORCA_SUBMIT_BUTTON_SELECTOR)
                    if submit_btn and submit_btn.is_enabled():
                        logger.info("파싱 실행 버튼 클릭...")
                        submit_btn.click()
                        time.sleep(1.0)
                except Exception as ex:
                    logger.warning(f"파싱 실행 버튼 클릭 중 경고: {ex}")

            if DEBUG_MODE:
                save_debug_screenshot("orca_paste_completed")
                time.sleep(2.0)  # 디버그 확인용 대기

            return True

        except Exception as e:
            logger.error(f"Orca 작업 중 예외 발생: {e}")
            if DEBUG_MODE:
                save_debug_screenshot("orca_error")
            raise
        finally:
            browser.close()
            logger.info("브라우저 종료.")
