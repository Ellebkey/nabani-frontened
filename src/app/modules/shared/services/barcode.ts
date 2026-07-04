/** EAN-13 grouped for reading (7 501055 310884); other lengths pass through. */
export function formatBarcode(code: string | null | undefined): string {
  if (!code) {
    return '';
  }
  const digits = code.trim();
  if (!/^\d{13}$/.test(digits)) {
    return digits;
  }
  return `${digits[0]} ${digits.slice(1, 7)} ${digits.slice(7)}`;
}
