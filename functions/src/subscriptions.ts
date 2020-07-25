import * as functions from 'firebase-functions';

import { stripe } from './config';
import { assert, assertUID, catchErrors } from './helpers';
import { getCustomerId, getUser, updateUser } from './users';

import Stripe = require('stripe');

/**
 * Gets a user's subscriptions
 */
const getSubscriptions = async (uid: string, limit?: number) => {
  const customer = await getCustomerId(uid);
  return await stripe.subscriptions.list({ customer });
};

/**
 * Creates and charges user for a new subscription
 */
const createSubscription = async (uid: string, plan: string, metadata?: Stripe.IOptionsMetadata, coupon?: string) => {
  const { stripeCustomerId, trial } = await getUser(uid);

  const subscription = await stripe.subscriptions.create({
    customer: stripeCustomerId,
    coupon,
    items: [
      {
        price: plan,
      },
    ] as any,
    trial_from_plan: typeof trial === 'boolean' ? trial : true,
    metadata,
  });

  // Add the plan to existing subscriptions
  const subscriptionValues = {
    planId: plan,
    subId: subscription.id,
    stateSub: 'active',
    trial: false,
  };

  await updateUser(uid, subscriptionValues);

  return subscription;
};

/**
 * Cancels a subscription and stops all recurring payments
 */
const cancelSubscription = async (uid: string, subscriptionId: string) => {
  const subscription = await stripe.subscriptions.del(subscriptionId);
  if (!subscription.plan) {
    return subscription;
  }

  // Add the plan to existing subscriptions
  const docData = {
    stateSub: 'inactive',
  };

  await updateUser(uid, docData);

  return subscription;
};

export const stripeCreateSubscription = functions.https.onCall(async (data, context) => {
  const uid = assertUID(context);
  const plan = assert(data, 'plan');

  return catchErrors(createSubscription(uid, plan, data.metadata, data.coupon));
});

export const stripeCancelSubscription = functions.https.onCall(async (data, context) => {
  const uid = assertUID(context);
  const plan = assert(data, 'plan');

  return catchErrors(cancelSubscription(uid, plan));
});

export const stripeGetSubscriptions = functions.https.onCall(async (data, context) => {
  const uid = assertUID(context);

  return catchErrors(getSubscriptions(uid));
});
