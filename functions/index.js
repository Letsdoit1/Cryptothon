/**
 * Import function triggers from their respective submodules:
 *
 * const {onCall} = require("firebase-functions/v2/https");
 * const {onDocumentWritten} = require("firebase-functions/v2/firestore");
 *
 * See a full list of supported triggers at https://firebase.google.com/docs/functions
 */

const {onRequest, onCall, HttpsError} = require("firebase-functions/v2/https");
const {logger} = require("firebase-functions/v2");

// Create and deploy your first functions
// https://firebase.google.com/docs/functions/get-started

exports.helloWorld = onRequest((request, response) => {
  logger.info("Hello logs! Hi", {structuredData: true});
  response.send("Hello from Firebase! Sumant");
});

exports.addNumbers = onCall((request) => {
  logger.info("AddNumber:: Called");

  const firstNumber = request.data.firstNumber;
  const secondNumber = request.data.secondNumber;
  logger.info("AddNumber::"+firstNumber+" "+secondNumber);
  if (!Number.isFinite(firstNumber) || !Number.isFinite(secondNumber)) {
    // Throwing an HttpsError so that the client gets the error details.
    throw new HttpsError("invalid-argument", "The function must be called " +
          "with two arguments \"firstNumber\" and \"secondNumber\" which " +
          "must both be numbers.");
  }
  logger.info("AddNumber:: Before Return.");
  return {
    firstNumber: firstNumber,
    secondNumber: secondNumber,
    operator: "+",
    operationResult: firstNumber + secondNumber,
  };
});
