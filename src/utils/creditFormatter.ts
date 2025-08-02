/**
 * Utility functions for formatting credit amounts
 */

/**
 * Format credit amount to always show two decimal places
 * @param amount - The amount to format (string or number)
 * @returns Formatted amount string with exactly 2 decimal places
 */
export const formatCreditAmount = (amount: string | number): string => {
  if (typeof amount === 'string') {
    // Remove any existing dollar signs and spaces
    const cleanAmount = amount.replace(/[$\s]/g, '');
    const numAmount = parseFloat(cleanAmount);
    
    if (isNaN(numAmount)) {
      return '0.00';
    }
    
    return numAmount.toFixed(2);
  }
  
  if (typeof amount === 'number') {
    return amount.toFixed(2);
  }
  
  return '0.00';
};

/**
 * Format credit amount with dollar sign and two decimal places
 * @param amount - The amount to format (string or number)
 * @returns Formatted amount string with dollar sign and exactly 2 decimal places
 */
export const formatCreditAmountWithDollar = (amount: string | number): string => {
  return `$${formatCreditAmount(amount)}`;
};

/**
 * Parse credit amount from string to number
 * @param amount - The amount string to parse
 * @returns Parsed number or 0 if invalid
 */
export const parseCreditAmount = (amount: string): number => {
  const cleanAmount = amount.replace(/[$\s]/g, '');
  const numAmount = parseFloat(cleanAmount);
  return isNaN(numAmount) ? 0 : numAmount;
};

/**
 * Validate credit amount input
 * @param amount - The amount to validate
 * @returns True if valid, false otherwise
 */
export const validateCreditAmount = (amount: string): boolean => {
  const cleanAmount = amount.replace(/[$\s]/g, '');
  const numAmount = parseFloat(cleanAmount);
  return !isNaN(numAmount) && numAmount >= 0;
};

export default {
  formatCreditAmount,
  formatCreditAmountWithDollar,
  parseCreditAmount,
  validateCreditAmount
};
