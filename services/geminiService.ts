
import { GoogleGenAI, GenerateContentResponse } from "@google/genai";
import { GEMINI_MODEL_TEXT, getEffectiveApiKey, PLACEHOLDER_API_KEY } from '../constants';
import {
    WorldSettings, Stage, SceneType, CharacterType,
    GeminiStageSuggestion, GeminiSceneNarration, GeminiSceneDialogue, GeminiSceneChoice, GeminiSceneCombat,
    GeminiCharacterSuggestion, GeminiSceneItemAcquisition, GeminiSceneLocationChange, GeminiSceneTown,
    GeminiFullStageOutput, ProcessedWizardData, Character, Scene, DialogueChoice
} from '../types';
import { generateId } from "../utils/idGenerator";

const getAI = () => {
  const effectiveKey = getEffectiveApiKey();
  if (effectiveKey === PLACEHOLDER_API_KEY || !effectiveKey) {
    throw new Error("Gemini API 키가 구성되지 않았습니다. 앱 상단에 API 키를 입력하거나, constants.ts 또는 환경 변수로 설정하세요.");
  }
  return new GoogleGenAI({ apiKey: effectiveKey });
};

const parseJsonFromResponse = <T,>(responseText: string): T | null => {
  let jsonStr = responseText.trim();
  const fenceRegex = /^```(\w*)?\s*\n?(.*?)\n?\s*```$/s;
  const match = jsonStr.match(fenceRegex);
  if (match && match[2]) {
    jsonStr = match[2].trim();
  }
  try {
    return JSON.parse(jsonStr) as T;
  } catch (e) {
    console.error("Failed to parse JSON response:", e, "Raw text:", responseText);
    throw new Error(`AI의 JSON 응답이 잘못되었습니다: ${jsonStr.substring(0,100)}...`);
  }
};

export const generateStagesWithAI = async (worldSettings: WorldSettings): Promise<GeminiStageSuggestion[]> => {
  const ai = getAI();
  const prompt = `
    다음 RPG 세계관 설정을 기반으로:
    제목: ${worldSettings.title}
    설명: ${worldSettings.description}
    주요 갈등: ${worldSettings.mainConflict}
    주요 장소: ${worldSettings.keyLocations}

    이 RPG에 대한 3개의 독특한 스테이지를 제안해주세요. 각 스테이지에 대해 "title"(최대 10단어)과 "settingDescription"(1-2 문장)을 제공해주세요.
    모든 응답은 한국어로 작성해주세요.
    응답은 각 객체가 "title"과 "settingDescription" 속성을 가지는 JSON 객체 배열로 반환해주세요.
    예시: [{"title": "속삭이는 숲", "settingDescription": "잃어버린 유물을 품고 있다고 전해지는 고대 숲입니다."}]
  `;
  try {
    const response: GenerateContentResponse = await ai.models.generateContent({
      model: GEMINI_MODEL_TEXT,
      contents: prompt,
      config: { responseMimeType: "application/json" }
    });
    const suggestions = parseJsonFromResponse<GeminiStageSuggestion[]>(response.text);
    if (!suggestions || !Array.isArray(suggestions) || suggestions.some(s => typeof s.title !== 'string' || typeof s.settingDescription !== 'string')) {
        throw new Error("스테이지에 대한 AI 응답이 예상 형식과 다릅니다.");
    }
    return suggestions;
  } catch (error) {
    console.error("AI로 스테이지 생성 중 오류 발생:", error);
    throw error;
  }
};

