"use client";

import type { ChannelStyleRecord } from "@/lib/channel-styles/types";
import { StyleCard } from "./StyleCard";

export function StyleGrid({ styles }: { styles: ChannelStyleRecord[] }) {
  return (
    <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-4">
      {styles.map((s) => (
        <StyleCard key={s.id} style={s} />
      ))}
    </div>
  );
}
