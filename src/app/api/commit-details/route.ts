// app/api/commit-details/route.ts
import { NextResponse } from "next/server";
import axios from "axios";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../../lib/auth";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const vcs = searchParams.get("vcs") || "github";
  const owner = searchParams.get("owner");
  const repo = searchParams.get("repo");
  const commitSha = searchParams.get("sha");

  if (!owner || !repo || !commitSha) {
    return NextResponse.json(
      { error: "owner, repo, and commit sha are required" },
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
      )}/repository/commits/${commitSha}/diff`;
    } else {
      apiUrl = `https://api.github.com/repos/${owner}/${repo}/commits/${commitSha}`;
      headers.Accept = "application/vnd.github.v3+json";
    }

    const response = await axios.get(apiUrl, { headers });
    let details;
    if (vcs === "gitlab") {
      details = { files: response.data }; // GitLab returns diff objects
    } else {
      details = { files: response.data.files }; // GitHub returns a files array in commit details
    }

    return NextResponse.json(details);
  } catch (error: any) {
    console.error(error);
    return NextResponse.json(
      { error: "Error fetching commit details" },
      { status: 500 }
    );
  }
}
