import { useMemo, useState, useCallback, useEffect } from "react";
import { GraphViewProps, SelectedNodeData } from "./types";
import { generateGraphData } from "./utils/nodeGenerator";
import { GraphOverview } from "./GraphOverview";
import { NodeDetails } from "./NodeDetails";
import { D3GraphCanvas } from "./D3GraphCanvas";
import { D3Node } from "./types";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Info, X } from "lucide-react";
import "./graph.css";

const GraphView = ({ links, tags, selectedTags }: GraphViewProps) => {
  const [selectedNode, setSelectedNode] = useState<SelectedNodeData | null>(null);
  const [dimensions, setDimensions] = useState({ width: window.innerWidth, height: window.innerHeight });
  const [isMobile, setIsMobile] = useState(false);
  const [showInfo, setShowInfo] = useState(false);

  // Handle window resize
  useEffect(() => {
    const handleResize = () => {
      setDimensions({
        width: window.innerWidth,
        height: window.innerHeight,
      });
      setIsMobile(window.innerWidth < 768);
    };

    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Generate nodes and edges from links and tags
  const { nodes, links: graphLinks } = useMemo(() => {
    return generateGraphData(links, tags, selectedTags);
  }, [links, tags, selectedTags]);

  const handleNodeClick = useCallback((node: D3Node) => {
    setSelectedNode({
      type: node.type,
      data: node.data,
    });
  }, []);

  const handleCloseDetails = useCallback(() => {
    setSelectedNode(null);
  }, []);

  const stats = useMemo(
    () => ({
      linksCount: links.length,
      tagsCount: tags.length,
      relationsCount: graphLinks.length,
    }),
    [links, tags, graphLinks]
  );

  return (
    <div className="flex-1 flex flex-col overflow-hidden w-full h-full relative bg-gradient-to-br from-background to-muted/20">
      {/* Graph Canvas */}
      <D3GraphCanvas nodes={nodes} links={graphLinks} selectedTags={selectedTags} onNodeClick={handleNodeClick} width={dimensions.width} height={dimensions.height} />

      {/* Info Panel - Desktop */}
      {!isMobile && (
        <div className="absolute top-4 left-4 bg-card/95 backdrop-blur-md p-4 rounded-xl border shadow-xl w-[320px] max-h-[calc(100vh-2rem)] overflow-y-auto custom-scrollbar">
          <GraphOverview stats={stats} />
          {selectedNode && <NodeDetails selectedNode={selectedNode} links={links} tags={tags} onClose={handleCloseDetails} />}
        </div>
      )}

      {/* Info Panel - Mobile (Sheet) */}
      {isMobile && (
        <>
          <Sheet open={showInfo} onOpenChange={setShowInfo}>
            <SheetTrigger asChild>
              <Button variant="default" size="icon" className="absolute top-4 left-4 shadow-lg">
                <Info size={20} />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-[90vw] sm:w-[350px] overflow-y-auto">
              <div className="space-y-4 pt-4">
                <GraphOverview stats={stats} />
                {selectedNode && <NodeDetails selectedNode={selectedNode} links={links} tags={tags} onClose={handleCloseDetails} />}
              </div>
            </SheetContent>
          </Sheet>

          {/* Selected Node Badge - Mobile */}
          {selectedNode && !showInfo && (
            <div className="absolute bottom-4 left-4 right-4 bg-card/95 backdrop-blur-md p-3 rounded-lg border shadow-lg flex items-center justify-between">
              <div className="flex-1 min-w-0">
                <p className="text-xs text-muted-foreground mb-1">Selected {selectedNode.type}</p>
                <p className="text-sm font-semibold truncate">{selectedNode.type === "link" ? (selectedNode.data as { title: string }).title : (selectedNode.data as { name: string }).name}</p>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => setShowInfo(true)}>
                  Details
                </Button>
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleCloseDetails}>
                  <X size={16} />
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default GraphView;
