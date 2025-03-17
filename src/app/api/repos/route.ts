import { NextResponse } from "next/server";
import axios from "axios";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../../lib/auth";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  // vcs can be "github" or "gitlab"
  const vcs = searchParams.get("vcs") || "github";

  const session = await getServerSession(authOptions);
  const accessToken = session?.accessToken;
  if (!accessToken) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  try {
    let apiUrl = "";
    let headers: any = { Authorization: `Bearer ${accessToken}` };

    if (vcs === "gitlab") {
      apiUrl = "https://gitlab.com/api/v4/projects?membership=true";
    } else {
      apiUrl = "https://api.github.com/user/repos?per_page=100&page=1";
      headers.Accept = "application/vnd.github.v3+json";
    }

    const response = await axios.get(apiUrl, { headers });
    let repos = [];
    if (vcs === "gitlab") {
      repos = response.data.map((project: any) => ({
        id: project.id,
        name: project.name,
        owner: { login: project.namespace.path },
      }));
    } else {
      repos = response.data;
    }
    for (const repo of repos) {
      console.log(repo.name);
    }

    return NextResponse.json(repos);
  } catch (error: any) {
    console.error(error);
    return NextResponse.json(
      { error: "Error fetching repos" },
      { status: 500 }
    );
  }
}
