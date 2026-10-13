/**
 * Formats integer paise into Indian Rupee currency display string.
 * Never performs floating-point arithmetic on prices.
 */
export function formatPaiseToINR(paise: number): string {
  const safePaise = Math.trunc(paise);
  const rupees = Math.floor(Math.abs(safePaise) / 100);
  const remainderPaise = Math.abs(safePaise) % 100;
  const sign = safePaise < 0 ? '-' : '';
  const formattedRupees = rupees.toLocaleString('en-IN');
  return `${sign}₹${formattedRupees}.${remainderPaise.toString().padStart(2, '0')}`;
}

