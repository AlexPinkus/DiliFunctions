document.addEventListener('DOMContentLoaded', async function() {
  // Initialize
  let app = firebase.app();
  let features = ['auth', 'functions'].filter(feature => typeof app[feature] === 'function');
  const bookingId = 'e6HqLEx8f9GolKCTPdnv';

  // Firebase Services
  const fun = firebase.functions();
  const auth = firebase.auth();

  // DOM Elements
  const loginBtn = document.getElementById('login');
  const logoutBtn = document.getElementById('logout');
  const profile = document.getElementById('profile');
  const acceptBtn = document.getElementById('accept');
  const refundBtn = document.getElementById('refund');

  auth.onAuthStateChanged(user => {
    if (user) {
      profile.innerHTML = user.uid;
      loginBtn.style.visibility = 'hidden';
      logoutBtn.style.visibility = 'visible';
    } else {
      profile.innerHTML = 'not logged in';
      loginBtn.style.visibility = 'visible';
      logoutBtn.style.visibility = 'hidden';
    }
  });
  // Event Handlers
  loginBtn.onclick = () => auth.signInAnonymously();
  logoutBtn.onclick = () => auth.signOut();

  // Callable Functions

  const createIntent = fun.httpsCallable('stripeCreateIntent');
  const createReservation = fun.httpsCallable('createReservation');
  const acceptReservation = fun.httpsCallable('acceptReservation');
  const refundReservation = fun.httpsCallable('refundReservation');

  acceptBtn.onclick = () => acceptReservation({ bookingId });
  refundBtn.onclick = () => refundReservation({ bookingId });

  var stripe = Stripe('pk_test_rQsbw7aGroBaBv4pTaDcuYgc005omAc5Ag');
  var elements = stripe.elements();
  let complete = false;
  let amount = 3000;

  let card;
  let paymentIntent;
  let clientSecret;

  // paymentIntent = await createIntent({ source: 'hello', amount });
  paymentIntent = await createReservation({ bookingId });

  console.log('paymentIntent :', paymentIntent);
  clientSecret = paymentIntent.data.client_secret;
  console.log('clientSecret :', clientSecret);
  createCardForm();

  // Create an instance of the card Element.
  function createCardForm() {
    const style = {
      base: {
        // Add your base input styles here. For example:
        fontSize: '16px',
        color: '#32325d',
      },
    };
    card = elements.create('card', { style });

    // Add an instance of the card Element into the `card-element` <div>.
    card.mount('#card-element');

    card.addEventListener('change', function(event) {
      complete = event.complete;
      console.log('event :', event);
      var displayError = document.getElementById('card-errors');
      if (event.error) {
        displayError.textContent = event.error.message;
      } else {
        displayError.textContent = '';
      }
    });
  }

  const form = document.getElementById('payment-form');
  form.addEventListener('submit', async event => {
    event.preventDefault();
    submitCardInfo();
  });

  // Step 3
  async function submitPayment() {
    const result = await stripe.handleCardPayment(clientSecret, card, {
      payment_method_data: {},
    });

    paymentIntent = result.paymentIntent;

    console.log(paymentIntent);

    if (result.error) {
      console.error(error);
      alert('fudge!');
    }
  }

  // Set up to be payed later
  async function submitCardInfo() {
    const { setupIntent, error } = await stripe.confirmCardSetup(clientSecret, {
      payment_method: {
        card,
        // billing_details: {
        //   name: cardholderName.value,
        // },
      },
    });

    // paymentIntent = result.paymentIntent;

    console.log(setupIntent);

    if (error) {
      console.error(error);
      alert('fudge!');
    }
  }
});
