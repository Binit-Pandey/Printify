const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

function convertGroup(n: number): string {
  if (n === 0) return '';
  if (n < 20) return ones[n];
  if (n < 100) return tens[Math.floor(n / 10)] + (n % 10 ? ' ' + ones[n % 10] : '');
  return ones[Math.floor(n / 100)] + ' Hundred' + (n % 100 ? ' and ' + convertGroup(n % 100) : '');
}

export function numberToWords(num: number): string {
  if (num === 0) return 'Zero';

  const intPart = Math.floor(num);
  const decPart = Math.round((num - intPart) * 100);

  let result = '';

  if (intPart >= 10000000) {
    result += convertGroup(Math.floor(intPart / 10000000)) + ' Crore ';
  }
  if (intPart >= 100000) {
    const lakh = Math.floor((intPart % 10000000) / 100000);
    if (lakh > 0) result += convertGroup(lakh) + ' Lakh ';
  }
  if (intPart >= 1000) {
    const thousand = Math.floor((intPart % 100000) / 1000);
    if (thousand > 0) result += convertGroup(thousand) + ' Thousand ';
  }
  if (intPart >= 100) {
    const hundred = Math.floor((intPart % 1000) / 100);
    if (hundred > 0) result += convertGroup(hundred) + ' Hundred ';
  }
  const remainder = intPart % 100;
  if (remainder > 0) {
    if (result !== '') result += 'and ';
    result += convertGroup(remainder);
  }

  result = result.trim() + ' Rupees';

  if (decPart > 0) {
    result += ' and ' + convertGroup(decPart) + ' Paisa';
  }

  return result + ' Only';
}
