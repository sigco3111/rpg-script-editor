
import React, { useState, useCallback, useEffect, useRef } from 'react';
import { WorldSettings, Stage, Scene, Project, EditorSelection, SceneType, Character, ProcessedWizardData } from './types';
import { initialWorldSettings, initialProject, saveUserApiKey, isApiKeyEffectivelyConfigured, PLACEHOLDER_API_KEY, getEffectiveApiKey, USER_API_KEY_LOCAL_STORAGE_KEY } from './constants';
import WorldSettingsPanel from './components/WorldSettingsPanel';
import StageListPanel from './components/StageListPanel';
import StageEditorPanel from './components/StageEditorPanel';
import SceneEditorPanel from './components/SceneEditorPanel';
import CharacterManagerModal from './components/CharacterManagerModal';
import ScriptPlayerModal from './components/ScriptPlayerModal';
import Modal from './components/shared/Modal'; // Import Modal for custom confirm
import Button from './components/shared/Button'; // Import Button for modal and API Key save
import { saveProjectToLocalStorage, loadProjectFromLocalStorage } from './services/localStorageService';
import { generateId } from './utils/idGenerator';
import { AISparklesIcon, SaveIcon, FolderOpenIcon, DownloadIcon, UploadIcon } from './components/shared/icons/Icons';

// Type for custom confirmation modal state
interface ConfirmModalState {
  isOpen: boolean;
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel?: () => void;
  confirmText?: string;
  cancelText?: string;
  confirmButtonVariant?: 'primary' | 'secondary' | 'danger' | 'success';
}

