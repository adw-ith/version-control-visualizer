// app/page.tsx
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
      <div style={{ padding: "2rem" }}>
        <h1>Please sign in with GitHub</h1>
        <button onClick={() => signIn("github")}>Sign In</button>
      </div>
    );
  }

  return (
    <div style={{ padding: "2rem" }}>
      <h1>Welcome, {session.user?.name}</h1>
      <button onClick={() => signOut()}>Sign Out</button>
      <h2>Your Repositories</h2>
      <ul>
        {repos.map((repo) => (
          <li key={repo.id}>
            <a href={`/repo/${repo.owner.login}/${repo.name}`}>{repo.name}</a>
          </li>
        ))}
      </ul>
    </div>
  );
}
