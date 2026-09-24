import { useState } from "react";
import { Button } from "../../../shared/ui/Button";
import { Icon } from "../../../shared/ui/Icon";
import type { Event } from "../domain/types";

export function Activity({
  events,
  onNote,
}: {
  events: Event[];
  onNote?: (message: string) => boolean;
}) {
  const [note, setNote] = useState("");
  return (
    <aside className="activity">
      <h3>
        <Icon name="clock" />
        Activity
      </h3>
      {onNote && (
        <div className="activity-compose">
          <textarea
            aria-label="Internal note"
            placeholder="Log an internal note…"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={2}
          />
          <Button
            variant="ghost"
            disabled={!note.trim()}
            onClick={() => {
              if (onNote(note.trim())) setNote("");
            }}
          >
            Log note
          </Button>
        </div>
      )}
      <div className="timeline">
        {[...events].reverse().map((e) => (
          <div className="timeline-event" key={e.id}>
            <div className="timeline-dot" />
            <div>
              <p>{e.message}</p>
              <time dateTime={e.date}>
                {new Date(e.date).toLocaleString("en-GB", {
                  day: "numeric",
                  month: "short",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </time>
            </div>
          </div>
        ))}
      </div>
    </aside>
  );
}
