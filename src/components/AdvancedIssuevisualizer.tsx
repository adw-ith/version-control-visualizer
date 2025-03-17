// components/AdvancedIssueVisualizer.tsx
"use client";

import { useEffect, useRef, useState } from "react";
import * as d3 from "d3";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip as RechartsTooltip,
  Legend as RechartsLegend,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";

interface Commit {
  id: string;
  message: string;
  timestamp: string;
}

interface FileUpdate {
  filename: string;
  updatedLines: number;
}

export interface Issue {
  id: number;
  title: string;
  createdAt: string;
  closedAt?: string;
  status: "open" | "closed";
  labels: string[];
  commits?: Commit[];
  updatedFiles?: FileUpdate[];
}
interface FileData {
  filename: string;
  totalUpdatedLines: number;
  updateCount: number;
}

interface AdvancedIssueVisualizerProps {
  issues: Issue[];
}

const safeParse = (dateStr: string) =>
  d3.isoParse(dateStr) || new Date(dateStr);

// Timeline View: Gantt-style chart of issue durations
function TimelineView({ issues }: { issues: Issue[] }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Clear any previous SVG content
    d3.select(ref.current).selectAll("*").remove();

    // Set dimensions and margins
    const margin = { top: 20, right: 20, bottom: 30, left: 200 };
    const width = 800 - margin.left - margin.right;
    const barHeight = 25;
    const height = issues.length * (barHeight + 5);

    // Append SVG
    const svg = d3
      .select(ref.current)
      .append("svg")
      .attr("width", width + margin.left + margin.right)
      .attr("height", height + margin.top + margin.bottom)
      .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    // Parse date strings
    const parseDate = d3.isoParse;
    const issueData = issues.map((d) => ({
      ...d,
      start: safeParse(d.createdAt),
      end: d.closedAt ? safeParse(d.closedAt) : new Date(), // fallback for open issues
    }));

    // Define x scale
    const x = d3
      .scaleTime()
      .domain([
        d3.min(issueData, (d) => d.start) as Date,
        d3.max(issueData, (d) => d.end) as Date,
      ])
      .range([0, width]);

    // Add x-axis
    svg
      .append("g")
      .attr("transform", `translate(0, ${height})`)
      .call(d3.axisBottom(x));

    // Create bars for each issue
    svg
      .selectAll("rect")
      .data(issueData)
      .enter()
      .append("rect")
      .attr("x", (d) => x(d.start)!)
      .attr("y", (d, i) => i * (barHeight + 5))
      .attr("width", (d) => x(d.end)! - x(d.start)!)
      .attr("height", barHeight)
      .attr("fill", (d) => (d.status === "closed" ? "green" : "purple"))
      .append("title")
      .text(
        (d) =>
          `${d.title}\nCreated: ${d.createdAt}\nClosed: ${
            d.closedAt || "Still open"
          }\nLabels: ${d.labels.join(", ")}`
      );

    // Add issue titles on the left side
    svg
      .selectAll("text.issue-title")
      .data(issueData)
      .enter()
      .append("text")
      .attr("class", "issue-title")
      .attr("x", -10)
      .attr("y", (d, i) => i * (barHeight + 5) + barHeight / 2)
      .attr("text-anchor", "end")
      .attr("alignment-baseline", "middle")
      .text((d) => d.title);
  }, [issues]);

  return <div ref={ref}></div>;
}

// Graph View: Force-directed graph connecting issues, commits, and files
function GraphView({ issues }: { issues: Issue[] }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    d3.select(ref.current).selectAll("*").remove();
    const width = 800,
      height = 600;

    const svg = d3
      .select(ref.current)
      .append("svg")
      .attr("width", width)
      .attr("height", height);

    // Prepare nodes and links
    const nodes: any[] = [];
    const links: any[] = [];

    // Add issue nodes and link to commits and file updates
    issues.forEach((issue) => {
      const issueNode = {
        id: `issue-${issue.id}`,
        type: "issue",
        title: issue.title,
      };
      nodes.push(issueNode);

      issue.commits?.forEach((commit) => {
        const commitNode = {
          id: `commit-${commit.id}`,
          type: "commit",
          message: commit.message,
        };
        nodes.push(commitNode);
        links.push({ source: issueNode.id, target: commitNode.id });
      });

      issue.updatedFiles?.forEach((file) => {
        const fileNode = {
          id: `file-${file.filename}`,
          type: "file",
          filename: file.filename,
        };
        nodes.push(fileNode);
        // Link file to each commit that updated it (if commits exist)
        issue.commits?.forEach((commit) => {
          links.push({ source: `commit-${commit.id}`, target: fileNode.id });
        });
      });
    });

    // Remove duplicate nodes
    const uniqueNodes = Array.from(
      new Map(nodes.map((d) => [d.id, d])).values()
    );

    // Create simulation
    const simulation = d3
      .forceSimulation(uniqueNodes)
      .force(
        "link",
        d3
          .forceLink(links)
          .id((d: any) => d.id)
          .distance(60)
      )
      .force("charge", d3.forceManyBody().strength(-200))
      .force("center", d3.forceCenter(width / 2, height / 2));

    // Draw links
    const link = svg
      .append("g")
      .attr("stroke", "#aaa")
      .selectAll("line")
      .data(links)
      .enter()
      .append("line")
      .attr("stroke-width", 1.5);

    // Draw nodes
    const node = svg
      .append("g")
      .selectAll("circle")
      .data(uniqueNodes)
      .enter()
      .append("circle")
      .attr("r", 5)
      .attr("fill", (d: any) => {
        if (d.type === "issue") return "purple";
        if (d.type === "commit") return "orange";
        return "blue";
      })
      .call(
        d3
          .drag<any, any>()
          .on("start", (event, d) => {
            if (!event.active) simulation.alphaTarget(0.3).restart();
            d.fx = d.x;
            d.fy = d.y;
          })
          .on("drag", (event, d) => {
            d.fx = event.x;
            d.fy = event.y;
          })
          .on("end", (event, d) => {
            if (!event.active) simulation.alphaTarget(0);
            d.fx = null;
            d.fy = null;
          })
      );

    // Add tooltips
    node
      .append("title")
      .text((d: any) => d.title || d.message || d.filename || "");

    simulation.on("tick", () => {
      link
        .attr("x1", (d: any) => d.source.x)
        .attr("y1", (d: any) => d.source.y)
        .attr("x2", (d: any) => d.target.x)
        .attr("y2", (d: any) => d.target.y);

      node.attr("cx", (d: any) => d.x).attr("cy", (d: any) => d.y);
    });
  }, [issues]);

  return <div ref={ref}></div>;
}

