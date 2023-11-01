package com.event.cryptothon;

import androidx.annotation.NonNull;
import androidx.appcompat.app.AppCompatActivity;

import android.content.Intent;
import android.os.Bundle;
import android.provider.Settings;
import android.util.Log;
import android.view.View;
import android.widget.Button;

import com.event.cryptothon.models.RegistrationStatus;
import com.event.cryptothon.models.ScoreRecord;
import com.google.android.gms.tasks.Continuation;
import com.google.android.gms.tasks.OnCompleteListener;
import com.google.android.gms.tasks.Task;
import com.google.firebase.functions.FirebaseFunctions;
import com.google.firebase.functions.FirebaseFunctionsException;
import com.google.firebase.functions.HttpsCallableResult;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.Map;

public class Activity_Scores extends AppCompatActivity {
    public static final String TAG = "Activity_Scores";

    private FirebaseFunctions mFunctions;

    @Override
    protected void onResume() {
        super.onResume();
        mFunctions = FirebaseFunctions.getInstance();
        if (FirebaseHelper.EMULATOR_RUNNING)
            mFunctions.useEmulator("10.0.2.2", 5001);
        //Getting DeviceID or AnroidID
        String deviceId = Settings.Secure.getString(getContentResolver(), Settings.Secure.ANDROID_ID);
        createScoreCard(deviceId)
                .addOnCompleteListener(new OnCompleteListener<ArrayList<ScoreRecord>>() {
                    @Override
                    public void onComplete(@NonNull Task<ArrayList<ScoreRecord>> task) {

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
                        ArrayList<ScoreRecord> isRegistered = null;
                        isRegistered = task.getResult();

                    }
                });
    }

    private Task<ArrayList<ScoreRecord>> createScoreCard(String deviceId) {
        Map<String,Object> data = new HashMap<>();
        data.put("deviceId", deviceId);
        return mFunctions.getHttpsCallable("createScoreCard")
                .call(data)
                .continueWith(new Continuation<HttpsCallableResult, ArrayList<ScoreRecord>>() {
                    @Override
                    public ArrayList<ScoreRecord> then(@NonNull Task<HttpsCallableResult> task) throws Exception {
                        Map<String, Object> result = (Map<String, Object>) task.getResult().getData();
                        ArrayList<ScoreRecord> rs = new ArrayList<ScoreRecord>();

                        return rs;
                    }
                });
    }

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_scores);
    }
}