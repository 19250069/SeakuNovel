export const BAD_WORDS = ['fuck', 'shit', 'bitch', 'asshole', 'cunt', 'dick', 'pussy', 'bastard', 'motherfucker', 'anjing', 'babi', 'bangsat', 'kontol', 'memek', 'jembut', 'peler', 'ngentot', 'bgst', 'jancok', 'goblok', 'tolol'];
export function containsProfanity(text) {
  if (!text) return false;
  const lowerText = text.toLowerCase();
  return BAD_WORDS.some(word => lowerText.includes(word));
}
export function maskProfanity(text) {
  if (!text) return text;
  let maskedText = text;
  BAD_WORDS.forEach(word => {
    const regex = new RegExp('\\b' + word + '\\b', 'gi');
    maskedText = maskedText.replace(regex, '*'.repeat(word.length));
  });
  return maskedText;
}
export function filterContent(text) {
  if (!text) return text;
  return maskProfanity(text);
}
