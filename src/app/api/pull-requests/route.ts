// app/api/pull-requests/route.ts
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
      )}/merge_requests?state=all`;
    } else {
      apiUrl = `https://api.github.com/repos/${owner}/${repo}/pulls?state=all`;
      headers.Accept = "application/vnd.github.v3+json";
    }

    const response = await axios.get(apiUrl, { headers });
    let pullRequests = response.data;

    // For GitHub, fetch additional stats for each PR
    if (vcs === "github" && pullRequests.length > 0) {
      const prWithStats = await Promise.all(
        pullRequests.slice(0, 10).map(async (pr: any) => {
          try {
            const detailsUrl = pr.url;
            const detailsResponse = await axios.get(detailsUrl, { headers });
            return {
              ...pr,
              additions: detailsResponse.data.additions,
              deletions: detailsResponse.data.deletions,
              changed_files: detailsResponse.data.changed_files,
            };
          } catch (error) {
            console.error(
              `Error fetching details for PR #${pr.number}:`,
              error
            );
            return pr;
          }
        })
      );
      pullRequests = prWithStats;
    }

    return NextResponse.json(pullRequests);
  } catch (error: any) {
    console.error(error);
    return NextResponse.json(
      { error: "Error fetching pull requests" },
      { status: 500 }
    );
  }
}
