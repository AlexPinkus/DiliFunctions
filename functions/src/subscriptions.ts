import * as functions from 'firebase-functions';

import { db, stripe, usersCollection } from './config';
import { assert, assertUID, catchErrors } from './helpers';
import { getCustomerId } from './users';

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
const createSubscription = async (uid: string, plan: string, coupon?: string) => {
  const customer = await getCustomerId(uid);

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
const cancelSubscription = async (uid: string, subscriptionId: string) => {
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
  const plan = assert(data, 'plan');

  return catchErrors(createSubscription(uid, plan, data.coupon));
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