const App: React.FC = () => {
  const [project, setProject] = useState<Project>(loadProjectFromLocalStorage() || initialProject);
  const [selectedStageId, setSelectedStageId] = useState<string | null>(null);
  const [selectedSceneId, setSelectedSceneId] = useState<string | null>(null);
  const [isCharacterManagerOpen, setIsCharacterManagerOpen] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const [editorSelection, setEditorSelection] = useState<EditorSelection>({ type: null, id: null });

  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isPlayerOpen, setIsPlayerOpen] = useState<boolean>(false);
  const [playtestStageId, setPlaytestStageId] = useState<string | null>(null);

  const [userInputApiKey, setUserInputApiKey] = useState<string>(getEffectiveApiKey() !== PLACEHOLDER_API_KEY ? getEffectiveApiKey() : '');

  const [confirmModalState, setConfirmModalState] = useState<ConfirmModalState | null>(null);

  const handleSaveApiKey = () => {
    if (userInputApiKey.trim()) {
      saveUserApiKey(userInputApiKey.trim());
      alert("API 키가 로컬 스토리지에 저장되었습니다. 이제 AI 기능을 사용할 수 있습니다.");
    } else {
      saveUserApiKey('');
      alert("API 키가 로컬 스토리지에서 제거되었습니다. 환경 변수 키가 사용되거나, 키를 다시 입력해주세요.");
    }
    setUserInputApiKey(getEffectiveApiKey() !== PLACEHOLDER_API_KEY ? getEffectiveApiKey() : '');
  };


  useEffect(() => {
    saveProjectToLocalStorage(project);
  }, [project]);

  const handleSetWorldSettings = useCallback((settings: WorldSettings) => {
    setProject(prev => ({ ...prev, worldSettings: settings }));
    setEditorSelection({ type: null, id: null });
  }, []);

  const handleAddStage = useCallback((stage: Stage) => {
    setProject(prev => ({ ...prev, stages: [...prev.stages, stage] }));
  }, []);

  const handleUpdateStage = useCallback((updatedStage: Stage) => {
    setProject(prev => ({
      ...prev,
      stages: prev.stages.map(s => s.id === updatedStage.id ? updatedStage : s),
    }));
  }, []);

  const handleDeleteStage = useCallback((stageId: string) => {
    setProject(prev => ({
      ...prev,
      stages: prev.stages.filter(s => s.id !== stageId),
    }));
    if (selectedStageId === stageId) {
      setSelectedStageId(null);
      setSelectedSceneId(null);
      setEditorSelection({ type: null, id: null });
    }
    if (playtestStageId === stageId) {
      setIsPlayerOpen(false);
      setPlaytestStageId(null);
    }
  }, [selectedStageId, playtestStageId]);

  const handleAddScene = useCallback((stageId: string, scene: Scene) => {
    setProject(prev => ({
      ...prev,
      stages: prev.stages.map(s =>
        s.id === stageId ? { ...s, scenes: [...s.scenes, scene] } : s
      ),
    }));
  }, []);

  const handleUpdateScene = useCallback((stageId: string, updatedScene: Scene) => {
    setProject(prev => ({
      ...prev,
      stages: prev.stages.map(s =>
        s.id === stageId
          ? { ...s, scenes: s.scenes.map(sc => sc.id === updatedScene.id ? updatedScene : sc) }
          : s
      ),
    }));
  }, []);

  const handleDeleteScene = useCallback((stageId: string, sceneId: string) => {
    setProject(prev => ({
      ...prev,
      stages: prev.stages.map(s =>
        s.id === stageId
          ? { ...s, scenes: s.scenes.filter(sc => sc.id !== sceneId) }
          : s
      ),
    }));
    if (editorSelection.type === 'scene' && editorSelection.id === sceneId) {
      setSelectedSceneId(null);
      if (selectedStageId) {
        setEditorSelection({ type: 'stage', id: selectedStageId });
      } else {
        setEditorSelection({ type: null, id: null });
      }
    }
  }, [editorSelection, selectedStageId]);

  const handleSelectStage = useCallback((stageId: string | null) => {
    setSelectedStageId(stageId);
    setSelectedSceneId(null);
    if (stageId) {
      setEditorSelection({ type: 'stage', id: stageId });
    } else {
      setEditorSelection({ type: null, id: null });
    }
  }, []);

  const handleSelectScene = useCallback((sceneId: string | null) => {
    setSelectedSceneId(sceneId);
    if (sceneId) {
      setEditorSelection({ type: 'scene', id: sceneId });
    } else if (selectedStageId) {
      setEditorSelection({ type: 'stage', id: selectedStageId });
    } else {
      setEditorSelection({ type: null, id: null });
    }
  }, [selectedStageId]);


  const handleManageCharacters = useCallback((stageId: string) => {
    setIsCharacterManagerOpen(true);
  }, []);

  const handleUpdateStageCharacters = useCallback((stageId: string, characters: Character[]) => {
    setProject(prev => ({
      ...prev,
      stages: prev.stages.map(s => s.id === stageId ? { ...s, characters } : s),
    }));
  }, []);

  const handleAddCompleteSceneObject = useCallback((newScene: Scene) => {
    if (!newScene.stageId) {
      console.error("Error: Scene object provided to handleAddCompleteSceneObject is missing stageId.", newScene);
      setError("생성된 장면을 추가하는 중 오류 발생: 스테이지 ID가 누락되었습니다.");
      return;
    }
    setProject(prev => ({
      ...prev,
      stages: prev.stages.map(s =>
        s.id === newScene.stageId ? { ...s, scenes: [...s.scenes, newScene] } : s
      ),
    }));
    handleSelectScene(newScene.id);
  }, [handleSelectScene]);

  const handleAddFullGeneratedStage = useCallback((data: ProcessedWizardData) => {
    const newStageId = generateId();
    const finalScenes = data.scenes.map(scene => ({
      ...scene,
      stageId: newStageId
    }));

    const newStage: Stage = {
      id: newStageId,
      title: data.stageDetails.title,
      settingDescription: data.stageDetails.settingDescription,
      characters: data.characters,
      scenes: finalScenes,
    };

    setProject(prev => ({
      ...prev,
      stages: [...prev.stages, newStage]
    }));
    handleSelectStage(newStageId);
  }, [handleSelectStage]);

  const selectedStage = project.stages.find(s => s.id === selectedStageId);
  const selectedScene = selectedStage?.scenes.find(s => s.id === selectedSceneId);

  const clearProject = () => {
    const doClear = () => {
      setProject(initialProject);
      setSelectedStageId(null);
      setSelectedSceneId(null);
      setEditorSelection({ type: null, id: null });
      setIsPlayerOpen(false);
      setPlaytestStageId(null);
    };

    setConfirmModalState({
      isOpen: true,
      title: "새 프로젝트",
      message: "새 프로젝트를 시작하시겠습니까? 저장되지 않은 모든 변경 사항이 손실됩니다.",
      onConfirm: doClear,
      confirmText: "새로 만들기",
      cancelText: "취소",
      confirmButtonVariant: "danger"
    });
  };

  const handleExportProject = () => {
    try {
      const projectJson = JSON.stringify(project, null, 2);
      const blob = new Blob([projectJson], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${project.worldSettings?.title || 'RPG'}-프로젝트.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      setError(null);
    } catch (e) {
      console.error("프로젝트 내보내기 실패:", e);
      setError("프로젝트 내보내기에 실패했습니다.");
    }
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    const currentFileInput = event.target; // Capture the input element

    if (!file) {
      if (currentFileInput) currentFileInput.value = ''; // Reset if no file selected
      return;
    }

    const proceedWithImport = (selectedFile: File) => {
      setIsLoading(true);
      setError(null);
      const reader = new FileReader();

      reader.onload = (e_reader) => {
        try {
          const text = e_reader.target?.result as string;
          const importedProject = JSON.parse(text) as Project;

          if (importedProject && typeof importedProject.worldSettings !== 'undefined' && Array.isArray(importedProject.stages)) {
            setProject(importedProject);
            
            if (importedProject.stages.length > 0) {
              const firstStage = importedProject.stages[0];
              setSelectedStageId(firstStage.id);
              if (firstStage.scenes.length > 0) {
                const firstSceneId = firstStage.scenes[0].id;
                setSelectedSceneId(firstSceneId);
                setEditorSelection({ type: 'scene', id: firstSceneId });
              } else {
                setSelectedSceneId(null);
                setEditorSelection({ type: 'stage', id: firstStage.id });
              }
            } else {
              setSelectedStageId(null);
              setSelectedSceneId(null);
              setEditorSelection({ type: null, id: null });
            }
            
            setIsPlayerOpen(false);
            setPlaytestStageId(null);
            alert("프로젝트를 성공적으로 가져왔습니다!");
          } else {
            throw new Error("가져온 파일의 형식이 올바르지 않습니다. 'worldSettings'와 'stages' 속성을 포함해야 합니다.");
          }
        } catch (err: any) {
          console.error("프로젝트 가져오기 실패:", err);
          setError(`프로젝트 가져오기 실패: ${err.message}`);
        } finally {
          setIsLoading(false);
          if (currentFileInput) currentFileInput.value = ''; // Correctly reset the input here
        }
      };

      reader.onerror = () => {
        setError("파일 읽기 중 오류가 발생했습니다.");
        setIsLoading(false);
        if (currentFileInput) currentFileInput.value = ''; // Reset on error
      };
      reader.readAsText(selectedFile);
    };

    setConfirmModalState({
        isOpen: true,
        title: "프로젝트 가져오기",
        message: "프로젝트를 가져오시겠습니까? 현재 작업 내용은 덮어쓰여집니다. 계속하시겠습니까?",
        onConfirm: () => {
          proceedWithImport(file);
        },
        onCancel: () => {
          if (currentFileInput) currentFileInput.value = ''; 
        },
        confirmText: "가져오기",
        cancelText: "취소",
        confirmButtonVariant: "primary"
    });
  };

  const handleOpenPlayer = useCallback((stageId: string) => {
    const stageToPlay = project.stages.find(s => s.id === stageId);
    if (stageToPlay && stageToPlay.scenes.length > 0) {
      setPlaytestStageId(stageId);
      setIsPlayerOpen(true);
      setError(null);
    } else if (stageToPlay && stageToPlay.scenes.length === 0) {
        setError("이 스테이지에는 플레이할 장면이 없습니다. 먼저 장면을 추가해주세요.");
    } else {
      setError("플레이할 스테이지를 찾을 수 없습니다.");
    }
  }, [project.stages]);

  const handleClosePlayer = useCallback(() => {
    setIsPlayerOpen(false);
    setPlaytestStageId(null);
  }, []);


  return (
    <div className="flex flex-col h-screen bg-gray-900 text-gray-100 pb-14">
      <header className="bg-gray-800 p-4 shadow-md flex justify-between items-center">
        <h1 className="text-2xl font-bold text-purple-400 flex items-center">
          <AISparklesIcon className="w-8 h-8 mr-2 text-purple-500" /> RPG 스크립트 편집기
        </h1>
        <div className="flex items-center space-x-2">
           <Button
            onClick={clearProject}
            variant="danger" // Using Button component variant
            className="text-white font-semibold py-2 px-3 sm:px-4 rounded shadow flex items-center text-sm sm:text-base"
            title="새 프로젝트"
          >
            <FolderOpenIcon className="w-5 h-5 mr-1 sm:mr-2" /> <span className="hidden sm:inline">새로 만들기</span>
          </Button>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileImport}
            accept=".json"
            className="hidden"
          />
          <Button
            onClick={handleImportClick}
            variant="primary" // Using Button component variant
            className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-3 sm:px-4 rounded shadow flex items-center text-sm sm:text-base"
            title="프로젝트 가져오기"
          >
            <UploadIcon className="w-5 h-5 mr-1 sm:mr-2" /> <span className="hidden sm:inline">가져오기</span>
          </Button>
          <Button
            onClick={handleExportProject}
            variant="success" // Using Button component variant
            className="bg-green-600 hover:bg-green-700 text-white font-semibold py-2 px-3 sm:px-4 rounded shadow flex items-center text-sm sm:text-base"
            title="프로젝트 내보내기"
          >
            <DownloadIcon className="w-5 h-5 mr-1 sm:mr-2" /> <span className="hidden sm:inline">내보내기</span>
          </Button>
        </div>
      </header>

      {error && (
        <div className="bg-red-500 text-white p-3 text-center">
          오류: {error} <button onClick={() => setError(null)} className="ml-4 font-bold">X</button>
        </div>
      )}
      {isLoading && (
         <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-gray-700 p-6 rounded-lg shadow-xl flex items-center space-x-4">
                <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-b-4 border-purple-500"></div>
                <span className="text-xl font-semibold text-gray-100">처리 중입니다...</span>
            </div>
        </div>
      )}

      <div className="flex flex-1 overflow-hidden">
        <div className="w-1/4 min-w-[300px] max-w-[400px] bg-gray-800 p-4 overflow-y-auto shadow-lg">
          <WorldSettingsPanel
            worldSettings={project.worldSettings || initialWorldSettings}
            onSetWorldSettings={handleSetWorldSettings}
            onSelect={() => setEditorSelection({ type: 'world', id: 'world_settings' })}
            isSelected={editorSelection.type === 'world'}
            setIsLoading={setIsLoading}
            setError={setError}
          />
          <StageListPanel
            stages={project.stages}
            selectedStageId={selectedStageId}
            onSelectStage={handleSelectStage}
            onAddStage={(stageTitle) => {
              const newStage: Stage = {
                id: generateId(),
                title: stageTitle,
                settingDescription: '새롭고 신비한 스테이지가 기다립니다...',
                scenes: [],
                characters: []
              };
              handleAddStage(newStage);
              handleSelectStage(newStage.id);
            }}
            onDeleteStage={handleDeleteStage}
            worldSettings={project.worldSettings}
            onUpdateStages={(updatedStages) => setProject(prev => ({...prev, stages: updatedStages}))}
            onAddFullGeneratedStage={handleAddFullGeneratedStage}
            onPlayStage={handleOpenPlayer}
            setIsLoading={setIsLoading}
            setError={setError}
          />
        </div>

        <div className="flex-1 bg-gray-700 p-6 overflow-y-auto">
          {selectedStage ? (
            <StageEditorPanel
              stage={selectedStage}
              onSelectScene={handleSelectScene}
              selectedSceneId={selectedSceneId}
              onAddScene={(type) => {
                const newScene: Scene = {
                  id: generateId(),
                  stageId: selectedStage.id,
                  type: type,
                  title: `새 ${type} 장면`,
                  content: '',
                  characterIds: [],
                  choices: type === SceneType.CHOICE ? [{id: generateId(), text: '선택 1', nextSceneId: null}] : undefined,
                  combatDetails: (type === SceneType.REGULAR_COMBAT || type === SceneType.BOSS_COMBAT) ? { enemyCharacterIds: [], reward: ''} : undefined,
                  item: type === SceneType.ITEM_ACQUISITION ? '' : undefined,
                  newLocationName: type === SceneType.LOCATION_CHANGE ? '' : undefined,
                  nextSceneId: null,
                };
                handleAddScene(selectedStage.id, newScene);
                handleSelectScene(newScene.id);
              }}
              onUpdateFullScene={handleAddCompleteSceneObject}
              onDeleteScene={(sceneId) => handleDeleteScene(selectedStage.id, sceneId)}
              onManageCharacters={() => handleManageCharacters(selectedStage.id)}
              worldSettings={project.worldSettings}
              onUpdateScene={(scene) => handleUpdateScene(selectedStage.id, scene)}
              setIsLoading={setIsLoading}
              setError={setError}
            />
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-gray-500">
              <AISparklesIcon className="w-24 h-24 mb-4 opacity-50" />
              <p className="text-xl">편집을 시작할 스테이지를 선택하거나 새로 만드세요.</p>
              <p>AI 생성 기능을 사용하려면 왼쪽에서 세계관 설정을 정의하세요.</p>
              {!isApiKeyEffectivelyConfigured() && <p className="mt-2 text-yellow-400">AI 기능을 사용하려면 하단 바에 Gemini API 키를 설정해주세요.</p>}
            </div>
          )}
        </div>

        <div className="w-1/3 min-w-[350px] max-w-[500px] bg-gray-800 p-4 overflow-y-auto shadow-lg">
          {editorSelection.type === 'scene' && selectedScene && selectedStage && (
            <SceneEditorPanel
              scene={selectedScene}
              stage={selectedStage}
              allScenesInStage={selectedStage.scenes}
              onUpdateScene={(updatedScene) => handleUpdateScene(selectedStage.id, updatedScene)}
              worldSettings={project.worldSettings}
              setIsLoading={setIsLoading}
              setError={setError}
            />
          )}
          {editorSelection.type === 'stage' && selectedStage && (
             <div className="p-4 bg-gray-700 rounded-lg">
                <h3 className="text-xl font-semibold mb-3 text-purple-400">스테이지 상세정보</h3>
                <label htmlFor="stageTitle" className="block text-sm font-medium text-gray-300 mb-1">스테이지 제목</label>
                <input
                    id="stageTitle"
                    type="text"
                    value={selectedStage.title}
                    onChange={(e) => handleUpdateStage({...selectedStage, title: e.target.value})}
                    className="w-full p-2 bg-gray-600 border border-gray-500 rounded focus:ring-purple-500 focus:border-purple-500"
                />
                <label htmlFor="stageDescription" className="block text-sm font-medium text-gray-300 mt-3 mb-1">배경 설명</label>
                <textarea
                    id="stageDescription"
                    value={selectedStage.settingDescription}
                    onChange={(e) => handleUpdateStage({...selectedStage, settingDescription: e.target.value})}
                    rows={4}
                    className="w-full p-2 bg-gray-600 border border-gray-500 rounded focus:ring-purple-500 focus:border-purple-500"
                />
            </div>
          )}
           {editorSelection.type === null && editorSelection.id !== 'world_settings' && (
            <div className="flex flex-col items-center justify-center h-full text-gray-500">
                <AISparklesIcon className="w-16 h-16 mb-4 opacity-30" />
                <p className="text-center">왼쪽 또는 중앙 패널에서 항목을 선택하여 여기에서 상세정보를 편집하세요.</p>
            </div>
          )}
        </div>
      </div>

      {isCharacterManagerOpen && selectedStage && (
        <CharacterManagerModal
          isOpen={isCharacterManagerOpen}
          onClose={() => setIsCharacterManagerOpen(false)}
          stage={selectedStage}
          onUpdateCharacters={(characters) => handleUpdateStageCharacters(selectedStage.id, characters)}
          worldSettings={project.worldSettings}
          setIsLoading={setIsLoading}
          setError={setError}
        />
      )}
      {isPlayerOpen && project && (
        <ScriptPlayerModal
          isOpen={isPlayerOpen}
          onClose={handleClosePlayer}
          project={project}
          startStageId={playtestStageId}
        />
      )}

      {/* Custom Confirmation Modal */}
      {confirmModalState && confirmModalState.isOpen && (
        <Modal
            isOpen={confirmModalState.isOpen}
            onClose={() => {
            if (confirmModalState.onCancel) confirmModalState.onCancel();
            setConfirmModalState(null);
            }}
            title={confirmModalState.title}
            size="sm"
        >
            <p className="text-gray-300 mb-6">{confirmModalState.message}</p>
            <div className="flex justify-end space-x-3">
            <Button
                variant="secondary"
                onClick={() => {
                if (confirmModalState.onCancel) confirmModalState.onCancel();
                setConfirmModalState(null);
                }}
            >
                {confirmModalState.cancelText || "취소"}
            </Button>
            <Button
                variant={confirmModalState.confirmButtonVariant || "primary"}
                onClick={() => {
                confirmModalState.onConfirm();
                setConfirmModalState(null);
                }}
            >
                {confirmModalState.confirmText || "확인"}
            </Button>
            </div>
        </Modal>
      )}

      {/* API Key Input - Bottom Bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-yellow-500 p-2 shadow-lg border-t-2 border-yellow-700 z-50 text-black">
        <div className="max-w-screen-xl mx-auto flex flex-col sm:flex-row items-center justify-between sm:space-x-4 text-xs">
          <div className="flex items-center space-x-2 mb-1 sm:mb-0">
            <label htmlFor="apiKeyInputBottom" className="font-semibold whitespace-nowrap">
              Gemini API 키:
            </label>
            <input
              id="apiKeyInputBottom"
              type="password"
              value={userInputApiKey}
              onChange={(e) => setUserInputApiKey(e.target.value)}
              className="p-1 rounded bg-gray-100 text-gray-800 w-40 sm:w-56 md:w-64 border border-yellow-700 focus:ring-purple-500 focus:border-purple-500"
              placeholder="API 키 입력"
              aria-label="Gemini API Key Input"
            />
            <Button onClick={handleSaveApiKey} variant="secondary" size="sm" className="bg-purple-600 hover:bg-purple-700 text-white !px-2.5 !py-1 !text-xs">
              저장
            </Button>
          </div>
          <p className="text-yellow-900 text-center sm:text-right">
            { process.env.API_KEY && process.env.API_KEY !== PLACEHOLDER_API_KEY && process.env.API_KEY.trim() !== ''
              ? `환경 변수 키가 로컬 저장 키보다 우선 적용됩니다.`
              : (getEffectiveApiKey() !== PLACEHOLDER_API_KEY && getEffectiveApiKey() === localStorage.getItem(USER_API_KEY_LOCAL_STORAGE_KEY)
                ? `로컬 저장 키 사용 중입니다.`
                : `API 키를 입력/저장하세요. (환경 변수 우선)`)}
          </p>
        </div>
      </div>
    </div>
  );
};

export default App;
