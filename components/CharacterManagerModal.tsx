import React, { useState, useEffect } from 'react';
import { Stage, Character, CharacterType, WorldSettings, GeminiCharacterSuggestion } from '../types';
import Modal from './shared/Modal';
import Button from './shared/Button';
import Input from './shared/Input';
import TextArea from './shared/TextArea';
import Select from './shared/Select';
import { PlusIcon, TrashIcon, EditIcon, AISparklesIcon } from './shared/icons/Icons';
import { generateId } from '../utils/idGenerator';
import { generateCharacterWithAI } from '../services/geminiService';

interface CharacterManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  stage: Stage;
  onUpdateCharacters: (characters: Character[]) => void;
  worldSettings: WorldSettings | null;
  setIsLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
}

const CharacterEditor: React.FC<{
  character: Partial<Character>;
  onSave: (character: Character) => void;
  onCancel: () => void;
  stage: Stage;
  worldSettings: WorldSettings | null;
  setIsLoading: (loading: boolean) => void; // For global spinner
  setError: (error: string | null) => void;
}> = ({ character: initialCharacter, onSave, onCancel, stage, worldSettings, setIsLoading, setError }) => {
  const [character, setCharacter] = useState<Partial<Character>>(initialCharacter);
  const [isGeneratingDetailsAi, setIsGeneratingDetailsAi] = useState(false); // Local loading for AI details button

  useEffect(() => {
    setCharacter(initialCharacter);
  }, [initialCharacter]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setCharacter({ ...character, [e.target.name]: e.target.value });
  };
  
  const handleGenerateDetailsAI = async () => {
    if (!worldSettings || !character.type) {
        setError("AI 생성을 위해서는 세계관 설정과 캐릭터 유형이 필요합니다.");
        return;
    }
    setIsGeneratingDetailsAi(true); // Start local button loading
    setIsLoading(true); // Start global loading
    setError(null);
    try {
        const suggestion = await generateCharacterWithAI(worldSettings, stage, character.type, `"${character.name || '(새 캐릭터)'}"라는 이름의 ${character.type}에 대한 상세 정보를 생성합니다.`);
        setCharacter(prev => ({
            ...prev,
            name: suggestion.name || prev.name,
            description: suggestion.description || '',
            dialogueSeed: character.type === CharacterType.NPC ? (suggestion.dialogueSeed || '') : undefined
        }));
    } catch (e: any) {
        setError(e.message || "AI로 캐릭터 상세정보 생성에 실패했습니다.");
    } finally {
        setIsLoading(false); // Stop global loading
        setIsGeneratingDetailsAi(false); // Stop local button loading
    }
  };


  const handleFinalSave = () => {
    if (!character.name || !character.type || !character.description) {
      alert('이름, 유형, 설명은 필수입니다.');
      return;
    }
    onSave({
      id: character.id || generateId(),
      name: character.name,
      type: character.type,
      description: character.description,
      dialogueSeed: character.dialogueSeed,
    });
  };

  return (
    <div className="space-y-4 p-1">
      <Input label="이름" name="name" value={character.name || ''} onChange={handleChange} />
      <Select
        label="유형"
        name="type"
        value={character.type || ''}
        onChange={handleChange}
        options={Object.values(CharacterType).map(ct => ({ value: ct, label: ct }))}
        placeholder="유형 선택"
      />
      <TextArea label="설명" name="description" value={character.description || ''} onChange={handleChange} rows={3}/>
      {character.type === CharacterType.NPC && (
        <Input label="대화 시드 (NPC)" name="dialogueSeed" value={character.dialogueSeed || ''} onChange={handleChange} placeholder="예: 고대 유적에 대한 소문"/>
      )}
      <Button 
        onClick={handleGenerateDetailsAI} 
        variant="ghost" 
        size="sm" 
        leftIcon={!isGeneratingDetailsAi ? <AISparklesIcon className="w-4 h-4"/> : null} // Hide icon if loading to avoid clash with spinner
        disabled={!worldSettings || !character.type || isGeneratingDetailsAi}
        loading={isGeneratingDetailsAi}
      >
          AI로 상세정보 생성/개선
      </Button>
      <div className="flex justify-end space-x-2 pt-2">
        <Button onClick={onCancel} variant="secondary">취소</Button>
        <Button onClick={handleFinalSave} variant="primary">캐릭터 저장</Button>
      </div>
    </div>
  );
};


