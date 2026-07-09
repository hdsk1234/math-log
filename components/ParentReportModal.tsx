import React, { useState, useMemo } from 'react';
import { X, Copy, Download, Loader2, BookOpen, MessageSquare, Sliders } from 'lucide-react';
import { toPng, toBlob } from 'html-to-image';
import { StudentData } from '../types';
import { ParentReportRender } from './ParentReportRender';

interface ParentReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  student: StudentData;
}

export const ParentReportModal: React.FC<ParentReportModalProps> = ({
  isOpen,
  onClose,
  student,
}) => {
  const [selectedLogsCount, setSelectedLogsCount] = useState<number>(4);
  const [parentFeedback, setParentFeedback] = useState<string>(() => {
    return `안녕하세요 학부모님, ${student.profile.name} 학생의 과외 학습 현황 리포트를 보내드립니다. 

최근 수업 진도 및 주간 과제 완수 지표를 집계한 결과입니다. 가정에서도 확인하시어 따뜻한 격려와 칭찬 부탁드립니다. 

앞으로도 더 꼼꼼하고 애정 깊게 지도하겠습니다. 감사합니다.`;
  });
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (message: string) => {
    setToastMessage(message);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // 이미지 저장
  const handleDownloadImage = async () => {
    const node = document.getElementById('parent-report-capture-preview');
    if (!node) return;
    setIsGenerating(true);
    // Yield to the event loop so the browser can paint the loading overlay
    await new Promise(resolve => setTimeout(resolve, 300));
    try {
      const dataUrl = await toPng(node, {
        cacheBust: true,
        backgroundColor: '#f8fafc',
        pixelRatio: 1.5,
        skipFonts: true,
      });
      const link = document.createElement('a');
      const today = new Date();
      const dateStr = `${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, '0')}${String(today.getDate()).padStart(2, '0')}`;
      link.download = `학습리포트_${student.profile.name}_${dateStr}.png`;
      link.href = dataUrl;
      link.click();
      showToast("학부모용 리포트 이미지가 다운로드되었습니다.");
    } catch (error) {
      console.error(error);
      alert("이미지 다운로드 중 오류가 발생했습니다.");
    } finally {
      setIsGenerating(false);
    }
  };

  // 이미지 복사
  const handleCopyImage = async () => {
    const node = document.getElementById('parent-report-capture-preview');
    if (!node) return;
    setIsGenerating(true);
    // Yield to the event loop so the browser can paint the loading overlay
    await new Promise(resolve => setTimeout(resolve, 300));
    try {
      const blobPromise = toBlob(node, {
        cacheBust: true,
        backgroundColor: '#f8fafc',
        pixelRatio: 1.5,
        skipFonts: true,
      }).then(blob => {
        if (!blob) throw new Error("Blob 생성 실패");
        return blob;
      });

      await navigator.clipboard.write([
        new ClipboardItem({
          'image/png': blobPromise,
        }),
      ]);
      showToast("리포트 이미지가 클립보드에 복사되었습니다! 카톡에 붙여넣어 보세요.");
    } catch (error) {
      console.error(error);
      alert("이미지 복사에 실패했습니다. 브라우저 보안 정책에 의한 차단일 수 있습니다.");
    } finally {
      setIsGenerating(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl w-full max-w-5xl max-h-[90vh] flex flex-col overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200">
        
        {/* Modal Header */}
        <div className="flex justify-between items-center px-6 py-4 border-b border-gray-100 bg-gray-50/50">
          <div>
            <h3 className="text-lg font-black text-gray-900 flex items-center gap-2">
              <BookOpen className="text-indigo-600" size={20} />
              학부모 결과 피드백 리포트 생성
            </h3>
            <p className="text-xs text-gray-500 mt-0.5">수업 내용과 최근 과제 수행률을 담은 이미지 보고서를 생성합니다.</p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-gray-200 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 flex flex-col lg:flex-row gap-6">
          
          {/* Controls Panel (Left side) */}
          <div className="w-full lg:w-80 flex flex-col gap-5 flex-shrink-0 bg-gray-50 p-5 rounded-2xl border border-gray-100">
            {/* 1. Log Count Selector */}
            <div className="space-y-1.5">
              <label className="text-xs font-black text-gray-500 uppercase tracking-wider flex items-center gap-1">
                <Sliders size={12} className="text-gray-400" />
                분석할 수업 회차 설정
              </label>
              <select
                value={selectedLogsCount}
                onChange={(e) => setSelectedLogsCount(Number(e.target.value))}
                className="w-full bg-white border border-gray-200 rounded-xl px-3.5 py-2 text-sm font-bold text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500 transition-all cursor-pointer"
              >
                <option value={4}>최근 4회차 수업 분석</option>
                <option value={8}>최근 8회차 수업 분석</option>
                <option value={12}>최근 12회차 수업 분석</option>
              </select>
            </div>

            {/* 2. Feedback Editor */}
            <div className="space-y-1.5 flex-1 flex flex-col">
              <label className="text-xs font-black text-gray-500 uppercase tracking-wider flex items-center gap-1">
                <MessageSquare size={12} className="text-gray-400" />
                선생님 코멘트 피드백
              </label>
              <textarea
                value={parentFeedback}
                onChange={(e) => setParentFeedback(e.target.value)}
                rows={8}
                className="w-full flex-1 min-h-[150px] bg-white border border-gray-200 rounded-xl px-3.5 py-2 text-xs font-semibold text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500 transition-all resize-none"
                placeholder="학부모님께 전달할 총평 및 피드백을 자유롭게 작성해 주세요."
              />
            </div>

            <hr className="border-gray-200" />

            {/* Actions */}
            <div className="space-y-2.5 mt-auto">
              <button
                onClick={handleCopyImage}
                disabled={isGenerating}
                className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white py-2.5 rounded-xl text-xs font-black shadow-md shadow-indigo-100 hover:shadow-lg transition-all cursor-pointer"
              >
                {isGenerating ? <Loader2 size={14} className="animate-spin" /> : <Copy size={14} />}
                리포트 이미지 복사
              </button>
              
              <button
                onClick={handleDownloadImage}
                disabled={isGenerating}
                className="w-full flex items-center justify-center gap-2 bg-white hover:bg-gray-50 disabled:bg-gray-50 text-gray-700 border border-gray-200 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer"
              >
                {isGenerating ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
                리포트 이미지 저장
              </button>
            </div>
          </div>

          {/* Preview Panel (Right side) */}
          <div className="flex-1 bg-gray-100 rounded-2xl border border-gray-200 overflow-hidden relative flex flex-col min-h-[300px] lg:min-h-0">
            {/* Generating Loading Overlay */}
            {isGenerating && (
              <div className="absolute inset-0 bg-white/70 backdrop-blur-[1px] z-50 flex flex-col items-center justify-center gap-3 animate-in fade-in duration-200">
                <Loader2 size={36} className="text-indigo-600 animate-spin" />
                <span className="text-sm font-black text-gray-700">이미지 파일 생성 중...</span>
              </div>
            )}

            {/* Preview Banner Header */}
            <div className="bg-gray-200/50 px-4 py-2 border-b border-gray-200 flex items-center justify-between">
              <span className="text-xs font-bold text-gray-500">리포트 이미지 미리보기</span>
              <span className="text-[10px] bg-white px-2 py-0.5 rounded border border-gray-200 text-gray-400 font-bold">480px</span>
            </div>

            {/* Image Preview Container (Scaled down slightly to fit or scrollable) */}
            <div className="flex-1 overflow-auto p-6 flex justify-center items-start">
              {/* Scaled wrapper to fit nicely inside modal */}
              <div className="origin-top scale-[0.6] sm:scale-[0.7] md:scale-[0.8] lg:scale-[0.85] shadow-xl rounded-3xl bg-slate-50 flex-shrink-0">
                <div id="parent-report-capture-preview" className="bg-slate-50">
                  <ParentReportRender
                    student={student}
                    selectedLogsCount={selectedLogsCount}
                    parentFeedback={parentFeedback}
                    targetId="parent-report-card-capture-preview"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Floating Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-10 left-1/2 transform -translate-x-1/2 bg-gray-900 text-white px-6 py-3 rounded-full shadow-lg z-[200] text-xs font-bold animate-in fade-in slide-in-from-bottom-2 duration-300">
          {toastMessage}
        </div>
      )}
    </div>
  );
};
