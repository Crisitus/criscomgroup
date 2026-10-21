// Utilidad simple para combinar classNames opcionales
export function cn(...classes: Array<string | undefined | null | false>) {
  return classes.filter(Boolean).join(" ");
}