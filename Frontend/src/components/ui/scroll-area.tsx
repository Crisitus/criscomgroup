import React, { useRef, useState, useEffect } from "react";

interface ScrollAreaProps {
  className?: string;
  children: React.ReactNode;
  maxHeight?: string | number;
  maxWidth?: string | number;
  viewportClassName?: string;
  scrollbarClassName?: string;
  orientation?: "vertical" | "horizontal" | "both";
}

export const ScrollArea = ({
  className = "",
  children,
  maxHeight = "200px",
  maxWidth = "100%",
  viewportClassName = "",
  scrollbarClassName = "",
  orientation = "vertical",
}: ScrollAreaProps) => {
  const contentRef = useRef<HTMLDivElement>(null);
  const scrollbarVerticalRef = useRef<HTMLDivElement>(null);
  const scrollbarHorizontalRef = useRef<HTMLDivElement>(null);
  const [showVerticalScrollbar, setShowVerticalScrollbar] = useState(false);
  const [showHorizontalScrollbar, setShowHorizontalScrollbar] = useState(false);
  const [draggingVertical, setDraggingVertical] = useState(false);
  const [draggingHorizontal, setDraggingHorizontal] = useState(false);
  const [scrollbarVerticalHeight, setScrollbarVerticalHeight] = useState(0);
  const [scrollbarHorizontalWidth, setScrollbarHorizontalWidth] = useState(0);
  const [scrollbarVerticalTop, setScrollbarVerticalTop] = useState(0);
  const [scrollbarHorizontalLeft, setScrollbarHorizontalLeft] = useState(0);

  // Calcular el tamaño y la visibilidad de las barras de desplazamiento
  useEffect(() => {
    const content = contentRef.current;
    if (!content) return;

    const checkScrollbars = () => {
      const hasVerticalScroll = content.scrollHeight > content.clientHeight;
      const hasHorizontalScroll = content.scrollWidth > content.clientWidth;
      
      setShowVerticalScrollbar(hasVerticalScroll && (orientation === "vertical" || orientation === "both"));
      setShowHorizontalScrollbar(hasHorizontalScroll && (orientation === "horizontal" || orientation === "both"));
      
      // Calcular altura de la barra vertical
      if (hasVerticalScroll) {
        const ratio = content.clientHeight / content.scrollHeight;
        setScrollbarVerticalHeight(Math.max(30, ratio * content.clientHeight));
      }
      
      // Calcular ancho de la barra horizontal
      if (hasHorizontalScroll) {
        const ratio = content.clientWidth / content.scrollWidth;
        setScrollbarHorizontalWidth(Math.max(30, ratio * content.clientWidth));
      }
    };

    checkScrollbars();
    
    // Observador de redimensionamiento para recalcular cuando cambie el contenido
    const resizeObserver = new ResizeObserver(checkScrollbars);
    resizeObserver.observe(content);
    
    return () => {
      resizeObserver.disconnect();
    };
  }, [children, orientation]);

  // Manejar el desplazamiento del contenido
  const handleScroll = () => {
    const content = contentRef.current;
    if (!content) return;

    // Actualizar posición de la barra vertical
    if (showVerticalScrollbar) {
      const ratio = content.scrollTop / (content.scrollHeight - content.clientHeight);
      const maxTop = content.clientHeight - scrollbarVerticalHeight;
      setScrollbarVerticalTop(ratio * maxTop);
    }
    
    // Actualizar posición de la barra horizontal
    if (showHorizontalScrollbar) {
      const ratio = content.scrollLeft / (content.scrollWidth - content.clientWidth);
      const maxLeft = content.clientWidth - scrollbarHorizontalWidth;
      setScrollbarHorizontalLeft(ratio * maxLeft);
    }
  };

  // Iniciar arrastre de la barra vertical
  const startDragVertical = (e: React.MouseEvent) => {
    e.preventDefault();
    setDraggingVertical(true);
    
    const startY = e.clientY;
    const startTop = scrollbarVerticalTop;
    const content = contentRef.current;
    if (!content) return;
    
    const handleMouseMove = (e: MouseEvent) => {
      const deltaY = e.clientY - startY;
      const maxTop = content.clientHeight - scrollbarVerticalHeight;
      const newTop = Math.max(0, Math.min(maxTop, startTop + deltaY));
      setScrollbarVerticalTop(newTop);
      
      // Actualizar scroll del contenido
      const ratio = newTop / maxTop;
      content.scrollTop = ratio * (content.scrollHeight - content.clientHeight);
    };
    
    const handleMouseUp = () => {
      setDraggingVertical(false);
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
    
    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
  };

  // Iniciar arrastre de la barra horizontal
  const startDragHorizontal = (e: React.MouseEvent) => {
    e.preventDefault();
    setDraggingHorizontal(true);
    
    const startX = e.clientX;
    const startLeft = scrollbarHorizontalLeft;
    const content = contentRef.current;
    if (!content) return;
    
    const handleMouseMove = (e: MouseEvent) => {
      const deltaX = e.clientX - startX;
      const maxLeft = content.clientWidth - scrollbarHorizontalWidth;
      const newLeft = Math.max(0, Math.min(maxLeft, startLeft + deltaX));
      setScrollbarHorizontalLeft(newLeft);
      
      // Actualizar scroll del contenido
      const ratio = newLeft / maxLeft;
      content.scrollLeft = ratio * (content.scrollWidth - content.clientWidth);
    };
    
    const handleMouseUp = () => {
      setDraggingHorizontal(false);
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
    
    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
  };

  return (
    <div 
      className={`relative overflow-hidden ${className}`}
      style={{ 
        maxHeight: typeof maxHeight === 'number' ? `${maxHeight}px` : maxHeight,
        maxWidth: typeof maxWidth === 'number' ? `${maxWidth}px` : maxWidth
      }}
    >
      <div
        ref={contentRef}
        className={`h-full w-full overflow-auto scrollbar-hide ${viewportClassName}`}
        onScroll={handleScroll}
      >
        {children}
      </div>
      
      {/* Barra de desplazamiento vertical */}
      {showVerticalScrollbar && (
        <div 
          className={`absolute top-0 right-0 w-2 h-full bg-transparent transition-opacity duration-300 ${
            draggingVertical ? 'opacity-100' : 'opacity-0 hover:opacity-100'
          }`}
        >
          <div
            ref={scrollbarVerticalRef}
            className={`absolute right-0 w-2 rounded-full bg-gray-400 hover:bg-gray-500 cursor-pointer ${scrollbarClassName}`}
            style={{
              height: `${scrollbarVerticalHeight}px`,
              top: `${scrollbarVerticalTop}px`,
            }}
            onMouseDown={startDragVertical}
          />
        </div>
      )}
      
      {/* Barra de desplazamiento horizontal */}
      {showHorizontalScrollbar && (
        <div 
          className={`absolute bottom-0 left-0 h-2 w-full bg-transparent transition-opacity duration-300 ${
            draggingHorizontal ? 'opacity-100' : 'opacity-0 hover:opacity-100'
          }`}
        >
          <div
            ref={scrollbarHorizontalRef}
            className={`absolute bottom-0 h-2 rounded-full bg-gray-400 hover:bg-gray-500 cursor-pointer ${scrollbarClassName}`}
            style={{
              width: `${scrollbarHorizontalWidth}px`,
              left: `${scrollbarHorizontalLeft}px`,
            }}
            onMouseDown={startDragHorizontal}
          />
        </div>
      )}
    </div>
  );
};
