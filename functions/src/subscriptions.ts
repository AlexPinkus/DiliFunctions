import * as functions from 'firebase-functions';

import { db, stripe, usersCollection } from './config';
import { assert, assertUID, catchErrors } from './helpers';
import { attachSource } from './sources';
import { getCustomerId } from './users';

import Stripe = require('stripe');

/**
 * Gets a user's subscriptions
 */
export const getSubscriptions = async (uid: string, limit?: number) => {
  const customer = await getCustomerId(uid);
  return await stripe.subscriptions.list({ customer });
};

/**
 * Gets a product's plans
 */
export const getPlans = async () => {
  const plans = await stripe.plans.list({ product: 'prod_H6XBqwPvLLYmfN' });
  const planMapper = (plan: Stripe.plans.IPlan) => {
    return {
      id: plan.id,
      name: plan.nickname,
      slots: Number(plan.metadata.slots),
      cost: plan.amount,
    };
  };
  return plans.data.map(planMapper);
};

/**
 * Creates and charges user for a new subscription
 */
export const createSubscription = async (uid: string, source: string, plan: string, coupon?: string) => {
  const customer = await getCustomerId(uid);
  await attachSource(uid, source);

  const subscription = await stripe.subscriptions.create({
    customer,
    coupon,
    items: [
      {
        plan,
      },
    ],
  });

  // Add the plan to existing subscriptions
  const subscriptionValues = {
    planId: plan,
    subId: subscription.id,
    stateSub: 'active',
  };

  await db.doc(`${usersCollection}/${uid}`).set(subscriptionValues, { merge: true });

  return subscription;
};

/**
 * Cancels a subscription and stops all recurring payments
 */
export const cancelSubscription = async (uid: string, subscriptionId: string) => {
  const subscription = await stripe.subscriptions.del(subscriptionId);
  if (!subscription.plan) {
    return subscription;
  }
  // Add the plan to existing subscriptions
  const docData = {
    stateSub: 'inactive',
  };

  await db.doc(`${usersCollection}/${uid}`).set(docData, { merge: true });

  return subscription;
};

export const stripeCreateSubscription = functions.https.onCall(async (data, context) => {
  const uid = assertUID(context);
  const source = assert(data, 'source');
  const plan = assert(data, 'plan');

  return catchErrors(createSubscription(uid, source, plan, data.coupon));
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

export const stripeGetPlans = functions.https.onCall(async (data, context) => {
  return catchErrors(getPlans());
});