// Summary View: Placeholder for donut/histogram visualization
function SummaryView({ issues }: { issues: Issue[] }) {
  // Aggregate file data from issues
  const fileMap: Record<string, FileData> = {};
  issues.forEach((issue) => {
    if (issue.updatedFiles) {
      issue.updatedFiles.forEach((file) => {
        if (fileMap[file.filename]) {
          fileMap[file.filename].totalUpdatedLines += file.updatedLines;
          fileMap[file.filename].updateCount += 1;
        } else {
          fileMap[file.filename] = {
            filename: file.filename,
            totalUpdatedLines: file.updatedLines,
            updateCount: 1,
          };
        }
      });
    }
  });
  const fileDataArray = Object.values(fileMap);

  // Prepare data for the donut chart: top 5 files by total updated lines
  const topFiles = [...fileDataArray]
    .sort((a, b) => b.totalUpdatedLines - a.totalUpdatedLines)
    .slice(0, 5);

  // Prepare data for the histogram: group files by their update count
  const frequencyMap: Record<number, number> = {};
  fileDataArray.forEach((file) => {
    const count = file.updateCount;
    frequencyMap[count] = (frequencyMap[count] || 0) + 1;
  });
  const histogramData = Object.keys(frequencyMap)
    .map((key) => ({
      updateCount: Number(key),
      fileFrequency: frequencyMap[Number(key)],
    }))
    .sort((a, b) => a.updateCount - b.updateCount);

  // Colors for donut chart slices
  const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#AA00FF"];

  return (
    <div className="p-4 bg-gray-100 rounded">
      <h3 className="text-lg font-semibold mb-2">Summary View</h3>
      <div className="flex flex-col md:flex-row justify-around items-center">
        {/* Donut Chart for Top Updated Files */}
        <div>
          <h4 className="text-md font-semibold mb-1">Top Updated Files</h4>
          <PieChart width={300} height={300}>
            <Pie
              data={topFiles}
              dataKey="totalUpdatedLines"
              nameKey="filename"
              cx="50%"
              cy="50%"
              outerRadius={80}
              innerRadius={40}
              label
            >
              {topFiles.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={COLORS[index % COLORS.length]}
                />
              ))}
            </Pie>
            <RechartsTooltip />
            <RechartsLegend />
          </PieChart>
        </div>

        {/* Histogram for File Update Frequencies */}
        <div>
          <h4 className="text-md font-semibold mb-1">File Update Frequency</h4>
          <BarChart width={400} height={300} data={histogramData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis
              dataKey="updateCount"
              label={{
                value: "Updates per File",
                position: "insideBottom",
                offset: -5,
              }}
            />
            <YAxis
              label={{
                value: "Number of Files",
                angle: -90,
                position: "insideLeft",
              }}
            />
            <RechartsTooltip />
            <RechartsLegend />
            <Bar dataKey="fileFrequency" fill="#82ca9d" />
          </BarChart>
        </div>
      </div>
    </div>
  );
}

// Main component with tabbed view switching
export default function AdvancedIssueVisualizer({
  issues,
}: AdvancedIssueVisualizerProps) {
  const [view, setView] = useState<"timeline" | "graph" | "summary">(
    "timeline"
  );

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Advanced Issue Visualizer</h1>
      <div className="mb-4 space-x-2">
        <button
          onClick={() => setView("timeline")}
          className={`px-4 py-2 rounded ${
            view === "timeline" ? "bg-blue-600 text-white" : "bg-gray-200"
          }`}
        >
          Timeline
        </button>
        <button
          onClick={() => setView("graph")}
          className={`px-4 py-2 rounded ${
            view === "graph" ? "bg-blue-600 text-white" : "bg-gray-200"
          }`}
        >
          Graph
        </button>
        <button
          onClick={() => setView("summary")}
          className={`px-4 py-2 rounded ${
            view === "summary" ? "bg-blue-600 text-white" : "bg-gray-200"
          }`}
        >
          Summary
        </button>
      </div>
      <div>
        {view === "timeline" && <TimelineView issues={issues} />}
        {view === "graph" && <GraphView issues={issues} />}
        {view === "summary" && <SummaryView issues={issues} />}
      </div>
    </div>
  );
}
