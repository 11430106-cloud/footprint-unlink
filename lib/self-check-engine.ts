import data from '../data/riskRules.json' with { type: 'json' };

export const selfOptions = data.options;
export type Advice = (typeof data.rules)[number] & { matchedLabels: string[] };

export function validateSelfChoices(ids: string[]) {
  if (!Array.isArray(ids) || !ids.length || new Set(ids).size !== ids.length || ids.some(id => !selfOptions.some(option => option.id === id))) {
    throw new Error('請勾選至少一項資訊類型；沒有符合項目時可選「以上皆無」。');
  }
  if (ids.includes('none') && ids.length > 1) throw new Error('「以上皆無」不能和其他項目一起選取。');
}

export function toggleSelfChoice(ids: string[], id: string) {
  if (!selfOptions.some(option => option.id === id)) throw new Error('無效的資訊類型。');
  if (ids.includes(id)) return ids.filter(item => item !== id);
  return id === 'none' ? ['none'] : [...ids.filter(item => item !== 'none'), id];
}

export function getAdvice(ids: string[]): Advice[] {
  validateSelfChoices(ids);
  const categories = new Set<string>();
  return data.rules
    .filter(rule => (!rule.allOf || rule.allOf.every(id => ids.includes(id))) && (!rule.anyOf || rule.anyOf.some(id => ids.includes(id))))
    .sort((a, b) => a.priority - b.priority)
    .filter(rule => {
      if (categories.has(rule.category)) return false;
      categories.add(rule.category);
      return true;
    })
    .map(rule => ({ ...rule, matchedLabels: selfOptions.filter(option => ids.includes(option.id) && [...(rule.allOf ?? []), ...(rule.anyOf ?? [])].includes(option.id)).map(option => option.label) }));
}
