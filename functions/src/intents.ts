import * as functions from 'firebase-functions';

import { stripe } from './config';
import { assert, assertUID, catchErrors } from './helpers';
import { getDefaultPaymentMethod } from './paymentMethods';
import { getCustomerId } from './users';

/**
 * Creates a charge for a specific amount
 */
export const createIntent = async (uid: string, bookingId: string, amount: number, idempotency_key?: string) => {
  const customer = await getCustomerId(uid);

  const paymentIntent = await stripe.paymentIntents.create({
    amount,
    currency: 'MXN',
    payment_method_types: ['card'],
    metadata: { uid, customer },
  });

  return paymentIntent;
};

/**
 * Setups and intent to be payed later
 */
export const setupIntent = async (uid: string, idempotency_key?: string) => {
  const customer = await getCustomerId(uid);
  const setupInt = await stripe.setupIntents.create({
    customer: customer,
  });
  console.log('intent :', setupInt);
  // { client_secret: intent.client_secret }
  return setupInt;
};

export const chargePayment = async (uid: string, amount: number, metadata?: any, idempotency_key?: string) => {
  const customer = await getCustomerId(uid);
  const paymentMethodId = await getDefaultPaymentMethod(uid);

  try {
    const paymentIntent = await stripe.paymentIntents.create({
      amount,
      currency: 'mxn',
      customer,
      payment_method: paymentMethodId,
      off_session: true,
      confirm: true,
      metadata,
    } as any);

    return paymentIntent;
  } catch (err) {
    // Error code will be authentication_required if authentication is needed
    console.log('Error code is: ', err.code);
    throw err;
    // const paymentIntentRetrieved = await stripe.paymentIntents.retrieve(err.raw.payment_intent.id);
    // console.log('PI retrieved: ', paymentIntentRetrieved.id);
  }
};

export const cancelPayment = async (intentId: string) => {
  await stripe.paymentIntents.cancel(intentId);
  return 'Payment succesfully canceled';
};

export const refundPayment = async (intentId: string, amount: number) => {
  await stripe.refunds.create({
    amount,
    payment_intent: intentId,
  } as any);
  return 'Payment succesfully canceled';
};

export const stripeCreateIntent = functions.https.onCall(async (data, context) => {
  const uid = assertUID(context);
  const source = assert(data, 'source');
  const amount = assert(data, 'amount');

  // Optional
  const idempotency_key = data.itempotency_key;

  return catchErrors(createIntent(uid, source, amount, idempotency_key));
});
