import * as functions from 'firebase-functions';

import { stripe } from './config';
import { getOrCreateCustomer } from './customers';
import { assert, assertUID } from './helpers';

/**
 * Attaches a payment source to a stripe customer account.
 * Also sets the source as default.
 */
export const attachSource = async (uid: string, source: string) => {
    const customer = await getOrCreateCustomer(uid);
    const existingSource = customer.sources ? customer.sources.data.filter(s => s.id === source).pop() : false;

    if (existingSource) {
        return existingSource;
    }
    
    await stripe.customers.createSource(customer.id, {source: source});
    return await stripe.customers.update(customer.id, {default_source: source});
}

/**
 * Gets all sources for the user
 */
export const getSources = async (uid: string) => {
    const customer = await getOrCreateCustomer(uid);
    if (!customer || !customer.sources) {
        return undefined;
    }
    const sources = customer.sources.data;

    return sources;
}

export const stripeAttachSource = functions.https.onCall( async (data, context) => {
    const uid = assertUID(context);
    const source = assert(data, 'source');
    
    return attachSource(uid, source);
})

export const stripeGetSources = functions.https.onCall( async (data, context) => {
    const uid = assertUID(context);

    return getSources(uid);
})