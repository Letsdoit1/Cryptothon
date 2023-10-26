package com.event.cryptothon;

import androidx.annotation.NonNull;
import androidx.appcompat.app.AppCompatActivity;

import android.content.Intent;
import android.os.Bundle;
import android.provider.Settings;
import android.text.Editable;
import android.util.Log;
import android.view.View;
import android.widget.EditText;
import android.widget.TextView;
import android.widget.Toast;

import com.event.cryptothon.models.RegistrationDetails;
import com.google.android.gms.tasks.Continuation;
import com.google.android.gms.tasks.OnCompleteListener;
import com.google.android.gms.tasks.Task;
import com.google.firebase.functions.FirebaseFunctions;
import com.google.firebase.functions.FirebaseFunctionsException;
import com.google.firebase.functions.HttpsCallableResult;

import java.util.HashMap;
import java.util.Map;

public class Activity_Login extends AppCompatActivity {
    public static final String TAG = "Activity_Login";
    private FirebaseFunctions mFunctions;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_login);
        mFunctions = FirebaseFunctions.getInstance();
        if (FirebaseHelper.EMULATOR_RUNNING)
            mFunctions.useEmulator("10.0.2.2", 5001);


    }

    public void onClickedLoginBtn(View view) {
        String deviceId = Settings.Secure.getString(getContentResolver(), Settings.Secure.ANDROID_ID);
        String pwd = ((TextView)findViewById(R.id.txtPwd)).getText().toString();
        checkPwdAndRegister(deviceId, pwd)
                .addOnCompleteListener(new OnCompleteListener<RegistrationDetails>() {
                    @Override
                    public void onComplete(@NonNull Task<RegistrationDetails> task) {
                        if (!task.isSuccessful()) {
                            Exception e = task.getException();
                            String error = null;
                            if (e instanceof FirebaseFunctionsException)
                                error = "FirebaseFunctionException Code = " + ((FirebaseFunctionsException) e).getCode() + ", " + e.getMessage();
                            else
                                error = "FirebaseFunctionException Code = " + e.getMessage();
                            error = "DeviceId=" + deviceId + ", " + error;
                            Log.w(TAG, error);
                            return;
                        }
                        RegistrationDetails rd = task.getResult();
                        if (rd!=null && rd.isWrongTeamCode())
                            Toast.makeText(Activity_Login.this, getString(R.string.wrong_pwd_msg),Toast.LENGTH_SHORT).show();
                        else if(rd.isRegisteredSuccessfully()){
                            Intent intent = new Intent(Activity_Login.this, MainActivity.class);
                            intent.putExtra("TEAM_CODE",pwd);
                            startActivity(intent);
                        }else{
                            Toast.makeText(Activity_Login.this,
                                    getString(R.string.max_devices_reached)+getString(R.string.device)+"1: "+rd.getDeviceId1()+", "+
                                            getString(R.string.device)+"2: "+rd.getDeviceId2()+", "+getString(R.string.device)+"3: "+
                                            rd.getDeviceId3(),Toast.LENGTH_LONG).show();
                        }
                    }
                });
    }

    private Task<RegistrationDetails> checkPwdAndRegister(String deviceId, String pwd) {
        Map<String,Object> data = new HashMap<>();
        data.put("deviceId", deviceId);
        data.put("teamCode",pwd);
        return mFunctions.getHttpsCallable("checkPwdAndRegister")
                .call(data)
                .continueWith(new Continuation<HttpsCallableResult, RegistrationDetails>() {
                    @Override
                    public RegistrationDetails then(@NonNull Task<HttpsCallableResult> task) throws Exception {
                        Map<String, Object> result = (Map<String, Object>) task.getResult().getData();
                        RegistrationDetails rd = new RegistrationDetails();
                        rd.setWrongTeamCode((boolean)result.get("wrongTeamCode"));
                        rd.setRegisteredSuccessfully((boolean)result.get("registeredSuccessfully"));
                        rd.setDeviceId1((String)result.get("deviceId1"));
                        rd.setDeviceId2((String)result.get("deviceId2"));
                        rd.setDeviceId3((String)result.get("deviceId3"));
                        return rd;
                    }
                });
    }


}