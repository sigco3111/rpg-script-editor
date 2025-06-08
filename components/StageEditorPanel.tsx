
import React, { useState } from 'react';
import { Stage, Scene, SceneType, WorldSettings, GeminiSceneNarration, GeminiSceneDialogue, GeminiSceneChoice, GeminiSceneCombat, Character, CharacterType, GeminiSceneItemAcquisition, GeminiSceneLocationChange, GeminiSceneTown } from '../types';
import Button from './shared/Button';
import { PlusIcon, TrashIcon, EditIcon, LinkIcon, UsersIcon, AISparklesIcon } from './shared/icons/Icons';
import Select from './shared/Select';
import { generateSceneDetailsWithAI } from '../services/geminiService';
import { generateId } from '../utils/idGenerator';

interface StageEditorPanelProps {
  stage: Stage;
  selectedSceneId: string | null;
  onSelectScene: (id: string | null) => void;
  onAddScene: (type: SceneType) => void;
  onUpdateFullScene: (scene: Scene) => void;
  onDeleteScene: (id: string) => void;
  onManageCharacters: () => void;
  worldSettings: WorldSettings | null;
  onUpdateScene: (scene: Scene) => void;
  setIsLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
}

const SceneCard: React.FC<{
  scene: Scene;
  isSelected: boolean;
  onSelect: () => void;
  onDelete: () => void;
  stageCharacters: Stage['characters'];
  allScenesInStage: Scene[];
}> = ({ scene, isSelected, onSelect, onDelete, stageCharacters, allScenesInStage }) => {

  const getCharacterName = (id: string) => stageCharacters.find(c => c.id === id)?.name || '알 수 없는 캐릭터';
  const getSceneTitle = (id: string | null | undefined) => id ? (allScenesInStage.find(s => s.id === id)?.title || '알 수 없는 장면') : '없음';

  const sceneTypeLabel = (type: SceneType): string => {
    // Return the enum value itself which now holds the Korean label
    return type;
  };

  return (
    <div
      className={`p-4 rounded-lg shadow-md transition-all duration-150 ease-in-out cursor-pointer border-2 ${
        isSelected ? 'bg-purple-700 border-purple-500' : 'bg-gray-600 hover:bg-gray-500 border-gray-600 hover:border-gray-500'
      }`}
      onClick={onSelect}
    >
      <div className="flex justify-between items-center mb-2">
        <h4 className="text-lg font-semibold truncate text-purple-300">{scene.title} <span className="text-xs text-gray-400">({sceneTypeLabel(scene.type)})</span></h4>
        <div className="flex space-x-2">
          <button
            onClick={(e) => { e.stopPropagation(); onDelete(); }}
            className="p-1 text-red-400 hover:text-red-300 rounded hover:bg-red-600"
            title="장면 삭제"
          >
            <TrashIcon className="w-5 h-5" />
          </button>
        </div>
      </div>
      <p className="text-sm text-gray-300 truncate mb-1">{scene.content.substring(0, 100)}{scene.content.length > 100 ? '...' : ''}</p>
      {scene.type === SceneType.ITEM_ACQUISITION && scene.item && (
        <p className="text-xs text-yellow-300 mt-1">획득 아이템: {scene.item}</p>
      )}
      {scene.type === SceneType.LOCATION_CHANGE && scene.newLocationName && (
        <p className="text-xs text-green-300 mt-1">새 장소: {scene.newLocationName}</p>
      )}
      {/* No specific display for TOWN in SceneCard for now, general content is shown */}

      {scene.type !== SceneType.CHOICE && scene.nextSceneId && (
        <div className="text-xs text-purple-300 mt-1 flex items-center">
          <LinkIcon className="w-3 h-3 mr-1" /> 다음: {getSceneTitle(scene.nextSceneId)}
        </div>
      )}
      {scene.type === SceneType.CHOICE && scene.choices && scene.choices.map((choice, idx) => (
        <div key={choice.id} className="text-xs text-indigo-300 mt-1 flex items-center">
          <LinkIcon className="w-3 h-3 mr-1" /> 선택 {idx+1}: "{choice.text.substring(0,20)}..." &rarr; {getSceneTitle(choice.nextSceneId)}
        </div>
      ))}

    </div>
  );
};


