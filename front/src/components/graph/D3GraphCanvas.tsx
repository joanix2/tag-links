import { useEffect, useRef } from "react";
import * as d3 from "d3";
import { D3Node, D3Link } from "./types";
import { getNodeColor, getNodeRadius, getNodeLabel } from "./utils/nodeUtils";
import { Tag, Link } from "@/types";

interface D3GraphCanvasProps {
  nodes: D3Node[];
  links: D3Link[];
  selectedTags: string[];
  onNodeClick: (node: D3Node) => void;
  width: number;
  height: number;
}

export const D3GraphCanvas = ({ nodes, links, selectedTags, onNodeClick, width, height }: D3GraphCanvasProps) => {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!svgRef.current || nodes.length === 0) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    // Create main group for zoom/pan
    const g = svg.append("g");

    // Add zoom behavior
    const zoom = d3
      .zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.1, 4])
      .on("zoom", (event) => {
        g.attr("transform", event.transform);
      });

    svg.call(zoom);

    // Create force simulation
    const simulation = d3
      .forceSimulation<D3Node>(nodes)
      .force(
        "link",
        d3
          .forceLink<D3Node, D3Link>(links)
          .id((d) => d.id)
          .distance(150)
      )
      .force("charge", d3.forceManyBody().strength(-800))
      .force("center", d3.forceCenter(width / 2, height / 2))
      .force("collision", d3.forceCollide().radius(60));

    // Create arrow markers for links
    const defs = svg.append("defs");

    // Default arrow
    defs
      .append("marker")
      .attr("id", "arrow")
      .attr("viewBox", "0 -5 10 10")
      .attr("refX", 10)
      .attr("refY", 0)
      .attr("markerWidth", 6)
      .attr("markerHeight", 6)
      .attr("orient", "auto")
      .append("path")
      .attr("d", "M0,-5L10,0L0,5")
      .attr("fill", "#94a3b8");

    // Selected arrow
    defs
      .append("marker")
      .attr("id", "arrow-selected")
      .attr("viewBox", "0 -5 10 10")
      .attr("refX", 10)
      .attr("refY", 0)
      .attr("markerWidth", 6)
      .attr("markerHeight", 6)
      .attr("orient", "auto")
      .append("path")
      .attr("d", "M0,-5L10,0L0,5")
      .attr("fill", "#3b82f6");

    // Draw links
    const link = g
      .append("g")
      .selectAll("line")
      .data(links)
      .join("line")
      .attr("stroke", (d) => (d.isSelected ? "#3b82f6" : "#94a3b8"))
      .attr("stroke-width", (d) => (d.isSelected ? 3 : 2))
      .attr("opacity", (d) => (d.isSelected ? 1 : 0.6))
      .attr("marker-end", (d) => (d.isSelected ? "url(#arrow-selected)" : "url(#arrow)"));

    // Draw nodes
    const node = g
      .append("g")
      .selectAll("g")
      .data(nodes)
      .join("g")
      .style("cursor", "pointer")
      .call(
        d3
          .drag<SVGGElement, D3Node>()
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
      )
      .on("click", (event, d) => {
        event.stopPropagation();
        onNodeClick(d);
      });

    // Add circles for nodes
    node
      .append("circle")
      .attr("r", getNodeRadius)
      .attr("fill", getNodeColor)
      .attr("stroke", (d) => {
        if (d.type === "tag") {
          const tag = d.data as Tag;
          return selectedTags.includes(tag.id) ? "#ffffff" : "rgba(255,255,255,0.3)";
        } else {
          const link = d.data as Link;
          const hasSelectedTag = link.tags.some((tagId) => selectedTags.includes(tagId));
          return hasSelectedTag ? "#93c5fd" : "rgba(255,255,255,0.3)";
        }
      })
      .attr("stroke-width", (d) => {
        if (d.type === "tag") {
          const tag = d.data as Tag;
          return selectedTags.includes(tag.id) ? 4 : 3;
        } else {
          const link = d.data as Link;
          const hasSelectedTag = link.tags.some((tagId) => selectedTags.includes(tagId));
          return hasSelectedTag ? 4 : 3;
        }
      })
      .style("filter", (d) => {
        if (d.type === "tag") {
          const tag = d.data as Tag;
          return selectedTags.includes(tag.id) ? "drop-shadow(0 0 8px rgba(0,0,0,0.3))" : "drop-shadow(0 4px 6px rgba(0,0,0,0.1))";
        } else {
          const link = d.data as Link;
          const hasSelectedTag = link.tags.some((tagId) => selectedTags.includes(tagId));
          return hasSelectedTag ? "drop-shadow(0 0 8px rgba(59,130,246,0.4))" : "drop-shadow(0 4px 6px rgba(0,0,0,0.1))";
        }
      });

    // Add labels
    node
      .append("text")
      .text(getNodeLabel)
      .attr("text-anchor", "middle")
      .attr("dominant-baseline", "central")
      .attr("fill", "#ffffff")
      .attr("font-size", (d) => (d.type === "tag" ? "14px" : "12px"))
      .attr("font-weight", (d) => (d.type === "tag" ? "600" : "500"))
      .attr("pointer-events", "none")
      .style("user-select", "none")
      .each(function (d) {
        const text = d3.select(this);
        const label = getNodeLabel(d);
        const words = label.split(/\s+/);
        const radius = getNodeRadius(d);
        const maxWidth = radius * 1.6;
        const lineHeight = 1.2;
        const lines: string[] = [];

        text.text(null);

        let line: string[] = [];

        words.forEach((word) => {
          line.push(word);
          const testLine = line.join(" ");
          text.text(testLine);
          const textLength = (text.node() as SVGTextElement).getComputedTextLength();

          if (textLength > maxWidth && line.length > 1) {
            line.pop();
            lines.push(line.join(" "));
            line = [word];
          }
        });

        if (line.length > 0) {
          lines.push(line.join(" "));
        }

        text.text(null);

        // Calculate total height and offset to center
        const totalLines = lines.length;
        const startOffset = -(totalLines - 1) * lineHeight * 0.5;

        lines.forEach((lineText, i) => {
          text
            .append("tspan")
            .attr("x", 0)
            .attr("dy", i === 0 ? `${startOffset}em` : `${lineHeight}em`)
            .text(lineText);
        });
      });

    // Update positions on simulation tick
    simulation.on("tick", () => {
      link.each(function (d) {
        const sourceNode = d.source as D3Node;
        const targetNode = d.target as D3Node;

        // Calculate angle between source and target
        const dx = targetNode.x! - sourceNode.x!;
        const dy = targetNode.y! - sourceNode.y!;
        const angle = Math.atan2(dy, dx);

        // Get radius of target node
        const targetRadius = getNodeRadius(targetNode);

        // Calculate edge endpoint at the border of the target node
        const targetX = targetNode.x! - Math.cos(angle) * targetRadius;
        const targetY = targetNode.y! - Math.sin(angle) * targetRadius;

        // Update line position
        d3.select(this).attr("x1", sourceNode.x!).attr("y1", sourceNode.y!).attr("x2", targetX).attr("y2", targetY);
      });

      node.attr("transform", (d) => `translate(${d.x},${d.y})`);
    });

    return () => {
      simulation.stop();
    };
  }, [nodes, links, selectedTags, onNodeClick, width, height]);

  return <svg ref={svgRef} width={width} height={height} className="bg-slate-50 dark:bg-slate-900" />;
};
