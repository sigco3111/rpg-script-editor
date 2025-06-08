
import { Project } from '../types';

const LOCAL_STORAGE_KEY = 'jrpgProject';

export const saveProjectToLocalStorage = (project: Project): void => {
  try {
    const serializedProject = JSON.stringify(project);
    localStorage.setItem(LOCAL_STORAGE_KEY, serializedProject);
  } catch (error) {
    console.error("Error saving project to local storage:", error);
  }
};

export const loadProjectFromLocalStorage = (): Project | null => {
  try {
    const serializedProject = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (serializedProject === null) {
      return null;
    }
    return JSON.parse(serializedProject) as Project;
  } catch (error) {
    console.error("Error loading project from local storage:", error);
    return null;
  }
};
    