// app/api/timeline/route.ts
import { NextRequest, NextResponse } from "next/server";
import { Octokit } from "@octokit/rest";

// Define interfaces for our data structures
interface TimelineEvent {
  id: string;
  type: string;
  title: string;
  description: string;
  author: string;
  date: string;
  additions?: number;
  deletions?: number;
}

interface CommitEvent extends TimelineEvent {
  type: "commit";
  sha: string;
}

interface PullRequestEvent extends TimelineEvent {
  type: "pull_request" | "merge";
  prNumber: number;
}

// Initialize Octokit with your GitHub token
const octokit = new Octokit({
  auth: process.env.GITHUB_TOKEN,
});

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const vcs = searchParams.get("vcs");
  const owner = searchParams.get("owner");
  const repo = searchParams.get("repo");
  const filter = searchParams.get("filter") || "all";
  const timeRange = searchParams.get("timeRange") || "month";

  if (!vcs || !owner || !repo) {
    return NextResponse.json(
      { error: "Missing required parameters" },
      { status: 400 }
    );
  }

  // Only support GitHub for now
  if (vcs.toLowerCase() !== "github") {
    return NextResponse.json(
      { error: "Only GitHub is supported" },
      { status: 400 }
    );
  }

  try {
    // Calculate date range
    const endDate = new Date();
    let startDate = new Date();

    switch (timeRange) {
      case "week":
        startDate.setDate(startDate.getDate() - 7);
        break;
      case "month":
        startDate.setMonth(startDate.getMonth() - 1);
        break;
      case "year":
        startDate.setFullYear(startDate.getFullYear() - 1);
        break;
      case "all":
      default:
        // For "all", we'll just go back 5 years as a reasonable limit
        startDate.setFullYear(startDate.getFullYear() - 5);
    }

    // Format dates for GitHub API
    const since = startDate.toISOString();
    const until = endDate.toISOString();

    let events: Array<TimelineEvent> = [];

    // Fetch commits
    if (filter === "all" || filter === "commits") {
      const commitsResponse = await octokit.repos.listCommits({
        owner,
        repo,
        since,
        until,
        per_page: 100,
      });

      const commits: Array<CommitEvent> = commitsResponse.data.map(
        (commit: any) => ({
          id: commit.sha,
          type: "commit" as const,
          title: commit.commit.message.split("\n")[0],
          description:
            commit.commit.message.split("\n").slice(1).join("\n") ||
            "No description provided",
          author:
            commit.commit.author?.name || commit.author?.login || "Unknown",
          date: commit.commit.author?.date || new Date().toISOString(),
          sha: commit.sha,
          additions: commit.stats?.additions,
          deletions: commit.stats?.deletions,
        })
      );

      events = [...events, ...commits];
    }

    // Fetch pull requests
    if (filter === "all" || filter === "pull_requests" || filter === "merges") {
      const prsResponse = await octokit.pulls.list({
        owner,
        repo,
        state: "all",
        per_page: 100,
      });

      // Filter PRs by date
      const prs: Array<PullRequestEvent | null> = prsResponse.data
        .filter((pr: any) => {
          const prDate = new Date(pr.created_at);
          return prDate >= startDate && prDate <= endDate;
        })
        .map((pr: any) => {
          const isMerged = pr.merged_at !== null;
          // Skip if it's a merge and we're not looking for merges, or if it's a PR and we're not looking for PRs
          if (
            (isMerged && filter === "pull_requests") ||
            (!isMerged && filter === "merges")
          ) {
            return null;
          }

          return {
            id: `pr-${pr.number}`,
            type: isMerged ? ("merge" as const) : ("pull_request" as const),
            title: pr.title,
            description:
              pr.body?.substring(0, 150) +
                (pr.body && pr.body.length > 150 ? "..." : "") ||
              "No description provided",
            author: pr.user?.login || "Unknown",
            date: isMerged ? pr.merged_at : pr.created_at,
            prNumber: pr.number,
            additions: pr.additions,
            deletions: pr.deletions,
          };
        });

      // Filter out null entries and add to events
      events = [
        ...events,
        ...prs.filter((pr): pr is PullRequestEvent => pr !== null),
      ];
    }

    // Sort all events by date (newest first)
    events.sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );

    return NextResponse.json(events);
  } catch (error) {
    console.error("Error fetching timeline data:", error);
    return NextResponse.json(
      { error: "Failed to fetch timeline data" },
      { status: 500 }
    );
  }
}
