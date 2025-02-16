// app/repo/[owner]/[repo]/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

interface Commit {
  sha: string;
  message: string;
  author: string;
  date: string;
}

interface Stat {
  date: string;
  count: number;
}

export default function RepoPage() {
  const params = useParams() as { owner: string; repo: string };
  const { owner, repo } = params;

  const [commits, setCommits] = useState<Commit[]>([]);
  const [stats, setStats] = useState<Stat[]>([]);

  useEffect(() => {
    if (owner && repo) {
      fetchCommits();
    }
  }, [owner, repo]);

  const fetchCommits = async () => {
    try {
      const res = await fetch(`/api/commits?owner=${owner}&repo=${repo}`);
      const data = await res.json();
      setCommits(data);
      computeStats(data);
    } catch (error) {
      console.error("Error fetching commits:", error);
    }
  };

  const computeStats = (commits: Commit[]) => {
    // Group commits by date (YYYY-MM-DD)
    const statsMap: { [key: string]: number } = {};
    commits.forEach((commit) => {
      const date = new Date(commit.date).toISOString().split("T")[0];
      statsMap[date] = (statsMap[date] || 0) + 1;
    });
    const statsArray = Object.keys(statsMap)
      .map((date) => ({ date, count: statsMap[date] }))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    setStats(statsArray);
  };

  return (
    <div style={{ padding: "2rem" }}>
      <h1>
        Repository: {owner}/{repo}
      </h1>
      <h2>Commit Statistics</h2>
      {stats.length > 0 ? (
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={stats}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" />
            <YAxis />
            <Tooltip />
            <Bar dataKey="count" fill="#8884d8" />
          </BarChart>
        </ResponsiveContainer>
      ) : (
        <p>No commit statistics available.</p>
      )}
      <h2>Commit History</h2>
      {commits.length > 0 ? (
        <ul>
          {commits.map((commit) => (
            <li key={commit.sha}>
              <strong>{commit.author}</strong>: {commit.message} (
              {new Date(commit.date).toLocaleString()})
            </li>
          ))}
        </ul>
      ) : (
        <p>No commits found.</p>
      )}
    </div>
  );
}
