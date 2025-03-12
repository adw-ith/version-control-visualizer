"use client";

import { useEffect, useRef, useState } from "react";
import mermaid from "mermaid";

interface Branch {
  name: string;
  parent?: string;
}

interface BranchMergeDiagramProps {
  branches: Branch[];
}

const BranchMergeDiagram: React.FC<BranchMergeDiagramProps> = ({
  branches,
}) => {
  const [mounted, setMounted] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [renderKey, setRenderKey] = useState(0);
  const diagramRef = useRef<HTMLDivElement>(null);
  const diagramContainerRef = useRef<HTMLDivElement>(null);

  // Initialize mermaid when component mounts
  useEffect(() => {
    const initMermaid = async () => {
      try {
        await mermaid.initialize({
          startOnLoad: false,
          theme: "default",
          securityLevel: "loose",
          flowchart: {
            htmlLabels: true,
            curve: "basis",
          },
        });
        setMounted(true);
      } catch (error) {
        console.error("Failed to initialize mermaid:", error);
      }
    };

    initMermaid();
  }, []);

  // Generate the Mermaid diagram definition from branch data
  const generateDiagramDefinition = (): string => {
    let diagram = "gitGraph:\n";
    diagram += "  commit\n";

    // Track branches we've already added
    const addedBranches = new Set<string>();
    const mainBranch = branches.find((b) => !b.parent) || branches[0];
    if (mainBranch) {
      addedBranches.add(mainBranch.name);
    }

    // Add each branch and its relationship
    branches.forEach((branch) => {
      if (branch.parent && !addedBranches.has(branch.name)) {
        diagram += `  branch ${branch.name}\n`;
        diagram += `  checkout ${branch.name}\n`;
        diagram += "  commit\n";
        diagram += "  commit\n";
        addedBranches.add(branch.name);
      }
    });

    // Add merges
    branches.forEach((branch) => {
      if (branch.parent && branch.parent !== mainBranch?.name) {
        diagram += `  checkout ${branch.parent}\n`;
        diagram += `  merge ${branch.name}\n`;
      }
    });

    return diagram;
  };

  // Render the diagram when branches change or component mounts
  useEffect(() => {
    if (!mounted) return;

    const renderDiagram = async () => {
      setIsLoading(true);

      if (!diagramContainerRef.current) return;

      try {
        // Clear previous content
        if (diagramContainerRef.current) {
          diagramContainerRef.current.innerHTML = "";

          // Create a new diagram element
          const newDiv = document.createElement("div");
          newDiv.className = "mermaid";
          newDiv.textContent = generateDiagramDefinition();
          diagramContainerRef.current.appendChild(newDiv);

          // Process and render the diagram
          await mermaid.run({
            nodes: [newDiv as HTMLElement],
          });
        }
      } catch (error) {
        console.error("Mermaid rendering error:", error);
        // Fallback to text representation if mermaid fails
        if (diagramContainerRef.current) {
          diagramContainerRef.current.innerHTML = `<pre>${generateDiagramDefinition()}</pre>`;
        }
      } finally {
        setIsLoading(false);
      }
    };

    renderDiagram();
  }, [branches, mounted, renderKey]);

  // Force re-render if window resizes
  useEffect(() => {
    const handleResize = () => {
      setRenderKey((prev) => prev + 1);
    };

    window.addEventListener("resize", handleResize);
    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  return (
    <div className="bg-white p-4 rounded-lg shadow">
      <h2 className="text-xl font-semibold mb-2">Branch Diagram</h2>
      <div className="overflow-x-auto">
        {isLoading && (
          <div className="min-h-[200px] flex items-center justify-center">
            <p>Loading branch diagram...</p>
          </div>
        )}
        <div
          ref={diagramContainerRef}
          key={renderKey}
          className="min-h-[200px] flex items-center justify-center"
          style={{ display: isLoading ? "none" : "flex" }}
        />
      </div>
    </div>
  );
};

export default BranchMergeDiagram;
