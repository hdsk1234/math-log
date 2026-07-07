const fs = require('fs');
const filepath = 'pages/StudentJournalDashboard.tsx';
let content = fs.readFileSync(filepath, 'utf8');

// 1. togglePaymentPaidStatus 직전에 SMS 관련 상태와 함수들을 주입
const target1 = `  const togglePaymentPaidStatus = (dateStr: string) => {`;
const replacement1 = `  const [isSendingSms, setIsSendingSms] = useState(false);
  const [smsTemplate, setSmsTemplate] = useState(student.profile.paymentMessageTemplate || "안녕하세요, {studentName} 학생 수학 과외 교사입니다. 이번 {cycle}회차 수업이 완료되어 안내드립니다. 수업료 납부 부탁드립니다. 감사합니다.");
  const [smsPreview, setSmsPreview] = useState("");
  const [smsTargetPhone, setSmsTargetPhone] = useState("");
  const [isSmsTransmitting, setIsSmsTransmitting] = useState(false);

  const openSmsSimulator = () => {
    const profile = student.profile;
    const phone = profile.parentPhone || profile.studentPhone || "";
    setSmsTargetPhone(phone);
    const template = profile.paymentMessageTemplate || "안녕하세요, {studentName} 학생 수학 과외 교사입니다. 이번 {cycle}회차 수업이 완료되어 안내드립니다. 수업료 납부 부탁드립니다. 감사합니다.";
    setSmsTemplate(template);
    const cycle = profile.lessonFeeCycle || 8;
    const preview = template.replace(/{studentName}/g, profile.name).replace(/{cycle}/g, String(cycle));
    setSmsPreview(preview);
    setIsSendingSms(true);
  };

  const handleTemplateChange = (val: string) => {
    setSmsTemplate(val);
    const profile = student.profile;
    const cycle = profile.lessonFeeCycle || 8;
    const preview = val.replace(/{studentName}/g, profile.name).replace(/{cycle}/g, String(cycle));
    setSmsPreview(preview);
  };

  const saveSmsTemplate = () => {
    onUpdateStudent({
      ...student,
      profile: {
        ...student.profile,
        paymentMessageTemplate: smsTemplate
      }
    });
    setToast({ message: "문자 멘트 템플릿이 저장되었습니다.", isVisible: true });
    setTimeout(() => {
      setToast(prev => prev ? { ...prev, isVisible: false } : null);
    }, 2000);
  };

  const copySmsToClipboard = () => {
    navigator.clipboard.writeText(smsPreview).then(() => {
      setToast({ message: "안내 문자 내용이 클립보드에 복사되었습니다! 카카오톡 등에 붙여넣어 전송하세요.", isVisible: true });
      setTimeout(() => {
        setToast(prev => prev ? { ...prev, isVisible: false } : null);
      }, 2500);
    }).catch(err => {
      console.error("Failed to copy text:", err);
      alert("텍스트 복사에 실패했습니다. 직접 선택하여 복사해 주세요.");
    });
  };

  const triggerSmsSend = () => {
    if (!smsTargetPhone) {
      alert("수신할 번호가 없습니다. 학생 혹은 학부모 전화번호를 등록해 주세요.");
      return;
    }
    setIsSmsTransmitting(true);
    const isApple = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.userAgent.includes("Mac") && "ontouchend" in document);
    const separator = isApple ? "&" : "?";
    const cleanPhone = smsTargetPhone.replace(/[^0-9+]/g, "");
    try {
      window.location.href = `sms:${cleanPhone}${separator}body=${encodeURIComponent(smsPreview)}`;
    } catch (err) {
      console.error("Failed to open SMS scheme:", err);
    }
    setTimeout(() => {
      setIsSmsTransmitting(false);
      setIsSendingSms(false);
      setToast({ message: `문자 전송 앱을 실행했습니다. (수신: ${smsTargetPhone})`, isVisible: true });
      setTimeout(() => {
        setToast(prev => prev ? { ...prev, isVisible: false } : null);
      }, 2500);
    }, 1500);
  };

  const togglePaymentPaidStatus = (dateStr: string) => {`;

if (content.includes(target1)) {
  content = content.replace(target1, replacement1);
  console.log("Successfully injected SMS states/functions.");
} else {
  console.error("Failed to locate togglePaymentPaidStatus in file.");
  process.exit(1);
}

// 2. 깨진 JSX 영역 정규식 매칭 및 복구
const targetRegex = /<div className="w-full bg-white\/10 h-1\.5 rounded-full mt-2 overflow-hidden">[\s\S]*?<div\s*className={`h-full transition-all duration-300 \$\{[\s\S]*?completedLessonsSincePayment >= \(student\.profile\.lessonFeeCycle \|\| 8\)[\s\S]*?수업료 수납 완료 여부는[\s\S]*?<\/div>/;

const replacement2 = `<div className="w-full bg-white/10 h-1.5 rounded-full mt-2 overflow-hidden">
                              <div
                                className={\`h-full transition-all duration-300 \${
                                  completedLessonsSincePayment >= (student.profile.lessonFeeCycle || 8)
                                    ? 'bg-amber-400'
                                    : 'bg-emerald-400'
                                }\`}
                                style={{
                                  width: \`\${Math.min(
                                    100,
                                    (completedLessonsSincePayment / (student.profile.lessonFeeCycle || 8)) * 100
                                  )}%\`,
                                }}
                              />
                            </div>
                          </div>
                          <div className="bg-black/10 rounded-xl p-3 border border-white/5">
                            <span className="text-[10px] font-bold text-indigo-100 block uppercase">다음 납부 예정일</span>
                            <span className="text-sm font-bold block mt-1.5">{nextPaymentDate}</span>
                          </div>
                        </div>

                        {completedLessonsSincePayment >= (student.profile.lessonFeeCycle || 8) && (
                          <div className="bg-amber-500/20 border border-amber-500/30 text-amber-200 px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 animate-pulse">
                            ⚠️ 이번 {student.profile.lessonFeeCycle}회차 시수가 모두 완료되어 수업료 수납일이 도래했습니다!
                          </div>
                        )}

                        <div className="flex flex-col gap-2">
                          <button
                            onClick={openSmsSimulator}
                            className="w-full bg-white text-indigo-600 hover:bg-indigo-50 font-bold py-2.5 rounded-xl text-xs transition-colors shadow-md flex items-center justify-center gap-1.5"
                          >
                            <span>안내 문자 발송</span>
                          </button>
                          <p className="text-[10px] text-indigo-100 text-center font-medium mt-1">
                            * 수업료 수납 완료 여부는 하단 <strong>캘린더의 동전(₩) 아이콘이 표시된 날짜</strong>를 눌러 직접 토글 스위치로 설정할 수 있습니다.
                          </p>
                        </div>`;

if (targetRegex.test(content)) {
  content = content.replace(targetRegex, replacement2);
  console.log("Successfully restored broken JSX layout.");
} else {
  console.error("Failed to match targetRegex in file.");
  process.exit(1);
}

fs.writeFileSync(filepath, content, 'utf8');
console.log("File saved successfully.");
