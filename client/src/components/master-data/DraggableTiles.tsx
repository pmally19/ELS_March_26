import { useState, useEffect } from "react";
import { DragDropContext, Droppable, Draggable } from "react-beautiful-dnd";
import { TileNumber } from "@/components/common/TileNumber";

// Define the TileProps interface
interface TileProps {
  id: string;
  title: string;
  icon: React.ReactNode;
  description: string;
  linkText: string;
  onClick: () => void;
  tileNumber?: string;
}

interface DraggableTilesProps {
  title: string;
  description: string;
  initialTiles: TileProps[];
}

export const DraggableTiles = ({ title, description, initialTiles }: DraggableTilesProps) => {
  const [tiles, setTiles] = useState(initialTiles);
  const [isReordering, setIsReordering] = useState(false);

  // Update tiles when initialTiles prop changes (for search filtering)
  useEffect(() => {
    setTiles(initialTiles);
  }, [initialTiles]);

  // Handle the end of a drag operation
  const handleDragEnd = (result: any) => {
    // If dropped outside the list or no change
    if (!result.destination || result.destination.index === result.source.index) {
      return;
    }

    // Reorder the tiles based on drag result
    const reorderedTiles = Array.from(tiles);
    const [removed] = reorderedTiles.splice(result.source.index, 1);
    reorderedTiles.splice(result.destination.index, 0, removed);

    // Save the new order
    setTiles(reorderedTiles);
    
    // Save to localStorage for persistence
    try {
      localStorage.setItem(`masterDataTiles-${title}`, JSON.stringify(reorderedTiles.map(tile => tile.id)));
    } catch (error) {
      console.error("Failed to save tile order to localStorage:", error);
    }
  };

  return (
    <div className="mb-10">
      <div className="flex justify-between items-center mb-4">
        <div>
          <h2 className="text-xl font-semibold border-b border-gray-200 pb-2">{title}</h2>
          <p className="text-gray-600 mt-2">{description}</p>
        </div>
        <button
          className={`px-3 py-1.5 rounded text-sm font-medium flex items-center ${
            isReordering
              ? "bg-blue-100 text-blue-700"
              : "bg-gray-100 text-gray-700 hover:bg-gray-200"
          }`}
          onClick={() => setIsReordering(!isReordering)}
        >
          {isReordering ? "Save Order" : "Reorder Tiles"}
        </button>
      </div>

      <DragDropContext onDragEnd={handleDragEnd}>
        <Droppable droppableId="tiles" direction="horizontal" isDropDisabled={!isReordering}>
          {(provided) => (
            <div
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
              {...provided.droppableProps}
              ref={provided.innerRef}
            >
              {tiles.map((tile, index) => (
                <Draggable
                  key={tile.id}
                  draggableId={tile.id}
                  index={index}
                  isDragDisabled={!isReordering}
                >
                  {(provided, snapshot) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.draggableProps}
                      {...provided.dragHandleProps}
                      className={`${
                        snapshot.isDragging ? "ring-2 ring-blue-500 shadow-lg" : ""
                      } ${
                        isReordering 
                          ? "bg-white rounded-lg shadow-sm p-5 border border-gray-200 cursor-move transition-all"
                          : "bg-white hover:bg-gray-50 rounded-lg shadow-sm p-5 border border-gray-200 cursor-pointer transition-colors"
                      }`}
                      onClick={isReordering ? undefined : tile.onClick}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          {tile.tileNumber && (
                            <TileNumber tileNumber={tile.tileNumber} size="sm" />
                          )}
                          <h3 className="text-lg font-semibold text-gray-700">{tile.title}</h3>
                        </div>
                        <div className="bg-blue-100 p-2 rounded-md">
                          {tile.icon}
                        </div>
                      </div>
                      <p className="mt-3 text-sm text-gray-500">{tile.description}</p>
                      {!isReordering && (
                        <div className="mt-3 text-blue-600 text-sm font-medium">{tile.linkText}</div>
                      )}
                      {isReordering && (
                        <div className="mt-3 text-gray-400 text-sm font-medium italic">
                          Drag to reorder
                        </div>
                      )}
                    </div>
                  )}
                </Draggable>
              ))}
              {provided.placeholder}
            </div>
          )}
        </Droppable>
      </DragDropContext>
    </div>
  );
};