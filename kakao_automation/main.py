"""main.py
카카오톡 대화 수집, 정제 및 Orca Math Lab 연동 전체 자동화 오케스트레이터.
"""

import argparse
from datetime import date, timedelta
import logging
import os
import sys
import time

import config
from clipboard_utils import get_clipboard_text, save_debug_clipboard, save_debug_screenshot
from kakao import (
    activate_kakao,
    preload_chat_messages,
    open_calendar,
    navigate_months_back,
    click_calendar_date,
    drag_and_copy_messages,
    get_calendar_grid_position,
    calculate_calendar_cell_coords,
)
from orca import paste_to_orca
import pyautogui
from text_processor import clean_daily_messages, format_date_marker, validate_cleaned_text

# PyAutoGUI 비상 탈출 활성화: 마우스를 화면 네 모서리(0,0 등)로 이동하면 즉시 FailSafe 예외 발생
pyautogui.FAILSAFE = True

# 로거 설정
logging.basicConfig(
    level=logging.INFO,
    format="[%(asctime)s] [%(levelname)s] %(name)s: %(message)s",
    handlers=[
        logging.StreamHandler(sys.stdout),
        logging.FileHandler(config.DEBUG_DIR / "run.log", encoding="utf-8"),
    ],
)
logger = logging.getLogger("main")


def setup_emergency_kill_switch() -> None:
    """백그라운드에서 키보드 입력을 감시하여 [ESC] 키 입력 시 즉시 강제 종료합니다."""
    try:
        from pynput import keyboard

        def on_press(key):
            try:
                if key == keyboard.Key.esc:
                    print("\n" + "=" * 65)
                    print(f"🛑 [비상 정지] 사용자가 [{config.EMERGENCY_KILL_KEY.upper()}] 키를 눌렀습니다.")
                    print("모든 마우스 버튼을 해제하고 자동화를 즉시 강제 종료합니다.")
                    print("=" * 65)
                    try:
                        pyautogui.mouseUp()
                    except Exception:
                        pass
                    os._exit(0)
            except Exception:
                pass

        listener = keyboard.Listener(on_press=on_press)
        listener.daemon = True
        listener.start()
        logger.info(f"비상 정지 단축키 활성화됨: 진행 중 언제든 [{config.EMERGENCY_KILL_KEY.upper()}] 키를 누르면 강제 종료됩니다.")
    except ImportError:
        logger.warning(
            "pynput 모듈이 설치되지 않아 키보드 단축키 감시가 비활성화되었습니다. "
            "(마우스를 화면 모서리(0,0)로 튕기면 PyAutoGUI FailSafe로 즉시 중단됩니다. "
            "단축키를 사용하려면 'pip install pynput'을 실행하세요.)"
        )
    except Exception as e:
        logger.warning(f"비상 단축키 리스너 등록 중 경고: {e}")


