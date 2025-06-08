
import React, { useState } from 'react';
import { Stage, WorldSettings, GeminiStageSuggestion, ProcessedWizardData } from '../types';
import Button from './shared/Button';
import { PlusIcon, TrashIcon, EditIcon, AISparklesIcon, ChevronDownIcon, ChevronRightIcon, PlayIcon } from './shared/icons/Icons'; // Added PlayIcon
import { generateStagesWithAI } from '../services/geminiService';
import { generateId } from '../utils/idGenerator';
import AIStageWizardModal from './AIStageWizardModal'; 

interface StageListPanelProps {
  stages: Stage[];
  selectedStageId: string | null;
  onSelectStage: (id: string | null) => void;
  onAddStage: (title: string) => void;
  onDeleteStage: (id: string) => void;
  worldSettings: WorldSettings | null;
  onUpdateStages: (stages: Stage[]) => void; 
  onAddFullGeneratedStage: (data: ProcessedWizardData) => void; 
  onPlayStage: (stageId: string) => void; // New prop for playing a stage
  setIsLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
}

const StageListPanel: React.FC<StageListPanelProps> = ({
  stages,
  selectedStageId,
  onSelectStage,
  onAddStage,
  onDeleteStage,
  worldSettings,
  onUpdateStages,
  onAddFullGeneratedStage, 
  onPlayStage, // Destructure new prop
  setIsLoading,
  setError
}) => {
  const [newStageTitle, setNewStageTitle] = useState('');
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isAiWizardOpen, setIsAiWizardOpen] = useState(false); 

  const handleAddManualStage = () => {
    if (newStageTitle.trim()) {
      onAddStage(newStageTitle.trim());
      setNewStageTitle('');
    }
  };

  const handleGenerateStageSuggestionsAI = async () => {
    if (!worldSettings || !worldSettings.title) {
      setError("AI로 스테이지를 생성하기 전에 세계관 설정을 정의해주세요.");
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const suggestions = await generateStagesWithAI(worldSettings);
      const newStages: Stage[] = suggestions.map((s: GeminiStageSuggestion) => ({
        id: generateId(),
        title: s.title,
        settingDescription: s.settingDescription,
        scenes: [],
        characters: [],
      }));
      onUpdateStages([...stages, ...newStages]); 
    } catch (e: any) {
      setError(e.message || "AI로 스테이지 생성에 실패했습니다.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleStageGeneratedFromWizard = (data: ProcessedWizardData) => {
    onAddFullGeneratedStage(data); 
    setIsAiWizardOpen(false); 
  };

  return (
    <div className="mt-6">
       <div className="flex justify-between items-center mb-3 cursor-pointer" onClick={() => setIsCollapsed(!isCollapsed)}>
        <h2 className="text-xl font-semibold text-purple-400">스테이지</h2>
        {isCollapsed ? <ChevronRightIcon className="w-6 h-6"/> : <ChevronDownIcon className="w-6 h-6"/>}
      </div>

      {!isCollapsed && (
        <>
          <div className="mb-4 space-y-2">
            <div className="flex space-x-2">
              <input
                type="text"
                value={newStageTitle}
                onChange={(e) => setNewStageTitle(e.target.value)}
                placeholder="새 스테이지 제목"
                className="flex-grow p-2 bg-gray-600 border border-gray-500 rounded-md focus:ring-purple-500 focus:border-purple-500"
              />
              <Button onClick={handleAddManualStage} variant="primary" size="md" disabled={!newStageTitle.trim()} className="px-3">
                <PlusIcon className="w-5 h-5" />
              </Button>
            </div>
            <Button
                onClick={handleGenerateStageSuggestionsAI}
                variant="ghost"
                leftIcon={<AISparklesIcon className="w-5 h-5" />}
                disabled={!worldSettings || !worldSettings.title}
                className="w-full"
              >
                AI로 스테이지 제안 (제목/설명)
            </Button>
             <Button
                onClick={() => setIsAiWizardOpen(true)}
                variant="success"
                leftIcon={<AISparklesIcon className="w-5 h-5" />}
                disabled={!worldSettings || !worldSettings.title}
                className="w-full"
              >
                AI 스테이지 마법사 (전체 생성)
            </Button>
            {(!worldSettings || !worldSettings.title) && <p className="text-xs text-yellow-400 mt-1">AI 기능을 사용하려면 세계관 설정을 정의하세요.</p>}
          </div>

          {stages.length === 0 && (
            <p className="text-gray-400 text-center py-4">아직 생성된 스테이지가 없습니다. 직접 추가하거나 AI를 사용하세요!</p>
          )}
          <ul className="space-y-2">
            {stages.map((stage) => (
              <li
                key={stage.id}
                className={`p-3 rounded-md transition-all duration-150 ease-in-out group ${
                  selectedStageId === stage.id ? 'bg-purple-600 shadow-lg ring-2 ring-purple-400' : 'bg-gray-600 hover:bg-gray-500'
                }`}
              >
                <div className="flex justify-between items-center">
                  <div onClick={() => onSelectStage(stage.id)} className="flex-grow cursor-pointer overflow-hidden">
                    <span className="font-medium truncate pr-2">{stage.title}</span>
                  </div>
                  <div className="flex items-center space-x-1 flex-shrink-0">
                     <button
                        onClick={(e) => { e.stopPropagation(); onPlayStage(stage.id); }}
                        className="p-1.5 text-green-400 hover:text-green-300 rounded hover:bg-green-700"
                        title="스테이지 플레이"
                      >
                        <PlayIcon className="w-4 h-4" />
                      </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); onDeleteStage(stage.id); }}
                      className="p-1.5 text-red-400 hover:text-red-300 rounded hover:bg-red-700 opacity-0 group-hover:opacity-100 transition-opacity"
                      title="스테이지 삭제"
                    >
                      <TrashIcon className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                {selectedStageId === stage.id && (
                    <p className="text-xs text-purple-200 mt-1 truncate cursor-pointer" onClick={() => onSelectStage(stage.id)}>{stage.settingDescription}</p>
                )}
              </li>
            ))}
          </ul>
        </>
      )}
      <AIStageWizardModal
          isOpen={isAiWizardOpen}
          onClose={() => setIsAiWizardOpen(false)}
          worldSettings={worldSettings}
          existingStages={stages} 
          onStageGenerated={handleStageGeneratedFromWizard}
          setIsLoading={setIsLoading}
          setError={setError}
      />
    </div>
  );
};

export default StageListPanel;
