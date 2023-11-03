package com.event.cryptothon.models;

import android.view.View;
import android.widget.TextView;

import androidx.recyclerview.widget.RecyclerView;

import com.event.cryptothon.R;

public class ScoreViewHolder extends RecyclerView.ViewHolder {
    public TextView lblRank;
    public TextView lblTeamName;
    public TextView lblScore;
    public TextView lblLevel;
    View view;

    public ScoreViewHolder(View itemView)
    {
        super(itemView);
        lblRank
                = (TextView)itemView
                .findViewById(R.id.lblRank);
        lblTeamName
                = (TextView)itemView
                .findViewById(R.id.lblTeamName);
        lblScore
                = (TextView)itemView
                .findViewById(R.id.lblScore);
        lblLevel
                = (TextView)itemView
                .findViewById(R.id.lblLevel);
        view  = itemView;
    }
}
