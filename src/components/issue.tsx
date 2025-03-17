"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";

interface Issue {
  id: number;
  number: number;
  title: string;
  state: string;
  created_at?: string;
  updated_at?: string;
}

export default function IssuesListPage() {
  const params = useParams() as { vcs: string; owner: string; repo: string };
  const { vcs, owner, repo } = params;
  const [issues, setIssues] = useState<Issue[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchIssues();
  }, [vcs, owner, repo]);

  const fetchIssues = async () => {
    try {
      const res = await fetch(
        `/api/issues-list?vcs=${vcs}&owner=${owner}&repo=${repo}`
      );
      if (!res.ok) {
        throw new Error("Failed to fetch issues");
      }
      const data = await res.json();
      setIssues(data.issues);
    } catch (err: any) {
      console.error(err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading)
    return (
      <div className="text-center text-lg font-semibold">Loading issues...</div>
    );
  if (error)
    return <div className="text-center text-red-500">Error: {error}</div>;
  if (!issues.length)
    return <div className="text-center text-gray-500">No issues found.</div>;

  return (
    <div className="max-w-4xl mx-auto p-6 bg-white text-gray-900 border border-gray-300 rounded-lg">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">
          Issues for {owner}/{repo}
        </h1>
        <Link
          href={`/repo/${vcs}/${owner}/${repo}/issues`}
          className="bg-blue-500 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-600 transition"
        >
          View Dashboard
        </Link>
      </div>
      <ul className="divide-y divide-gray-200">
        {issues.map((issue) => (
          <li key={issue.id} className="py-4 flex justify-between items-center">
            <div>
              <Link
                href={`/repo/${vcs}/${owner}/${repo}/issues/${issue.number}`}
                className="text-blue-600 font-medium hover:underline"
              >
                #{issue.number} - {issue.title}{" "}
                <span className="text-sm text-gray-600">[{issue.state}]</span>
              </Link>
            </div>
            <Link
              href={`/repo/${vcs}/${owner}/${repo}/issues/${issue.number}`}
              className="bg-blue-500 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-600 transition"
            >
              View Details
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
