"use client";

import { useSession, signIn, signOut } from "next-auth/react";
import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { Loader2 } from "lucide-react";

interface Repo {
  id: string | number;
  name: string;
  owner: { login: string };
  description?: string;
  updated_at?: string;
}

export default function Home() {
  const { data: session, status } = useSession();
  const [vcs, setVcs] = useState("github");
  const [repos, setRepos] = useState<Repo[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchRepos = useCallback(async () => {
    if (!session?.accessToken) return;

    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/repos?vcs=${vcs}`);

      if (!res.ok) {
        throw new Error(`Failed to fetch repositories: ${res.status}`);
      }

      const data = await res.json();
      setRepos(data);
    } catch (error) {
      console.error("Error fetching repos", error);
      setError(
        error instanceof Error ? error.message : "Failed to load repositories"
      );
    } finally {
      setIsLoading(false);
    }
  }, [session, vcs]);

  useEffect(() => {
    if (session?.accessToken) {
      fetchRepos();
    }
  }, [session, vcs, fetchRepos]);

  if (status === "loading") {
    return (
      <div className="min-h-screen flex flex-col justify-center items-center bg-gray-50">
        <Loader2 className="h-12 w-12 animate-spin text-indigo-600 mb-4" />
        <p className="text-gray-600">Loading your profile...</p>
      </div>
    );
  }

  if (status === "unauthenticated") {
    return (
      <div className="min-h-screen flex flex-col justify-center items-center bg-gradient-to-br from-blue-400 via-pink-400 to-purple-500 text-white">
        <h1 className="text-4xl font-bold mb-8">
          Welcome to Git Branch Visualizer
        </h1>
        <p className="text-xl mb-8 max-w-md text-center">
          Sign in with your account to visualize repository branches
        </p>
        <button
          onClick={() => signIn()}
          className="bg-white text-indigo-600 px-6 py-3 rounded-full shadow-lg hover:bg-gray-100 transition font-medium"
        >
          Sign In
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 py-8">
      <div className="max-w-4xl mx-auto bg-white rounded-xl shadow-md p-8">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-6 gap-4">
          <h1 className="text-3xl font-bold text-gray-800">
            Welcome, {session?.user?.name}
          </h1>
          <button
            onClick={() => signOut()}
            className="bg-teal-500 text-white px-4 py-2 rounded hover:bg-teal-600 transition"
          >
            Sign Out
          </button>
        </div>

        <div className="mb-4">
          <label className="block text-gray-700 text-sm font-semibold mb-2">
            Select Version Control:
          </label>
          <select
            value={vcs}
            onChange={(e) => setVcs(e.target.value)}
            className="w-full border border-indigo-300 rounded-md p-2 focus:outline-none focus:ring-2 focus:ring-indigo-400"
            disabled={isLoading}
          >
            <option value="github">GitHub</option>
            <option value="gitlab">GitLab</option>
          </select>
        </div>

        <div className="flex justify-between items-center mt-6 mb-4">
          <h2 className="text-2xl font-semibold text-gray-700">
            Your Repositories ({vcs})
          </h2>
          <button
            onClick={fetchRepos}
            className="text-sm text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading...
              </>
            ) : (
              <>Refresh</>
            )}
          </button>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}

        {isLoading && repos.length === 0 ? (
          <div className="flex justify-center items-center h-40">
            <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
          </div>
        ) : repos.length > 0 ? (
          <ul className="space-y-3">
            {repos.map((repo) => (
              <li
                key={repo.id}
                className="p-4 border border-gray-200 rounded hover:bg-gray-50 transition"
              >
                <Link
                  href={`/repo/${vcs}/${repo.owner.login}/${repo.name}`}
                  className="text-indigo-600 font-medium hover:underline"
                >
                  {repo.name}
                </Link>
                {repo.description && (
                  <p className="text-gray-600 text-sm mt-1">
                    {repo.description}
                  </p>
                )}
                {repo.updated_at && (
                  <p className="text-gray-500 text-xs mt-2">
                    Last updated:{" "}
                    {new Date(repo.updated_at).toLocaleDateString()}
                  </p>
                )}
              </li>
            ))}
          </ul>
        ) : (
          <div className="bg-gray-50 rounded-lg p-8 text-center">
            <p className="text-gray-600">No repositories found.</p>
            <p className="text-gray-500 text-sm mt-2">
              Repositories from your {vcs} account will appear here once you
              have access.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
