/** Minúsculas y sin tildes, para comparar "Sildar" con "sildár". */
export const fold = (s: string): string => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
