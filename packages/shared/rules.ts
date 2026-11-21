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
export function forbiddenName(s: string, rules: Rules, familyName?: string) {
  const n = normalise(s);
  if (rules.allowlist.some((a) => normalise(a) === n)) return false;
  // AGENTS.md distinguishes given names from surnames. Only an explicitly
  // recorded, whole trailing surname can be excluded from the given-name
  // check. Keep checking the original full identity and all remaining given
  // names; a lone denylisted name can never be removed this way.
  const family = familyName && normalise(familyName),
    given =
      family && n.endsWith(` ${family}`) ? n.slice(0, -family.length - 1) : n,
    beforeLineage = given.split(/\s+(?:ibn|bin|bint)\s+/)[0];
  return rules.denylist.some((d) => {
    const v = normalise(d);
    return (
      n === v ||
      beforeLineage === v ||
      (!v.includes(' ') && beforeLineage.split(' ').includes(v))
    );
  });
}