const CharacterManagerModal: React.FC<CharacterManagerModalProps> = ({
  isOpen, onClose, stage, onUpdateCharacters, worldSettings, setIsLoading, setError
}) => {
  const [characters, setCharacters] = useState<Character[]>(stage.characters);
  const [editingCharacter, setEditingCharacter] = useState<Partial<Character> | null>(null);
  const [showAiForm, setShowAiForm] = useState(false);
  const [aiCharacterType, setAiCharacterType] = useState<CharacterType>(CharacterType.NPC);
  const [aiCharacterPrompt, setAiCharacterPrompt] = useState<string>('');
  const [isCreatingAiCharacter, setIsCreatingAiCharacter] = useState(false); // Local loading for AI creation button

  // Access global loading state if needed, though it's controlled by App.tsx via setIsLoading
  // For button disabling, direct check of isCreatingAiCharacter or isGeneratingDetailsAi is enough
  // The `isLoading` prop is not directly available here, but setIsLoading affects App.tsx's isLoading.

  useEffect(() => {
    setCharacters(stage.characters);
    if (!isOpen) { // Reset local states when modal closes
        setIsCreatingAiCharacter(false);
        setShowAiForm(false);
    }
  }, [stage.characters, isOpen]);

  const handleSaveCharacter = (charToSave: Character) => {
    let updatedChars;
    if (characters.find(c => c.id === charToSave.id)) {
      updatedChars = characters.map(c => c.id === charToSave.id ? charToSave : c);
    } else {
      updatedChars = [...characters, charToSave];
    }
    setCharacters(updatedChars);
    onUpdateCharacters(updatedChars); // Update in App state
    setEditingCharacter(null);
  };

  const handleDeleteCharacter = (id: string) => {
    const updatedChars = characters.filter(c => c.id !== id);
    setCharacters(updatedChars);
    onUpdateCharacters(updatedChars);
  };
  
  const handleGenerateCharacterAI = async () => {
    if(!worldSettings) {
        setError("AI로 캐릭터를 생성하려면 세계관 설정이 필요합니다.");
        return;
    }
    setIsCreatingAiCharacter(true); // Start local button loading
    setIsLoading(true); // Start global loading
    setError(null);
    try {
        const suggestion = await generateCharacterWithAI(worldSettings, stage, aiCharacterType, aiCharacterPrompt);
        const newChar: Character = {
            id: generateId(),
            name: suggestion.name,
            type: aiCharacterType,
            description: suggestion.description,
            dialogueSeed: aiCharacterType === CharacterType.NPC ? suggestion.dialogueSeed : undefined,
        };
        const updatedChars = [...characters, newChar];
        setCharacters(updatedChars);
        onUpdateCharacters(updatedChars);
        setAiCharacterPrompt('');
        setShowAiForm(false); // Optionally close form after generation
    } catch (e: any) {
        setError(e.message || "AI로 캐릭터 생성에 실패했습니다.");
    } finally {
        setIsLoading(false); // Stop global loading
        setIsCreatingAiCharacter(false); // Stop local button loading
    }
  };


  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`${stage.title} 캐릭터 관리`} size="xl">
      {editingCharacter ? (
        <CharacterEditor
          character={editingCharacter}
          onSave={handleSaveCharacter}
          onCancel={() => setEditingCharacter(null)}
          stage={stage}
          worldSettings={worldSettings}
          setIsLoading={setIsLoading} // Pass setIsLoading for global spinner
          setError={setError}
        />
      ) : (
        <>
          <div className="mb-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <Button onClick={() => setEditingCharacter({ type: CharacterType.NPC })} variant="primary" leftIcon={<PlusIcon className="w-5 h-5"/>}>
              수동으로 캐릭터 추가
            </Button>
            <Button 
                onClick={() => setShowAiForm(!showAiForm)} 
                variant="success" 
                leftIcon={<AISparklesIcon className="w-5 h-5"/>}
                disabled={isCreatingAiCharacter} // Disable toggle if AI creation is in progress
            >
              {showAiForm ? 'AI 생성 취소' : 'AI로 캐릭터 생성'}
            </Button>
          </div>

          {showAiForm && (
            <div className="p-3 bg-gray-700 rounded-md mb-4 space-y-3">
                <Select
                    label="AI 캐릭터 유형"
                    value={aiCharacterType}
                    onChange={(e) => setAiCharacterType(e.target.value as CharacterType)}
                    options={Object.values(CharacterType).map(ct => ({value: ct, label: ct}))}
                    disabled={isCreatingAiCharacter}
                />
                <Input 
                    label="선택: 특정 AI 프롬프트"
                    value={aiCharacterPrompt}
                    onChange={(e) => setAiCharacterPrompt(e.target.value)}
                    placeholder="예: '심술궂은 늙은 상점 주인'"
                    disabled={isCreatingAiCharacter}
                />
                <Button 
                    onClick={handleGenerateCharacterAI} 
                    disabled={!worldSettings || isCreatingAiCharacter} 
                    loading={isCreatingAiCharacter}
                >
                    생성
                </Button>
                {!worldSettings && <p className="text-xs text-yellow-400">AI에는 세계관 설정이 필요합니다.</p>}
            </div>
          )}

          {characters.length === 0 && !editingCharacter && !showAiForm && <p className="text-gray-400 text-center py-4">이 스테이지에 아직 정의된 캐릭터가 없습니다.</p>}
          <ul className="space-y-2 max-h-[50vh] overflow-y-auto">
            {characters.map((char) => (
              <li key={char.id} className="p-3 bg-gray-700 rounded-md flex justify-between items-center group">
                <div>
                  <p className="font-semibold text-purple-300">{char.name} <span className="text-xs text-gray-400">({char.type})</span></p>
                  <p className="text-sm text-gray-300 truncate max-w-md">{char.description}</p>
                </div>
                <div className="flex space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button onClick={() => setEditingCharacter(char)} variant="ghost" size="sm" title="편집" disabled={isCreatingAiCharacter}>
                    <EditIcon className="w-4 h-4" />
                  </Button>
                  <Button onClick={() => handleDeleteCharacter(char.id)} variant="ghost" size="sm" title="삭제" disabled={isCreatingAiCharacter}>
                    <TrashIcon className="w-4 h-4 text-red-400" />
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        </>
      )}
    </Modal>
  );
};

export default CharacterManagerModal;