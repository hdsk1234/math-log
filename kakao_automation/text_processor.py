"""text_processor.py
카카오톡 대화 내용에서 특정 일자(어제 하루치 + 오늘 00:00 메시지)를 정제하고 검증하는 순수 함수 모듈.
"""

import re
import logging
from datetime import date, timedelta
from typing import Sequence
from pathlib import Path

logger = logging.getLogger(__name__)


# 한국어 요일 명칭 매핑 (Python weekday(): 0=월요일, 6=일요일)
KOREAN_WEEKDAYS: Sequence[str] = (
    "월요일",
    "화요일",
    "수요일",
    "목요일",
    "금요일",
    "토요일",
    "일요일",
)

# 카카오톡 메시지 시작 타임스탬프 정규식 (예: "오전 12:00", "오후 11:59")
TIME_PREFIX_REGEX = re.compile(r"^(오전|오후)\s+(\d{1,2}):(\d{2})")


def format_date_marker(target_date: date) -> str:
    """주어진 날짜를 카카오톡 날짜 구분선 형식으로 변환합니다.

    형식: 'YYYY년 M월 D일 요일' (예: '2026년 9월 25일 금요일')

    Args:
        target_date: 변환할 date 객체.

    Returns:
        카카오톡 구분자 문자열.
    """
    weekday_str = KOREAN_WEEKDAYS[target_date.weekday()]
    return f"{target_date.year}년 {target_date.month}월 {target_date.day}일 {weekday_str}"


def get_calendar_grid_position(target_date: date, week_start: str = "SUN") -> tuple[int, int]:
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
    return row, col



def clean_daily_messages(raw_text: str, today: date | None = None) -> str:
    """복사된 카카오톡 전체 텍스트에서 '어제 하루치'와 '오늘 오전 12:00' 메시지만 정제하여 반환합니다.

    규칙:
    1. 어제 날짜 구분자 이전 내용은 모두 제거.
    2. 어제 날짜 구분자부터 오늘 날짜 구분자 직전까지의 모든 어제 메시지 포함.
    3. 오늘 날짜 구분자 포함.
    4. 오늘 날짜 구분자 직후의 '오전 12:00' 연속 메시지 포함.
    5. 오늘 날짜 구분자 이후 첫 번째로 '오전 12:00'이 아닌 시간대의 메시지가 등장하면 즉시 수집 중단 및 이후 제거.
    6. 만약 오늘 날짜 구분자가 발견되지 않으면 끝까지 어제 데이터로 간주 (fallback).
    7. 어제 날짜 구분자가 없으면 예외 발생 및 debug 파일로 저장.

    Args:
        raw_text: 클립보드에서 가져온 원본 대화 텍스트.
        today: 오늘 기준 날짜 (기본값: 오늘 날짜).

    Returns:
        정제된 대화 텍스트 문자열.

    Raises:
        ValueError: 어제 날짜 구분자를 찾지 못했을 때.
    """
    if today is None:
        today = date.today()
    yesterday = today - timedelta(days=1)

    yesterday_marker = format_date_marker(yesterday)
    today_marker = format_date_marker(today)

    logger.debug(f"정제 기준 어제 마커: {yesterday_marker}")
    logger.debug(f"정제 기준 오늘 마커: {today_marker}")

    # 1. 어제 날짜 구분자 탐색
    if yesterday_marker not in raw_text:
        debug_dir = Path(__file__).resolve().parent / "debug"
        debug_dir.mkdir(parents=True, exist_ok=True)
        debug_path = debug_dir / "error_no_yesterday_marker.txt"
        try:
            debug_path.write_text(raw_text, encoding="utf-8")
        except Exception:
            pass
        error_msg = (
            f"클립보드 내용에서 어제 날짜 구분자('{yesterday_marker}')를 찾을 수 없습니다. "
            f"원본 데이터를 {debug_path} 에 저장했습니다."
        )
        logger.error(error_msg)
        raise ValueError(error_msg)

    # 어제 날짜 구분자 시작 위치부터 슬라이싱
    yesterday_start_idx = raw_text.index(yesterday_marker)
    trimmed_from_yesterday = raw_text[yesterday_start_idx:]

    # 2. 오늘 날짜 구분자 탐색
    if today_marker not in trimmed_from_yesterday:
        logger.warning(
            f"오늘 날짜 구분자('{today_marker}')를 찾지 못했습니다. "
            f"어제 날짜 구분자 이후 전체를 어제 데이터로 간주합니다 (Fallback)."
        )
        return trimmed_from_yesterday.strip()

    # 오늘 날짜 구분자 위치 분할
    today_start_idx = trimmed_from_yesterday.index(today_marker)
    yesterday_block = trimmed_from_yesterday[:today_start_idx]
    today_raw_block = trimmed_from_yesterday[today_start_idx:]

    # 3. 오늘 날짜 블록에서 오늘 마커 및 '오전 12:00' 메시지 필터링
    today_lines = today_raw_block.splitlines()
    preserved_today_lines: list[str] = []

    # 첫 줄은 반드시 오늘 날짜 마커
    preserved_today_lines.append(today_lines[0])

    in_midnight_scope = True
    for line in today_lines[1:]:
        stripped_line = line.strip()
        if not stripped_line:
            # 빈 줄은 컨텍스트 유지를 위해 포함
            preserved_today_lines.append(line)
            continue

        time_match = TIME_PREFIX_REGEX.match(stripped_line)
        if time_match:
            period = time_match.group(1)
            hour = int(time_match.group(2))
            minute = int(time_match.group(3))

            # "오전 12:00" 인지 체크 (카카오톡의 00:00 표기는 "오전 12:00")
            if period == "오전" and hour == 12 and minute == 0:
                preserved_today_lines.append(line)
            else:
                # 00:00이 아닌 첫 메시지 발견 시 즉시 수집 중단
                logger.debug(f"00:00 이후 첫 메시지 감지, 수집 중단: {stripped_line}")
                in_midnight_scope = False
                break
        else:
            # 타임스탬프가 없는 줄: 이전 메시지의 줄바꿈 내용(multiline)
            if in_midnight_scope:
                preserved_today_lines.append(line)
            else:
                break

    filtered_today_block = "\n".join(preserved_today_lines)
    result = (yesterday_block + filtered_today_block).strip()
    return result


def validate_cleaned_text(text: str, yesterday: date) -> bool:
    """정제된 텍스트가 유효한지 검증합니다.

    Args:
        text: 검증할 정제된 텍스트.
        yesterday: 어제 날짜.

    Returns:
        유효하면 True, 그렇지 않으면 False.
    """
    if not text or not text.strip():
        logger.error("검증 실패: 정제된 텍스트가 비어 있습니다.")
        return False

    yesterday_marker = format_date_marker(yesterday)
    if yesterday_marker not in text:
        logger.error(f"검증 실패: 텍스트 내에 어제 날짜 구분자('{yesterday_marker}')가 없습니다.")
        return False

    return True
