"use client";

import { useEffect, useState, useRef } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import BranchMergeDiagram from "@/components/branch";
import RepoTimeline from "@/components/timeline";
import IssuesListPage from "@/components/issue";
import IssueDashboard from "@/components/issuedash";

interface Commit {
  sha: string;
  message: string;
  author: string;
  date: string;
  additions?: number;
  deletions?: number;
  files_changed?: number;
}

interface Contributor {
  login?: string;
  name?: string;
  contributions?: number;
}

interface Stat {
  date: string;
  count: number;
}

interface Branch {
  name: string;
  parent?: string;
}

interface CodeChurn {
  date: string;
  additions: number;
  deletions: number;
}

interface PullRequest {
  number: number;
  title: string;
  state: string;
  created_at: string;
  closed_at?: string;
  user: {
    login: string;
  };
  additions?: number;
  deletions?: number;
  changed_files?: number;
}

export default function RepoPage() {
  const params = useParams() as { vcs: string; owner: string; repo: string };
  const { vcs, owner, repo } = params;
  const [commits, setCommits] = useState<Commit[]>([]);
  const [stats, setStats] = useState<Stat[]>([]);
  const [contributors, setContributors] = useState<Contributor[]>([]);
  const [contributorStats, setContributorStats] = useState<
    { name: string; count: number }[]
  >([]);
  const [codeChurn, setCodeChurn] = useState<CodeChurn[]>([]);
  const [averageCommitSize, setAverageCommitSize] = useState({
    additions: 0,
    deletions: 0,
    files: 0,
  });
  const [pullRequests, setPullRequests] = useState<PullRequest[]>([]);
  const [prStats, setPrStats] = useState({
    open: 0,
    closed: 0,
    merged: 0,
    avgLifetime: 0,
  });

  useEffect(() => {
    fetchCommits();
    fetchContributors();
    fetchPullRequests();
  }, [vcs, owner, repo]);

  const fetchCommits = async () => {
    try {
      const res = await fetch(
        `/api/commits?vcs=${vcs}&owner=${owner}&repo=${repo}`
      );
      const data = await res.json();
      setCommits(data);
      computeStats(data);
      computeCodeChurn(data);
      computeAverageCommitSize(data);
    } catch (error) {
      console.error("Error fetching commits:", error);
    }
  };

  const fetchPullRequests = async () => {
    try {
      const res = await fetch(
        `/api/pull-requests?vcs=${vcs}&owner=${owner}&repo=${repo}`
      );
      const data = await res.json();
      setPullRequests(data);
      computePRStats(data);
    } catch (error) {
      console.error("Error fetching pull requests:", error);
    }
  };

  const [branches, setBranches] = useState<Branch[]>([]);

  useEffect(() => {
    // Fetch branch data from your API endpoint
    const fetchBranches = async () => {
      try {
        const res = await fetch(
          `/api/branches?vcs=${vcs}&owner=${owner}&repo=${repo}`
        );
        const data = await res.json();
        setBranches(data);
      } catch (error) {
        console.error("Error fetching branches:", error);
      }
    };

    fetchBranches();
  }, []);

  const computeStats = (commits: Commit[]) => {
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

  const computeCodeChurn = (commits: Commit[]) => {
    const churnMap: {
      [key: string]: { additions: number; deletions: number };
    } = {};

    commits.forEach((commit) => {
      if (commit.additions !== undefined && commit.deletions !== undefined) {
        const date = new Date(commit.date).toISOString().split("T")[0];
        if (!churnMap[date]) {
          churnMap[date] = { additions: 0, deletions: 0 };
        }
        churnMap[date].additions += commit.additions;
        churnMap[date].deletions += commit.deletions;
      }
    });

    const churnArray = Object.keys(churnMap)
      .map((date) => ({
        date,
        additions: churnMap[date].additions,
        deletions: churnMap[date].deletions,
      }))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    setCodeChurn(churnArray);
  };

  const computeAverageCommitSize = (commits: Commit[]) => {
    const validCommits = commits.filter(
      (c) =>
        c.additions !== undefined &&
        c.deletions !== undefined &&
        c.files_changed !== undefined
    );

    if (validCommits.length === 0) return;

    const totalAdditions = validCommits.reduce(
      (sum, commit) => sum + (commit.additions || 0),
      0
    );
    const totalDeletions = validCommits.reduce(
      (sum, commit) => sum + (commit.deletions || 0),
      0
    );
    const totalFiles = validCommits.reduce(
      (sum, commit) => sum + (commit.files_changed || 0),
      0
    );

    setAverageCommitSize({
      additions: Math.round(totalAdditions / validCommits.length),
      deletions: Math.round(totalDeletions / validCommits.length),
      files: Math.round(totalFiles / validCommits.length),
    });
  };

  const computePRStats = (prs: PullRequest[]) => {
    const open = prs.filter((pr) => pr.state === "open").length;
    const closed = prs.filter((pr) => pr.state === "closed").length;
    const merged = prs.filter((pr) => pr.state === "merged").length;

    // Calculate average PR lifetime (in days) for closed PRs
    let totalDays = 0;
    let closedCount = 0;

    prs.forEach((pr) => {
      if (pr.closed_at && pr.created_at) {
        const createdDate = new Date(pr.created_at);
        const closedDate = new Date(pr.closed_at);
        const daysDiff =
          (closedDate.getTime() - createdDate.getTime()) /
          (1000 * 60 * 60 * 24);
        totalDays += daysDiff;
        closedCount++;
      }
    });

    const avgLifetime =
      closedCount > 0 ? Math.round((totalDays / closedCount) * 10) / 10 : 0;

    setPrStats({ open, closed, merged, avgLifetime });
  };

  const fetchContributors = async () => {
    try {
      const res = await fetch(
        `/api/contributors?vcs=${vcs}&owner=${owner}&repo=${repo}`
      );
      const data = await res.json();
      setContributors(data);
      computeContributorStats(data);
    } catch (error) {
      console.error("Error fetching contributors:", error);
    }
  };

  const computeContributorStats = (contributors: Contributor[]) => {
    const statsArray = contributors.map((contrib) => ({
      name: contrib.login || contrib.name || "Unknown",
      count: contrib.contributions || 0,
    }));
    setContributorStats(statsArray);
  };

  // Colors for pie chart
  const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042"];

  const prStateData = [
    { name: "Open", value: prStats.open },
    { name: "Closed", value: prStats.closed },
    { name: "Merged", value: prStats.merged },
  ].filter((item) => item.value > 0);

  return (
    <div className="p-6 flex flex-col md:flex-row gap-6">
      {/* Main content */}
      <div className="flex-1 space-y-6">
        <h1 className="text-2xl font-bold">
          Repository: {owner}/{repo} ({vcs})
        </h1>

        {/* Metrics Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white p-4 rounded-lg shadow">
            <h3 className="text-lg font-semibold">Total Commits</h3>
            <p className="text-2xl font-bold">{commits.length}</p>
          </div>
          <div className="bg-white p-4 rounded-lg shadow">
            <h3 className="text-lg font-semibold">Contributors</h3>
            <p className="text-2xl font-bold">{contributors.length}</p>
          </div>
          <div className="bg-white p-4 rounded-lg shadow">
            <h3 className="text-lg font-semibold">Pull Requests</h3>
            <p className="text-2xl font-bold">{pullRequests.length}</p>
          </div>
          <div className="bg-white p-4 rounded-lg shadow">
            <h3 className="text-lg font-semibold">Avg PR Lifetime</h3>
            <p className="text-2xl font-bold">{prStats.avgLifetime} days</p>
          </div>
        </div>

        {/* Commit Activity Graph (Line Chart) */}
        <div className="bg-white p-4 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-2">Commit Activity</h2>
          {stats.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={stats}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Line type="monotone" dataKey="count" stroke="#8884d8" />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <p>No commit data available.</p>
          )}
        </div>

        {/* Code Churn Graph */}
        <div className="bg-white p-4 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-2">Code Churn</h2>
          {codeChurn.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={codeChurn}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="additions"
                  stroke="#82ca9d"
                  name="Lines Added"
                />
                <Line
                  type="monotone"
                  dataKey="deletions"
                  stroke="#ff7300"
                  name="Lines Removed"
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <p>No code churn data available.</p>
          )}
        </div>

        {/* Average Commit Size */}
        <div className="bg-white p-4 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-2">Average Commit Size</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <p className="text-sm text-gray-600">Lines Added</p>
              <p className="text-3xl font-bold text-green-600">
                +{averageCommitSize.additions}
              </p>
            </div>
            <div className="text-center p-4 bg-red-50 rounded-lg">
              <p className="text-sm text-gray-600">Lines Removed</p>
              <p className="text-3xl font-bold text-red-600">
                -{averageCommitSize.deletions}
              </p>
            </div>
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <p className="text-sm text-gray-600">Files Changed</p>
              <p className="text-3xl font-bold text-blue-600">
                {averageCommitSize.files}
              </p>
            </div>
          </div>
        </div>

        {/* Pull Request Statistics */}
        <div className="bg-white p-4 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-2">
            Pull Request Statistics
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              {prStateData.length > 0 ? (
                <ResponsiveContainer width="100%" height={250}>
                  <PieChart>
                    <Pie
                      data={prStateData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) =>
                        `${name}: ${(percent * 100).toFixed(0)}%`
                      }
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {prStateData.map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={COLORS[index % COLORS.length]}
                        />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <p>No pull request data available.</p>
              )}
            </div>
            <div className="flex flex-col justify-center">
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center p-2 bg-blue-50 rounded-lg">
                  <p className="text-sm text-gray-600">Open</p>
                  <p className="text-2xl font-bold text-blue-600">
                    {prStats.open}
                  </p>
                </div>
                <div className="text-center p-2 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-600">Closed</p>
                  <p className="text-2xl font-bold text-gray-600">
                    {prStats.closed}
                  </p>
                </div>
                <div className="text-center p-2 bg-purple-50 rounded-lg">
                  <p className="text-sm text-gray-600">Merged</p>
                  <p className="text-2xl font-bold text-purple-600">
                    {prStats.merged}
                  </p>
                </div>
                <div className="text-center p-2 bg-green-50 rounded-lg">
                  <p className="text-sm text-gray-600">Avg Lifetime</p>
                  <p className="text-2xl font-bold text-green-600">
                    {prStats.avgLifetime}d
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
        <IssuesListPage />

        {/* Recent Pull Requests */}
        <div className="bg-white p-4 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-2">Recent Pull Requests</h2>
          <div className="grid gap-4">
            {pullRequests.slice(0, 10).map((pr) => (
              <Link
                key={pr.number}
                href={`/repo/${vcs}/${owner}/${repo}/pull/${pr.number}`}
                className="block p-4 border rounded-lg hover:shadow-lg transition"
              >
                <div className="flex items-center gap-2">
                  <span
                    className={`inline-block w-3 h-3 rounded-full ${
                      pr.state === "open"
                        ? "bg-blue-500"
                        : pr.state === "merged"
                        ? "bg-purple-500"
                        : "bg-gray-500"
                    }`}
                  ></span>
                  <h3 className="text-lg font-semibold">
                    #{pr.number} {pr.title}
                  </h3>
                </div>
                <p className="text-sm text-gray-600">
                  <strong>Author:</strong> {pr.user.login}
                </p>
                <p className="text-sm text-gray-600">
                  <strong>Created:</strong>{" "}
                  {new Date(pr.created_at).toLocaleString()}
                </p>
                {pr.closed_at && (
                  <p className="text-sm text-gray-600">
                    <strong>Closed:</strong>{" "}
                    {new Date(pr.closed_at).toLocaleString()}
                  </p>
                )}
                {pr.additions !== undefined && pr.deletions !== undefined && (
                  <p className="text-xs text-gray-500">
                    <span className="text-green-600">+{pr.additions}</span> /
                    <span className="text-red-600">-{pr.deletions}</span> in
                    <span className="ml-1">{pr.changed_files} files</span>
                  </p>
                )}
              </Link>
            ))}
            {pullRequests.length > 10 && (
              <div className="text-center">
                <Link
                  href={`/repo/${vcs}/${owner}/${repo}/pulls`}
                  className="text-blue-500 hover:underline"
                >
                  View all {pullRequests.length} pull requests
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* Detailed Commits List */}
        <div className="bg-white p-4 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-2">Recent Commits</h2>
          <div className="grid gap-4">
            {commits.slice(0, 30).map((commit) => (
              <Link
                key={commit.sha}
                href={`/repo/${vcs}/${owner}/${repo}/commit/${commit.sha}`}
                className="block p-4 border rounded-lg hover:shadow-lg transition"
              >
                <h3 className="text-lg font-semibold mb-1">{commit.message}</h3>
                <p className="text-sm text-gray-600">
                  <strong>Author:</strong> {commit.author}
                </p>
                <p className="text-sm text-gray-600">
                  <strong>Date:</strong>{" "}
                  {new Date(commit.date).toLocaleString()}
                </p>
                <div className="flex gap-4 mt-1">
                  <p className="text-xs text-gray-500">
                    <strong>Commit ID:</strong> {commit.sha.substring(0, 7)}
                  </p>
                  {commit.additions !== undefined &&
                    commit.deletions !== undefined && (
                      <p className="text-xs text-gray-500">
                        <span className="text-green-600">
                          +{commit.additions}
                        </span>{" "}
                        /
                        <span className="text-red-600">
                          -{commit.deletions}
                        </span>
                        {commit.files_changed !== undefined && (
                          <span className="ml-1">
                            in {commit.files_changed} files
                          </span>
                        )}
                      </p>
                    )}
                </div>
              </Link>
            ))}
            {commits.length > 30 && (
              <div className="text-center">
                <Link
                  href={`/repo/${vcs}/${owner}/${repo}/commits`}
                  className="text-blue-500 hover:underline"
                >
                  View all {commits.length} commits
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Sidebar */}
      <div className="w-full md:w-1/3 space-y-6">
        {/* Contributors List */}
        <div className="bg-white p-4 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-2">Contributors</h2>
          <ul className="space-y-2">
            {contributors.map((contrib, index) => (
              <li key={index} className="border-b pb-2">
                {contrib.login || contrib.name}{" "}
                {contrib.contributions ? `- ${contrib.contributions}` : ""}
              </li>
            ))}
          </ul>
        </div>
        {/* Contributors Graph (Bar Chart) */}
        <div className="bg-white p-4 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-2">Contributions</h2>
          {contributorStats.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={contributorStats}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="name"
                  tick={{ fontSize: 10 }}
                  angle={-45}
                  textAnchor="end"
                  interval={0}
                />
                <YAxis />
                <Tooltip />
                <Bar dataKey="count" fill="#82ca9d" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p>No contributor data available.</p>
          )}
        </div>
        {/* Branch & Merge Diagram */}
        {branches.length > 0 && (
          <div className="bg-white p-4 rounded-lg shadow">
            <h2 className="text-xl font-semibold mb-2">Branches</h2>
            <BranchMergeDiagram branches={branches} />
          </div>
        )}
        <RepoTimeline />
      </div>
    </div>
  );
}
