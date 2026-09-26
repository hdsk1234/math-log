"""clipboard_utils.py
클립보드 읽기/쓰기 및 디버그 파일(텍스트, 스크린샷) 저장 유틸리티.
"""

import logging
from datetime import datetime
from pathlib import Path
import pyperclip
import pyautogui

from config import DEBUG_DIR, SAVE_SCREENSHOT_ON_DEBUG

logger = logging.getLogger(__name__)


def get_clipboard_text() -> str:
    """시스템 클립보드로부터 텍스트를 읽어옵니다.

    Returns:
        클립보드에 저장된 텍스트 문자열.
    """
    try:
        content = pyperclip.paste()
        return content or ""
    except Exception as e:
        logger.error(f"클립보드 읽기 실패: {e}")
        raise RuntimeError(f"클립보드 내용을 가져올 수 없습니다: {e}") from e


def set_clipboard_text(text: str) -> None:
    """시스템 클립보드에 텍스트를 복사합니다.

    Args:
        text: 클립보드에 설정할 텍스트 문자열.
    """
    try:
        pyperclip.copy(text)
        logger.debug(f"클립보드 복사 완료 (길이: {len(text)}자)")
    except Exception as e:
        logger.error(f"클립보드 쓰기 실패: {e}")
        raise RuntimeError(f"클립보드에 텍스트를 복사할 수 없습니다: {e}") from e


def save_debug_clipboard(raw_text: str, filename_prefix: str = "raw_clipboard") -> Path:
    """디버깅 및 문제 분석을 위해 원본 클립보드 텍스트를 debug 폴더에 타임스탬프와 함께 저장합니다.

    Args:
        raw_text: 저장할 원본 텍스트 내용.
        filename_prefix: 파일명 접두사.

    Returns:
        저장된 파일의 Path 객체.
    """
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    file_path = DEBUG_DIR / f"{filename_prefix}_{timestamp}.txt"
    try:
        file_path.write_text(raw_text, encoding="utf-8")
        logger.info(f"디버그 클립보드 저장 완료: {file_path}")
        return file_path
    except Exception as e:
        logger.error(f"디버그 클립보드 파일 저장 실패: {e}")
        raise


def save_debug_screenshot(name_prefix: str = "step") -> Path | None:
    """현재 화면 상태를 debug 디렉토리에 스크린샷으로 저장합니다."""
    if not SAVE_SCREENSHOT_ON_DEBUG:
        return None
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    file_path = DEBUG_DIR / f"{name_prefix}_{timestamp}.png"
    try:
        screenshot = pyautogui.screenshot()
        screenshot.save(file_path)
        logger.info(f"디버그 스크린샷 저장 완료: {file_path}")
        return file_path
    except Exception as e:
        logger.warning(f"스크린샷 저장 중 오류 발생: {e}")
        return None
