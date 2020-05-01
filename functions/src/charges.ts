import * as functions from 'firebase-functions';

import { stripe } from './config';
import { assert, assertUID, catchErrors } from './helpers';
import { attachSource } from './sources';
import { getCustomerId } from './users';

/**
 * Gets a user's charge history
 */
export const getUserCharges = async(uid: string, limit?: number) =>{
    const customer = await getCustomerId(uid);

    return await stripe.charges.list({
        limit,
        customer
    });
}

/**
 * Creates a charge for a specific amount
 */
export const createCharge = async(uid: string, source: string, amount: number, idempotency_key?: string) =>{
    const customer = await getCustomerId(uid);
    await attachSource(uid, source);

    return stripe.charges.create({
        amount,
        customer,
        source,
        currency: 'usd',
    }, { idempotency_key });
}


export const stripeCreateCharge = functions.https.onCall( async (data, context) => {
    const uid = assertUID(context);
    const source = assert(data, 'source');
    const amount = assert(data, 'amount');

    // Optional
    const idempotency_key = data.itempotency_key;

    return catchErrors( createCharge(uid, source, amount, idempotency_key) );
});

export const stripeGetCharges = functions.https.onCall( async (data, context) => {
    const uid = assertUID(context);
    return catchErrors( getUserCharges(uid) );
});