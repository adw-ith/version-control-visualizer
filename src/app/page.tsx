"use client";

import { useSession, signIn, signOut } from "next-auth/react";
import { useEffect, useState } from "react";

interface Repo {
  id: number;
  name: string;
  owner: {
    login: string;
  };
}

export default function Home() {
  const { data: session } = useSession();
  const [repos, setRepos] = useState<Repo[]>([]);

  useEffect(() => {
    if (session?.accessToken) {
      fetchRepos(session.accessToken);
    }
  }, [session]);

  const fetchRepos = async (accessToken: string) => {
    try {
      const res = await fetch("https://api.github.com/user/repos", {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });
      const data = await res.json();
      setRepos(data);
    } catch (error) {
      console.error("Error fetching repos:", error);
    }
  };

  if (!session) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 text-center">
        <h1 className="text-2xl font-bold mb-4">Please sign in with GitHub</h1>
        <button
          onClick={() => signIn("github")}
          className="px-4 py-2 bg-blue-500 text-white rounded-lg shadow-md hover:bg-blue-600 transition"
        >
          Sign In
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <div className="max-w-3xl mx-auto bg-white p-6 rounded-lg shadow-md">
        <h1 className="text-3xl font-semibold mb-4">
          Welcome, {session.user?.name}
        </h1>
        <button
          onClick={() => signOut()}
          className="px-4 py-2 bg-red-500 text-white rounded-lg shadow-md hover:bg-red-600 transition mb-4"
        >
          Sign Out
        </button>
        <h2 className="text-xl font-semibold mb-2">Your Repositories</h2>
        <ul className="space-y-2">
          {repos.map((repo) => (
            <li key={repo.id} className="bg-gray-200 p-3 rounded-lg shadow">
              <a
                href={`/repo/${repo.owner.login}/${repo.name}`}
                className="text-blue-600 hover:underline"
              >
                {repo.name}
              </a>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
