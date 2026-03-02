/**
 * Resolve ECharts color placeholders like {{text-primary}} to actual CSS values.
 */
export function resolveThemeColors(option: any): any {
  const root = document.documentElement;
  const style = getComputedStyle(root);

  const tokens = [
    'text-primary', 'text-secondary', 'text-tertiary',
    'success', 'danger', 'border', 'border-light',
    'bg-surface', 'bg-elevated', 'bg-base',
    'accent', 'accent-hover', 'highlight',
    'scrollbar-thumb',
  ];

  const replacements: Record<string, string> = {};
  for (const token of tokens) {
    replacements[`{{${token}}}`] = style.getPropertyValue(`--${token}`).trim();
  }

  const json = JSON.stringify(option);
  const resolved = json.replace(/\{\{[\w-]+\}\}/g, (match) => replacements[match] || match);
  return JSON.parse(resolved);
}
