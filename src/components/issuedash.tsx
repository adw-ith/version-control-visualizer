"use client";

import { useEffect, useState } from "react";
import AdvancedIssueVisualizer, { Issue } from "./AdvancedIssuevisualizer";
import { useParams } from "next/navigation";

export default function IssueDashboard() {
  const params = useParams() as { vcs: string; owner: string; repo: string };
  const { vcs, owner, repo } = params;
  const [issues, setIssues] = useState<Issue[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchIssues() {
      try {
        const res = await fetch(
          `/api/issues-list?vcs=${vcs}&owner=${owner}&repo=${repo}`
        );
        if (!res.ok) throw new Error("Failed to fetch issues");
        const data = await res.json();
        // Assume your API returns { issues: Issue[] }
        setIssues(data.issues);
      } catch (err: any) {
        setError(err.message);
        console.error(err);
      } finally {
        setLoading(false);
      }
    }

    fetchIssues();
  }, [vcs, owner, repo]);

  if (loading) return <div>Loading issues...</div>;
  if (error) return <div>Error: {error}</div>;

  return <AdvancedIssueVisualizer issues={issues} />;
}
