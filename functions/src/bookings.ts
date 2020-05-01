import * as functions from 'firebase-functions';

import { db } from './config';
import { assert, assertUID, catchErrors } from './helpers';
import { chargePayment, refundPayment, setupIntent } from './intents';

const bookingCollection = 'Bookings';

const getBooking = async (id: string): Promise<any> => {
  return await db
    .collection(bookingCollection)
    .doc(id)
    .get()
    .then(doc => doc.data());
};

export const updateBooking = async (id: string, data: Object): Promise<any> => {
  const booking = await db
    .collection(bookingCollection)
    .doc(id)
    .set(data, { merge: true });
  return booking;
};

const setUpBooking = async (uid: string, bookingId: string): Promise<any> => {
  const booking = await getBooking(bookingId);
  if (!booking) {
    return 'Invalid booking Id';
  }

  const setupInt = await setupIntent(uid);

  await updateBooking(bookingId, {
    paymentStatus: 'pending',
    paymentSetupIntent: setupInt.id,
    userId: uid,
  });

  return setupInt;
};

const chargeBooking = async (uid: string, bookingId: string): Promise<any> => {
  const booking = await getBooking(bookingId);
  if (!booking) {
    return 'Invalid booking Id';
  }

  const intent = await chargePayment(booking.userId, booking.amount, { bookingId });

  return updateBooking(bookingId, {
    paymentStatus: 'payment-charged',
    paymentIntent: intent.id,
    acceptedBy: uid,
  });
};

const cancelBooking = async (id: string): Promise<any> => {
  const booking = await getBooking(id);
  if (!booking) {
    return 'Invalid booking Id';
  }

  // await cancelPayment(booking.intentId);

  return updateBooking(id, {
    paymentStatus: 'canceled',
  });
};

const refundBooking = async (id: string): Promise<any> => {
  const booking = await getBooking(id);
  if (!booking) {
    return 'Invalid booking Id';
  }

  if (booking.paymentStatus !== 'paid') {
    return 'Cannot refund the booking';
  }

  await refundPayment(booking.paymentIntent, booking.amount);

  return updateBooking(id, {
    paymentStatus: 'refunded',
  });
};

export const createReservation = functions.https.onCall(async (data, context) => {
  const uid = assertUID(context);
  const bookingId = assert(data, 'bookingId');

  return catchErrors(setUpBooking(uid, bookingId));
});

export const acceptReservation = functions.https.onCall(async (data, context) => {
  const uid = assertUID(context);
  const bookingId = assert(data, 'bookingId');

  return catchErrors(chargeBooking(uid, bookingId));
});

export const cancelReservation = functions.https.onCall(async (data, context) => {
  const bookingId = assert(data, 'bookingId');

  return catchErrors(cancelBooking(bookingId));
});

export const refundReservation = functions.https.onCall(async (data, context) => {
  const bookingId = assert(data, 'bookingId');

  return catchErrors(refundBooking(bookingId));
});
