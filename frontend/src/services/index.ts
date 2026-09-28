import { courseService } from "./courseService";
import { disciplineService } from "./disciplineService";
import { authService } from "./authService";

export * from "./httpClient";
export * from "./courseService";
export * from "./disciplineService";
export * from "./authService";

export const api = {
  courses: courseService,
  disciplines: disciplineService,
  auth: authService,

  // Atalhos diretos para compatibilidade e conveniência
  getCourses: courseService.getCourses,
  getCourseBySlug: courseService.getCourseBySlug,
  getDisciplines: disciplineService.getDisciplines,
  getCatalogDisciplines: disciplineService.getCatalogDisciplines,
  getDisciplineBySlug: disciplineService.getDisciplineBySlug,
  getComments: disciplineService.getComments,
  login: authService.login,
  register: authService.register,
  logout: authService.logout,
  isAuthenticated: authService.isAuthenticated,
};

export default api;
