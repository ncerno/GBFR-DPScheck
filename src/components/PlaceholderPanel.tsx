import type { ReactNode } from 'react';

interface PlaceholderPanelProps {
  title: string;
  description: string;
  children?: ReactNode;
}

export function PlaceholderPanel({ title, description, children }: PlaceholderPanelProps) {
  return (
    <section className="panel">
      <h2>{title}</h2>
      <p>{description}</p>
      {children ? <div className="panel-body">{children}</div> : null}
    </section>
  );
}
