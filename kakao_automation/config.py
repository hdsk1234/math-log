"""config.py
카카오톡 메시지 자동 수집 및 Orca 연동을 위한 설정 파일.
모든 좌표, 대기 시간, 웹 셀렉터, 디버그 옵션을 중앙에서 관리합니다.
"""

from pathlib import Path

# ==============================================================================
# 1. 실행 및 디버그 설정
# ==============================================================================
# DEBUG_MODE가 True이면 주요 단계별 좌표 출력, 스크린샷 저장, raw 클립보드 저장을 수행합니다.
DEBUG_MODE: bool = True

# 디버그 산출물 저장 디렉토리
BASE_DIR: Path = Path(__file__).resolve().parent
DEBUG_DIR: Path = BASE_DIR / "debug"
DEBUG_DIR.mkdir(parents=True, exist_ok=True)

# 디버그 스크린샷 저장 여부
SAVE_SCREENSHOT_ON_DEBUG: bool = True


# ==============================================================================
# 2. 카카오톡 창 및 기본 앱 설정
# ==============================================================================
# macOS 카카오톡 앱 명칭 및 번들 ID
KAKAO_APP_NAME: str = "카카오톡"
KAKAO_BUNDLE_ID: str = "com.kakao.KakaoTalkMac"

# 카카오톡 창 활성화를 확실히 하기 위한 상단 타이틀바(안전 영역) 클릭 좌표
# (왼쪽 절반에 위치한 카카오톡 오픈채팅방 창의 제목 부근을 클릭하여 OS 포커스를 가져옴)
# TODO: CALIBRATE (기본값: X=200, Y=40)
KAKAO_WINDOW_FOCUS_POINT: tuple[int, int] = (200, 40)

# 비상 정지(Kill-Switch) 단축키: 자동화 진행 도중 언제든 이 키를 누르면 즉시 강제 종료됩니다.
EMERGENCY_KILL_KEY: str = "esc"

# 카카오톡 창을 화면 왼쪽 절반으로 고정하는 단축키 (Control + Option + Left Arrow)
ALIGN_WINDOW_TO_LEFT: bool = True
ALIGN_WINDOW_HOTKEY: tuple[str, ...] = ("ctrl", "option", "left")
ALIGN_WAIT: float = 0.6

# ------------------------------------------------------------------------------
# 채팅방 검색 및 열기 설정 (1.활성화 -> 2.cmd+f -> 3.검색 -> 4.더블클릭 -> 5.왼쪽고정)
# ------------------------------------------------------------------------------
SEARCH_CHATROOM_NAME: str = "오르카 관리톡방"
SEARCH_HOTKEY: tuple[str, ...] = ("command", "f")


# 검색 결과 창 최상단 항목 더블클릭 좌표
# TODO: CALIBRATE (python main.py --calibrate 실행 후 검색 결과 1번째 항목 좌표 입력)
SEARCH_FIRST_RESULT_COORDS: tuple[int, int] = (255, 145)

# 검색창을 직접 마우스로 클릭하여 열고 싶을 때 사용하는 좌표 (설정 시 Cmd+F 대신 또는 병행하여 클릭)
# TODO: CALIBRATE (예: 카톡 메인창 상단 검색 입력칸 위치 (180, 75))
SEARCH_BAR_CLICK_COORDS: tuple[int, int] = (650, 50)

# 더블클릭 후 새 채팅방 창이 뜰 때까지 대기 시간 (초)
CHAT_OPEN_WAIT: float = 1.0






# ------------------------------------------------------------------------------
# 과거 대화 프리로딩 스크롤 설정 (오픈채팅방 켠 후 위로 스크롤을 올려 대화 메모리 로딩)
# ------------------------------------------------------------------------------
PRELOAD_SCROLL_POINT: tuple[int, int] = (300, 450)
PRELOAD_SCROLL_COUNT: int = 45
PRELOAD_SCROLL_WAIT: float = 1.5


# [STEP 2] 오픈채팅방 상단 '대화 내용 검색(돋보기)' 버튼 좌표 (달력 아이콘을 띄우기 위해 선행 클릭)
CHAT_SEARCH_BUTTON: tuple[int, int] = (607, 84)


