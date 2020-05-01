import * as TestFunctions from 'firebase-functions-test';

const firebaseConfig = {
    apiKey: "AIzaSyDS1-_Yl6cB0cPqY3tGfzwoJTfONsio7uE",
    authDomain: "pagos-stripe.firebaseapp.com",
    databaseURL: "https://pagos-stripe.firebaseio.com",
    projectId: "pagos-stripe",
    storageBucket: "pagos-stripe.appspot.com",
    messagingSenderId: "910412190071",
    appId: "1:910412190071:web:3629035605d54ec6445172"
};

const envConfig = { stripe: { secret: 'sk_test_Apoe3qFDGqfsrehBOLqJ7pCk00q9oTXRIK' } };

const fun = TestFunctions(firebaseConfig, 'service-account.json');

fun.mockConfig(envConfig);

export { fun };