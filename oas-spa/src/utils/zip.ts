interface ZipResult {
  address1: string;
  address2: string;
  address3: string;
}

/** 郵便番号から住所を検索（zipcloud API） */
export async function lookupZip(zip: string): Promise<string | null> {
  const cleaned = zip.replace(/-/g, '');
  if (!/^\d{7}$/.test(cleaned)) return null;

  const res = await fetch(`https://zipcloud.ibsnet.co.jp/api/search?zipcode=${cleaned}`);
  const json = await res.json();

  if (!Array.isArray(json.results) || json.results.length === 0) return null;

  const r = json.results[0] as ZipResult;
  return `${r.address1}${r.address2}${r.address3}`;
}
