package com.event.cryptothon;

import androidx.annotation.NonNull;
import androidx.appcompat.app.AppCompatActivity;
import androidx.appcompat.widget.Toolbar;

import android.content.Intent;
import android.os.Bundle;
import android.provider.Settings;
import android.util.Log;
import android.view.View;
import android.view.Window;
import android.widget.TextView;

import com.event.cryptothon.databinding.ActivityMainBinding;
import com.google.android.gms.tasks.Continuation;
import com.google.android.gms.tasks.OnCompleteListener;
import com.google.android.gms.tasks.Task;
import com.google.android.material.snackbar.Snackbar;
import com.google.firebase.database.DataSnapshot;
import com.google.firebase.database.DatabaseError;
import com.google.firebase.database.DatabaseReference;
import com.google.firebase.database.FirebaseDatabase;
import com.google.firebase.database.ValueEventListener;
import com.google.firebase.functions.FirebaseFunctions;
import com.google.firebase.functions.FirebaseFunctionsException;
import com.google.firebase.functions.HttpsCallableResult;

import java.util.HashMap;
import java.util.Map;

public class MainActivity extends AppCompatActivity {
    public static final String TAG = "CryptothonMainActivity";
    public static final boolean EMULATED = true;

    FirebaseFunctions mFunctions;

    public FirebaseDatabase getDB(){
        if(EMULATED){
            FirebaseDatabase db = FirebaseDatabase.getInstance();
            db.useEmulator("10.0.2.2",9000);
            return db;
        }else{
            return FirebaseDatabase.getInstance("https://codethon-1-default-rtdb.asia-southeast1.firebasedatabase.app");
        }
    }

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_main);
        Toolbar toolbar = (Toolbar) findViewById(R.id.toolbar);
        setSupportActionBar(toolbar);

        Intent intent = getIntent();
        String teamCode = intent.getStringExtra("TEAM_CODE");
        ((TextView)findViewById(R.id.txtAnswer)).setText(teamCode);

        mFunctions = FirebaseFunctions.getInstance();

        if(EMULATED)
            mFunctions.useEmulator("10.0.2.2",5001);
    }

    private Task<Integer> addNumbers(int a, int b){
        Map<String, Object> data = new HashMap<>();
        data.put("firstNumber", a);
        data.put("secondNumber", b);

//        return mFunctions.getHttpsCallable("addNumbers")
        return mFunctions.getHttpsCallable("addNumbers")
                .call(data)
                .continueWith(new Continuation<HttpsCallableResult, Integer>() {
                    @Override
                    public Integer then(@NonNull Task<HttpsCallableResult> task) throws Exception {
                        Map<String, Object> result = (Map<String, Object>) task.getResult().getData();
                        return (Integer)result.get("operationResult");
                    }
                });
    }

    public void tempBtnClicked(View view) {
//        String deviceId = Settings.Secure.getString(getContentResolver(), Settings.Secure.ANDROID_ID);
//        ((TextView)findViewById(R.id.txtAnswer)).setText(deviceId);

        int firstNumber = 5;
        int secondNumber = 10;

        addNumbers(firstNumber, secondNumber)
                .addOnCompleteListener(new OnCompleteListener<Integer>() {
                    @Override
                    public void onComplete(@NonNull Task<Integer> task) {

                        if(!task.isSuccessful()){
                            Exception e = task.getException();
                            if(e instanceof FirebaseFunctionsException){
                                FirebaseFunctionsException ffe = (FirebaseFunctionsException) e;
                                FirebaseFunctionsException.Code code = ffe.getCode();
                                Log.i(TAG, "code = "+code.toString());
                                Object details = ffe.getDetails();
                                if(details != null)
                                    Log.i(TAG, "details = "+details.toString());
                            }
                            Log.i(TAG, "Failure e = "+e);
                        }
                        try {
                            Integer result = task.getResult();
                            ((TextView)findViewById(R.id.txtAnswer)).setText(result.toString());
                        }catch(Exception e){
                            Log.i(TAG, e.getMessage());
                        }
                    }
                });



//        FirebaseDatabase db = getDB();
//        DatabaseReference myRef = db.getReference("temp");
//        myRef.setValue("Sumant");
//        HashMap<String, String> hm = new HashMap<>();
//        hm.put("key1", "Valuex");
//        hm.put("key2", "Value2");
//        myRef.setValue(hm);
//
//        // Read from the database
//        myRef.addValueEventListener(new ValueEventListener() {
//            @Override
//            public void onDataChange(@NonNull DataSnapshot dataSnapshot) {
//                // This method is called once with the initial value and again
//                // whenever data at this location is updated.
//                Log.d(TAG, "key = "+dataSnapshot.getKey()+", value = "+dataSnapshot.getValue());
//                for(DataSnapshot ds: dataSnapshot.getChildren()){
//                    Log.d(TAG, "Value is: key = "+ds.getKey()+", value = "+ds.getValue().toString());
//                }
////                Log.d(TAG, "Value is: " + hmReturned.get("key2"));
//            }
//
//            @Override
//            public void onCancelled(@NonNull DatabaseError error) {
//                // Failed to read value
//                Log.w(TAG, "Failed to read value.", error.toException());
//            }
//        });
    }
}