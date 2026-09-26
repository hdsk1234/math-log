"""tests/test_text_processor.py
텍스트 정제 로직, 날짜 계산 및 달력 그리드 계산 유닛 테스트.
pytest 및 표준 라이브러리 unittest 모두 지원.
"""

from datetime import date, timedelta
import sys
import unittest
from pathlib import Path

# project 디렉토리를 sys.path에 추가
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from text_processor import (
    clean_daily_messages,
    format_date_marker,
    validate_cleaned_text,
    get_calendar_grid_position,
)



class TestTextProcessor(unittest.TestCase):

    def test_clean_daily_messages_fixture(self):
        """사용자 명세에 주어진 카카오톡 대화 예제 Fixture 검증."""
        raw_input = (
            "오후 11:59 이수아 사진\n"
            "2026년 9월 25일 금요일\n"
            "오전 12:00 이수아 사진 2장\n"
            "오전 5:50 이수민 기상\n"
            "오전 5:51 김상윤 기상\n"
            "오후 11:56 이윤승 사진\n"
            "2026년 9월 26일 토요일\n"
            "오전 12:00 김철수 사진\n"
            "오전 12:00 박영희 사진\n"
            "오전 12:03 김철수 사진\n"
            "오전 12:10 이수아 사진"
        )

        today = date(2026, 9, 26)
        expected_output = (
            "2026년 9월 25일 금요일\n"
            "오전 12:00 이수아 사진 2장\n"
            "오전 5:50 이수민 기상\n"
            "오전 5:51 김상윤 기상\n"
            "오후 11:56 이윤승 사진\n"
            "2026년 9월 26일 토요일\n"
            "오전 12:00 김철수 사진\n"
            "오전 12:00 박영희 사진"
        )

        cleaned = clean_daily_messages(raw_input, today=today)
        self.assertEqual(cleaned, expected_output)

    def test_clean_daily_messages_multiline_support(self):
        """자정 메시지 내에 줄바꿈이 있는 경우도 정상 보존되는지 검증."""
        raw_input = (
            "2026년 9월 25일 금요일\n"
            "오후 11:59 마지막 사진\n"
            "2026년 9월 26일 토요일\n"
            "오전 12:00 김철수 사진\n"
            "두번째 줄 내용입니다\n"
            "오전 12:00 박영희 사진\n"
            "오전 1:00 종료 메시지"
        )
        today = date(2026, 9, 26)
        expected = (
            "2026년 9월 25일 금요일\n"
            "오후 11:59 마지막 사진\n"
            "2026년 9월 26일 토요일\n"
            "오전 12:00 김철수 사진\n"
            "두번째 줄 내용입니다\n"
            "오전 12:00 박영희 사진"
        )
        self.assertEqual(clean_daily_messages(raw_input, today=today), expected)

    def test_clean_daily_messages_no_today_marker_fallback(self):
        """오늘 날짜 구분자가 없는 경우 끝까지 어제 데이터로 취급하는 fallback 검증."""
        raw_input = (
            "2026년 9월 24일 목요일\n"
            "오후 11:00 과거 메시지\n"
            "2026년 9월 25일 금요일\n"
            "오전 12:00 어제 메시지 1\n"
            "오후 10:00 어제 메시지 2"
        )
        today = date(2026, 9, 26)  # 어제=9월 25일
        expected = (
            "2026년 9월 25일 금요일\n"
            "오전 12:00 어제 메시지 1\n"
            "오후 10:00 어제 메시지 2"
        )
        self.assertEqual(clean_daily_messages(raw_input, today=today), expected)

    def test_clean_daily_messages_missing_yesterday_raises(self):
        """어제 날짜 마커가 없는 경우 ValueError 발생 검증."""
        raw_input = "2026년 9월 20일 일요일\n오전 10:00 이전 대화"
        today = date(2026, 9, 26)
        with self.assertRaises(ValueError):
            clean_daily_messages(raw_input, today=today)

    def test_date_calculation_cases(self):
        """월초, 월말, 연초, 연말 등 엣지케이스 날짜 계산 검증."""
        cases = [
            (date(2026, 9, 26), date(2026, 9, 25)),  # 일반적인 하루
            (date(2026, 10, 1), date(2026, 9, 30)),  # 월초 -> 이전 달 말일
            (date(2027, 1, 1), date(2026, 12, 31)),  # 연초 -> 이전 해 말일
            (date(2026, 2, 28), date(2026, 2, 27)),  # 평년 2월
            (date(2028, 3, 1), date(2028, 2, 29)),  # 윤년 3월 1일 -> 2월 29일
        ]
        for today_date, expected_yesterday in cases:
            with self.subTest(today=today_date):
                self.assertEqual(today_date - timedelta(days=1), expected_yesterday)

    def test_calendar_grid_calculation(self):
        """달력 그리드(Row, Col) 계산 검증."""
        # 2026년 9월 1일은 화요일
        # 일요일 시작 기준(SUN): 일(0), 월(1), 화(2), 수(3), 목(4), 금(5), 토(6)
        # 9월 1일: col=2, row=0
        # 9월 25일: offset = 2 + (25 - 1) = 26 -> row=3, col=5 (금요일)
        target = date(2026, 9, 25)
        row, col = get_calendar_grid_position(target, week_start="SUN")
        self.assertEqual(row, 3)
        self.assertEqual(col, 5)


if __name__ == "__main__":
    unittest.main()
