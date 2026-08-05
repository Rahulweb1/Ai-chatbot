import React, { useEffect, useRef, useState } from 'react';
import mermaid from 'mermaid';

mermaid.initialize({
  startOnLoad: false,
  theme: 'dark',
  securityLevel: 'loose',
  themeVariables: {
    darkMode: true,
    background: '#090d16',
    primaryColor: '#10b981',
    lineColor: '#38bdf8',
    textColor: '#f1f5f9',
  },
});

interface MermaidDiagramProps {
  chart: string;
}

export function MermaidDiagram({ chart }: MermaidDiagramProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [svgHtml, setSvgHtml] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    const renderChart = async () => {
      try {
        const id = 'mermaid_' + Math.random().toString(36).substring(2, 9);
        const { svg } = await mermaid.render(id, chart);
        if (isMounted) {
          setSvgHtml(svg);
          setError(null);
        }
      } catch (err: any) {
        if (isMounted) {
          setError(err.message || 'Failed to render Mermaid diagram');
        }
      }
    };

    renderChart();
    return () => {
      isMounted = false;
    };
  }, [chart]);

  if (error) {
    return (
      <div className="p-3 my-2 rounded-lg bg-rose-950/40 border border-rose-800/60 text-rose-300 font-mono text-xs">
        Failed to render diagram: {error}
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="p-4 my-3 rounded-xl bg-slate-950/80 border border-slate-800/80 overflow-x-auto flex justify-center"
      dangerouslySetInnerHTML={{ __html: svgHtml }}
    />
  );
}
