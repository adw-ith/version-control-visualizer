// app/api/commits/route.ts
import { NextResponse } from "next/server";
import axios from "axios";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../../lib/auth";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const vcs = searchParams.get("vcs") || "github";
  const owner = searchParams.get("owner");
  const repo = searchParams.get("repo");

  if (!owner || !repo) {
    return NextResponse.json(
      { error: "owner and repo are required" },
      { status: 400 }
    );
  }

  const session = await getServerSession(authOptions);
  const accessToken = session?.accessToken;
  if (!accessToken) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  try {
    let apiUrl = "";
    let headers: any = { Authorization: `Bearer ${accessToken}` };

    if (vcs === "gitlab") {
      apiUrl = `https://gitlab.com/api/v4/projects/${encodeURIComponent(
        `${owner}/${repo}`
      )}/repository/commits`;
    } else {
      apiUrl = `https://api.github.com/repos/${owner}/${repo}/commits`;
      headers.Accept = "application/vnd.github.v3+json";
    }

    const response = await axios.get(apiUrl, { headers });
    let commits = response.data;

    // For GitHub, fetch additional stats for each commit
    if (vcs === "github" && commits.length > 0) {
      const commitsWithStats = await Promise.all(
        commits.slice(0, 20).map(async (commit: any) => {
          try {
            const detailsUrl = commit.url;
            const detailsResponse = await axios.get(detailsUrl, { headers });

            return {
              sha: commit.sha,
              message: commit.commit.message,
              author: commit.commit.author.name,
              date: commit.commit.author.date,
              additions: detailsResponse.data.stats?.additions,
              deletions: detailsResponse.data.stats?.deletions,
              files_changed: detailsResponse.data.files?.length,
            };
          } catch (error) {
            console.error(
              `Error fetching details for commit ${commit.sha}:`,
              error
            );
            return {
              sha: commit.sha,
              message: commit.commit.message,
              author: commit.commit.author.name,
              date: commit.commit.author.date,
            };
          }
        })
      );
      commits = commitsWithStats;
    } else if (vcs === "gitlab") {
      commits = commits.map((commit: any) => ({
        sha: commit.id,
        message: commit.message,
        author: commit.author_name,
        date: commit.created_at,
      }));
    }

    return NextResponse.json(commits);
  } catch (error: any) {
    console.error(error);
    return NextResponse.json(
      { error: "Error fetching commits" },
      { status: 500 }
    );
  }
}
