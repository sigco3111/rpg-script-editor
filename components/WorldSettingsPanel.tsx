
import React, { useState, useEffect } from 'react';
import { WorldSettings } from '../types';
import Button from './shared/Button';
import Input from './shared/Input';
import TextArea from './shared/TextArea';
import { EditIcon, SaveIcon, ChevronDownIcon, ChevronRightIcon } from './shared/icons/Icons';

interface WorldSettingsPanelProps {
  worldSettings: WorldSettings;
  onSetWorldSettings: (settings: WorldSettings) => void;
  onSelect: () => void;
  isSelected: boolean;
  setIsLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
}

const WorldSettingsPanel: React.FC<WorldSettingsPanelProps> = ({ worldSettings, onSetWorldSettings, onSelect, isSelected, setIsLoading, setError }) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [localSettings, setLocalSettings] = useState<WorldSettings>(worldSettings);

  useEffect(() => {
    setLocalSettings(worldSettings);
  }, [worldSettings]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setLocalSettings({ ...localSettings, [e.target.name]: e.target.value });
  };

  const handleSave = () => {
    onSetWorldSettings(localSettings);
  };

  return (
    <div className="mb-6 p-4 bg-gray-700 rounded-lg shadow">
      <div className="flex justify-between items-center mb-3 cursor-pointer" onClick={() => setIsCollapsed(!isCollapsed)}>
        <h2 className="text-xl font-semibold text-purple-400">세계관 설정</h2>
        {isCollapsed ? <ChevronRightIcon className="w-6 h-6"/> : <ChevronDownIcon className="w-6 h-6"/>}
      </div>
      {!isCollapsed && (
        <>
          {isSelected ? (
            <div className="space-y-4">
              <Input
                label="제목"
                name="title"
                value={localSettings.title}
                onChange={handleInputChange}
                placeholder="예: 부서진 엘도리아 왕국"
              />
              <TextArea
                label="설명"
                name="description"
                value={localSettings.description}
                onChange={handleInputChange}
                placeholder="세계관의 테마, 분위기, 주요 특징에 대한 간략한 개요입니다."
                rows={3}
              />
              <TextArea
                label="주요 갈등"
                name="mainConflict"
                value={localSettings.mainConflict}
                onChange={handleInputChange}
                placeholder="예: 만연하는 타락이 땅을 삼키려 합니다."
                rows={2}
              />
              <TextArea
                label="주요 장소 (쉼표로 구분)"
                name="keyLocations"
                value={localSettings.keyLocations}
                onChange={handleInputChange}
                placeholder="예: 수도 아텔론, 금단의 숲, 수정 동굴"
                rows={2}
              />
              <Button onClick={handleSave} variant="success" leftIcon={<SaveIcon className="w-5 h-5"/>}>
                세계관 설정 저장
              </Button>
            </div>
          ) : (
            <div className="space-y-2 text-sm text-gray-300">
              <p><strong>제목:</strong> {worldSettings.title || '설정되지 않음'}</p>
              <p><strong>설명:</strong> {worldSettings.description || '설정되지 않음'}</p>
              <Button onClick={onSelect} variant="secondary" leftIcon={<EditIcon className="w-4 h-4"/>} size="sm">
                세계관 설정 편집
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default WorldSettingsPanel;