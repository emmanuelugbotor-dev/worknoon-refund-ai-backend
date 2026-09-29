import { Order } from '@prisma/client';

export const REFUND_WINDOW_DAYS = 30;
export const HUMAN_REVIEW_THRESHOLD = 500;

export type PolicyResult = {
  eligible: boolean;
  autoDecision: 'APPROVED' | 'DENIED' | 'ESCALATED';
  flags: string[];
  rules: Record<string, boolean>;
};

export function evaluatePolicy(order: Order & { items: { finalSale: boolean; condition: string; productName: string }[] }, message: string): PolicyResult {
  const flags: string[] = [];
  const ageDays = Math.floor((Date.now() - order.orderDate.getTime()) / 86400000);
  const withinWindow = ageDays <= REFUND_WINDOW_DAYS;
  const finalSale = order.items.some(i => i.finalSale);
  const amountRequiresReview = Number(order.amount) > HUMAN_REVIEW_THRESHOLD;
  const suspicious = /(ignore|bypass|override|system prompt|developer message|jailbreak|admin says)/i.test(message);
  const damageClaim = /(damaged|broken|defective|wrong item|incorrect item)/i.test(message);

  if (!withinWindow) flags.push('ORDER_OUTSIDE_REFUND_WINDOW');
  if (finalSale) flags.push('FINAL_SALE_ITEM');
  if (amountRequiresReview) flags.push('AMOUNT_REQUIRES_HUMAN_REVIEW');
  if (suspicious) flags.push('POTENTIAL_PROMPT_INJECTION');
  if (!damageClaim) flags.push('DAMAGE_OR_INCORRECT_ITEM_NOT_ESTABLISHED');

  const rules = {
    withinRefundWindow: withinWindow,
    finalSaleEligible: !finalSale,
    amountBelowHumanReviewThreshold: !amountRequiresReview,
    requestAppearsSafe: !suspicious,
    damageOrIncorrectItemClaim: damageClaim
  };

  let autoDecision: PolicyResult['autoDecision'] = 'APPROVED';
  if (!withinWindow || finalSale) autoDecision = 'DENIED';
  else if (amountRequiresReview || suspicious) autoDecision = 'ESCALATED';

  return { eligible: autoDecision !== 'DENIED', autoDecision, flags, rules };
}
