
import React, { useState, useEffect, ChangeEvent } from 'react';
import { Scene, Stage, SceneType, DialogueChoice, WorldSettings, Character, CharacterType, GeminiSceneNarration, GeminiSceneDialogue, GeminiSceneChoice, GeminiSceneCombat, GeminiSceneItemAcquisition, GeminiSceneLocationChange, GeminiSceneTown } from '../types';
import Button from './shared/Button';
import Input from './shared/Input';
import TextArea from './shared/TextArea';
import Select from './shared/Select';
import { PlusIcon, TrashIcon, AISparklesIcon, LinkIcon, SaveIcon } from './shared/icons/Icons';
import { generateId } from '../utils/idGenerator';
import { generateSceneDetailsWithAI } from '../services/geminiService';


interface SceneEditorPanelProps {
  scene: Scene;
  stage: Stage; // To access characters and other scenes for linking
  allScenesInStage: Scene[];
  onUpdateScene: (scene: Scene) => void;
  worldSettings: WorldSettings | null;
  setIsLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
}

const SceneEditorPanel: React.FC<SceneEditorPanelProps> = ({
  scene,
  stage,
  allScenesInStage,
  onUpdateScene,
  worldSettings,
  setIsLoading,
  setError,
}) => {
  const [localScene, setLocalScene] = useState<Scene>(scene);

  useEffect(() => {
    setLocalScene(scene);
  }, [scene]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setLocalScene(prev => ({ ...prev, [name]: value }));
  };

  const handleTypeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newType = e.target.value as SceneType;
    setLocalScene(prev => ({
      ...prev,
      type: newType,
      choices: newType === SceneType.CHOICE ? (prev.choices || [{ id: generateId(), text: '새 선택지', nextSceneId: null }]) : undefined,
      combatDetails: (newType === SceneType.REGULAR_COMBAT || newType === SceneType.BOSS_COMBAT) ? (prev.combatDetails || { enemyCharacterIds: [], reward: '' }) : undefined,
      item: newType === SceneType.ITEM_ACQUISITION ? (prev.item || '') : undefined,
      newLocationName: newType === SceneType.LOCATION_CHANGE ? (prev.newLocationName || '') : undefined,
      // No specific fields for TOWN yet beyond standard ones.
      nextSceneId: (newType === SceneType.CHOICE) ? undefined : (prev.nextSceneId || null),
    }));
  };

  const handleChoiceTextChange = (choiceId: string, text: string) => {
    setLocalScene(prev => ({
      ...prev,
      choices: prev.choices?.map(c => c.id === choiceId ? { ...c, text } : c),
    }));
  };

  const handleChoiceLinkChange = (choiceId: string, nextSceneId: string | null) => {
    setLocalScene(prev => ({
      ...prev,
      choices: prev.choices?.map(c => c.id === choiceId ? { ...c, nextSceneId } : c),
    }));
  };

  const handleAddChoice = () => {
    setLocalScene(prev => ({
      ...prev,
      choices: [...(prev.choices || []), { id: generateId(), text: '새 선택지', nextSceneId: null }],
    }));
  };

  const handleDeleteChoice = (choiceId: string) => {
    setLocalScene(prev => ({
      ...prev,
      choices: prev.choices?.filter(c => c.id !== choiceId),
    }));
  };

  const handleCombatEnemyChange = (enemyId: string, add: boolean) => {
    setLocalScene(prev => ({
        ...prev,
        combatDetails: {
            ...(prev.combatDetails || { enemyCharacterIds: [], reward: '' }),
            enemyCharacterIds: add
                ? [...(prev.combatDetails?.enemyCharacterIds || []), enemyId]
                : (prev.combatDetails?.enemyCharacterIds || []).filter(id => id !== enemyId)
        }
    }));
  };

  const availableScenesForLinking = allScenesInStage
    .filter(s => s.id !== localScene.id)
    .map(s => ({ value: s.id, label: s.title }));

  const availableMonsters = stage.characters
    .filter(c => c.type === CharacterType.REGULAR_MONSTER || c.type === CharacterType.BOSS_MONSTER)
    .map(c => ({ value: c.id, label: `${c.name} (${c.type === CharacterType.BOSS_MONSTER ? '보스' : '일반'})` }));


  const handleSaveChanges = () => {
    onUpdateScene(localScene);
  };

  const handleGenerateContentAI = async () => {
    if (!worldSettings) {
      setError("AI 생성을 위해서는 세계관 설정이 필요합니다.");
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const details = await generateSceneDetailsWithAI(worldSettings, stage, localScene.type, `"${localScene.title}" 장면의 내용을 생성하거나 개선합니다.`);

      let updatedSceneWithAIData: Scene = {
        ...localScene,
        title: details.title || localScene.title,
        content: details.content || localScene.content,
      };

      if (localScene.type === SceneType.CHOICE && (details as GeminiSceneChoice).choices) {
        updatedSceneWithAIData.choices = (details as GeminiSceneChoice).choices.map(c => ({ id: generateId(), text: c.text, nextSceneId: null }));
      } else if (localScene.type !== SceneType.CHOICE) {
        updatedSceneWithAIData.choices = undefined;
      }


      if (localScene.type === SceneType.REGULAR_COMBAT || localScene.type === SceneType.BOSS_COMBAT) {
        const combatDetailsFromAI = details as GeminiSceneCombat;
        updatedSceneWithAIData.combatDetails = {
            ...(updatedSceneWithAIData.combatDetails || { enemyCharacterIds: [] }),
            reward: combatDetailsFromAI.reward || updatedSceneWithAIData.combatDetails?.reward || ''
        };
      } else {
         updatedSceneWithAIData.combatDetails = undefined;
      }

      if (localScene.type === SceneType.ITEM_ACQUISITION) {
        updatedSceneWithAIData.item = (details as GeminiSceneItemAcquisition).itemName || localScene.item || '';
      } else {
        updatedSceneWithAIData.item = undefined;
      }

      if (localScene.type === SceneType.LOCATION_CHANGE) {
        updatedSceneWithAIData.newLocationName = (details as GeminiSceneLocationChange).newLocationName || localScene.newLocationName || '';
      } else {
        updatedSceneWithAIData.newLocationName = undefined;
      }

      // No specific handling for TOWN scene type AI content update beyond title/content
      // as GeminiSceneTown only returns title/content.

      setLocalScene(updatedSceneWithAIData);

    } catch (e: any) {
      setError(e.message || "AI로 장면 내용 생성에 실패했습니다.");
    } finally {
      setIsLoading(false);
    }
  };

  const sceneTypeOptions = Object.values(SceneType).map(st => ({ value: st, label: st }));


  return (
    <div className="p-1 h-full flex flex-col">
      <h3 className="text-xl font-semibold mb-4 text-purple-400">장면 편집: {scene.title}</h3>
      <div className="flex-grow overflow-y-auto space-y-4 pr-2">
        <Input label="제목" name="title" value={localScene.title} onChange={handleInputChange} />

        <Select
          label="장면 유형"
          name="type"
          value={localScene.type}
          onChange={handleTypeChange}
          options={sceneTypeOptions}
        />

        <TextArea label="내용 / 설명" name="content" value={localScene.content} onChange={handleInputChange} rows={5} />
        <Button onClick={handleGenerateContentAI} variant="ghost" size="sm" leftIcon={<AISparklesIcon className="w-4 h-4" />} disabled={!worldSettings}>
            AI로 내용 생성/개선
        </Button>

        {localScene.type !== SceneType.CHOICE && (
          <Select
            label="다음 장면"
            name="nextSceneId"
            value={localScene.nextSceneId || ''}
            onChange={(e) => setLocalScene(prev => ({ ...prev, nextSceneId: e.target.value || null }))}
            options={[{value: '', label: '없음 (경로 끝)'}, ...availableScenesForLinking]}
            placeholder="다음 장면 선택"
            leftIcon={<LinkIcon className="w-4 h-4 text-gray-300"/>}
          />
        )}

        {localScene.type === SceneType.CHOICE && (
          <div>
            <h4 className="text-md font-semibold mt-3 mb-2 text-gray-300">선택지</h4>
            {localScene.choices?.map((choice, index) => (
              <div key={choice.id} className="p-3 bg-gray-700 rounded-md mb-3 space-y-2">
                <Input
                  label={`선택지 ${index + 1} 텍스트`}
                  value={choice.text}
                  onChange={(e) => handleChoiceTextChange(choice.id, e.target.value)}
                />
                <Select
                  label="이어지는 장면"
                  value={choice.nextSceneId || ''}
                  onChange={(e) => handleChoiceLinkChange(choice.id, e.target.value || null)}
                  options={[{value: '', label: '없음 (경로 끝)'}, ...availableScenesForLinking]}
                  placeholder="이어지는 장면 선택"
                />
                <Button onClick={() => handleDeleteChoice(choice.id)} variant="danger" size="sm" leftIcon={<TrashIcon className="w-4 h-4"/>}>
                  선택지 삭제
                </Button>
              </div>
            ))}
            <Button onClick={handleAddChoice} variant="secondary" size="sm" leftIcon={<PlusIcon className="w-4 h-4"/>}>
              선택지 추가
            </Button>
          </div>
        )}

        {localScene.type === SceneType.ITEM_ACQUISITION && (
            <Input label="아이템 이름" name="item" value={localScene.item || ''} onChange={handleInputChange} placeholder="예: 회복 물약"/>
        )}

        {localScene.type === SceneType.LOCATION_CHANGE && (
            <Input label="새 장소 이름" name="newLocationName" value={localScene.newLocationName || ''} onChange={handleInputChange} placeholder="예: 비밀의 숲"/>
        )}

        {(localScene.type === SceneType.REGULAR_COMBAT || localScene.type === SceneType.BOSS_COMBAT) && (
          <div>
            <h4 className="text-md font-semibold mt-3 mb-2 text-gray-300">{localScene.type === SceneType.BOSS_COMBAT ? "보스 전투 상세정보" : "일반 전투 상세정보"}</h4>
            <TextArea label="보상 설명" name="reward" value={localScene.combatDetails?.reward || ''}
                onChange={(e) => setLocalScene(prev => ({...prev, combatDetails: {...(prev.combatDetails || {enemyCharacterIds:[]}), reward: e.target.value }}))}
                rows={2} placeholder="예: 100 골드, 녹슨 검"
            />
            <div className="mt-2">
                <label className="block text-sm font-medium text-gray-300 mb-1">적</label>
                {availableMonsters.length === 0 && <p className="text-xs text-gray-400">이 스테이지에 정의된 몬스터가 없습니다. '캐릭터 관리'를 통해 추가하세요.</p>}
                <div className="max-h-32 overflow-y-auto space-y-1 bg-gray-700 p-2 rounded">
                {availableMonsters.map(monster => (
                    <div key={monster.value} className="flex items-center">
                        <input
                            type="checkbox"
                            id={`enemy-${monster.value}`}
                            className="mr-2 h-4 w-4 text-purple-600 bg-gray-600 border-gray-500 rounded focus:ring-purple-500"
                            checked={localScene.combatDetails?.enemyCharacterIds.includes(monster.value.toString())}
                            onChange={(e) => handleCombatEnemyChange(monster.value.toString(), e.target.checked)}
                        />
                        <label htmlFor={`enemy-${monster.value}`} className="text-sm text-gray-200">{monster.label}</label>
                    </div>
                ))}
                </div>
            </div>
          </div>
        )}

        { (localScene.type === SceneType.DIALOGUE || localScene.type === SceneType.NARRATION || localScene.type === SceneType.TOWN ) && stage.characters.filter(c => c.type === CharacterType.NPC).length > 0 && (
          // For Town, characterIds might be used for prominent NPCs or town elder, etc. Not strictly a "speaker" always.
          // Keeping it generic for now.
          <div>
            <h4 className="text-md font-semibold mt-3 mb-1 text-gray-300">관련 NPC (선택)</h4>
             <Select
                label="NPC 선택"
                value={localScene.characterIds?.[0] || ''}
                onChange={(e) => setLocalScene(prev => ({ ...prev, characterIds: e.target.value ? [e.target.value] : [] }))}
                options={[{value: '', label: '없음'}, ...stage.characters.filter(c => c.type === CharacterType.NPC).map(c => ({ value: c.id, label: c.name })) ]}
                placeholder="관련 NPC 선택"
            />
            <p className="text-xs text-gray-400 mt-1">대화 장면의 경우 화자, 마을 장면의 경우 주요 NPC 등을 선택할 수 있습니다.</p>
          </div>
        )}


      </div>
      <div className="mt-auto pt-4 border-t border-gray-700">
        <Button onClick={handleSaveChanges} variant="success" className="w-full" leftIcon={<SaveIcon className="w-5 h-5"/>}>
          장면 변경사항 저장
        </Button>
      </div>
    </div>
  );
};

export default SceneEditorPanel;