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
const { log } = require("firebase-functions/logger");

initializeApp();

// Create and deploy your first functions
// https://firebase.google.com/docs/functions/get-started

exports.unlockHint = onCall(async (req)=>{
  var hint;
  await getDatabase().ref(`/teams/${req.data.teamCode}/scoreCard/${req.data.level}`).set({
    hintUsed: true,
    isSuccess: false,
    time: (new Date()).toISOString(),
    deviceId: req.data.deviceId,
  });

  await getDatabase().ref(`/master/questionDetails/${req.data.level}/hint`).get().then( 
    async (questionsSnapshot)=> {
      hint = questionsSnapshot.val();
      // logger.debug("hint received: "+hint);
    });

    return {
      hint: hint
    };

});

exports.checkAnswer = onCall(async (req)=>{
  try{
    let level = req.data.level;
    let ans = req.data.ans;
    let hint = req.data.hintTaken;
    let teamCode = req.data.teamCode;
    let deviceId = req.data.deviceId;
    let realAns = null;
    var msg = "TryAgain";
    await getDatabase().ref(`/master/questionDetails/${level}/answer`).get()
        .then(async (ansSnapshot)=>{
          realAns = ansSnapshot.val().toLowerCase();
        });

    if(realAns === ans.toLowerCase()){
      logger.debug("Answer correct");
      if(hint == true){
        logger.debug("Hint was used in correct ans. Now updating existing record.");
        await getDatabase().ref(`/teams/${teamCode}/scoreCard/${level}`).update({
            hintUsed: true,
            isSuccess: true,
            time: (new Date()).toISOString(),
            deviceId: deviceId,
          });
      }else{
        logger.debug("Hint was not used in correct ans. Now creating new record.");
        await getDatabase().ref(`/teams/${teamCode}/scoreCard/${level}`).set({
          hintUsed: false,
          isSuccess: true,
          time: (new Date()).toISOString(),
          deviceId: deviceId,
        });

      }
      msg = "Success";
    }
    logger.debug("before calling get question function.");
    var newQuestion = await getQuestionFunction(teamCode,deviceId);
    newQuestion.msg = msg;
    logger.debug("Updated question with Answer msg: "+JSON.stringify(newQuestion));
    return newQuestion;
  }catch(error) {
    return error;
  }
});

