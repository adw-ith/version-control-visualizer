"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";

interface TimelineEvent {
  id: string;
  type: "commit" | "pull_request" | "merge";
  title: string;
  description: string;
  author: string;
  date: string;
  sha?: string;
  prNumber?: number;
  additions?: number;
  deletions?: number;
}

export default function RepoTimeline() {
  const params = useParams() as { vcs: string; owner: string; repo: string };
  const { vcs, owner, repo } = params;
  const [events, setEvents] = useState<TimelineEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<
    "all" | "commits" | "pull_requests" | "merges"
  >("all");
  const [timeRange, setTimeRange] = useState<"week" | "month" | "year" | "all">(
    "month"
  );

  useEffect(() => {
    fetchTimelineEvents();
  }, [vcs, owner, repo, filter, timeRange]);

  const fetchTimelineEvents = async () => {
    setLoading(true);
    try {
      const res = await fetch(
        `/api/timeline?vcs=${vcs}&owner=${owner}&repo=${repo}&filter=${filter}&timeRange=${timeRange}`
      );
      const data = await res.json();
      setEvents(data);
    } catch (error) {
      console.error("Error fetching timeline events:", error);
    } finally {
      setLoading(false);
    }
  };

  const getEventIcon = (type: string) => {
    switch (type) {
      case "commit":
        return (
          <div className="p-2 rounded-full bg-blue-100 text-blue-700">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="12" cy="12" r="4" />
              <path d="M16 12h6" />
              <path d="M2 12h6" />
            </svg>
          </div>
        );
      case "pull_request":
        return (
          <div className="p-2 rounded-full bg-purple-100 text-purple-700">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="18" cy="18" r="3" />
              <circle cx="6" cy="6" r="3" />
              <path d="M13 6h3a2 2 0 0 1 2 2v7" />
              <path d="M6 9v12" />
            </svg>
          </div>
        );
      case "merge":
        return (
          <div className="p-2 rounded-full bg-green-100 text-green-700">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="18" cy="6" r="3" />
              <circle cx="6" cy="18" r="3" />
              <path d="M6 15V6a9 9 0 0 0 9 9" />
            </svg>
          </div>
        );
      default:
        return null;
    }
  };

  const getEventLink = (event: TimelineEvent) => {
    switch (event.type) {
      case "commit":
        return `/repo/${vcs}/${owner}/${repo}/commit/${event.sha}`;
      case "pull_request":
      case "merge":
        return `/repo/${vcs}/${owner}/${repo}/pull/${event.prNumber}`;
      default:
        return "#";
    }
  };

  return (
    <div className="bg-white p-4 rounded-lg shadow">
      <h2 className="text-xl font-semibold mb-4">Repository Timeline</h2>

      {/* Filter controls */}
      <div className="flex flex-wrap gap-2 mb-4">
        <div className="mr-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Event Type
          </label>
          <select
            className="border rounded-md px-3 py-1"
            value={filter}
            onChange={(e) => setFilter(e.target.value as any)}
          >
            <option value="all">All Events</option>
            <option value="commits">Commits</option>
            <option value="pull_requests">Pull Requests</option>
            <option value="merges">Merges</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Time Range
          </label>
          <select
            className="border rounded-md px-3 py-1"
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value as any)}
          >
            <option value="week">Past Week</option>
            <option value="month">Past Month</option>
            <option value="year">Past Year</option>
            <option value="all">All Time</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center p-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
        </div>
      ) : events.length === 0 ? (
        <div className="text-center p-8 text-gray-500">
          No events found for the selected filters.
        </div>
      ) : (
        <div className="relative">
          {/* Vertical line */}
          <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gray-200"></div>

          {/* Timeline events */}
          <div className="space-y-6">
            {events.map((event) => (
              <div key={event.id} className="flex gap-4">
                <div className="relative z-10">{getEventIcon(event.type)}</div>
                <div className="flex-1 bg-gray-50 p-4 rounded-lg border border-gray-200 hover:shadow-md transition">
                  <Link href={getEventLink(event)} className="block">
                    <div className="flex justify-between items-start">
                      <h3 className="font-medium text-lg">{event.title}</h3>
                      <span className="text-xs text-gray-500 whitespace-nowrap">
                        {new Date(event.date).toLocaleString()}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 mt-1">
                      {event.description}
                    </p>
                    <div className="mt-2 flex justify-between items-center">
                      <span className="text-sm text-gray-600">
                        <span className="font-medium">{event.author}</span>
                      </span>
                      {event.additions !== undefined &&
                        event.deletions !== undefined && (
                          <span className="text-xs bg-gray-100 px-2 py-1 rounded">
                            <span className="text-green-600">
                              +{event.additions}
                            </span>{" "}
                            /
                            <span className="text-red-600">
                              -{event.deletions}
                            </span>
                          </span>
                        )}
                    </div>
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
