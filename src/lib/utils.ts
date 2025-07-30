/**
 * Format a number as currency (INR)
 */
export const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
  }).format(amount);
};

/**
 * Format a date string into a human-readable format
 */
export const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  return new Intl.DateTimeFormat('en-IN', {
    year: 'numeric',
    month: 'short',
    day: '2-digit'
  }).format(date);
};

/**
 * Calculate the amount for an invoice item
 */
export const calculateAmount = (quantity: number, rate: number, discount: number): number => {
  const amount = quantity * rate;
  const discountAmount = (amount * discount) / 100;
  return amount - discountAmount;
};

/**
 * Convert a number to words (for invoice total amount in words)
 */
export const numberToWords = (num: number): string => {
  const units = ['', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen'];
  const tens = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety'];
  
  if (num === 0) return 'zero';
  
  const convertLessThanOneThousand = (n: number): string => {
    if (n < 20) return units[n];
    
    const digit = n % 10;
    if (n < 100) return tens[Math.floor(n / 10)] + (digit ? '-' + units[digit] : '');
    
    return units[Math.floor(n / 100)] + ' hundred' + (n % 100 ? ' ' + convertLessThanOneThousand(n % 100) : '');
  };
  
  let words = '';
  
  // Handle crores
  if (num >= 10000000) {
    words += convertLessThanOneThousand(Math.floor(num / 10000000)) + ' crore ';
    num %= 10000000;
  }
  
  // Handle lakhs
  if (num >= 100000) {
    words += convertLessThanOneThousand(Math.floor(num / 100000)) + ' lakh ';
    num %= 100000;
  }
  
  // Handle thousands
  if (num >= 1000) {
    words += convertLessThanOneThousand(Math.floor(num / 1000)) + ' thousand ';
    num %= 1000;
  }
  
  // Handle hundreds and remaining
  if (num > 0) {
    words += convertLessThanOneThousand(num);
  }
  
  return words.trim();
};

/**
 * Format a number with comma separators
 */
export const formatNumber = (num: number): string => {
  return new Intl.NumberFormat('en-IN').format(num);
};
