package com.event.cryptothon;

import androidx.annotation.NonNull;
import androidx.appcompat.app.AppCompatActivity;
import androidx.appcompat.widget.Toolbar;

import android.content.Intent;
import android.os.Bundle;
import android.provider.Settings;
import android.util.Log;
import android.view.View;
import android.widget.TextView;
import android.widget.Toast;

import com.event.cryptothon.models.QuestionData;
import com.google.android.gms.tasks.Continuation;

import com.google.android.gms.tasks.OnCompleteListener;
import com.google.android.gms.tasks.Task;

import com.google.firebase.functions.FirebaseFunctions;
import com.google.firebase.functions.FirebaseFunctionsException;
import com.google.firebase.functions.HttpsCallableResult;

import java.util.HashMap;
import java.util.Map;

public class MainActivity extends AppCompatActivity {
    public static final String TAG = "CryptothonMainActivity";
    FirebaseFunctions mFunctions;

    String deviceId;

    QuestionData questionData;

    String teamCode;

    @Override
    protected void onResume() {
        super.onResume();

        Intent intent = getIntent();
        teamCode = intent.getStringExtra("TEAM_CODE");
//        ((TextView)findViewById(R.id.txtAnswer)).setText(teamCode);

        getQuestion()
                .addOnCompleteListener(new OnCompleteListener<QuestionData>() {
                    @Override
                    public void onComplete(@NonNull Task<QuestionData> task) {
                        if (!task.isSuccessful()) {
                            Exception e = task.getException();
                            String error = null;
                            if (e instanceof FirebaseFunctionsException)
                                error = "FirebaseFunctionException Code = " + ((FirebaseFunctionsException) e).getCode() + ", " + e.getMessage();
                            else
                                error = "FirebaseFunctionException Code = " + e.getMessage();
                            error = "DeviceId=" + deviceId + ", getQuestion(), " + error;
                            Log.w(TAG, error);
                            Intent intent = new Intent(MainActivity.this, Activity_Error.class);
                            intent.putExtra("ERROR_MSG",error);
                            startActivity(intent);
                            return;
                        }
                        String error = null;
                        questionData = task.getResult();
                        if (questionData!=null){
                            if(questionData.getError()!=null){
                                error = "DeviceId=" + deviceId + ", getQuestion() Error from Server, " + questionData.getError();
                            } else if (questionData.getCode()!=null) {
                                String title = null, message = null;
                                if (questionData.getCode().equals("EventNotStarted")) {
                                    title = "Event Not Started";
                                    message = "Please Wait";
                                } else if (questionData.getCode().equals("EventEnded")) {
                                    title = "Event Ended";
                                    message = "Thank You !!";
                                } else if (questionData.getCode().equals("EndGame")) {
                                    title = "Game End";
                                    message = "You reached end of the game. Congratulations !!";
                                }
                                if(title!=null){
                                    Intent intent = new Intent(MainActivity.this, Activity_SignificantMessage.class);
                                    intent.putExtra("TITLE",title);
                                    intent.putExtra("MESSAGE",message);
                                    startActivity(intent);
                                }
                                ((Toolbar) findViewById(R.id.toolbar)).setTitle(questionData.getTeamName());
                            }else {
                                updateUI();
                            }
                        }
                        else{
                            error = "DeviceId=" + deviceId + ", getQuestion(), " + "Question Data not received.";
                        }

                        if(error!=null){
                            Log.w(TAG, error);
                            Intent intent = new Intent(MainActivity.this, Activity_Error.class);
                            intent.putExtra("ERROR_MSG",error);
                            startActivity(intent);
                        }
                    }
                });

    }

    private Task<QuestionData> getQuestion() {
        Map<String,Object> data = new HashMap<>();
        data.put("teamCode", teamCode);
        return mFunctions.getHttpsCallable("getQuestion")
                .call(data)
                .continueWith(new Continuation<HttpsCallableResult, QuestionData>() {
                    @Override
                    public QuestionData then(@NonNull Task<HttpsCallableResult> task) throws Exception {
                        Map<String, Object> result = (Map<String, Object>) task.getResult().getData();
                        QuestionData qd = new QuestionData();
                        if(result.containsKey("code")){
                            qd.setCode((String)result.get("code"));
                            qd.setTeamName((String)result.get("teamName"));
                        } else if (result.containsKey("error")) {
                            qd.setError((String)result.get("error"));
                        } else {
                            qd.setTime((Integer) result.get("time"));
                            qd.setLevel((Integer) result.get("level"));
                            qd.setRank((Integer) result.get("rank"));
                            qd.setMaxRank((Integer) result.get("maxRank"));
                            qd.setQuestion((String) result.get("question"));
                            qd.setHint((String) result.get("hint"));
                            qd.setTeamName((String)result.get("teamName"));
                            qd.setAnsLength((Integer) result.get("ansLength"));
                        }
                        return qd;
                    }
                });
    }


