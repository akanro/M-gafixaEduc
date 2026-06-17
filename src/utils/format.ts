export const formatClassName = (name: string): string => {
  if (!name) return '';
  return name.replace(/<sup>/g, '').replace(/<\/sup>/g, '');
};
