'use client'

import React, { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabaseClient';
import Image from 'next/image';
import Link from 'next/link';
import styles from '@/app/page.module.css';

interface MatchWithProfile {
  id: string;
  description: string | null;
  winner_id: string;
  profiles: {
    username: string;
    avatar_url: string | null;
  };
}

export default function RealtimeActivityFeed({ initialMatches }: { initialMatches: any[] }) {
  const [matches, setMatches] = useState<MatchWithProfile[]>(initialMatches);
  const supabase = createClient();

  useEffect(() => {
    const channel = supabase
      .channel('schema-db-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'matches',
        },
        async (payload) => {
          // Fetch the full profile info for the new match
          const { data: newMatch } = await supabase
            .from('matches')
            .select('*, profiles:winner_id(username, avatar_url)')
            .eq('id', payload.new.id)
            .single();

          if (newMatch) {
            setMatches((prev) => [newMatch as MatchWithProfile, ...prev].slice(0, 5));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
      {matches.length > 0 ? (
        matches.map((match) => (
          <div key={match.id} className={styles.activityItem}>
            <div className={styles.activityContent}>
              {match.profiles?.avatar_url ? (
                <Image 
                  src={match.profiles.avatar_url} 
                  width={32} 
                  height={32} 
                  className={styles.avatarImage}
                  alt={match.profiles.username} 
                  unoptimized
                />
              ) : (
                <div className={styles.avatarFallback}>
                  {match.profiles?.username?.[0]?.toUpperCase() || "W"}
                </div>
              )}
              <div>
                <div className={styles.activityText}>{match.profiles?.username} ganó</div>
                <div className={styles.activitySubtext}>{match.description || "Partida de liga"}</div>
              </div>
            </div>
          </div>
        ))
      ) : (
        <div className={styles.emptyState}>
          No hay partidas recientes... aún.
        </div>
      )}
    </div>
  );
}
