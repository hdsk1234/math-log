"""kakao.py
macOS 카카오톡 창 활성화, 달력 날짜 계산 및 클릭, 메시지 드래그 복사 자동화 모듈.
"""

import logging
import subprocess
import time
from datetime import date
import pyautogui
import pyperclip
import Quartz

from config import (
    KAKAO_APP_NAME,

    KAKAO_BUNDLE_ID,
    ALIGN_WINDOW_TO_LEFT,
    ALIGN_WINDOW_HOTKEY,
    ALIGN_WAIT,
    SEARCH_CHATROOM_NAME,
    SEARCH_HOTKEY,
    SEARCH_FIRST_RESULT_COORDS,
    SEARCH_BAR_CLICK_COORDS,
    CHAT_OPEN_WAIT,
    PRELOAD_SCROLL_POINT,
    PRELOAD_SCROLL_COUNT,
    PRELOAD_SCROLL_WAIT,
    CHAT_SEARCH_BUTTON,
    KAKAO_CALENDAR_BUTTON,




    PREVIOUS_MONTH_BUTTON,
    CALENDAR_ORIGIN_X,
    CALENDAR_ORIGIN_Y,
    CALENDAR_CELL_WIDTH,
    CALENDAR_CELL_HEIGHT,
    CALENDAR_WEEK_START,
    MESSAGE_START_X,
    MESSAGE_START_Y,
    MESSAGE_SELECTION_BOTTOM_X,
    MESSAGE_SELECTION_BOTTOM_Y,
    ACTIVATE_WAIT,
    CALENDAR_OPEN_WAIT,
    CLICK_WAIT,
    DRAG_DURATION,

    AUTO_SCROLL_PAUSE,
    COPY_WAIT,
    DEBUG_MODE,
)
from clipboard_utils import save_debug_screenshot
import pyperclip
from text_processor import get_calendar_grid_position

logger = logging.getLogger(__name__)


def align_kakao_window_to_left() -> None:
    """macOS 네이티브 AppleScript 및 키 시퀀스를 통해 Control + Option + Left Arrow 단축키를 확실하게 전송합니다."""
    logger.info("카카오톡 창 화면 왼쪽 절반 배치 단축키 전송 (Control + Option + Left Arrow)...")

    # 1. macOS System Events 네이티브 key code 123 (Left Arrow) 전송 (가장 확실함)
    script = '''
    tell application "System Events"
        key code 123 using {control down, option down}
    end tell
    '''
    try:
        res = subprocess.run(["osascript", "-e", script], capture_output=True, text=True, check=False)
        if res.returncode == 0:
            logger.info("AppleScript를 통한 왼쪽 배치 단축키 전송 성공.")
            time.sleep(ALIGN_WAIT)
            return
        logger.warning(f"AppleScript 단축키 실패: {res.stderr.strip()}, PyAutoGUI로 재시도합니다.")
    except Exception as e:
        logger.warning(f"AppleScript 실행 예외: {e}")

    # 2. PyAutoGUI 명시적 keyDown/keyUp 시퀀스 fallback
    try:
        pyautogui.keyDown("ctrl")
        pyautogui.keyDown("alt")
        time.sleep(0.05)
        pyautogui.press("left")
        time.sleep(0.05)
        pyautogui.keyUp("alt")
        pyautogui.keyUp("ctrl")
        logger.info("PyAutoGUI 키보드 시퀀스 전송 완료.")
    except Exception as ex:
        logger.error(f"PyAutoGUI 단축키 전송 실패: {ex}")

    time.sleep(ALIGN_WAIT)


