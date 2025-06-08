
import React, { useState } from 'react';
import { WorldSettings, ProcessedWizardData, Stage } from '../types'; // Added Stage
import Modal from './shared/Modal';
import Button from './shared/Button';
import Input from './shared/Input';
import TextArea from './shared/TextArea';
import { AISparklesIcon } from './shared/icons/Icons';
import { generateFullStageWithAI } from '../services/geminiService';

interface AIStageWizardModalProps {
  isOpen: boolean;
  onClose: () => void;
  worldSettings: WorldSettings | null;
  existingStages: Stage[]; // New prop for context
  onStageGenerated: (data: ProcessedWizardData) => void;
  setIsLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
}

const AIStageWizardModal: React.FC<AIStageWizardModalProps> = ({
  isOpen,
  onClose,
  worldSettings,
  existingStages, // Destructure new prop
  onStageGenerated,
  setIsLoading,
  setError,
}) => {
  const [stageTitleHint, setStageTitleHint] = useState('');
  const [stageTheme, setStageTheme] = useState('');

  const handleGenerate = async () => {
    if (!worldSettings?.title) { // Check for title specifically as it's key for generation
      setError("AI 스테이지 생성을 위해서는 먼저 세계관 설정을 완료해야 합니다.");
      onClose(); // Close the modal even if there's an initial validation error
      return;
    }

    // Close the modal immediately upon clicking the button, before generation starts
    onClose();

    setIsLoading(true);
    setError(null);
    try {
      const generatedData = await generateFullStageWithAI(
        worldSettings,
        {
          titleHint: stageTitleHint,
          theme: stageTheme,
        },
        existingStages // Pass existing stages
      );
      onStageGenerated(generatedData);
      setStageTitleHint(''); // Reset fields for next time the modal is opened
      setStageTheme('');
    } catch (e: any) {
      console.error("AI Stage Wizard generation failed:", e);
      setError(e.message || "AI로 스테이지 생성에 실패했습니다. 자세한 내용은 콘솔을 확인하세요.");
      // Modal is already closed, error will be displayed globally.
    } finally {
      setIsLoading(false);
      // onClose(); // Already called at the beginning of the function.
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose} // This handles modal's own close button (X) or overlay click
      title="AI 스테이지 생성 마법사"
      size="lg"
    >
      <div className="space-y-4">
        <p className="text-sm text-gray-300">
          AI가 스테이지 제목, 설명, 최소 20개의 장면(마지막은 보스 전투), 그리고 관련 캐릭터들을 유기적으로 생성합니다.
          스테이지 테마를 입력하지 않으면, AI가 세계관 설정 또는 이전 스테이지의 맥락을 기반으로 테마를 생성합니다.
        </p>
        <Input
          label="스테이지 제목 제안 (선택사항)"
          value={stageTitleHint}
          onChange={(e) => setStageTitleHint(e.target.value)}
          placeholder="예: 잊혀진 사원 (비워두면 AI가 생성)"
        />
        <TextArea
          label="스테이지 테마 / 콘셉트 (선택사항)"
          value={stageTheme}
          onChange={(e) => setStageTheme(e.target.value)}
          placeholder="예: 고대 문명의 저주받은 유적. 플레이어는 위험한 함정과 수수께끼를 헤쳐나가 강력한 유물 수호자와 맞서야 합니다. (비워두면 AI가 자동 생성)"
          rows={5}
        />
        {!worldSettings?.title && ( 
            <p className="text-xs text-yellow-400">세계관 설정, 특히 제목이 정의되지 않았습니다. AI 생성 품질에 영향을 줄 수 있습니다.</p>
        )}
        <div className="flex justify-end space-x-2 pt-2">
          <Button onClick={onClose} variant="secondary">
            취소
          </Button>
          <Button
            onClick={handleGenerate}
            variant="primary"
            leftIcon={<AISparklesIcon className="w-5 h-5" />}
            disabled={!worldSettings?.title} 
          >
            스테이지 생성 시작
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default AIStageWizardModal;
