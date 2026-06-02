import type { GbfrActRawEvent } from '../../gbfr-act/events';

interface RawEventViewerProps {
  events: GbfrActRawEvent[];
  parseErrors: Array<{ raw: string; message: string }>;
  onClear: () => void;
}

export function RawEventViewer({ events, parseErrors, onClear }: RawEventViewerProps) {
  return (
    <section className="raw-event-viewer">
      <div className="section-title-row">
        <div>
          <h3>Raw Event Viewer</h3>
          <p>用于确认 GBFR-ACT 的真实事件格式。unknown event 会原样保留。</p>
        </div>
        <button type="button" onClick={onClear}>清空</button>
      </div>

      {parseErrors.length > 0 ? (
        <details className="parse-error-list" open>
          <summary>解析失败 {parseErrors.length} 条</summary>
          {parseErrors.map((error, index) => (
            <pre key={`${error.message}-${index}`}>{error.message}\n{error.raw}</pre>
          ))}
        </details>
      ) : null}

      <div className="raw-event-list">
        {events.length === 0 ? (
          <p className="empty-state">还没有收到事件。可以先启动 Mock 数据，或启动 GBFR-ACT 后进游戏触发事件。</p>
        ) : events.map((event, index) => (
          <article key={`${event.time_ms}-${event.type}-${index}`} className="raw-event-item">
            <div className="raw-event-item__meta">
              <strong>{event.type}</strong>
              <span>{new Date(event.time_ms).toLocaleTimeString()}</span>
            </div>
            <pre>{JSON.stringify(event, null, 2)}</pre>
          </article>
        ))}
      </div>
    </section>
  );
}