const StageEditorPanel: React.FC<StageEditorPanelProps> = ({
  stage,
  selectedSceneId,
  onSelectScene,
  onAddScene,
  onUpdateFullScene, // Use this for adding the complete AI scene
  onDeleteScene,
  onManageCharacters,
  worldSettings,
  onUpdateScene,
  setIsLoading,
  setError,
}) => {
  const [showAddSceneDropdown, setShowAddSceneDropdown] = useState(false);
  const sceneTypes = Object.values(SceneType); // Enum values are now Korean labels
  const [aiSceneType, setAiSceneType] = useState<SceneType>(SceneType.NARRATION);
  const [aiScenePrompt, setAiScenePrompt] = useState<string>('');


  const handleAddSceneWithType = (type: SceneType) => {
    onAddScene(type);
    setShowAddSceneDropdown(false);
  };

  const handleGenerateSceneAI = async () => {
    if (!worldSettings || !worldSettings.title) {
      setError("AI로 장면을 생성하기 전에 세계관 설정과 현재 스테이지 상세정보를 정의해주세요.");
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const generatedDetails = await generateSceneDetailsWithAI(worldSettings, stage, aiSceneType, aiScenePrompt);

      const baseNewScene: Scene = {
        id: generateId(),
        stageId: stage.id,
        type: aiSceneType,
        title: generatedDetails.title || `AI 생성 ${aiSceneType}`,
        content: generatedDetails.content || '',
        characterIds: [],
        choices: undefined,
        nextSceneId: null,
        combatDetails: undefined,
        item: undefined,
        newLocationName: undefined,
      };

      if (aiSceneType === SceneType.CHOICE && (generatedDetails as GeminiSceneChoice).choices) {
        baseNewScene.choices = (generatedDetails as GeminiSceneChoice).choices.map(c => ({ id: generateId(), text: c.text, nextSceneId: null }));
      }

      if (aiSceneType === SceneType.DIALOGUE && (generatedDetails as GeminiSceneDialogue).speakerCharacterName) {
        const speaker = stage.characters.find(c => c.name === (generatedDetails as GeminiSceneDialogue).speakerCharacterName && c.type === CharacterType.NPC);
        if (speaker) baseNewScene.characterIds = [speaker.id];
      }

      if (aiSceneType === SceneType.REGULAR_COMBAT || aiSceneType === SceneType.BOSS_COMBAT) {
        const combatDetails = generatedDetails as GeminiSceneCombat;
        baseNewScene.combatDetails = { enemyCharacterIds: [], reward: combatDetails.reward || ''};
        if(combatDetails.enemyNames) {
            combatDetails.enemyNames.forEach(name => {
                let enemy = stage.characters.find(c => c.name === name &&
                    (c.type === CharacterType.REGULAR_MONSTER || c.type === CharacterType.BOSS_MONSTER));

                if(aiSceneType === SceneType.BOSS_COMBAT && !enemy) {
                    enemy = stage.characters.find(c => c.name === name && c.type === CharacterType.BOSS_MONSTER);
                }
                if(aiSceneType === SceneType.REGULAR_COMBAT && !enemy) {
                     enemy = stage.characters.find(c => c.name === name && c.type === CharacterType.REGULAR_MONSTER);
                }

                if(enemy) {
                    baseNewScene.combatDetails?.enemyCharacterIds.push(enemy.id);
                } else {
                    console.warn(`AI가 제안한 적 "${name}"(${aiSceneType === SceneType.BOSS_COMBAT ? '보스' : '일반'})을(를) 스테이지 캐릭터에서 찾을 수 없습니다. 수동으로 추가하거나 확인해주세요.`);
                }
            });
        }
      }

      if (aiSceneType === SceneType.ITEM_ACQUISITION) {
        baseNewScene.item = (generatedDetails as GeminiSceneItemAcquisition).itemName || '알 수 없는 아이템';
      }

      if (aiSceneType === SceneType.LOCATION_CHANGE) {
        baseNewScene.newLocationName = (generatedDetails as GeminiSceneLocationChange).newLocationName || '알 수 없는 장소';
      }
      // No specific data handling for TOWN here, title/content are primary.
      // const townDetails = generatedDetails as GeminiSceneTown; (if specific fields were added)

      onUpdateFullScene(baseNewScene);

    } catch (e: any) {
      setError(e.message || `AI로 ${aiSceneType} 장면 생성에 실패했습니다.`);
    } finally {
      setIsLoading(false);
    }
  };


  return (
    <div className="h-full flex flex-col">
      <div className="mb-6 pb-4 border-b border-gray-600">
        <div className="flex justify-between items-center">
            <h3 className="text-3xl font-bold text-purple-400 truncate">{stage.title}</h3>
            <Button onClick={onManageCharacters} variant="secondary" leftIcon={<UsersIcon className="w-5 h-5"/>}>
                캐릭터 관리
            </Button>
        </div>
        <p className="text-gray-400 mt-1">{stage.settingDescription}</p>
      </div>

      <div className="mb-4 p-3 bg-gray-800 rounded-md shadow flex flex-col md:flex-row gap-3 items-stretch md:items-end">
        <div className="relative flex-shrink-0">
          <Button onClick={() => setShowAddSceneDropdown(!showAddSceneDropdown)} variant="primary" leftIcon={<PlusIcon className="w-5 h-5"/>}>
            수동으로 장면 추가
          </Button>
          {showAddSceneDropdown && (
            <div className="absolute left-0 mt-2 w-48 bg-gray-600 border border-gray-500 rounded-md shadow-lg z-10 py-1">
              {sceneTypes.map((type) => ( // sceneTypes are now Korean labels directly
                <a
                  key={type}
                  href="#"
                  onClick={(e) => { e.preventDefault(); handleAddSceneWithType(type as SceneType); }}
                  className="block px-4 py-2 text-sm text-gray-200 hover:bg-purple-500 hover:text-white"
                >
                  {type}
                </a>
              ))}
            </div>
          )}
        </div>
        <div className="flex-grow">
            <Select
                label="AI 장면 유형"
                value={aiSceneType}
                onChange={(e) => setAiSceneType(e.target.value as SceneType)}
                options={sceneTypes.map(st => ({value: st, label: st}))} // Enum values are labels
                wrapperClassName="mb-1 md:mb-0"
            />
        </div>
         <input
            type="text"
            value={aiScenePrompt}
            onChange={(e) => setAiScenePrompt(e.target.value)}
            placeholder="선택: AI 프롬프트 컨텍스트 (예: '긴장감 넘치는 발견')"
            className="flex-grow p-2.5 bg-gray-700 border border-gray-600 rounded-md placeholder-gray-400 focus:ring-purple-500 focus:border-purple-500 min-w-[200px]"
        />
        <Button
            onClick={handleGenerateSceneAI}
            variant="success"
            leftIcon={<AISparklesIcon className="w-5 h-5" />}
            disabled={!worldSettings || !worldSettings.title}
            className="w-full md:w-auto flex-shrink-0"
        >
            AI로 장면 생성
        </Button>
      </div>
      {(!worldSettings || !worldSettings.title) && <p className="text-xs text-yellow-400 mb-3 -mt-2 text-center md:text-left">AI 장면 생성을 사용하려면 세계관 설정을 정의하세요.</p>}


      {stage.scenes.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center text-gray-500">
          <EditIcon className="w-16 h-16 mb-4 opacity-50" />
          <p className="text-lg">이 스테이지에는 아직 장면이 없습니다.</p>
          <p>수동으로 장면을 추가하거나 AI를 사용하여 시작하세요!</p>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto space-y-3 pr-1">
          {stage.scenes.map((scene) => (
            <SceneCard
              key={scene.id}
              scene={scene}
              isSelected={selectedSceneId === scene.id}
              onSelect={() => onSelectScene(scene.id)}
              onDelete={() => onDeleteScene(scene.id)}
              stageCharacters={stage.characters}
              allScenesInStage={stage.scenes}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default StageEditorPanel;
