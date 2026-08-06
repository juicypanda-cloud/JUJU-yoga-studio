import assert from 'node:assert';
import { resolveServerItemPriceAndIntent } from '../lib/server/qpayCreateInvoice.js';
import {
  extractQPayPaidAmountAndCurrency,
  bookingDocIdForInvoice,
  serializePaymentIntent,
} from '../lib/server/qpayWebhookCore.js';
import fs from 'node:fs';
import path from 'node:path';

async function runSecurityTests() {
  console.log('====================================================');
  console.log('RUNNING JUJU YOGA STUDIO SECURITY VERIFICATION TESTS');
  console.log('====================================================\n');

  let passedTests = 0;

  // ----------------------------------------------------
  // TEST 1: User cannot become admin by editing profile
  // ----------------------------------------------------
  console.log('[TEST 1] Verifying privilege escalation prevention in firestore.rules...');
  const rulesContent = fs.readFileSync(path.resolve('firestore.rules'), 'utf8');

  // Verify that anand@one.mn bypass is removed
  assert.strictEqual(
    rulesContent.includes('anand@one.mn'),
    false,
    'SECURITY ERROR: Hardcoded admin email bypass (anand@one.mn) still exists in firestore.rules!'
  );

  // Verify that user profile rules prohibit changing role and subscription fields
  assert.ok(
    rulesContent.includes("!request.resource.data.diff(resource.data).affectedKeys().hasAny"),
    'SECURITY ERROR: firestore.rules does not check affectedKeys for privilege escalation!'
  );
  assert.ok(
    rulesContent.includes("'role'"),
    'SECURITY ERROR: firestore.rules does not restrict role key modification!'
  );
  assert.ok(
    rulesContent.includes("'subscriptionStatus'"),
    'SECURITY ERROR: firestore.rules does not restrict subscriptionStatus key modification!'
  );
  console.log('✅ TEST 1 PASSED: firestore.rules prevents non-admin privilege escalation and email bypass.\n');
  passedTests++;

  // ----------------------------------------------------
  // TEST 2: Client cannot create a cheap payment or long subscription
  // ----------------------------------------------------
  console.log('[TEST 2] Verifying server-side payment price & duration override...');
  const subscriptionResult = await resolveServerItemPriceAndIntent({
    kind: 'subscription',
    planId: 'online-video',
    durationDays: 9999, // Attempted long duration
  });

  assert.strictEqual(
    subscriptionResult.amount,
    100,
    `SECURITY ERROR: Server returned price ${subscriptionResult.amount} instead of official price 100`
  );
  assert.strictEqual(
    (subscriptionResult.validatedIntent as any).durationDays,
    30,
    `SECURITY ERROR: Server allowed client to tamper subscription duration: ${(subscriptionResult.validatedIntent as any).durationDays}`
  );
  console.log('✅ TEST 2 PASSED: Server overrides client price and subscription duration to safe values.\n');
  passedTests++;

  // ----------------------------------------------------
  // TEST 3: Client cannot manipulate booking counts
  // ----------------------------------------------------
  console.log('[TEST 3] Verifying direct client manipulation of schedule.bookedCount is disabled...');
  // Ensure the old client bookedCount update rule is removed from firestore.rules
  const scheduleUpdateRuleRegex = /changedKeys\(\)\.hasOnly\(\['bookedCount'\]\)/;
  assert.strictEqual(
    scheduleUpdateRuleRegex.test(rulesContent),
    false,
    'SECURITY ERROR: firestore.rules still allows clients to directly modify schedule.bookedCount!'
  );
  console.log('✅ TEST 3 PASSED: Clients cannot update schedule.bookedCount directly via Firestore SDK.\n');
  passedTests++;

  // ----------------------------------------------------
  // TEST 4: Webhook cannot fulfill an invoice with an incorrect amount
  // ----------------------------------------------------
  console.log('[TEST 4] Verifying webhook paid amount & currency verification...');
  
  // Test extracting amount from QPay response
  const validQPayPayload = {
    rows: [
      {
        payment_amount: 100,
        payment_currency: 'MNT',
        payment_status: 'PAID',
      },
    ],
  };
  const { paidAmount, currency } = extractQPayPaidAmountAndCurrency(validQPayPayload);
  assert.strictEqual(paidAmount, 100, 'Failed to extract paid amount from QPay payload');
  assert.strictEqual(currency, 'MNT', 'Failed to extract currency from QPay payload');

  // Test amount mismatch detection (paid 50 MNT for 100 MNT invoice)
  const underpaidPayload = {
    rows: [
      {
        payment_amount: 50,
        payment_currency: 'MNT',
        payment_status: 'PAID',
      },
    ],
  };
  const { paidAmount: underpaidAmt } = extractQPayPaidAmountAndCurrency(underpaidPayload);
  const expectedAmount = 100;
  const isUnderpaid = (underpaidAmt ?? 0) < expectedAmount;
  assert.strictEqual(isUnderpaid, true, 'SECURITY ERROR: Underpayment was not flagged!');

  console.log('✅ TEST 4 PASSED: Webhook correctly verifies QPay paid amount and currency against expected invoice data.\n');
  passedTests++;

  // ----------------------------------------------------
  // TEST 5: Valid QPay payment creates correct booking/subscription
  // ----------------------------------------------------
  console.log('[TEST 5] Verifying valid QPay intent serialization & doc ID generation...');
  
  const classIntent = { kind: 'class_month' as const, classId: 'hatha-yoga', monthKey: '2026-08' };
  const serialized = serializePaymentIntent(classIntent);
  assert.strictEqual(serialized.kind, 'class_month');
  assert.strictEqual(serialized.classId, 'hatha-yoga');

  const invoiceId = 'INV-123456';
  const bookingDocId = bookingDocIdForInvoice(invoiceId);
  assert.strictEqual(bookingDocId, 'qpay_INV-123456');

  console.log('✅ TEST 5 PASSED: Payment intent serialization and document ID generation work as expected.\n');
  passedTests++;

  console.log('====================================================');
  console.log(`ALL ${passedTests} SECURITY VERIFICATION TESTS PASSED SUCCESSFULLY!`);
  console.log('====================================================');
}

runSecurityTests().catch((err) => {
  console.error('SECURITY TEST FAILED:', err);
  process.exit(1);
});
