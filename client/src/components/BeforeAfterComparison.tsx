import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Eye, EyeOff } from 'lucide-react';

interface BeforeAfterComparisonProps {
    beforeImageUrl: string;
    afterImageUrl: string;
    altBefore?: string;
    altAfter?: string;
}

export function BeforeAfterComparison({ beforeImageUrl, afterImageUrl, altBefore = "Before", altAfter = "After" }: BeforeAfterComparisonProps) {
    const [showBefore, setShowBefore] = useState(false);
    const [sliderPosition, setSliderPosition] = useState(50);
    const [comparisonMode, setComparisonMode] = useState<'toggle' | 'slider'>('toggle');

    return (
        <div className="space-y-4">
            {/* Mode Selection */}
            <div className="flex items-center gap-2">
                <Button
                    size="sm"
                    variant={comparisonMode === 'toggle' ? 'default' : 'outline'}
                    onClick={() => setComparisonMode('toggle')}
                    data-testid="button-toggle-mode"
                >
                    Toggle
                </Button>
                <Button
                    size="sm"
                    variant={comparisonMode === 'slider' ? 'default' : 'outline'}
                    onClick={() => setComparisonMode('slider')}
                    data-testid="button-slider-mode"
                >
                    Slider
                </Button>
            </div>

            {/* Toggle Mode: Simple before/after switch */}
            {comparisonMode === 'toggle' && (
                <div className="space-y-2">
                    <div className="relative w-full rounded-lg overflow-hidden border-2 border-slate-300 dark:border-zinc-600 bg-slate-100 dark:bg-zinc-800">
                        <img
                            src={showBefore ? beforeImageUrl : afterImageUrl}
                            alt={showBefore ? altBefore : altAfter}
                            className="w-full h-auto object-contain"
                            data-testid="img-comparison"
                        />
                        <div className="absolute top-2 right-2 bg-black/60 text-white px-3 py-1 rounded-md text-sm font-medium">
                            {showBefore ? 'Before' : 'After'}
                        </div>
                    </div>
                    
                    <Button
                        variant="outline"
                        className="w-full"
                        onClick={() => setShowBefore(!showBefore)}
                        data-testid="button-toggle-comparison"
                    >
                        {showBefore ? (
                            <>
                                <Eye className="h-4 w-4 mr-2" />
                                Show After
                            </>
                        ) : (
                            <>
                                <EyeOff className="h-4 w-4 mr-2" />
                                Show Before
                            </>
                        )}
                    </Button>
                </div>
            )}

            {/* Slider Mode: Side-by-side comparison with adjustable divider */}
            {comparisonMode === 'slider' && (
                <div className="space-y-3">
                    <div className="relative w-full rounded-lg overflow-hidden border-2 border-slate-300 dark:border-zinc-600 bg-slate-100 dark:bg-zinc-800">
                        {/* After image (full) - base layer */}
                        <img
                            src={afterImageUrl}
                            alt={altAfter}
                            className="w-full h-auto object-contain"
                        />
                        
                        {/* Before image (clipped) - overlay layer with identical sizing */}
                        <div
                            className="absolute top-0 left-0 overflow-hidden"
                            style={{ 
                                width: `${sliderPosition}%`,
                                height: '100%'
                            }}
                        >
                            <img
                                src={beforeImageUrl}
                                alt={altBefore}
                                className="h-full object-contain object-left"
                                style={{ 
                                    position: 'absolute',
                                    top: 0,
                                    left: 0
                                }}
                            />
                        </div>

                        {/* Vertical divider line */}
                        <div
                            className="absolute top-0 bottom-0 w-1 bg-blue-500 shadow-lg"
                            style={{ left: `${sliderPosition}%` }}
                        >
                            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center shadow-lg">
                                <div className="w-4 h-4 border-2 border-white rounded-full" />
                            </div>
                        </div>

                        {/* Labels */}
                        <div className="absolute top-2 left-2 bg-black/60 text-white px-3 py-1 rounded-md text-sm font-medium">
                            Before
                        </div>
                        <div className="absolute top-2 right-2 bg-black/60 text-white px-3 py-1 rounded-md text-sm font-medium">
                            After
                        </div>
                    </div>

                    {/* Slider control */}
                    <div className="space-y-1">
                        <label className="text-xs font-medium text-zinc-600 dark:text-zinc-400">
                            Adjust Comparison ({sliderPosition}%)
                        </label>
                        <Slider
                            value={[sliderPosition]}
                            onValueChange={(values) => setSliderPosition(values[0])}
                            min={0}
                            max={100}
                            step={1}
                            className="w-full"
                            data-testid="slider-comparison"
                        />
                    </div>
                </div>
            )}
        </div>
    );
}