def run_pipeline(dry_run: bool = False) -> None:
    """메인 자동화 파이프라인을 실행합니다."""
    setup_emergency_kill_switch()

    logger.info("=" * 60)
    logger.info("카카오톡 일일 대화 자동 수집 및 Orca 연동 시작")
    logger.info("※ 중단하려면 언제든 [ESC] 키를 누르거나 마우스를 화면 모서리로 튕기세요.")
    logger.info("=" * 60)


    # ----------------------------------------------------
    # STEP 0: 날짜 계산
    # ----------------------------------------------------
    today = date.today()
    yesterday = today - timedelta(days=1)
    logger.info(f"[STEP 0] 날짜 계산: 오늘={today} ({format_date_marker(today)}), 어제={yesterday} ({format_date_marker(yesterday)})")

    # ----------------------------------------------------
    # STEP 1: 카카오톡 활성화 및 왼쪽 절반 배치
    # ----------------------------------------------------
    logger.info("[STEP 1] 카카오톡 창 활성화 및 화면 왼쪽 절반 배치 (Control + Option + Left)")
    try:
        activate_kakao()
    except Exception as e:
        logger.error(f"[STEP 1 실패] 카카오톡 창 활성화 및 배치 실패: {e}")
        save_debug_screenshot("error_step1_activate")
        raise


    # ----------------------------------------------------
    # STEP 2: 과거 대화 상단 스크롤 (Preload)
    # ----------------------------------------------------
    logger.info("[STEP 2] 과거 대화 상단 스크롤 (충분히 로딩)")
    try:
        preload_chat_messages()
    except Exception as e:
        logger.error(f"[STEP 2 실패] 과거 대화 스크롤 로딩 실패: {e}")
        save_debug_screenshot("error_step2_preload")
        raise

    # ----------------------------------------------------
    # STEP 3: 전체 메시지 드래그 및 복사
    # ----------------------------------------------------
    logger.info("[STEP 3] 상단부터 최신 메시지까지 드래그 선택 및 Cmd+C 복사")
    try:
        drag_and_copy_messages()
    except Exception as e:
        logger.error(f"[STEP 3 실패] 메시지 드래그 및 복사 실패: {e}")
        save_debug_screenshot("error_step3_drag_copy")
        raise

    # ----------------------------------------------------
    # STEP 6: 클립보드 텍스트 가져오기
    # ----------------------------------------------------
    logger.info("[STEP 6] 클립보드 내용 읽기")
    raw_text = get_clipboard_text()
    if not raw_text or not raw_text.strip():
        save_debug_screenshot("error_step6_empty_clipboard")
        raise RuntimeError("클립보드가 비어 있습니다. 메시지 복사에 실패했습니다.")

    logger.info(f"복사된 원본 텍스트 길이: {len(raw_text)}자")
    save_debug_clipboard(raw_text, filename_prefix="step6_raw_clipboard")

    # ----------------------------------------------------
    # STEP 7: 텍스트 정제
    # ----------------------------------------------------
    logger.info("[STEP 7] 텍스트 정제 (어제 하루치 + 오늘 00:00 메시지)")
    try:
        cleaned_text = clean_daily_messages(raw_text, today=today)
    except Exception as e:
        logger.error(f"[STEP 7 실패] 텍스트 정제 실패: {e}")
        raise

    # ----------------------------------------------------
    # STEP 8: 검증
    # ----------------------------------------------------
    logger.info("[STEP 8] 정제 결과 유효성 검증")
    if not validate_cleaned_text(cleaned_text, yesterday=yesterday):
        save_debug_clipboard(cleaned_text, filename_prefix="error_invalid_cleaned_text")
        raise ValueError("정제된 텍스트가 유효하지 않습니다.")

    save_debug_clipboard(cleaned_text, filename_prefix="step8_cleaned_text")
    logger.info(f"정제 완료된 텍스트 길이: {len(cleaned_text)}자")

    if dry_run:
        logger.info("[DRY RUN 모드] Orca 웹 전송을 생략하고 종료합니다.")
        print("\n--- [정제된 텍스트 미리보기] ---")
        print(cleaned_text[:500] + ("\n...(생략)..." if len(cleaned_text) > 500 else ""))
        return

    # ----------------------------------------------------
    # STEP 9: Orca 웹페이지 입력
    # ----------------------------------------------------
    logger.info("[STEP 9] Orca Math Lab 웹페이지 입력")
    try:
        paste_to_orca(cleaned_text)
    except Exception as e:
        logger.error(f"[STEP 9 실패] Orca 웹 입력 실패: {e}")
        raise

    logger.info("=" * 60)
    logger.info("모든 작업이 성공적으로 완료되었습니다!")
    logger.info("=" * 60)


