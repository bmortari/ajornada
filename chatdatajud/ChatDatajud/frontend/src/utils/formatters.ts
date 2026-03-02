/**
 * Format bold markdown (**text**) into HTML with theme color.
 * Also converts \n to <br>.
 */
export function formatBold(text: string): string {
  return text
    .replace(/\*\*(.*?)\*\*/g, '<strong style="color:var(--text-primary)">$1</strong>')
    .replace(/\n/g, '<br>');
}

/**
 * Format number Brazilian style: 1234567 → 1.234.567
 */
export function formatNumberBR(n: number): string {
  return n.toLocaleString('pt-BR');
}