def activate_kakao() -> bool:
    """카카오톡을 활성화하고 지정된 오픈채팅방을 검색해 연 뒤 화면 왼쪽 절반에 고정합니다.

    실행 순서:
    1. 카톡 활성화
    2. cmd + f 단축키 입력 (검색창 열기)
    3. '오르카 관리톡방' 검색 (한글 클립보드 복사 후 Cmd+V 붙여넣기 및 엔터)
    4. 최상단에 뜨는 톡방 클릭 후 엔터 (SEARCH_FIRST_RESULT_COORDS)
    5. 창 왼쪽 절반 고정 (Control + Option + Left Arrow)
    """


    # ----------------------------------------------------
    # 1. 카톡 활성화
    # ----------------------------------------------------
    logger.info(f"[1단계] 카카오톡({KAKAO_APP_NAME}) 앱 활성화 시도...")
    activated = False
    for cmd in [
        ["open", "-b", KAKAO_BUNDLE_ID],
        ["open", "-a", KAKAO_APP_NAME],
        ["open", "-a", "카카오톡"],
        ["osascript", "-e", f'tell application "{KAKAO_APP_NAME}" to activate'],
        ["osascript", "-e", 'tell application "카카오톡" to activate'],
    ]:
        try:
            res = subprocess.run(cmd, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, check=False)
            if res.returncode == 0:
                activated = True
                break
        except Exception:
            continue

    if not activated:
        logger.warning("카카오톡 앱 활성화 명령 실패 경고 (계속 진행합니다).")

    time.sleep(ACTIVATE_WAIT)

    # ----------------------------------------------------
    # 1.5. 카카오톡 메인 창 화면 왼쪽 절반 고정
    # ----------------------------------------------------
    logger.info("[1.5단계] 카카오톡 메인 창 화면 왼쪽 절반으로 배치 (Control + Option + Left)...")
    align_kakao_window_to_left()

    # ----------------------------------------------------
    # 2. cmd + f 입력 (또는 검색창 직접 클릭)
    # ----------------------------------------------------

    if SEARCH_BAR_CLICK_COORDS:
        bx, by = SEARCH_BAR_CLICK_COORDS
        logger.info(f"[2단계] 검색창 직접 클릭: ({bx}, {by})")
        pyautogui.click(bx, by)
        time.sleep(0.4)
    else:
        logger.info("[2단계] 채팅방 검색 단축키 (Cmd + F) 입력 시도...")
        # 1. macOS System Events 네이티브 AppleScript로 Cmd+F 전송 (가장 확실함)
        cmd_f_script = '''
        tell application "System Events"
            keystroke "f" using {command down}
        end tell
        '''
        sent_apple_script = False
        try:
            res = subprocess.run(["osascript", "-e", cmd_f_script], capture_output=True, text=True, check=False)
            if res.returncode == 0:
                sent_apple_script = True
                logger.info("AppleScript를 통한 Cmd + F 전송 완료.")
        except Exception as e:
            logger.warning(f"AppleScript Cmd+F 실행 오류: {e}")

        # 2. PyAutoGUI keyDown/keyUp 시퀀스 fallback
        if not sent_apple_script:
            try:
                pyautogui.keyDown("command")
                time.sleep(0.05)
                pyautogui.press("f")
                time.sleep(0.05)
                pyautogui.keyUp("command")
                logger.info("PyAutoGUI를 통한 Cmd + F 키 전송 완료.")
            except Exception as ex:
                logger.error(f"PyAutoGUI Cmd+F 실패: {ex}")

        time.sleep(0.5)


    # ----------------------------------------------------
    # 3. '오르카 관리톡방' 검색 (한글 클립보드 붙여넣기)
    # ----------------------------------------------------
    logger.info(f"[3단계] 검색어 입력: '{SEARCH_CHATROOM_NAME}'")
    pyperclip.copy(SEARCH_CHATROOM_NAME)
    time.sleep(0.1)
    pyautogui.hotkey("command", "v")
    time.sleep(0.3)
    pyautogui.press("enter")
    time.sleep(0.8)  # 검색 결과 로딩 대기

    if DEBUG_MODE:
        save_debug_screenshot("kakao_search_results")

    # ----------------------------------------------------
    # 4. 최상단에 뜨는 톡방 클릭 후 엔터
    # ----------------------------------------------------
    rx, ry = SEARCH_FIRST_RESULT_COORDS
    logger.info(f"[4단계] 검색 결과 최상단 톡방 클릭 후 엔터: ({rx}, {ry})")

    # 마우스 이동 후 1회 클릭 및 엔터 키 전송
    pyautogui.moveTo(rx, ry)
    time.sleep(0.2)
    pyautogui.click(rx, ry)
    time.sleep(0.3)
    pyautogui.press("enter")
    time.sleep(CHAT_OPEN_WAIT)  # 새 채팅방 창이 뜰 때까지 대기


    # ----------------------------------------------------
    # 5. 창 왼쪽 절반 고정
    # ----------------------------------------------------
    logger.info("[5단계] 열린 채팅방 창을 화면 왼쪽 절반으로 고정...")
    if ALIGN_WINDOW_TO_LEFT:
        align_kakao_window_to_left()

    if DEBUG_MODE:
        save_debug_screenshot("kakao_chatroom_opened_left")

    logger.info("카카오톡 오픈채팅방 진입 및 왼쪽 절반 배치 완료.")
    return True


