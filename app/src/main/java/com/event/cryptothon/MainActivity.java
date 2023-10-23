package com.event.cryptothon;

import androidx.annotation.NonNull;
import androidx.appcompat.app.AppCompatActivity;

import android.os.Bundle;
import android.util.Log;
import android.view.View;
import android.view.Window;

import com.google.firebase.database.DataSnapshot;
import com.google.firebase.database.DatabaseError;
import com.google.firebase.database.DatabaseReference;
import com.google.firebase.database.FirebaseDatabase;
import com.google.firebase.database.ValueEventListener;

import java.util.HashMap;

public class MainActivity extends AppCompatActivity {

    public static final String TAG = "MainActivity";

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_main);
    }

    public void tempBtnClicked(View view) {
        FirebaseDatabase db = FirebaseDatabase.getInstance("https://codethon-1-default-rtdb.asia-southeast1.firebasedatabase.app");
        DatabaseReference myRef = db.getReference("temp");
        myRef.setValue("Sumant");
        HashMap<String, String> hm = new HashMap<>();
        hm.put("key1", "Value1");
        hm.put("key2", "Value2");
        myRef.setValue(hm);

        // Read from the database
        myRef.addValueEventListener(new ValueEventListener() {
            @Override
            public void onDataChange(@NonNull DataSnapshot dataSnapshot) {
                // This method is called once with the initial value and again
                // whenever data at this location is updated.
                Log.d(TAG, "key = "+dataSnapshot.getKey()+", value = "+dataSnapshot.getValue());
                for(DataSnapshot ds: dataSnapshot.getChildren()){
                    Log.d(TAG, "Value is: key = "+ds.getKey()+", value = "+ds.getValue().toString());
                }
//                Log.d(TAG, "Value is: " + hmReturned.get("key2"));
            }

            @Override
            public void onCancelled(@NonNull DatabaseError error) {
                // Failed to read value
                Log.w(TAG, "Failed to read value.", error.toException());
            }
        });
    }
}