export const generateSceneDetailsWithAI = async (
  worldSettings: WorldSettings,
  stage: Stage,
  sceneType: SceneType,
  context?: string // e.g. previous scene summary or user query
): Promise<Partial<GeminiSceneNarration | GeminiSceneDialogue | GeminiSceneChoice | GeminiSceneCombat | GeminiSceneItemAcquisition | GeminiSceneLocationChange | GeminiSceneTown>> => {
  const ai = getAI();
  let prompt = `
    RPG 세계관: ${worldSettings.description}
    현재 스테이지: "${stage.title}" - ${stage.settingDescription}
    스테이지 내 기존 캐릭터: ${stage.characters.map(c => `${c.name} (${c.type})`).join(', ') || '아직 없음'}
    ${context ? `컨텍스트/사용자 요청: ${context}\n` : ''}
    모든 응답(제목, 내용, 선택지 텍스트, 아이템 이름, 장소 이름, 적 이름, 보상 설명 등)은 반드시 한국어로 작성해주세요.
  `;

  switch (sceneType) {
    case SceneType.NARRATION:
      prompt += `나레이션 장면을 생성합니다. "title"(최대 5단어)과 "content"(1-3 문장의 나레이션)를 제공해주세요.
                 JSON 형식으로 반환: {"title": "예시 제목", "content": "예시 나레이션 내용..."}`;
      break;
    case SceneType.DIALOGUE:
      prompt += `NPC가 말하는 대화 장면을 생성합니다.
                 "title"(최대 5단어), "content"(NPC의 대사, 1-2 문장), 그리고 스테이지의 기존 NPC 중 적합한 캐릭터가 있다면 "speakerCharacterName"을 선택적으로 제공해주세요.
                 JSON 형식으로 반환: {"title": "예시 제목", "content": "예시 대사...", "speakerCharacterName": "NPC 이름"}`;
      break;
    case SceneType.CHOICE:
      prompt += `선택지 장면을 생성합니다. "title"(최대 5단어), "content"(선택지로 이어지는 상황, 1-2 문장), 그리고 2-3개의 플레이어 대화 옵션을 포함하는 "choices" 배열(각 선택지 객체는 "text" 속성을 가짐)을 제공해주세요.
                 JSON 형식으로 반환: {"title": "예시 제목", "content": "예시 상황...", "choices": [{"text": "선택 1"}, {"text": "선택 2"}]}`;
      break;
    case SceneType.REGULAR_COMBAT: // Updated from COMBAT
      prompt += `일반 전투 장면을 생성합니다. "title"(최대 5단어), "content"(전투 상황 설명, 1-2 문장), "enemyNames"(스테이지의 기존 몬스터 또는 새로운 테마의 일반 몬스터 이름 1-3개 배열), 그리고 선택적으로 "reward"(예: "치유 물약")를 제공해주세요.
                 JSON 형식으로 반환: {"title": "예시 제목", "content": "예시 전투 설명...", "enemyNames": ["일반적1", "일반적2"], "reward": "예시 보상"}`;
      break;
    case SceneType.BOSS_COMBAT: // New
      prompt += `보스 전투 장면을 생성합니다. 이 전투는 스테이지의 주요 도전 과제입니다. "title"(최대 5단어, 보스 이름 포함 가능), "content"(보스 전투의 긴장감 넘치는 상황 설명, 1-3 문장), "enemyNames"(스테이지의 기존 보스 몬스터 또는 새로운 강력한 보스 몬스터 이름 1개 배열), 그리고 "reward"(예: "전설적인 유물 조각")를 제공해주세요.
                 JSON 형식으로 반환: {"title": "보스전: 그림자 군주", "content": "마침내 그림자 군주와 대면합니다! 그의 강력한 공격이 방을 뒤흔듭니다.", "enemyNames": ["그림자 군주"], "reward": "어둠의 심장"}`;
      break;
    case SceneType.ITEM_ACQUISITION:
      prompt += `아이템 획득 장면을 생성합니다. "title"(최대 5단어), "content"(아이템을 발견하거나 얻는 방법에 대한 1-2 문장 설명), 그리고 "itemName"(아이템 이름, 예: "고대 검", "치유 허브")을 제공해주세요.
                 JSON 형식으로 반환: {"title": "예시 제목", "content": "예시 획득 과정...", "itemName": "예시 아이템"}`;
      break;
    case SceneType.LOCATION_CHANGE:
      prompt += `장소 변경 장면을 생성합니다. "title"(최대 5단어), "content"(새로운 장소에 도착하거나 그 장소 자체에 대한 1-2 문장 설명), 그리고 "newLocationName"(새로운 장소/지역 이름, 예: "속삭이는 동굴", "시장")을 제공해주세요.
                 JSON 형식으로 반환: {"title": "예시 제목", "content": "예시 장소 설명...", "newLocationName": "예시 새 장소"}`;
      break;
    case SceneType.TOWN: // New scene type
      prompt += `마을 장면을 생성합니다. 플레이어가 쉬거나, 상점을 이용하거나, 다음 모험을 준비할 수 있는 안전한 장소입니다. "title"(최대 5단어, 마을 이름 포함), "content"(마을의 분위기나 주요 특징을 설명하는 1-3 문장)를 제공해주세요.
                 JSON 형식으로 반환: {"title": "평화로운 오아시스 마을", "content": "사막 한가운데 자리 잡은 이 작은 마을은 여행자들에게 안식처를 제공합니다. 분주한 시장과 친절한 주민들이 방문객을 맞이합니다."}`;
      break;
    default:
      throw new Error(`장면 유형 ${sceneType}에 대한 AI 생성이 구현되지 않았습니다.`);
  }

  try {
    const response: GenerateContentResponse = await ai.models.generateContent({
      model: GEMINI_MODEL_TEXT,
      contents: prompt,
      config: { responseMimeType: "application/json" }
    });

    const details = parseJsonFromResponse<Partial<GeminiSceneNarration | GeminiSceneDialogue | GeminiSceneChoice | GeminiSceneCombat | GeminiSceneItemAcquisition | GeminiSceneLocationChange | GeminiSceneTown>>(response.text);
    if (!details || typeof details.title !== 'string' || typeof details.content !== 'string') {
        throw new Error(`${sceneType} 장면에 대한 AI 응답이 예상 형식과 다릅니다. 제목이나 내용이 없습니다.`);
    }
    if (sceneType === SceneType.CHOICE && (!Array.isArray((details as GeminiSceneChoice).choices) || !(details as GeminiSceneChoice).choices.every(c => typeof c.text === 'string'))) {
        throw new Error("선택 장면에 대한 AI 응답의 선택지 형식이 잘못되었습니다.");
    }
    if ((sceneType === SceneType.REGULAR_COMBAT || sceneType === SceneType.BOSS_COMBAT) && !Array.isArray((details as GeminiSceneCombat).enemyNames)) {
        throw new Error("전투 장면에 대한 AI 응답의 적 이름 형식이 잘못되었습니다.");
    }
    if (sceneType === SceneType.ITEM_ACQUISITION && typeof (details as GeminiSceneItemAcquisition).itemName !== 'string') {
        throw new Error("아이템 획득 장면에 대한 AI 응답에 'itemName'이 없거나 형식이 잘못되었습니다.");
    }
    if (sceneType === SceneType.LOCATION_CHANGE && typeof (details as GeminiSceneLocationChange).newLocationName !== 'string') {
        throw new Error("장소 변경 장면에 대한 AI 응답에 'newLocationName'이 없거나 형식이 잘못되었습니다.");
    }
    // No specific validation for TOWN beyond title/content for now
    return details;

  } catch (error) {
    console.error(`AI로 ${sceneType} 장면 상세정보 생성 중 오류 발생:`, error);
    throw error;
  }
};