def quartz_scroll_up(
    x: int,
    y: int,
    delta_y: int = -300,
) -> None:
    """
    KakaoTalk 채팅 영역에서 Quartz Pixel 단위로 위쪽 스크롤 이벤트 1회를 전송한다.

    주의:
    - x, y는 이미 검증된 채팅 영역 좌표
    - PyAutoGUI scroll()은 사용하지 않는다.
    - 마우스 드래그도 사용하지 않는다.
    """

    # ① 반드시 채팅 영역 위로 마우스를 이동
    pyautogui.moveTo(x, y, duration=0.05)

    # macOS가 마우스 위치를 반영할 시간
    time.sleep(0.05)

    # ② Quartz Pixel 단위 스크롤
    scroll_event = Quartz.CGEventCreateScrollWheelEvent(
        None,
        Quartz.kCGScrollEventUnitPixel,
        1,
        delta_y,
    )

    Quartz.CGEventPost(
        Quartz.kCGHIDEventTap,
        scroll_event,
    )


def preload_chat_messages() -> None:
    """
    카카오톡 채팅 영역을 위쪽으로 반복 스크롤하여
    과거 대화를 충분히 로딩한다.

    흐름:
        ① 채팅 영역으로 마우스 이동
        ② Quartz 스크롤
        ③ 잠시 대기
        ④ 다시 Quartz 스크롤
        ⑤ PRELOAD_SCROLL_COUNT만큼 반복
        ⑥ 최종 로딩 대기
        ⑦ 메시지 선택 단계로 반환

    주의:
    - 기존 메시지 선택용 native_mac_drag()와 완전히 분리
    - preload 단계에서는 절대로 마우스 드래그하지 않음
    - pyautogui.scroll()도 사용하지 않음
    """

    px, py = PRELOAD_SCROLL_POINT

    logger.info(
        "[PRELOAD] 과거 대화 로딩 시작: "
        "좌표=(%d, %d), 횟수=%d, deltaY=-300",
        px,
        py,
        PRELOAD_SCROLL_COUNT,
    )

    # --------------------------------------------------
    # ① 채팅 영역에 마우스 이동
    # --------------------------------------------------

    pyautogui.moveTo(
        px,
        py,
        duration=0.1,
    )

    time.sleep(0.2)

    # --------------------------------------------------
    # ② ~ ⑤ Quartz 스크롤 반복
    # --------------------------------------------------

    for i in range(PRELOAD_SCROLL_COUNT):

        try:
            # 매번 채팅 영역을 다시 확실하게 지정
            pyautogui.moveTo(
                px,
                py,
                duration=0.03,
            )

            # Quartz 스크롤
            quartz_scroll_up(
                x=px,
                y=py,
                delta_y=-300,
            )

            logger.debug(
                "[PRELOAD] Quartz scroll %d/%d",
                i + 1,
                PRELOAD_SCROLL_COUNT,
            )

            # ③ 다음 이벤트 전 잠깐 대기
            time.sleep(0.08)

        except Exception as e:
            logger.warning(
                "[PRELOAD] Quartz scroll 실패 "
                "(%d/%d): %s",
                i + 1,
                PRELOAD_SCROLL_COUNT,
                e,
            )

            # 이벤트 하나가 실패해도 전체 자동화를 중단하지 않음
            time.sleep(0.2)

    # --------------------------------------------------
    # ⑥ 충분히 로딩될 때까지 대기
    # --------------------------------------------------

    logger.info(
        "[PRELOAD] 스크롤 종료. "
        "%.2f초 동안 채팅 로딩 대기...",
        PRELOAD_SCROLL_WAIT,
    )

    time.sleep(PRELOAD_SCROLL_WAIT)

    # 마지막에도 마우스는 채팅 영역에 위치
    pyautogui.moveTo(
        px,
        py,
        duration=0.05,
    )

    logger.info("[PRELOAD] 과거 대화 로딩 완료")