# [STEP 2] 오픈채팅방 상단 '날짜 이동' (달력 모양 아이콘) 버튼 좌표
# TODO: CALIBRATE (예: 검색 버튼 클릭 후 나타나는 달력 아이콘 위치)
KAKAO_CALENDAR_BUTTON: tuple[int, int] = (648, 133)


# [STEP 4] 달력 팝업 내 '이전 달 (<)' 이동 버튼 좌표
# TODO: CALIBRATE (달력 상단 'YYYY년 M월' 좌측 이전 달 화살표 버튼)
PREVIOUS_MONTH_BUTTON: tuple[int, int] = (764, 68)

# [STEP 3] 달력 그리드 기준 좌표 및 크기
# 달력 첫째 행 첫째 열(일요일 또는 월요일) 날짜 숫자의 중심 좌표
# TODO: CALIBRATE
CALENDAR_ORIGIN_X: int = 763
CALENDAR_ORIGIN_Y: int = 127

# 각 날짜 셀(Cell)의 가로/세로 간격 (픽셀)
# TODO: CALIBRATE
CALENDAR_CELL_WIDTH: int = 30
CALENDAR_CELL_HEIGHT: int = 30

# 달력 요일 시작 기준: "SUN" (일~토) 또는 "MON" (월~일)
CALENDAR_WEEK_START: str = "SUN"

# [STEP 5 & 메시지 복사] 메시지 드래그 선택 좌표
# 어제 날짜를 클릭한 후 스크롤된 위치에서 어제 첫 메시지의 텍스트 본문 시작 좌표
# TODO: CALIBRATE
MESSAGE_START_X: int = 614
MESSAGE_START_Y: int = 338

# 메시지를 드래그하여 내릴 목표 하단 좌표 (채팅 입력창 바로 위 스크롤 유도 영역)
# TODO: CALIBRATE
MESSAGE_SELECTION_BOTTOM_X: int = 215
MESSAGE_SELECTION_BOTTOM_Y: int = 815


# ==============================================================================
# 4. 동작 대기 시간 (초 단위)
# ==============================================================================
# 카카오톡 활성화 후 UI 안정화 대기
ACTIVATE_WAIT: float = 0.8

# 달력 열기 버튼 클릭 후 달력 팝업이 뜰 때까지 대기 시간 (초)
CALENDAR_OPEN_WAIT: float = 5.0

# 달력에서 특정 날짜 클릭 후 카카오톡이 해당 날짜 위치로 스크롤 이동할 때까지 대기
CLICK_WAIT: float = 1.2

# 마우스 드래그 이동 시간 (시작 좌표에서 끝 좌표까지 쭉 내리는 시간: 초)
DRAG_DURATION: float = 1.0

# 끝 좌표에 도달한 후 마우스를 누른 채로 자동 스크롤(오토스크롤)을 발생시키며 대기하는 시간 (초)
AUTO_SCROLL_PAUSE: float = 30.0

# Cmd+C 키 입력 후 클립보드에 데이터가 올라올 때까지 대기
COPY_WAIT: float = 0.6


# Orca 웹 페이지 로딩 대기 시간
PAGE_LOAD_TIMEOUT_MS: int = 30000


# ==============================================================================
# 5. Orca Math Lab 웹페이지 연동 설정
# ==============================================================================
ORCA_URL: str = "https://orcamathlab.web.app/teacher?tab=quick"

# Quick 입력 탭의 카카오톡 텍스트 입력 textarea 셀렉터
# OrcaMathLab 소스코드의 QuickUpdateDashboard.tsx 기준:
# placeholder="여기에 카카오톡 대화 로그를 붙여넣으세요..."
# 만약 변경이 필요할 경우 아래 셀렉터를 수정하십시오.
ORCA_INPUT_SELECTOR: str = 'textarea[placeholder*="카카오톡 대화 로그"]'

# 파싱 실행 버튼 셀렉터 (선택 사항: 텍스트 입력 후 자동 클릭용)
ORCA_SUBMIT_BUTTON_SELECTOR: str = 'button:has-text("파싱 실행")'

# Playwright 브라우저 헤드리스 실행 여부 (False: 브라우저 창 띄워서 확인)
ORCA_HEADLESS: bool = False