export const generateCharacterWithAI = async (
  worldSettings: WorldSettings,
  stage: Stage,
  characterType: CharacterType,
  customPrompt?: string
): Promise<GeminiCharacterSuggestion> => {
  const ai = getAI();
  let prompt = `
    RPG 세계관: ${worldSettings.description}
    현재 스테이지: "${stage.title}" - ${stage.settingDescription}
    생성할 캐릭터 유형: ${characterType}
    스테이지 내 기존 캐릭터: ${stage.characters.map(c => `${c.name} (${c.type})`).join(', ') || '아직 없음'}
    ${customPrompt ? `\n특정 요청: ${customPrompt}` : ''}

    이 스테이지에 적합한 매력적인 ${characterType} 캐릭터를 생성해주세요.
    "name", 테마에 맞는 "description"(1-2 문장), 그리고 NPC인 경우 "dialogueSeed"(이 NPC가 말할 수 있는 짧은 문구나 주제, 최대 10단어)를 제공해주세요.
    캐릭터는 독창적이고 스테이지 및 세계관의 맥락에 맞아야 합니다.
    모든 응답(이름, 설명, 대화 시드 등)은 반드시 한국어로 작성해주세요.
    JSON 형식으로 반환: {"name": "캐릭터 이름", "description": "캐릭터 설명..."${characterType === CharacterType.NPC ? ', "dialogueSeed": "대화 시드 예시..."' : ''}}
  `;

  try {
    const response: GenerateContentResponse = await ai.models.generateContent({
      model: GEMINI_MODEL_TEXT,
      contents: prompt,
      config: { responseMimeType: "application/json" }
    });
    const suggestion = parseJsonFromResponse<GeminiCharacterSuggestion>(response.text);

    if (!suggestion || typeof suggestion.name !== 'string' || typeof suggestion.description !== 'string') {
        throw new Error(`${characterType}에 대한 AI 응답이 예상 형식과 다릅니다.`);
    }
    if (characterType === CharacterType.NPC && typeof suggestion.dialogueSeed !== 'string') {
         throw new Error(`NPC 캐릭터에 대한 AI 응답에 'dialogueSeed'가 없습니다.`);
    }
    return suggestion;
  } catch (error) {
    console.error(`AI로 ${characterType} 생성 중 오류 발생:`, error);
    throw error;
  }
};


