export const CLASSES_PER_PAGE = 4;

export function paginateClasses<T>(items: readonly T[], requestedPage: number) {
  const totalPages = Math.ceil(items.length / CLASSES_PER_PAGE);
  const currentPage = Math.max(1, Math.min(requestedPage, totalPages || 1));
  const offset = (currentPage - 1) * CLASSES_PER_PAGE;

  return {
    items: items.slice(offset, offset + CLASSES_PER_PAGE),
    currentPage,
    totalPages,
    startItem: items.length === 0 ? 0 : offset + 1,
    endItem: Math.min(offset + CLASSES_PER_PAGE, items.length),
  };
}
