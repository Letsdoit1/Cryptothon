/**
 * Import function triggers from their respective submodules:
 *
 * const {onCall} = require("firebase-functions/v2/https");
 * const {onDocumentWritten} = require("firebase-functions/v2/firestore");
 *
 * See a full list of supported triggers at https://firebase.google.com/docs/functions
 */

// import firebase from "firebase/app";
const {onRequest, onCall} = require("firebase-functions/v2/https");
const {logger}= require("firebase-functions/v2");
const {getDatabase}= require("firebase-admin/database");
const {initializeApp}= require("firebase-admin/app");
const {Timestamp} = require("firebase-admin/firestore");
const {onSchedule} = require("firebase-functions/v2/scheduler");

initializeApp();

// Create and deploy your first functions
// https://firebase.google.com/docs/functions/get-started

exports.helloWorld = onRequest((request, response) => {
  logger.info("Hello logs! Hi");
  response.send("Hello from Crypto-thon!");
  createScoreCard();
});

exports.getScoreBoard = onCall(async (req)=>{
  logger.debug("getScoreBoard 1>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>");
  return await createScoreCard();
  // logger.debug("getScoreBoard 2>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>");
});

async function createScoreCard(){
  var allScores = new Array();
  var allRanks = new Array();
  // Call get question function it will calculate score of each Team.
  await getDatabase().ref("/teams").get().then(async function(snapshot) {
    const teamCodeSnapshot = snapshot.val();
    for (const key in teamCodeSnapshot) {
        // console.log(`child key: ${key}`)
        // console.log(`child value: `+JSON.stringify(teamCodeSnapshot[key]));
        await getQuestionFunction(key,null);
    }
  });

  // After calculation get scores from each team and add them in array
  await getDatabase().ref("/teams").get().then(async (teamSnapshot)=>{
    teamSnapshot.forEach((teamSnapshot)=>{
    // Call get question function it will calculate score of each Team.
      logger.debug("Getting team score data: "+JSON.stringify(teamSnapshot));
      var teamScoreCard = {
        teamName: teamSnapshot.key,
        score: teamSnapshot.child("teamScore").val(),
        level: teamSnapshot.child("calculatedLevel").val(),
        lastSolvedInterval: teamSnapshot.child("lastSolvedInterval").val()
      };
      allScores.push(teamScoreCard);
    });
  });
  // logger.debug("AllScores: "+JSON.stringify(allScores));
  allScores.sort(function compare(a,b){
    return (b.score-a.score) || (a.lastSolvedInterval - b.lastSolvedInterval) || (a.teamName.localeCompare(b.teamName));
  });
  let rank = 1; 
  // let ps=null; 
  // let pi=null;
  // logger.debug("AllScores: "+JSON.stringify(allScores));
  // for(const scoreCards of allScores){
  //   logger.debug("teamName: "+scoreCards.teamName+", previousTeamScore:"+previousTeamScore+
  //   ", scoreCards.score:"+scoreCards.score+", previousTeamSolveInterval:"+previousTeamSolveInterval+", scoreCards.lastSolvedInterval: "+scoreCards.lastSolvedInterval);
  //   if(index == 0 || (previousTeamScore === scoreCards.score && previousTeamSolveInterval === scoreCards.lastSolvedInterval)){
  //     // If first index or previous teams score and last question solve interval is same then do not increase rank.
  //   }else{
  //     rank = rank + 1;
  //   }
  //   scoreCards.rank = rank;
  //   previousTeamSolveInterval = scoreCards.lastSolvedInterval;
  //   previousTeamScore = scoreCards.Score;
  //   allRanks.push(scoreCards);
  //   logger.debug("AllRank["+index+"]: "+JSON.stringify(scoreCards));
  //   index++;
  // }

  // allScores.forEach((value,index)=>{
  //   logger.debug("teamName: "+value.teamName+", previousTeamScore:"+ps+
  //   ", value.score:"+value.score+", previousTeamSolveInterval:"+pi+", value.lastSolvedInterval: "+value.lastSolvedInterval);
  //   if(index == 0 || (ps === value.score && pi === value.lastSolvedInterval)){
  //     // If first index or previous teams score and last question solve interval is same then do not increase rank.
  //   }else{
  //     rank = rank + 1;
  //   }
  //   value.rank = rank;
  //   pi = value.lastSolvedInterval;
  //   ps = value.Score;
  //   allRanks.push(value);
  //   logger.debug("AllRank["+index+"]: "+JSON.stringify(value));
  // });

  allScores.forEach((value,index)=>{
    value.score = value.score+"";
    value.level = value.level+"";
    value.lastSolvedInterval = value.lastSolvedInterval+"";
    value.rank = rank+"";
    allRanks.push(value);
    rank = rank + 1;
  });
  logger.debug("AllRank: "+JSON.stringify(allRanks));
  await getDatabase().ref("/scoreBoard").set(allRanks);

  return allRanks;

}

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
    let hint;
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

      logger.debug("checkAnswer: Before checking hint.");
      await getDatabase().ref(`/teams/${teamCode}/scoreCard`).get()
        .then(async (scoreCardSnapshot)=>{
          if(scoreCardSnapshot.exists()){
            logger.debug("scoreCard exists: "+JSON.stringify(scoreCardSnapshot));
            await getDatabase().ref(`/teams/${teamCode}/scoreCard/${level}/hintUsed`).get()
              .then(async (hintSnapshot)=>{
                logger.debug("Level: "+level+"hintSnapshot exists: "+JSON.stringify(hintSnapshot));
                logger.debug("1");
                if(hintSnapshot.exists()){
                  logger.debug("2");
                  hint = hintSnapshot.val();
                  logger.debug("hint value: "+hint);
                }
                logger.debug("3");
              });
          }
        });

      if(hint){
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
    let currentTime = new Date();
    var lastSolvedQuestionTime = null;
    var secondMaxQN = 0;
    var secondMaxQT = null;
    let noOfQuestions;
    var hintScale = 0;
    var successfulScale = 0;
    var unsuccessfulScale = 0;
    var initScoreValue = 0;
    var teamScore = 0;
    logger.debug("Just after try block team Code: "+teamCode);

    await getDatabase().ref("/master/eventStartTime").get()
    .then( async (estSnapshot)=> {
          est = new Date(estSnapshot.val()); //Event Start time
          // logger.debug("eventStartTime Data requested: "+est.toLocaleString()+", "+JSON.stringify(estSnapshot));
        });
    await getDatabase().ref("/master/questionReleaseInterval").get().then( async (qriSnapshot)=> {
        qri = qriSnapshot.val()*60*1000; //QuestionReleaseInterval
      });
    // To check if user previously solved any question or not if yes then which was the last question solved
    await getDatabase().ref(`/teams/${teamCode}`).get()
        .then(async (teamDataSnapshot)=> {
            // logger.debug("TeamData: "+JSON.stringify(teamDataSnapshot));
            teamName = teamDataSnapshot.child("teamName").val();
            if (!teamDataSnapshot.child("scoreCard").exists())
              noQuestionSolved = true;
            else{
              // logger.debug("Team ScoreCard: "+JSON.stringify(teamDataSnapshot));
              lastSolvedQuestionTime = est; secondMaxQT = est;
              teamDataSnapshot.child("scoreCard").forEach((scoreCardSnapshot)=> {
                // logger.debug("ScoreCard: key="+scoreCardSnapshot.key+", "+JSON.stringify(scoreCardSnapshot));
                if(Number(scoreCardSnapshot.key)>lastSolvedQuestionNumber && scoreCardSnapshot.child("isSuccess").val() == true){
                  noQuestionSolved = false;
                  secondMaxQN = lastSolvedQuestionNumber;
                  secondMaxQT = lastSolvedQuestionTime;
                  lastSolvedQuestionNumber = Number(scoreCardSnapshot.key);
                  lastSolvedQuestionTime = new Date(scoreCardSnapshot.child("time").val());
                  // logger.debug("lastSolvedQuestionNumber: "+lastSolvedQuestionNumber+", lastSolvedQuestionTime: "+lastSolvedQuestionTime.toISOString());
                }else if(Number(scoreCardSnapshot.key)>secondMaxQN && scoreCardSnapshot.child("isSuccess").val() == true){
                  secondMaxQN = Number(scoreCardSnapshot.key);
                  secondMaxQT = new Date(scoreCardSnapshot.child("time").val());
                }
              });
              // Update last solved qustion interval
              const lastSolvedInterval = lastSolvedQuestionTime.valueOf() - secondMaxQT.valueOf();
              logger.debug("lastSolvedInterval: "+lastSolvedInterval+", lastSolvedQuestionTime: "+lastSolvedQuestionTime.toISOString()+", secondMaxQT: "+secondMaxQT.toISOString());
              await getDatabase().ref(`/teams/${teamCode}`).update({lastSolvedInterval: lastSolvedInterval});
            }
        });
    await getDatabase().ref("/master/questionReleaseTime").get().then( async (qrtSnapshot)=> {
          qrt = new Date(qrtSnapshot.val()); //QuestionReleaseTime
          // logger.debug("questionReleaseTime Data requested: "+qrt.toLocaleString()+", "+JSON.stringify(qrtSnapshot));
      });
      // logger.debug("CurrentTime: "+currentTime.toLocaleString());

    await getDatabase().ref("/master/endEventTime").get().then( async (eetSnapshot)=> {
        eet = new Date(eetSnapshot.val()); //Event End time
        // logger.debug("endEventTime Data requested: "+eet.toUTCString()+", "+JSON.stringify(eetSnapshot));
      });
    if((currentTime-eet)>=0){
      customCode = "EventEnded";
      logger.debug("Event Ended");
      return {
        code: customCode,
        teamName: teamName
      };
    }
    // logger.debug("currentTime: "+currentTime.toLocaleString()+", qrt: "+qrt.toLocaleString());
    // In event total time interval since start of event
    let totalQuestionReleasedInterval = currentTime - est;
    // logger.debug("QuestionReleasedTime: "+totalQuestionReleasedInterval+" || if <1 EventNotStarted");
    // Event not started yet
    if (totalQuestionReleasedInterval<1){
      customCode = "EventNotStarted";
      // logger.debug("Event Not Started");
      return {
        code: customCode,
        teamName: teamName
      };
    }
    // Time expired since last question released
    if (totalQuestionReleasedInterval > qri) {
      // logger.debug("Number(Math.floor(totalQuestionReleasedInterval/qri)*qri): "+Number(Math.floor(totalQuestionReleasedInterval/qri)*qri));
      qrt = new Date(est.valueOf()+Number(Math.floor(totalQuestionReleasedInterval/qri)*qri));
      // logger.debug("Updated Question Release time: "+qrt.toLocaleString());
      await getDatabase().ref("/master/").update({questionReleaseTime:qrt});
    }

    // Total number of questions in event
    await getDatabase().ref("/master/questionDetails").get().then( async (questionsSnapshot)=> {
        noOfQuestions = questionsSnapshot.numChildren();
        // logger.debug("noOfQuestions: "+noOfQuestions);
      });

    // Get Scoring Master informaion
    await getDatabase().ref("/master/scoreRules").get().then( 
      async (scoreRulesSnapshot)=> {
        // logger.debug("scoreRulesSnapshot: "+JSON.stringify(scoreRulesSnapshot));
        hintScale = scoreRulesSnapshot.child("hintScale").val();
        successfulScale = scoreRulesSnapshot.child("successfulScale").val();
        unsuccessfulScale = scoreRulesSnapshot.child("unsuccessfulScale").val();
        initScoreValue = scoreRulesSnapshot.child("value").val();
        // logger.debug("hintScale: "+hintScale+", successfulScale: "+successfulScale+", unsuccessfulScale: "+unsuccessfulScale+", initScoreValue: "+initScoreValue);
      });

    // logger.debug("Before starting case 1 & 2 team Code: "+teamCode);
    //Case1: No question solved by user
    if (noQuestionSolved) {
      logger.debug("case1: noQuestionSolved yet");
      let tempLevel=0;
      while(totalQuestionReleasedInterval>qri){
        totalQuestionReleasedInterval = totalQuestionReleasedInterval - qri;
        tempLevel++;
        await getDatabase().ref(`/teams/${teamCode}/scoreCard/${tempLevel}`).get()
          .then(async (scoreRecordSnapshot)=>{
            if(!scoreRecordSnapshot.exists()){
              const obj1 = {
                hintUsed: false,
                isSuccess: false,
                time: (new Date(est.valueOf()+qri*Number(tempLevel))).toISOString(),
                deviceId: deviceId,
                };
              // logger.debug("User did not answer any question: tempLevel: "+tempLevel+", "+JSON.stringify(obj1));
              if(tempLevel<=noOfQuestions)
                await getDatabase().ref(`/teams/${teamCode}/scoreCard/${tempLevel}`).set(obj1);
            }
          });
      }
      //Case 1: AvailableTime set
      availableTime = (new Date(qrt.valueOf()+qri))-currentTime;
      //Case 1: level set
      level = Math.floor((qrt-est)/qri) + 1; 
      // logger.debug("level calculated: "+level);
    } else {
      //Case 2: At least 1 question solved by user.
      logger.debug("Case 2: At least 1 question solved by user.");

      let userIdealTime = currentTime - lastSolvedQuestionTime;
      // logger.debug("userIdealTime: "+userIdealTime);

      var loopCounter=0;
      while(userIdealTime>qri){
        loopCounter++;
        userIdealTime = userIdealTime - qri;
        lastSolvedQuestionNumber++;
        // logger.debug("Inside userIdealTime loop: "+userIdealTime);

        await getDatabase().ref(`/teams/${teamCode}/scoreCard/${lastSolvedQuestionNumber}`).get()
          .then(async (scoreRecordSnapshot) => {
            // logger.debug("Inside While lastSolvedQuestionNumber: "+lastSolvedQuestionNumber);
            if(!scoreRecordSnapshot.exists()){
              const obj1 = {
                hintUsed: false,
                isSuccess: false,
                time: (new Date(lastSolvedQuestionTime.valueOf()+Number(qri)*Number(loopCounter))).toISOString(),
                deviceId: deviceId,
                };
              // logger.debug("While User did not answer question: lastSolvedQuestionTime: "+lastSolvedQuestionTime+", "+JSON.stringify(obj1));
              // logger.debug("noOfQuestions: "+noOfQuestions+", lastSolvedQuestionNumber"+lastSolvedQuestionNumber);
              if(lastSolvedQuestionNumber<=noOfQuestions){
                await getDatabase().ref(`/teams/${teamCode}/scoreCard/${lastSolvedQuestionNumber}`).set(obj1);
              }
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

    // Update level at team score card for scoreboard calculation
    await getDatabase().ref(`/teams/${teamCode}`).update({calculatedLevel: level});
    // Calculate and update team score
    await getDatabase().ref(`/teams/${teamCode}/scoreCard`).get()
    .then(async (scoreCardSnapshot) => {
      scoreCardSnapshot.forEach((scoreRecordSnapshot)=>{
        const qn = Number(scoreRecordSnapshot.key);
        if(qn != level){
          if(scoreRecordSnapshot.child("isSuccess").val()==true)
            teamScore = teamScore +  Number(qn*successfulScale) +  Number(initScoreValue);
          else
            teamScore = teamScore - Number(qn*unsuccessfulScale) + Number(initScoreValue);
        }
        if(scoreRecordSnapshot.child("hintUsed").val()==true && qn < 23)
          teamScore = teamScore -  Number(qn*hintScale) + Number(initScoreValue);
      });
    });
    await getDatabase().ref(`/teams/${teamCode}`).update({teamScore: teamScore});

    // If level become more than Total questions in game then End game
    await getDatabase().ref("/master/questionDetails").get().then( 
      async (questionsSnapshot)=> {
        // logger.debug("Getting questionsSnapshot: "+JSON.stringify(questionsSnapshot));
        noOfQuestions = questionsSnapshot.numChildren();
        if (noOfQuestions<level){
          customCode = "EndGame";
          // logger.debug("End Game, user finished the game.");
          return {
            code: customCode,
            teamName: teamName
          };
        }
        // logger.debug("Number of Questions: "+noOfQuestions);
        //Case 1: question set
        question = questionsSnapshot.child(level).child("questionText").val();
        //Case 1: hint set
        // logger.debug("Before checking hint.");
        await getDatabase().ref(`/teams/${teamCode}/scoreCard`).get()
          .then(async (scoreCardSnapshot)=>{
            if(scoreCardSnapshot.exists()){
              // logger.debug("scoreCard exists: "+JSON.stringify(scoreCardSnapshot));
              await getDatabase().ref(`/teams/${teamCode}/scoreCard/${level}/hintUsed`).get()
                .then(async (hintSnapshot)=>{
                  // logger.debug("Level: "+level+"hintSnapshot exists: "+JSON.stringify(hintSnapshot));
                  if(hintSnapshot.exists() && hintSnapshot.val() == true){
                    hint = questionsSnapshot.child(level).child("hint").val();
                    // logger.debug("hint value: "+hint);
                  }
                });
            }
          });
        //Case 1: Answer length
        ansLength = questionsSnapshot.child(level).child("answer").val().length;
        // logger.debug("Question at Level "+level+" = "+question+", Hint: "+hint);
      });
    logger.debug("Before getting team name team Code: "+teamCode);
    await getDatabase().ref(`/teams/${teamCode}`).get().then(async (snapshot)=>{
      // logger.info("TeamExists: "+teamCode+", "+JSON.stringify(snapshot));
      teamName = snapshot.child("teamName").val();
    });
    // logger.debug("Check for custom code: "+customCode+", team name: "+teamName);

    if(customCode!=null){
      // logger.debug("Inside custom Code not null");
      return {
        code: customCode,
        teamName: teamName
      };
    }

    const strReturn = {
      teamName: teamName,
      time: availableTime,
      level: level,
      rank: teamScore+"",
      maxRank: 50,
      question: question,
      hint: hint,
      ansLength: ansLength
    };

    logger.debug("Get Question Function Return Object: "+JSON.stringify(strReturn));

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

// Manually run the task here https://console.cloud.google.com/cloudscheduler
exports.schedulerOfScoreCard = onSchedule("*/2 * * * *", async (event) => {

  logger.log("Scheduler Running");

});

