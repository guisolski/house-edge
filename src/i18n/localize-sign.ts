/** Localize baked neon sign labels at draw time. */

import { t } from './index';
import { signLabelToKey } from './sign-en';

export function localizeSign(label: string): string {
  const key = signLabelToKey[label];
  if (!key) return label;
  const v = t(key);
  return v !== key ? v : label;
}
