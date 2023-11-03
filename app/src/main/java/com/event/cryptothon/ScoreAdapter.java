package com.event.cryptothon;

import android.content.Context;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;

import androidx.annotation.NonNull;
import androidx.recyclerview.widget.RecyclerView;
import java.util.List;
import com.event.cryptothon.models.ScoreRecord;
import com.event.cryptothon.models.ScoreViewHolder;

import java.util.Collections;

public class ScoreAdapter extends RecyclerView.Adapter<ScoreViewHolder> {

    List<ScoreRecord> list = Collections.emptyList();
    Context context;

    public ScoreAdapter(List<ScoreRecord> list, Context context){
        this.list = list;
        this.context = context;
    }

    @NonNull
    @Override
    public ScoreViewHolder onCreateViewHolder(@NonNull ViewGroup parent, int viewType) {
        View view = LayoutInflater.from(parent.getContext())
                .inflate(R.layout.score_card, parent, false);
        return new ScoreViewHolder(view);
    }

    @Override
    public void onBindViewHolder(@NonNull ScoreViewHolder holder, int position) {
//        final index = holder.getAdapterPosition();
        holder.lblRank
                .setText(list.get(position).getRank());
        holder.lblTeamName
                .setText(list.get(position).getTeamName());
        holder.lblScore
                .setText(list.get(position).getScore());
        holder.lblLevel
                .setText(list.get(position).getLevel());
//        holder.view.setOnClickListener(new View.OnClickListener() {
//            @Override
//            public void onClick(View view)
//            {
//                listiner.click(index);
//            }
//        });
    }

    @Override
    public int getItemCount() {
        return list.size();
    }

    @Override
    public void onAttachedToRecyclerView(@NonNull RecyclerView recyclerView) {
        super.onAttachedToRecyclerView(recyclerView);
    }
}
