
import React, { useState, useEffect, useCallback } from 'react';
import { Project, Stage, Scene, SceneType, Character, CharacterType } from '../types';
import Modal from './shared/Modal';
import Button from './shared/Button';
import { AISparklesIcon, PlayIcon, LinkIcon, UsersIcon, TrashIcon } from './shared/icons/Icons'; // Assuming some icons might be useful

interface ScriptPlayerModalProps {
  isOpen: boolean;
  onClose: () => void;
  project: Project;
  startStageId: string | null;
}

const ScriptPlayerModal: React.FC<ScriptPlayerModalProps> = ({
  isOpen,
  onClose,
  project,
  startStageId,
}) => {
  const [currentStage, setCurrentStage] = useState<Stage | null>(null);
  const [currentScene, setCurrentScene] = useState<Scene | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [townServiceMessage, setTownServiceMessage] = useState<string | null>(null);
  const [isOfferingRegularCombatRepeat, setIsOfferingRegularCombatRepeat] =
    useState<{ scene: Scene, originalNextSceneId: string | null | undefined } | null>(null);

  const findSceneById = useCallback((sceneId: string, stage: Stage | null): Scene | null => {
    return stage?.scenes.find(s => s.id === sceneId) || null;
  }, []);

  const isLastSceneOfProject = useCallback((sceneToCheck: Scene | null, stage: Stage | null, proj: Project): boolean => {
    if (!sceneToCheck || !stage) return false;
    const currentStageIndex = proj.stages.findIndex(s => s.id === stage.id);
    if (currentStageIndex === -1) return false;

    const isLastStage = currentStageIndex === proj.stages.length - 1;
    if (!isLastStage) return false;

    return stage.scenes.length > 0 && stage.scenes[stage.scenes.length - 1].id === sceneToCheck.id;
  }, []);


  useEffect(() => {
    if (isOpen && startStageId && project) {
      const stage = project.stages.find(s => s.id === startStageId);
      if (stage) {
        setCurrentStage(stage);
        if (stage.scenes.length > 0) {
          setCurrentScene(stage.scenes[0]);
          setErrorMessage(null);
        } else {
          setCurrentScene(null);
          setErrorMessage("이 스테이지에는 장면이 없습니다.");
        }
      } else {
        setCurrentStage(null);
        setCurrentScene(null);
        setErrorMessage("플레이할 스테이지를 찾을 수 없습니다.");
      }
    } else {
      setCurrentStage(null);
      setCurrentScene(null);
      setErrorMessage(null);
      setIsOfferingRegularCombatRepeat(null);
      setTownServiceMessage(null);
    }
  }, [isOpen, startStageId, project]);

  const executeEndOfPathLogic = useCallback((sceneThatEnded: Scene | null) => {
    if (
      sceneThatEnded &&
      sceneThatEnded.type === SceneType.BOSS_COMBAT &&
      currentStage &&
      currentStage.scenes.length > 0 &&
      currentStage.scenes[currentStage.scenes.length - 1].id === sceneThatEnded.id
    ) {
      const currentStageIndex = project.stages.findIndex(s => s.id === currentStage.id);
      if (currentStageIndex !== -1 && currentStageIndex < project.stages.length - 1) {
        const nextStage = project.stages[currentStageIndex + 1];
        setCurrentStage(nextStage);
        if (nextStage.scenes.length > 0) {
          setCurrentScene(nextStage.scenes[0]);
          setErrorMessage(null);
        } else {
          setCurrentScene(null);
          setErrorMessage(`다음 스테이지 "${nextStage.title}"에는 장면이 없습니다.`);
        }
      } else {
        setCurrentScene(null);
        setErrorMessage(null); 
      }
    } else {
      setCurrentScene(null);
      setErrorMessage(null);
    }
    setTownServiceMessage(null);
    setIsOfferingRegularCombatRepeat(null);
  }, [project, currentStage, setCurrentStage, setCurrentScene, setErrorMessage, setTownServiceMessage, setIsOfferingRegularCombatRepeat]);


  const handleDefeat = useCallback(() => {
    if (!currentStage || !currentScene) {
      setErrorMessage("패배 처리를 할 현재 장면이나 스테이지가 없습니다.");
      return;
    }

    setIsOfferingRegularCombatRepeat(null);
    setTownServiceMessage(null);
    setErrorMessage(null);

    const scenesInCurrentStage = currentStage.scenes;
    const currentSceneIndex = scenesInCurrentStage.findIndex(s => s.id === currentScene.id);

    if (currentSceneIndex === -1) {
        setErrorMessage("현재 장면을 스테이지에서 찾을 수 없습니다.");
        setCurrentScene(null);
        return;
    }

    // Search backwards for a Town scene
    for (let i = currentSceneIndex - 1; i >= 0; i--) {
      if (scenesInCurrentStage[i].type === SceneType.TOWN) {
        setCurrentScene(scenesInCurrentStage[i]);
        return;
      }
    }

    // If no Town scene is found, go to the first scene of the current stage
    if (scenesInCurrentStage.length > 0) {
      setCurrentScene(scenesInCurrentStage[0]);
    } else {
      // This case should ideally not be reached if a combat scene was active
      setErrorMessage("현재 스테이지에 돌아갈 장면이 없습니다.");
      setCurrentScene(null);
    }
  }, [currentStage, currentScene, setCurrentScene, setErrorMessage, setIsOfferingRegularCombatRepeat, setTownServiceMessage]);


  const handleNavigate = useCallback((navigateToSceneId?: string | null) => {
    setTownServiceMessage(null); // Clear any town service messages on navigation attempt
    setErrorMessage(null);
    
    // Phase 1: Handle choices from a Regular Combat Repeat Offer
    if (isOfferingRegularCombatRepeat) {
      const sceneThatOfferedRepeat = isOfferingRegularCombatRepeat.scene;
      const originalNextSceneIdAfterRepeat = isOfferingRegularCombatRepeat.originalNextSceneId;
      setIsOfferingRegularCombatRepeat(null); // Consume the state

      if (navigateToSceneId === 'RETRY_COMBAT') {
        setCurrentScene(null);
        setTimeout(() => setCurrentScene(sceneThatOfferedRepeat), 0);
        return;
      } else if (navigateToSceneId === 'PROCEED_FROM_COMBAT') {
        if (originalNextSceneIdAfterRepeat) {
            const nextSceneObject = findSceneById(originalNextSceneIdAfterRepeat, currentStage);
            if (nextSceneObject) {
                setCurrentScene(nextSceneObject);
            } else {
                setCurrentScene(null);
                setErrorMessage(`다음 장면을 찾을 수 없습니다 (ID: ${originalNextSceneIdAfterRepeat}). 경로가 끊겼을 수 있습니다.`);
            }
        } else {
            executeEndOfPathLogic(sceneThatOfferedRepeat);
        }
        return;
      }
    }

    // Phase 2: If current scene is a REGULAR_COMBAT, offer repeat.
    // This activates when player clicks the generic "Next/Proceed" button for this combat scene.
    if (
      currentScene &&
      currentScene.type === SceneType.REGULAR_COMBAT &&
      !isLastSceneOfProject(currentScene, currentStage, project) &&
      (navigateToSceneId === undefined || navigateToSceneId === currentScene.nextSceneId) // Make sure it's the "Next" button click, not a choice
    ) {
      setIsOfferingRegularCombatRepeat({
          scene: currentScene,
          originalNextSceneId: currentScene.nextSceneId
      });
      return;
    }

    // Phase 3: Determine the actual next scene ID for normal navigation (not a repeat offer scenario)
    let actualNextSceneId: string | null | undefined;
    if (navigateToSceneId !== undefined) { // This handles choices, or explicit nextSceneId from town/defeat
        actualNextSceneId = navigateToSceneId;
    } else if (currentScene && currentScene.type !== SceneType.CHOICE) { // Standard linear progression
        actualNextSceneId = currentScene.nextSceneId;
    } else { // Choice scene without a choice made (should not happen if buttons are correct) or other dead end
        actualNextSceneId = null;
    }

    // Phase 4: Handle navigation to the next scene or true end of path
    if (!actualNextSceneId) {
      executeEndOfPathLogic(currentScene);
      return;
    }

    const nextSceneObject = findSceneById(actualNextSceneId, currentStage);
    if (nextSceneObject) {
      setCurrentScene(nextSceneObject);
    } else {
      setCurrentScene(null);
      setErrorMessage(`다음 장면을 찾을 수 없습니다 (ID: ${actualNextSceneId}). 경로가 끊겼을 수 있습니다.`);
    }
  }, [
    currentScene,
    currentStage,
    project,
    isOfferingRegularCombatRepeat,
    findSceneById,
    isLastSceneOfProject,
    executeEndOfPathLogic,
    setIsOfferingRegularCombatRepeat,
    setCurrentScene,
    setErrorMessage,
    setTownServiceMessage
  ]);


  const getCharacterName = (characterId: string): string => {
    return currentStage?.characters.find(c => c.id === characterId)?.name || "알 수 없는 캐릭터";
  };

  const handleTownService = (service: 'shop' | 'inn') => {
    if (service === 'shop') {
        setTownServiceMessage("상점 기능은 아직 준비 중입니다.");
    } else if (service === 'inn') {
        setTownServiceMessage("여관에서 편안하게 휴식을 취했습니다. (HP/MP 회복 등 효과는 미구현)");
    }
  };

  const renderSceneContent = () => {
    if (isOfferingRegularCombatRepeat) {
      const combatScene = isOfferingRegularCombatRepeat.scene;
      return (
        <div className="space-y-4 p-2 text-center">
          <h3 className="text-2xl font-semibold text-purple-300 mb-1">{combatScene.title} 완료!</h3>
           <div className="text-gray-200 text-lg leading-relaxed whitespace-pre-wrap bg-gray-700 p-4 rounded-md min-h-[50px]">
             전투에서 승리했습니다!
            {combatScene.combatDetails?.reward && (
                <p className="text-sm text-yellow-300 mt-2">획득 보상: {combatScene.combatDetails.reward}</p>
            )}
           </div>
          <div className="mt-8 pt-4 border-t border-gray-600 space-y-3">
            <Button
              onClick={() => handleNavigate('RETRY_COMBAT')}
              variant="primary"
              className="w-full py-3"
            >
              다시 싸우기
            </Button>
            <Button
              onClick={() => handleNavigate('PROCEED_FROM_COMBAT')}
              variant="secondary"
              className="w-full py-3"
            >
              계속 진행
            </Button>
          </div>
        </div>
      );
    }

    if (!currentScene || !currentStage) {
      return (
        <div className="text-center py-10">
          {errorMessage ? (
            <p className="text-red-400 text-lg">{errorMessage}</p>
          ) : (
            currentStage && currentStage.scenes.length === 0 ?
              <p className="text-yellow-400 text-lg">이 스테이지에는 장면이 없습니다.</p>
            : !currentStage ?
              <p className="text-gray-400 text-lg">플레이할 스테이지를 불러오는 중...</p>
            :
              <p className="text-yellow-400 font-semibold py-3 text-lg">경로의 끝입니다. 플레이해주셔서 감사합니다!</p>
          )}
           {(errorMessage || (!currentScene && !isOfferingRegularCombatRepeat)) && // Show "End Playtest" if error or true end.
             <Button onClick={onClose} variant="danger" className="w-1/2 mx-auto mt-6">
                플레이테스트 종료
             </Button>
           }
        </div>
      );
    }

    let speakerName: string | null = null;
    if (currentScene.type === SceneType.DIALOGUE && currentScene.characterIds && currentScene.characterIds.length > 0) {
        const speaker = currentStage.characters.find(c => c.id === currentScene.characterIds![0]);
        if (speaker) speakerName = speaker.name;
    }

    const isCombatScene = currentScene.type === SceneType.REGULAR_COMBAT || currentScene.type === SceneType.BOSS_COMBAT;

    return (
      <div className="space-y-4 p-2">
        <h3 className="text-2xl font-semibold text-purple-300 mb-1">{currentScene.title}</h3>
        <p className="text-sm text-gray-500 italic">({currentScene.type})</p>

        {speakerName && (
          <p className="text-lg font-semibold text-yellow-400">{speakerName}:</p>
        )}
        <div className="text-gray-200 text-lg leading-relaxed whitespace-pre-wrap bg-gray-700 p-4 rounded-md min-h-[100px]">
          {currentScene.content}
        </div>

        {townServiceMessage && (
            <div className="mt-2 p-3 bg-blue-800 text-blue-100 rounded-md text-center">
                {townServiceMessage}
            </div>
        )}

        {currentScene.type === SceneType.ITEM_ACQUISITION && currentScene.item && (
            <p className="text-md text-green-400 mt-2">✨ <strong>아이템 획득:</strong> {currentScene.item}</p>
        )}
        {currentScene.type === SceneType.LOCATION_CHANGE && currentScene.newLocationName && (
            <p className="text-md text-blue-400 mt-2">🗺️ <strong>장소 변경:</strong> {currentScene.newLocationName}(으)로 이동합니다.</p>
        )}
        {isCombatScene && currentScene.combatDetails && (
            <div className="mt-3 p-3 bg-gray-750 rounded">
                <h4 className="text-md font-semibold text-red-400 mb-1">⚔️ 전투 발생!</h4>
                <p className="text-sm text-gray-300"><strong>적:</strong> {currentScene.combatDetails.enemyCharacterIds.map(id => getCharacterName(id)).join(', ') || "정의되지 않음"}</p>
                {currentScene.combatDetails.reward && <p className="text-sm text-gray-300"><strong>보상 (예상):</strong> {currentScene.combatDetails.reward}</p>}
            </div>
        )}

        <div className="mt-8 pt-4 border-t border-gray-600">
          {currentScene.type === SceneType.CHOICE && currentScene.choices && currentScene.choices.length > 0 ? (
            <div className="space-y-3">
              {currentScene.choices.map(choice => (
                <Button
                  key={choice.id}
                  onClick={() => handleNavigate(choice.nextSceneId)}
                  variant="secondary"
                  className="w-full text-left justify-start py-3"
                >
                  {choice.text}
                </Button>
              ))}
            </div>
          ) : currentScene.type === SceneType.TOWN ? (
            <div className="space-y-3">
                <Button onClick={() => handleTownService('shop')} variant="success" className="w-full py-3">상점 이용</Button>
                <Button onClick={() => handleTownService('inn')} variant="info" className="w-full py-3">여관에서 휴식</Button>
                <Button
                    onClick={() => handleNavigate(currentScene.nextSceneId)}
                    variant="primary"
                    className="w-full py-3 mt-2"
                >
                  {currentScene.nextSceneId ? '마을 밖으로 나가기 (다음)' : '계속 (경로 끝)'}
                </Button>
            </div>
          ) : (
            <div className="space-y-3">
              <Button
                  onClick={() => handleNavigate(currentScene.nextSceneId)}
                  variant="primary"
                  className="w-full py-3"
              >
                {currentScene.nextSceneId ? '다음' : (isCombatScene ? '승리 (다음)' : '계속 (경로 끝)')}
              </Button>
              {isCombatScene && (
                <Button
                    onClick={handleDefeat}
                    variant="danger"
                    className="w-full py-3"
                >
                    패배 (마을 귀환)
                </Button>
              )}
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`스테이지 플레이: ${currentStage?.title || '로딩 중...'}`} size="xl">
      <div className="min-h-[60vh] max-h-[80vh] flex flex-col">
        <div className="flex-grow overflow-y-auto p-1">
         {renderSceneContent()}
        </div>
        {!isOfferingRegularCombatRepeat && currentScene && // Only show global close if not in repeat offer and there's a current scene
            <div className="pt-4 mt-auto border-t border-gray-700">
            <Button onClick={onClose} variant="danger" className="w-full">
                플레이테스트 종료
            </Button>
            </div>
        }
      </div>
    </Modal>
  );
};

export default ScriptPlayerModal;