export const generateFullStageWithAI = async (
  worldSettings: WorldSettings,
  stageConcept: { titleHint: string, theme: string },
  existingStages: Stage[]
): Promise<ProcessedWizardData> => {
  const ai = getAI();

  let themeInstruction = "";
  if (stageConcept.theme) {
      themeInstruction = `
  스테이지 콘셉트:
  - 제목 제안(선택사항): ${stageConcept.titleHint || '(AI가 생성)'}
  - 사용자 제공 테마/핵심 아이디어: ${stageConcept.theme}
      `;
  } else {
      if (existingStages.length === 0) {
          themeInstruction = `
  스테이지 콘셉트:
  - 사용자가 테마를 제공하지 않았습니다.
  - 주어진 '세계관 설정'을 바탕으로 이 세계관에 어울리는 흥미로운 첫 번째 스테이지의 테마와 스토리를 창의적으로 구상해주세요.
  - 스테이지 제목도 AI가 세계관에 맞춰 생성해주세요. (사용자 제목 제안: ${stageConcept.titleHint || '없음'})
          `;
      } else {
          const previousStageSummaries = existingStages.slice(-3).map(s => `- "${s.title}": ${s.settingDescription.substring(0, 100)}...`).join('\n    ');
          themeInstruction = `
  스테이지 콘셉트:
  - 사용자가 테마를 제공하지 않았습니다.
  - 이전에 다음과 같은 스테이지들이 이미 존재합니다 (최근 ${existingStages.slice(-3).length}개 요약):
    ${previousStageSummaries || '없음'}
  - 주어진 '세계관 설정'과 위 '이전 스테이지들의 내용'을 고려하여, 이야기가 자연스럽게 이어지거나 세계관을 확장하는 새로운 스테이지의 테마와 스토리를 창의적으로 구상해주세요.
  - 스테이지 제목도 AI가 맥락에 맞춰 생성해주세요. (사용자 제목 제안: ${stageConcept.titleHint || '없음'})
          `;
      }
  }

  const prompt = `
    당신은 RPG 시나리오 작가입니다. 주어진 세계관 설정과 스테이지 콘셉트를 기반으로 완벽한 스테이지를 생성해주세요.
    스테이지는 최소 20개 이상의 장면으로 구성되어야 하며, 마지막 장면은 반드시 '보스 전투'여야 합니다.
    등장하는 캐릭터(NPC, 일반 몬스터, 보스 몬스터)와 장면들이 유기적으로 연결되도록 해주세요.
    모든 텍스트(제목, 설명, 대사, 아이템 이름 등)는 한국어로 작성해야 합니다.
    스테이지 내에 '마을' 장면을 하나 이상 포함하는 것을 고려해주세요. 마을은 플레이어가 재정비할 수 있는 안전한 장소입니다.

    세계관 설정:
    - 제목: ${worldSettings.title}
    - 설명: ${worldSettings.description}
    - 주요 갈등: ${worldSettings.mainConflict}
    - 주요 장소: ${worldSettings.keyLocations}

    ${themeInstruction}

    다음 JSON 구조로 응답해주세요:
    {
      "generatedStageTitle": "AI가 생성한 스테이지 제목 (한국어)",
      "generatedStageSettingDescription": "AI가 생성한 스테이지 배경 설명 (한국어, 1-2 문장)",
      "characters": [
        {
          "name": "캐릭터 이름 (한국어)",
          "type": "${Object.values(CharacterType).join(' 또는 ')} 중 하나",
          "description": "캐릭터 상세 설명 (한국어)",
          "dialogueSeed": "(NPC인 경우) 주요 대화 주제나 짧은 대사 (한국어)"
        }
      ],
      "scenes": [
        {
          "type": "${Object.values(SceneType).join(' 또는 ')} 중 하나",
          "title": "장면 제목 (한국어)",
          "content": "장면 내용 또는 상황 설명 (한국어)",
          "speakerCharacterName": "(장면 유형이 '대화'인 경우) 위 'characters' 배열에 정의된 NPC의 'name'",
          "choices": [
            {
              "text": "선택지 1 텍스트 (한국어)",
              "suggestedNextSceneTitle": "이 선택지가 이어질 장면의 제목 (이 스테이지 내 다른 장면의 제목, 한국어)"
            }
          ],
          "enemyNames": [ "몬스터 또는 보스 이름 1" ],
          "reward": "(전투 장면인 경우) 획득 보상 설명 (한국어)",
          "itemName": "(장면 유형이 '아이템 획득'인 경우) 획득 아이템 이름 (한국어)",
          "newLocationName": "(장면 유형이 '장소 변경'인 경우) 새로운 장소 이름 (한국어)"
        }
      ]
    }

    중요 규칙:
    1.  'characters' 배열은 'scenes' 배열에서 참조될 모든 캐릭터를 정의해야 합니다.
    2.  '대화' 장면의 'speakerCharacterName'은 'characters' 배열의 NPC 이름과 일치해야 합니다.
    3.  '일반 전투' 또는 '보스 전투' 장면의 'enemyNames'는 'characters' 배열의 몬스터/보스 이름과 일치해야 합니다.
    4.  'scenes' 배열의 마지막 장면은 반드시 "type": "${SceneType.BOSS_COMBAT}"여야 하며, 'characters' 배열의 '${CharacterType.BOSS_MONSTER}' 유형 캐릭터를 포함해야 합니다.
    5.  총 장면 수는 최소 20개 이상이어야 하며, 다양한 장면 유형을 사용해야 합니다. (예: ${SceneType.TOWN}, ${SceneType.NARRATION}, ${SceneType.DIALOGUE}, ${SceneType.REGULAR_COMBAT} 등)
    6.  이야기가 장면 간에 논리적으로 흘러가도록 구성해주세요. '선택' 장면의 각 'choices'에 있는 'suggestedNextSceneTitle'은 현재 생성 중인 다른 장면의 'title'을 참조해야 하며, 가급적 해당 선택 장면 이후에 나오는 장면으로 연결하여 이야기가 앞으로 진행되도록 해주세요.
    7.  모든 텍스트는 한국어로 작성해주세요.
  `;

  try {
    const response: GenerateContentResponse = await ai.models.generateContent({
      model: GEMINI_MODEL_TEXT,
      contents: prompt,
      config: { responseMimeType: "application/json", temperature: 0.7 }
    });

    const aiOutput = parseJsonFromResponse<GeminiFullStageOutput>(response.text);

    if (!aiOutput || !aiOutput.generatedStageTitle || !aiOutput.characters || !aiOutput.scenes || aiOutput.scenes.length < 1) {
      throw new Error("AI 응답이 필수 필드를 포함하지 않거나 장면이 없습니다.");
    }
    if(aiOutput.scenes.length < 20) {
        console.warn(`AI가 ${aiOutput.scenes.length}개의 장면만 생성했습니다. (최소 20개 요청)`);
    }
    if(aiOutput.scenes[aiOutput.scenes.length -1].type !== SceneType.BOSS_COMBAT){
        throw new Error("AI 응답의 마지막 장면이 보스 전투가 아닙니다. AI가 생성한 마지막 장면 유형: " + aiOutput.scenes[aiOutput.scenes.length -1].type );
    }


    const finalCharacters: Character[] = aiOutput.characters.map(charSuggestion => ({
      id: generateId(),
      name: charSuggestion.name,
      type: charSuggestion.type,
      description: charSuggestion.description,
      dialogueSeed: charSuggestion.dialogueSeed,
    }));

    // 1. Initial creation of scenes with their IDs and specific content.
    // Store AI's suggested next scene titles for choices temporarily.
    const initialScenes: (Scene & { _tempChoices?: Array<DialogueChoice & { _aiSuggestedNextSceneTitle?: string }> })[] = aiOutput.scenes.map(sceneSuggestion => {
      const sceneId = generateId();
      const newScene: Scene & { _tempChoices?: Array<DialogueChoice & { _aiSuggestedNextSceneTitle?: string }> } = {
        id: sceneId,
        stageId: '', // Placeholder
        title: sceneSuggestion.title,
        type: sceneSuggestion.type,
        content: sceneSuggestion.content,
        characterIds: [],
        choices: undefined,
        nextSceneId: null,
        combatDetails: undefined,
        item: undefined,
        newLocationName: undefined,
      };

      if (sceneSuggestion.type === SceneType.DIALOGUE && sceneSuggestion.speakerCharacterName) {
        const speaker = finalCharacters.find(c => c.name === sceneSuggestion.speakerCharacterName && c.type === CharacterType.NPC);
        if (speaker) newScene.characterIds = [speaker.id];
        else console.warn(`대화 장면 "${sceneSuggestion.title}"의 화자 "${sceneSuggestion.speakerCharacterName}"을(를) 찾을 수 없습니다.`);
      }

      if ((sceneSuggestion.type === SceneType.REGULAR_COMBAT || sceneSuggestion.type === SceneType.BOSS_COMBAT) && sceneSuggestion.enemyNames) {
        const enemyIds: string[] = [];
        sceneSuggestion.enemyNames.forEach(name => {
          const enemy = finalCharacters.find(c => c.name === name && (c.type === CharacterType.REGULAR_MONSTER || c.type === CharacterType.BOSS_MONSTER));
          if (enemy) enemyIds.push(enemy.id);
          else console.warn(`전투 장면 "${sceneSuggestion.title}"의 적 "${name}"을(를) 찾을 수 없습니다.`);
        });
        newScene.combatDetails = { enemyCharacterIds: enemyIds, reward: sceneSuggestion.reward || '' };
      }

      if (sceneSuggestion.type === SceneType.CHOICE && sceneSuggestion.choices) {
        newScene._tempChoices = sceneSuggestion.choices.map(choiceSuggestion => ({
          id: generateId(),
          text: choiceSuggestion.text,
          nextSceneId: null, // Will be linked later
          _aiSuggestedNextSceneTitle: choiceSuggestion.suggestedNextSceneTitle
        }));
        newScene.nextSceneId = undefined;
      }

      if (sceneSuggestion.type === SceneType.ITEM_ACQUISITION && sceneSuggestion.itemName) {
        newScene.item = sceneSuggestion.itemName;
      }

      if (sceneSuggestion.type === SceneType.LOCATION_CHANGE && sceneSuggestion.newLocationName) {
        newScene.newLocationName = sceneSuggestion.newLocationName;
      }
      // No specific processing for TOWN scene type data from AI in this step. Default handling is sufficient.
      return newScene;
    });

    // 2. Link scenes:
    //    Pass A: Link linear scenes (non-CHOICE)
    //    Pass B: Resolve AI suggested titles for CHOICE scenes and link them.
    const finalScenes: Scene[] = initialScenes.map((currentScene, index, allScenes) => {
      const sceneCopy = { ...currentScene };

      // Pass A: Link linear (non-CHOICE) scenes
      if (index < allScenes.length - 1 && sceneCopy.type !== SceneType.CHOICE) {
        sceneCopy.nextSceneId = allScenes[index + 1].id;
      }

      // Pass B: Link choices for CHOICE scenes
      if (sceneCopy.type === SceneType.CHOICE && sceneCopy._tempChoices) {
        sceneCopy.choices = sceneCopy._tempChoices.map(tempChoice => {
          let resolvedNextSceneId: string | null = null;
          if (tempChoice._aiSuggestedNextSceneTitle) {
            const targetScene = initialScenes.find(s => s.title === tempChoice._aiSuggestedNextSceneTitle);
            if (targetScene) {
              if (targetScene.id === sceneCopy.id) { // Avoid direct self-loop
                console.warn(`AI Stage Wizard: Choice "${tempChoice.text}" in scene "${sceneCopy.title}" suggested linking to itself. This link will be ignored.`);
              } else {
                resolvedNextSceneId = targetScene.id;
              }
            } else {
              console.warn(`AI Stage Wizard: For choice "${tempChoice.text}" in scene "${sceneCopy.title}", could not find suggested next scene titled "${tempChoice._aiSuggestedNextSceneTitle}". This choice will lead to nowhere unless manually linked.`);
            }
          }
          return {
            id: tempChoice.id,
            text: tempChoice.text,
            nextSceneId: resolvedNextSceneId,
          };
        });
      }
      delete sceneCopy._tempChoices; // Clean up temporary property

      return sceneCopy as Scene; // Cast back to Scene after removing temporary prop
    });

    return {
      stageDetails: {
        title: aiOutput.generatedStageTitle,
        settingDescription: aiOutput.generatedStageSettingDescription,
      },
      characters: finalCharacters,
      scenes: finalScenes,
    };

  } catch (error) {
    console.error("AI로 전체 스테이지 생성 중 오류 발생:", error);
    throw error;
  }
};