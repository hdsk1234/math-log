# KakaoTalk Daily Message Collector & Orca Sync for macOS

macOS 환경에서 매일 카카오톡 오픈채팅방의 **"어제 하루치 대화 및 오늘 오전 12:00(자정) 제출 메시지"**를 자동으로 수집·정제한 뒤, Orca Math Lab의 빠른 기록([Teacher Quick Tab](https://orcamathlab.web.app/teacher?tab=quick)) 입력창에 자동으로 붙여넣는 자동화 프로그램입니다.

---

## 1. 프로젝트 파일 구조

```text
project/
├── main.py                  # 전체 실행 오케스트레이터 및 CLI 인터페이스
├── config.py                # 모든 좌표, 대기시간, 셀렉터, 디버그 설정
├── kakao.py                 # 카카오톡 창 활성화, 달력 이동, 드래그 복사
├── clipboard_utils.py       # 클립보드 읽기/쓰기 및 디버그 산출물 저장
├── text_processor.py        # 날짜 마커 생성, 텍스트 정제, 달력 그리드 계산 (순수 함수)
├── orca.py                  # Playwright 기반 웹 브라우저 실행 및 붙여넣기
├── requirements.txt         # 필수 라이브러리 목록
├── README.md                # 환경 설정 및 실행 가이드
├── tests/
│   └── test_text_processor.py  # 날짜 및 텍스트 정제 유닛 테스트
└── debug/
    ├── .gitkeep
    └── run.log              # 실행 로그 및 디버그 스크린샷 저장 폴더
```

---

## 2. 전체 동작 순서 (Workflow)

1. **날짜 계산 (STEP 0)**: 시스템 시간을 기준으로 오늘과 어제 날짜(요일 포함: `YYYY년 M월 D일 요일`)를 계산합니다.
2. **카카오톡 창 활성화 및 화면 왼쪽 절반 배치 (STEP 1)**: 카카오톡 앱을 최상단으로 활성화한 후, 자동으로 `Control + Option + Left Arrow` 단축키를 전송하여 화면 왼쪽 절반에 창을 고정합니다.

3. **달력 열기 (STEP 2)**: 오픈채팅방 상단의 날짜 이동(달력) 버튼을 클릭합니다.
4. **월/연도 이동 (STEP 3 & 4)**: 오늘과 어제의 연/월이 다를 경우(월초, 연초) 자동으로 '이전 달(<)' 버튼을 클릭합니다.
5. **어제 날짜 클릭 (STEP 5)**: 어제의 일(day)과 요일로 달력 그리드(행/열)를 계산하여 어제 날짜의 정중앙을 클릭합니다.
6. **메시지 드래그 복사 (STEP 6)**: 어제 첫 메시지 위치부터 채팅창 최하단까지 마우스를 드래그하여 하단 자동 스크롤을 발생시킨 뒤 `Cmd + C`로 복사합니다.
7. **텍스트 정제 (STEP 7 & 8)**:
   - 어제 날짜 구분자 이전 텍스트 제거
   - 오늘 날짜 구분자 포함 및 직후의 **"오전 12:00"** 메시지 전부 포함
   - "오전 12:00"이 아닌 첫 메시지가 나오면 즉시 절삭
   - 오늘 구분자가 없으면 끝까지 어제 데이터로 취급 (Fallback)
8. **Orca 웹 입력 (STEP 9)**: Playwright로 [Orca Quick Tab](https://orcamathlab.web.app/teacher?tab=quick)에 접속하여 텍스트창에 `Cmd + V`로 붙여넣습니다.

---

## 3. 최초 설치 및 설정 단계 (Step-by-Step)

### Step 1. Python 설치 확인
macOS 터미널을 열고 Python 3.10 이상이 설치되어 있는지 확인합니다:
```bash
python3 --version
```

### Step 2. 가상환경 생성 및 활성화
```bash
cd project
python3 -m venv .venv
source .venv/bin/activate
```

### Step 3. 의존성 라이브러리 설치
```bash
pip install --upgrade pip
pip install -r requirements.txt
```

### Step 4. Playwright Chromium 브라우저 설치
```bash
playwright install chromium
```

### Step 5. macOS 권한 부여 (필수)
이 프로그램은 화면 좌표 클릭(`pyautogui`), 단축키 전송, 활성 창 전환을 수행하므로 권한이 필요합니다:
1. **시스템 설정 (System Settings)** > **개인정보 보호 및 보안 (Privacy & Security)**
2. **손쉬운 사용 (Accessibility)**: 터미널(Terminal) 또는 사용 중인 IDE(VSCode 등), Python에 권한 부여
3. **화면 기록 (Screen Recording)**: 터미널/Python에 권한 부여 (디버그 스크린샷 저장용)

---

## 4. 최초 1회 좌표 설정 (Calibration)

카카오톡 창 크기와 모니터 해상도(Retina 배율 등)에 따라 UI 좌표가 다릅니다. 사용자는 카카오톡 오픈채팅방 창을 **화면 왼쪽 절반**에 배치한 상태(`Control + Option + Left Arrow` 등)에서 다음을 진행합니다.

### 1) 실시간 좌표 측정기 실행
```bash
python main.py --calibrate
```
터미널에 마우스 커서의 현재 `(X, Y)` 좌표가 실시간으로 출력됩니다.

### 2) 다음 4개 핵심 좌표를 확인하여 `config.py`에 입력
1. **달력 열기 버튼**: 오픈채팅방 상단 제목 우측의 '달력(날짜 이동)' 아이콘 중심에 마우스를 올리고 좌표 기록
   - `config.py` -> `KAKAO_CALENDAR_BUTTON = (X, Y)`
2. **이전 달 버튼**: 달력 팝업창 상단 좌측의 `<` 화살표 중심 좌표 기록
   - `config.py` -> `PREVIOUS_MONTH_BUTTON = (X, Y)`
3. **달력 그리드 기준점 (1행 1열)**:
   - 달력의 첫 번째 줄 첫 번째 칸(보통 일요일 칸) 중심 좌표 기록
   - `config.py` -> `CALENDAR_ORIGIN_X = X`, `CALENDAR_ORIGIN_Y = Y`
   - 셀 너비/높이: 날짜와 다음 날짜 간격 측정 후 `CALENDAR_CELL_WIDTH`, `CALENDAR_CELL_HEIGHT` 설정
4. **메시지 드래그 시작 및 끝 좌표**:
   - 어제 첫 메시지 텍스트 시작 위치 -> `MESSAGE_START_X`, `MESSAGE_START_Y`
   - 채팅창 하단(입력창 바로 윗부분) 스크롤 유발 영역 -> `MESSAGE_SELECTION_BOTTOM_X`, `MESSAGE_SELECTION_BOTTOM_Y`

---

## 5. Orca Selector 설정

`config.py`의 `ORCA_INPUT_SELECTOR`에 Quick Tab의 텍스트 입력 엘리먼트 셀렉터를 지정합니다.

- **현재 적용된 기본 셀렉터**:
  ```python
  ORCA_INPUT_SELECTOR = 'textarea[placeholder*="카카오톡 대화 로그"]'
  ```
- **개발자 도구에서 셀렉터 확인 방법**:
  1. Chrome 브라우저에서 `https://orcamathlab.web.app/teacher?tab=quick` 접속
  2. 카카오톡 대화 로그 입력창을 마우스 우클릭 -> **검사 (Inspect)** 클릭
  3. `<textarea>` 태그의 `placeholder`, `id`, `name`, `data-testid` 또는 class 확인
  4. 필요 시 `config.py`의 `ORCA_INPUT_SELECTOR`를 수정합니다.

---

## 6. 테스트 및 실행 방법

### 1) 유닛 테스트 실행 (로직 검증)
```bash
python3 -m unittest tests/test_text_processor.py
# 또는
pytest tests/
```

### 2) 단계별 단독 테스트 (CLI 플래그)
```bash
# 날짜 및 달력 그리드 좌표 계산 확인
python main.py --test-date

# 현재 클립보드 내용 정제 테스트
python main.py --test-clipboard

# 카카오톡 창 활성화 및 드래그 복사 단독 테스트
python main.py --test-kakao

# Orca 웹페이지 접속 및 샘플 입력 단독 테스트
python main.py --test-orca
```

### 3) Dry-Run (Orca 웹 입력 전까지 실행)
웹 전송 없이 카카오톡에서 복사하여 정제된 텍스트가 올바른지 터미널과 `debug/` 폴더에서 검증합니다:
```bash
python main.py --dry-run --debug
```

### 4) 실제 운영 실행
```bash
python main.py
```

---

## 7. macOS 매일 자동 실행 설정 (launchd / cron)

카카오톡이 열려 있는 상태에서 매일 아침(예: 오전 06:00)에 자동으로 실행되도록 설정하는 방법입니다.

### 방법 1. macOS 권장: `launchd` (.plist)

1. `~/Library/LaunchAgents/com.mathlog.kakaosync.plist` 파일 생성:
```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>com.mathlog.kakaosync</string>
    <key>ProgramArguments</key>
    <array>
        <string>/Users/sangwoo-park/math-log/project/.venv/bin/python</string>
        <string>/Users/sangwoo-park/math-log/project/main.py</string>
    </array>
    <key>StartCalendarInterval</key>
    <dict>
        <key>Hour</key>
        <integer>6</integer>
        <key>Minute</key>
        <integer>0</integer>
    </dict>
    <key>StandardOutPath</key>
    <string>/Users/sangwoo-park/math-log/project/debug/launchd.log</string>
    <key>StandardErrorPath</key>
    <string>/Users/sangwoo-park/math-log/project/debug/launchd_err.log</string>
</dict>
</plist>
```

2. 데몬 등록 및 시작:
```bash
launchctl load ~/Library/LaunchAgents/com.mathlog.kakaosync.plist
```

### 방법 2. `cron` 설정
터미널에서 `crontab -e` 실행 후 추가 (매일 오전 6시 실행 예시):
```cron
0 6 * * * /Users/sangwoo-park/math-log/project/.venv/bin/python /Users/sangwoo-park/math-log/project/main.py >> /Users/sangwoo-park/math-log/project/debug/cron.log 2>&1
```
