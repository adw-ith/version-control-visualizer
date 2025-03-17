"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";

interface IssueDetails {
  title: string;
  state: string;
  body: string;
  created_at?: string;
  updated_at?: string;
  // Additional fields can be added as needed.
}

export default function IssueVisualizerPage() {
  const params = useParams() as {
    vcs: string;
    owner: string;
    repo: string;
    issueNumber: string;
  };

  const { vcs, owner, repo, issueNumber } = params;
  const [issue, setIssue] = useState<IssueDetails | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchIssueDetails();
  }, [vcs, owner, repo, issueNumber]);

  const fetchIssueDetails = async () => {
    try {
      const res = await fetch(
        `/api/issue-details?vcs=${vcs}&owner=${owner}&repo=${repo}&issueNumber=${issueNumber}`
      );
      if (!res.ok) {
        throw new Error("Failed to fetch issue details");
      }
      const data = await res.json();
      setIssue(data);
    } catch (err: any) {
      console.error(err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div>Loading issue details...</div>;
  if (error) return <div>Error: {error}</div>;
  if (!issue) return <div>No issue found.</div>;

  return (
    <div className="p-6 mx-auto bg-white text-gray-900 shadow-md border border-gray-300">
      <h1 className="text-2xl font-bold mb-4">
        Issue #{issueNumber}: {issue.title}
      </h1>
      <p className="mb-2">
        <span className="font-semibold">Status: </span>
        {issue.state}
      </p>
      {issue.created_at && (
        <p className="mb-2">
          <span className="font-semibold">Created at: </span>
          {new Date(issue.created_at).toLocaleString()}
        </p>
      )}
      {issue.updated_at && (
        <p className="mb-2">
          <span className="font-semibold">Updated at: </span>
          {new Date(issue.updated_at).toLocaleString()}
        </p>
      )}
      <div className="mt-4 p-4 bg-gray-100 rounded">
        <h2 className="text-xl font-semibold mb-2">Description</h2>
        <p className="whitespace-pre-line">{issue.body}</p>
      </div>
    </div>
  );
}