    public void btnClickedSubmit(View view) {
        String ans = ((TextView)findViewById(R.id.txtAnswer)).getText().toString();
        if(ans != null && !ans.trim().isEmpty())
        {
            Toast.makeText(MainActivity.this, "Answer is empty. Enter some value.",Toast.LENGTH_SHORT).show();
            return;
        }
        if(ans.length()!=questionData.getAnsLength())
            Toast.makeText(MainActivity.this, "Wrong Answer, Try again.",Toast.LENGTH_SHORT).show();

        checkAnswer(ans)
                .addOnCompleteListener(new OnCompleteListener<QuestionData>() {
                    @Override
                    public void onComplete(@NonNull Task<QuestionData> task) {
                        if (!task.isSuccessful()) {
                            Exception e = task.getException();
                            String error = null;
                            if (e instanceof FirebaseFunctionsException)
                                error = "FirebaseFunctionException Code = " + ((FirebaseFunctionsException) e).getCode() + ", " + e.getMessage();
                            else
                                error = "FirebaseFunctionException Code = " + e.getMessage();
                            error = "DeviceId=" + deviceId + ", getQuestion(), " + error;
                            Log.w(TAG, error);
                            Intent intent = new Intent(MainActivity.this, Activity_Error.class);
                            intent.putExtra("ERROR_MSG",error);
                            startActivity(intent);
                            return;
                        }
                        String error = null;
                        questionData = task.getResult();
                        if (questionData!=null){
                            if(questionData.getError()!=null){
                                error = "DeviceId=" + deviceId + ", getQuestion() Error from Server, " + questionData.getError();
                            } else if (questionData.getCode()!=null) {
                                String title = null, message = null;
                                if (questionData.getCode().equals("EventNotStarted")) {
                                    title = "Event Not Started";
                                    message = "Please Wait";
                                } else if (questionData.getCode().equals("EventEnded")) {
                                    title = "Event Ended";
                                    message = "Thank You !!";
                                } else if (questionData.getCode().equals("EndGame")) {
                                    title = "Game End";
                                    message = "You reached end of the game. Congratulations !!";
                                }else if(questionData.getCode().equals("Success")||questionData.getCode().equals("TryAgain")){
                                    Toast.makeText(MainActivity.this,"Successful !!",Toast.LENGTH_SHORT).show();
                                }else if(questionData.getCode().equals("TryAgain")){
                                    Toast.makeText(MainActivity.this,"Wrong Answer, Try again.",Toast.LENGTH_SHORT).show();
                                }
                                if(title!=null){
                                    Intent intent = new Intent(MainActivity.this, Activity_SignificantMessage.class);
                                    intent.putExtra("TITLE",title);
                                    intent.putExtra("MESSAGE",message);
                                    startActivity(intent);
                                }
                                ((Toolbar) findViewById(R.id.toolbar)).setTitle(questionData.getTeamName());
                            }else {
                                updateUI();
                            }
                        }
                        else{
                            error = "DeviceId=" + deviceId + ", checkResult(), " + "Data not received.";
                        }
                        if(error!=null){
                            Log.w(TAG, error);
                            Intent intent = new Intent(MainActivity.this, Activity_Error.class);
                            intent.putExtra("ERROR_MSG",error);
                            startActivity(intent);
                        }
                    }
                });
    }

    private Task<QuestionData> checkAnswer(String ans) {

        Map<String,Object> data = new HashMap<>();
        data.put("ans",ans);
        if(questionData.getHint()!=null)
            data.put("hintTaken", true);
        else
            data.put("hintTaken", false);
        data.put("level", questionData.getLevel());
        data.put("teamCode", teamCode);
        data.put("deviceId",deviceId);

        return mFunctions.getHttpsCallable("getQuestion")
                .call(data)
                .continueWith(new Continuation<HttpsCallableResult, QuestionData>() {
                    @Override
                    public QuestionData then(@NonNull Task<HttpsCallableResult> task) throws Exception {
                        Map<String, Object> result = (Map<String, Object>) task.getResult().getData();
                        QuestionData qd = new QuestionData();
                        if(result.containsKey("code")){
                            qd.setCode((String)result.get("code"));
                            qd.setTeamName((String)result.get("teamName"));
                        } else if (result.containsKey("error")) {
                            qd.setError((String)result.get("error"));
                        } else {
                            qd.setTime((Integer) result.get("time"));
                            qd.setLevel((Integer) result.get("level"));
                            qd.setRank((Integer) result.get("rank"));
                            qd.setMaxRank((Integer) result.get("maxRank"));
                            qd.setQuestion((String) result.get("question"));
                            qd.setHint((String) result.get("hint"));
                            qd.setTeamName((String)result.get("teamName"));
                            qd.setAnsLength((Integer) result.get("ansLength"));
                        }
                        return qd;
                    }
                });
    }

    private void updateUI(){
        ((TextView) findViewById(R.id.lblTimer)).setText(questionData.getTime().toString());
        ((TextView) findViewById(R.id.lblLevel)).setText("Level " + questionData.getLevel().toString() + ":");
        ((TextView) findViewById(R.id.lblQuestion)).setText(questionData.getQuestion());
        ((TextView) findViewById(R.id.lblQuestion)).setHint("Answer here with length:"+questionData.getAnsLength());
        ((TextView) findViewById(R.id.lblHintText)).setText(questionData.getHint());
        ((Toolbar) findViewById(R.id.toolbar)).setTitle(questionData.getTeamName());
    }

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_main);
        Toolbar toolbar = (Toolbar) findViewById(R.id.toolbar);
        setSupportActionBar(toolbar);

        mFunctions = FirebaseFunctions.getInstance();
        if(FirebaseHelper.EMULATOR_RUNNING)
            mFunctions.useEmulator("10.0.2.2",5001);

        deviceId = Settings.Secure.getString(getContentResolver(), Settings.Secure.ANDROID_ID);
    }

}