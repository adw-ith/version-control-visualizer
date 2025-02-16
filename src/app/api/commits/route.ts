// app/api/commits/route.ts
import { NextResponse } from "next/server";
import axios from "axios";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../../lib/auth";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const owner = searchParams.get("owner");
  const repo = searchParams.get("repo");

  if (!owner || !repo) {
    return NextResponse.json(
      { error: "owner and repo query parameters are required" },
      { status: 400 }
    );
  }

  // Retrieve the user session to use their GitHub access token
  const session = await getServerSession(authOptions);
  const accessToken = session?.accessToken || process.env.GITHUB_TOKEN;

  try {
    const response = await axios.get(
      `https://api.github.com/repos/${owner}/${repo}/commits`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: "application/vnd.github.v3+json",
        },
      }
    );

    const commits = response.data.map((commit: any) => ({
      sha: commit.sha,
      message: commit.commit.message,
      author: commit.commit.author.name,
      date: commit.commit.author.date,
    }));

    return NextResponse.json(commits);
  } catch (error: any) {
    console.error(error);
    return NextResponse.json(
      { error: "Error fetching commits" },
      { status: 500 }
    );
  }
}
