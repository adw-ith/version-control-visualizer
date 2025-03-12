"use client";

import { useEffect, useRef } from "react";
import { html } from "diff2html";
import "diff2html/bundles/css/diff2html.min.css";

interface DiffViewerProps {
  diff: string;
  splitView?: boolean; // Toggle between side-by-side and line-by-line views
}

const DiffViewer: React.FC<DiffViewerProps> = ({ diff, splitView = true }) => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (containerRef.current) {
      const diffHtml = html(diff, {
        matching: "lines",
        outputFormat: splitView ? "side-by-side" : "line-by-line",
      });
      containerRef.current.innerHTML = diffHtml;
    }
  }, [diff, splitView]);

  return <div ref={containerRef} />;
};

export default DiffViewer;
