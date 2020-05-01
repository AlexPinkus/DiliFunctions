import * as functions from 'firebase-functions';

import { db, stripe, usersCollection, webhookSecret } from './config';

import Stripe = require('stripe');

export const webhook = functions.https.onRequest(async (req, res) => {
  const signature = req.headers['stripe-signature'] as string;

  let event;

  try {
    event = stripe.webhooks.constructEvent(req.rawBody, signature, webhookSecret);
  } catch (err) {
    res.status(400).send({ error: err });
    return;
  }

  // Handle Type of webhook
  const intent = event.data.object as Stripe.paymentIntents.IPaymentIntent;

  switch (event.type) {
    case 'customer.subscription.deleted':
      // Update user subscription status in db
      const subscription = event.data.object as Stripe.subscriptions.ISubscription;

      const docData = {
        stateSub: 'inactive',
      };

      try {
        const usersSnapshot = await db
          .collection(usersCollection)
          .where('stripeCustomerId', '==', subscription.customer)
          .get();
        let uid;
        usersSnapshot.forEach((user) => (uid = user.id));
        await db.doc(`${usersCollection}/${uid}`).set(docData, { merge: true });

        res.status(200).send(`Subscription canceled and user updated: ${uid}`);
      } catch (error) {
        res.status(500).send({ 'Error while updating user:': error });
      }

      break;

    case 'payment_intent.succeeded':
      res.status(200).send({ 'Succeeded:': intent.id });
      break;

    case 'payment_intent.payment_failed':
      const message = intent.last_payment_error && intent.last_payment_error.message;
      console.log('Failed:', intent.id, message);
      res.status(200).send({ 'Failed:': intent.id, message });
      break;
  }
});
