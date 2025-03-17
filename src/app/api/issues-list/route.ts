// app/api/issues-list/route.ts
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
      // GitLab issues endpoint:
      apiUrl = `https://gitlab.com/api/v4/projects/${encodeURIComponent(
        `${owner}/${repo}`
      )}/issues`;
      const response = await axios.get(apiUrl, { headers });
      // GitLab returns an array of issues directly.
      return NextResponse.json({ issues: response.data });
    } else {
      // GitHub issues endpoint:
      apiUrl = `https://api.github.com/repos/${owner}/${repo}/issues`;
      headers.Accept = "application/vnd.github.v3+json";
      const response = await axios.get(apiUrl, { headers });
      // GitHub returns an array of issues directly.
      return NextResponse.json({ issues: response.data });
    }
  } catch (error: any) {
    console.error(error);
    return NextResponse.json(
      { error: "Error fetching issues" },
      { status: 500 }
    );
  }
}