async function getQuestionFunction(teamCode, deviceId){
  // const teamCode = req.data.teamCode;
  let teamName = null;
  let level = 0;
  let availableTime = null;
  let question = null;
  let hint = null;
  let ansLength = null;
  //Codes: EventNotStarted, EventEnded, EndGame
  let customCode = null;
  let qri; let qrt; let est; let eet;
  try{
    var noQuestionSolved = true;
    var lastSolvedQuestionNumber = 0;
    var lastSolvedQuestionTime = null;
    let currentTime = new Date();
    let noOfQuestions;
    logger.debug("Just after try block team Code: "+teamCode);
    // To check if user previously solved any question or not if yes then which was the last question solved
    await getDatabase().ref(`/teams/${teamCode}`).get()
        .then(async (teamDataSnapshot)=> {
            logger.debug("TeamData: "+JSON.stringify(teamDataSnapshot));
            teamName = teamDataSnapshot.child("teamName").val();
            if (!teamDataSnapshot.child("scoreCard").exists())
              noQuestionSolved = true;
            else{

              logger.debug("Team ScoreCard: "+JSON.stringify(teamDataSnapshot));

              teamDataSnapshot.child("scoreCard")
              .forEach((scoreCardSnapshot)=> {
                logger.debug("ScoreCard: key="+scoreCardSnapshot.key+", "+JSON.stringify(scoreCardSnapshot));
                if(Number(scoreCardSnapshot.key)>lastSolvedQuestionNumber && scoreCardSnapshot.child("isSuccess").val() == true){
                  noQuestionSolved = false;
                  lastSolvedQuestionNumber = Number(scoreCardSnapshot.key);
                  lastSolvedQuestionTime = new Date(scoreCardSnapshot.child("time").val());
                  logger.debug("lastSolvedQuestionNumber: "+lastSolvedQuestionNumber+", lastSolvedQuestionTime: "+lastSolvedQuestionTime.toISOString());
                }
              });
            }
        });
    await getDatabase().ref("/master/questionReleaseInterval").get()
    .then( async (qriSnapshot)=> {
        // logger.debug("Getting questionReleaseInterval: "+JSON.stringify(qriSnapshot));
        qri = qriSnapshot.val()*60*1000; //QuestionReleaseInterval
        //converted to MilliSeconds
        // logger.debug("questionReleaseInterval Data requested: "+qri);
      });
    await getDatabase().ref("/master/questionReleaseTime").get()
    .then( async (qrtSnapshot)=> {
        // logger.debug("Getting questionReleaseTime: "+JSON.stringify(qrtSnapshot));
          qrt = new Date(qrtSnapshot.val()); //QuestionReleaseTime
          logger.debug("questionReleaseTime Data requested: "+qrt.toLocaleString()+", "+JSON.stringify(qrtSnapshot));
      });
      logger.debug("CurrentTime: "+currentTime.toLocaleString());

    await getDatabase().ref("/master/endEventTime").get()
    .then( async (eetSnapshot)=> {
        // logger.debug("Getting endEventTime: "+JSON.stringify(eetSnapshot));
        eet = new Date(eetSnapshot.val()); //Event End time
        logger.debug("endEventTime Data requested: "+eet.toUTCString()+", "+JSON.stringify(eetSnapshot));
      });
    if((currentTime-eet)>=0){
      customCode = "EventEnded";
      logger.debug("Event Ended");
      return {
        code: customCode,
        teamName: teamName
      };
    }
    await getDatabase().ref("/master/eventStartTime").get()
    .then( async (estSnapshot)=> {
          // logger.debug("Getting EventStartTime: "+JSON.stringify(estSnapshot));
          est = new Date(estSnapshot.val()); //Event Start time
          logger.debug("eventStartTime Data requested: "+est.toLocaleString()+", "+JSON.stringify(estSnapshot));
        });
    // logger.debug("currentTime: "+currentTime.toLocaleString()+", qrt: "+qrt.toLocaleString());
    let totalQuestionReleasedInterval = currentTime - est;
    logger.debug("QuestionReleasedTime: "+totalQuestionReleasedInterval+" || if <1 EventNotStarted");
    if (totalQuestionReleasedInterval<1){
      customCode = "EventNotStarted";
      logger.debug("Event Not Started");
      return {
        code: customCode,
        teamName: teamName
      };
    }
    if (totalQuestionReleasedInterval > qri) {
      logger.debug("Number(Math.floor(totalQuestionReleasedInterval/qri)*qri): "+Number(Math.floor(totalQuestionReleasedInterval/qri)*qri));
      qrt = new Date(est.valueOf()+Number(Math.floor(totalQuestionReleasedInterval/qri)*qri));
      logger.debug("Updated Question Release time: "+qrt.toLocaleString());
      await getDatabase().ref("/master/")
          .update({questionReleaseTime:qrt});
    }

    await getDatabase().ref("/master/questionDetails").get().then( 
      async (questionsSnapshot)=> {
        // logger.debug("Getting questionsSnapshot: "+JSON.stringify(questionsSnapshot));
        noOfQuestions = questionsSnapshot.numChildren();
        logger.debug("noOfQuestions: "+noOfQuestions);
      });

    logger.debug("Before starting case 1 & 2 team Code: "+teamCode);
    //Case1: No question solved by user
    if (noQuestionSolved) {
      // logger.debug("case1: noQuestionSolved yet");
      logger.debug("Case 1 started.");
      let tempLevel=0;
      while(totalQuestionReleasedInterval>qri){
        totalQuestionReleasedInterval = totalQuestionReleasedInterval - qri;
        tempLevel++;
        await getDatabase().ref(`/teams/${teamCode}/scoreCard/${tempLevel}`).get()
          .then(async (scoreRecordSnapshot)=>{
            let hintValue = false;
            if(scoreRecordSnapshot.exists())
              hintValue = scoreRecordSnapshot.child("hintUsed").val();
            const obj1 = {
              hintUsed: hintValue,
              isSuccess: false,
              time: (new Date(est.valueOf()+qri*Number(tempLevel))).toISOString(),
              deviceId: deviceId,
              };
            // logger.debug("User did not answer any question: tempLevel: "+tempLevel+", "+JSON.stringify(obj1));
            if(tempLevel<=noOfQuestions)
              await getDatabase().ref(`/teams/${teamCode}/scoreCard/${tempLevel}`).set(obj1);
          });
      }
      //Case 1: AvailableTime set
      availableTime = (new Date(qrt.valueOf()+qri))-currentTime;
      //Case 1: level set
      level = Math.floor((qrt-est)/qri) + 1; 
      logger.debug("level calculated: "+level);
    } else {
      //Case 2: At least 1 question solved by user.
      logger.debug("Case 2: At least 1 question solved by user.");

      let userIdealTime = currentTime - lastSolvedQuestionTime;
      logger.debug("userIdealTime: "+userIdealTime);

      var loopCounter=0;
      while(userIdealTime>qri){
        loopCounter++;
        userIdealTime = userIdealTime - qri;
        lastSolvedQuestionNumber++;
        logger.debug("Inside userIdealTime loop: "+userIdealTime);

        await getDatabase().ref(`/teams/${teamCode}/scoreCard/${lastSolvedQuestionNumber}`).get()
          .then(async (scoreRecordSnapshot) => {
            let hintValue1=false;
            logger.debug("Inside While lastSolvedQuestionNumber: "+lastSolvedQuestionNumber);
            if(scoreRecordSnapshot.exists())
              hintValue1 = scoreRecordSnapshot.child("hintUsed").val();
            const obj1 = {
              hintUsed: hintValue1,
              isSuccess: false,
              time: (new Date(lastSolvedQuestionTime.valueOf()+Number(qri)*Number(loopCounter))).toISOString(),
              deviceId: deviceId,
              };
            // logger.debug("While User did not answer question: lastSolvedQuestionTime: "+lastSolvedQuestionTime+", "+JSON.stringify(obj1));
            // logger.debug("noOfQuestions: "+noOfQuestions+", lastSolvedQuestionNumber"+lastSolvedQuestionNumber);
            if(lastSolvedQuestionNumber<=noOfQuestions){
              await getDatabase().ref(`/teams/${teamCode}/scoreCard/${lastSolvedQuestionNumber}`).set(obj1);
            }
          });
      }
      //Case 2: Level
      level = Number(lastSolvedQuestionNumber) + Number(1);
      //Case 2: Available time
      availableTime = qri - userIdealTime;
      // logger.debug("availableTime: "+availableTime+", level: "+level);
    }

    logger.debug("After case 1 & 2 team Code: "+teamCode);
    
    await getDatabase().ref("/master/questionDetails").get().then( 
      async (questionsSnapshot)=> {
        // logger.debug("Getting questionsSnapshot: "+JSON.stringify(questionsSnapshot));
        noOfQuestions = questionsSnapshot.numChildren();
        if (noOfQuestions<level){
          customCode = "EndGame";
          logger.debug("End Game, user finished the game.");
          return {
            code: customCode,
            teamName: teamName
          };
        }
        // logger.debug("Number of Questions: "+noOfQuestions);
        //Case 1: question set
        question = questionsSnapshot.child(level).child("questionText").val();
        //Case 1: hint set
        logger.debug("Before checking hint.");
        await getDatabase().ref(`/teams/${teamCode}/scoreCard`).get()
          .then(async (scoreCardSnapshot)=>{
            if(scoreCardSnapshot.exists()){
              logger.debug("scoreCard exists: "+JSON.stringify(scoreCardSnapshot));
              await getDatabase().ref(`/teams/${teamCode}/scoreCard/${level}/hintUsed`).get()
                .then(async (hintSnapshot)=>{
                  logger.debug("Level: "+level+"hintSnapshot exists: "+JSON.stringify(hintSnapshot));
                  if(hintSnapshot.exists() && hintSnapshot.val() == true){
                    hint = questionsSnapshot.child(level).child("hint").val();
                    logger.debug("hint value: "+hint);
                  }
                });
            }
          });
        //Case 1: Answer length
        ansLength = questionsSnapshot.child(level).child("answer").val().length;
        logger.debug("Question at Level "+level+" = "+question+", Hint: "+hint);
      });
    logger.debug("Before getting team name team Code: "+teamCode);
    await getDatabase().ref(`/teams/${teamCode}`).get().then(async (snapshot)=>{
      // logger.info("TeamExists: "+teamCode+", "+JSON.stringify(snapshot));
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
}

exports.getQuestion = onCall(async (req)=>{
  return getQuestionFunction(req.data.teamCode,req.data.deviceId);
});

exports.checkPwdAndRegister = onCall(async (req)=>{
  try{
    const teamCode = req.data.teamCode;
    const deviceId = req.data.deviceId;
    let wrongTeamCode = false;
    let registeredSuccessfully = false;
    let alreadyRegistered;
    let device1;
    let device2;
    let device3;
    logger.info("checkPwdAndRegister Call: teamCode: "+teamCode+", deviceId: "+ deviceId);

    await getDatabase().ref(`/devices/${deviceId}`).get()
    .then((snapshot)=>{
      logger.debug("Inside device check.");
      if(snapshot.exists()){
        logger.debug("Inside snapshot exist."+JSON.stringify(snapshot));
        alreadyRegistered = snapshot.val();
        logger.debug("Snapshot val."+alreadyRegistered);
      }
    });

    if(alreadyRegistered){
      logger.debug("If device already registered: "+alreadyRegistered);
      return {
          alreadyRegistered: alreadyRegistered,
      };
    }

    await getDatabase().ref(`/teams/${teamCode}`).get().then(async (snapshot)=>{
      logger.info("TeamExists: "+teamCode+", "+JSON.stringify(snapshot));
      if (snapshot.exists()) {
        //No Device Registered add a new entry.
        const registeredDevicesList = snapshot.child("registeredDevices");
        if (!registeredDevicesList.exists()) {
          getDatabase().ref(`/teams/${teamCode}/registeredDevices`)
              .set({Device1: deviceId}).then((snapshot)=>{
                getDatabase().ref("/devices/").update({[deviceId]: teamCode});
              });
          registeredSuccessfully = true;
          return;
        }
        device1 = registeredDevicesList.child("Device1").val();
        if (!device1) {
          getDatabase().ref(`/teams/${teamCode}/registeredDevices`)
              .update({Device1: deviceId});
          getDatabase().ref("/devices/").update({[deviceId]: teamCode});
          registeredSuccessfully = true;
          return;
        }
        device2 = registeredDevicesList.child("Device2").val();
        if (!device2) {
          getDatabase().ref(`/teams/${teamCode}/registeredDevices`)
              .update({Device2: deviceId});
          getDatabase().ref("/devices/").update({[deviceId]: teamCode});
          registeredSuccessfully = true;
          return;
        }
        device3 = registeredDevicesList.child("Device3").val();
        if (!device3) {
          getDatabase().ref(`/teams/${teamCode}/registeredDevices`)
              .update({Device3: deviceId});
          getDatabase().ref("/devices/").update({[deviceId]: teamCode});
          registeredSuccessfully = true;
          return;
        }
      } else {
        wrongTeamCode = true;
        return;
      }
    });

    const returnObject = {
      wrongTeamCode: wrongTeamCode,
      registeredSuccessfully: registeredSuccessfully,
      deviceId1: device1,
      deviceId2: device2,
      deviceId3: device3,
    };

    logger.info("Return Object: "+JSON.stringify(returnObject));

    return returnObject;
  }catch(error){
    logger.debug("Error in Catch: "+JSON.stringify(error));
    return {
      error: error,
    }
  }
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
