package com.event.cryptothon;

import androidx.appcompat.app.AppCompatActivity;

import android.content.Intent;
import android.os.Bundle;
import android.widget.TextView;

public class Activity_Error extends AppCompatActivity {

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_error);
        Intent intent = getIntent();
        String str = intent.getStringExtra("ERROR_MSG");
        ((TextView)findViewById(R.id.lblErrorMsg)).setText(str);
    }
}