package com.event.cryptothon;

import androidx.annotation.NonNull;
import androidx.appcompat.app.AppCompatActivity;

import android.content.Context;
import android.content.Intent;
import android.os.Bundle;
import android.os.Handler;
import android.provider.Settings;
import android.util.Log;
import android.widget.Toast;

import com.google.android.gms.tasks.Continuation;
import com.google.android.gms.tasks.OnCompleteListener;
import com.google.android.gms.tasks.Task;
import com.google.firebase.functions.FirebaseFunctions;
import com.google.firebase.functions.FirebaseFunctionsException;
import com.google.firebase.functions.HttpsCallableResult;

import java.util.HashMap;
import java.util.Map;

public class Activity_welcome_screen extends AppCompatActivity {
    private static final String TAG = "Activity_welcome_screen";
    public static final int TIME_OUT = 1000;
    private FirebaseFunctions mFunctions;
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_welcome_screen);
        Context activityContext = this;
        new Handler().postDelayed(new Runnable() {
            Boolean isRegistered = false;
            @Override
            public void run() {
                mFunctions = FirebaseFunctions.getInstance();
                if(FirebaseHelper.EMULATOR_RUNNING)
                    mFunctions.useEmulator("10.0.2.2",5001);
                //Getting DeviceID or AnroidID
                String deviceId = Settings.Secure.getString(getContentResolver(), Settings.Secure.ANDROID_ID);
                getRegistrationStatus(deviceId)
                        .addOnCompleteListener(new OnCompleteListener<Boolean>() {
                            @Override
                            public void onComplete(@NonNull Task<Boolean> task) {
                                if(!task.isSuccessful()){
                                    Exception e = task.getException();
                                    String error = null;
                                    if(e instanceof FirebaseFunctionsException)
                                        error = "FirebaseFunctionException Code = " + ((FirebaseFunctionsException) e).getCode() + ", " + e.getMessage();
                                    else
                                        error = "FirebaseFunctionException Code = " + e.getMessage();
                                    error = "DeviceId="+deviceId+", "+error;
                                    Log.w(TAG, error);
//                                    Toast.makeText(activityContext,error,Toast.LENGTH_LONG).show();
                                    return;
                                }
                                isRegistered = task.getResult();
                            }
                        });
                if(isRegistered)
                    startActivity(new Intent(Activity_welcome_screen.this, MainActivity.class));
                else
                    startActivity(new Intent(Activity_welcome_screen.this, Activity_Login.class));
                finish();
            }

            private Task<Boolean> getRegistrationStatus(String deviceId) {
                Map<String,Object> data = new HashMap<>();
                data.put("deviceId", deviceId);
                return mFunctions.getHttpsCallable("isRegisteredDevice")
                        .call(data)
                        .continueWith(new Continuation<HttpsCallableResult, Boolean>() {
                            @Override
                            public Boolean then(@NonNull Task<HttpsCallableResult> task) throws Exception {
                                Map<String, Object> result = (Map<String, Object>) task.getResult().getData();
                                return (Boolean) result.get("registrationStatus");
                            }
                        });
            }
        },TIME_OUT);







    }
}