package com.event.cryptothon;

import androidx.appcompat.app.AppCompatActivity;

import android.content.Intent;
import android.os.Bundle;
import android.widget.TextView;

public class Activity_SignificantMessage extends AppCompatActivity {

    @Override
    protected void onResume() {
        super.onResume();
        Intent intent = getIntent();
        ((TextView)findViewById(R.id.lblTitle)).setText(intent.getStringExtra("TITLE"));
        ((TextView)findViewById(R.id.lblMsg)).setText(intent.getStringExtra("MESSAGE"));
    }

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_significant_message);
    }
}