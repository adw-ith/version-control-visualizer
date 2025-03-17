// app/api/issue-details/route.ts
import { NextResponse } from "next/server";
import axios from "axios";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../../lib/auth";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const vcs = searchParams.get("vcs") || "github";
  const owner = searchParams.get("owner");
  const repo = searchParams.get("repo");
  const issueNumber = searchParams.get("issueNumber");

  if (!owner || !repo || !issueNumber) {
    return NextResponse.json(
      { error: "owner, repo, and issueNumber are required" },
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
      // GitLab issue details endpoint:
      apiUrl = `https://gitlab.com/api/v4/projects/${encodeURIComponent(
        `${owner}/${repo}`
      )}/issues/${issueNumber}`;
      const response = await axios.get(apiUrl, { headers });
      // GitLab returns the issue details directly.
      return NextResponse.json(response.data);
    } else {
      // GitHub issue details endpoint:
      apiUrl = `https://api.github.com/repos/${owner}/${repo}/issues/${issueNumber}`;
      headers.Accept = "application/vnd.github.v3+json";
      const response = await axios.get(apiUrl, { headers });
      return NextResponse.json(response.data);
    }
  } catch (error: any) {
    console.error(error);
    return NextResponse.json(
      { error: "Error fetching issue details" },
      { status: 500 }
    );
  }
}
