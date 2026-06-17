export const getPrimaryColor = () => {
  if (typeof window === 'undefined') return '#10b981';
  return getComputedStyle(document.documentElement).getPropertyValue('--school-primary').trim() || '#10b981';
};

export const hexToRgb = (hex: string): [number, number, number] => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? [
    parseInt(result[1], 16),
    parseInt(result[2], 16),
    parseInt(result[3], 16)
  ] : [16, 185, 129];
};
