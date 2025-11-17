import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Eraser, Paintbrush, Undo2, ZoomIn, ZoomOut, RefreshCw } from 'lucide-react';

interface ImageEditCanvasProps {
    imageDataUrl: string;
    mode: 'inpaint' | 'outpaint';
    brushSize: number;
    onBrushSizeChange: (size: number) => void;
    onMaskChange: (maskDataUrl: string) => void;
}

interface Stroke {
    points: { x: number; y: number }[];
    brushSize: number;
    isErasing: boolean;
}

export function ImageEditCanvas({ imageDataUrl, mode, brushSize, onBrushSizeChange, onMaskChange }: ImageEditCanvasProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const maskCanvasRef = useRef<HTMLCanvasElement>(null);
    const overlayCanvasRef = useRef<HTMLCanvasElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    
    const [isDrawing, setIsDrawing] = useState(false);
    const [isErasing, setIsErasing] = useState(false);
    const [imageLoaded, setImageLoaded] = useState(false);
    const [cursorPos, setCursorPos] = useState<{ x: number; y: number } | null>(null);
    const [zoom, setZoom] = useState(1);
    const [strokeHistory, setStrokeHistory] = useState<Stroke[]>([]);
    const [currentStroke, setCurrentStroke] = useState<{ x: number; y: number }[]>([]);

    // Load image onto canvas
    useEffect(() => {
        const canvas = canvasRef.current;
        const maskCanvas = maskCanvasRef.current;
        const overlayCanvas = overlayCanvasRef.current;
        if (!canvas || !maskCanvas || !overlayCanvas) return;

        const ctx = canvas.getContext('2d');
        const maskCtx = maskCanvas.getContext('2d');
        if (!ctx || !maskCtx) return;

        const img = new Image();
        img.onload = () => {
            // Set canvas dimensions to match image (full size, no cropping)
            canvas.width = img.width;
            canvas.height = img.height;
            maskCanvas.width = img.width;
            maskCanvas.height = img.height;
            overlayCanvas.width = img.width;
            overlayCanvas.height = img.height;

            // Draw image at full size
            ctx.drawImage(img, 0, 0);

            // Clear mask canvas (transparent)
            maskCtx.clearRect(0, 0, maskCanvas.width, maskCanvas.height);
            
            setImageLoaded(true);
        };
        img.src = imageDataUrl;
    }, [imageDataUrl]);

    // Update overlay with semi-transparent mask visualization
    useEffect(() => {
        const overlayCanvas = overlayCanvasRef.current;
        const maskCanvas = maskCanvasRef.current;
        if (!overlayCanvas || !maskCanvas) return;

        const overlayCtx = overlayCanvas.getContext('2d');
        const maskCtx = maskCanvas.getContext('2d');
        if (!overlayCtx || !maskCtx) return;

        // Clear overlay
        overlayCtx.clearRect(0, 0, overlayCanvas.width, overlayCanvas.height);

        // Get mask data
        const maskData = maskCtx.getImageData(0, 0, maskCanvas.width, maskCanvas.height);
        const overlayData = overlayCtx.createImageData(maskData.width, maskData.height);

        // Create semi-transparent red overlay where mask exists
        for (let i = 0; i < maskData.data.length; i += 4) {
            const alpha = maskData.data[i + 3]; // Get mask alpha
            if (alpha > 0) {
                overlayData.data[i] = 255;     // Red
                overlayData.data[i + 1] = 0;   // Green
                overlayData.data[i + 2] = 0;   // Blue
                overlayData.data[i + 3] = 77;  // Semi-transparent (0.3 opacity as per requirements: 77/255 ≈ 0.302)
            }
        }

        overlayCtx.putImageData(overlayData, 0, 0);
    }, [strokeHistory]);

    const getCanvasCoordinates = (e: React.MouseEvent<HTMLCanvasElement>) => {
        const canvas = maskCanvasRef.current;
        if (!canvas) return null;

        const rect = canvas.getBoundingClientRect();
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;
        const x = (e.clientX - rect.left) * scaleX;
        const y = (e.clientY - rect.top) * scaleY;

        return { x, y };
    };

    const startDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
        if (mode !== 'inpaint') return;
        setIsDrawing(true);
        const coords = getCanvasCoordinates(e);
        if (coords) {
            setCurrentStroke([coords]);
            drawPoint(coords.x, coords.y);
        }
    };

    const stopDrawing = () => {
        if (isDrawing && currentStroke.length > 0) {
            // Save current stroke to history
            setStrokeHistory(prev => [...prev, {
                points: currentStroke,
                brushSize,
                isErasing
            }]);
            setCurrentStroke([]);
        }
        setIsDrawing(false);
        
        // Export mask as data URL
        const maskCanvas = maskCanvasRef.current;
        if (maskCanvas) {
            const maskDataUrl = maskCanvas.toDataURL('image/png');
            onMaskChange(maskDataUrl);
        }
    };

    const drawPoint = (x: number, y: number) => {
        const maskCanvas = maskCanvasRef.current;
        if (!maskCanvas) return;

        const maskCtx = maskCanvas.getContext('2d');
        if (!maskCtx) return;

        maskCtx.globalCompositeOperation = isErasing ? 'destination-out' : 'source-over';
        maskCtx.fillStyle = 'rgba(255, 255, 255, 1.0)'; // Opaque white mask
        maskCtx.beginPath();
        maskCtx.arc(x, y, brushSize, 0, Math.PI * 2);
        maskCtx.fill();
    };

    const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
        const coords = getCanvasCoordinates(e);
        if (coords) {
            setCursorPos(coords);
        }

        if (!isDrawing || mode !== 'inpaint' || !coords) return;

        setCurrentStroke(prev => [...prev, coords]);
        drawPoint(coords.x, coords.y);

        // Update overlay immediately
        const overlayCanvas = overlayCanvasRef.current;
        const maskCanvas = maskCanvasRef.current;
        if (!overlayCanvas || !maskCanvas) return;

        const overlayCtx = overlayCanvas.getContext('2d');
        if (!overlayCtx) return;

        overlayCtx.fillStyle = 'rgba(255, 0, 0, 0.3)'; // Semi-transparent red (0.3 opacity as per requirements)
        overlayCtx.beginPath();
        overlayCtx.arc(coords.x, coords.y, brushSize, 0, Math.PI * 2);
        overlayCtx.fill();
    };

    const handleMouseLeave = () => {
        setCursorPos(null);
        stopDrawing();
    };

    const clearMask = () => {
        const maskCanvas = maskCanvasRef.current;
        const overlayCanvas = overlayCanvasRef.current;
        if (!maskCanvas || !overlayCanvas) return;

        const maskCtx = maskCanvas.getContext('2d');
        const overlayCtx = overlayCanvas.getContext('2d');
        if (!maskCtx || !overlayCtx) return;

        maskCtx.clearRect(0, 0, maskCanvas.width, maskCanvas.height);
        overlayCtx.clearRect(0, 0, overlayCanvas.width, overlayCanvas.height);
        setStrokeHistory([]);
        onMaskChange('');
    };

    const undoLastStroke = () => {
        if (strokeHistory.length === 0) return;

        // Remove last stroke from history
        const newHistory = strokeHistory.slice(0, -1);
        setStrokeHistory(newHistory);

        // Redraw entire mask from scratch
        const maskCanvas = maskCanvasRef.current;
        if (!maskCanvas) return;

        const maskCtx = maskCanvas.getContext('2d');
        if (!maskCtx) return;

        // Clear mask
        maskCtx.clearRect(0, 0, maskCanvas.width, maskCanvas.height);

        // Replay all remaining strokes
        newHistory.forEach(stroke => {
            stroke.points.forEach(point => {
                maskCtx.globalCompositeOperation = stroke.isErasing ? 'destination-out' : 'source-over';
                maskCtx.fillStyle = 'rgba(255, 255, 255, 1.0)';
                maskCtx.beginPath();
                maskCtx.arc(point.x, point.y, stroke.brushSize, 0, Math.PI * 2);
                maskCtx.fill();
            });
        });

        // Update overlay
        const overlayCanvas = overlayCanvasRef.current;
        if (!overlayCanvas) return;

        const overlayCtx = overlayCanvas.getContext('2d');
        if (!overlayCtx) return;

        overlayCtx.clearRect(0, 0, overlayCanvas.width, overlayCanvas.height);
        const maskData = maskCtx.getImageData(0, 0, maskCanvas.width, maskCanvas.height);
        const overlayData = overlayCtx.createImageData(maskData.width, maskData.height);

        for (let i = 0; i < maskData.data.length; i += 4) {
            const alpha = maskData.data[i + 3];
            if (alpha > 0) {
                overlayData.data[i] = 255;
                overlayData.data[i + 1] = 0;
                overlayData.data[i + 2] = 0;
                overlayData.data[i + 3] = 77; // Semi-transparent (0.3 opacity as per requirements: 77/255 ≈ 0.302)
            }
        }

        overlayCtx.putImageData(overlayData, 0, 0);

        // Export updated mask
        const maskDataUrl = maskCanvas.toDataURL('image/png');
        onMaskChange(maskDataUrl);
    };

    const handleZoomIn = () => {
        setZoom(prev => Math.min(prev + 0.25, 2));
    };

    const handleZoomOut = () => {
        setZoom(prev => Math.max(prev - 0.25, 0.25));
    };

    const resetZoom = () => {
        setZoom(1);
    };

    return (
        <div className="space-y-4">
            {/* Zoom Controls */}
            {mode === 'inpaint' && imageLoaded && (
                <div className="flex items-center gap-2">
                    <Button
                        size="sm"
                        variant="outline"
                        onClick={handleZoomOut}
                        disabled={zoom <= 0.25}
                        data-testid="button-zoom-out"
                    >
                        <ZoomOut className="h-4 w-4" />
                    </Button>
                    <span className="text-sm font-medium text-zinc-700 dark:text-slate-100 min-w-16 text-center">
                        {Math.round(zoom * 100)}%
                    </span>
                    <Button
                        size="sm"
                        variant="outline"
                        onClick={handleZoomIn}
                        disabled={zoom >= 2}
                        data-testid="button-zoom-in"
                    >
                        <ZoomIn className="h-4 w-4" />
                    </Button>
                    <Button
                        size="sm"
                        variant="outline"
                        onClick={resetZoom}
                        data-testid="button-reset-zoom"
                    >
                        <RefreshCw className="h-4 w-4 mr-1" />
                        Reset
                    </Button>
                </div>
            )}

            {/* Canvas Container with Scrolling */}
            <div 
                ref={containerRef}
                className="relative w-full bg-slate-100 dark:bg-zinc-800 rounded-lg border-2 border-slate-300 dark:border-zinc-600 overflow-auto"
                style={{ maxHeight: '600px' }}
            >
                <div 
                    className="relative"
                    style={{ 
                        width: 'fit-content',
                        transform: `scale(${zoom})`,
                        transformOrigin: 'top left'
                    }}
                >
                    <canvas
                        ref={canvasRef}
                        className="block"
                    />
                    <canvas
                        ref={overlayCanvasRef}
                        className="absolute inset-0 pointer-events-none"
                        style={{ mixBlendMode: 'normal' }}
                    />
                    <canvas
                        ref={maskCanvasRef}
                        className="absolute inset-0 cursor-crosshair"
                        style={{ 
                            pointerEvents: mode === 'inpaint' ? 'auto' : 'none',
                            opacity: 0 // Hide the actual mask canvas, show only overlay
                        }}
                        onMouseDown={startDrawing}
                        onMouseUp={stopDrawing}
                        onMouseMove={draw}
                        onMouseLeave={handleMouseLeave}
                        data-testid="canvas-mask"
                    />
                    
                    {/* Real-time brush size indicator */}
                    {mode === 'inpaint' && cursorPos && (
                        <div
                            className="absolute pointer-events-none rounded-full border-2 border-blue-500"
                            style={{
                                left: cursorPos.x - brushSize,
                                top: cursorPos.y - brushSize,
                                width: brushSize * 2,
                                height: brushSize * 2,
                                transform: 'translate(-1px, -1px)'
                            }}
                        />
                    )}
                </div>
            </div>

            {/* Inpainting Tools */}
            {mode === 'inpaint' && imageLoaded && (
                <div className="space-y-3">
                    {/* Brush/Eraser Toggle */}
                    <div className="flex items-center gap-2 flex-wrap">
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button
                                    size="sm"
                                    variant={!isErasing ? 'default' : 'outline'}
                                    onClick={() => setIsErasing(false)}
                                    data-testid="button-brush"
                                >
                                    <Paintbrush className="h-4 w-4 mr-1" />
                                    Brush
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                                <p>Highlight the area you want to remove or correct</p>
                            </TooltipContent>
                        </Tooltip>
                        
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button
                                    size="sm"
                                    variant={isErasing ? 'default' : 'outline'}
                                    onClick={() => setIsErasing(true)}
                                    data-testid="button-eraser"
                                >
                                    <Eraser className="h-4 w-4 mr-1" />
                                    Erase Selection
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                                <p>Erase red areas you marked by mistake</p>
                            </TooltipContent>
                        </Tooltip>
                        
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={undoLastStroke}
                                    disabled={strokeHistory.length === 0}
                                    data-testid="button-undo-stroke"
                                >
                                    <Undo2 className="h-4 w-4 mr-1" />
                                    Undo Stroke
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                                <p>Undo last drawing</p>
                            </TooltipContent>
                        </Tooltip>
                        
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={clearMask}
                                    data-testid="button-clear-mask"
                                >
                                    Clear All
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                                <p>Remove all red marks</p>
                            </TooltipContent>
                        </Tooltip>
                    </div>

                    {/* Brush Size Slider */}
                    <div className="space-y-2">
                        <label className="text-sm font-semibold text-zinc-700 dark:text-slate-100">
                            Brush Size: {brushSize}px
                        </label>
                        <Slider
                            value={[brushSize]}
                            onValueChange={(values) => onBrushSizeChange(values[0])}
                            min={5}
                            max={100}
                            step={5}
                            className="w-full"
                            data-testid="slider-brush-size"
                        />
                    </div>

                    <p className="text-xs text-zinc-500 dark:text-zinc-400">
                        Paint over areas you want to remove or correct. The red overlay shows your selection. The AI will regenerate those regions.
                    </p>
                </div>
            )}
        </div>
    );
}