def calibrate_mouse() -> None:
    """사용자가 마우스를 움직일 때 실시간으로 현재 좌표를 터미널에 표시합니다."""
    print("=" * 60)
    print("실시간 마우스 좌표 측정 모드 (종료: Ctrl + C)")
    print("카카오톡 창을 왼쪽 절반에 둔 상태에서 버튼 위에 마우스를 올려보세요.")
    print("=" * 60)
    try:
        while True:
            x, y = pyautogui.position()
            position_str = f"현재 마우스 좌표: X={x:4d}, Y={y:4d}"
            print(position_str, end="\r")
            time.sleep(0.1)
    except KeyboardInterrupt:
        print("\n좌표 측정 모드를 종료합니다.")


def main() -> None:
    """CLI 인자 파싱 및 모드별 분기."""
    parser = argparse.ArgumentParser(description="카카오톡 일일 메시지 수집 및 Orca 연동 프로그램")
    parser.add_argument("--dry-run", action="store_true", help="Orca 웹 입력 제외하고 카카오톡 수집/정제까지만 실행")
    parser.add_argument("--debug", action="store_true", help="DEBUG_MODE를 강제로 활성화")
    parser.add_argument("--calibrate", action="store_true", help="실시간 마우스 좌표 측정 도구 실행")
    parser.add_argument("--test-date", action="store_true", help="날짜 계산 및 달력 그리드 좌표 계산 테스트")
    parser.add_argument("--test-clipboard", action="store_true", help="현재 클립보드 텍스트 정제 테스트")
    parser.add_argument("--test-kakao", action="store_true", help="카카오톡 창 활성화 및 달력/드래그 복사 단독 테스트")
    parser.add_argument("--test-orca", action="store_true", help="Orca 웹 접속 및 샘플 텍스트 입력 단독 테스트")

    args = parser.parse_args()

    if args.debug:
        config.DEBUG_MODE = True
        logger.setLevel(logging.DEBUG)

    if args.calibrate:
        calibrate_mouse()
        return

    if args.test_date:
        today = date.today()
        yesterday = today - timedelta(days=1)
        row, col = get_calendar_grid_position(yesterday)
        coords = calculate_calendar_cell_coords(row, col)
        print(f"[TEST DATE]")
        print(f"- 오늘: {today} ({format_date_marker(today)})")
        print(f"- 어제: {yesterday} ({format_date_marker(yesterday)})")
        print(f"- 어제 달력 그리드: 행={row}, 열={col}")
        print(f"- 계산된 클릭 좌표: {coords}")
        return

    if args.test_clipboard:
        text = get_clipboard_text()
        print(f"현재 클립보드 길이: {len(text)}자")
        cleaned = clean_daily_messages(text, today=date.today())
        print("정제 결과:")
        print(cleaned)
        return

    if args.test_kakao:
        setup_emergency_kill_switch()
        logger.info("카카오톡 단독 동작 테스트 실행 (중단: ESC)")
        activate_kakao()
        preload_chat_messages()
        drag_and_copy_messages()
        text = get_clipboard_text()
        print(f"복사된 내용 길이: {len(text)}자")
        if text:
            raw_path = save_debug_clipboard(text, filename_prefix="test_raw_clipboard")
            cleaned = clean_daily_messages(text, today=date.today())
            cleaned_path = save_debug_clipboard(cleaned, filename_prefix="test_cleaned_text")
            print(f"정제된 메시지 길이: {len(cleaned)}자")
            print(f"원본 저장 위치: {raw_path}")
            print(f"정제본 저장 위치: {cleaned_path}")
            print("\n--- [정제된 내용 미리보기] ---")
            print(cleaned[:300] + ("\n...(이하 생략)..." if len(cleaned) > 300 else ""))
        return

    if args.test_orca:
        sample = f"{format_date_marker(date.today() - timedelta(days=1))}\n오전 12:00 테스트 학생 사진\n오전 7:00 테스트 학생 기상"
        logger.info("Orca 웹 단독 테스트 실행 (샘플 데이터 입력)")
        paste_to_orca(sample)
        return

    # 기본 전체 파이프라인 실행
    run_pipeline(dry_run=args.dry_run)


if __name__ == "__main__":
    main()
