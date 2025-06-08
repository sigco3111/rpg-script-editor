
import { WorldSettings, Project } from './types';

export const GEMINI_MODEL_TEXT = 'gemini-2.5-flash-preview-04-17';

export const USER_API_KEY_LOCAL_STORAGE_KEY = 'userDefinedGeminiApiKey';
export const PLACEHOLDER_API_KEY = "GEMINI_API_키를_여기에_입력하세요";

export const getEffectiveApiKey = (): string => {
  // Prefer environment variable if set and not the placeholder
  const envApiKey = process.env.API_KEY;
  if (envApiKey && envApiKey !== PLACEHOLDER_API_KEY && envApiKey.trim() !== '') {
    return envApiKey;
  }

  // Fallback to localStorage
  const storedKey = localStorage.getItem(USER_API_KEY_LOCAL_STORAGE_KEY);
  if (storedKey && storedKey.trim() !== '') {
    return storedKey;
  }

  // If process.env.API_KEY was the placeholder, and nothing in local storage, return placeholder
  if (envApiKey === PLACEHOLDER_API_KEY) {
    return PLACEHOLDER_API_KEY;
  }
  
  // If process.env.API_KEY was undefined/empty, and nothing in local storage, also return placeholder
  // This ensures a consistent "not configured" signal.
  return PLACEHOLDER_API_KEY;
};

export const saveUserApiKey = (key: string): void => {
  if (key && key.trim() !== '') {
    localStorage.setItem(USER_API_KEY_LOCAL_STORAGE_KEY, key);
  } else {
    // If an empty key is provided, remove it to allow fallback to env var or placeholder
    localStorage.removeItem(USER_API_KEY_LOCAL_STORAGE_KEY);
  }
};

export const isApiKeyEffectivelyConfigured = (): boolean => {
  const effectiveKey = getEffectiveApiKey();
  return effectiveKey !== PLACEHOLDER_API_KEY && effectiveKey.trim() !== '';
};


export const initialWorldSettings: WorldSettings = {
  title: '',
  description: '',
  mainConflict: '',
  keyLocations: '',
};

export const initialProject: Project = {
  worldSettings: null,
  stages: [],
};