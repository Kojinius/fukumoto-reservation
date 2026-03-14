/** 電話番号バリデーション（半角数字・ハイフン） */
export function isValidPhone(phone: string): boolean {
  return /^[0-9-]{10,15}$/.test(phone);
}

/** メールバリデーション */
export function isValidEmail(email: string): boolean {
  return /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9]([a-zA-Z0-9.-]*[a-zA-Z0-9])?\.[a-zA-Z]{2,}$/.test(email);
}

/** 郵便番号バリデーション（7桁数字、ハイフン任意） */
export function isValidZip(zip: string): boolean {
  return /^\d{3}-?\d{4}$/.test(zip);
}

/** 必須フィールドチェック */
export function isRequired(value: string): boolean {
  return value.trim().length > 0;
}

/** パスワード複雑性チェック（8〜128文字、英大小+数字+記号） */
export function isStrongPassword(pw: string): { valid: boolean; reason?: string } {
  if (pw.length < 8)  return { valid: false, reason: '8文字以上で入力してください' };
  if (pw.length > 128) return { valid: false, reason: '128文字以内で入力してください' };
  if (!/[A-Z]/.test(pw)) return { valid: false, reason: '英大文字を含めてください' };
  if (!/[a-z]/.test(pw)) return { valid: false, reason: '英小文字を含めてください' };
  if (!/[0-9]/.test(pw)) return { valid: false, reason: '数字を含めてください' };
  if (!/[!@#$%^&*()_+\-=[\]{};':"|,.<>/?]/.test(pw)) return { valid: false, reason: '記号を含めてください' };
  return { valid: true };
}

/** ふりがなバリデーション（ひらがな・カタカナ・スペース） */
export function isValidFurigana(str: string): boolean {
  return /^[\u3040-\u309F\u30A0-\u30FF\s　]+$/.test(str);
}
