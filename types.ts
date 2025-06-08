export interface WorldSettings {
  title: string;
  description: string;
  mainConflict: string;
  keyLocations: string; // Simplified to a single string for easier input
}

export enum CharacterType {
  NPC = 'NPC', // NPC는 일반적으로 그대로 사용
  PLAYER_CHARACTER = '플레이어 캐릭터',
  REGULAR_MONSTER = '일반 몬스터',
  BOSS_MONSTER = '보스 몬스터',
}

export interface Character {
  id: string;
  name: string;
  type: CharacterType;
  description: string;
  dialogueSeed?: string; // For NPCs
  // stats?: any; // Future use
}

export enum SceneType {
  NARRATION = '나레이션',
  DIALOGUE = '대화',
  CHOICE = '선택',
  REGULAR_COMBAT = '일반 전투', // Renamed from COMBAT
  BOSS_COMBAT = '보스 전투',   // New type
  ITEM_ACQUISITION = '아이템 획득',
  LOCATION_CHANGE = '장소 변경',
  TOWN = '마을', // New scene type
}

export interface DialogueChoice {
  id: string;
  text: string; // Player's dialogue option text
  nextSceneId: string | null; // ID of the scene this choice leads to
}

export interface Scene {
  id: string;
  stageId: string;
  type: SceneType;
  title: string;
  content: string; // Narration text, NPC dialogue, situation description for choice/combat, town description
  characterIds?: string[]; // IDs of characters involved in this scene
  choices?: DialogueChoice[]; // For CHOICE type scenes
  nextSceneId?: string | null; // For linear scenes (Narration, Dialogue, Combat, Item, LocationChange, Town)
  combatDetails?: {
    enemyCharacterIds: string[]; // IDs of monster characters
    reward?: string; // Text description of reward
  };
  item?: string; // Name of item for ITEM_ACQUISITION
  newLocationName?: string; // Name of the new location for LOCATION_CHANGE
  // Town specific details could be added later, e.g.
  // shopAvailable?: boolean;
  // innAvailable?: boolean;
}

export interface Stage {
  id: string;
  title: string;
  settingDescription: string;
  scenes: Scene[];
  characters: Character[]; // NPCs and Monsters specific to this stage
}

export interface Project {
  worldSettings: WorldSettings | null;
  stages: Stage[];
  // Potentially for future player state saving, not used yet
  // currentPlayerState?: {
  //   currentStageId: string | null;
  //   currentSceneId: string | null;
  //   // other player-specific data like inventory, flags etc.
  // }
}

export interface EditorSelection {
  type: 'world' | 'stage' | 'scene' | 'character' | null;
  id: string | null;
}

// For Gemini responses
export interface GeminiStageSuggestion {
  title: string;
  settingDescription: string;
}

export interface GeminiSceneNarration {
  title: string;
  content: string;
}
export interface GeminiSceneDialogue {
  title: string;
  content: string; // NPC's line
  speakerCharacterName?: string; // Optional: Gemini suggests who is speaking
}
export interface GeminiSceneChoice {
  title: string;
  content: string; // Situation leading to choices
  choices: Array<{ text: string }>; // Gemini suggests choice texts
}
export interface GeminiSceneCombat { // This will be used for REGULAR_COMBAT and BOSS_COMBAT
  title: string;
  content: string; // Description of the combat encounter
  enemyNames: string[]; // Names of enemies Gemini suggests
  reward?: string;
}
export interface GeminiSceneItemAcquisition {
  title: string;
  content: string; // Description of how the item is obtained
  itemName: string; // Name of the item
}
export interface GeminiSceneLocationChange {
  title: string;
  content: string; // Description of arriving or the new place
  newLocationName: string; // Name of the new location
}
export interface GeminiSceneTown { // New type for AI Town generation
  title: string;
  content: string; // Description of the town
}


export interface GeminiCharacterSuggestion {
  name: string;
  description: string;
  dialogueSeed?: string;
}

// --- Types for AI Stage Wizard ---
export interface GeminiStageCharacterSuggestionForWizard {
  name: string;
  type: CharacterType; // Ensure AI uses the exact enum values
  description: string;
  dialogueSeed?: string; // For NPCs
}

// This is what AI returns for each scene in the full stage generation
export interface GeminiSceneSuggestionForWizard {
  type: SceneType; // Ensure AI uses the exact enum values
  title: string;
  content: string;
  speakerCharacterName?: string; // For DIALOGUE, name from GeminiStageCharacterSuggestionForWizard
  choices?: Array<{
    text: string;
    suggestedNextSceneTitle?: string; // AI suggests which scene title this choice should lead to
  }>; // For CHOICE
  enemyNames?: string[]; // For COMBAT, names from GeminiStageCharacterSuggestionForWizard
  reward?: string; // For COMBAT
  itemName?: string; // For ITEM_ACQUISITION
  newLocationName?: string; // For LOCATION_CHANGE
  // No specific town fields from AI yet, it's just title/content
}

export interface GeminiFullStageOutput {
  generatedStageTitle: string;
  generatedStageSettingDescription: string;
  characters: GeminiStageCharacterSuggestionForWizard[];
  scenes: GeminiSceneSuggestionForWizard[];
}

// This is the processed data from geminiService before it becomes a full Stage object in App.tsx
export interface ProcessedWizardData {
  stageDetails: {
    title: string;
    settingDescription: string;
  };
  characters: Character[]; // Characters with IDs
  scenes: Scene[]; // Scenes with IDs, stageId placeholder, and mapped character/choice IDs
}