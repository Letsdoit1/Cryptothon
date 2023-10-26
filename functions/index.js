/**
 * Import function triggers from their respective submodules:
 *
 * const {onCall} = require("firebase-functions/v2/https");
 * const {onDocumentWritten} = require("firebase-functions/v2/firestore");
 *
 * See a full list of supported triggers at https://firebase.google.com/docs/functions
 */

// import firebase from "firebase/app";
const { onRequest, onCall, HttpsError } = require("firebase-functions/v2/https");
const { logger } = require("firebase-functions/v2");
const { getDatabase } = require("firebase-admin/database");
const {initializeApp} = require("firebase-admin/app");

initializeApp();

// Create and deploy your first functions
// https://firebase.google.com/docs/functions/get-started

exports.checkPwdAndRegister = onCall(async (req)=>{
  const teamCode = req.data.teamCode;
  const deviceId = req.data.deviceId;
  let wrongTeamCode = false;
  let registeredSuccessfully = false;
  let device1 = null;
  let device2 = null;
  let device3 = null;

  await getDatabase().ref(`/teams/${teamCode}`).get().then((snapshot)=>{
    if(snapshot.exists()){
      const registeredDevicesList = snapshot.child("registeredDevices");
      device1 = registeredDevicesList.child("Device1").val();
      if(device1 === "null"){
        getDatabase().ref(`/teams/${teamCode}/registeredDevices`).update({Device1: deviceId});
        getDatabase().ref('/devices/').set({[deviceId]: teamCode});
        registeredSuccessfully = true;
        return;
      }
      device2 = registeredDevicesList.child("Device2").val();
      if(device2 === "null"){
        getDatabase().ref(`/teams/${teamCode}/registeredDevices`).update({Device2: deviceId});
        getDatabase().ref('/devices/').set({[deviceId]: teamCode});
        registeredSuccessfully = true;
        return;
      }
      device3 = registeredDevicesList.child("Device3").val();
      if(device3 === "null"){
        getDatabase().ref(`/teams/${teamCode}/registeredDevices`).update({Device3: deviceId});
        getDatabase().ref('/devices/').set({[deviceId]: teamCode});
        registeredSuccessfully = true;
        return;
      }
    }else{
      wrongTeamCode = true;
      return;
    }
  });

  return {
    wrongTeamCode: wrongTeamCode,
    registeredSuccessfully: registeredSuccessfully,
    deviceId1: device1,
    deviceId2: device2,
    deviceId3: device3,
  };

});

exports.isRegisteredDevice = onCall(async (req) => {
  const deviceId = req.data.deviceId;
  let registrationStatus = false;
  let teamCode = null;

  await getDatabase().ref("/devices").get().then( (snapshot)=>{
    if(snapshot.exists()){
      snapshot.forEach((deviceSnapshot) =>{
        if(deviceSnapshot.key === deviceId){
          registrationStatus = true;
          teamCode = deviceSnapshot.val();
          logger.info("isRegisteredDevice(): teamCode="+teamCode+", status="+registrationStatus);
          return;
        }
      });
    }
  });
  return {
    registrationStatus: registrationStatus,
    teamPassword: teamCode,
  };
});

exports.helloWorld = onRequest((request, response) => {
  logger.info("Hello logs! Hi", {structuredData: true});
  response.send("Hello from Firebase! Sumant");
});
