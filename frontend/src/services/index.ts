import { courseService } from "./courseService";
import { disciplineService } from "./disciplineService";
import { authService } from "./authService";
import { materialService } from "./materialService";
import { difficultyService } from "./difficultyService";
import { openDataService } from "./openDataService";

export * from "./httpClient";
export * from "./courseService";
export * from "./disciplineService";
export * from "./authService";
export * from "./materialService";
export * from "./difficultyService";
export * from "./openDataService";

export const api = {
  courses: courseService,
  disciplines: disciplineService,
  auth: authService,
  materials: materialService,
  difficulties: difficultyService,
  openData: openDataService,

  // Atalhos diretos para compatibilidade e conveniência
  getCourses: courseService.getCourses,
  getCourseBySlug: courseService.getCourseBySlug,
  getDisciplines: disciplineService.getDisciplines,
  getCatalogDisciplines: disciplineService.getCatalogDisciplines,
  getDisciplineBySlug: disciplineService.getDisciplineBySlug,
  getClassesByDiscipline: disciplineService.getClassesByDiscipline,
  getComments: disciplineService.getComments,
  login: authService.login,
  register: authService.register,
  logout: authService.logout,
  isAuthenticated: authService.isAuthenticated,
  uploadMaterial: materialService.uploadMaterial,
  uploadMaterialsBatch: materialService.uploadMaterialsBatch,
  listMaterials: materialService.listMaterials,
  listDifficultyAlerts: difficultyService.listDifficultyAlerts,
  submitDifficultyAlert: difficultyService.submitDifficultyAlert,
  exportCoursesOpenData: openDataService.exportCoursesOpenData,
  exportDisciplinesOpenData: openDataService.exportDisciplinesOpenData,
  exportDisciplineHistoryOpenData: openDataService.exportDisciplineHistoryOpenData,
  exportDisciplineClassesOpenData: openDataService.exportDisciplineClassesOpenData,
};

export default api;
