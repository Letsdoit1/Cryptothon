/**
 * Import function triggers from their respective submodules:
 *
 * const {onCall} = require("firebase-functions/v2/https");
 * const {onDocumentWritten} = require("firebase-functions/v2/firestore");
 *
 * See a full list of supported triggers at https://firebase.google.com/docs/functions
 */

// import firebase from "firebase/app";
const {onRequest, onCall}=
require("firebase-functions/v2/https");
const {logger}= require("firebase-functions/v2");
const {getDatabase}= require("firebase-admin/database");
const {initializeApp}= require("firebase-admin/app");

initializeApp();

// Create and deploy your first functions
// https://firebase.google.com/docs/functions/get-started

exports.getQuestion = onCall(async (req)=>{
  const teamCode = req.data.teamCode;
  let teamName = null;
  let level = 0;
  let availableTime = null;
  let question = null;
  let hint = null;
  //Codes: EventNotStarted
  let customCode = null;
  try{
    await getDatabase().ref(`/teams/${teamCode}`).get()
        .then(async (teamDataSnapshot)=> {
            logger.debug("TeamData: "+JSON.stringify(teamDataSnapshot));
            teamName = teamDataSnapshot.child("teamName").val();
            var noQuestionSolved = true;
            if (!teamDataSnapshot.child("scorecard").exists())
              noQuestionSolved = true;
            else{
              var scoreRecord;
              teamDataSnapshot.child("scorecard")
              .forEach((scorecardSnapshot)=> {
                if(scorecardSnapshot.child("isSuccess").val() == true) {
                  noQuestionSolved = false;
                  scoreRecord = scorecardSnapshot;
                }
              });
            }
            //Case1: No question solved by user
            if (noQuestionSolved) {
              logger.debug("case1: noQuestionSolved yet");
              await getDatabase().ref("/master").get().then( 
                async (masterSnapshot)=> {
                    logger.debug("Master Data requested: "+JSON.stringify(masterSnapshot));
                    var currentTime = new Date();
                    const est = new Date(masterSnapshot.child("eventStartTime")
                        .val()); //Event Start time
                    var qrt = new Date(masterSnapshot.child("questionReleaseTime")
                        .val()); //QuestionReleaseTime
                    var qri = masterSnapshot.child("questionReleaseTime")
                        .val()*60*1000; //QuestionReleaseInterval 
                            //converting to MilliSeconds
                    var qReleasedTime = currentTime - qrt;
                    logger.debug("Case1: No question solved by user\n"+
                    "CurrentTime: "+currentTime.getLocaleString()+
                    "\nEvenStartTime: "+est.getLocaleString()+
                    "\nQuestionReleaseTime: "+qrt.getLocaleString()+
                    "\nQuestionReleaseInterval: "+qri+
                    "\nQuestionReleasedTime: "+qReleasedTime+"<1 EventNotStarted");
                    if (qReleasedTime<1)
                      return{customCode: "EventNotStarted"};
                    if (qReleasedTime > qri) {
                      qReleasedTime = qReleasedTime-qri;
                      const newQRT = qrt.setMilliseconds(qrt.getMilliseconds()+qri);
                      await getDatabase().ref("/master/")
                          .update({questionReleaseTime:newQRT});
                      //Case 1: AvailableTime set
                      availableTime = currentTime - newQRT;
                      //Case 1: level set
                      level = Math.floor((newQRT-est)/qri);
                      //Case 1: question set
                      question = masterSnapshot
                          .child(`/questionDetails/${level}/questionText`).val();
                      //Case 1: hint set
                      hint = masterSnapshot.child(`/questionDetails/${level}/hint`)
                          .val();
                      logger.debug("newQuestionReleasedTime: "+newQRT.toLocaleString()+
                      "\navailableTime: "+availableTime+
                      "\nlevel: "+level+
                      "\nquestion: "+question+
                      "\nhint: "+hint);
                    }
                });
            }
        });

    await getDatabase().ref(`/teams/${teamCode}`).get().then(async (snapshot)=>{
      logger.info("TeamExists: "+teamCode+", "+JSON.stringify(snapshot));
      teamName = snapshot.child("teamName").val();
    });

    return {
      teamName: teamName,
      time: availableTime,
      level: level,
      rank: 1,
      maxRank: 50,
      question: question,
      hint: hint,
    };
  } catch(error) {
    return error;
  }
});

exports.checkPwdAndRegister = onCall(async (req)=>{
  const teamCode = req.data.teamCode;
  const deviceId = req.data.deviceId;
  let wrongTeamCode = false;
  let registeredSuccessfully = false;
  let device1 = null;
  let device2 = null;
  let device3 = null;
  logger.info("checkPwdAndRegister Call");
  await getDatabase().ref(`/teams/${teamCode}`).get().then(async (snapshot)=>{
    logger.info("TeamExists: "+teamCode+", "+JSON.stringify(snapshot));
    if (snapshot.exists()) {
      const registeredDevicesList = snapshot.child("registeredDevices");
      if (!registeredDevicesList.exists()) {
        getDatabase().ref(`/teams/${teamCode}/registeredDevices`)
            .set({Device1: deviceId}).then((snapshot)=>{
              getDatabase().ref("/devices/").set({[deviceId]: teamCode});
            });
        registeredSuccessfully = true;
        return;
      }
      device1 = registeredDevicesList.child("Device1").val();
      if (!device1.exists() || device1 === "null") {
        getDatabase().ref(`/teams/${teamCode}/registeredDevices`)
            .update({Device1: deviceId});
        getDatabase().ref("/devices/").set({[deviceId]: teamCode});
        registeredSuccessfully = true;
        return;
      }
      device2 = registeredDevicesList.child("Device2").val();
      if (!device2.exists() || device2 === "null") {
        getDatabase().ref(`/teams/${teamCode}/registeredDevices`)
            .update({Device2: deviceId});
        getDatabase().ref("/devices/").set({[deviceId]: teamCode});
        registeredSuccessfully = true;
        return;
      }
      device3 = registeredDevicesList.child("Device3").val();
      if (!device3.exists() || device3 === "null") {
        getDatabase().ref(`/teams/${teamCode}/registeredDevices`)
            .update({Device3: deviceId});
        getDatabase().ref("/devices/").set({[deviceId]: teamCode});
        registeredSuccessfully = true;
        return;
      }
    } else {
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

  await getDatabase().ref("/devices").get().then( (snapshot)=> {
    if (snapshot.exists()) {
      snapshot.forEach((deviceSnapshot) =>{
        if (deviceSnapshot.key === deviceId) {
          registrationStatus = true;
          teamCode = deviceSnapshot.val();
          logger.info("isRegisteredDevice(): teamCode="+teamCode+
              ", status="+registrationStatus);
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
