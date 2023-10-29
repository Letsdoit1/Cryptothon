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
const {Timestamp} = require("firebase-admin/firestore");

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
  let ansLength = null;
  //Codes: EventNotStarted, EventEnded, EndGame
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
              // logger.debug("case1: noQuestionSolved yet");
              let currentTime = new Date();
              logger.debug("CurrentTime: "+currentTime.toLocaleString());
              let est; let qrt; let qri; let eet;
              await getDatabase().ref("/master/endEventTime").get().then( 
                async (eetSnapshot)=> {
                  // logger.debug("Getting endEventTime: "+JSON.stringify(eetSnapshot));
                  eet = new Date(eetSnapshot.val()); //Event End time
                  // logger.debug("endEventTime Data requested: "+eet.toUTCString()+", "+JSON.stringify(eetSnapshot));
                });
                if((currentTime-eet)>=0){
                  customCode = "EventEnded";
                  return ;
                }
              await getDatabase().ref("/master/eventStartTime").get().then( 
                  async (estSnapshot)=> {
                    // logger.debug("Getting EventStartTime: "+JSON.stringify(estSnapshot));
                    est = new Date(estSnapshot.val()); //Event Start time
                    // logger.debug("eventStartTime Data requested: "+est.toLocaleString()+", "+JSON.stringify(estSnapshot));
                  });
              await getDatabase().ref("/master/questionReleaseTime").get().then( 
                async (qrtSnapshot)=> {
                  // logger.debug("Getting questionReleaseTime: "+JSON.stringify(qrtSnapshot));
                    qrt = new Date(qrtSnapshot.val()); //QuestionReleaseTime
                    // logger.debug("questionReleaseTime Data requested: "+qrt.toLocaleString()+", "+JSON.stringify(qrtSnapshot));
                });
              await getDatabase().ref("/master/questionReleaseInterval").get().then( 
                async (qriSnapshot)=> {
                  // logger.debug("Getting questionReleaseInterval: "+JSON.stringify(qriSnapshot));
                    qri = qriSnapshot.val()*60*1000; //QuestionReleaseInterval
                    //converted to MilliSeconds
                    // logger.debug("questionReleaseInterval Data requested: "+qri);
                });
                // logger.debug("currentTime: "+currentTime.toLocaleString()+", qrt: "+qrt.toLocaleString());
              let qReleasedTime = currentTime - qrt;
              logger.debug("Case1: No question solved by user, \n"+
              "\nQuestionReleasedTime: "+qReleasedTime+" || if <1 EventNotStarted");
              if (qReleasedTime<1){
                customCode = "EventNotStarted";
                return ;
              }
              // let newQRT;
              if (qReleasedTime > qri) {
                qReleasedTime = qReleasedTime-qri;
                // logger.debug("Question release time needs to be updated by: "+qReleasedTime);
                // newQRT = new Date(qrt.valueOf()+qri);
                qrt = new Date(qrt.valueOf()+qri);
                logger.debug("Updated Question Release time: "+qrt.toLocaleString());
                await getDatabase().ref("/master/")
                    .update({questionReleaseTime:qrt});
              }
              //Case 1: AvailableTime set
              availableTime = currentTime - qrt;
              //Case 1: level set
              level = Math.floor((qrt-est)/qri);
              logger.debug("level calculated: "+level);

              let noOfQuestions;
              await getDatabase().ref("/master/questionDetails").get().then( 
                async (questionsSnapshot)=> {
                  // logger.debug("Getting questionsSnapshot: "+JSON.stringify(questionsSnapshot));
                  noOfQuestions = questionsSnapshot.numChildren();
                  // logger.debug("Number of Questions: "+noOfQuestions);
                  //Case 1: question set
                  question = questionsSnapshot.child(level).child("questionText").val();
                  //Case 1: hint set
                  hint = questionsSnapshot.child(level).child("hint").val();
                  //Case 1: Answer length
                  ansLength = questionsSnapshot.child(level).child("answer").val().length;
                  logger.debug("Question at Level "+level+" = "+question+", Hint: "+hint);
                });
              if (noOfQuestions<level){
                customCode = "EndGame";
                return ;
              }
            }
        });
    await getDatabase().ref(`/teams/${teamCode}`).get().then(async (snapshot)=>{
      logger.info("TeamExists: "+teamCode+", "+JSON.stringify(snapshot));
      teamName = snapshot.child("teamName").val();
    });
    logger.debug("Check for custom code: "+customCode+", team name: "+teamName);
    if(customCode!=null){
      logger.debug("Inside custom Code not null");
      return {
        code: customCode,
        teamName: teamName
      };
    }

    const strReturn = {
      teamName: teamName,
      time: availableTime,
      level: level,
      rank: 1,
      maxRank: 50,
      question: question,
      hint: hint,
      ansLength: ansLength
    };

    logger.debug("Return Question Object: "+JSON.stringify(strReturn));

    return strReturn;
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
