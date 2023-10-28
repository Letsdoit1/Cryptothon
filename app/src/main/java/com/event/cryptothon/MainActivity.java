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


//    public FirebaseDatabase getDB(){
//        if(EMULATED){
//            FirebaseDatabase db = FirebaseDatabase.getInstance();
//            db.useEmulator("10.0.2.2",9000);
//            return db;
//        }else{
//            return FirebaseDatabase.getInstance("https://codethon-1-default-rtdb.asia-southeast1.firebasedatabase.app");
//        }
//    }

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_main);
        Toolbar toolbar = (Toolbar) findViewById(R.id.toolbar);
        setSupportActionBar(toolbar);

        Intent intent = getIntent();
        String teamCode = intent.getStringExtra("TEAM_CODE");
//        ((TextView)findViewById(R.id.txtAnswer)).setText(teamCode);

        mFunctions = FirebaseFunctions.getInstance();
        if(FirebaseHelper.EMULATOR_RUNNING)
            mFunctions.useEmulator("10.0.2.2",5001);

        String deviceId = Settings.Secure.getString(getContentResolver(), Settings.Secure.ANDROID_ID);
        getQuestion(teamCode)
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
                        QuestionData qd = task.getResult();
                        if (qd!=null){
                            if(qd.getError()!=null){
                                error = "DeviceId=" + deviceId + ", getQuestion() Error from Server, " + qd.getError();
                            } else if (qd.getCode()!=null) {
                                if (qd.getCode().equals("EventNotStarted")) {
                                    ((TextView) findViewById(R.id.lblQuestion)).setText("Event Not started yet.");
                                }
                                ((Toolbar) findViewById(R.id.toolbar)).setTitle(qd.getTeamName());
                            }else {
                                ((TextView) findViewById(R.id.lblTimer)).setText(qd.getTime());
                                ((TextView) findViewById(R.id.lblLevel)).setText("Level " + qd.getLevel().toString() + ":");
                                ((TextView) findViewById(R.id.lblQuestion)).setText(qd.getQuestion());
                                ((TextView) findViewById(R.id.lblHintText)).setText(qd.getHint());
                                ((Toolbar) findViewById(R.id.toolbar)).setTitle(qd.getTeamName());
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

    private Task<QuestionData> getQuestion(String teamCode) {
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
                            qd.setTime((String) result.get("time"));
                            qd.setLevel((Integer) result.get("level"));
                            qd.setRank((Integer) result.get("rank"));
                            qd.setMaxRank((Integer) result.get("maxRank"));
                            qd.setQuestion((String) result.get("question"));
                            qd.setHint((String) result.get("hint"));
                            qd.setTeamName((String)result.get("teamName"));
                        }
                        return qd;
                    }
                });
    }


    public void btnClickedSubmit(View view) {

    }
}