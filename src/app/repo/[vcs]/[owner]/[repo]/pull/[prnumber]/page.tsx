"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";

interface FileChange {
  filename: string;
  status: string;
  patch?: string;
}

interface DiffLine {
  type: "added" | "removed" | "context";
  oldNumber: number | null;
  newNumber: number | null;
  content: string;
}

export default function PullRequestDetailsPage() {
  const params = useParams() as {
    vcs: string;
    owner: string;
    repo: string;
    prnumber: string;
  };
  const { vcs, owner, repo, prnumber } = params;
  const [details, setDetails] = useState<{ files: FileChange[] }>({
    files: [],
  });
  const [selectedFile, setSelectedFile] = useState<FileChange | null>(null);
  const [parsedDiff, setParsedDiff] = useState<DiffLine[]>([]);
  const [viewMode, setViewMode] = useState<"unified" | "split">("split");

  useEffect(() => {
    fetchPullRequestDetails();
  }, [vcs, owner, repo, prnumber]);

  useEffect(() => {
    if (selectedFile?.patch) {
      setParsedDiff(parsePatch(selectedFile.patch));
    } else {
      setParsedDiff([]);
    }
  }, [selectedFile]);

  const fetchPullRequestDetails = async () => {
    try {
      const res = await fetch(
        `/api/pull-request-details?vcs=${vcs}&owner=${owner}&repo=${repo}&prnumber=${prnumber}`
      );
      const data = await res.json();
      setDetails(data);
    } catch (error) {
      console.error("Error fetching pull request details:", error);
    }
  };

  const parsePatch = (patch: string): DiffLine[] => {
    const lines = patch.split("\n");
    const diffLines: DiffLine[] = [];
    let oldLineNum = 0;
    let newLineNum = 0;

    for (const line of lines) {
      if (line.startsWith("@@")) {
        // Handle diff header lines like @@ -1,7 +1,7 @@
        const match = line.match(/@@ -(\d+),\d+ \+(\d+),\d+ @@/);
        if (match) {
          oldLineNum = parseInt(match[1], 10) - 1;
          newLineNum = parseInt(match[2], 10) - 1;
        }
        diffLines.push({
          type: "context",
          oldNumber: null,
          newNumber: null,
          content: line,
        });
      } else if (line.startsWith("+")) {
        // Added line
        newLineNum++;
        diffLines.push({
          type: "added",
          oldNumber: null,
          newNumber: newLineNum,
          content: line.substring(1),
        });
      } else if (line.startsWith("-")) {
        // Removed line
        oldLineNum++;
        diffLines.push({
          type: "removed",
          oldNumber: oldLineNum,
          newNumber: null,
          content: line.substring(1),
        });
      } else {
        // Context line
        oldLineNum++;
        newLineNum++;
        diffLines.push({
          type: "context",
          oldNumber: oldLineNum,
          newNumber: newLineNum,
          content: line.startsWith(" ") ? line.substring(1) : line,
        });
      }
    }

    return diffLines;
  };

  const renderSplitDiff = () => {
    return (
      <div className="flex overflow-x-auto">
        <table className="table-fixed w-full text-sm">
          <tbody>
            {parsedDiff.map((line, idx) => (
              <tr
                key={idx}
                className={line.type === "context" ? "bg-white" : ""}
              >
                {/* Left side (old) */}
                <td className="w-12 text-right pr-2 select-none text-gray-500 border-r">
                  {line.oldNumber !== null ? line.oldNumber : ""}
                </td>
                <td
                  className={`px-2 font-mono whitespace-pre ${
                    line.type === "removed" ? "bg-red-100" : ""
                  }`}
                >
                  {line.type !== "added" ? line.content : ""}
                </td>

                {/* Right side (new) */}
                <td className="w-12 text-right pr-2 select-none text-gray-500 border-r border-l">
                  {line.newNumber !== null ? line.newNumber : ""}
                </td>
                <td
                  className={`px-2 font-mono whitespace-pre ${
                    line.type === "added" ? "bg-green-100" : ""
                  }`}
                >
                  {line.type !== "removed" ? line.content : ""}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  const renderUnifiedDiff = () => {
    return (
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <tbody>
            {parsedDiff.map((line, idx) => (
              <tr
                key={idx}
                className={`
                  ${line.type === "added" ? "bg-green-100" : ""}
                  ${line.type === "removed" ? "bg-red-100" : ""}
                  ${line.type === "context" ? "bg-white" : ""}
                `}
              >
                <td className="w-12 text-right pr-2 select-none text-gray-500 border-r">
                  {line.oldNumber !== null ? line.oldNumber : ""}
                </td>
                <td className="w-12 text-right pr-2 select-none text-gray-500 border-r">
                  {line.newNumber !== null ? line.newNumber : ""}
                </td>
                <td className="px-2 font-mono whitespace-pre">
                  {line.content}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  return (
    <div className="p-6 mx-auto bg-white text-gray-900 shadow-md border border-gray-300">
      <h1 className="text-2xl font-bold mb-4">
        Pull Request Details:{" "}
        <span className="text-blue-600">PR #{prnumber}</span>
      </h1>

      <h2 className="text-xl font-semibold mb-4">Changed Files</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {details.files.map((file) => (
          <div
            key={file.filename}
            onClick={() => setSelectedFile(file)}
            className={`cursor-pointer p-4 border rounded-lg transition ${
              selectedFile?.filename === file.filename
                ? "bg-blue-100 border-blue-300"
                : "bg-gray-50 hover:bg-blue-50"
            }`}
          >
            <h3 className="font-semibold text-lg">{file.filename}</h3>
            <p className="text-sm text-gray-600">Status: {file.status}</p>
            <p className="text-sm text-gray-500 mt-2">
              {file.patch
                ? file.patch.substring(0, 100) + "..."
                : "No diff available."}
            </p>
            <button className="mt-2 text-blue-600 hover:underline">
              View Diff
            </button>
          </div>
        ))}
      </div>

      {selectedFile && (
        <div className="mt-6 p-4 bg-gray-100 rounded-lg border border-gray-300">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold">
              Diff for:{" "}
              <span className="text-blue-500">{selectedFile.filename}</span>
            </h3>
            <div className="flex space-x-2">
              <button
                onClick={() => setViewMode("split")}
                className={`px-3 py-1 rounded ${
                  viewMode === "split"
                    ? "bg-blue-500 text-white"
                    : "bg-gray-200 hover:bg-gray-300"
                }`}
              >
                Split View
              </button>
              <button
                onClick={() => setViewMode("unified")}
                className={`px-3 py-1 rounded ${
                  viewMode === "unified"
                    ? "bg-blue-500 text-white"
                    : "bg-gray-200 hover:bg-gray-300"
                }`}
              >
                Unified View
              </button>
            </div>
          </div>

          <div className="bg-white p-1 rounded-lg border border-gray-300 overflow-hidden">
            {selectedFile.patch ? (
              viewMode === "split" ? (
                renderSplitDiff()
              ) : (
                renderUnifiedDiff()
              )
            ) : (
              <p className="p-3">No diff available for this file.</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