def open_calendar() -> None:
    """과거 대화를 preload한 뒤 검색/달력 UI를 연다."""

    # 1. 과거 대화 preload
    preload_chat_messages()

    # 2. 채팅방 상단 검색 버튼 클릭
    if CHAT_SEARCH_BUTTON:
        sx, sy = CHAT_SEARCH_BUTTON

        logger.info(
            f"채팅방 상단 검색 버튼 클릭: ({sx}, {sy})"
        )

        pyautogui.click(sx, sy)
        time.sleep(0.5)

    # 3. 날짜 이동(달력) 버튼 클릭
    cx, cy = KAKAO_CALENDAR_BUTTON

    logger.info(
        f"달력 열기 버튼 클릭: "
        f"({cx}, {cy}) -> {CALENDAR_OPEN_WAIT}초 대기..."
    )

    pyautogui.click(cx, cy)

    time.sleep(CALENDAR_OPEN_WAIT)

    if DEBUG_MODE:
        save_debug_screenshot("calendar_opened")







def get_calendar_grid_position(target_date: date, week_start: str = CALENDAR_WEEK_START) -> tuple[int, int]:
    """주어진 날짜가 달력 그리드(Row, Col)에서 몇 번째 행과 열에 위치하는지 계산합니다.

    Args:
        target_date: 대상 날짜 (어제).
        week_start: 달력 요일 시작 기준 ("SUN": 일~토, "MON": 월~일).

    Returns:
        (row, col): 0-indexed 행과 열 번호.
    """
    first_day_of_month = target_date.replace(day=1)

    # 1일의 요일 컬럼 위치 계산
    # Python weekday(): 월=0, 화=1, 수=2, 목=3, 금=4, 토=5, 일=6
    if week_start.upper() == "SUN":
        # 일요일 시작인 경우: 일=0, 월=1, ..., 토=6
        first_day_col = (first_day_of_month.weekday() + 1) % 7
    else:
        # 월요일 시작인 경우: 월=0, ..., 일=6
        first_day_col = first_day_of_month.weekday()

    # 1일부터의 누적 셀 오프셋
    cell_index = first_day_col + (target_date.day - 1)
    row = cell_index // 7
    col = cell_index % 7

    logger.debug(
        f"날짜 {target_date} 계산 결과: 1일 요일 컬럼={first_day_col}, "
        f"일자={target_date.day}일 -> 그리드 위치: [행 {row}, 열 {col}]"
    )
    return row, col


def calculate_calendar_cell_coords(row: int, col: int) -> tuple[int, int]:
    """달력 그리드의 행/열 인덱스로부터 화면 클릭 좌표(중심점)를 계산합니다.

    Args:
        row: 달력 행 (0-indexed).
        col: 달력 열 (0-indexed).

    Returns:
        (x, y): 클릭할 화면 좌표.
    """
    click_x = CALENDAR_ORIGIN_X + int(col * CALENDAR_CELL_WIDTH + CALENDAR_CELL_WIDTH / 2)
    click_y = CALENDAR_ORIGIN_Y + int(row * CALENDAR_CELL_HEIGHT + CALENDAR_CELL_HEIGHT / 2)
    return click_x, click_y


def navigate_months_back(today: date, yesterday: date) -> None:
    """오늘과 어제의 연/월이 다를 경우 필요한 만큼 '이전 달 (<)' 버튼을 클릭합니다."""
    month_diff = (today.year - yesterday.year) * 12 + (today.month - yesterday.month)
    if month_diff > 0:
        logger.info(f"월/연도 변경 감지: {month_diff}개월 이전으로 이동합니다.")
        px, py = PREVIOUS_MONTH_BUTTON
        for i in range(month_diff):
            logger.info(f"이전 달 버튼 클릭 ({i + 1}/{month_diff}): ({px}, {py})")
            pyautogui.click(px, py)
            time.sleep(0.5)
        if DEBUG_MODE:
            save_debug_screenshot("navigated_previous_month")


