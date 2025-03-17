// app/api/pull-request-details/route.ts
import { NextResponse } from "next/server";
import axios from "axios";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../../lib/auth";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const vcs = searchParams.get("vcs") || "github";
  const owner = searchParams.get("owner");
  const repo = searchParams.get("repo");
  const prnumber = searchParams.get("prnumber");

  if (!owner || !repo || !prnumber) {
    return NextResponse.json(
      { error: "owner, repo, and prnumber are required" },
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
      // GitLab merge request changes endpoint
      apiUrl = `https://gitlab.com/api/v4/projects/${encodeURIComponent(
        `${owner}/${repo}`
      )}/merge_requests/${prnumber}/changes`;
      const response = await axios.get(apiUrl, { headers });
      // GitLab returns an object with a "changes" array
      const details = { files: response.data.changes };
      return NextResponse.json(details);
    } else {
      // GitHub pull request files endpoint
      apiUrl = `https://api.github.com/repos/${owner}/${repo}/pulls/${prnumber}/files`;
      headers.Accept = "application/vnd.github.v3+json";
      const response = await axios.get(apiUrl, { headers });
      // GitHub returns an array of file objects
      const details = { files: response.data };
      return NextResponse.json(details);
    }
  } catch (error: any) {
    console.error(error);
    return NextResponse.json(
      { error: "Error fetching pull request details" },
      { status: 500 }
    );
  }
}
