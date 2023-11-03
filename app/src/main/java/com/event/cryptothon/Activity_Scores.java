package com.event.cryptothon;

import androidx.annotation.NonNull;
import androidx.appcompat.app.AppCompatActivity;
import androidx.recyclerview.widget.LinearLayoutManager;
import androidx.recyclerview.widget.RecyclerView;

import android.content.Intent;
import android.os.Bundle;
import android.provider.Settings;
import android.util.Log;
import android.view.View;

import com.event.cryptothon.models.ScoreRecord;
import com.google.android.gms.tasks.Continuation;
import com.google.android.gms.tasks.OnCompleteListener;
import com.google.android.gms.tasks.Task;
import com.google.firebase.functions.FirebaseFunctions;
import com.google.firebase.functions.FirebaseFunctionsException;
import com.google.firebase.functions.HttpsCallableResult;

import java.util.ArrayList;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

public class Activity_Scores extends AppCompatActivity {
    public static final String TAG = "Activity_Scores";
    private FirebaseFunctions mFunctions;
    ScoreAdapter adapter;
    RecyclerView recyclerView;

    String teamCode;

    @Override
    protected void onResume() {
        super.onResume();
        mFunctions = FirebaseFunctions.getInstance();
        if (FirebaseHelper.EMULATOR_RUNNING)
            mFunctions.useEmulator("10.0.2.2", 5001);
        //Getting DeviceID or AndroidID
        String deviceId = Settings.Secure.getString(getContentResolver(), Settings.Secure.ANDROID_ID);
        getScoreBoard(deviceId)
                .addOnCompleteListener(new OnCompleteListener<List<Map<String, Object>>>() {
                    @Override
                    public void onComplete(@NonNull Task<List<Map<String, Object>>> task) {
                        if (!task.isSuccessful()) {
                            Exception e = task.getException();
                            String error = null;
                            if (e instanceof FirebaseFunctionsException)
                                error = "FirebaseFunctionException Code = " + ((FirebaseFunctionsException) e).getCode() + ", " + e.getMessage();
                            else
                                error = "FirebaseFunctionException Code = " + e.getMessage();
                            error = "DeviceId=" + deviceId + ", isRegistered(), " + error;
                            Log.w(TAG, error);
                            Intent intent = new Intent(Activity_Scores.this, Activity_Error.class);
                            intent.putExtra("ERROR_MSG",error);
                            startActivity(intent);
                            finish();
                            return;
                        }
                        List<Map<String, Object>> list = (List<Map<String, Object>>) task.getResult();

                        ArrayList<ScoreRecord> srList = new ArrayList<>();
                        for(int i=0;i<list.size();i++){
                            String rank = (String) list.get(i).get("rank");
                            String teamName = (String)list.get(i).get("teamName");
                            String level = "Level: "+(String) list.get(i).get("level");
                            String score = "Score: " +(String) list.get(i).get("score");
                            srList.add(new ScoreRecord(rank, teamName, level, score ));
                        }

                        recyclerView = (RecyclerView)findViewById(R.id.recyclerView);

                        adapter = new ScoreAdapter(srList, getApplication());
                        recyclerView.setAdapter(adapter);
                        recyclerView.setLayoutManager(new LinearLayoutManager(Activity_Scores.this));
                    }
                });
    }

    private Task<List<Map<String, Object>>> getScoreBoard(String deviceId) {
        Map<String,Object> data = new HashMap<>();
        data.put("deviceId", deviceId);
        return mFunctions.getHttpsCallable("getScoreBoard")
                .call(data)
                .continueWith(new Continuation<HttpsCallableResult, List<Map<String, Object>>>() {
                    @Override
                    public List<Map<String, Object>> then(@NonNull Task<HttpsCallableResult> task) throws Exception {
                        List<Map<String, Object>> result = (List<Map<String, Object>>) task.getResult().getData();
                        return result;
                    }
                });
    }

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_scores);

        Intent intent = getIntent();
        teamCode = intent.getStringExtra("TEAM_CODE");
    }

    public void onClickImgHome(View view) {
        Intent intent = new Intent(Activity_Scores.this,MainActivity.class);
        intent.putExtra("TEAM_CODE",teamCode);
        startActivity(intent);
    }

//    private ArrayList<ScoreRecord> getData(){
//        return srList;
//    }
}