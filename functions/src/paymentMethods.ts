import * as functions from 'firebase-functions';

import { stripe } from './config';
import { assert, assertUID } from './helpers';
import { getCustomerId } from './users';

export const setDefaultPaymentMethod = async (uid: string, paymentMethodId: string) => {
  const customerId = await getCustomerId(uid);

  return await stripe.customers.update(customerId, { invoice_settings: { default_payment_method: paymentMethodId } });
};

export const getPaymentMethods = async (uid: string) => {
  const customer = await getCustomerId(uid);
  const paymentMethods = await stripe.paymentMethods.list({
    customer,
    type: 'card',
  });

  return paymentMethods.data;
};

export const getDefaultPaymentMethod = async (uid: string) => {
  const customerId = await getCustomerId(uid);
  const customer = await stripe.customers.retrieve(customerId);

  if (customer.invoice_settings && customer.invoice_settings.default_payment_method) {
    return customer.invoice_settings.default_payment_method;
  }

  const paymentMethods = await stripe.paymentMethods.list({
    customer: customerId,
    type: 'card',
  });

  if (!paymentMethods.data.length) {
    throw new Error('User does not have paymentMethods');
  }

  return paymentMethods.data[0].id;
};

export const stripeSetDefaultPaymentMethod = functions.https.onCall(async (data, context) => {
  const uid = assertUID(context);
  const paymentMethodId = assert(data, 'paymentMethodId');

  return setDefaultPaymentMethod(uid, paymentMethodId);
});

export const stripeGetPaymentMethods = functions.https.onCall(async (data, context) => {
  const uid = assertUID(context);

  return getPaymentMethods(uid);
});
