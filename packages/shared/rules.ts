export type Rules = {
  denylist: string[];
  allowlist: string[];
  comment: string;
};
export function normalise(s: string) {
  return s
    .normalize('NFKD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .trim()
    .replace(/^(?:al|el)[\s-]+/, '')
    .replace(/[’']/g, '')
    .replace(/-/g, ' ')
    .replace(/[^\p{L}\p{N}\s]/gu, '')
    .replace(/\s+/g, ' ')
    .trim();
}
export function forbiddenName(s: string, rules: Rules) {
  const n = normalise(s);
  if (rules.allowlist.some((a) => normalise(a) === n)) return false;
  const beforeLineage = n.split(/\s+(?:ibn|bin|bint)\s+/)[0];
  return rules.denylist.some((d) => {
    const v = normalise(d);
    return (
      n === v ||
      beforeLineage === v ||
      (!v.includes(' ') && beforeLineage.split(' ').includes(v))
    );
  });
}