def click_calendar_date(target_date: date) -> tuple[int, int]:
    """어제 날짜의 달력 좌표를 계산하여 클릭합니다.

    Args:
        target_date: 클릭할 대상 날짜 (어제).

    Returns:
        클릭한 (x, y) 좌표.
    """
    row, col = get_calendar_grid_position(target_date)
    x, y = calculate_calendar_cell_coords(row, col)

    logger.info(f"달력에서 날짜 클릭 ({target_date}): [행 {row}, 열 {col}] -> 좌표 ({x}, {y})")
    pyautogui.click(x, y)
    time.sleep(CLICK_WAIT)

    if DEBUG_MODE:
        save_debug_screenshot("date_clicked")
    return x, y


def native_mac_drag(start_x: int, start_y: int, end_x: int, end_y: int, duration: float, pause_time: float) -> None:
    """macOS Quartz CGEvents를 사용하여 kCGEventLeftMouseDragged 이벤트로 드래그 및 오토스크롤을 수행합니다."""
    try:
        import Quartz

        logger.info(f"Quartz 네이티브 마우스 다운: ({start_x}, {start_y})")
        down_event = Quartz.CGEventCreateMouseEvent(
            None, Quartz.kCGEventLeftMouseDown, (start_x, start_y), Quartz.kCGMouseButtonLeft
        )
        Quartz.CGEventPost(Quartz.kCGHIDEventTap, down_event)
        time.sleep(0.05)

        logger.info(f"끝 좌표({end_x}, {end_y})까지 {duration}초 동안 Dragged 이벤트 전송...")
        steps = max(20, int(duration * 60))
        for i in range(1, steps + 1):
            curr_x = start_x + (end_x - start_x) * (i / steps)
            curr_y = start_y + (end_y - start_y) * (i / steps)
            drag_event = Quartz.CGEventCreateMouseEvent(
                None, Quartz.kCGEventLeftMouseDragged, (curr_x, curr_y), Quartz.kCGMouseButtonLeft
            )
            Quartz.CGEventPost(Quartz.kCGHIDEventTap, drag_event)
            time.sleep(duration / steps)

        logger.info(f"끝 좌표에서 마우스를 누른 채 자동 스크롤 대기 ({pause_time}초)...")
        time.sleep(pause_time)

        logger.info("마우스 업 (드래그 종료)")
        up_event = Quartz.CGEventCreateMouseEvent(
            None, Quartz.kCGEventLeftMouseUp, (end_x, end_y), Quartz.kCGMouseButtonLeft
        )
        Quartz.CGEventPost(Quartz.kCGHIDEventTap, up_event)
        time.sleep(0.2)
        return
    except Exception as e:
        logger.warning(f"Quartz 드래그 실패 ({e}), PyAutoGUI dragTo로 대체합니다.")

    # PyAutoGUI Fallback
    try:
        pyautogui.moveTo(start_x, start_y)
        pyautogui.dragTo(end_x, end_y, duration=duration, button="left", mouseDownUp=False)
        time.sleep(pause_time)
    finally:
        pyautogui.mouseUp()
        time.sleep(0.2)


def drag_and_copy_messages() -> None:
    """어제 첫 메시지 위치부터 최신 메시지(하단)까지 마우스로 드래그 선택한 뒤 Cmd+C를 누릅니다."""
    logger.info(f"메시지 드래그 시작 좌표로 이동: ({MESSAGE_START_X}, {MESSAGE_START_Y})")
    pyautogui.moveTo(MESSAGE_START_X, MESSAGE_START_Y)
    time.sleep(0.2)

    # 채팅 영역 포커스 확보를 위해 1회 클릭
    logger.info("채팅방 포커스 확보를 위해 시작 좌표 클릭...")
    pyautogui.click(MESSAGE_START_X, MESSAGE_START_Y)
    time.sleep(0.3)

    # 네이티브 마우스 드래그 및 오토스크롤 실행
    native_mac_drag(
        start_x=MESSAGE_START_X,
        start_y=MESSAGE_START_Y,
        end_x=MESSAGE_SELECTION_BOTTOM_X,
        end_y=MESSAGE_SELECTION_BOTTOM_Y,
        duration=DRAG_DURATION,
        pause_time=AUTO_SCROLL_PAUSE,
    )

    if DEBUG_MODE:
        save_debug_screenshot("drag_completed")

    logger.info("Cmd+C (복사) 키 전송...")
    pyautogui.hotkey("command", "c")
    time.sleep(COPY_WAIT)

