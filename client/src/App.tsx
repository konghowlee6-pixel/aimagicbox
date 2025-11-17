// FIX: Re-implemented the entire App.tsx file to resolve a critical corruption and truncation issue that caused a fatal syntax error and prevented the application from loading.
import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { useLocation, Link } from 'wouter';
import { IMAGE_STYLES, INITIAL_PROJECTS, PRODUCT_INPUT_PLACEHOLDER, INITIAL_BRAND_ASSETS, BUSINESS_CATEGORIES, TONE_OF_VOICES, INDUSTRY_TAGS, PROJECT_SIZES, INITIAL_TEMPLATES } from './constants';
import { generateImages, generateCampaignContent, generateSampleText, generateKeywords, regenerateSingleField, enhancePrompt, regenerateImagePrompt, suggestAlternatives, simplifyText, detectSceneType, compositeProductIntoScene } from './services/geminiService';
import { Project, Page, BrandAssets, BrandAssetFile, Campaign, CampaignImage, DesignSettings, TextSettings, DesignSettingsOverride, Template, UsageSummary, AiModel, UsageLog, CTAButton, CTAIcon } from './types';
import { getUsageSummary } from './services/usageService';
import { ThemeProvider } from '@/components/theme-provider';
import { ThemeToggle } from '@/components/theme-toggle';
import { useAuth } from '@/lib/auth-context';
import { getCurrentUser } from '@/lib/auth-helpers';
import './components/subscription-animations.css';
import regenerateIconWhite from '/regenerate-icon.png';
import magicWandIcon from '@assets/ChatGPT Image Oct 25, 2025, 02_56_15 PM_1762873404595.png';
import { removeBackground } from '@imgly/background-removal';
import CommunityShowcase from '@/pages/community';
import { PromoVideoTab } from '@/components/project/promo-video/PromoVideoTab';
import { Switch } from '@/components/ui/switch';
import { Globe, Lock, Handshake, Bookmark, Sparkles, Pencil, ChevronDown, HelpCircle, Wand2, Bell, Loader2, Play, Pause, Volume2, VolumeX, Maximize2 } from 'lucide-react';
import { MobileNav } from '@/components/MobileNav';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { Toaster } from '@/components/ui/toaster';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from '@/components/ui/accordion';
import { queryClient, apiRequest } from '@/lib/queryClient';
import { useQuery } from '@tanstack/react-query';
import { ImageEditCanvas } from '@/components/ImageEditCanvas';
import { BeforeAfterComparison } from '@/components/BeforeAfterComparison';
import { Image2ImageMode } from '@/components/project/Image2ImageMode';
import { FeedbackForm } from '@/components/settings/FeedbackForm';
import { MessageCenter } from '@/components/settings/MessageCenter';


// Popular hashtag suggestions for autocomplete
const POPULAR_HASHTAGS = [
    '#Marketing', '#DigitalMarketing', '#SocialMedia', '#Business', '#Entrepreneur',
    '#SmallBusiness', '#Startup', '#Success', '#Motivation', '#Inspiration',
    '#Innovation', '#Technology', '#Creative', '#Design', '#Photography',
    '#Food', '#Foodie', '#Delicious', '#FoodLovers', '#InstaFood',
    '#Fashion', '#Style', '#Beauty', '#Lifestyle', '#Fitness',
    '#Travel', '#Adventure', '#Nature', '#Summer', '#Sale',
    '#Promotion', '#Discount', '#ShopNow', '#NewArrival', '#Trending'
];

// Product/Service industry examples for suggestion helper
const INDUSTRY_EXAMPLES = [
    { category: 'Food & Beverage', examples: ['Coffee Shop', 'Restaurant', 'Bakery', 'Food Delivery Service'] },
    { category: 'Retail & E-commerce', examples: ['Online Store', 'Boutique', 'Electronics Shop', 'Handmade Crafts'] },
    { category: 'Health & Wellness', examples: ['Fitness Studio', 'Spa', 'Yoga Classes', 'Nutrition Coaching'] },
    { category: 'Professional Services', examples: ['Consulting', 'Marketing Agency', 'Legal Services', 'Accounting'] },
    { category: 'Technology', examples: ['Software Development', 'IT Support', 'App Development', 'Web Design'] },
    { category: 'Education', examples: ['Online Courses', 'Tutoring', 'Language School', 'Professional Training'] },
    { category: 'Beauty & Personal Care', examples: ['Hair Salon', 'Nail Salon', 'Skincare Products', 'Cosmetics'] },
    { category: 'Travel & Hospitality', examples: ['Hotel', 'Travel Agency', 'Tour Guide', 'Vacation Rentals'] },
    { category: 'Entertainment', examples: ['Event Planning', 'Photography', 'Music Lessons', 'Art Gallery'] },
    { category: 'Home & Garden', examples: ['Interior Design', 'Landscaping', 'Home Cleaning', 'Furniture Store'] }
];

// +--------------------------+
// | Canvas Rendering Engine  |
// +--------------------------+

// FIX: Added a deepMerge utility function to correctly combine design settings and overrides without mutation, resolving multiple 'Cannot find name' errors.
const isObject = (item: any): item is Object => {
    return (item && typeof item === 'object' && !Array.isArray(item));
};

const deepMerge = <T extends object, U extends object>(target: T, source: U): T & U => {
    const output: any = { ...target };

    if (isObject(target) && isObject(source)) {
        Object.keys(source).forEach(key => {
            const sourceValue = (source as any)[key];
            if (isObject(sourceValue) && (target as any)[key]) {
                output[key] = deepMerge((target as any)[key], sourceValue);
            } else {
                output[key] = sourceValue;
            }
        });
    }

    return output;
};


// FIX: Replaced the old layout/color functions with a single, more intelligent AI engine that analyzes a 3x3 grid to find the quietest area, then determines optimal vertical position, text alignment, and text color based on that specific region.
const analyzeImageForLayout = async (src: string, useAIAnalysis: boolean = false): Promise<DesignSettingsOverride> => {
    const startTime = performance.now();
    console.log(`[LAYOUT ANALYSIS] Starting analysis (AI mode: ${useAIAnalysis ? 'ON' : 'OFF'})`);
    
    // If AI-powered visual analysis is enabled, use Gemini to analyze the image
    if (useAIAnalysis) {
        console.log('[LAYOUT ANALYSIS] Using AI-powered visual analysis (Gemini API)...');
        try {
            const aiAnalysisStartTime = performance.now();
            console.log(`    🧠 [PERF] Making AI visual analysis API call...`);
            
            const user = getCurrentUser();
            const headers: Record<string, string> = {
                'Content-Type': 'application/json',
            };
            
            const token = localStorage.getItem('token');
            if (token) {
                headers['Authorization'] = `Bearer ${token}`;
            }
            
            const response = await fetch('/api/analyze-visual', {
                method: 'POST',
                headers,
                body: JSON.stringify({ imageUrl: src }),
            });
            
            if (response.ok) {
                const analysis = await response.json();
                const aiAnalysisDuration = performance.now() - aiAnalysisStartTime;
                console.log(`    ✅ [PERF] AI visual analysis completed in ${aiAnalysisDuration.toFixed(0)}ms`);
                console.log("AI Visual Analysis Result:", analysis);
                
                // Extract recommended region and text color from AI analysis
                const region = analysis.recommendedTextRegion || 'top-left';
                const [verticalPositionStr, textAlignStr] = region.split('-');
                const verticalPosition = verticalPositionStr as 'top' | 'center' | 'bottom';
                const textAlign = textAlignStr as 'left' | 'center' | 'right';
                const isDark = analysis.recommendedTextColor === 'dark';
                
                const fontColor = isDark ? '#1F2937' : '#FFFFFF';
                const shadowColor = isDark ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.6)';
                
                // Don't automatically add background overlay - let users control this manually
                // AI only determines text color and placement, not background boxes
                const useBackground = false;
                const backgroundColor = 'rgba(0,0,0,0.6)';
                const backgroundOpacity = 0.7;
                
                const override: DesignSettingsOverride = {
                    headline: {
                        rows: [{ 
                            fontColor, 
                            shadowColor, 
                            shadowBlur: 10, 
                            textAlign,
                            useBackground,
                            backgroundColor,
                            backgroundOpacity
                        }],
                        verticalPosition: verticalPosition
                    },
                    subheadline: { 
                        fontColor, 
                        shadowColor, 
                        shadowBlur: 10, 
                        verticalPosition: verticalPosition, 
                        textAlign,
                        useBackground,
                        backgroundColor,
                        backgroundOpacity
                    },
                };
                
                console.log(`[LAYOUT ANALYSIS - AI] Positioning text at ${region} with ${analysis.recommendedTextColor} text${useBackground ? ' + background overlay' : ''} (avoids ${analysis.detectedFaces?.length || 0} faces, ${analysis.detectedObjects?.length || 0} objects)`);
                return override;
            }
        } catch (error) {
            console.error("AI visual analysis failed, falling back to standard analysis:", error);
        }
    }
    
    // Fallback to standard grid-based analysis
    console.log('[LAYOUT ANALYSIS] Using fallback grid-based analysis (no AI)...');
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = 'Anonymous';
        img.src = src;
        img.onload = () => {
            const canvas = document.createElement('canvas');
            const w = 150; // Use a decent resolution for analysis
            const h = (img.height / img.width) * w;
            canvas.width = w;
            canvas.height = h;
            const ctx = canvas.getContext('2d', { willReadFrequently: true });
            if (!ctx) return reject('Could not get canvas context for analysis');

            ctx.drawImage(img, 0, 0, w, h);

            // 3x3 grid analysis
            const regions = [];
            for (let i = 0; i < 3; i++) { // row
                for (let j = 0; j < 3; j++) { // col
                    regions.push({
                        name: `${['top', 'center', 'bottom'][i]}-${['left', 'center', 'right'][j]}`,
                        x: (w / 3) * j,
                        y: (h / 3) * i,
                        width: w / 3,
                        height: h / 3,
                    });
                }
            }

            const regionStats = regions.map(region => {
                const imageData = ctx.getImageData(region.x, region.y, region.width, region.height);
                const data = imageData.data;
                let totalBrightness = 0;
                const brightnessValues = [];
                for (let k = 0; k < data.length; k += 4) {
                    const brightness = (data[k] * 0.299 + data[k + 1] * 0.587 + data[k + 2] * 0.114);
                    totalBrightness += brightness;
                    brightnessValues.push(brightness);
                }
                const avgBrightness = totalBrightness / (data.length / 4);
                const mean = avgBrightness;
                const variance = brightnessValues.reduce((acc, val) => acc + (val - mean) ** 2, 0) / brightnessValues.length;

                return {
                    name: region.name,
                    avgBrightness,
                    variance,
                };
            });

            // Find the region with the lowest variance (quietest area)
            const bestRegion = [...regionStats].sort((a, b) => a.variance - b.variance)[0];
            
            const [verticalPositionStr, textAlignStr] = bestRegion.name.split('-');
            const verticalPosition = verticalPositionStr as 'top' | 'center' | 'bottom';
            const textAlign = textAlignStr as 'left' | 'center' | 'right';

            // Determine text color based on the brightness of the best region
            const isDark = bestRegion.avgBrightness < 128;
            const fontColor = isDark ? '#FFFFFF' : '#1F2937';
            const shadowColor = isDark ? 'rgba(0,0,0,0.6)' : 'rgba(255,255,255,0.6)';

            const override: DesignSettingsOverride = {
                headline: {
                    rows: [{ fontColor, shadowColor, shadowBlur: 10, textAlign }],
                    verticalPosition: verticalPosition
                },
                subheadline: { fontColor, shadowColor, shadowBlur: 10, verticalPosition: verticalPosition, textAlign },
            };

            console.log(`AI Layout decision: Best region is ${bestRegion.name} (Variance: ${bestRegion.variance.toFixed(2)}). Recommending ${verticalPosition}/${textAlign} with ${isDark ? 'light' : 'dark'} text.`);
            resolve(override);
        };
        img.onerror = (err) => reject(err);
    });
};


// Detect if text contains CJK (Chinese, Japanese, Korean) characters
const isCJKText = (text: string): boolean => {
    const cjkRegex = /[\u4E00-\u9FFF\u3400-\u4DBF\u3040-\u309F\u30A0-\u30FF\uAC00-\uD7AF]/;
    return cjkRegex.test(text);
};

// Calculate optimal font size for CJK text based on character count
const getCJKAdjustedFontSize = (text: string, baseFontSize: number, maxWidth: number, ctx: CanvasRenderingContext2D): number => {
    if (!isCJKText(text)) return baseFontSize;
    
    const charCount = text.length;
    let fontSize = baseFontSize;
    
    // For CJK text, dynamically reduce font size if text is too long
    // CJK characters are typically wider, so we need more aggressive scaling
    if (charCount > 15) {
        fontSize = baseFontSize * 0.75; // Reduce by 25% for very long text
    } else if (charCount > 10) {
        fontSize = baseFontSize * 0.85; // Reduce by 15% for long text
    }
    
    // Test if the text still fits, and further reduce if needed
    ctx.font = `${fontSize}px sans-serif`;
    const textWidth = ctx.measureText(text).width;
    
    if (textWidth > maxWidth) {
        // Calculate scale factor needed to fit
        const scaleFactor = maxWidth / textWidth;
        fontSize = fontSize * scaleFactor * 0.95; // 95% to leave some margin
    }
    
    return Math.max(fontSize, baseFontSize * 0.5); // Don't go below 50% of original size
};

// FIX: Re-engineered the text wrapping function to correctly handle manual line breaks (Enter key) in addition to automatic word wrapping.
// Enhanced with CJK (Chinese, Japanese, Korean) character support for proper multi-byte character wrapping.
const getWrappedLines = (context: CanvasRenderingContext2D, text: string, maxWidth: number): string[] => {
    if (!text) return [];

    const allLines: string[] = [];
    const paragraphs = text.replace(/\r\n/g, '\n').split('\n');
    const hasCJK = isCJKText(text);

    for (const paragraph of paragraphs) {
        // Preserve empty lines from manual breaks
        if (paragraph.length === 0) {
            allLines.push('');
            continue;
        }

        // CJK Text: Character-by-character wrapping (no spaces between words)
        if (hasCJK) {
            let currentLine = '';
            
            for (let i = 0; i < paragraph.length; i++) {
                const char = paragraph[i];
                const testLine = currentLine + char;
                const testWidth = context.measureText(testLine).width;

                if (testWidth <= maxWidth) {
                    currentLine = testLine;
                } else {
                    if (currentLine) {
                        allLines.push(currentLine);
                    }
                    currentLine = char;
                }
            }
            
            if (currentLine) {
                allLines.push(currentLine);
            }
        } 
        // Non-CJK Text: Word-by-word wrapping (original logic)
        else {
            let currentLine = '';
            const words = paragraph.split(' ');

            for (const word of words) {
                if (currentLine === '') {
                    currentLine = word;
                    continue;
                }

                const testLine = `${currentLine} ${word}`;
                const testWidth = context.measureText(testLine).width;

                if (testWidth <= maxWidth) {
                    currentLine = testLine;
                } else {
                    allLines.push(currentLine);
                    currentLine = word;
                }
            }
            allLines.push(currentLine);
        }
    }
    return allLines;
};

// Helper to convert hex color to RGB
const hexToRgb = (hex: string): { r: number; g: number; b: number } | null => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16)
    } : null;
};

// Helper to detect if URL is a video
const isVideoUrl = (url: string | null | undefined): boolean => {
    if (!url) return false; // Guard against undefined/null
    const videoExtensions = ['.mp4', '.webm', '.mov', '.avi', '.mkv'];
    const lowerUrl = url.toLowerCase();
    return videoExtensions.some(ext => lowerUrl.includes(ext));
};

// Helper to generate placeholder thumbnail for failed media
const generatePlaceholderThumbnail = (width: number, height: number): string => {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return '';
    
    // Dark gradient background
    const gradient = ctx.createLinearGradient(0, 0, 0, height);
    gradient.addColorStop(0, '#1a1a2e');
    gradient.addColorStop(1, '#16213e');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);
    
    return canvas.toDataURL('image/jpeg', 0.8);
};

// FIX: Upgraded the canvas rendering engine to support multi-row headlines with independent styling for each row and a new line spacing control.
// NOW SUPPORTS VIDEO THUMBNAILS: Extracts first frame from videos using HTMLVideoElement
const renderCampaignImageToCanvas = async (
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    image: CampaignImage,
    campaign: Campaign,
    design: DesignSettings,
    brandAssets: BrandAssets,
    projectSize: string,
    currentUserPlan: 'Starter' | 'Creator' | 'ProFusion'
) => {
    // Clear canvas with transparent background
    ctx.clearRect(0, 0, width, height);

    let bgMediaElement: HTMLImageElement | HTMLVideoElement;
    let bgMediaWidth: number = 0;
    let bgMediaHeight: number = 0;

    // Detect if source is video and load accordingly
    if (isVideoUrl(image.src)) {
        // Load video and extract first frame
        const video = document.createElement('video');
        video.crossOrigin = 'anonymous';
        video.src = image.src;
        video.muted = true;
        video.playsInline = true;
        
        bgMediaElement = video;
        
        await new Promise((res, rej) => {
            video.onloadedmetadata = () => {
                bgMediaWidth = video.videoWidth;
                bgMediaHeight = video.videoHeight;
                // Seek to 0.1 seconds to get a good first frame
                video.currentTime = 0.1;
            };
            video.onseeked = () => res(null);
            video.onerror = (err) => {
                console.warn("Video failed to load, using placeholder:", image.src, err);
                rej(new Error("Failed to load video"));
            };
        });
    } else {
        // Load as image
        const bgImage = new Image();
        bgImage.crossOrigin = 'anonymous';
        bgImage.src = image.src;
        bgMediaElement = bgImage;
        
        await new Promise((res, rej) => { 
            bgImage.onload = () => {
                bgMediaWidth = bgImage.width;
                bgMediaHeight = bgImage.height;
                res(null);
            };
            bgImage.onerror = (err) => {
                console.warn("Image failed to load, using placeholder:", image.src, err);
                rej(new Error("Failed to load image"));
            };
        });
    }

    let logoImage: HTMLImageElement | null = null;
    if (design.addLogo && brandAssets.logos.length > 0 && brandAssets.logos[brandAssets.primaryLogoIndex]) {
        logoImage = new Image();
        logoImage.crossOrigin = 'anonymous';
        logoImage.src = brandAssets.logos[brandAssets.primaryLogoIndex].dataUrl;
    }

    const imagePromises: Promise<any>[] = [];
    
    if (logoImage) {
        imagePromises.push(
            new Promise((res, rej) => { 
                logoImage!.onload = res; 
                logoImage!.onerror = (err) => {
                    console.warn("Logo image failed to load, continuing without logo:", err);
                    res(null); // Continue even if logo fails
                };
            })
        );
    }

    try {
        await Promise.all(imagePromises);

        const imageAspectRatio = bgMediaWidth / bgMediaHeight;
        const canvasAspectRatio = width / height;
        let renderWidth, renderHeight, x, y;

        if (imageAspectRatio > canvasAspectRatio) {
            renderHeight = height;
            renderWidth = bgMediaWidth * (height / bgMediaHeight);
            x = (width - renderWidth) / 2;
            y = 0;
        } else {
            renderWidth = width;
            renderHeight = bgMediaHeight * (width / bgMediaWidth);
            x = 0;
            y = (height - renderHeight) / 2;
        }
        ctx.drawImage(bgMediaElement, x, y, renderWidth, renderHeight);

        const gradientOverlay = ctx.createLinearGradient(0, 0, 0, height);
        gradientOverlay.addColorStop(0, 'rgba(0,0,0,0.5)');
        gradientOverlay.addColorStop(0.5, 'rgba(0,0,0,0)');
        gradientOverlay.addColorStop(1, 'rgba(0,0,0,0.6)');
        ctx.fillStyle = gradientOverlay;
        ctx.fillRect(0, 0, width, height);

        if (logoImage) {
            ctx.globalAlpha = design.logoOpacity;
            const baseLogoWidth = width / 8;
            const finalLogoWidth = baseLogoWidth * (design.logoSize / 100);
            // Use naturalWidth and naturalHeight to preserve original logo aspect ratio
            const logoAspectRatio = logoImage.naturalWidth / logoImage.naturalHeight;
            const finalLogoHeight = finalLogoWidth / logoAspectRatio;
            const margin = width * 0.04;
            
            let logoX = margin, logoY = margin;
            switch(design.logoPosition) {
                case 'top-right': logoX = width - finalLogoWidth - margin; break;
                case 'bottom-left': logoY = height - finalLogoHeight - margin; break;
                case 'bottom-right':
                    logoX = width - finalLogoWidth - margin;
                    logoY = height - finalLogoHeight - margin;
                    break;
                case 'bottom-center':
                    logoX = (width - finalLogoWidth) / 2;
                    logoY = height - finalLogoHeight - margin;
                    break;
                case 'center':
                    logoX = (width - finalLogoWidth) / 2;
                    logoY = (height - finalLogoHeight) / 2;
                    break;
            }
            ctx.drawImage(logoImage, logoX, logoY, finalLogoWidth, finalLogoHeight);
            ctx.globalAlpha = 1.0;
        }
        
        // --- Watermark Logic ---
        if (currentUserPlan === 'Starter') {
            const watermarkText = "Made with AI Magic Box";
            
            // Subtle watermark: smaller size (3.5% of canvas width) for professional, non-intrusive appearance
            const targetFontSize = width * 0.035; // 3.5% of canvas width (reduced from 5.5%)
            const fontSize = Math.max(10, targetFontSize); // Minimum 10px
            const padding = fontSize * 1.2; // Slightly more padding for breathing room
    
            ctx.font = `400 ${fontSize}px Inter, sans-serif`; // Normal weight for subtlety
            ctx.textAlign = 'right';
            ctx.textBaseline = 'bottom';
    
            // Ultra-subtle transparency (15% opacity) blends almost invisibly with background
            // Soft shadow ensures minimal presence while maintaining slight visibility
            ctx.fillStyle = 'rgba(255, 255, 255, 0.15)'; // 15% opacity for barely noticeable presence
            ctx.shadowColor = 'rgba(0, 0, 0, 0.35)'; // Very subtle shadow
            ctx.shadowBlur = Math.max(4, fontSize * 0.5); // Moderate shadow blur
            ctx.shadowOffsetX = 1;
            ctx.shadowOffsetY = 1;
    
            // Draw the text in the bottom-right corner
            ctx.fillText(watermarkText, width - padding, height - padding);
    
            // Reset shadow for subsequent drawing operations
            ctx.shadowColor = 'transparent';
            ctx.shadowBlur = 0;
            ctx.shadowOffsetX = 0;
            ctx.shadowOffsetY = 0;
        }


        ctx.textBaseline = 'middle';
        const padding = width * 0.08;
        const contentMaxWidth = width - padding * 2;
        
        const baseScaleFactor = width / 480;

        const calculateY = (pos: string, blockHeight: number) => {
            // Enhanced vertical margin flexibility - adapts to aspect ratio for better composition
            // Allows text to feather further up or down while ensuring it never looks squeezed
            const aspectRatio = width / height;
            
            // For portrait/square images (≤1.2), use tighter margins
            // For landscape (>1.2), use more generous margins
            const topMarginFactor = aspectRatio > 1.2 ? 0.12 : 0.10;  // 10-12% from top
            const bottomMarginFactor = aspectRatio > 1.2 ? 0.88 : 0.90; // 88-90% from top
            
            // Extra safety padding to prevent text from being too close to edges
            const minPadding = height * 0.05;
            
            if (pos === 'top') {
                return Math.max(minPadding, height * topMarginFactor);
            }
            if (pos === 'bottom') {
                const calculatedY = height * bottomMarginFactor - blockHeight;
                // Ensure text doesn't go too low or overlap with watermark
                return Math.min(calculatedY, height - blockHeight - minPadding);
            }
            return (height - blockHeight) / 2; // center
        };
        
        const drawTextBlock = (
            text: string,
            settings: TextSettings,
            lines: string[],
            x: number,
            y: number,
            fontSize: number,
            lineHeight: number,
            blockHeight: number,
            isBold: boolean,
            customLetterSpacing?: number
        ) => {
            // Use custom letter spacing if provided (for CJK text), otherwise use settings
            const letterSpacing = customLetterSpacing !== undefined 
                ? customLetterSpacing 
                : (settings.letterSpacing ?? 0) * baseScaleFactor;
            
            if (settings.useBackground && settings.backgroundColor) {
                ctx.font = `${isBold ? 'bold ' : ''}${fontSize}px ${settings.fontFamily}, sans-serif`;
                ctx.letterSpacing = `${letterSpacing}px`;
                const lineWidths = lines.map(line => ctx.measureText(line).width);
                const maxLineWidth = Math.max(...lineWidths, 0);
                const bgPadding = (settings.backgroundPadding ?? 10) * baseScaleFactor;
                let rectX;
                if (settings.textAlign === 'left') rectX = x - bgPadding;
                else if (settings.textAlign === 'right') rectX = x - maxLineWidth - bgPadding;
                else rectX = x - maxLineWidth / 2 - bgPadding;
                const rectY = y - bgPadding;
                const rectWidth = maxLineWidth + bgPadding * 2;
                const rectHeight = blockHeight + bgPadding * 2;
                ctx.globalAlpha = settings.backgroundOpacity ?? 0.7;
                ctx.fillStyle = settings.backgroundColor;
                ctx.fillRect(rectX, rectY, rectWidth, rectHeight);
                ctx.globalAlpha = 1.0;
            }
            
            ctx.textAlign = settings.textAlign;
            const defaultShadowColor = hexToRgb(settings.fontColor) && (hexToRgb(settings.fontColor)!.r*0.299 + hexToRgb(settings.fontColor)!.g*0.587 + hexToRgb(settings.fontColor)!.b*0.114 > 186) ? 'rgba(0,0,0,0.5)' : 'rgba(255,255,255,0.7)';
            ctx.shadowColor = settings.shadowColor || defaultShadowColor;
            ctx.shadowBlur = settings.shadowBlur ?? 5;
            ctx.shadowOffsetX = 2;
            ctx.shadowOffsetY = 2;
            ctx.strokeStyle = settings.strokeColor || 'transparent';
            ctx.lineWidth = (settings.strokeWidth ?? 0) * baseScaleFactor;
            ctx.font = `${isBold ? 'bold ' : ''}${fontSize}px ${settings.fontFamily}, sans-serif`;
            ctx.letterSpacing = `${letterSpacing}px`;

            let currentY = y;
            lines.forEach(line => {
                if (settings.useGradient && settings.gradientColor1 && settings.gradientColor2) {
                    const angle = (settings.gradientAngle ?? 0) * Math.PI / 180;
                    const textWidth = ctx.measureText(line).width;
                    const x0 = x - (textWidth / 2) * Math.cos(angle);
                    const y0 = (currentY + lineHeight / 2) - (textWidth / 2) * Math.sin(angle);
                    const x1 = x + (textWidth / 2) * Math.cos(angle);
                    const y1 = (currentY + lineHeight / 2) + (textWidth / 2) * Math.sin(angle);
                    const gradient = ctx.createLinearGradient(x0, y0, x1, y1);
                    gradient.addColorStop(0, settings.gradientColor1);
                    gradient.addColorStop(1, settings.gradientColor2);
                    ctx.fillStyle = gradient;
                } else {
                    ctx.fillStyle = settings.fontColor;
                }

                if (settings.strokeWidth && settings.strokeWidth > 0) {
                    ctx.strokeText(line, x, currentY + lineHeight / 2);
                }
                ctx.fillText(line, x, currentY + lineHeight / 2);
                currentY += lineHeight;
            });
            
            ctx.shadowColor = 'transparent'; ctx.shadowBlur = 0; ctx.shadowOffsetX = 0; ctx.shadowOffsetY = 0;
            ctx.letterSpacing = '0px';
        };

        const headlineTextRows = campaign.headline.split('\n');
        const headlineDesign = design.headline;
        
        const headlineRowMetrics = headlineTextRows.map((text, i) => {
            const settings = headlineDesign.rows[i] || headlineDesign.rows[headlineDesign.rows.length - 1] || INITIAL_TEMPLATES[0].defaultDesign.headline.rows[0];
            const baseFontSize = (settings.fontSize || 32) * baseScaleFactor;
            
            // Apply CJK-aware font size adjustment
            const fontSize = getCJKAdjustedFontSize(text, baseFontSize, contentMaxWidth, ctx);
            
            ctx.font = `bold ${fontSize}px ${settings.fontFamily}, sans-serif`;
            
            // Adjust letter spacing for CJK text (CJK characters need less spacing)
            const letterSpacing = isCJKText(text) ? 0 : (settings.letterSpacing ?? 0) * baseScaleFactor;
            ctx.letterSpacing = `${letterSpacing}px`;
            
            const lines = getWrappedLines(ctx, text, contentMaxWidth);
            
            // Adjust line height for CJK text (slightly tighter for better readability)
            const lineHeightMultiplier = isCJKText(text) ? 1.3 : 1.2;
            const lineHeight = fontSize * lineHeightMultiplier;
            const blockHeight = lines.length * lineHeight;
            
            ctx.letterSpacing = '0px';
            return { text, lines, lineHeight, blockHeight, fontSize, settings, letterSpacing };
        });

        const rowGap = (headlineDesign.lineSpacing - 1.2) * 20 * baseScaleFactor;
        const totalHeadlineHeight = headlineRowMetrics.reduce((sum, metric) => sum + metric.blockHeight, 0) + Math.max(0, headlineRowMetrics.length - 1) * rowGap;
        
        let headlineBlockY = calculateY(headlineDesign.verticalPosition, totalHeadlineHeight);

        const baseSubheadlineFontSize = design.subheadline.fontSize * baseScaleFactor;
        
        // Apply CJK-aware font size adjustment for subheadline
        const subheadlineFontSize = getCJKAdjustedFontSize(campaign.subheadline, baseSubheadlineFontSize, contentMaxWidth, ctx);
        
        ctx.font = `${subheadlineFontSize}px ${design.subheadline.fontFamily}, sans-serif`;
        
        // Adjust letter spacing for CJK subheadline text
        const subheadlineLetterSpacing = isCJKText(campaign.subheadline) ? 0 : (design.subheadline.letterSpacing ?? 0) * baseScaleFactor;
        ctx.letterSpacing = `${subheadlineLetterSpacing}px`;
        
        const subheadlineLines = getWrappedLines(ctx, campaign.subheadline, contentMaxWidth);
        
        // Adjust line height for CJK subheadline text
        const subheadlineLineHeightMultiplier = isCJKText(campaign.subheadline) 
            ? 1.4 
            : (design.subheadline.lineSpacing ?? 1.4);
        const subheadlineLineHeight = subheadlineFontSize * subheadlineLineHeightMultiplier;
        const subheadlineBlockHeight = subheadlineLines.length * subheadlineLineHeight;
        
        ctx.letterSpacing = '0px';
        let subheadlineY = calculateY(design.subheadline.verticalPosition, subheadlineBlockHeight);

        if (headlineDesign.verticalPosition === design.subheadline.verticalPosition) {
             if (headlineDesign.verticalPosition === 'bottom') {
                 headlineBlockY -= subheadlineBlockHeight + rowGap * 2;
             } else {
                 subheadlineY = headlineBlockY + totalHeadlineHeight + rowGap * 2;
             }
        }
        
        let currentHeadlineY = headlineBlockY;
        headlineRowMetrics.forEach(metric => {
            const { text, lines, lineHeight, blockHeight, fontSize, settings, letterSpacing } = metric;
            const x = settings.textAlign === 'left' ? padding : settings.textAlign === 'right' ? width - padding : width / 2;
            drawTextBlock(text, settings, lines, x, currentHeadlineY, fontSize, lineHeight, blockHeight, true, letterSpacing);
            currentHeadlineY += blockHeight + rowGap;
        });

        if (subheadlineLines.length > 0) {
            const subheadlineX = design.subheadline.textAlign === 'left' ? padding : design.subheadline.textAlign === 'right' ? width - padding : width / 2;
            drawTextBlock(campaign.subheadline, design.subheadline, subheadlineLines, subheadlineX, subheadlineY, subheadlineFontSize, subheadlineLineHeight, subheadlineBlockHeight, false, subheadlineLetterSpacing);
        }

        // --- CTA Button Rendering ---
        if (design.ctaButton && design.ctaButton.enabled && design.ctaButton.text) {
            const cta = design.ctaButton;
            const ctaFontSize = cta.fontSize * baseScaleFactor;
            const ctaPaddingX = cta.paddingX * baseScaleFactor;
            const ctaPaddingY = cta.paddingY * baseScaleFactor;
            const ctaBorderRadius = cta.borderRadius * baseScaleFactor;
            const iconHeight = 20 * baseScaleFactor;
            const iconTextGap = 8 * baseScaleFactor;
            
            // Load icon images with aspect ratio preservation
            type LoadedIcon = { img: HTMLImageElement; icon: CTAIcon; width: number; height: number; position: 'before' | 'after' };
            const loadedIcons: LoadedIcon[] = [];
            
            if (cta.icons && cta.icons.length > 0) {
                for (const icon of cta.icons) {
                    try {
                        const img = new Image();
                        img.crossOrigin = 'anonymous';
                        img.src = icon.dataUrl;
                        await new Promise((resolve, reject) => {
                            img.onload = resolve;
                            img.onerror = reject;
                            setTimeout(reject, 5000); // 5s timeout
                        });
                        // Calculate icon dimensions preserving aspect ratio
                        const aspectRatio = img.naturalWidth / img.naturalHeight;
                        const width = iconHeight * aspectRatio;
                        loadedIcons.push({ img, icon, width, height: iconHeight, position: icon.position });
                    } catch {
                        // Failed to load, skip this icon silently
                    }
                }
            }
            
            // Measure text width
            ctx.font = `600 ${ctaFontSize}px Inter, sans-serif`;
            const textWidth = ctx.measureText(cta.text).width;
            
            // Separate icons by position
            const beforeIcons = loadedIcons.filter(item => item.position === 'before');
            const afterIcons = loadedIcons.filter(item => item.position === 'after');
            
            // Calculate total width for icons (using actual widths with proper spacing)
            const beforeIconsWidth = beforeIcons.length > 0 
                ? (beforeIcons.reduce((sum, item) => sum + item.width, 0) + (beforeIcons.length - 1) * iconTextGap / 2 + iconTextGap) 
                : 0;
            const afterIconsWidth = afterIcons.length > 0 
                ? (afterIcons.reduce((sum, item) => sum + item.width, 0) + (afterIcons.length - 1) * iconTextGap / 2 + iconTextGap) 
                : 0;
            
            // Calculate button dimensions
            const buttonWidth = beforeIconsWidth + textWidth + afterIconsWidth + ctaPaddingX * 2;
            const buttonHeight = Math.max(iconHeight, ctaFontSize) + ctaPaddingY * 2;
            
            // Calculate button position
            let buttonX: number;
            if (cta.horizontalAlign === 'left') {
                buttonX = padding;
            } else if (cta.horizontalAlign === 'right') {
                buttonX = width - padding - buttonWidth;
            } else {
                buttonX = (width - buttonWidth) / 2;
            }
            
            let buttonY: number;
            const ctaMargin = height * 0.08;
            if (cta.verticalPosition === 'top') {
                buttonY = ctaMargin;
            } else if (cta.verticalPosition === 'bottom') {
                buttonY = height - ctaMargin - buttonHeight;
            } else {
                buttonY = (height - buttonHeight) / 2;
            }
            
            // Auto-adjust colors for readability if enabled
            let finalBgColor = cta.backgroundColor;
            let finalTextColor = cta.textColor;
            let finalGradient1 = cta.gradientColor1 || '#3B82F6';
            let finalGradient2 = cta.gradientColor2 || '#1D4ED8';
            
            if (cta.autoAdjustColors) {
                // Sample background brightness at button position
                const sampleData = ctx.getImageData(
                    Math.floor(buttonX + buttonWidth / 2),
                    Math.floor(buttonY + buttonHeight / 2),
                    1,
                    1
                ).data;
                const bgBrightness = (sampleData[0] * 0.299 + sampleData[1] * 0.587 + sampleData[2] * 0.114);
                
                // Adjust button colors for contrast
                if (bgBrightness > 128) {
                    // Light background: use darker button
                    if (cta.useGradient) {
                        finalGradient1 = '#1E40AF'; // darker blue
                        finalGradient2 = '#1E3A8A'; // even darker blue
                    } else {
                        finalBgColor = '#1E40AF';
                    }
                    finalTextColor = '#FFFFFF';
                } else {
                    // Dark background: use lighter button
                    if (cta.useGradient) {
                        finalGradient1 = '#60A5FA'; // lighter blue
                        finalGradient2 = '#3B82F6'; // medium blue
                    } else {
                        finalBgColor = '#60A5FA';
                    }
                    finalTextColor = '#000000';
                }
            }
            
            // Draw button background
            ctx.shadowColor = 'rgba(0, 0, 0, 0.3)';
            ctx.shadowBlur = 10 * baseScaleFactor;
            ctx.shadowOffsetX = 0;
            ctx.shadowOffsetY = 4 * baseScaleFactor;
            
            if (cta.useGradient) {
                const angle = (cta.gradientAngle || 90) * Math.PI / 180;
                const x0 = buttonX + buttonWidth / 2 - (buttonWidth / 2) * Math.cos(angle);
                const y0 = buttonY + buttonHeight / 2 - (buttonWidth / 2) * Math.sin(angle);
                const x1 = buttonX + buttonWidth / 2 + (buttonWidth / 2) * Math.cos(angle);
                const y1 = buttonY + buttonHeight / 2 + (buttonWidth / 2) * Math.sin(angle);
                const gradient = ctx.createLinearGradient(x0, y0, x1, y1);
                gradient.addColorStop(0, finalGradient1);
                gradient.addColorStop(1, finalGradient2);
                ctx.fillStyle = gradient;
            } else {
                ctx.fillStyle = finalBgColor;
            }
            
            // Draw rounded rectangle
            ctx.beginPath();
            ctx.moveTo(buttonX + ctaBorderRadius, buttonY);
            ctx.lineTo(buttonX + buttonWidth - ctaBorderRadius, buttonY);
            ctx.quadraticCurveTo(buttonX + buttonWidth, buttonY, buttonX + buttonWidth, buttonY + ctaBorderRadius);
            ctx.lineTo(buttonX + buttonWidth, buttonY + buttonHeight - ctaBorderRadius);
            ctx.quadraticCurveTo(buttonX + buttonWidth, buttonY + buttonHeight, buttonX + buttonWidth - ctaBorderRadius, buttonY + buttonHeight);
            ctx.lineTo(buttonX + ctaBorderRadius, buttonY + buttonHeight);
            ctx.quadraticCurveTo(buttonX, buttonY + buttonHeight, buttonX, buttonY + buttonHeight - ctaBorderRadius);
            ctx.lineTo(buttonX, buttonY + ctaBorderRadius);
            ctx.quadraticCurveTo(buttonX, buttonY, buttonX + ctaBorderRadius, buttonY);
            ctx.closePath();
            ctx.fill();
            
            // Reset shadow
            ctx.shadowColor = 'transparent';
            ctx.shadowBlur = 0;
            ctx.shadowOffsetX = 0;
            ctx.shadowOffsetY = 0;
            
            // Draw content (icons + text)
            const contentY = buttonY + buttonHeight / 2;
            let currentX = buttonX + ctaPaddingX;
            
            // Draw before icons (preserving aspect ratio)
            beforeIcons.forEach((item) => {
                if (item) {
                    ctx.drawImage(item.img, currentX, contentY - item.height / 2, item.width, item.height);
                    currentX += item.width + iconTextGap / 2;
                }
            });
            
            if (beforeIcons.length > 0) {
                currentX += iconTextGap / 2;
            }
            
            // Draw text
            ctx.font = `600 ${ctaFontSize}px Inter, sans-serif`;
            ctx.fillStyle = finalTextColor;
            ctx.textAlign = 'left';
            ctx.textBaseline = 'middle';
            ctx.fillText(cta.text, currentX, contentY);
            currentX += textWidth;
            
            if (afterIcons.length > 0) {
                currentX += iconTextGap;
            }
            
            // Draw after icons (preserving aspect ratio)
            afterIcons.forEach((item) => {
                if (item) {
                    ctx.drawImage(item.img, currentX, contentY - item.height / 2, item.width, item.height);
                    currentX += item.width + iconTextGap / 2;
                }
            });
        }

    } catch (error) {
        console.error("Failed to render to canvas:", error);
        ctx.fillStyle = "red";
        ctx.fillRect(0, 0, width, height);
        ctx.fillStyle = "white";
        ctx.font = "20px Arial";
        ctx.textAlign = "center";
        ctx.fillText("Error loading image", width / 2, height / 2);
    }
};

const generateThumbnailDataUrl = async (
    image: CampaignImage,
    campaign: Campaign,
    design: DesignSettings,
    brandAssets: BrandAssets,
    projectSize: string,
    currentUserPlan: 'Starter' | 'Creator' | 'ProFusion'
): Promise<string> => {
    const canvas = document.createElement('canvas');
    const [w, h] = projectSize.split('x').map(Number);
    const thumbWidth = 400;
    canvas.width = thumbWidth;
    canvas.height = thumbWidth * (h / w);
    const ctx = canvas.getContext('2d');
    if (!ctx) return image.src; // Fallback to raw image src

    try {
        await renderCampaignImageToCanvas(ctx, canvas.width, canvas.height, image, campaign, design, brandAssets, projectSize, currentUserPlan);
        return canvas.toDataURL('image/jpeg', 0.8);
    } catch (error) {
        console.warn("Thumbnail generation failed, using placeholder:", error);
        return generatePlaceholderThumbnail(canvas.width, canvas.height);
    }
};


const CanvasPreview: React.FC<{
    image: CampaignImage;
    campaign: Campaign;
    design: DesignSettings;
    brandAssets: BrandAssets;
    projectSize: string;
    currentUserPlan: 'Starter' | 'Creator' | 'ProFusion';
    className?: string;
    onClick?: (event: React.MouseEvent<HTMLCanvasElement>) => void;
    onDoubleClick?: (event: React.MouseEvent<HTMLCanvasElement>) => void;
}> = ({ image, campaign, design, brandAssets, projectSize, currentUserPlan, className, onClick, onDoubleClick }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [isImageLoaded, setIsImageLoaded] = useState(false);
    const [hasError, setHasError] = useState(false);

    // Pre-load the image independently of canvas mounting
    useEffect(() => {
        setIsImageLoaded(false);
        setHasError(false);
        
        const testImg = new Image();
        testImg.crossOrigin = 'anonymous';
        testImg.onload = () => {
            setIsImageLoaded(true);
            setHasError(false);
        };
        testImg.onerror = (err) => {
            console.error("Failed to load image for canvas:", image.src, err);
            setHasError(true);
            setIsImageLoaded(true);
        };
        testImg.src = image.src;

        return () => {
            testImg.onload = null;
            testImg.onerror = null;
        };
    }, [image.src]);

    // Handle canvas rendering once image is loaded
    useEffect(() => {
        if (!isImageLoaded || hasError) return;

        const canvas = canvasRef.current;
        const parent = canvas?.parentElement;
        if (!canvas || !parent) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        let animationFrameId: number;
        const resizeObserver = new ResizeObserver(entries => {
            animationFrameId = window.requestAnimationFrame(() => {
                if (!entries || entries.length === 0 || !Array.isArray(entries)) return;
                const entry = entries[0];
                if (!entry) return;
                const { width, height } = entry.contentRect;

                if (width === 0 || height === 0) return;

                canvas.width = width;
                canvas.height = height;

                renderCampaignImageToCanvas(ctx, canvas.width, canvas.height, image, campaign, design, brandAssets, projectSize, currentUserPlan)
                    .catch(err => {
                        console.error("Error rendering to canvas:", err);
                        setHasError(true);
                    });
            });
        });

        resizeObserver.observe(parent);

        return () => {
            window.cancelAnimationFrame(animationFrameId);
            resizeObserver.disconnect();
        }
    }, [image, campaign, design, brandAssets, projectSize, currentUserPlan, isImageLoaded, hasError]);

    // Show error state if image failed to load
    if (hasError) {
        return (
            <div className={`${className} flex items-center justify-center bg-slate-100 dark:bg-zinc-800`}>
                <div className="text-red-500 text-sm">Failed to load image</div>
            </div>
        );
    }

    return (
        <div className={`${className} relative`}>
            {!isImageLoaded && (
                <div className="absolute inset-0 flex items-center justify-center bg-slate-100 dark:bg-zinc-800 z-10">
                    <div className="text-slate-500 dark:text-zinc-400 text-sm">Loading image...</div>
                </div>
            )}
            <canvas 
                ref={canvasRef} 
                className={`w-full h-full ${!isImageLoaded ? 'opacity-0' : 'opacity-100'}`} 
                onClick={onClick} 
                onDoubleClick={onDoubleClick} 
            />
        </div>
    );
};


// +----------------------+
// | useHistory Hook      |
// +----------------------+
const useHistory = <T,>(initialState: T) => {
    const [history, setHistory] = useState<{ past: T[], present: T, future: T[] }>({
        past: [],
        present: initialState,
        future: [],
    });

    const canUndo = history.past.length > 0;
    const canRedo = history.future.length > 0;

    const undo = useCallback(() => {
        if (!canUndo) return;
        const previous = history.past[history.past.length - 1];
        const newPast = history.past.slice(0, history.past.length - 1);
        setHistory({
            past: newPast,
            present: previous,
            future: [history.present, ...history.future],
        });
    }, [canUndo, history]);

    const redo = useCallback(() => {
        if (!canRedo) return;
        const next = history.future[0];
        const newFuture = history.future.slice(1);
        setHistory({
            past: [...history.past, history.present],
            present: next,
            future: newFuture,
        });
    }, [canRedo, history]);

    const setState = useCallback((newStateOrFn: T | ((prevState: T) => T), fromHistory: boolean = false) => {
        const isFunction = (value: any): value is (prevState: T) => T => typeof value === 'function';
    
        if (fromHistory) {
            setHistory(h => ({
                ...h,
                present: isFunction(newStateOrFn) ? newStateOrFn(h.present) : newStateOrFn,
            }));
            return;
        }
    
        setHistory(currentHistory => {
            const newState = isFunction(newStateOrFn) ? newStateOrFn(currentHistory.present) : newStateOrFn;
    
            return {
                past: [...currentHistory.past, currentHistory.present],
                present: newState,
                future: [],
            };
        });
    }, []);
    
    const resetState = useCallback((newState: T) => {
        setHistory({
            past: [],
            present: newState,
            future: [],
        });
    }, []);

    
    return { state: history.present, setState, undo, redo, canUndo, canRedo, history, resetState };
};


// Helper to handle file reading and compression
const compressAndReadFile = (file: File): Promise<BrandAssetFile> => {
    return new Promise((resolve, reject) => {
        if (!file.type.startsWith('image/')) {
            const reader = new FileReader();
            reader.onload = () => resolve({ name: file.name, dataUrl: reader.result as string });
            reader.onerror = (error) => reject(error);
            reader.readAsDataURL(file);
            return;
        }

        const reader = new FileReader();
        reader.onload = (event) => {
            const img = new Image();
            img.src = event.target?.result as string;
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const MAX_WIDTH = 1024;
                const MAX_HEIGHT = 1024;
                let width = img.width;
                let height = img.height;

                if (width > height) {
                    if (width > MAX_WIDTH) {
                        height *= MAX_WIDTH / width;
                        width = MAX_WIDTH;
                    }
                } else {
                    if (height > MAX_HEIGHT) {
                        width *= MAX_HEIGHT / height;
                        height = MAX_HEIGHT;
                    }
                }
                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                if (!ctx) {
                    return reject(new Error('Failed to get canvas context'));
                }
                ctx.drawImage(img, 0, 0, width, height);
                const dataUrl = file.type === 'image/png' 
                    ? canvas.toDataURL('image/png') 
                    : canvas.toDataURL('image/jpeg', 0.8);
                resolve({ name: file.name, dataUrl });
            };
            img.onerror = reject;
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
};

// Helper to remove background from product images (for JPEG/PNG Fusion support)
const removeImageBackground = async (imageSource: string | File): Promise<string> => {
    try {
        console.log('Starting background removal...');
        
        // Convert File to Blob if necessary
        let blob: Blob;
        if (imageSource instanceof File) {
            blob = imageSource;
        } else {
            // Convert data URL to Blob
            const response = await fetch(imageSource);
            blob = await response.blob();
        }
        
        // Remove background using AI
        const resultBlob = await removeBackground(blob, {
            progress: (key, current, total) => {
                console.log(`Background removal progress: ${current}/${total} (${key})`);
            }
        });
        
        // Convert result to data URL
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.onerror = reject;
            reader.readAsDataURL(resultBlob);
        });
    } catch (error) {
        console.error('Background removal failed:', error);
        throw new Error('Failed to remove background. Please try a different image.');
    }
};

// +--------------------------+
// | New Helper Components    |
// +--------------------------+
const useTooltipState = (key: string): [boolean, () => void] => {
    const [isVisible, setIsVisible] = useState(() => !sessionStorage.getItem(key));

    const dismiss = useCallback(() => {
        sessionStorage.setItem(key, 'dismissed');
        setIsVisible(false);
    }, [key]);

    return [isVisible, dismiss];
};

// Onboarding Tooltip Component
const OnboardingTooltip = ({ 
    message, 
    isVisible, 
    onDismiss, 
    position = 'bottom',
    withAnimation = true 
}: { 
    message: string; 
    isVisible: boolean; 
    onDismiss: () => void; 
    position?: 'bottom' | 'top' | 'left' | 'right';
    withAnimation?: boolean;
}) => {
    if (!isVisible) return null;

    const positionClasses = {
        bottom: 'top-full mt-2 left-1/2 -translate-x-1/2',
        top: 'bottom-full mb-2 left-1/2 -translate-x-1/2',
        left: 'right-full mr-2 top-1/2 -translate-y-1/2',
        right: 'left-full ml-2 top-1/2 -translate-y-1/2'
    };

    return (
        <div 
            className={`absolute z-50 ${positionClasses[position]} ${withAnimation ? 'tooltip-animate bounce-animation' : 'tooltip-animate'}`}
            style={{ minWidth: '200px', maxWidth: '300px' }}
        >
            <div className="bg-blue-600 text-white text-sm px-4 py-3 rounded-lg shadow-lg relative">
                <button
                    onClick={onDismiss}
                    className="absolute -top-1 -right-1 w-5 h-5 bg-white text-blue-600 rounded-full flex items-center justify-center hover:bg-blue-50 transition-colors text-xs font-bold"
                    data-testid="button-dismiss-tooltip"
                    aria-label="Dismiss tooltip"
                >
                    ×
                </button>
                <div className="pr-4">{message}</div>
                {/* Arrow */}
                {position === 'bottom' && (
                    <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-0 h-0 border-l-8 border-r-8 border-b-8 border-transparent border-b-blue-600" />
                )}
                {position === 'top' && (
                    <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-0 h-0 border-l-8 border-r-8 border-t-8 border-transparent border-t-blue-600" />
                )}
                {position === 'right' && (
                    <div className="absolute -left-2 top-1/2 -translate-y-1/2 w-0 h-0 border-t-8 border-b-8 border-r-8 border-transparent border-r-blue-600" />
                )}
                {position === 'left' && (
                    <div className="absolute -right-2 top-1/2 -translate-y-1/2 w-0 h-0 border-t-8 border-b-8 border-l-8 border-transparent border-l-blue-600" />
                )}
            </div>
        </div>
    );
};

const InfoTooltip = ({
    isVisible,
    onDismiss,
    content,
    colorScheme,
    className = '',
}: {
    isVisible: boolean;
    onDismiss: () => void;
    content: string;
    colorScheme: 'yellow' | 'blue';
    className?: string;
}) => {
    if (!isVisible) return null;

    const colorStyles = {
        yellow: 'bg-amber-100 text-amber-800 dark:bg-amber-800/50 dark:text-amber-200 border border-amber-200 dark:border-amber-700/80',
        blue: 'bg-sky-100 text-sky-800 dark:bg-sky-800/50 dark:text-sky-200 border border-sky-200 dark:border-sky-700/80',
    };

    return (
        <div
            className={`flex items-center justify-between gap-4 w-full p-3 rounded-lg animate-fade-in-up z-10 ${colorStyles[colorScheme]} ${className}`}
            role="alert"
        >
            <div className="flex items-center gap-3">
                <span className="text-xl">💡</span>
                <p className="text-sm font-medium">{content}</p>
            </div>
            <button
                onClick={onDismiss}
                className="p-1 rounded-full hover:bg-black/10 dark:hover:bg-white/10 transition-colors"
                aria-label="Dismiss notification"
            >
                <IconX />
            </button>
        </div>
    );
};


// +----------------------+
// | ProjectsPage         |
// +----------------------+
const CanvasSizeCard: React.FC<{
    ratioLabel: string;
    size: string;
    title: string;
    description: string;
    isRecommended?: boolean;
    onClick: (size: string) => void;
}> = ({ ratioLabel, size, title, description, isRecommended, onClick }) => {
    
    const iconColors: { [key: string]: string } = {
        '12x12': 'bg-purple-200 dark:bg-purple-900',
        '9x12': 'bg-cyan-200 dark:bg-cyan-900',
        '16x9': 'bg-orange-200 dark:bg-orange-900',
        '9x16': 'bg-pink-200 dark:bg-pink-900',
    };
    
    const iconInnerColors: { [key: string]: string } = {
        '12x12': 'bg-purple-500',
        '9x12': 'bg-cyan-500',
        '16x9': 'bg-orange-500',
        '9x16': 'bg-pink-500',
    };

    const [width, height] = size.split('x').map(Number);
    const aspectRatio = width / height;

    const previewBase = 24; // Base size for the inner icon shape
    let previewWidth = previewBase;
    let previewHeight = previewBase;

    if (aspectRatio > 1) { // Landscape
        previewHeight = previewBase / aspectRatio;
    } else if (aspectRatio < 1) { // Portrait
        previewWidth = previewBase * aspectRatio;
    }

    return (
        <div
            onClick={() => onClick(size)}
            className="relative bg-white dark:bg-zinc-800/50 border border-slate-200 dark:border-zinc-700/80 rounded-xl p-5 text-left cursor-pointer transition-all duration-300 hover:shadow-lg hover:-translate-y-1"
        >
            {isRecommended && <div className="absolute top-4 right-4 bg-green-100 text-green-800 text-xs font-bold px-2.5 py-1 rounded-full z-10">RECOMMENDED</div>}
            
            <div className={`w-16 h-16 rounded-lg mb-6 flex items-center justify-center ${iconColors[size] || 'bg-slate-200'}`}>
                <div className={`${iconInnerColors[size] || 'bg-slate-500'} rounded-sm`} style={{ width: `${previewWidth}px`, height: `${previewHeight}px`}}></div>
            </div>

            <h3 className="font-bold text-md text-slate-800 dark:text-slate-100">{title}</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 mb-4 h-10">{description}</p>

            <div className="absolute bottom-5 left-5 bg-slate-100 dark:bg-zinc-700 text-slate-600 dark:text-slate-300 text-xs font-mono px-2 py-1 rounded">
                {ratioLabel}
            </div>
        </div>
    );
};

const ProjectCard: React.FC<{ project: Project; index: number; isLastOpened: boolean; onSelect: () => void; onDelete: () => void; }> = ({ project, index, isLastOpened, onSelect, onDelete }) => {
    const sizeLabel = PROJECT_SIZES.find(s => s.size === project.size)?.label || project.size;
    const shortName = project.name.split(' ').slice(0, 2).join(' ');
    const [videoPosterUrl, setVideoPosterUrl] = useState<string | null>(null);

    const projectGradients = [
        'from-purple-500 to-indigo-600',
        'from-rose-400 to-red-500',
        'from-amber-400 to-orange-500',
        'from-emerald-400 to-teal-500',
    ];
    const gradient = projectGradients[index % projectGradients.length];

    const headlineText = project.campaigns && project.campaigns.length > 0 && project.campaigns[0].headline 
        ? project.campaigns[0].headline
        : "A new project ready for amazing designs.";
    
    // Detect if project contains videos
    const isVideo = (img: any) => {
        return img.isVideo || 
               img.mediaType === 'video' || 
               isVideoUrl(img.src) || 
               isVideoUrl(img.videoUrl) ||
               (img.src && img.src.includes('.mp4'));
    };
    
    const hasVideos = project.campaigns?.some(campaign => 
        campaign.images?.some(isVideo)
    ) || project.savedImages?.some(isVideo);
    
    const videoCount = hasVideos ? (
        project.campaigns?.flatMap(c => c.images || []).filter(isVideo).length ||
        project.savedImages?.filter(isVideo).length || 1
    ) : 0;
    
    // Get first video for poster extraction
    const firstVideo = hasVideos ? (
        project.savedImages?.find(isVideo) || 
        project.campaigns?.flatMap(c => c.images || []).find(isVideo)
    ) : null;
    
    const firstVideoUrl = firstVideo ? (
        (firstVideo as any).videoUrl || (firstVideo as any).src
    ) : null;
    
    // Extract video poster frame using HTML5 video element
    useEffect(() => {
        if (!firstVideoUrl || videoPosterUrl) return;
        
        const extractPosterFrame = async () => {
            try {
                const video = document.createElement('video');
                video.crossOrigin = 'anonymous';
                video.preload = 'metadata';
                
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                
                video.onloadedmetadata = () => {
                    canvas.width = video.videoWidth;
                    canvas.height = video.videoHeight;
                    
                    // Seek to 0.5 seconds to get a good frame
                    video.currentTime = 0.5;
                };
                
                video.onseeked = () => {
                    if (ctx) {
                        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
                        const posterDataUrl = canvas.toDataURL('image/jpeg', 0.8);
                        setVideoPosterUrl(posterDataUrl);
                    }
                };
                
                video.onerror = () => {
                    console.warn('[POSTER] Failed to extract video poster frame');
                };
                
                video.src = firstVideoUrl;
            } catch (error) {
                console.warn('[POSTER] Error extracting video poster:', error);
            }
        };
        
        extractPosterFrame();
    }, [firstVideoUrl, videoPosterUrl]);
    
    // Unified preview URL: prioritize thumbnailUrl (if not a video), then video poster, then null (gradient)
    // 🎯 FIX: Exclude video URLs from being used as background images (they render as black screens)
    const previewUrl = project.thumbnailUrl && !isVideoUrl(project.thumbnailUrl) && (
        project.thumbnailUrl.startsWith('data:image') || 
        project.thumbnailUrl.startsWith('https://') || 
        project.thumbnailUrl.startsWith('/objects/')
    ) ? project.thumbnailUrl : (hasVideos && videoPosterUrl ? videoPosterUrl : null);
    
    const hasPreview = !!previewUrl;

    return (
        <div onClick={onSelect} className="group relative bg-white dark:bg-zinc-800 rounded-2xl shadow-lg shadow-slate-200/50 dark:shadow-black/20 hover:shadow-xl dark:hover:shadow-indigo-500/10 border border-slate-200 dark:border-zinc-700/80 cursor-pointer transition-all duration-300 hover:-translate-y-1">
            {isLastOpened && (
                <div className="absolute top-3 left-3 bg-[#0047FF] text-white text-[11px] font-medium uppercase px-2.5 py-1 rounded-lg z-10 shadow-lg drop-shadow-lg">
                    LAST OPENED
                </div>
            )}
             <div 
                className={`relative rounded-t-2xl overflow-hidden h-48 flex items-center justify-center p-4 bg-cover bg-center ${!hasPreview ? `bg-gradient-to-br ${gradient}` : ''}`}
                style={hasPreview ? { backgroundImage: `url(${previewUrl})` } : {}}
             >
                {!hasPreview && (
                    <h2 className="text-white text-4xl font-bold text-center drop-shadow-lg break-words">{shortName}</h2>
                )}
                
                {/* Video Indicator: Play Icon Overlay - Show for videos with preview */}
                {hasVideos && hasPreview && (
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <div className="bg-black/60 backdrop-blur-sm rounded-full p-4 shadow-2xl">
                            <Play className="w-12 h-12 text-white fill-white" />
                        </div>
                    </div>
                )}
                
                {/* Video Badge: Bottom-right corner */}
                {hasVideos && (
                    <div className="absolute bottom-2 right-2 bg-blue-600 text-white text-xs font-semibold px-2.5 py-1 rounded-md shadow-lg flex items-center gap-1.5">
                        <Play className="w-3.5 h-3.5 fill-white" />
                        <span>Video{videoCount > 1 ? ` (${videoCount})` : ''}</span>
                    </div>
                )}
            </div>
            <div className="p-4 rounded-b-2xl">
                <div className="flex items-start justify-between gap-2 mb-1">
                    <h3 className="font-bold text-lg text-slate-800 dark:text-slate-100 truncate flex-1">{project.name}</h3>
                    {project.source === 'community' && (
                        <span className="flex-shrink-0 flex items-center gap-1 bg-gradient-to-r from-blue-100 to-indigo-100 dark:from-blue-900/30 dark:to-indigo-900/30 text-blue-700 dark:text-blue-300 text-[10px] font-semibold px-2 py-0.5 rounded border border-blue-300 dark:border-blue-700" data-testid="badge-from-community">
                            <Bookmark className="w-3 h-3" />
                            From Community
                        </span>
                    )}
                </div>
                <p className="text-sm text-slate-500 dark:text-slate-400 h-10 overflow-hidden my-1">{headlineText}</p>
                <div className="flex justify-between items-center mt-2 text-xs text-slate-400 dark:text-slate-500">
                    <span className="bg-slate-100 dark:bg-zinc-700 px-2 py-1 rounded font-mono">{sizeLabel}</span>
                    <span>Modified: {project.lastModified}</span>
                </div>
            </div>
            <button
                className="group absolute top-3 right-3 w-8 h-8 flex items-center justify-center bg-black/40 hover:bg-red-600 rounded-full text-white opacity-0 group-hover:opacity-100 transition-all duration-200 z-10"
                onClick={(e) => {
                    e.stopPropagation();
                    onDelete();
                }}
                title="Delete this project"
                aria-label="Delete this project"
                data-testid={`button-delete-project-${project.id}`}
            >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 transition-transform duration-200 group-hover:scale-110" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
            </button>
        </div>
    );
};


const ProjectsPage = ({ projects, onSelectProject, onCreateNew, onNavigateToBrandKit, onNavigateToSubscription, onDeleteProject, lastOpenedProjectId, onNavigateToFeedback }: { projects: Project[]; onSelectProject: (project: Project) => void; onCreateNew: (size?: string) => void; onNavigateToBrandKit: () => void; onNavigateToSubscription: () => void; onDeleteProject: (id: string) => void; lastOpenedProjectId: string | null; onNavigateToFeedback?: () => void; }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [sortOrder, setSortOrder] = useState('Recently Updated');
    const [isStorageTipVisible, dismissStorageTip] = useTooltipState('dashboard-storage-tooltip');
    
    // First-time user onboarding detection
    const [isFirstTimeUser, setIsFirstTimeUser] = useState(() => !localStorage.getItem('aiMagicBox_hasSeenOnboarding'));
    const [showCreateProjectTip, setShowCreateProjectTip] = useState(isFirstTimeUser);
    const [showSubscriptionHover, setShowSubscriptionHover] = useState(false);
    
    // Feedback notification badge state
    const [hasNewFeedbackMessages, setHasNewFeedbackMessages] = useState(() => {
        return localStorage.getItem('hasNewFeedbackMessages') === 'true';
    });
    const [showFeedbackTooltip, setShowFeedbackTooltip] = useState(false);
    
    // Demo: Simulate new feedback message after 3 seconds
    useEffect(() => {
        const timer = setTimeout(() => {
            localStorage.setItem('hasNewFeedbackMessages', 'true');
            setHasNewFeedbackMessages(true);
        }, 3000);
        
        return () => clearTimeout(timer);
    }, []);
    
    // Listen for feedback read event from Settings modal
    useEffect(() => {
        const handleFeedbackRead = () => {
            setHasNewFeedbackMessages(false);
        };
        
        window.addEventListener('feedbackRead', handleFeedbackRead);
        return () => window.removeEventListener('feedbackRead', handleFeedbackRead);
    }, []);
    
    const handleBadgeClick = () => {
        // Clear notification immediately on click
        localStorage.removeItem('hasNewFeedbackMessages');
        setHasNewFeedbackMessages(false);
        
        // Navigate to feedback tab in Settings modal
        if (onNavigateToFeedback) {
            onNavigateToFeedback();
        }
    };
    
    const dismissOnboarding = useCallback(() => {
        localStorage.setItem('aiMagicBox_hasSeenOnboarding', 'true');
        setShowCreateProjectTip(false);
        setIsFirstTimeUser(false);
    }, []);

    const filteredAndSortedProjects = useMemo(() => {
        return projects
            .filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase()))
            .sort((a, b) => {
                if (sortOrder === 'Recently Updated') {
                    return new Date(b.lastModified).getTime() - new Date(a.lastModified).getTime();
                }
                return a.name.localeCompare(b.name);
            });
    }, [projects, searchTerm, sortOrder]);

    const canvasSizes = [
        { size: '12x12', label: '1:1', title: 'Square Canvas', description: 'Best for Instagram / Facebook posts.', recommended: true },
        { size: '9x12', label: '3:4', title: 'Portrait Canvas', description: 'Best for Pinterest / product photos.' },
        { size: '16x9', label: '16:9', title: 'Wide Canvas', description: 'Best for YouTube / web banners.' },
        { size: '9x16', label: '9:16', title: 'Story Canvas', description: 'Best for TikTok / Instagram Reels.' },
    ];
    
    return (
        <div className="min-h-screen bg-slate-50 dark:bg-zinc-900/95">
             <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex justify-between items-center py-6">
                    {/* Mobile: Hamburger Menu */}
                    <div className="md:hidden">
                        <MobileNav 
                            onNavigateToSubscription={onNavigateToSubscription}
                            onNavigateToBrandKit={onNavigateToBrandKit}
                        />
                    </div>

                    {/* Desktop: Logo (hidden on mobile) */}
                    <div className="hidden md:flex items-center gap-2 cursor-pointer" onClick={onNavigateToBrandKit} title="Go to Brand Kit">
                        <span className="font-bold text-xl brand-star">AI</span>
                        <span className="font-bold text-xl text-slate-700 dark:text-slate-200">MagicBox</span>
                    </div>

                    {/* Right side navigation */}
                    <div className="flex items-center gap-2 ml-auto">
                        {/* Create New Project button - visible on all screens */}
                        <div className="relative">
                            <button 
                                onClick={() => {
                                    onCreateNew();
                                    if (isFirstTimeUser) dismissOnboarding();
                                }} 
                                className={`bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-3 md:px-4 rounded-lg flex items-center transition-colors shadow-md hover:shadow-lg ${isFirstTimeUser ? 'glow-animation' : ''}`}
                                id="create-new-project-button"
                                data-testid="button-create-project"
                            >
                                <IconPlus />
                                <span className="ml-1 md:ml-2 text-sm md:text-base">Create New Project</span>
                            </button>
                            <OnboardingTooltip
                                message="💡 Tip: Start by creating your first project!"
                                isVisible={showCreateProjectTip && projects.length === 0}
                                onDismiss={dismissOnboarding}
                                position="bottom"
                                withAnimation={true}
                            />
                        </div>

                        {/* Desktop navigation items - hidden on mobile */}
                        <Link 
                            href="/community"
                            className="hidden md:flex laser-line-effect bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-bold py-2 px-4 rounded-lg items-center transition-colors shadow-md hover:shadow-lg"
                            data-testid="button-community"
                            title="Explore Community Showcase"
                        >
                            <Handshake className="h-5 w-5 mr-2" />
                            <span>Community</span>
                        </Link>
                        <div 
                            className="hidden md:block relative"
                            onMouseEnter={() => setShowSubscriptionHover(true)}
                            onMouseLeave={() => setShowSubscriptionHover(false)}
                        >
                            <button 
                                onClick={onNavigateToSubscription} 
                                className="w-10 h-10 flex items-center justify-center rounded-full bg-slate-200 dark:bg-zinc-800 text-slate-600 dark:text-slate-300 hover:bg-slate-300 dark:hover:bg-zinc-700 transition-colors rotate-on-hover" 
                                id="credit-card-icon"
                                data-testid="button-subscription"
                                title="Subscription"
                            >
                               💳
                            </button>
                            {showSubscriptionHover && (
                                <div className="absolute top-full mt-2 left-1/2 -translate-x-1/2 z-50 tooltip-animate" style={{ minWidth: '250px' }}>
                                    <div className="bg-slate-800 dark:bg-slate-700 text-white text-xs px-3 py-2 rounded-lg shadow-lg">
                                        View our subscription plans and unlock premium features.
                                        <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-0 h-0 border-l-8 border-r-8 border-b-8 border-transparent border-b-slate-800 dark:border-b-slate-700" />
                                    </div>
                                </div>
                            )}
                        </div>
                        <div className="hidden md:block">
                            <ThemeToggle />
                        </div>
                        <button onClick={onNavigateToBrandKit} className="hidden md:flex group w-10 h-10 items-center justify-center rounded-full bg-slate-200 dark:bg-zinc-800 text-slate-600 dark:text-slate-300 hover:bg-slate-300 dark:hover:bg-zinc-700 transition-colors" title="Settings">
                           <IconSettings />
                        </button>
                    </div>
                </div>
            </div>

            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-12">
                <header className="text-center pt-8 pb-12">
                    <div className="flex items-center justify-center gap-4 flex-wrap">
                        <h1 className="text-5xl font-extrabold chameleon-text">AI Marketing Assistant</h1>
                        {hasNewFeedbackMessages && (
                            <div className="relative inline-block">
                                <button
                                    onClick={handleBadgeClick}
                                    onMouseEnter={() => setShowFeedbackTooltip(true)}
                                    onMouseLeave={() => setShowFeedbackTooltip(false)}
                                    className="relative cursor-pointer notification-bell-bounce transition-transform hover:scale-110 active:scale-95"
                                    data-testid="badge-feedback-notification"
                                    aria-label="New messages from Magic Box team"
                                >
                                    <Bell className="w-7 h-7 text-[#FF4D4F] fill-[#FF4D4F]/20 animate-pulse" />
                                </button>
                                {showFeedbackTooltip && (
                                    <div className="absolute top-full mt-2 left-1/2 -translate-x-1/2 z-50 tooltip-animate whitespace-nowrap">
                                        <div className="bg-zinc-900 dark:bg-zinc-700 text-white text-xs px-3 py-2 rounded-lg shadow-lg">
                                            You have a new message or update from the Magic Box team.
                                            <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-0 h-0 border-l-8 border-r-8 border-b-8 border-transparent border-b-zinc-900 dark:border-b-zinc-700" />
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                    <p className="text-zinc-600 dark:text-zinc-400 mt-3">Trained on your brand. Designed for your business.</p>
                </header>

                <section className="text-center mb-16">
                     <div className="flex items-center justify-center gap-2">
                        <span className="text-2xl">🎨</span>
                        <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100">Select Your Canvas Size</h2>
                    </div>
                    <p className="text-zinc-600 dark:text-zinc-400 my-2 mb-8">Choose the image ratio you want to start designing.</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                        {canvasSizes.map(canvas => (
                            <CanvasSizeCard
                                key={canvas.size}
                                size={canvas.size}
                                ratioLabel={canvas.label}
                                title={canvas.title}
                                description={canvas.description}
                                isRecommended={canvas.recommended}
                                onClick={() => onCreateNew(canvas.size)}
                            />
                        ))}
                    </div>
                </section>
                
                <section>
                     <div className="mb-4">
                        <InfoTooltip
                            isVisible={isStorageTipVisible}
                            onDismiss={dismissStorageTip}
                            content="Images in My Projects are kept for 60 days. Make sure to download your favorites!"
                            colorScheme="yellow"
                        />
                    </div>
                    <div className="my-8 p-4 bg-white dark:bg-zinc-800/60 rounded-lg shadow-sm border border-slate-200 dark:border-zinc-700">
                        {/* Header with Title and Search */}
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
                            <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100">My Projects</h2>
                            <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
                                {/* Search Input */}
                                <div className="relative flex-1 sm:flex-initial sm:w-64">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                        <IconSearch />
                                    </div>
                                    <input
                                        type="text"
                                        placeholder="Search..."
                                        value={searchTerm}
                                        onChange={e => setSearchTerm(e.target.value)}
                                        className="w-full bg-slate-50 dark:bg-zinc-700 border border-slate-300 dark:border-zinc-600 rounded-lg pl-10 pr-4 py-2 focus:ring-2 focus:ring-blue-500 transition"
                                    />
                                </div>
                                {/* Sort Dropdown */}
                                <div className="flex items-center gap-2">
                                    <label htmlFor="sort-order" className="text-sm font-medium text-slate-600 dark:text-slate-300 hidden sm:block">Sort by</label>
                                    <select
                                        id="sort-order"
                                        value={sortOrder}
                                        onChange={e => setSortOrder(e.target.value)}
                                        className="w-full sm:w-auto bg-white dark:bg-zinc-700 border border-slate-300 dark:border-zinc-600 rounded-lg py-2 pl-3 pr-8 focus:ring-2 focus:ring-blue-500 transition"
                                    >
                                        <option>Recently Updated</option>
                                        <option>Alphabetical</option>
                                    </select>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">
                        {filteredAndSortedProjects.map((project: Project, index) => (
                            <ProjectCard 
                                key={project.id} 
                                project={project}
                                index={index}
                                isLastOpened={project.id === lastOpenedProjectId}
                                onSelect={() => onSelectProject(project)}
                                onDelete={() => onDeleteProject(project.id)}
                            />
                        ))}
                         {filteredAndSortedProjects.length === 0 && (
                            <div className="col-span-full text-center py-16 bg-white dark:bg-zinc-800/50 rounded-2xl border-2 border-dashed border-slate-300 dark:border-zinc-700">
                                <h3 className="text-xl font-semibold text-zinc-700 dark:text-zinc-200">No Projects Found</h3>
                                <p className="text-zinc-500 dark:text-zinc-400 mt-2">Start a new project by selecting a canvas size above.</p>
                            </div>
                         )}
                    </div>
                </section>
            </main>
        </div>
    );
};


// +----------------------+
// | Subscription Page    |
// +----------------------+
const SubscriptionPage = ({ onBack }: { onBack: () => void }) => {
    const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');

    const CheckIcon = () => (
        <div className="check-icon-container flex-shrink-0">
            <div className="check-icon-circle">
                <svg xmlns="http://www.w3.org/2000/svg" className="check-icon-svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
            </div>
        </div>
    );

    const Tooltip = ({ text, children }: { text: string, children: React.ReactNode }) => (
        <div className="relative flex items-center group">
            {children}
            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-72 p-3 bg-zinc-800 text-white text-xs rounded-lg shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none z-10">
                {text}
                <div className="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0 border-x-4 border-x-transparent border-t-4 border-t-zinc-800"></div>
            </div>
        </div>
    );
    
    return (
        <div className="min-h-screen bg-slate-50 dark:bg-zinc-900/95 text-slate-800 dark:text-slate-200">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                {/* Header */}
                 <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center py-6 gap-4">
                    <button onClick={onBack} className="flex items-center gap-2 text-sm font-semibold text-zinc-600 dark:text-zinc-300 hover:text-blue-600 dark:hover:text-blue-400 order-1">
                        <IconChevronLeft /> Back to Dashboard
                    </button>
                     <div className="flex items-center gap-2 cursor-pointer order-2 sm:order-1" onClick={onBack} title="Go to Dashboard">
                        <span className="font-bold text-xl brand-star">AI</span>
                        <span className="font-bold text-xl text-slate-700 dark:text-slate-200">MagicBox</span>
                    </div>
                    <div className="hidden sm:block order-3"></div>
                </div>
                {/* Page Title */}
                <header className="text-center pt-8 pb-12 px-4">
                    <h1 className="chameleon-title text-3xl sm:text-4xl lg:text-5xl font-extrabold leading-relaxed pb-2">Choose Your AI Magic Box Plan</h1>
                    <p className="text-zinc-600 dark:text-zinc-400 mt-3 text-base sm:text-lg">Unlock powerful AI tools with our flexible plans. Choose the right fit for you.</p>
                </header>

                {/* Billing Cycle Toggle */}
                <div className="flex flex-col sm:flex-row justify-center items-center gap-3 sm:gap-4 mb-12 px-4">
                    <span className={`text-sm sm:text-base font-semibold transition-colors ${billingCycle === 'monthly' ? 'text-blue-600' : 'text-zinc-500'}`}>Monthly</span>
                    <button onClick={() => setBillingCycle(prev => prev === 'monthly' ? 'yearly' : 'monthly')} className="relative inline-flex h-7 w-12 items-center rounded-full bg-slate-200 dark:bg-zinc-700 transition-colors">
                        <span className={`${billingCycle === 'monthly' ? 'translate-x-1' : 'translate-x-6'} inline-block h-5 w-5 transform rounded-full bg-white dark:bg-zinc-200 transition-transform`} />
                    </button>
                    <span className={`text-sm sm:text-base font-semibold transition-colors ${billingCycle === 'yearly' ? 'text-blue-600' : 'text-zinc-500'}`}>
                        Yearly <span className="text-emerald-500 text-xs sm:text-sm">(2 months free!)</span>
                    </span>
                </div>

                {/* Pricing Cards */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8 items-start px-4">
                    {/* Starter Plan */}
                    <div className="bg-white dark:bg-zinc-800/80 border border-slate-200 dark:border-zinc-700 rounded-xl shadow-lg p-8 h-full flex flex-col">
                        <h3 className="text-2xl font-bold text-slate-900 dark:text-white">Starter</h3>
                        <p className="text-zinc-500 dark:text-zinc-400 mt-2">For trying out the basics</p>
                        <p className="text-4xl font-bold my-6 text-slate-900 dark:text-white">RM0<span className="text-lg font-medium text-zinc-500">/month</span></p>
                        <ul className="space-y-4 text-zinc-600 dark:text-zinc-300 flex-grow">
                            <li className="flex items-center group"><CheckIcon /><span className="feature-text">100 image generations / month</span></li>
                            <li className="flex items-center group"><CheckIcon /><span className="feature-text">100 AI text generations / month</span></li>
                            <li className="flex items-center group"><CheckIcon /><span className="feature-text">Includes AI Magic Box watermark on generated visuals (non-commercial use only).</span></li>
                            <li className="flex items-center group"><CheckIcon /><span className="feature-text">Non-commercial use (with watermark)</span></li>
                        </ul>
                        <button className="mt-8 w-full bg-slate-200 dark:bg-zinc-700 text-slate-700 dark:text-slate-200 font-bold py-3 px-4 rounded-lg">Your Current Plan</button>
                    </div>

                    {/* Creator Plan */}
                    <div className="bg-white dark:bg-zinc-800/80 border-2 border-blue-500 rounded-xl shadow-2xl p-8 h-full flex flex-col relative overflow-hidden">
                         <div className="absolute top-0 right-0 bg-blue-500 text-white text-xs font-bold px-4 py-1 rounded-bl-lg">POPULAR</div>
                        <h3 className="text-2xl font-bold text-slate-900 dark:text-white">Creator</h3>
                        <p className="text-zinc-500 dark:text-zinc-400 mt-2">For professionals and businesses</p>
                        <p className="text-4xl font-bold my-6 text-slate-900 dark:text-white">
                            {billingCycle === 'monthly' ? 'RM189' : 'RM1,890'}
                            <span className="text-lg font-medium text-zinc-500">/{billingCycle === 'monthly' ? 'month' : 'year'}</span>
                        </p>
                        <ul className="space-y-4 text-zinc-600 dark:text-zinc-300 flex-grow">
                            <li className="flex items-center group"><CheckIcon /><span className="feature-text">200 image generations / month</span></li>
                            <li className="flex items-center group"><CheckIcon /><span className="feature-text">300 AI text generations / month</span></li>
                            <li className="flex items-center group"><CheckIcon /><span className="feature-text">No watermark. Suitable for professional and commercial use.</span></li>
                            <li className="flex items-center group">
                                <CheckIcon />
                                <span className="feature-text">
                                    <Tooltip text="ARRIIVAL SuperRate members get exclusive access to AI Magic Box Creator plan. Activate with your ARRIIVAL account to enjoy discounted shipping rates and AI content creation tools.">
                                        <span className="border-b border-dashed border-zinc-500 cursor-help">ARRIIVAL SuperRate integration</span>
                                    </Tooltip>
                                </span>
                            </li>
                            <li className="flex items-center group"><CheckIcon /><span className="feature-text">Option to upgrade to ProFusion (+RM30 / month)</span></li>
                        </ul>
                        <button className="mt-8 w-full bg-gradient-to-r from-blue-600 to-purple-700 hover:from-blue-700 hover:to-purple-800 text-white font-bold py-3 px-4 rounded-lg transition-all duration-300 shadow-lg hover:shadow-xl">Subscribe with Card</button>
                    </div>
                    
                    {/* ProFusion Plan */}
                    <div className="bg-white dark:bg-zinc-800/80 border border-slate-200 dark:border-zinc-700 rounded-xl shadow-lg p-8 h-full flex flex-col">
                        <h3 className="text-2xl font-bold text-slate-900 dark:text-white">ProFusion</h3>
                        <p className="text-zinc-500 dark:text-zinc-400 mt-2">For power users and teams</p>
                        <p className="text-4xl font-bold my-6 text-slate-900 dark:text-white">
                           {billingCycle === 'monthly' ? 'RM219' : 'RM2,190'}
                           <span className="text-lg font-medium text-zinc-500">/{billingCycle === 'monthly' ? 'month' : 'year'}</span>
                        </p>
                        <ul className="space-y-4 text-zinc-600 dark:text-zinc-300 flex-grow">
                            <li className="flex items-center group"><CheckIcon /><span className="feature-text">All Creator features included</span></li>
                            <li className="flex items-center group"><CheckIcon /><span className="feature-text">No watermark. Suitable for professional and commercial use.</span></li>
                            <li className="flex items-center group">
                                <CheckIcon />
                                <span className="feature-text">
                                    <Tooltip text="Fair usage policy applies to prevent system abuse and ensure availability for all users.">
                                        <span className="border-b border-dashed border-zinc-500 cursor-help">Unlimited generations</span>
                                    </Tooltip>
                                </span>
                            </li>
                            <li className="flex items-center group"><CheckIcon /><span className="feature-text">ARRIIVAL API support</span></li>
                            <li className="flex items-center group"><CheckIcon /><span className="feature-text">Priority rendering queue</span></li>
                        </ul>
                         <button className="chameleon-button mt-8 w-full py-3 px-4 rounded-lg">Subscribe with Card</button>
                    </div>
                </div>

                {/* ARRIIVAL Section */}
                <section className="max-w-3xl mx-auto mt-12 sm:mt-20 p-6 sm:p-8 bg-white dark:bg-zinc-800/80 border border-slate-200 dark:border-zinc-700 rounded-xl shadow-xl">
                    <div className="text-center">
                        <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white">ARRIIVAL SuperRate Monthly Activation</h2>
                        <p className="text-sm sm:text-base text-zinc-600 dark:text-zinc-400 mt-3 mb-6">ARRIIVAL SuperRate gives you access to exclusive discounted shipping rates for up to 300 parcels per month. If you are a SuperRate member, activate your AI Magic Box Creator plan using your ARRIIVAL account.</p>
                    </div>
                    <form className="space-y-4 sm:space-y-5 max-w-md mx-auto">
                        <div>
                            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Phone Number (Login ID)</label>
                            <input type="tel" placeholder="e.g., 0123456789" className="w-full bg-slate-100 dark:bg-zinc-700 border border-slate-300 dark:border-zinc-600 rounded-md p-3 text-zinc-900 dark:text-white placeholder-zinc-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none" />
                        </div>
                         <div>
                            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Password</label>
                            <input type="password" placeholder="••••••••" className="w-full bg-slate-100 dark:bg-zinc-700 border border-slate-300 dark:border-zinc-600 rounded-md p-3 text-zinc-900 dark:text-white placeholder-zinc-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none" />
                        </div>
                        <div className="pt-2">
                             <button type="submit" className="w-full bg-gradient-to-r from-blue-600 to-purple-700 hover:from-blue-700 hover:to-purple-800 text-white font-bold py-3 px-4 rounded-lg transition-all duration-300 shadow-lg hover:shadow-xl">
                                Verify & Activate
                            </button>
                        </div>
                    </form>
                    <div className="text-center mt-6">
                        <Tooltip text="Your Creator plan will remain active for 30 days—matching the active period of your ARRIIVAL SuperRate subscription. If your ARRIIVAL subscription expires, your AI Magic Box access will automatically pause until renewed.">
                             <span className="text-sm text-zinc-500 dark:text-zinc-400 border-b border-dashed border-zinc-500 cursor-help">How does this work?</span>
                        </Tooltip>
                    </div>
                </section>
                <div className="h-20"></div>
            </div>
        </div>
    );
};

// +----------------------+
// | Brand Kit Page       |
// +----------------------+

// --- Account Settings Tab ---
const AccountSettingsTab = ({ onSignOut, userApiKey, onSaveApiKey }: { onSignOut: () => void; userApiKey: string; onSaveApiKey: (key: string) => void }) => {
    const { toast } = useToast();
    const { user: authUser, refreshUser } = useAuth();
    const IconUser = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>;
    const IconLogOut = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>;
    const IconWarning = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>;
    const IconKey = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" /></svg>;
    const IconCheck = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>;
    const IconCamera = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" /></svg>;
    const IconTrash = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>;
    const IconLoader = () => <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>;
    
    const user = authUser;
    const [displayName, setDisplayName] = useState(user?.displayName || "");
    const [apiKey, setApiKey] = useState(userApiKey);
    const [apiKeyError, setApiKeyError] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const [isSavingName, setIsSavingName] = useState(false);
    const [saveSuccess, setSaveSuccess] = useState(false);
    const [saveError, setSaveError] = useState('');
    const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
    const [isHoveringAvatar, setIsHoveringAvatar] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    
    // Get user initials for avatar fallback
    const getUserInitials = () => {
        if (!user) return "?";
        if (user.displayName) {
            const names = user.displayName.trim().split(" ");
            if (names.length >= 2) {
                return `${names[0][0]}${names[names.length - 1][0]}`.toUpperCase();
            }
            return names[0].substring(0, 2).toUpperCase();
        }
        if (user.email) {
            return user.email.substring(0, 2).toUpperCase();
        }
        return "?";
    };
    
    // Sync local state with user updates
    useEffect(() => {
        setDisplayName(user?.displayName || "");
    }, [user?.displayName]);
    
    // Sync local state with prop updates
    useEffect(() => {
        setApiKey(userApiKey);
    }, [userApiKey]);
    
    const handleSaveApiKey = () => {
        setApiKeyError('');
        if (apiKey && !apiKey.startsWith('AIza')) {
            setApiKeyError('Invalid API Key format. It should start with "AIza".');
            return;
        }
        setIsSaving(true);
        onSaveApiKey(apiKey);
        setTimeout(() => setIsSaving(false), 500);
    };
    
    const handleSaveDisplayName = async () => {
        const trimmedName = displayName.trim();
        
        if (!trimmedName) {
            setSaveError('Display name cannot be empty');
            return;
        }
        
        if (trimmedName.length > 50) {
            setSaveError('Display name must be 50 characters or less');
            return;
        }
        
        setIsSavingName(true);
        setSaveError('');
        setSaveSuccess(false);
        
        try {
            // Update profile via API
            await apiRequest("POST", "/api/update-profile", { displayName: trimmedName });
            // Refresh user data to get updated displayName
            await refreshUser();
            setSaveSuccess(true);
            setTimeout(() => setSaveSuccess(false), 3000);
        } catch (error: any) {
            console.error('Error updating display name:', error);
            setSaveError(error.message || 'Failed to update display name. Please try again.');
        } finally {
            setIsSavingName(false);
        }
    };
    
    const handleAvatarClick = () => {
        fileInputRef.current?.click();
    };
    
    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        
        // Validate file type
        if (!file.type.match(/^image\/(jpeg|jpg|png)$/)) {
            alert('Invalid File Type. Please select a JPG or PNG image');
            return;
        }
        
        // Validate file size (5MB max)
        if (file.size > 5 * 1024 * 1024) {
            alert('File Too Large. Image size must be less than 5MB');
            return;
        }
        
        setIsUploadingPhoto(true);
        
        try {
            const reader = new FileReader();
            reader.onloadend = async () => {
                const base64Image = reader.result as string;
                
                try {
                    console.log('📤 Uploading profile image...');
                    const { url } = await apiRequest<{ url: string }>("POST", "/api/upload-profile-image", { imageData: base64Image });
                    console.log('✅ Upload successful, new URL:', url);
                    // Refresh user data to get updated photoURL
                    console.log('🔄 Calling refreshUser() to update auth context...');
                    await refreshUser();
                    console.log('✅ refreshUser() completed');
                    alert('Profile picture updated successfully!');
                } catch (error: any) {
                    console.error('❌ Error uploading profile image:', error);
                    alert('Upload Failed. Failed to upload profile image. Please try again.');
                } finally {
                    setIsUploadingPhoto(false);
                }
            };
            
            reader.onerror = () => {
                alert('Error. Failed to read the image file');
                setIsUploadingPhoto(false);
            };
            
            reader.readAsDataURL(file);
        } catch (error: any) {
            console.error('Error processing image:', error);
            alert('Error. Failed to process the image');
            setIsUploadingPhoto(false);
        }
        
        e.target.value = "";
    };
    
    const handleRemoveAvatar = async () => {
        setIsUploadingPhoto(true);
        try {
            // Call backend API to remove avatar
            await apiRequest("DELETE", "/api/user/profile-picture");
            // Refresh user data
            await refreshUser();
            alert('Profile picture removed. Your initials will be displayed instead.');
        } catch (error: any) {
            console.error('Error removing profile image:', error);
            alert('Remove Failed. Failed to remove profile image. Please try again.');
        } finally {
            setIsUploadingPhoto(false);
        }
    };
    
    const isNameChanged = displayName.trim() !== (user?.displayName || "");
    
    return (
        <div className="p-6 space-y-6">
            <div>
                <h2 className="text-2xl font-bold text-zinc-900 dark:text-white">Account Information</h2>
                <p className="text-zinc-600 dark:text-zinc-400 mt-1">Your account details</p>
            </div>
            
            {/* User Info Card */}
            <div className="bg-slate-50 dark:bg-zinc-800/50 border border-slate-200 dark:border-zinc-700 rounded-lg p-6">
                <div className="flex items-center gap-4 mb-6">
                    <div 
                        className="relative w-16 h-16"
                        onMouseEnter={() => setIsHoveringAvatar(true)}
                        onMouseLeave={() => setIsHoveringAvatar(false)}
                    >
                        <div className={`w-16 h-16 rounded-full ${user?.photoURL ? '' : 'bg-blue-100 dark:bg-blue-900/30'} flex items-center justify-center overflow-hidden cursor-pointer ${isHoveringAvatar ? 'ring-2 ring-blue-500' : ''}`} onClick={handleAvatarClick} data-testid="avatar-profile-picture">
                            {user?.photoURL ? (
                                <img src={user.photoURL} alt="Profile" className="w-16 h-16 rounded-full object-cover" />
                            ) : (
                                <span className="text-2xl font-bold text-blue-600 dark:text-blue-400">{getUserInitials()}</span>
                            )}
                        </div>
                        
                        {/* Hover Overlay */}
                        {isHoveringAvatar && !isUploadingPhoto && (
                            <div 
                                className="absolute inset-0 flex items-center justify-center bg-black/60 rounded-full cursor-pointer"
                                onClick={handleAvatarClick}
                                data-testid="overlay-change-avatar"
                            >
                                <span className="text-white text-xs font-semibold flex items-center gap-1">
                                    <IconCamera />
                                    Change
                                </span>
                            </div>
                        )}
                        
                        {/* Loading State */}
                        {isUploadingPhoto && (
                            <div className="absolute inset-0 flex items-center justify-center bg-black/70 rounded-full">
                                <IconLoader />
                            </div>
                        )}
                        
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/jpeg,image/png,image/jpg"
                            onChange={handleFileChange}
                            className="hidden"
                            data-testid="input-file-upload"
                        />
                    </div>
                    <div className="flex-1">
                        <h3 className="text-lg font-semibold text-zinc-900 dark:text-white">
                            {user?.displayName || "User"}
                        </h3>
                        <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-2">{user?.email}</p>
                        <div className="flex gap-2">
                            <button 
                                className="text-xs bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-medium py-1 px-3 rounded flex items-center gap-1"
                                onClick={handleAvatarClick}
                                disabled={isUploadingPhoto}
                                data-testid="button-upload-new-photo"
                            >
                                <IconCamera />
                                Upload
                            </button>
                            {user?.photoURL && (
                                <button 
                                    className="text-xs bg-red-600 hover:bg-red-700 disabled:bg-red-400 text-white font-medium py-1 px-3 rounded flex items-center gap-1"
                                    onClick={handleRemoveAvatar}
                                    disabled={isUploadingPhoto}
                                    data-testid="button-remove-avatar"
                                >
                                    <IconTrash />
                                    Remove
                                </button>
                            )}
                        </div>
                    </div>
                </div>
                
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-semibold text-zinc-700 dark:text-zinc-300 mb-1">Display Name</label>
                        <div className="flex gap-2">
                            <input
                                type="text"
                                value={displayName}
                                onChange={(e) => setDisplayName(e.target.value)}
                                placeholder="Enter your display name"
                                maxLength={50}
                                data-testid="input-display-name"
                                className="flex-1 bg-white dark:bg-zinc-900 border border-slate-300 dark:border-zinc-600 rounded-md p-2 text-zinc-900 dark:text-white"
                            />
                            <button
                                onClick={handleSaveDisplayName}
                                disabled={!isNameChanged || isSavingName}
                                data-testid="button-save-display-name"
                                className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-semibold py-2 px-6 rounded-md transition-colors flex items-center gap-2"
                            >
                                {isSavingName ? (
                                    <>
                                        <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                        </svg>
                                        Saving...
                                    </>
                                ) : (
                                    'Save'
                                )}
                            </button>
                        </div>
                        {saveSuccess && (
                            <div className="flex items-center gap-2 mt-2 text-sm text-green-600 dark:text-green-400" data-testid="message-save-success">
                                <IconCheck />
                                Display name updated successfully!
                            </div>
                        )}
                        {saveError && (
                            <div className="mt-2 text-sm text-red-600 dark:text-red-400" data-testid="message-save-error">
                                {saveError}
                            </div>
                        )}
                    </div>
                    <div>
                        <label className="block text-sm font-semibold text-zinc-700 dark:text-zinc-300 mb-1">Email Address</label>
                        <input
                            type="email"
                            value={user?.email || ""}
                            disabled
                            className="w-full bg-white dark:bg-zinc-900 border border-slate-300 dark:border-zinc-600 rounded-md p-2 text-zinc-900 dark:text-white"
                        />
                        <p className="text-xs text-zinc-500 mt-1">Email is managed through Firebase Authentication</p>
                    </div>
                    <div>
                        <label className="block text-sm font-semibold text-zinc-700 dark:text-zinc-300 mb-1">User ID</label>
                        <input
                            type="text"
                            value={user?.uid || ""}
                            disabled
                            className="w-full bg-white dark:bg-zinc-900 border border-slate-300 dark:border-zinc-600 rounded-md p-2 text-zinc-900 dark:text-white font-mono text-xs"
                        />
                    </div>
                </div>
            </div>

            {/* Sign Out Card */}
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/50 rounded-lg p-6 mb-6">
                <div className="flex items-start gap-3 mb-4">
                    <div className="text-red-600 dark:text-red-400 mt-0.5">
                        <IconWarning />
                    </div>
                    <div>
                        <h3 className="text-lg font-semibold text-red-900 dark:text-red-300">Account Actions</h3>
                        <p className="text-sm text-red-800 dark:text-red-400 mt-1">
                            Sign out of your account
                        </p>
                    </div>
                </div>
                
                <div className="bg-white dark:bg-zinc-900/50 border border-red-200 dark:border-red-800/30 rounded-lg p-4">
                    <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-4">
                        You can sign out of your account at any time. Your projects and data will be saved and available when you sign back in.
                    </p>
                    <button
                        onClick={onSignOut}
                        data-testid="button-sign-out-settings"
                        className="bg-red-600 hover:bg-red-700 text-white font-semibold py-2 px-6 rounded-lg transition-colors flex items-center gap-2"
                    >
                        <IconLogOut />
                        Sign Out
                    </button>
                </div>
            </div>
        </div>
    );
};

const SettingsPage = ({ onSaveBrandAssets, initialAssets, onBack, userApiKey, onSaveApiKey, onSignOut, initialTab }: { onSaveBrandAssets: (assets: BrandAssets) => void, initialAssets: BrandAssets, onBack?: () => void, userApiKey: string | null, onSaveApiKey: (key: string) => void, onSignOut: () => void, initialTab?: 'account' | 'brand-kit' | 'usage' | 'feedback' }) => {
    const [activeTab, setActiveTab] = useState<'account' | 'brand-kit' | 'usage' | 'feedback'>(initialTab || 'account');
    
    // Clear feedback notification when feedback tab is visited
    useEffect(() => {
        if (activeTab === 'feedback') {
            localStorage.removeItem('hasNewFeedbackMessages');
            window.dispatchEvent(new Event('feedbackRead'));
        }
    }, [activeTab]);

    return (
        <div className="fixed inset-0 bg-slate-500/30 flex items-center justify-center md:p-4 z-50 animate-fade-in" onClick={onBack}>
            <div className="bg-white dark:bg-zinc-900 w-full max-w-5xl md:rounded-2xl shadow-2xl relative h-full md:max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
                {onBack && (
                    <button onClick={onBack} className="absolute top-4 right-4 text-zinc-500 hover:text-black dark:hover:text-white transition-colors p-2 rounded-full hover:bg-slate-100 dark:hover:bg-zinc-800 z-20" title="Close">
                        <IconX />
                    </button>
                )}
                <header className="p-6 border-b border-slate-200 dark:border-zinc-800 flex-shrink-0">
                    <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">Settings</h1>
                    <div className="mt-4">
                        <div className="border-b border-slate-200 dark:border-zinc-700">
                            <nav className="-mb-px flex space-x-6" aria-label="Tabs">
                                <button
                                    onClick={() => setActiveTab('account')}
                                    className={`whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm transition-colors ${
                                        activeTab === 'account'
                                            ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                                            : 'border-transparent text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200 hover:border-zinc-300'
                                    }`}
                                    data-testid="tab-account"
                                >
                                    👤 Account
                                </button>
                                <button
                                    onClick={() => setActiveTab('brand-kit')}
                                    className={`whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm transition-colors ${
                                        activeTab === 'brand-kit'
                                            ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                                            : 'border-transparent text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200 hover:border-zinc-300'
                                    }`}
                                    data-testid="tab-brand-kit"
                                >
                                    🎨 Brand Kit
                                </button>
                                <button
                                    onClick={() => setActiveTab('usage')}
                                    className={`whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm transition-colors ${
                                        activeTab === 'usage'
                                            ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                                            : 'border-transparent text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200 hover:border-zinc-300'
                                    }`}
                                    data-testid="tab-usage"
                                >
                                    📊 AI Usage Summary
                                </button>
                                <button
                                    onClick={() => setActiveTab('feedback')}
                                    className={`whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm transition-colors ${
                                        activeTab === 'feedback'
                                            ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                                            : 'border-transparent text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200 hover:border-zinc-300'
                                    }`}
                                    data-testid="tab-feedback"
                                >
                                    💬 Feedback & Support
                                </button>
                            </nav>
                        </div>
                    </div>
                </header>
                <div className="overflow-y-auto flex-1">
                    {activeTab === 'account' && (
                        <AccountSettingsTab onSignOut={onSignOut} userApiKey={userApiKey || ''} onSaveApiKey={onSaveApiKey} />
                    )}
                    {activeTab === 'brand-kit' && (
                        <BrandKitEditor onSave={onSaveBrandAssets} initialAssets={initialAssets} />
                    )}
                    {activeTab === 'usage' && (
                        <AIUsageSummaryPage userApiKey={userApiKey} onSwitchToFeedback={() => setActiveTab('feedback')} />
                    )}
                    {activeTab === 'feedback' && (
                        <FeedbackTab />
                    )}
                </div>
            </div>
        </div>
    );
};

const BrandKitEditor = ({ onSave, initialAssets }: { onSave: (assets: BrandAssets) => void, initialAssets: BrandAssets }) => {
    const [assets, setAssets] = useState<BrandAssets>(initialAssets);
    const logoInputRef = useRef<HTMLInputElement>(null);

    const handleSave = () => {
        onSave(assets);
    };
    
    const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            const files = Array.from(e.target.files);
            const newLogos = await Promise.all(files.slice(0, 3 - assets.logos.length).map(compressAndReadFile));
            setAssets(prev => ({ ...prev, logos: [...prev.logos, ...newLogos]}));
        }
    };
    const removeLogo = (index: number) => {
        setAssets(prev => {
            const newLogos = prev.logos.filter((_, i) => i !== index);
            const newPrimaryIndex = prev.primaryLogoIndex >= index ? Math.max(0, prev.primaryLogoIndex - 1) : prev.primaryLogoIndex;
            return { ...prev, logos: newLogos, primaryLogoIndex: newLogos.length > 0 ? newPrimaryIndex : 0 };
        });
    };
    const setPrimaryLogo = (index: number) => setAssets(prev => ({ ...prev, primaryLogoIndex: index }));
    const handleColorChange = (index: number, color: string) => {
        setAssets(prev => ({...prev, colors: prev.colors.map((c, i) => i === index ? color : c)}));
    };
    const addColor = () => {
        if (assets.colors.length < 5) setAssets(prev => ({...prev, colors: [...prev.colors, '#FFFFFF']}));
    };
    const removeColor = (index: number) => setAssets(prev => ({ ...prev, colors: prev.colors.filter((_, i) => i !== index) }));
    const handleCategoryChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const newCategory = e.target.value;
        setAssets(prev => ({
            ...prev,
            businessCategory: newCategory,
            customBusinessCategory: newCategory !== 'Other' ? '' : prev.customBusinessCategory,
        }));
    };

    const isSaveDisabled = !assets.brandName || !assets.businessCategory || !assets.toneOfVoice || !assets.brandKeywords;
    
    const IconUpload = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>;
    const IconKey = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H5v-2H3v-2H1v-4a6 6 0 016-6h4a6 6 0 016 6z" /></svg>;

    return (
        <div className="p-6">
             <header className="mb-6">
                <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">Welcome! Let’s Set Up Your Brand Kit</h1>
                <p className="text-zinc-600 dark:text-zinc-400 mt-1">The AI can only create accurate on-brand designs if it learns from your brand context.</p>
            </header>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-8">
                <div className="space-y-6">
                    <div className="bg-slate-50 dark:bg-zinc-800/50 border border-slate-200 dark:border-zinc-700 rounded-lg p-4">
                        <label className="block text-md font-semibold text-zinc-800 dark:text-white mb-2">Upload Logo(s)</label>
                        <div className="grid grid-cols-3 gap-2 mb-2 min-h-[80px]">
                            {assets.logos.map((logo, index) => (
                                <div key={index} className="relative group">
                                    <img src={logo.dataUrl} alt={logo.name} className={`w-full h-20 object-contain rounded-lg checkerboard-bg p-1 cursor-pointer transition-all ${assets.primaryLogoIndex === index ? 'ring-2 ring-blue-500' : 'ring-1 ring-slate-300 hover:ring-blue-500'}`} onClick={() => setPrimaryLogo(index)} />
                                    {assets.primaryLogoIndex === index && <div className="absolute -top-1 -right-1 text-xs bg-blue-600 text-white rounded-full px-1.5 py-0.5 text-[10px]">Primary</div>}
                                    <button onClick={() => removeLogo(index)} className="absolute top-1 right-1 bg-black/50 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100"><IconX className="h-3 w-3" /></button>
                                </div>
                            ))}
                        </div>
                        <input type="file" ref={logoInputRef} onChange={handleLogoUpload} accept="image/png, image/jpeg" multiple className="hidden" />
                        {assets.logos.length < 3 && (
                            <>
                                <button onClick={() => logoInputRef.current?.click()} className="mt-2 w-full bg-transparent hover:bg-blue-500/10 text-blue-600 font-semibold py-2 px-4 rounded-lg flex items-center justify-center border border-blue-500" data-testid="button-upload-logo">
                                    <IconUpload /> Upload Logo(s)
                                </button>
                                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-2 flex items-center gap-1">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                    For best results, upload a PNG file with a transparent background.
                                </p>
                            </>
                        )}
                    </div>
                    <div>
                        <label className="block text-md font-semibold text-zinc-800 dark:text-white mb-2">Brand Colors</label>
                        <div className="flex flex-wrap items-center gap-3">
                            {assets.colors.map((color, index) => (
                                <div key={index} className="relative group" title={color.toUpperCase()}>
                                    <input type="color" value={color} onChange={(e) => handleColorChange(index, e.target.value)} className="w-16 h-16 p-1 border-2 border-slate-300 dark:border-zinc-700 rounded-md cursor-pointer appearance-none bg-slate-100" />
                                    <button onClick={() => removeColor(index)} className="absolute -top-1 -right-1 bg-zinc-600 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100"><IconX className="h-3 w-3" /></button>
                                </div>
                            ))}
                            {assets.colors.length < 5 && <button onClick={addColor} className="w-16 h-16 rounded-md bg-transparent border-2 border-dashed border-slate-300 hover:border-blue-500 flex items-center justify-center text-4xl text-slate-400">+</button>}
                        </div>
                    </div>
                </div>
                <div className="space-y-4">
                    <div>
                        <label className="block text-md font-semibold text-zinc-800 dark:text-white mb-2">Brand Name*</label>
                        <input type="text" value={assets.brandName} onChange={e => setAssets(prev => ({...prev, brandName: e.target.value}))} className="w-full bg-slate-100 dark:bg-zinc-800 border-2 border-slate-300 dark:border-zinc-700 rounded-md p-2 text-zinc-900 dark:text-white placeholder-zinc-400 focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 outline-none" placeholder="Your Company Name" />
                    </div>
                    <div>
                        <label className="block text-md font-semibold text-zinc-800 dark:text-white mb-2">Business Category*</label>
                        <select value={assets.businessCategory} onChange={handleCategoryChange} className="w-full bg-slate-100 dark:bg-zinc-800 border-2 border-slate-300 dark:border-zinc-700 rounded-md p-2 text-zinc-900 dark:text-white placeholder-zinc-400 focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 outline-none">
                            {BUSINESS_CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                        </select>
                        {assets.businessCategory === 'Other' && <input type="text" value={assets.customBusinessCategory} onChange={e => setAssets(prev => ({...prev, customBusinessCategory: e.target.value}))} className="mt-2 w-full bg-slate-100 dark:bg-zinc-800 border-2 border-slate-300 dark:border-zinc-700 rounded-md p-2 text-zinc-900 dark:text-white placeholder-zinc-400 focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 outline-none" placeholder="Please specify your industry" />}
                    </div>
                    <div>
                        <label className="block text-md font-semibold text-zinc-800 dark:text-white mb-2">Writing Tone*</label>
                        <select value={assets.toneOfVoice} onChange={e => setAssets(prev => ({...prev, toneOfVoice: e.target.value}))} className="w-full bg-slate-100 dark:bg-zinc-800 border-2 border-slate-300 dark:border-zinc-700 rounded-md p-2 text-zinc-900 dark:text-white placeholder-zinc-400 focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 outline-none">
                            {TONE_OF_VOICES.map(tone => <option key={tone} value={tone}>{tone}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="block text-md font-semibold text-zinc-800 dark:text-white mb-2">About Your Brand*</label>
                        <textarea value={assets.brandKeywords} onChange={e => setAssets(prev => ({...prev, brandKeywords: e.target.value}))} rows={3} className="w-full bg-slate-100 dark:bg-zinc-800 border-2 border-slate-300 dark:border-zinc-700 rounded-md p-2 text-zinc-900 dark:text-white placeholder-zinc-400 focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 outline-none" placeholder="e.g., We are a boutique hair salon offering organic treatments." />
                    </div>
                </div>
            </div>
            <div className="mt-8 flex justify-center pb-20">
                 <button 
                    onClick={handleSave} 
                    disabled={isSaveDisabled} 
                    className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-8 rounded-lg disabled:bg-blue-400 transition-colors shadow-lg z-10"
                    data-testid="button-save-brand-kit"
                >
                    💾 Save Brand Kit
                </button>
            </div>
        </div>
    );
};

// --- AI Usage Summary Page ---
const AIUsageSummaryPage = ({ userApiKey, onSwitchToFeedback }: { userApiKey: string | null, onSwitchToFeedback?: () => void }) => {
    const [summary, setSummary] = useState<UsageSummary | null>(null);
    const [loading, setLoading] = useState(true);
    const [currentPage, setCurrentPage] = useState(1);
    const logsPerPage = 10;
    
    const MONTHLY_COST_LIMIT = 5.00;

    useEffect(() => {
        setLoading(true);
        getUsageSummary('user-123', userApiKey).then(data => {
            setSummary(data);
            setLoading(false);
        }).catch(err => {
            console.error("Failed to get usage summary:", err);
            setLoading(false);
        });
    }, [userApiKey]);

    if (loading) {
        return <div className="p-6 text-center text-zinc-500 dark:text-zinc-400">Loading usage data...</div>;
    }

    if (!summary) {
        return <div className="p-6 text-center text-red-500">Could not load usage data.</div>;
    }
    
    const { totalGenerations, totalCost, apiSource, modelBreakdown, recentActivity } = summary;

    const paginatedLogs = recentActivity.slice((currentPage - 1) * logsPerPage, currentPage * logsPerPage);
    const totalPages = Math.ceil(recentActivity.length / logsPerPage);

    const usagePercentage = (totalCost / MONTHLY_COST_LIMIT) * 100;

    const renderWarningBanner = () => {
        if (usagePercentage >= 100) {
            return (
                <div className="p-4 mb-4 text-sm text-red-800 rounded-lg bg-red-100 dark:bg-red-900/50 dark:text-red-300" role="alert">
                    <span className="font-bold">🚫 You’ve reached 100% of your usage limit.</span> New generations are temporarily paused.
                </div>
            );
        }
        if (usagePercentage >= 80) {
             return (
                <div className="p-4 mb-4 text-sm text-yellow-800 rounded-lg bg-yellow-100 dark:bg-yellow-900/50 dark:text-yellow-300" role="alert">
                    <span className="font-bold">⚠️ You’ve reached {usagePercentage.toFixed(0)}% of your monthly AI usage limit.</span> Consider monitoring your usage.
                </div>
            );
        }
        return null;
    };

    const SummaryCard = ({ title, value, children }: { title: string, value?: string | number, children?: React.ReactNode }) => (
        <div className="bg-slate-50 dark:bg-zinc-800/80 p-4 rounded-lg border border-slate-200 dark:border-zinc-700">
            <h3 className="text-sm font-medium text-zinc-500 dark:text-zinc-400">{title}</h3>
            {children || <p className="text-2xl font-bold mt-1 text-zinc-900 dark:text-white">{value}</p>}
        </div>
    );

    const modelColors: { [key in AiModel]: string } = {
        'Gemini 2.5 Flash': '#4A90E2',
        'Imagen 4.0': '#50E3C2',
        'SDXL': '#F5A623',
        'Runware AI': '#9B59B6',
    };

    const totalModelCount = Object.values(modelBreakdown).reduce((sum, count) => sum + (count || 0), 0);

    return (
        <div className="p-6 space-y-6">
            <header>
                <h2 className="text-2xl font-bold text-zinc-900 dark:text-white">My AI Usage Summary</h2>
                <p className="text-zinc-600 dark:text-zinc-400 mt-1">Track your AI activity, generation counts, and estimated costs.</p>
            </header>
            
            {renderWarningBanner()}

            <InfoTooltip
                isVisible={true}
                onDismiss={() => {}}
                content={apiSource === 'User Key' ? "You are currently using your own Gemini API key. Costs are billed to your personal account." : "You are using the system’s shared key. Usage may be limited and billed by AI Magic Box."}
                colorScheme={apiSource === 'User Key' ? 'blue' : 'yellow'}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <SummaryCard title="Total Generations" value={totalGenerations} />
                <SummaryCard title="Estimated Total Cost" value={`$${totalCost.toFixed(4)}`} />
                <SummaryCard title="API Source" value={apiSource} />
                <SummaryCard title="Model Breakdown">
                    <div className="flex items-center gap-4 mt-2">
                        {totalModelCount > 0 ? (
                             <div className="w-16 h-16 rounded-full flex items-center justify-center relative" style={{background: `conic-gradient(${Object.entries(modelBreakdown).map(([model, count]) => `${modelColors[model as AiModel]} 0 ${((count || 0) / totalModelCount) * 360}deg`).join(', ')})`}}>
                                <div className="w-12 h-12 bg-white dark:bg-zinc-900 rounded-full" />
                            </div>
                        ) : <div className="w-16 h-16 rounded-full bg-slate-200 dark:bg-zinc-700"/>}
                        <div className="space-y-1 text-xs">
                            {Object.entries(modelColors).map(([model, color]) => (
                                <div key={model} className="flex items-center gap-2">
                                    <span className="w-2 h-2 rounded-full" style={{backgroundColor: color}}></span>
                                    <span>{model}: <strong>{modelBreakdown[model as AiModel] || 0}</strong></span>
                                </div>
                            ))}
                        </div>
                    </div>
                </SummaryCard>
            </div>
            
            <div>
                <h3 className="text-lg font-semibold mb-4 text-zinc-900 dark:text-white">Recent Activity</h3>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left text-zinc-500 dark:text-zinc-400">
                        <thead className="text-xs text-zinc-700 uppercase bg-slate-50 dark:bg-zinc-800 dark:text-zinc-400">
                            <tr>
                                <th scope="col" className="px-6 py-3">Date</th>
                                <th scope="col" className="px-6 py-3">Model</th>
                                <th scope="col" className="px-6 py-3">Feature</th>
                                <th scope="col" className="px-6 py-3">API Source</th>
                                <th scope="col" className="px-6 py-3 text-right">Usage</th>
                                <th scope="col" className="px-6 py-3 text-right">Cost</th>
                                <th scope="col" className="px-6 py-3">Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            {paginatedLogs.map((log) => (
                                <tr key={log.id} className="bg-white dark:bg-zinc-900 border-b dark:border-zinc-800">
                                    <td className="px-6 py-4 font-medium text-zinc-900 dark:text-white whitespace-nowrap">{new Date(log.timestamp).toLocaleString()}</td>
                                    <td className="px-6 py-4">{log.modelUsed}</td>
                                    <td className="px-6 py-4">{log.feature}</td>
                                    <td className="px-6 py-4">{log.apiSource}</td>
                                    <td className="px-6 py-4 text-right">{log.details.tokens ? `${log.details.tokens} tokens` : `${log.details.imageCount} image(s)`}</td>
                                    <td className="px-6 py-4 text-right">${log.estimatedCost.toFixed(5)}</td>
                                    <td className="px-6 py-4">
                                        <span className={`px-2 py-1 rounded-full text-xs font-semibold ${log.status === 'Success' ? 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300' : 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300'}`}>{log.status}</span>
                                    </td>
                                </tr>
                            ))}
                             {paginatedLogs.length === 0 && (
                                <tr>
                                    <td colSpan={7} className="text-center py-8">No recent activity to display.</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
                 {totalPages > 1 && (
                    <nav className="flex items-center justify-between pt-4" aria-label="Table navigation">
                        <span className="text-sm font-normal text-zinc-500 dark:text-zinc-400">Showing <span className="font-semibold text-zinc-900 dark:text-white">{(currentPage-1)*logsPerPage + 1}-{Math.min(currentPage*logsPerPage, recentActivity.length)}</span> of <span className="font-semibold text-zinc-900 dark:text-white">{recentActivity.length}</span></span>
                        <ul className="inline-flex items-center -space-x-px">
                            <li><button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="block px-3 py-2 ml-0 leading-tight text-zinc-500 bg-white border border-zinc-300 rounded-l-lg hover:bg-zinc-100 hover:text-zinc-700 disabled:opacity-50 dark:bg-zinc-800 dark:border-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-700 dark:hover:text-white">Prev</button></li>
                            <li><button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="block px-3 py-2 leading-tight text-zinc-500 bg-white border border-zinc-300 rounded-r-lg hover:bg-zinc-100 hover:text-zinc-700 disabled:opacity-50 dark:bg-zinc-800 dark:border-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-700 dark:hover:text-white">Next</button></li>
                        </ul>
                    </nav>
                )}
            </div>

            {/* Feedback & Support Call-to-Action */}
            {onSwitchToFeedback && (
                <div className="bg-gradient-to-br from-blue-50 to-transparent dark:from-blue-950/30 border-2 border-blue-200 dark:border-blue-800 rounded-lg p-6">
                    <div className="flex items-start gap-4">
                        <div className="flex-shrink-0 w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center">
                            💬
                        </div>
                        <div className="flex-1">
                            <h3 className="font-semibold text-base text-zinc-900 dark:text-white mb-1">Feedback & Support</h3>
                            <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-3">
                                Help us improve AI MagicBox! Share your feedback, report bugs, or ask questions.
                            </p>
                            <button 
                                onClick={onSwitchToFeedback}
                                data-testid="button-go-to-feedback"
                                className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors text-sm flex items-center gap-2"
                            >
                                💬 Go to Feedback & Support
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

// --- Feedback Tab ---
const FeedbackTab = () => {
    return (
        <div className="p-6">
            <header className="mb-6">
                <h2 className="text-2xl font-bold text-zinc-900 dark:text-white">Feedback & Support</h2>
                <p className="text-zinc-600 dark:text-zinc-400 mt-1">Share your thoughts, report issues, or get help from the AI MagicBox team</p>
            </header>
            
            {/* Latest Updates Message Center */}
            <MessageCenter />
            
            {/* Divider */}
            <div className="mb-6 border-t border-slate-200 dark:border-zinc-700" />
            
            {/* Feedback Form */}
            <FeedbackForm />
        </div>
    );
};

// +----------------------+
// | SelectSizeModal      |
// +----------------------+
const SizeOptionCard: React.FC<{ size: string, label: string, isSelected: boolean, onSelect: () => void }> = ({ size, label, isSelected, onSelect }) => {
    const [width, height] = size.split('x').map(Number);
    const aspectRatio = width / height;

    const previewBase = 80;
    const previewWidth = aspectRatio >= 1 ? previewBase : previewBase * aspectRatio;
    const previewHeight = aspectRatio < 1 ? previewBase : previewBase / aspectRatio;

    return (
        <div
            onClick={onSelect}
            className={`rounded-lg border-2 cursor-pointer transition-all duration-200 p-4 flex items-center justify-center h-40
                ${isSelected
                    ? 'bg-blue-50 dark:bg-blue-900/30 border-blue-500 shadow-lg'
                    : 'bg-white dark:bg-zinc-800/50 border-slate-300 dark:border-zinc-700 hover:border-blue-400 hover:bg-slate-50 dark:hover:bg-zinc-700/80'
                }`
            }
        >
            <div
                className="bg-indigo-600 rounded-lg flex items-center justify-center text-white font-semibold text-lg"
                style={{
                    width: `${previewWidth}px`,
                    height: `${previewHeight}px`,
                }}
            >
                {label}
            </div>
        </div>
    );
};

const SelectSizeModal = ({ onConfirm, onClose, preselectedSize }: { onConfirm: (size: string, name: string) => void, onClose: () => void, preselectedSize?: string }) => {
    const [selectedSize, setSelectedSize] = useState<string>(preselectedSize || PROJECT_SIZES[0].size);
    const [projectName, setProjectName] = useState('');

    return (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 animate-fade-in p-0 md:p-4" onClick={onClose}>
            <div className="bg-white dark:bg-zinc-900 md:rounded-2xl shadow-2xl p-6 sm:p-8 w-full max-w-2xl h-full md:h-auto md:max-h-[90vh] overflow-y-auto flex flex-col" onClick={e => e.stopPropagation()}>
                <h2 className="text-xl sm:text-2xl font-bold mb-4 text-zinc-900 dark:text-white text-center">Create New Project</h2>
                <div className="mb-6">
                    <label htmlFor="project-name" className="block text-left text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">Project Name</label>
                    <input
                        type="text"
                        id="project-name"
                        value={projectName}
                        onChange={(e) => setProjectName(e.target.value)}
                        placeholder="e.g., December Tissue Ad Campaign"
                        className="w-full bg-slate-100 dark:bg-zinc-800 border border-slate-300 dark:border-zinc-700 rounded-md p-3 text-zinc-900 dark:text-white placeholder-zinc-400 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                        autoFocus
                    />
                </div>
                {!preselectedSize && (
                    <>
                        <p className="text-center text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-4">Select image size</p>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 mb-8">
                            {PROJECT_SIZES.map(option => (
                                <SizeOptionCard
                                    key={option.size}
                                    size={option.size}
                                    label={option.label}
                                    isSelected={selectedSize === option.size}
                                    onSelect={() => setSelectedSize(option.size)}
                                />
                            ))}
                        </div>
                    </>
                )}
                <div className="text-center mt-auto pt-4">
                    <button
                        onClick={() => {
                            if (selectedSize && projectName.trim()) {
                                onConfirm(selectedSize, projectName.trim());
                            }
                        }}
                        disabled={!selectedSize || !projectName.trim()}
                        className="w-full sm:w-auto bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-8 sm:px-12 rounded-lg transition-colors disabled:bg-slate-400 disabled:cursor-not-allowed"
                    >
                        Continue
                    </button>
                </div>
            </div>
        </div>
    );
};


// +----------------------+
// | Unsaved Changes Modal|
// +----------------------+
const UnsavedChangesModal = ({ onCancel, onSave, onLeave }: { onCancel: () => void, onSave: () => void, onLeave: () => void }) => {
    return (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 animate-fade-in">
            <div className="bg-white dark:bg-zinc-800 rounded-lg shadow-2xl p-8 w-full max-w-md m-4">
                <h2 className="text-xl font-bold mb-4 text-zinc-900 dark:text-white">Unsaved Changes</h2>
                <p className="text-zinc-600 dark:text-zinc-400 mb-6">You have unsaved changes. Do you want to save your project before leaving?</p>
                <div className="flex justify-end gap-4">
                    <button onClick={onCancel} className="px-4 py-2 bg-slate-200 dark:bg-zinc-700 text-zinc-800 dark:text-white rounded-md hover:bg-slate-300 dark:hover:bg-zinc-600 transition-colors">Cancel</button>
                    <button onClick={onLeave} className="px-4 py-2 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/50 rounded-md transition-colors">Leave without Saving</button>
                    <button onClick={onSave} className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors">Save & Exit</button>
                </div>
            </div>
        </div>
    );
};

// +----------------------+
// | AlignmentGridOverlay |
// +----------------------+
const AlignmentGridOverlay = ({ visible }: { visible: boolean }) => {
    if (!visible) return null;

    const lineStyle = "absolute bg-red-500/50";
    const paddingLineStyle = "absolute bg-cyan-500/50";

    return (
        <div className="absolute inset-0 pointer-events-none z-50">
            {/* Main content block guide (top) */}
            <div className={`${lineStyle} top-[25%] w-full h-px`}><span className="text-red-500 text-[10px] bg-black/50 p-0.5 rounded">Title Baseline</span></div>
            {/* CTA block guide (bottom) */}
            <div className={`${lineStyle} bottom-12 w-full h-px`}><span className="text-red-500 text-[10px] bg-black/50 p-0.5 rounded">CTA Baseline</span></div>
            {/* Vertical Center Line */}
            <div className={`${lineStyle} left-1/2 h-full w-px`}></div>
            {/* Logo & Padding Guides */}
            <div className={`${paddingLineStyle} top-6 left-6 h-full w-px`}></div>
            <div className={`${paddingLineStyle} top-6 left-0 w-full h-px`}></div>
            <div className={`${paddingLineStyle} top-0 right-6 h-full w-px`}></div>
            <div className={`${paddingLineStyle} bottom-6 left-0 w-full h-px`}></div>
        </div>
    );
};


// +----------------------+
// | EnlargedPreviewModal |
// +----------------------+
const EnlargedPreviewModal = ({ 
    previewData, 
    brandAssets, 
    onClose, 
    showAlignmentGrid,
    projectSize,
    getEffectiveDesign,
    currentUserPlan
} : { 
    previewData: { campaign: Campaign, image: CampaignImage },
    brandAssets: BrandAssets,
    onClose: () => void,
    showAlignmentGrid: boolean;
    projectSize: string;
    getEffectiveDesign: (image: CampaignImage) => DesignSettings;
    currentUserPlan: 'Starter' | 'Creator' | 'ProFusion';
}) => {
    const { campaign, image } = previewData;
    const effectiveDesign = getEffectiveDesign(image);
    const [isZooming, setIsZooming] = useState(true);

    useEffect(() => {
        const handleEsc = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                onClose();
            }
        };
        window.addEventListener('keydown', handleEsc);

        // Trigger zoom-in animation after mount
        const timer = setTimeout(() => setIsZooming(false), 50);

        return () => {
            window.removeEventListener('keydown', handleEsc);
            clearTimeout(timer);
        };
    }, [onClose]);

    return (
        <div 
            className="fixed inset-0 bg-black/80 flex items-center justify-center z-[100] p-4 lg:p-8 transition-opacity duration-300"
            style={{ opacity: 1 }}
            onClick={onClose}
        >
            <div className="relative w-full h-full flex items-center justify-center min-w-0">
                <div 
                    className="relative shadow-2xl bg-black transition-all duration-300 ease-out transform"
                    style={{ 
                        aspectRatio: projectSize.replace('x', ' / '),
                        height: '90%',
                        maxWidth: '100%',
                        transform: isZooming ? 'scale(0.9)' : 'scale(1)',
                        opacity: isZooming ? 0 : 1
                    }}
                    onClick={e => e.stopPropagation()}
                >
                    <CanvasPreview
                       image={image}
                       campaign={campaign}
                       design={effectiveDesign}
                       brandAssets={brandAssets}
                       projectSize={projectSize}
                       currentUserPlan={currentUserPlan}
                       className="w-full h-full rounded-lg"
                    />
                    <AlignmentGridOverlay visible={showAlignmentGrid} />
                </div>
            </div>
        </div>
    );
};


// +---------------------------------------------------+
// | EditorPage Stateless Helper Components & Icons    |
// +---------------------------------------------------+
const IconMoon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" /></svg>;
const IconSettings = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 transition-transform duration-300 group-hover:rotate-90" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
    <circle cx="12" cy="12" r="3"></circle>
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06-.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
</svg>;
const IconPlus = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m6-6H6" /></svg>;
const IconSearch = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-slate-400 dark:text-slate-500" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" /></svg>;
const IconX = ({ className = "h-5 w-5" }: { className?: string }) => <svg xmlns="http://www.w3.org/2000/svg" className={className} viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" /></svg>;
const IconDownload = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>;
const IconTrash = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>;
const IconSave = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1.5" viewBox="0 0 20 20" fill="currentColor"><path d="M7.707 10.293a1 1 0 10-1.414 1.414l3 3a1 1 0 001.414 0l3-3a1 1 0 00-1.414-1.414L11 11.586V6h5a2 2 0 012 2v7a2 2 0 01-2-2H4a2 2 0 01-2-2V8a2 2 0 012-2h5v5.586l-1.293-1.293zM9 4a1 1 0 012 0v2H9V4z" /></svg>;
const IconUndo = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 15l-3-3m0 0l3-3m-3 3h8a5 5 0 000-10H9" /></svg>;
const IconRedo = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 15l3-3m0 0l-3-3m3 3H8a5 5 0 000 10h3" /></svg>;
const IconCheck = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-white" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>;
const IconGridView = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M5 3a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2V5a2 2 0 00-2-2H5zM5 11a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2v-2a2 2 0 00-2-2H5zM11 5a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V5zM11 13a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" /></svg>;
const IconLargeView = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M3 3a1 1 0 00-1 1v12a1 1 0 102 0V4a1 1 0 00-1-1zm3 1a1 1 0 00-1 1v10a1 1 0 102 0V5a1 1 0 00-1-1zm3 0a1 1 0 00-1 1v10a1 1 0 102 0V5a1 1 0 00-1-1zm3 0a1 1 0 00-1 1v10a1 1 0 102 0V5a1 1 0 00-1-1zm3 0a1 1 0 00-1 1v10a1 1 0 102 0V5a1 1 0 00-1-1z" transform="rotate(90 10 10)" /></svg>;
const IconLightbulb = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M10 2a6 6 0 00-6 6c0 1.94 1.153 3.613 2.863 4.542.493.262.744.787.744 1.352v.16c0 .393.228.753.585.918a2.502 2.502 0 003.616 0c.357-.165.585-.525.585-.918v-.16c0-.565.251-1.09.744-1.352A5.993 5.993 0 0016 8a6 6 0 00-6-6zM8 17a1 1 0 112 0 1 1 0 01-2 0z" /></svg>;
const IconScissors = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M14.121 14.121L19 19m-7-7l7-7m-7 7l-2.879 2.879M12 12L9.121 9.121m0 5.758a3 3 0 10-4.243 4.243 3 3 0 004.243-4.243zm0-5.758a3 3 0 10-4.243-4.243 3 3 0 004.243 4.243z" />
    </svg>
);

const MagicWandIcon = ({ className = "w-5 h-5" }: { className?: string }) => (
    <Wand2 className={className} />
);
const IconSlidersHorizontal = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="21" x2="14" y1="4" y2="4"></line><line x1="10" x2="3" y1="4" y2="4"></line><line x1="21" x2="12" y1="12" y2="12"></line><line x1="8" x2="3" y1="12" y2="12"></line><line x1="21" x2="16" y1="20" y2="20"></line><line x1="12" x2="3" y1="20" y2="20"></line><line x1="14" x2="14" y1="2" y2="6"></line><line x1="8" x2="8" y1="10" y2="14"></line><line x1="16" x2="16" y1="18" y2="22"></line></svg>;
const IconTextAlignLeft = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M2 5a1 1 0 011-1h14a1 1 0 110 2H3a1 1 0 01-1-1zm0 4a1 1 0 011-1h14a1 1 0 110 2H3a1 1 0 01-1-1zm0 4a1 1 0 011-1h14a1 1 0 110 2H3a1 1 0 01-1-1z" clipRule="evenodd" /></svg>;
const IconTextAlignCenter = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M2 5a1 1 0 011-1h14a1 1 0 110 2H3a1 1 0 01-1-1zM5 9a1 1 0 011-1h8a1 1 0 110 2H6a1 1 0 01-1-1zm-1 4a1 1 0 100 2h12a1 1 0 100-2H4z" clipRule="evenodd" /></svg>;
const IconTextAlignRight = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M2 5a1 1 0 011-1h14a1 1 0 110 2H3a1 1 0 01-1-1zm0 4a1 1 0 011-1h14a1 1 0 110 2H3a1 1 0 01-1-1zm0 4a1 1 0 011-1h14a1 1 0 110 2H3a1 1 0 01-1-1z" clipRule="evenodd" transform="scale(-1, 1) translate(-20, 0)"/></svg>;
const IconVerticalAlignTop = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path d="M10 3a1 1 0 011 1v12a1 1 0 11-2 0V4a1 1 0 011-1zM3 5a1 1 0 011-1h.01a1 1 0 110 2H4a1 1 0 01-1-1zm13 0a1 1 0 011-1h.01a1 1 0 110 2H17a1 1 0 01-1-1z" transform="rotate(90 10 10)"/></svg>;
const IconVerticalAlignCenter = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path d="M10 3a1 1 0 011 1v12a1 1 0 11-2 0V4a1 1 0 011-1zM3 9a1 1 0 011-1h.01a1 1 0 110 2H4a1 1 0 01-1-1zm13 0a1 1 0 011-1h.01a1 1 0 110 2H17a1 1 0 01-1-1z" transform="rotate(90 10 10)"/></svg>;
const IconVerticalAlignBottom = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path d="M10 3a1 1 0 011 1v12a1 1 0 11-2 0V4a1 1 0 011-1zM3 13a1 1 0 011-1h.01a1 1 0 110 2H4a1 1 0 01-1-1zm13 0a1 1 0 011-1h.01a1 1 0 110 2H17a1 1 0 01-1-1z" transform="rotate(90 10 10)"/></svg>;
const IconChevronLeft = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>;
const IconChevronRight = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>;
const IconRegenerate = () => <img src={regenerateIconWhite} alt="Regenerate" className="h-5 w-5" />;
const IconCopy = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>;
const IconPointer = () => <svg xmlns="http://www.w3.org/2000/svg" className="mx-auto h-8 w-8 text-zinc-400 dark:text-zinc-500 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M15.042 21.672L13.684 16.6m0 0l-2.51 2.225.569-9.47 5.227 7.917-3.286-.672zm-7.518-.267A8.25 8.25 0 1120.25 10.5M8.288 14.212A5.25 5.25 0 1117.25 10.5" /></svg>;
type LogoPosition = DesignSettings['logoPosition'];
const LogoPositionIcon = ({ position }: { position: LogoPosition }) => {
    const classes: {[key in LogoPosition]: string} = {
        'top-left': 'top-0 left-0', 'top-right': 'top-0 right-0',
        'bottom-left': 'bottom-0 left-0', 'bottom-right': 'bottom-0 right-0',
        'bottom-center': 'bottom-0 left-1/2 -translate-x-1/2',
        'center': 'top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2'
    }
    return <div className="w-5 h-5 border border-current relative"><div className={`absolute w-1.5 h-1.5 bg-current rounded-full ${classes[position]}`}></div></div>
};
const IconScene = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>;
const IconProduct = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg>;
const IconSidebarToggle = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
        <line x1="15" y1="3" x2="15" y2="21" />
    </svg>
);


type TextSettingsEditorProps = {
    title: string;
    settings: TextSettings;
    onChange: (newSettings: Partial<TextSettings>) => void;
    isActive: boolean;
    onActivate: () => void;
    isExpanded: boolean;
    onToggleExpand: () => void;
    isSubheadline?: boolean;
    hidePositionControl?: boolean;
};

const TextSettingsEditor: React.FC<TextSettingsEditorProps> = ({
    title,
    settings,
    onChange,
    isActive,
    onActivate,
    isExpanded,
    onToggleExpand,
    isSubheadline = false,
    hidePositionControl = false
}) => {

    const handleSettingChange = (field: keyof TextSettings, value: string | number | boolean | undefined) => {
        onChange({ [field]: value });
    };

    const ChevronDownIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>);

    return (
        <div
            className={`p-3 rounded-lg transition-all duration-200 cursor-pointer ${isActive ? 'bg-blue-50 dark:bg-blue-900/20 ring-2 ring-blue-500' : 'bg-slate-100 dark:bg-zinc-700/50 hover:bg-slate-200 dark:hover:bg-zinc-700'}`}
            onClick={onActivate}
        >
            <p className="text-sm font-semibold text-zinc-800 dark:text-slate-100">{title}</p>
            <div className="space-y-2 mt-2">
                <div className="flex items-center justify-between">
                    <label className="text-sm text-zinc-800 dark:text-slate-100">Font</label>
                    <div className="flex items-center gap-2">
                      <select value={settings.fontFamily} onChange={e => handleSettingChange('fontFamily', e.target.value)} className="bg-white dark:bg-zinc-600 text-sm border-slate-300 dark:border-zinc-500 rounded-md p-1 w-28">
                          <option>Inter</option><option>Georgia</option><option>Arial</option><option>Courier New</option>
                      </select>
                      <input type="color" value={settings.fontColor} onChange={e => handleSettingChange('fontColor', e.target.value)} className="w-8 h-8 p-0 border-none rounded-md cursor-pointer bg-transparent"/>
                    </div>
                </div>
                <div className="flex items-center justify-between">
                    <label className="text-sm text-zinc-800 dark:text-slate-100">Font Size</label>
                    <div className="flex items-center gap-2 w-2/3">
                        <input type="range" min="12" max="48" value={settings.fontSize} onChange={(e) => handleSettingChange('fontSize', Number(e.target.value))} className="w-full h-1 bg-slate-200 dark:bg-zinc-600 rounded-lg appearance-none cursor-pointer" />
                        <span className="text-sm w-10 text-center font-mono bg-white dark:bg-zinc-800 rounded-md p-1">{settings.fontSize}</span>
                    </div>
                </div>
                <div className="flex items-center justify-between">
                    <label className="text-sm text-zinc-800 dark:text-slate-100">Align</label>
                    <div className="flex items-center gap-1">
                        <button title="Align Left" onClick={() => handleSettingChange('textAlign', 'left')} className={`p-1.5 rounded-md ${settings.textAlign === 'left' ? 'bg-blue-600 text-white' : 'bg-slate-200 dark:bg-zinc-600'}`}><IconTextAlignLeft /></button>
                        <button title="Align Center" onClick={() => handleSettingChange('textAlign', 'center')} className={`p-1.5 rounded-md ${settings.textAlign === 'center' ? 'bg-blue-600 text-white' : 'bg-slate-200 dark:bg-zinc-600'}`}><IconTextAlignCenter /></button>
                        <button title="Align Right" onClick={() => handleSettingChange('textAlign', 'right')} className={`p-1.5 rounded-md ${settings.textAlign === 'right' ? 'bg-blue-600 text-white' : 'bg-slate-200 dark:bg-zinc-600'}`}><IconTextAlignRight /></button>
                    </div>
                </div>
                {!hidePositionControl && (
                    <div className="flex items-center justify-between">
                        <label className="text-sm text-zinc-800 dark:text-slate-100">Position</label>
                        <div className="flex items-center gap-1">
                            <button title="Align Top" onClick={() => handleSettingChange('verticalPosition', 'top')} className={`p-1.5 rounded-md ${settings.verticalPosition === 'top' ? 'bg-blue-600 text-white' : 'bg-slate-200 dark:bg-zinc-600'}`}><IconVerticalAlignTop /></button>
                            <button title="Align Center" onClick={() => handleSettingChange('verticalPosition', 'center')} className={`p-1.5 rounded-md ${settings.verticalPosition === 'center' ? 'bg-blue-600 text-white' : 'bg-slate-200 dark:bg-zinc-600'}`}><IconVerticalAlignCenter /></button>
                            <button title="Align Bottom" onClick={() => handleSettingChange('verticalPosition', 'bottom')} className={`p-1.5 rounded-md ${settings.verticalPosition === 'bottom' ? 'bg-blue-600 text-white' : 'bg-slate-200 dark:bg-zinc-600'}`}><IconVerticalAlignBottom /></button>
                        </div>
                    </div>
                )}
            </div>
            <div className="pt-2 mt-2 border-t border-slate-200/80 dark:border-zinc-600/50">
                <button onClick={(e) => { e.stopPropagation(); onToggleExpand(); }} className="w-full flex justify-between items-center text-left py-1 group">
                    <span className="text-sm font-semibold text-zinc-700 dark:text-slate-200 flex items-center gap-2 group-hover:text-blue-600 dark:group-hover:text-blue-400">
                        <span className="text-blue-500">🎨</span> More Font Effects
                    </span>
                    <span className={`transform transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}><ChevronDownIcon /></span>
                </button>
                {isExpanded && (
                    <div className="mt-2 pl-3 border-l-2 border-slate-200 dark:border-zinc-700/60 space-y-3 animate-fade-in-up">
                        <div className="flex items-center justify-between">
                            <label className="text-sm text-zinc-800 dark:text-slate-100">Shadow</label>
                            <input type="color" value={settings.shadowColor || '#000000'} onChange={e => handleSettingChange('shadowColor', e.target.value)} className="w-8 h-8 p-0 border-none rounded-md cursor-pointer bg-transparent"/>
                        </div>
                        <div className="flex items-center justify-between">
                            <label className="text-sm text-zinc-800 dark:text-slate-100">Shadow Blur</label>
                            <div className="flex items-center gap-2 w-2/3"><input type="range" min="0" max="20" value={settings.shadowBlur ?? 0} onChange={(e) => handleSettingChange('shadowBlur', Number(e.target.value))} className="w-full h-1 bg-slate-200 dark:bg-zinc-600 rounded-lg appearance-none cursor-pointer" /><span className="text-sm w-10 text-center font-mono bg-white dark:bg-zinc-800 rounded-md p-1">{settings.shadowBlur ?? 0}</span></div>
                        </div>
                        <div className="flex items-center justify-between pt-2 border-t border-slate-200/50 dark:border-zinc-700/50"><label className="text-sm text-zinc-800 dark:text-slate-100">Outline</label><input type="color" value={settings.strokeColor || '#000000'} onChange={e => handleSettingChange('strokeColor', e.target.value)} className="w-8 h-8 p-0 border-none rounded-md cursor-pointer bg-transparent"/></div>
                        <div className="flex items-center justify-between"><label className="text-sm text-zinc-800 dark:text-slate-100">Outline Width</label><div className="flex items-center gap-2 w-2/3"><input type="range" min="0" max="5" step="0.5" value={settings.strokeWidth ?? 0} onChange={(e) => handleSettingChange('strokeWidth', Number(e.target.value))} className="w-full h-1 bg-slate-200 dark:bg-zinc-600 rounded-lg appearance-none cursor-pointer" /><span className="text-sm w-10 text-center font-mono bg-white dark:bg-zinc-800 rounded-md p-1">{settings.strokeWidth ?? 0}</span></div></div>
                        {isSubheadline && (
                            <div className="flex items-center justify-between pt-2 border-t border-slate-200/50 dark:border-zinc-700/50"><label className="text-sm text-zinc-800 dark:text-slate-100">Line Spacing</label><div className="flex items-center gap-2 w-2/3"><input type="range" min="0.8" max="2.5" step="0.1" value={settings.lineSpacing ?? 1.4} onChange={(e) => handleSettingChange('lineSpacing', Number(e.target.value))} className="w-full h-1 bg-slate-200 dark:bg-zinc-600 rounded-lg appearance-none cursor-pointer" /><span className="text-sm w-10 text-center font-mono bg-white dark:bg-zinc-800 rounded-md p-1">{(settings.lineSpacing ?? 1.4).toFixed(1)}</span></div></div>
                        )}
                        <div className="flex items-center justify-between pt-2 border-t border-slate-200/50 dark:border-zinc-700/50"><label className="text-sm text-zinc-800 dark:text-slate-100">Letter Spacing</label><div className="flex items-center gap-2 w-2/3"><input type="range" min="-2" max="10" step="0.5" value={settings.letterSpacing ?? 0} onChange={(e) => handleSettingChange('letterSpacing', Number(e.target.value))} className="w-full h-1 bg-slate-200 dark:bg-zinc-600 rounded-lg appearance-none cursor-pointer" /><span className="text-sm w-10 text-center font-mono bg-white dark:bg-zinc-800 rounded-md p-1">{settings.letterSpacing ?? 0}</span></div></div>
                        <div className="space-y-2 pt-2 border-t border-slate-200/50 dark:border-zinc-700/50">
                            <div className="flex items-center justify-between"><span className="text-sm text-zinc-800 dark:text-slate-100">Gradient Fill</span><button onClick={() => handleSettingChange('useGradient', !settings.useGradient)} className={`${settings.useGradient ? 'bg-blue-600' : 'bg-slate-300 dark:bg-zinc-600'} relative inline-flex h-6 w-11 items-center rounded-full transition-colors`}><span className={`${settings.useGradient ? 'translate-x-6' : 'translate-x-1'} inline-block h-4 w-4 transform rounded-full bg-white transition-transform`} /></button></div>
                            {settings.useGradient && <div className="space-y-2"><div className="flex items-center justify-between"><label className="text-sm">Colors</label><div className="flex gap-2"><input type="color" value={settings.gradientColor1 || '#FFFFFF'} onChange={e => handleSettingChange('gradientColor1', e.target.value)} className="w-8 h-8 p-0 border-none rounded-md cursor-pointer bg-transparent"/><input type="color" value={settings.gradientColor2 || '#000000'} onChange={e => handleSettingChange('gradientColor2', e.target.value)} className="w-8 h-8 p-0 border-none rounded-md cursor-pointer bg-transparent"/></div></div><div className="flex items-center justify-between"><label className="text-sm text-zinc-800 dark:text-slate-100">Angle</label><div className="flex items-center gap-2 w-2/3"><input type="range" min="0" max="360" value={settings.gradientAngle ?? 0} onChange={(e) => handleSettingChange('gradientAngle', Number(e.target.value))} className="w-full h-1 bg-slate-200 dark:bg-zinc-600 rounded-lg appearance-none cursor-pointer" /><span className="text-sm w-10 text-center font-mono bg-white dark:bg-zinc-800 rounded-md p-1">{settings.gradientAngle ?? 0}°</span></div></div></div>}
                        </div>
                        <div className="space-y-2 pt-2 border-t border-slate-200/50 dark:border-zinc-700/50">
                            <div className="flex items-center justify-between"><span className="text-sm text-zinc-800 dark:text-slate-100">Background Box</span><button onClick={() => handleSettingChange('useBackground', !settings.useBackground)} className={`${settings.useBackground ? 'bg-blue-600' : 'bg-slate-300 dark:bg-zinc-600'} relative inline-flex h-6 w-11 items-center rounded-full transition-colors`}><span className={`${settings.useBackground ? 'translate-x-6' : 'translate-x-1'} inline-block h-4 w-4 transform rounded-full bg-white transition-transform`} /></button></div>
                            {settings.useBackground && <div className="space-y-2"><div className="flex items-center justify-between"><label className="text-sm">Color</label><input type="color" value={settings.backgroundColor || '#000000'} onChange={e => handleSettingChange('backgroundColor', e.target.value)} className="w-8 h-8 p-0 border-none rounded-md cursor-pointer bg-transparent"/></div><div className="flex items-center justify-between"><label className="text-sm text-zinc-800 dark:text-slate-100">Opacity</label><div className="flex items-center gap-2 w-2/3"><input type="range" min="0" max="1" step="0.1" value={settings.backgroundOpacity ?? 0.5} onChange={(e) => handleSettingChange('backgroundOpacity', Number(e.target.value))} className="w-full h-1 bg-slate-200 dark:bg-zinc-600 rounded-lg appearance-none cursor-pointer" /><span className="text-sm w-10 text-center font-mono bg-white dark:bg-zinc-800 rounded-md p-1">{settings.backgroundOpacity ?? 0.5}</span></div></div><div className="flex items-center justify-between"><label className="text-sm text-zinc-800 dark:text-slate-100">Padding</label><div className="flex items-center gap-2 w-2/3"><input type="range" min="0" max="30" value={settings.backgroundPadding ?? 10} onChange={(e) => handleSettingChange('backgroundPadding', Number(e.target.value))} className="w-full h-1 bg-slate-200 dark:bg-zinc-600 rounded-lg appearance-none cursor-pointer" /><span className="text-sm w-10 text-center font-mono bg-white dark:bg-zinc-800 rounded-md p-1">{settings.backgroundPadding ?? 10}</span></div></div></div>}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

type LogoSettingsEditorProps = {
    settings: Pick<DesignSettings, 'addLogo' | 'logoPosition' | 'logoSize' | 'logoOpacity'>;
    onChange: (changes: Partial<Pick<DesignSettings, 'addLogo' | 'logoPosition' | 'logoSize' | 'logoOpacity'>>) => void;
};
const LogoSettingsEditor: React.FC<LogoSettingsEditorProps> = ({ settings, onChange }) => {
    return (
        <div className="p-3 rounded-lg bg-slate-100 dark:bg-zinc-700/50">
            <p className="text-sm font-semibold text-zinc-800 dark:text-slate-100">Logo</p>
            <div className="space-y-2 mt-2">
                <div className="flex items-center justify-between">
                    <span className="text-sm text-zinc-800 dark:text-slate-100">Show Logo</span>
                    <button onClick={() => onChange({ addLogo: !settings.addLogo })} className={`${settings.addLogo ? 'bg-blue-600' : 'bg-slate-300 dark:bg-zinc-600'} relative inline-flex h-6 w-11 items-center rounded-full transition-colors`}>
                        <span className={`${settings.addLogo ? 'translate-x-6' : 'translate-x-1'} inline-block h-4 w-4 transform rounded-full bg-white transition-transform`} />
                    </button>
                </div>
                {settings.addLogo && (
                    <>
                        <div className="flex items-center justify-between">
                            <label className="text-sm text-zinc-800 dark:text-slate-100">Position</label>
                            <div className="grid grid-cols-3 gap-1">
                                {(['top-left', 'top-right', 'center', 'bottom-left', 'bottom-center', 'bottom-right'] as LogoPosition[]).map(pos => (
                                    <button key={pos} onClick={() => onChange({ logoPosition: pos })} className={`p-1.5 rounded-md ${settings.logoPosition === pos ? 'bg-blue-600 text-white' : 'bg-slate-200 dark:bg-zinc-600'}`}><LogoPositionIcon position={pos} /></button>
                                ))}
                            </div>
                        </div>
                        <div className="flex items-center justify-between">
                            <label className="text-sm text-zinc-800 dark:text-slate-100">Size</label>
                            <div className="flex items-center gap-2 w-2/3">
                                <input type="range" min="50" max="150" value={settings.logoSize} onChange={(e) => onChange({ logoSize: Number(e.target.value) })} className="w-full h-1 bg-slate-200 dark:bg-zinc-600 rounded-lg appearance-none cursor-pointer" />
                                <span className="text-sm w-10 text-center font-mono bg-white dark:bg-zinc-800 rounded-md p-1">{settings.logoSize}</span>
                            </div>
                        </div>
                        <div className="flex items-center justify-between">
                            <label className="text-sm text-zinc-800 dark:text-slate-100">Opacity</label>
                            <div className="flex items-center gap-2 w-2/3">
                                <input type="range" min="0.1" max="1" step="0.1" value={settings.logoOpacity} onChange={(e) => onChange({ logoOpacity: Number(e.target.value) })} className="w-full h-1 bg-slate-200 dark:bg-zinc-600 rounded-lg appearance-none cursor-pointer" />
                                <span className="text-sm w-10 text-center font-mono bg-white dark:bg-zinc-800 rounded-md p-1">{settings.logoOpacity}</span>
                            </div>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};

type CTAButtonEditorProps = {
    settings: CTAButton | undefined;
    onChange: (changes: Partial<CTAButton>) => void;
};
const CTAButtonEditor: React.FC<CTAButtonEditorProps> = ({ settings, onChange }) => {
    const fileInputRef = useRef<HTMLInputElement>(null);
    
    const defaultCTA: CTAButton = {
        enabled: false,
        text: 'Shop Now',
        icons: [],
        horizontalAlign: 'center',
        verticalPosition: 'bottom',
        backgroundColor: '#3B82F6',
        textColor: '#FFFFFF',
        useGradient: true,
        gradientColor1: '#3B82F6',
        gradientColor2: '#1D4ED8',
        gradientAngle: 90,
        fontSize: 20,
        paddingX: 32,
        paddingY: 16,
        borderRadius: 12,
        autoAdjustColors: true
    };
    
    const currentSettings = settings ?? defaultCTA;
    
    const handleIconUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files || files.length === 0) return;
        
        const currentIconCount = currentSettings.icons.length;
        const availableSlots = 4 - currentIconCount;
        
        if (availableSlots <= 0) {
            alert('Maximum 4 icons allowed');
            return;
        }
        
        const newIcons: CTAIcon[] = [];
        for (let i = 0; i < Math.min(files.length, availableSlots); i++) {
            const file = files[i];
            const reader = new FileReader();
            
            await new Promise((resolve) => {
                reader.onload = (e) => {
                    if (e.target?.result) {
                        newIcons.push({
                            id: `icon-${Date.now()}-${i}`,
                            dataUrl: e.target.result as string,
                            position: 'before',
                            size: 20
                        });
                    }
                    resolve(null);
                };
                reader.readAsDataURL(file);
            });
        }
        
        onChange({ icons: [...currentSettings.icons, ...newIcons] });
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };
    
    const handleRemoveIcon = (iconId: string) => {
        onChange({ icons: currentSettings.icons.filter(icon => icon.id !== iconId) });
    };
    
    const handleMoveIcon = (iconId: string, direction: 'up' | 'down') => {
        const currentIndex = currentSettings.icons.findIndex(icon => icon.id === iconId);
        if (currentIndex === -1) return;
        
        const newIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
        if (newIndex < 0 || newIndex >= currentSettings.icons.length) return;
        
        const newIcons = [...currentSettings.icons];
        [newIcons[currentIndex], newIcons[newIndex]] = [newIcons[newIndex], newIcons[currentIndex]];
        onChange({ icons: newIcons });
    };
    
    const handleIconPositionToggle = (iconId: string) => {
        const updatedIcons = currentSettings.icons.map(icon => 
            icon.id === iconId 
                ? { ...icon, position: (icon.position === 'before' ? 'after' : 'before') as 'before' | 'after' }
                : icon
        );
        onChange({ icons: updatedIcons });
    };
    
    return (
        <div className="p-3 rounded-lg bg-slate-100 dark:bg-zinc-700/50">
            <p className="text-sm font-semibold text-zinc-800 dark:text-slate-100">Call-to-Action Button</p>
            <div className="space-y-2 mt-2">
                <div className="flex items-center justify-between">
                    <span className="text-sm text-zinc-800 dark:text-slate-100">Enable CTA</span>
                    <button 
                        onClick={() => onChange({ enabled: !currentSettings.enabled })} 
                        className={`${currentSettings.enabled ? 'bg-blue-600' : 'bg-slate-300 dark:bg-zinc-600'} relative inline-flex h-6 w-11 items-center rounded-full transition-colors`}
                        data-testid="toggle-cta-enabled"
                    >
                        <span className={`${currentSettings.enabled ? 'translate-x-6' : 'translate-x-1'} inline-block h-4 w-4 transform rounded-full bg-white transition-transform`} />
                    </button>
                </div>
                {currentSettings.enabled && (
                    <>
                        <div className="space-y-2 pt-2 border-t border-slate-200/50 dark:border-zinc-700/50">
                            <label className="text-sm text-zinc-800 dark:text-slate-100 font-medium">Button Text</label>
                            <input
                                type="text"
                                value={currentSettings.text}
                                onChange={(e) => onChange({ text: e.target.value })}
                                placeholder="e.g., Shop Now, Follow Us, Contact Us"
                                className="w-full px-3 py-2 bg-white dark:bg-zinc-800 border border-slate-300 dark:border-zinc-600 rounded-md text-sm text-zinc-900 dark:text-white"
                                data-testid="input-cta-text"
                            />
                        </div>
                        
                        <div className="space-y-2 pt-2 border-t border-slate-200/50 dark:border-zinc-700/50">
                            <div className="flex items-center justify-between">
                                <label className="text-sm text-zinc-800 dark:text-slate-100 font-medium">Icons ({currentSettings.icons.length}/4)</label>
                                <button
                                    onClick={() => fileInputRef.current?.click()}
                                    disabled={currentSettings.icons.length >= 4}
                                    className="px-2 py-1 text-xs bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-slate-400 disabled:cursor-not-allowed"
                                    data-testid="button-upload-cta-icon"
                                >
                                    + Add Icon
                                </button>
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    accept="image/*"
                                    multiple
                                    onChange={handleIconUpload}
                                    className="hidden"
                                />
                            </div>
                            {currentSettings.icons.length > 0 && (
                                <div className="space-y-1">
                                    {currentSettings.icons.map((icon, index) => (
                                        <div key={icon.id} className="flex items-center gap-2 p-2 bg-white dark:bg-zinc-800 rounded-md">
                                            <img src={icon.dataUrl} alt="CTA Icon" className="w-6 h-6 object-contain" />
                                            <span className="text-xs flex-1 text-zinc-600 dark:text-zinc-400">
                                                {icon.position === 'before' ? '← Before text' : 'After text →'}
                                            </span>
                                            <button
                                                onClick={() => handleIconPositionToggle(icon.id)}
                                                className="text-xs px-2 py-1 bg-slate-200 dark:bg-zinc-700 rounded hover:bg-slate-300 dark:hover:bg-zinc-600"
                                                title="Toggle position"
                                            >
                                                ⇄
                                            </button>
                                            <button
                                                onClick={() => handleMoveIcon(icon.id, 'up')}
                                                disabled={index === 0}
                                                className="text-xs px-1 py-1 bg-slate-200 dark:bg-zinc-700 rounded hover:bg-slate-300 dark:hover:bg-zinc-600 disabled:opacity-30"
                                                title="Move up"
                                            >
                                                ↑
                                            </button>
                                            <button
                                                onClick={() => handleMoveIcon(icon.id, 'down')}
                                                disabled={index === currentSettings.icons.length - 1}
                                                className="text-xs px-1 py-1 bg-slate-200 dark:bg-zinc-700 rounded hover:bg-slate-300 dark:hover:bg-zinc-600 disabled:opacity-30"
                                                title="Move down"
                                            >
                                                ↓
                                            </button>
                                            <button
                                                onClick={() => handleRemoveIcon(icon.id)}
                                                className="text-xs px-2 py-1 bg-red-500 text-white rounded hover:bg-red-600"
                                                data-testid={`button-remove-cta-icon-${index}`}
                                            >
                                                ✕
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                        
                        <div className="space-y-2 pt-2 border-t border-slate-200/50 dark:border-zinc-700/50">
                            <label className="text-sm text-zinc-800 dark:text-slate-100 font-medium">Horizontal Position</label>
                            <div className="flex gap-2">
                                {(['left', 'center', 'right'] as const).map(align => (
                                    <button
                                        key={align}
                                        onClick={() => onChange({ horizontalAlign: align })}
                                        className={`flex-1 py-2 text-xs font-semibold rounded-md ${currentSettings.horizontalAlign === align ? 'bg-blue-600 text-white' : 'bg-slate-200 dark:bg-zinc-600 text-zinc-800 dark:text-white'}`}
                                        data-testid={`button-cta-align-${align}`}
                                    >
                                        {align.charAt(0).toUpperCase() + align.slice(1)}
                                    </button>
                                ))}
                            </div>
                        </div>
                        
                        <div className="space-y-2 pt-2 border-t border-slate-200/50 dark:border-zinc-700/50">
                            <label className="text-sm text-zinc-800 dark:text-slate-100 font-medium">Vertical Position</label>
                            <div className="flex gap-2">
                                {(['top', 'middle', 'bottom'] as const).map(pos => (
                                    <button
                                        key={pos}
                                        onClick={() => onChange({ verticalPosition: pos })}
                                        className={`flex-1 py-2 text-xs font-semibold rounded-md ${currentSettings.verticalPosition === pos ? 'bg-blue-600 text-white' : 'bg-slate-200 dark:bg-zinc-600 text-zinc-800 dark:text-white'}`}
                                        data-testid={`button-cta-vpos-${pos}`}
                                    >
                                        {pos.charAt(0).toUpperCase() + pos.slice(1)}
                                    </button>
                                ))}
                            </div>
                        </div>
                        
                        <div className="space-y-2 pt-2 border-t border-slate-200/50 dark:border-zinc-700/50">
                            <div className="flex items-center justify-between">
                                <span className="text-sm text-zinc-800 dark:text-slate-100">Gradient Background</span>
                                <button 
                                    onClick={() => onChange({ useGradient: !currentSettings.useGradient })} 
                                    className={`${currentSettings.useGradient ? 'bg-blue-600' : 'bg-slate-300 dark:bg-zinc-600'} relative inline-flex h-6 w-11 items-center rounded-full transition-colors`}
                                >
                                    <span className={`${currentSettings.useGradient ? 'translate-x-6' : 'translate-x-1'} inline-block h-4 w-4 transform rounded-full bg-white transition-transform`} />
                                </button>
                            </div>
                            {currentSettings.useGradient ? (
                                <div className="space-y-2">
                                    <div className="flex items-center justify-between">
                                        <label className="text-sm">Gradient Colors</label>
                                        <div className="flex gap-2">
                                            <input 
                                                type="color" 
                                                value={currentSettings.gradientColor1} 
                                                onChange={e => onChange({ gradientColor1: e.target.value })} 
                                                className="w-8 h-8 p-0 border-none rounded-md cursor-pointer bg-transparent"
                                            />
                                            <input 
                                                type="color" 
                                                value={currentSettings.gradientColor2} 
                                                onChange={e => onChange({ gradientColor2: e.target.value })} 
                                                className="w-8 h-8 p-0 border-none rounded-md cursor-pointer bg-transparent"
                                            />
                                        </div>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <label className="text-sm">Angle</label>
                                        <div className="flex items-center gap-2 w-2/3">
                                            <input 
                                                type="range" 
                                                min="0" 
                                                max="360" 
                                                value={currentSettings.gradientAngle} 
                                                onChange={(e) => onChange({ gradientAngle: Number(e.target.value) })} 
                                                className="w-full h-1 bg-slate-200 dark:bg-zinc-600 rounded-lg appearance-none cursor-pointer" 
                                            />
                                            <span className="text-sm w-10 text-center font-mono bg-white dark:bg-zinc-800 rounded-md p-1">{currentSettings.gradientAngle}°</span>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="flex items-center justify-between">
                                    <label className="text-sm">Background Color</label>
                                    <input 
                                        type="color" 
                                        value={currentSettings.backgroundColor} 
                                        onChange={e => onChange({ backgroundColor: e.target.value })} 
                                        className="w-8 h-8 p-0 border-none rounded-md cursor-pointer bg-transparent"
                                    />
                                </div>
                            )}
                            <div className="flex items-center justify-between">
                                <label className="text-sm">Text Color</label>
                                <input 
                                    type="color" 
                                    value={currentSettings.textColor} 
                                    onChange={e => onChange({ textColor: e.target.value })} 
                                    className="w-8 h-8 p-0 border-none rounded-md cursor-pointer bg-transparent"
                                />
                            </div>
                        </div>
                        
                        <div className="space-y-2 pt-2 border-t border-slate-200/50 dark:border-zinc-700/50">
                            <div className="flex items-center justify-between">
                                <label className="text-sm text-zinc-800 dark:text-slate-100">Font Size</label>
                                <div className="flex items-center gap-2 w-2/3">
                                    <input 
                                        type="range" 
                                        min="12" 
                                        max="36" 
                                        value={currentSettings.fontSize} 
                                        onChange={(e) => onChange({ fontSize: Number(e.target.value) })} 
                                        className="w-full h-1 bg-slate-200 dark:bg-zinc-600 rounded-lg appearance-none cursor-pointer" 
                                    />
                                    <span className="text-sm w-10 text-center font-mono bg-white dark:bg-zinc-800 rounded-md p-1">{currentSettings.fontSize}</span>
                                </div>
                            </div>
                            <div className="flex items-center justify-between">
                                <label className="text-sm text-zinc-800 dark:text-slate-100">Padding X</label>
                                <div className="flex items-center gap-2 w-2/3">
                                    <input 
                                        type="range" 
                                        min="8" 
                                        max="64" 
                                        value={currentSettings.paddingX} 
                                        onChange={(e) => onChange({ paddingX: Number(e.target.value) })} 
                                        className="w-full h-1 bg-slate-200 dark:bg-zinc-600 rounded-lg appearance-none cursor-pointer" 
                                    />
                                    <span className="text-sm w-10 text-center font-mono bg-white dark:bg-zinc-800 rounded-md p-1">{currentSettings.paddingX}</span>
                                </div>
                            </div>
                            <div className="flex items-center justify-between">
                                <label className="text-sm text-zinc-800 dark:text-slate-100">Padding Y</label>
                                <div className="flex items-center gap-2 w-2/3">
                                    <input 
                                        type="range" 
                                        min="4" 
                                        max="32" 
                                        value={currentSettings.paddingY} 
                                        onChange={(e) => onChange({ paddingY: Number(e.target.value) })} 
                                        className="w-full h-1 bg-slate-200 dark:bg-zinc-600 rounded-lg appearance-none cursor-pointer" 
                                    />
                                    <span className="text-sm w-10 text-center font-mono bg-white dark:bg-zinc-800 rounded-md p-1">{currentSettings.paddingY}</span>
                                </div>
                            </div>
                            <div className="flex items-center justify-between">
                                <label className="text-sm text-zinc-800 dark:text-slate-100">Border Radius</label>
                                <div className="flex items-center gap-2 w-2/3">
                                    <input 
                                        type="range" 
                                        min="0" 
                                        max="32" 
                                        value={currentSettings.borderRadius} 
                                        onChange={(e) => onChange({ borderRadius: Number(e.target.value) })} 
                                        className="w-full h-1 bg-slate-200 dark:bg-zinc-600 rounded-lg appearance-none cursor-pointer" 
                                    />
                                    <span className="text-sm w-10 text-center font-mono bg-white dark:bg-zinc-800 rounded-md p-1">{currentSettings.borderRadius}</span>
                                </div>
                            </div>
                        </div>
                        
                        <div className="flex items-center justify-between pt-2 border-t border-slate-200/50 dark:border-zinc-700/50">
                            <div className="flex flex-col">
                                <span className="text-sm text-zinc-800 dark:text-slate-100">Auto-Adjust Colors</span>
                                <span className="text-xs text-zinc-500 dark:text-zinc-400">Optimize for readability</span>
                            </div>
                            <button 
                                onClick={() => onChange({ autoAdjustColors: !currentSettings.autoAdjustColors })} 
                                className={`${currentSettings.autoAdjustColors ? 'bg-green-600' : 'bg-slate-300 dark:bg-zinc-600'} relative inline-flex h-6 w-11 items-center rounded-full transition-colors`}
                            >
                                <span className={`${currentSettings.autoAdjustColors ? 'translate-x-6' : 'translate-x-1'} inline-block h-4 w-4 transform rounded-full bg-white transition-transform`} />
                            </button>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};

// Wand2 icon component
const Wand2Icon = ({ className = "w-4 h-4" }: { className?: string }) => (
    <Wand2 className={className} />
);

const ImageSceneGuideField: React.FC<{
    value: string;
    onChange: (value: string) => void;
    onImprove: () => void;
    aiAction: { field: string } | null;
    disabled?: boolean;
}> = ({ value, onChange, onImprove, aiAction, disabled }) => {
    const [isExpanded, setIsExpanded] = useState(false);
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const [hasOverflow, setHasOverflow] = useState(false);

    useEffect(() => {
        if (textareaRef.current) {
            const isOverflowing = textareaRef.current.scrollHeight > textareaRef.current.clientHeight;
            setHasOverflow(isOverflowing);
        }
    }, [value]);

    const displayRows = isExpanded ? 8 : 4;

    return (
        <div>
            <div className="flex items-center justify-between mb-1">
                <label className="block text-sm font-semibold text-zinc-700 dark:text-slate-100">1. Image Scene Guide</label>
                <button 
                    type="button"
                    onClick={onImprove} 
                    disabled={!!aiAction || disabled} 
                    className="p-1.5 rounded-md bg-white dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 shadow-sm hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Improve with AI"
                    data-testid="button-improve-imageSceneGuide"
                >
                    {aiAction?.field === 'imageSceneGuide' ? (
                        <div className="animate-spin h-4 w-4 border-b-2 border-blue-600 dark:border-blue-400 rounded-full"/>
                    ) : (
                        <Wand2Icon className="h-4 w-4 text-blue-500 dark:text-blue-400" />
                    )}
                </button>
            </div>
            <div className="relative">
                <textarea
                    ref={textareaRef}
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    rows={displayRows}
                    disabled={disabled}
                    placeholder="e.g., A professional product shot on a clean, modern background."
                    data-testid="input-imageSceneGuide"
                    className="w-full bg-slate-100 dark:bg-zinc-700 border border-slate-300 dark:border-zinc-600 rounded-md p-3 text-sm text-zinc-900 dark:text-white placeholder:text-zinc-400 dark:placeholder:text-zinc-500 focus:ring-2 focus:ring-blue-500 outline-none disabled:opacity-60 disabled:bg-slate-200 dark:disabled:bg-zinc-800 resize-none overflow-hidden"
                />
                {hasOverflow && !isExpanded && (
                    <div className="absolute inset-x-0 bottom-0 h-8 bg-gradient-to-t from-slate-100 dark:from-zinc-700 to-transparent pointer-events-none rounded-b-md" />
                )}
            </div>
            {hasOverflow && (
                <div className="flex justify-start mt-1">
                    <button
                        type="button"
                        onClick={() => setIsExpanded(!isExpanded)}
                        className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
                        data-testid="button-expand-imageSceneGuide"
                    >
                        {isExpanded ? '▲ Show Less' : '▼ View More'}
                    </button>
                </div>
            )}
        </div>
    );
};

const AiEnhancedTextArea: React.FC<{
    field: 'headline' | 'subheadline' | 'description';
    label: string;
    value: string;
    onChange: (value: string) => void;
    maxLength: number;
    rows: number;
    helpText?: string;
    placeholder?: string;
    onImprove: (field: any) => void;
    aiAction: { field: string } | null;
    disabled?: boolean;
}> = React.memo(({ field, label, value, onChange, maxLength, rows, helpText, placeholder, onImprove, aiAction, disabled }) => {
    const [isExpanded, setIsExpanded] = useState(false);
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const [hasOverflow, setHasOverflow] = useState(false);

    useEffect(() => {
        if (textareaRef.current) {
            const isOverflowing = textareaRef.current.scrollHeight > textareaRef.current.clientHeight;
            setHasOverflow(isOverflowing);
        }
    }, [value]);

    const displayRows = isExpanded ? rows + 4 : rows;

    return (
        <div>
            <div className="flex items-center justify-between mb-1">
                <label className="block text-sm font-semibold text-zinc-700 dark:text-slate-100">{label}</label>
                <button 
                    type="button"
                    onClick={() => onImprove(field)} 
                    disabled={!!aiAction || disabled} 
                    className="p-1.5 rounded-md bg-white dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 shadow-sm hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Improve with AI"
                    data-testid={`button-improve-${field}`}
                >
                    {aiAction?.field === field ? (
                        <div className="animate-spin h-4 w-4 border-b-2 border-blue-600 dark:border-blue-400 rounded-full"/>
                    ) : (
                        <Wand2Icon className="h-4 w-4 text-blue-500 dark:text-blue-400" />
                    )}
                </button>
            </div>
            <div className="relative">
                <textarea
                    ref={textareaRef}
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    rows={displayRows}
                    maxLength={maxLength}
                    disabled={disabled}
                    placeholder={placeholder}
                    data-testid={`input-${field}`}
                    className="w-full bg-slate-100 dark:bg-zinc-700 border border-slate-300 dark:border-zinc-600 rounded-md p-3 text-sm text-zinc-900 dark:text-white placeholder:text-zinc-400 dark:placeholder:text-zinc-500 focus:ring-2 focus:ring-blue-500 outline-none disabled:opacity-60 disabled:bg-slate-200 dark:disabled:bg-zinc-800 resize-none overflow-hidden"
                />
                {hasOverflow && !isExpanded && (
                    <div className="absolute inset-x-0 bottom-0 h-8 bg-gradient-to-t from-slate-100 dark:from-zinc-700 to-transparent pointer-events-none rounded-b-md" />
                )}
            </div>
            <div className="flex items-center justify-between mt-1">
                {hasOverflow && (
                    <button
                        type="button"
                        onClick={() => setIsExpanded(!isExpanded)}
                        className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
                        data-testid={`button-expand-${field}`}
                    >
                        {isExpanded ? '▲ Show Less' : '▼ View More'}
                    </button>
                )}
                {!hasOverflow && <div />}
                <p className="text-xs text-zinc-500">{value.length} / {maxLength} {helpText && `(${helpText})`}</p>
            </div>
        </div>
    );
});

const AutoExpandingTextarea: React.FC<{
    value: string;
    onChange: React.ChangeEventHandler<HTMLTextAreaElement>;
    placeholder?: string;
    className?: string;
}> = ({ value, onChange, placeholder, className }) => {
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    useEffect(() => {
        const textarea = textareaRef.current;
        if (textarea) {
            textarea.style.height = 'auto'; // Reset height to shrink if text is deleted
            textarea.style.height = `${textarea.scrollHeight}px`;
        }
    }, [value]);

    return (
        <textarea
            ref={textareaRef}
            value={value}
            onChange={onChange}
            placeholder={placeholder}
            rows={1}
            className={`w-full bg-white dark:bg-zinc-700/50 border border-slate-300 dark:border-zinc-600/50 focus:border-blue-500 rounded-md p-2 focus:ring-1 focus:ring-blue-500 focus:outline-none overflow-hidden resize-none transition-colors ${className}`}
        />
    );
};
const ConfirmationModal = ({
    isOpen,
    title,
    message,
    confirmText,
    onConfirm,
    onCancel,
}: {
    isOpen: boolean;
    title: string;
    message: string;
    confirmText: string;
    onConfirm: () => void;
    onCancel: () => void;
}) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 animate-fade-in" onClick={onCancel}>
            <div className="bg-white dark:bg-zinc-800 rounded-lg shadow-2xl p-6 w-full max-w-md m-4" onClick={e => e.stopPropagation()}>
                <h2 className="text-xl font-bold mb-2 text-zinc-900 dark:text-white">{title}</h2>
                <p className="text-zinc-600 dark:text-zinc-400 mb-6">{message}</p>
                <div className="flex justify-end gap-4">
                    <button onClick={onCancel} className="px-4 py-2 bg-slate-200 dark:bg-zinc-700 text-zinc-800 dark:text-white rounded-md hover:bg-slate-300 dark:hover:bg-zinc-600 transition-colors">
                        Cancel
                    </button>
                    <button onClick={onConfirm} className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors">
                        {confirmText}
                    </button>
                </div>
            </div>
        </div>
    );
};

const ToastNotification = ({
    message,
    type,
    onClose
}: {
    message: string;
    type: 'success' | 'error' | 'info';
    onClose: () => void;
}) => {
    useEffect(() => {
        const duration = type === 'error' ? 8000 : 3000;
        const timer = setTimeout(onClose, duration);
        return () => clearTimeout(timer);
    }, [onClose, type]);

    const isSuccess = type === 'success';
    const isInfo = type === 'info';
    const baseClasses = "fixed top-5 left-1/2 -translate-x-1/2 z-[200] flex items-center gap-3 px-6 py-3 rounded-lg shadow-2xl animate-fade-in-up";
    const typeClasses = isSuccess
        ? "bg-green-500 dark:bg-green-600 text-white"
        : isInfo
        ? "bg-blue-500 dark:bg-blue-600 text-white"
        : "bg-red-500 dark:bg-red-600 text-white";

    const Icon = isSuccess 
        ? () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg> 
        : isInfo
        ? () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
        : () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>;

    return (
        <div className={`${baseClasses} ${typeClasses}`}>
            <Icon />
            <span className="font-semibold">{message}</span>
            <button onClick={onClose} className="ml-4 p-1 rounded-full hover:bg-black/20 transition-colors" aria-label="Close notification">
                <IconX />
            </button>
        </div>
    );
};

const ImageStatusIndicator = ({ isSaved, isSelectedForSave, onToggle, imageId }: { isSaved: boolean; isSelectedForSave: boolean; onToggle: () => void; imageId?: string; }) => {
    // Only show green check for saved images (no blue dot for selection - blue border handles selection)
    if (!isSaved) {
        return null; // Don't show anything for unsaved images
    }

    return (
        <div className="absolute top-3 right-3 z-20 pointer-events-none">
            {/* Green check mark for saved images */}
            <div
                title="Saved to My Project"
                className="w-7 h-7 rounded-full bg-green-500 border-2 border-white shadow-lg flex items-center justify-center"
                data-testid={imageId ? `indicator-saved-${imageId}` : "indicator-saved"}
            >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-white" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
            </div>
        </div>
    );
};

const AspectRatioMismatchModal = ({ onStretch, onKeepRatio, onCancel }: { onStretch: () => void; onKeepRatio: () => void; onCancel: () => void; }) => {
    return (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[120] animate-fade-in" onClick={onCancel}>
            <div className="bg-white dark:bg-zinc-800 rounded-lg shadow-2xl p-6 w-full max-w-md m-4" onClick={e => e.stopPropagation()}>
                <h2 className="text-xl font-bold mb-2 text-zinc-900 dark:text-white">Image Ratio Mismatch</h2>
                <p className="text-zinc-600 dark:text-zinc-400 mb-6">The uploaded image has a different aspect ratio than your project's canvas. How would you like to proceed?</p>
                <div className="flex flex-col gap-3">
                    <button onClick={onStretch} className="w-full text-left p-3 bg-slate-100 dark:bg-zinc-700 rounded-md hover:bg-slate-200 dark:hover:bg-zinc-600 transition-colors">
                        <p className="font-semibold">Stretch to Fit</p>
                        <p className="text-xs text-zinc-500 dark:text-zinc-400">Fills the entire canvas, but may slightly distort the image.</p>
                    </button>
                    <button onClick={onKeepRatio} className="w-full text-left p-3 bg-slate-100 dark:bg-zinc-700 rounded-md hover:bg-slate-200 dark:hover:bg-zinc-600 transition-colors">
                        <p className="font-semibold">Keep Original Ratio</p>
                        <p className="text-xs text-zinc-500 dark:text-zinc-400">Centers the image and adds blank margins to fill the space.</p>
                    </button>
                    <button onClick={onCancel} className="w-full text-center mt-2 px-4 py-2 text-sm text-zinc-600 dark:text-zinc-300 hover:bg-slate-100 dark:hover:bg-zinc-700 rounded-md transition-colors">
                        Cancel & Re-upload
                    </button>
                </div>
            </div>
        </div>
    );
};


// +----------------------+
// | LayoutEditorModal    |
// +----------------------+
const LayoutEditorModal = ({
    campaign,
    image,
    design,
    onClose,
    onChange,
    projectSize,
    brandAssets,
    currentUserPlan,
    onMetadataUpdate
}: {
    campaign: Campaign;
    image: CampaignImage;
    design: DesignSettings;
    onClose: () => void;
    onChange: (newDesign: DesignSettingsOverride) => void;
    projectSize: string;
    brandAssets: BrandAssets;
    currentUserPlan: 'Starter' | 'Creator' | 'ProFusion';
    onMetadataUpdate?: (campaignId: string, imageId: string, editMetadata: any) => void;
}) => {
    const { state: localDesign, setState: setLocalDesign, resetState } = useHistory(design);
    const [isZooming, setIsZooming] = useState(true);
    const { toast } = useToast();
    const [showEditWarning, setShowEditWarning] = useState(false);
    
    useEffect(() => {
        resetState(design);
    }, [design, resetState]);

    useEffect(() => {
        // Trigger zoom-in animation after mount
        const timer = setTimeout(() => setIsZooming(false), 50);
        return () => clearTimeout(timer);
    }, []);

    // Check edit metadata on mount to see if we should show a warning
    useEffect(() => {
        const imageData = image as any;
        const editMetadata = imageData.editMetadata;
        
        console.log('[LayoutEditorModal] Checking edit metadata:', {
            imageId: imageData.id,
            editMetadata,
            origin: editMetadata?.origin,
            modalEdits: editMetadata?.modalEdits
        });
        
        // Check if this image originated from Canvas/Fusion
        if (editMetadata?.origin === 'canvas' || editMetadata?.origin === 'fusion') {
            const modalEdits = editMetadata.modalEdits || 0;
            
            console.log('[LayoutEditorModal] Canvas/Fusion image detected, modalEdits:', modalEdits);
            
            // Show warning on second edit or later
            if (modalEdits >= 1) {
                console.log('[LayoutEditorModal] Showing edit restriction toast (modalEdits >= 1)');
                setShowEditWarning(true);
                toast({
                    title: "Editing Restriction",
                    description: "To modify this design, please go to Customize Visuals > Fusion and re-upload your image and text to make changes.",
                    duration: 8000,
                });
            } else {
                console.log('[LayoutEditorModal] No warning needed (first edit)');
            }
        } else {
            console.log('[LayoutEditorModal] Not a Canvas/Fusion image, no restriction applied');
        }
    }, [image, toast]);

    const handleConfirm = async () => {
        const changes = deepMerge(design, localDesign);
        
        // Update edit metadata
        const imageData = image as any;
        const currentMetadata = imageData.editMetadata || {};
        const modalEdits = (currentMetadata.modalEdits || 0) + 1;
        
        // Update the image with new edit metadata
        try {
            const user = getCurrentUser();
            if (user && imageData.id) {
                const headers: Record<string, string> = {
                    'Content-Type': 'application/json',
                };
                
                const token = localStorage.getItem('token');
                if (token) {
                    headers['Authorization'] = `Bearer ${token}`;
                }
                
                const updatedMetadata = {
                    ...currentMetadata,
                    modalEdits,
                    lastModalEditAt: new Date().toISOString(),
                };
                
                await fetch(`/api/campaign-images/${imageData.id}/edit-metadata`, {
                    method: 'PATCH',
                    headers,
                    body: JSON.stringify({
                        editMetadata: updatedMetadata
                    }),
                });
                
                // Update the local image object with the new metadata
                // This ensures the next time the modal opens, it has the updated counter
                imageData.editMetadata = updatedMetadata;
                
                // Notify parent to update campaigns state
                if (onMetadataUpdate) {
                    console.log('[LayoutEditorModal] Calling onMetadataUpdate with:', {
                        campaignId: campaign.id,
                        imageId: imageData.id,
                        updatedMetadata
                    });
                    onMetadataUpdate(campaign.id, imageData.id, updatedMetadata);
                } else {
                    console.log('[LayoutEditorModal] WARNING: onMetadataUpdate callback not provided!');
                }
            }
        } catch (error) {
            console.error('Failed to update edit metadata:', error);
        }
        
        onChange(changes);
        onClose();
    };
    
    const handleDesignChange = (part: 'headline' | 'subheadline' | 'logo' | 'ctaButton', changes: object) => {
        if (part === 'logo') {
            setLocalDesign(prev => deepMerge(prev, changes));
        } else {
            setLocalDesign(prev => deepMerge(prev, { [part]: changes }));
        }
    };

    const [activeTextEditor, setActiveTextEditor] = useState('headline-row-0');

    return (
        <div className="fixed inset-0 bg-black/80 flex z-[100] transition-opacity duration-300">
            <div className="flex-1 flex items-center justify-center p-8">
                 <div 
                    className="relative transition-all duration-300 ease-out transform" 
                    style={{ 
                        aspectRatio: projectSize.replace('x', ' / '),
                        height: '90%',
                        maxWidth: 'calc(100% - 400px)',
                        transform: 'scale(1)',
                        opacity: 1
                    }}
                    onClick={e => e.stopPropagation()}
                 >
                     <CanvasPreview
                         image={image}
                         campaign={campaign}
                         design={localDesign}
                         brandAssets={brandAssets}
                         projectSize={projectSize}
                         currentUserPlan={currentUserPlan}
                         className="w-full h-full rounded-lg"
                     />
                 </div>
            </div>
            <aside className="w-[400px] bg-slate-50 dark:bg-zinc-800/80 p-6 overflow-y-auto" onClick={e => e.stopPropagation()}>
                <h3 className="text-xl font-bold mb-6 text-zinc-900 dark:text-white">Adjust Layout</h3>
                <div className="space-y-6">
                    <div className="p-4 rounded-lg bg-slate-100 dark:bg-zinc-700/50 space-y-3">
                        <div className="flex justify-between items-center">
                           <p className="text-sm font-semibold text-zinc-800 dark:text-slate-100">Headline</p>
                        </div>
                        <div className="flex items-center justify-between">
                            <label className="text-sm text-zinc-800 dark:text-slate-100">Position</label>
                            <div className="flex items-center gap-1">
                                <button title="Align Top" onClick={() => handleDesignChange('headline', { verticalPosition: 'top' })} className={`p-1.5 rounded-md ${localDesign.headline.verticalPosition === 'top' ? 'bg-blue-600 text-white' : 'bg-slate-200 dark:bg-zinc-600'}`}><IconVerticalAlignTop /></button>
                                <button title="Align Center" onClick={() => handleDesignChange('headline', { verticalPosition: 'center' })} className={`p-1.5 rounded-md ${localDesign.headline.verticalPosition === 'center' ? 'bg-blue-600 text-white' : 'bg-slate-200 dark:bg-zinc-600'}`}><IconVerticalAlignCenter /></button>
                                <button title="Align Bottom" onClick={() => handleDesignChange('headline', { verticalPosition: 'bottom' })} className={`p-1.5 rounded-md ${localDesign.headline.verticalPosition === 'bottom' ? 'bg-blue-600 text-white' : 'bg-slate-200 dark:bg-zinc-600'}`}><IconVerticalAlignBottom /></button>
                            </div>
                        </div>
                         <div className="flex items-center justify-between">
                            <label className="text-sm text-zinc-800 dark:text-slate-100">Line Spacing</label>
                            <div className="flex items-center gap-2 w-2/3">
                                <input type="range" min="0.8" max="2.5" step="0.1" value={localDesign.headline.lineSpacing} onChange={(e) => handleDesignChange('headline', { lineSpacing: Number(e.target.value) })} className="w-full h-1 bg-slate-200 dark:bg-zinc-600 rounded-lg appearance-none cursor-pointer" />
                                <span className="text-sm w-10 text-center font-mono bg-white dark:bg-zinc-800 rounded-md p-1">{localDesign.headline.lineSpacing.toFixed(1)}</span>
                            </div>
                        </div>
                    </div>
                    <div className="pl-3 border-l-2 border-blue-300 dark:border-blue-700/60 space-y-2">
                        {campaign.headline.split('\n').map((_, index) => {
                            const rowSettings = localDesign.headline.rows[index];
                            if (!rowSettings) return null; // Guard against out-of-sync state
                            return (
                                <TextSettingsEditor
                                    key={`modal-headline-row-${index}`}
                                    title={`Headline Row ${index + 1}`}
                                    settings={rowSettings}
                                    onChange={(changes) => {
                                        const newRows = [...localDesign.headline.rows];
                                        newRows[index] = { ...newRows[index], ...changes };
                                        handleDesignChange('headline', { rows: newRows });
                                    }}
                                    isActive={activeTextEditor === `headline-row-${index}`}
                                    onActivate={() => setActiveTextEditor(`headline-row-${index}`)}
                                    isExpanded={activeTextEditor === `headline-row-${index}`}
                                    onToggleExpand={() => setActiveTextEditor(prev => prev === `headline-row-${index}` ? '' : `headline-row-${index}`)}
                                    hidePositionControl={true}
                                />
                            );
                        })}
                    </div>
                    <TextSettingsEditor
                        title="Subheadline"
                        settings={localDesign.subheadline}
                        onChange={(changes) => handleDesignChange('subheadline', changes)}
                        isActive={activeTextEditor === 'subheadline'}
                        onActivate={() => setActiveTextEditor('subheadline')}
                        isExpanded={activeTextEditor === 'subheadline'}
                        onToggleExpand={() => setActiveTextEditor(prev => prev === 'subheadline' ? '' : 'subheadline')}
                        isSubheadline={true}
                    />
                    <LogoSettingsEditor
                        settings={localDesign}
                        onChange={(changes) => handleDesignChange('logo', changes)}
                    />
                    <CTAButtonEditor
                        settings={localDesign.ctaButton}
                        onChange={(changes) => handleDesignChange('ctaButton', changes)}
                    />
                </div>
                <div className="mt-6 flex justify-end gap-3">
                    <button onClick={onClose} className="px-4 py-2 bg-slate-200 dark:bg-zinc-600 text-zinc-800 dark:text-zinc-100 rounded-md hover:bg-slate-300 dark:hover:bg-zinc-500 transition-colors">Cancel</button>
                    <button 
                        onClick={handleConfirm} 
                        data-testid="button-confirm-layout"
                        className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors font-semibold"
                    >
                        Confirm & Return
                    </button>
                </div>
            </aside>
        </div>
    );
};


// +----------------------+
// | Editor Page          |
// +----------------------+
const EditorPage = ({ 
    project, 
    brandAssets, 
    onBack, 
    onUpdateProject, 
    setToast,
    userApiKey,
    currentUserPlan
}: { 
    project: Project, 
    brandAssets: BrandAssets, 
    onBack: () => void, 
    onUpdateProject: (project: Project, successMessage?: string) => void,
    setToast: (toast: { message: string, type: 'success' | 'error' | 'info' } | null) => void,
    userApiKey: string | null;
    currentUserPlan: 'Starter' | 'Creator' | 'ProFusion';
}) => {
    // Firebase Auth
    const { user } = useAuth();
    const { toast } = useToast();
    
    // Editor flow state
    const [editorStep, setEditorStep] = useState<'content' | 'visuals'>('content');
    const [visualsTab, setVisualsTab] = useState<'ai' | 'upload' | 'fusion' | 'promo-video'>('ai');

    // Content state
    const [productInfo, setProductInfo] = useState('');
    const [excludedKeywords, setExcludedKeywords] = useState('');
    const [headline, setHeadline] = useState('');
    const [subheadline, setSubheadline] = useState('');
    const [description, setDescription] = useState('');
    const [hashtags, setHashtags] = useState<string[]>([]);
    
    const [selectedStyle, setSelectedStyle] = useState(IMAGE_STYLES[0]);
    const [isStyleSelectorOpen, setIsStyleSelectorOpen] = useState(false);
    const [autoOptimizeText, setAutoOptimizeText] = useState(true); // AI Visual-Aware Text Adjustment toggle
    const [isLoading, setIsLoading] = useState(false);
    const [loadingMessage, setLoadingMessage] = useState('');
    const { state: campaigns, setState: setCampaigns, undo, redo, canUndo, canRedo, resetState } = useHistory<Campaign[]>([]);
    const [regeneratingImageId, setRegeneratingImageId] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [projectName, setProjectName] = useState(project.name);
    
    const [aiAction, setAiAction] = useState<{ field: 'headline' | 'subheadline' | 'description' | 'hashtags' | 'imageSceneGuide', action: 'simplify' | 'moreOptions' } | null>(null);
    const [activeSuggestions, setActiveSuggestions] = useState<{ field: 'headline' | 'subheadline' | 'description' | 'hashtags' | 'imageSceneGuide', suggestions: string[], originalText: string } | null>(null);
    const suggestionBoxRef = useRef<HTMLDivElement>(null);
    
    // Hashtag autocomplete
    const [hashtagInput, setHashtagInput] = useState('');
    const [showHashtagSuggestions, setShowHashtagSuggestions] = useState(false);
    const hashtagInputRef = useRef<HTMLInputElement>(null);
    const uploadInputRef = useRef<HTMLInputElement>(null);
    
    // Enhance tab state
    const [uploadedEnhanceImage, setUploadedEnhanceImage] = useState<BrandAssetFile | null>(null);
    const [enhanceScript, setEnhanceScript] = useState('');
    const [enhanceNegativePrompt, setEnhanceNegativePrompt] = useState('');
    const [isGeneratingScript, setIsGeneratingScript] = useState(false);
    
    // Enhance editing mode: 'caption' (default), 'inpaint', 'outpaint'
    const [enhanceEditMode, setEnhanceEditMode] = useState<'caption' | 'inpaint' | 'outpaint' | 'image2image'>('caption');
    const [maskDataUrl, setMaskDataUrl] = useState<string | null>(null);
    const [brushSize, setBrushSize] = useState(20);
    const [outpaintDirections, setOutpaintDirections] = useState({ left: false, right: false, top: false, bottom: false });
    const [outpaintPromptIsDirty, setOutpaintPromptIsDirty] = useState(false); // Track if user edited the outpaint prompt
    const [isGeneratingInpaint, setIsGeneratingInpaint] = useState(false);
    const [isGeneratingOutpaint, setIsGeneratingOutpaint] = useState(false);
    const [isUpscaling, setIsUpscaling] = useState(false);
    
    // Product/Service suggestion helper
    const [showProductSuggestions, setShowProductSuggestions] = useState(false);
    const [showAdvancedOptions, setShowAdvancedOptions] = useState(false);
    const productSuggestionsRef = useRef<HTMLDivElement>(null);
    
    // Project name editing
    const [isEditingProjectName, setIsEditingProjectName] = useState(false);
    const [isHoveringProjectName, setIsHoveringProjectName] = useState(false);
    const projectNameInputRef = useRef<HTMLInputElement>(null);
    
    // Adaptive project name color based on background brightness
    const getProjectNameColor = () => {
        // Check if current theme is dark mode
        const isDarkMode = document.documentElement.classList.contains('dark');
        
        // Default to indigo for light backgrounds
        if (!isDarkMode) {
            return '#4B0082'; // Indigo for light mode
        }
        
        // For dark mode, use light gray for better visibility
        return '#E5E7EB'; // Light gray for dark mode
    };
    
    // Share to Community toggle state - persist to localStorage per project
    const [isPublic, setIsPublic] = useState<boolean>(() => {
        const savedToggle = localStorage.getItem(`project-${project.id}-shareToPublicToggle`);
        return savedToggle !== null ? savedToggle === 'true' : (project.isPublic === 1);
    });
    const [isTogglingPublic, setIsTogglingPublic] = useState(false);
    const [showPublicConfirmation, setShowPublicConfirmation] = useState(false);
    
    // Individual image public sharing state
    const [publicVisualId, setPublicVisualId] = useState<string | null>(project.publicVisualId || null);
    const [showReplacePublicImageConfirmation, setShowReplacePublicImageConfirmation] = useState(false);
    const [pendingPublicImageId, setPendingPublicImageId] = useState<string | null>(null);
    const [showUnsavedImageTooltip, setShowUnsavedImageTooltip] = useState(false);
    const [unsavedImageTooltipPosition, setUnsavedImageTooltipPosition] = useState({ top: 0, left: 0 });
    
    // Track last shared image ID for re-sharing when toggle is turned back ON
    const [lastSharedVisualId, setLastSharedVisualId] = useState<string | null>(() => {
        const saved = localStorage.getItem(`project-${project.id}-lastSharedVisual`);
        return saved || project.publicVisualId || null;
    });
    
    // FIX: Add save-in-progress guard to prevent duplicate/concurrent saves
    const [isSavingProject, setIsSavingProject] = useState(false);
    
    // Persist toggle state to localStorage whenever it changes
    useEffect(() => {
        localStorage.setItem(`project-${project.id}-shareToPublicToggle`, isPublic.toString());
    }, [isPublic, project.id]);
    
    // Persist last shared visual ID to localStorage
    useEffect(() => {
        if (lastSharedVisualId) {
            localStorage.setItem(`project-${project.id}-lastSharedVisual`, lastSharedVisualId);
        }
    }, [lastSharedVisualId, project.id]);
    
    // Sync publicVisualId when project prop changes (e.g., after reload)
    useEffect(() => {
        if (project.publicVisualId !== publicVisualId) {
            setPublicVisualId(project.publicVisualId || null);
        }
    }, [project.publicVisualId]);
    
    // 🔧 QUICK FIX: Listen for visuals-updated event from Image2ImageMode
    // This is a workaround until App.tsx is refactored to use TanStack Query
    useEffect(() => {
        const handleVisualsUpdate = (event: Event) => {
            const customEvent = event as CustomEvent<{ projectId: string; visuals: any }>;
            const { projectId: eventProjectId, visuals } = customEvent.detail;
            
            console.log("📥 Received 'visuals-updated' event:", { eventProjectId, visuals });
            
            // Only process if it's for this project
            if (eventProjectId !== project.id) {
                console.log("⏭️ Skipping - event is for different project");
                return;
            }
            
            // Validate visuals is an array (could be error object)
            if (!Array.isArray(visuals)) {
                console.error("⚠️ Visuals is not an array:", visuals);
                return;
            }
            
            // 🎯 FIX 2: Remove placeholder campaigns before adding real visuals
            // Extract taskUUIDs from real visuals to match against placeholders
            // CRITICAL: Use metadata.taskUUID (from Runware), NOT visual.id (database UUID)
            const incomingTaskUUIDs = visuals
                .filter((v: any) => v.type === 'quickclip')
                .map((v: any) => v.metadata?.taskUUID)
                .filter(Boolean); // Remove null/undefined values
            
            // Extract promoVideoIds from promovideo visuals to match against placeholders
            const incomingPromoVideoIds = visuals
                .filter((v: any) => v.type === 'promovideo')
                .map((v: any) => v.metadata?.promoVideoId)
                .filter(Boolean);
            
            // Remove placeholders that match incoming videos
            const campaignsWithoutPlaceholders = campaigns.filter(c => {
                const isQuickClipPlaceholder = c.id.startsWith('quickclip-placeholder-');
                const isPromoVideoPlaceholder = c.id.startsWith('promovideo-placeholder-');
                
                if (!isQuickClipPlaceholder && !isPromoVideoPlaceholder) return true; // Keep non-placeholders
                
                if (isQuickClipPlaceholder) {
                    // Extract taskUUID from placeholder ID (format: quickclip-placeholder-{taskUUID})
                    const taskUUID = c.id.replace('quickclip-placeholder-', '');
                    const shouldRemove = incomingTaskUUIDs.includes(taskUUID);
                    
                    if (shouldRemove) {
                        console.log(`🗑️ Removing QuickClip placeholder campaign: ${c.id}`);
                    }
                    
                    return !shouldRemove; // Keep if not matching
                }
                
                if (isPromoVideoPlaceholder) {
                    // Extract promoVideoId from placeholder ID (format: promovideo-placeholder-{promoVideoId})
                    const promoVideoId = c.id.replace('promovideo-placeholder-', '');
                    const shouldRemove = incomingPromoVideoIds.includes(promoVideoId);
                    
                    if (shouldRemove) {
                        console.log(`🗑️ Removing PromoVideo placeholder campaign: ${c.id}`);
                    }
                    
                    return !shouldRemove; // Keep if not matching
                }
                
                return true;
            });
            
            // Filter for image2image, quickclip, and promovideo visuals that aren't already in campaigns
            const newVisuals = visuals.filter((v: any) => 
                (v.type === 'image2image' || v.type === 'quickclip' || v.type === 'promovideo') && 
                !campaignsWithoutPlaceholders.some(c => c.images.some(img => img.id === v.id))
            );
            
            console.log("🎨 Found new visuals (image2image + quickclip + promovideo):", newVisuals);
            
            if (newVisuals.length === 0 && campaignsWithoutPlaceholders.length === campaigns.length) {
                console.log("⏭️ No new visuals to add and no placeholders removed");
                return;
            }
            
            // Convert visuals to Campaign format
            const newCampaigns: Campaign[] = newVisuals.map((visual: any) => {
                // PromoVideo visuals
                if (visual.type === 'promovideo' && visual.mediaType === 'video') {
                    return {
                        id: visual.id,
                        headline: 'PromoVideo',
                        subheadline: `${visual.metadata?.sceneCount || 3}-scene promotional video`,
                        description: visual.prompt || '',
                        hashtags: [],
                        images: [{
                            id: visual.id,
                            src: visual.videoUrl, // Use videoUrl instead of imageUrl
                            isVideo: true, // Mark as video
                            isSaved: false,
                        }]
                    };
                }
                
                // QuickClip videos have different structure
                if (visual.type === 'quickclip' && visual.mediaType === 'video') {
                    return {
                        id: visual.id,
                        headline: 'QuickClip Video',
                        subheadline: visual.metadata?.animationPrompt || 'AI-generated video',
                        description: visual.prompt || '',
                        hashtags: [],
                        images: [{
                            id: visual.id,
                            src: visual.videoUrl, // Use videoUrl instead of imageUrl
                            isVideo: true, // Mark as video
                            isSaved: false,
                        }]
                    };
                }
                
                // Image2Image visuals
                return {
                    id: visual.id,
                    headline: visual.metadata?.transformPrompt || 'Transformed Image',
                    subheadline: '',
                    description: visual.prompt || '',
                    hashtags: [],
                    images: [{
                        id: visual.id,
                        src: visual.imageUrl,
                        isSaved: false,
                    }]
                };
            });
            
            console.log("✅ Adding new campaigns:", newCampaigns);
            
            // 🎯 FIX 2: Replace placeholders with real campaigns (add new ones at the TOP)
            setCampaigns([...newCampaigns, ...campaignsWithoutPlaceholders]);
            
            // Scroll to top of Generated Visuals panel
            setTimeout(() => {
                const visualsPanel = document.querySelector('.flex-1.overflow-y-auto.p-6');
                if (visualsPanel) {
                    visualsPanel.scrollTo({ top: 0, behavior: 'smooth' });
                }
            }, 100);
            
            // Show success toast
            setToast({ 
                message: `Image transformation complete! ✓`, 
                type: 'success' 
            });
        };
        
        // 🎯 FIX 2: Listen for quickclip-generation-started to add placeholder video cards
        const handleQuickClipStart = (event: Event) => {
            const customEvent = event as CustomEvent<{ 
                projectId: string; 
                taskUUIDs: string[];
                numberOfVideos: number;
                animationPrompt: string;
            }>;
            const { projectId: eventProjectId, taskUUIDs, numberOfVideos, animationPrompt } = customEvent.detail;
            
            console.log("🎬 Received 'quickclip-generation-started' event:", { eventProjectId, numberOfVideos });
            
            // Only process if it's for this project
            if (eventProjectId !== project.id) {
                console.log("⏭️ Skipping - event is for different project");
                return;
            }
            
            // Create placeholder campaigns for each video being generated
            const placeholderCampaigns: Campaign[] = taskUUIDs.map((taskUUID, index) => ({
                id: `quickclip-placeholder-${taskUUID}`,
                headline: 'QuickClip Video',
                subheadline: animationPrompt || 'Generating video...',
                description: '',
                hashtags: [],
                images: [{
                    id: `placeholder-${taskUUID}`,
                    src: '', // Empty src - will render loading spinner
                    isVideo: true,
                    isSaved: false,
                    isGenerating: true, // Flag to show loading spinner
                }]
            }));
            
            console.log(`🎬 Adding ${placeholderCampaigns.length} placeholder video cards`);
            
            // Add placeholder campaigns to state (at the TOP)
            setCampaigns((prev: Campaign[]) => [...placeholderCampaigns, ...prev]);
        };
        
        // 🎯 Listen for promovideo-generation-started to add placeholder video card
        const handlePromoVideoStart = (event: Event) => {
            const customEvent = event as CustomEvent<{ 
                projectId: string; 
                promoVideoId: string;
                sceneCount: number;
                videoResolution: string;
            }>;
            const { projectId: eventProjectId, promoVideoId, sceneCount, videoResolution } = customEvent.detail;
            
            console.log("🎬 Received 'promovideo-generation-started' event:", { eventProjectId, promoVideoId, sceneCount });
            
            // Only process if it's for this project
            if (eventProjectId !== project.id) {
                console.log("⏭️ Skipping - event is for different project");
                return;
            }
            
            // Create placeholder campaign for PromoVideo
            const placeholderCampaign: Campaign = {
                id: `promovideo-placeholder-${promoVideoId}`,
                headline: 'PromoVideo',
                subheadline: `Generating ${sceneCount}-scene promotional video...`,
                description: '',
                hashtags: [],
                images: [{
                    id: `placeholder-${promoVideoId}`,
                    src: '', // Empty src - will render loading spinner
                    isVideo: true,
                    isSaved: false,
                    isGenerating: true, // Flag to show loading spinner
                }]
            };
            
            console.log(`🎬 Adding PromoVideo placeholder card`);
            
            // Add placeholder campaign to state (at the TOP)
            setCampaigns((prev: Campaign[]) => [...placeholderCampaign, ...prev]);
        };
        
        window.addEventListener('visuals-updated', handleVisualsUpdate);
        window.addEventListener('quickclip-generation-started', handleQuickClipStart);
        window.addEventListener('promovideo-generation-started', handlePromoVideoStart);
        
        console.log("👂 Listening for 'visuals-updated', 'quickclip-generation-started', and 'promovideo-generation-started' events for project:", project.id);
        
        return () => {
            window.removeEventListener('visuals-updated', handleVisualsUpdate);
            window.removeEventListener('quickclip-generation-started', handleQuickClipStart);
            window.removeEventListener('promovideo-generation-started', handlePromoVideoStart);
            console.log("🔇 Stopped listening for events");
        };
    }, [project.id, campaigns, setCampaigns, setToast]);
    
    // Auto-populate outpaint prompt when directions change (if user hasn't edited it)
    useEffect(() => {
        console.log('🎯 Outpaint auto-fill useEffect triggered:', {
            enhanceEditMode,
            outpaintDirections,
            outpaintPromptIsDirty,
            currentScript: enhanceScript
        });

        // Only auto-fill when in outpaint mode
        if (enhanceEditMode !== 'outpaint') {
            console.log('⏭️ Skipping - not in outpaint mode');
            return;
        }

        // Generate default prompt based on selected directions
        const defaultPrompt = buildOutpaintPrompt(outpaintDirections);
        console.log('💬 Generated default prompt:', defaultPrompt);
        
        // Check if any direction is selected
        const hasAnyDirection = Object.values(outpaintDirections).some(Boolean);
        
        // When all directions are deselected, clear the prompt and reset dirty flag
        if (!hasAnyDirection) {
            console.log('🧹 No directions selected - clearing prompt');
            setEnhanceScript('');
            setOutpaintPromptIsDirty(false);
            return;
        }

        // If user has manually edited the prompt, don't override it
        if (outpaintPromptIsDirty) {
            console.log('✋ Skipping - user has manually edited prompt');
            return;
        }

        // Update prompt with default
        if (defaultPrompt) {
            console.log('✅ Setting auto-populated prompt');
            setEnhanceScript(defaultPrompt);
        }
    }, [outpaintDirections, outpaintPromptIsDirty, enhanceEditMode]);
    
    // Helper to get auth headers
    const getAuthHeaders = useCallback((): Record<string, string> => {
        const token = localStorage.getItem('token');
        if (token) {
            return {
                'Authorization': `Bearer ${token}`,
            };
        }
        return {};
    }, []);
    
    // Helper to ensure project is persisted before operations requiring a UUID
    const ensureProjectPersistedRef = useRef<Promise<string> | null>(null);
    const ensureProjectPersisted = useCallback(async (): Promise<string> => {
        const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        
        // If already persisted (has UUID), return immediately
        if (UUID_REGEX.test(project.id)) {
            return project.id;
        }
        
        // Serialize calls - if already persisting, wait for that operation
        if (ensureProjectPersistedRef.current) {
            return ensureProjectPersistedRef.current;
        }
        
        // Create new project
        const persistOperation = (async () => {
            try {
                setLoadingMessage('Saving project...');
                
                const authHeaders = getAuthHeaders();
                const response = await fetch('/api/projects', {
                    method: 'POST',
                    headers: {
                        ...authHeaders,
                        'Content-Type': 'application/json',
                    },
                    credentials: 'include',
                    body: JSON.stringify({
                        name: projectName || 'Untitled Project',
                        size: project.size,
                        language: project.language,
                        category: project.category,
                        description: project.description,
                    }),
                });
                
                if (!response.ok) {
                    throw new Error('Failed to create project');
                }
                
                const newProject = await response.json();
                
                // Update local state with the new UUID
                onUpdateProject({ ...project, id: newProject.id });
                
                // Invalidate projects cache to refresh dashboard
                queryClient.invalidateQueries({ queryKey: ['/api/projects'] });
                
                console.log('✅ Project created with UUID:', newProject.id);
                return newProject.id;
            } catch (error) {
                console.error('Failed to create project:', error);
                throw new Error(`Failed to save project: ${error instanceof Error ? error.message : 'Unknown error'}`);
            } finally {
                setLoadingMessage('');
                ensureProjectPersistedRef.current = null;
            }
        })();
        
        ensureProjectPersistedRef.current = persistOperation;
        return persistOperation;
    }, [project.id, project.size, project.language, project.category, project.description, projectName, getAuthHeaders]);
    
    // Function to actually perform the toggle
    const performTogglePublic = async () => {
        if (!user || isTogglingPublic) return;
        
        setIsTogglingPublic(true);
        
        try {
            const authHeaders = getAuthHeaders();
            const response = await fetch(`/api/projects/${project.id}/toggle-public`, {
                method: 'POST',
                headers: authHeaders,
                credentials: 'include',
            });
            
            if (!response.ok) {
                // Extract specific error message from backend
                const errorData = await response.json().catch(() => ({ error: 'Failed to update sharing status' }));
                setToast({ message: errorData.error || 'Failed to update sharing status', type: 'error' });
                return;
            }
            
            const data = await response.json();
            const newIsPublic = data.isPublic === 1;
            
            // Update state to match backend (source of truth)
            setIsPublic(newIsPublic);
            onUpdateProject({ ...project, isPublic: data.isPublic });
            
            // AUTO-UNSHARE: When turning toggle OFF, automatically unshare current image
            if (!newIsPublic && publicVisualId) {
                console.log('[TOGGLE OFF] Auto-unsharing image from Community:', publicVisualId);
                const unshareSuccess = await unsharePublicVisualInternal();
                
                if (unshareSuccess) {
                    setToast({ message: '✅ Project removed from Community', type: 'success' });
                } else {
                    // Toggle succeeded but auto-unshare failed - inform user
                    setToast({ message: '⚠️ Project is private, but failed to remove shared image. Please try again.', type: 'error' });
                }
            } 
            // AUTO-SHARE: When turning toggle ON, automatically re-share last shared image if exists
            else if (newIsPublic && lastSharedVisualId && !publicVisualId) {
                console.log('[TOGGLE ON] Auto-share check:', {
                    lastSharedVisualId,
                    publicVisualId,
                    campaignCount: campaigns.length,
                    projectId: project.id
                });
                
                // Validate: Check if the last shared image still exists in THIS project's campaigns
                const imageExists = campaigns.some(c => 
                    c.images.some(img => {
                        if (img.id === lastSharedVisualId) {
                            console.log('[TOGGLE ON] Found matching image:', img.id, 'in campaign:', c.id);
                            return true;
                        }
                        return false;
                    })
                );
                
                console.log('[TOGGLE ON] Image exists check:', imageExists);
                
                if (imageExists) {
                    console.log('[TOGGLE ON] Proceeding with auto-share for:', lastSharedVisualId);
                    const shareSuccess = await setPublicVisualInternal(lastSharedVisualId);
                    
                    if (shareSuccess) {
                        setToast({ message: '✅ Previous design re-shared to Community!', type: 'success' });
                    } else {
                        // Share failed but toggle succeeded - inform user they need to manually share
                        setToast({ message: '✅ Project is public. Click a globe icon to share an image.', type: 'info' });
                    }
                } else {
                    // Image no longer exists - clear the stale reference
                    console.log('[TOGGLE ON] Last shared image no longer exists in campaigns, clearing localStorage');
                    console.log('[TOGGLE ON] Campaigns structure:', campaigns.map(c => ({ id: c.id, imageCount: c.images.length, imageIds: c.images.map(img => img.id) })));
                    localStorage.removeItem(`project-${project.id}-lastSharedVisual`);
                    setLastSharedVisualId(null);
                    setToast({ message: '✅ Project is public. Click a globe icon to share an image.', type: 'success' });
                }
            }
            else {
                setToast({ 
                    message: newIsPublic ? '✅ Project shared to Community!' : '✅ Project is now private', 
                    type: 'success' 
                });
            }
        } catch (error) {
            console.error('Failed to toggle public status:', error);
            setToast({ message: 'Failed to update sharing status', type: 'error' });
        } finally {
            setIsTogglingPublic(false);
        }
    };
    
    // Toggle public/private status - shows confirmation if switching to public
    const handleTogglePublic = async () => {
        if (!user || isTogglingPublic) return;
        
        // If currently private and switching to public, show confirmation
        if (!isPublic) {
            setShowPublicConfirmation(true);
        } else {
            // If currently public and switching to private, just do it
            await performTogglePublic();
        }
    };
    
    // Confirm and perform the public toggle
    const confirmTogglePublic = async () => {
        setShowPublicConfirmation(false);
        await performTogglePublic();
    };
    
    // Handle globe icon click on an image
    const handleGlobeIconClick = async (imageId: string, isSaved: boolean, event: React.MouseEvent) => {
        event.stopPropagation(); // Prevent selecting the image
        
        // Check if Share to Public toggle is ON
        if (!isPublic) {
            setToast({ message: '⚠️ Turn on "Share to Public" toggle first to share this image', type: 'info' });
            return;
        }
        
        // If clicking on the current public visual, unshare it
        if (publicVisualId === imageId) {
            await unsharePublicVisual();
            return;
        }
        
        // If there's already a public visual, show replace confirmation
        if (publicVisualId) {
            setPendingPublicImageId(imageId);
            setShowReplacePublicImageConfirmation(true);
        } else {
            // No public visual yet, set this one
            await setPublicVisual(imageId);
        }
    };
    
    // Internal function to share an image (no toast - for automatic sharing)
    const setPublicVisualInternal = async (imageId: string, showToast: boolean = false): Promise<boolean> => {
        if (!user) return false;
        
        try {
            // FIX BUG 1: Find campaign in session (has full context), use saved image data if available
            // This ensures we have campaign metadata while using authoritative saved designs
            let targetCampaign: Campaign | null = null;
            let targetImage: CampaignImage | null = null;
            
            // First, find the campaign and image in session (includes all context)
            for (const campaign of campaigns) {
                const foundImage = campaign.images.find(img => img.id === imageId);
                if (foundImage) {
                    targetCampaign = campaign;
                    targetImage = foundImage;
                    break;
                }
            }
            
            // If found in session, check if there's a saved version with updated design
            if (targetImage) {
                const savedImage = (project.savedImages || []).find(img => img.id === imageId);
                if (savedImage) {
                    // Merge saved image data (design, renderedImageUrl) with session image
                    console.log(`[SHARE] Merging saved design for ${imageId} with session data`);
                    targetImage = { ...targetImage, ...savedImage };
                } else {
                    console.log(`[SHARE] Using fresh session data for unsaved ${imageId}`);
                }
            } else {
                // Not in session, try to find in saved data (fallback for old projects)
                const savedImage = (project.savedImages || []).find(img => img.id === imageId);
                if (savedImage) {
                    console.log(`[SHARE] Using saved data for ${imageId} (no session)`);
                    targetImage = savedImage;
                    targetCampaign = (project.campaigns || []).find(c => 
                        c.images.some(img => img.id === imageId)
                    ) || null;
                }
            }
            
            // Generate fully rendered canvas image with all design elements
            let renderedImageUrl: string | null = null;
            if (targetCampaign && targetImage) {
                try {
                    const design = getEffectiveDesign(targetImage);
                    const [w, h] = project.size.split('x').map(Number);
                    
                    const canvas = document.createElement('canvas');
                    // GUARANTEE minimum 1200px width for crystal-clear Community previews
                    const MIN_WIDTH = 1200;
                    const scaleFactor = Math.max(MIN_WIDTH / w, 6); // At least 6x for exceptional quality
                    canvas.width = w * scaleFactor;
                    canvas.height = h * scaleFactor;
                    const ctx = canvas.getContext('2d');
                    
                    if (ctx) {
                        await renderCampaignImageToCanvas(
                            ctx,
                            canvas.width,
                            canvas.height,
                            targetImage,
                            targetCampaign,
                            design,
                            brandAssets,
                            project.size,
                            currentUserPlan
                        );
                        
                        // MAXIMUM QUALITY JPEG - 0.98 quality for crystal-clear sharpness
                        const highQualityJpeg = canvas.toDataURL('image/jpeg', 0.98);
                        
                        console.log(`[IMAGE UPLOAD] Rendering complete - Canvas: ${canvas.width}x${canvas.height}px (${scaleFactor.toFixed(1)}x scale)`);
                        console.log('[IMAGE UPLOAD] Uploading ultra high-quality rendered image to storage...');
                        
                        // Upload to object storage - REQUIRED (no base64 fallback)
                        // Retry up to 3 times with exponential backoff
                        let uploadSuccess = false;
                        let lastError = null;
                        
                        for (let attempt = 0; attempt < 3; attempt++) {
                            try {
                                const uploadResponse = await fetch('/api/upload-community-image', {
                                    method: 'POST',
                                    headers: {
                                        ...getAuthHeaders(),
                                        'Content-Type': 'application/json',
                                    },
                                    credentials: 'include',
                                    body: JSON.stringify({ imageData: highQualityJpeg }),
                                });
                                
                                if (uploadResponse.ok) {
                                    const { url } = await uploadResponse.json();
                                    renderedImageUrl = url;
                                    uploadSuccess = true;
                                    console.log(`[IMAGE UPLOAD] ✅ Image uploaded successfully: ${url}`);
                                    break;
                                } else {
                                    const errorText = await uploadResponse.text();
                                    lastError = new Error(`Upload failed with status ${uploadResponse.status}: ${errorText}`);
                                }
                            } catch (uploadError) {
                                lastError = uploadError as Error;
                            }
                            
                            // Wait before retry (exponential backoff: 500ms, 1s, 2s)
                            if (attempt < 2) {
                                await new Promise(resolve => setTimeout(resolve, 500 * Math.pow(2, attempt)));
                            }
                        }
                        
                        // CRITICAL: If upload failed after retries, throw error (no base64 fallback)
                        if (!uploadSuccess) {
                            console.error('❌ Upload to object storage failed after 3 attempts:', lastError);
                            throw new Error(`Failed to upload image to storage: ${lastError?.message || 'Unknown error'}`);
                        }
                    }
                } catch (error) {
                    console.error('Failed to generate rendered canvas:', error);
                    throw error; // Re-throw to propagate error up
                }
            }
            
            const authHeaders = getAuthHeaders();
            const response = await fetch(`/api/projects/${project.id}/public-visual`, {
                method: 'PATCH',
                headers: {
                    ...authHeaders,
                    'Content-Type': 'application/json',
                },
                credentials: 'include',
                body: JSON.stringify({ imageId, renderedImageUrl }),
            });
            
            if (response.ok) {
                const data = await response.json();
                setPublicVisualId(imageId);
                setLastSharedVisualId(imageId); // Track for re-sharing
                onUpdateProject({ ...project, publicVisualId: imageId });
                
                // CRITICAL FIX: Update local campaign state with the new renderedImageUrl
                // This ensures the latest saved version is locked in
                setCampaigns(prevCampaigns => 
                    prevCampaigns.map(campaign => ({
                        ...campaign,
                        images: campaign.images.map(img => 
                            img.id === imageId 
                                ? { ...img, renderedImageUrl: renderedImageUrl || img.renderedImageUrl }
                                : img
                        )
                    }))
                );
                
                if (showToast) {
                    setToast({ message: 'Image shared to Community!', type: 'success' });
                }
                
                // Invalidate community projects cache to update Community page
                queryClient.invalidateQueries({ queryKey: ['/api/community/projects'] });
                return true;
            } else {
                if (showToast) {
                    setToast({ message: 'Failed to share image', type: 'error' });
                }
                return false;
            }
        } catch (error) {
            console.error('Failed to set public visual:', error);
            if (showToast) {
                setToast({ message: 'Failed to share image', type: 'error' });
            }
            return false;
        }
    };
    
    // Set an image as the public visual (user-facing version with toast)
    const setPublicVisual = async (imageId: string) => {
        await setPublicVisualInternal(imageId, true);
    };
    
    // Internal function to unshare an image (no toast - for automatic unsharing)
    const unsharePublicVisualInternal = async (showToast: boolean = false): Promise<boolean> => {
        if (!user || !publicVisualId) return false;
        
        try {
            const authHeaders = getAuthHeaders();
            const response = await fetch(`/api/projects/${project.id}/public-visual`, {
                method: 'DELETE',
                headers: authHeaders,
                credentials: 'include',
            });
            
            if (response.ok) {
                const data = await response.json();
                setPublicVisualId(null);
                onUpdateProject({ ...project, publicVisualId: null });
                
                // Show different message if image was deleted due to age
                if (showToast) {
                    if (data.imageDeleted) {
                        setToast({ 
                            message: 'Image removed from Community and deleted (exceeded 60-day retention)', 
                            type: 'success' 
                        });
                        
                        // Remove the deleted image from campaigns state
                        setCampaigns(prevCampaigns => prevCampaigns.map(campaign => ({
                            ...campaign,
                            images: campaign.images.filter(img => img.id !== publicVisualId)
                        })));
                    } else {
                        setToast({ message: 'Image removed from Community', type: 'success' });
                    }
                }
                
                // Invalidate community projects cache to remove from Community page
                queryClient.invalidateQueries({ queryKey: ['/api/community/projects'] });
                return true;
            } else {
                if (showToast) {
                    setToast({ message: 'Failed to unshare image', type: 'error' });
                }
                return false;
            }
        } catch (error) {
            console.error('Failed to unshare visual:', error);
            if (showToast) {
                setToast({ message: 'Failed to unshare image', type: 'error' });
            }
            return false;
        }
    };
    
    // Unshare the public visual (user-facing version with toast)
    const unsharePublicVisual = async () => {
        await unsharePublicVisualInternal(true);
    };
    
    // Confirm replacing the existing public visual
    const confirmReplacePublicVisual = async () => {
        if (!pendingPublicImageId) return;
        setShowReplacePublicImageConfirmation(false);
        await setPublicVisual(pendingPublicImageId);
        setPendingPublicImageId(null);
    };
    
    // AI Text Improvement Popup State
    const [aiImprovementPopup, setAiImprovementPopup] = useState<{
        campaignId: string;
        fieldType: 'headline' | 'subheadline';
        currentText: string;
        suggestions: string[];
        suggestionSet: number; // Track which set (1-3, 4-6, 7-9, etc.)
        loadingAction: 'simplify' | 'more' | null; // Track which button is loading
    } | null>(null);

    const [savedImages, setSavedImages] = useState<CampaignImage[]>(project.savedImages || []);
    const [selectedImageIds, setSelectedImageIds] = useState<Set<string>>(new Set());
    const [modifiedImageIds, setModifiedImageIds] = useState<Set<string>>(new Set());
    
    // Sync savedImages when project.savedImages changes (e.g., after save/load)
    useEffect(() => {
        setSavedImages(project.savedImages || []);
    }, [project.savedImages]);
    
    // Visuals generation options
    const [imageQuantity, setImageQuantity] = useState<number>(4);
    
    const [globalDesignDefaults, setGlobalDesignDefaults] = useState<DesignSettings>(INITIAL_TEMPLATES[0].defaultDesign);
    
    // Image relevance
    const [imageSceneGuide, setImageSceneGuide] = useState('');
    
    // Onboarding tooltips (reset on every login)
    const [showSaveReminderTooltip, setShowSaveReminderTooltip] = useState(true);
    const [showEditVisualTooltip, setShowEditVisualTooltip] = useState(true);
    
    // Layout and preview
    const [imageGridLayout, setImageGridLayout] = useState<'2' | '4'>('4');
    const [activeImageIndices, setActiveImageIndices] = useState<{ [campaignId: string]: number }>({});
    const [enlargedPreview, setEnlargedPreview] = useState<{ campaign: Campaign; image: CampaignImage } | null>(null);
    const [showAlignmentGrid, setShowAlignmentGrid] = useState(false);
    const [editingImage, setEditingImage] = useState<{ campaign: Campaign; image: CampaignImage } | null>(null);
    const [aspectRatioMismatch, setAspectRatioMismatch] = useState<{ file: File; dataUrl: string } | null>(null);

    const [activeImage, setActiveImage] = useState<{ campaignId: string; imageId: string } | null>(null);
    const [activeTextEditor, setActiveTextEditor] = useState<string>('headline-row-0'); // e.g. 'headline-row-0', 'subheadline'
    const [copiedCampaignId, setCopiedCampaignId] = useState<string | null>(null);
    const [isInspectorVisible, setIsInspectorVisible] = useState(true);
    
    // Video control state
    const [videoPlayState, setVideoPlayState] = useState<Map<string, boolean>>(new Map()); // imageId -> isPlaying
    const [videoMuteState, setVideoMuteState] = useState<Map<string, boolean>>(new Map()); // imageId -> isMuted
    const videoRefs = useRef<Map<string, HTMLVideoElement>>(new Map()); // imageId -> video element

    // New state for AI Product Fusion
    const [sceneImage, setSceneImage] = useState<BrandAssetFile | null>(null);
    const [productImage, setProductImage] = useState<BrandAssetFile | null>(null);
    const [fusionPrompt, setFusionPrompt] = useState('');
    const [detectedSceneType, setDetectedSceneType] = useState<string | null>(null);
    // Note: Canvas size removed - background dimensions are preserved exactly
    const [placementSuggestions, setPlacementSuggestions] = useState<string[]>([]);
    const [showPlacementSuggestions, setShowPlacementSuggestions] = useState(false);
    const [isGeneratingSuggestion, setIsGeneratingSuggestion] = useState(false);
    const sceneUploadRef = useRef<HTMLInputElement>(null);
    const productUploadRef = useRef<HTMLInputElement>(null);
    
    // PromoVideo state REMOVED - Now managed by PromoVideoTab component (Nov 2025)
    
    // Track latest generated image for auto-scroll
    const [latestGeneratedImageId, setLatestGeneratedImageId] = useState<string | null>(null);

    // Tooltip states
    const [isSelectTipVisible, dismissSelectTip] = useTooltipState('editor-select-tooltip');
    const [isSaveTipVisible, dismissSaveTip] = useTooltipState('editor-save-tooltip');
    
    // Auto-scroll to latest generated image when it appears in DOM
    useEffect(() => {
        if (!latestGeneratedImageId) return;
        
        // Use requestAnimationFrame to ensure DOM is fully rendered
        requestAnimationFrame(() => {
            const imageElement = document.querySelector(`[data-image-id="${latestGeneratedImageId}"]`);
            if (imageElement) {
                imageElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
                // Clear the pending scroll after successful scroll
                setLatestGeneratedImageId(null);
            }
        });
    }, [latestGeneratedImageId, campaigns]);

    // Track previous campaigns to preserve unsaved visuals
    const previousCampaignsRef = useRef<Campaign[]>([]);

    const sizeLabel = PROJECT_SIZES.find(s => s.size === project.size)?.label || project.size;
    
    const handleHeadlineChange = useCallback((value: string) => {
        setHeadline(value);
        // Also update the first campaign if it exists (keep standalone and campaign state in sync)
        if (campaigns.length > 0) {
            handleCampaignTextChange(campaigns[0].id, 'headline', value);
        }
    }, [campaigns]);
    
    const handleSubheadlineChange = useCallback((value: string) => {
        setSubheadline(value);
        // Also update the first campaign if it exists (keep standalone and campaign state in sync)
        if (campaigns.length > 0) {
            handleCampaignTextChange(campaigns[0].id, 'subheadline', value);
        }
    }, [campaigns]);
    
    const handleDescriptionChange = useCallback((value: string) => {
        setDescription(value);
        // Also update the first campaign if it exists (keep standalone and campaign state in sync)
        if (campaigns.length > 0) {
            handleCampaignTextChange(campaigns[0].id, 'description', value);
        }
    }, [campaigns]);
    const handleHashtagsChange = useCallback((value: string) => setHashtags(value.split(' ')), []);

    const getEffectiveDesign = useCallback((image?: CampaignImage): DesignSettings => {
        const defaults = globalDesignDefaults;
        if (!image || !image.design) return defaults;
        return deepMerge(defaults, image.design);
    }, [globalDesignDefaults]);

    useEffect(() => {
        console.log('[DEBUG useEffect] Project data load useEffect triggered for project:', project.id);
        
        // Wrap async logic in immediately-invoked async function
        (async () => {
            console.log('[DEBUG async] Starting async project load for:', project.id);
            
            // FIX BUG 2: Merge project campaigns with session campaigns to preserve unsaved work
            // This ensures Enhance/Fusion/etc. campaigns persist after save/share operations
            
            console.log(`[PROJECT] Raw project.campaigns from API:`, project.campaigns?.map((c: any) => ({
                id: c.id,
                headline: c.headline?.substring(0, 50) || '(none)',
                subheadline: c.subheadline?.substring(0, 50) || '(none)',
                imageCount: c.images?.length || 0
            })));
            
            const migratedCampaigns = (project.campaigns || []).map((c: any) => ({
                id: c.id,
                headline: c.headline || c.title || '',
                subheadline: c.subheadline || c.content || '',
                description: c.description || '',
                hashtags: c.hashtags || c.themes || [],
                images: (c.images || []).map((img: any) => ({
                    ...img,
                    // 🎯 FIX: Map database fields to frontend fields for canvas rendering
                    src: img.src || img.imageUrl || img.videoUrl || null,
                    design: img.design ?? img.designOverride ?? null // Preserve design customizations from database
                }))
            }));
            
            console.log(`[PROJECT] Migrated campaigns:`, migratedCampaigns.map(c => ({
                id: c.id,
                headline: c.headline?.substring(0, 50) || '(empty)',
                subheadline: c.subheadline?.substring(0, 50) || '(empty)',
                imageCount: c.images.length
            })));
            
            // 🎬 QUICKCLIP FIX: Fetch QuickClip videos and add to campaigns
            try {
                const visualsResponse = await fetch(`/api/projects/${project.id}/visuals`, {
                    credentials: 'include',
                    headers: getAuthHeaders(),
                });
                
                if (visualsResponse.ok) {
                    const visuals = await visualsResponse.json();
                    console.log('[QUICKCLIP LOAD] Fetched visuals:', visuals);
                    
                    // Filter for QuickClip and PromoVideo visuals not already in campaigns
                    const videoVisuals = visuals.filter((v: any) => 
                        (v.type === 'quickclip' || v.type === 'promovideo') && 
                        v.mediaType === 'video' &&
                        !migratedCampaigns.some(c => c.id === v.id)
                    );
                    
                    console.log('[VIDEO LOAD] Found video visuals:', videoVisuals);
                    
                    // Convert video visuals to Campaign format
                    const videoCampaigns = videoVisuals.map((visual: any) => {
                        const isGenerating = visual.status === 'generating';
                        const isCompleted = visual.status === 'completed';
                        const isFailed = visual.status === 'failed';
                        
                        return {
                            id: visual.id,
                            headline: visual.type === 'quickclip' ? 'QuickClip Video' : 'PromoVideo',
                            subheadline: visual.type === 'quickclip' 
                                ? (visual.metadata?.animationPrompt || 'AI-generated video')
                                : `${visual.metadata?.sceneCount || 3}-scene promotional video`,
                            description: visual.prompt || '',
                            hashtags: [],
                            images: [{
                                id: visual.id,
                                src: isCompleted ? visual.videoUrl : '', // Empty src for generating videos
                                isVideo: true,
                                isSaved: isCompleted, // Only mark as saved if completed
                                isGenerating: isGenerating, // Show loading spinner
                                isFailed: isFailed,
                                // Expiration metadata from API
                                expiresAt: visual.expiresAt,
                                daysUntilExpiration: visual.daysUntilExpiration,
                                isExpiringSoon: visual.isExpiringSoon,
                            }]
                        };
                    });
                    
                    // Add video campaigns to migrated campaigns
                    migratedCampaigns.push(...videoCampaigns);
                    console.log('[VIDEO LOAD] Added', videoCampaigns.length, 'video campaigns (QuickClip + PromoVideo)');
                }
            } catch (error) {
                console.error('[QUICKCLIP LOAD] Failed to fetch visuals:', error);
                console.error('[QUICKCLIP LOAD] Error details:', {
                    message: (error as Error).message,
                    stack: (error as Error).stack,
                    projectId: project.id
                });
            }
        
        const hasLoadedCampaigns = migratedCampaigns.length > 0 && 
                                   migratedCampaigns.some(c => c.images && c.images.length > 0);
        
        if (hasLoadedCampaigns) {
            // Merge database campaigns with session campaigns
            console.log(`[MERGE DEBUG] Session campaigns before merge:`, campaigns.map(c => ({
                id: c.id,
                headline: c.headline?.substring(0, 50) || '(empty)',
                imageCount: c.images.length
            })));
            
            const sessionCampaignsMap = new Map(campaigns.map(c => [c.id, c]));
            const mergedCampaigns = migratedCampaigns.map(dbCampaign => {
                const sessionCampaign = sessionCampaignsMap.get(dbCampaign.id);
                console.log(`[MERGE DEBUG] Processing DB campaign ${dbCampaign.id}:`, {
                    dbHeadline: dbCampaign.headline?.substring(0, 50) || '(empty)',
                    hasSession: !!sessionCampaign,
                    sessionHeadline: sessionCampaign?.headline?.substring(0, 50) || '(none)'
                });
                
                if (sessionCampaign) {
                    // Merge images: keep db images + add any new session-only images
                    const dbImageIds = new Set(dbCampaign.images.map((img: CampaignImage) => img.id));
                    const sessionOnlyImages = sessionCampaign.images.filter(
                        (img: CampaignImage) => !dbImageIds.has(img.id)
                    );
                    const merged = {
                        ...dbCampaign,  // DB data (including headline) should be preserved
                        images: [...dbCampaign.images, ...sessionOnlyImages]
                    };
                    console.log(`[MERGE DEBUG] Merged result for ${dbCampaign.id}:`, {
                        headline: merged.headline?.substring(0, 50) || '(empty)'
                    });
                    return merged;
                }
                return dbCampaign;
            });
            
            // Add any session-only campaigns (newly created Enhance/Fusion)
            const dbCampaignIds = new Set(migratedCampaigns.map(c => c.id));
            const sessionOnlyCampaigns = campaigns.filter(c => !dbCampaignIds.has(c.id));
            
            const finalCampaigns = [...mergedCampaigns, ...sessionOnlyCampaigns];
            
            console.log(`[PROJECT] Merged campaigns: ${migratedCampaigns.length} from DB + ${sessionOnlyCampaigns.length} session-only = ${finalCampaigns.length} total`);
            resetState(finalCampaigns);
            
            const initialIndices = finalCampaigns.reduce((acc, campaign) => {
                acc[campaign.id] = 0;
                return acc;
            }, {} as { [key: string]: number });
            setActiveImageIndices(initialIndices);
        } else if (campaigns.length === 0) {
            // Project is empty and no session campaigns - start fresh
            console.log(`[PROJECT LOAD] Starting with empty project ${project.id}`);
            resetState([]);
            setActiveImageIndices({});
        }
        // If project.campaigns is empty but session has campaigns, keep session campaigns
        
        setSavedImages(project.savedImages || []);
        
        })(); // Close async IIFE
    }, [project, resetState]);

    // 🔄 Poll for in-progress video generations and update when complete
    useEffect(() => {
        const generatingVideos = campaigns.flatMap(campaign => 
            campaign.images
                .filter((img: any) => img.isGenerating && img.isVideo)
                .map((img: any) => ({
                    campaignId: campaign.id,
                    imageId: img.id,
                    visualId: img.id,
                }))
        );

        if (generatingVideos.length === 0) {
            return; // No generating videos to poll
        }

        console.log(`[POLLING] Found ${generatingVideos.length} generating videos, starting poll...`);

        const pollInterval = setInterval(async () => {
            try {
                // Fetch latest visuals from database
                const response = await fetch(`/api/projects/${project.id}/visuals`, {
                    credentials: 'include',
                    headers: getAuthHeaders(),
                });

                if (!response.ok) {
                    console.error('[POLLING] Failed to fetch visuals:', response.statusText);
                    return;
                }

                const visuals = await response.json();
                
                // Check if any generating videos have completed
                let hasUpdates = false;
                
                setCampaigns(prevCampaigns => {
                    const updatedCampaigns = prevCampaigns.map(campaign => {
                        const updatedImages = campaign.images.map((img: any) => {
                            if (!img.isGenerating) return img;
                            
                            // Find matching visual in database
                            const visual = visuals.find((v: any) => v.id === img.id);
                            
                            if (!visual) return img;
                            
                            // Check if status changed
                            if (visual.status === 'completed' && visual.videoUrl) {
                                console.log(`[POLLING] Video ${img.id} completed! Updating...`);
                                hasUpdates = true;
                                return {
                                    ...img,
                                    src: visual.videoUrl,
                                    isGenerating: false,
                                    isSaved: true,
                                };
                            } else if (visual.status === 'failed') {
                                console.log(`[POLLING] Video ${img.id} failed!`);
                                hasUpdates = true;
                                return {
                                    ...img,
                                    isGenerating: false,
                                    isFailed: true,
                                };
                            }
                            
                            return img;
                        });
                        
                        return {
                            ...campaign,
                            images: updatedImages,
                        };
                    });
                    
                    return updatedCampaigns;
                });

                if (hasUpdates) {
                    // Scroll to top to show completed video
                    setTimeout(() => {
                        const visualsPanel = document.querySelector('.flex-1.overflow-y-auto.p-6');
                        if (visualsPanel) {
                            visualsPanel.scrollTo({ top: 0, behavior: 'smooth' });
                        }
                    }, 100);
                }
            } catch (error) {
                console.error('[POLLING] Error polling visuals:', error);
            }
        }, 5000); // Poll every 5 seconds

        // Cleanup interval on unmount or when generating videos change
        return () => {
            console.log('[POLLING] Stopping poll interval');
            clearInterval(pollInterval);
        };
    }, [campaigns, project.id]);

    useEffect(() => {
        setSavedImages(project.savedImages || []);
    }, [project.savedImages]);
    
    // FIX TEXT SAVE PERSISTENCE: Sync standalone state FROM campaigns (DB data) after merge
    // This prevents stale project.headline from overwriting correct campaign.headline
    // Track if we've already synced to avoid infinite loops
    const lastSyncedCampaignIdRef = useRef<string | null>(null);
    
    useEffect(() => {
        if (campaigns.length > 0 && campaigns[0].images.length > 0) {
            const firstCampaign = campaigns[0];
            // Only sync if this is a different campaign (project reload) or first load
            if (lastSyncedCampaignIdRef.current !== firstCampaign.id) {
                lastSyncedCampaignIdRef.current = firstCampaign.id;
                setHeadline(firstCampaign.headline || '');
                setSubheadline(firstCampaign.subheadline || '');
                setDescription(firstCampaign.description || '');
                setHashtags(firstCampaign.hashtags || []);
                console.log(`[PROJECT RELOAD] Synced standalone state from campaign[0]:`, {
                    campaignId: firstCampaign.id,
                    headline: firstCampaign.headline?.substring(0, 50),
                    subheadline: firstCampaign.subheadline?.substring(0, 50)
                });
            }
        }
    }, [campaigns]); // Run when campaigns change (including after DB merge)
    
    // Track campaigns changes to preserve unsaved visuals in memory
    useEffect(() => {
        if (campaigns.length > 0) {
            previousCampaignsRef.current = campaigns;
            
            // Unsaved visuals persist in React state (memory) during the editing session
            // They automatically disappear when user navigates away (natural React cleanup)
            const totalImages = campaigns.length > 0 ? campaigns.reduce((sum, c) => sum + c.images.length, 0) : 0;
            console.log(`[CAMPAIGNS] Tracking ${campaigns.length} campaigns (${totalImages} images) in memory for project ${project.id}`);
        }
    }, [campaigns, project.id]);

    useEffect(() => {
        if (!activeImage && campaigns.length > 0 && campaigns[0].images.length > 0) {
            setActiveImage({ campaignId: campaigns[0].id, imageId: campaigns[0].images[0].id });
        }
        if (activeImage) {
            const campaignExists = campaigns.some(c => c.id === activeImage.campaignId);
            if (campaignExists) {
                const imageExists = campaigns.find(c => c.id === activeImage.campaignId)?.images.some(i => i.id === activeImage.imageId);
                if (!imageExists) {
                     setActiveImage(null);
                }
            } else {
                 setActiveImage(null);
            }
        }
    }, [campaigns, activeImage]);

    useEffect(() => {
        if (!activeImage) return;

        const campaign = campaigns.find(c => c.id === activeImage.campaignId);
        if (!campaign) return;

        const image = campaign.images.find(i => i.id === activeImage.imageId);
        if (!image) return;

        const numTextRows = campaign.headline.split('\n').length;
        const design = getEffectiveDesign(image);
        const numDesignRows = design.headline.rows.length;

        if (numTextRows !== numDesignRows) {
            const newRows = [...design.headline.rows];

            if (numTextRows > numDesignRows) {
                const lastRowSettings = newRows[newRows.length - 1] || INITIAL_TEMPLATES[0].defaultDesign.headline.rows[0];
                for (let i = 0; i < numTextRows - numDesignRows; i++) {
                    newRows.push(JSON.parse(JSON.stringify(lastRowSettings)));
                }
            } else {
                newRows.splice(numTextRows);
            }

            const newOverride = deepMerge(image.design || {}, { headline: { rows: newRows } });
            
            setCampaigns(prev => prev.map(c => 
                c.id !== activeImage.campaignId ? c : {
                    ...c,
                    images: c.images.map(i => i.id !== activeImage.imageId ? i : { ...i, design: newOverride })
                }
            ), true); // fromHistory = true to prevent adding to undo stack
        }

    }, [campaigns, activeImage, getEffectiveDesign, setCampaigns]);


    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
            const modifierKey = isMac ? e.metaKey : e.ctrlKey;

            if (modifierKey && e.key === 'z' && !e.shiftKey) {
                e.preventDefault();
                if (canUndo) undo();
            } else if (modifierKey && ((isMac && e.shiftKey && e.key === 'z') || (!isMac && e.key === 'y'))) {
                e.preventDefault();
                if (canRedo) redo();
            } else if (modifierKey && e.key === 'g') {
                 e.preventDefault();
                 setShowAlignmentGrid(prev => !prev);
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => {
            window.removeEventListener('keydown', handleKeyDown);
        };
    }, [undo, redo, canUndo, canRedo]);
    
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (suggestionBoxRef.current && !suggestionBoxRef.current.contains(event.target as Node)) {
                setActiveSuggestions(null);
            }
            if (productSuggestionsRef.current && !productSuggestionsRef.current.contains(event.target as Node)) {
                setShowProductSuggestions(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleGenerateStep1 = async () => {
        if (!productInfo.trim()) {
            setError("Please describe your product or service.");
            return;
        }
        setIsLoading(true);
        setLoadingMessage('Generating headline and subheadline...');
        setError(null);
        try {
            const content = await generateCampaignContent(productInfo, brandAssets, excludedKeywords, userApiKey, 'step1', undefined, undefined, project?.language || 'en');
            console.log('AI Generated Step 1 Content:', content);
            setHeadline(content.headline || '');
            setSubheadline(content.subheadline || '');
            setImageSceneGuide(content.imagePromptSuggestion || '');
            console.log('Step 1 complete - Headline:', content.headline, 'Subheadline:', content.subheadline);
            setToast({ message: '✅ Headlines generated! Review and edit if needed, then generate description.', type: 'success' });
        } catch (err) {
            setError("Failed to generate headlines. Please try again.");
            console.error(err);
        } finally {
            setIsLoading(false);
            setLoadingMessage('');
        }
    };

    const handleGenerateStep2 = async () => {
        if (!headline.trim() || !subheadline.trim()) {
            setError("Please generate or enter a headline and subheadline first.");
            return;
        }
        setIsLoading(true);
        setLoadingMessage('Generating description and hashtags...');
        setError(null);
        try {
            const content = await generateCampaignContent(
                productInfo, 
                brandAssets, 
                excludedKeywords, 
                userApiKey, 
                'step2',
                headline,
                subheadline,
                project?.language || 'en'
            );
            console.log('AI Generated Step 2 Content:', content);
            setDescription(content.description || '');
            setHashtags(Array.isArray(content.hashtags) ? content.hashtags : []);
            console.log('Step 2 complete - Description:', content.description, 'Hashtags:', content.hashtags);
            setToast({ message: '✅ Description and hashtags generated successfully!', type: 'success' });
        } catch (err) {
            setError("Failed to generate description. Please try again.");
            console.error(err);
        } finally {
            setIsLoading(false);
            setLoadingMessage('');
        }
    };
    
    const handleAiImprove = useCallback(async (fieldType: 'headline' | 'subheadline' | 'description' | 'hashtags' | 'imageSceneGuide') => {
        const textMap = { headline, subheadline, description, hashtags: hashtags.join(' '), imageSceneGuide };
        const currentText = textMap[fieldType];

        if (!currentText.trim()) {
            setToast({ message: "Please write some text first, then AI will help you improve it.", type: 'info' });
            return;
        }
        
        setAiAction({ field: fieldType, action: 'moreOptions' });
        setActiveSuggestions(null);
        
        try {
            let suggestions: string[] = [];
            if (fieldType === 'imageSceneGuide') {
                suggestions = await regenerateImagePrompt(productInfo || currentText, excludedKeywords, userApiKey);
            } else if (fieldType === 'hashtags') {
                // For hashtags, generate improved versions
                const improved = await regenerateSingleField(productInfo || currentText, fieldType, excludedKeywords, currentText, brandAssets, userApiKey);
                if (Array.isArray(improved)) {
                    suggestions = [improved.join(' ')];
                } else {
                    suggestions = [improved];
                }
            } else {
                // Generate 2-3 improved versions of the user's text
                suggestions = await suggestAlternatives(fieldType, productInfo || currentText, excludedKeywords, currentText, brandAssets, userApiKey, project.language);
            }
            setActiveSuggestions({ field: fieldType, suggestions, originalText: currentText });
        } catch (err) {
            setToast({ message: `Failed to generate suggestions. Please try again.`, type: 'error' });
            console.error(err);
        } finally {
            setAiAction(null);
        }
    }, [productInfo, excludedKeywords, headline, subheadline, description, hashtags, imageSceneGuide, brandAssets, userApiKey, setToast]);
    
    const handleApplySuggestion = (suggestion: string) => {
        if (!activeSuggestions) return;
        const { field } = activeSuggestions;
        
        const setterMap = {
            headline: setHeadline,
            subheadline: setSubheadline,
            description: setDescription,
            hashtags: (text: string) => setHashtags(text.split(' ').filter(t => t.trim())),
            imageSceneGuide: setImageSceneGuide
        };

        setterMap[field]?.(suggestion);
        setActiveSuggestions(null);
        setToast({ message: "Text improved successfully ✓", type: 'success' });
    };
    
    // Handler for Magic Wand icon on Generated Visuals
    const handleOpenAiImprove = async (campaignId: string, fieldType: 'headline' | 'subheadline') => {
        const campaign = campaigns.find(c => c.id === campaignId);
        if (!campaign) return;
        
        const currentText = fieldType === 'headline' ? campaign.headline : campaign.subheadline;
        
        if (!currentText.trim()) {
            setToast({ message: "Please write some text first.", type: 'info' });
            return;
        }
        
        // Open popup with loading state
        setAiImprovementPopup({
            campaignId,
            fieldType,
            currentText,
            suggestions: [],
            suggestionSet: 1,
            loadingAction: 'more' // Initial load uses 'more' action
        });
        
        try {
            const suggestions = await suggestAlternatives(fieldType, productInfo || currentText, excludedKeywords, currentText, brandAssets, userApiKey, project.language);
            setAiImprovementPopup(prev => {
                if (!prev) return null;
                return { ...prev, suggestions, loadingAction: null };
            });
        } catch (err) {
            setToast({ message: `Failed to generate suggestions. Please try again.`, type: 'error' });
            console.error(err);
            setAiImprovementPopup(null);
        }
    };
    
    // Handler for generating more suggestions (Option 4-6, 7-9, etc.)
    const handleGenerateMoreSuggestions = async () => {
        if (!aiImprovementPopup) return;
        
        setAiImprovementPopup(prev => {
            if (!prev) return null;
            return { ...prev, loadingAction: 'more' };
        });
        
        try {
            const suggestions = await suggestAlternatives(
                aiImprovementPopup.fieldType, 
                productInfo || aiImprovementPopup.currentText, 
                excludedKeywords, 
                aiImprovementPopup.currentText, 
                brandAssets, 
                userApiKey,
                project.language
            );
            
            setAiImprovementPopup(prev => {
                if (!prev) return null;
                return {
                    ...prev,
                    suggestions,
                    suggestionSet: prev.suggestionSet + 1,
                    loadingAction: null
                };
            });
        } catch (err) {
            setToast({ message: `Failed to generate more suggestions.`, type: 'error' });
            console.error(err);
            setAiImprovementPopup(prev => {
                if (!prev) return null;
                return { ...prev, loadingAction: null };
            });
        }
    };
    
    // Handler for simplifying text to 6-8 words
    const handleSimplifyText = async () => {
        if (!aiImprovementPopup) return;
        
        setAiImprovementPopup(prev => {
            if (!prev) return null;
            return { ...prev, loadingAction: 'simplify' };
        });
        
        try {
            const suggestions = await simplifyText(
                aiImprovementPopup.fieldType, 
                aiImprovementPopup.currentText, 
                brandAssets, 
                userApiKey,
                project.language
            );
            
            setAiImprovementPopup(prev => {
                if (!prev) return null;
                return {
                    ...prev,
                    suggestions,
                    suggestionSet: 1, // Reset to 1 for simplified versions
                    loadingAction: null
                };
            });
        } catch (err) {
            setToast({ message: `Failed to simplify text.`, type: 'error' });
            console.error(err);
            setAiImprovementPopup(prev => {
                if (!prev) return null;
                return { ...prev, loadingAction: null };
            });
        }
    };
    
    // Handler for applying improved text from popup
    const handleApplyImprovedText = (suggestion: string) => {
        if (!aiImprovementPopup) return;
        
        setCampaigns(prevCampaigns =>
            prevCampaigns.map(c => {
                if (c.id !== aiImprovementPopup.campaignId) return c;
                return {
                    ...c,
                    [aiImprovementPopup.fieldType]: suggestion
                };
            })
        );
        
        setAiImprovementPopup(null);
        setToast({ message: "Text improved successfully ✓", type: 'success' });
    };

    const handleActiveImageDesignChange = (part: 'headline' | 'subheadline' | 'logo' | 'ctaButton', changes: object) => {
        if (!activeImage) {
            return;
        }

        if (savedImages.some(i => i.id === activeImage.imageId)) {
            setModifiedImageIds(prev => new Set(prev).add(activeImage.imageId));
        }
    
        setCampaigns(prevCampaigns =>
            prevCampaigns.map(c => {
                if (c.id !== activeImage.campaignId) return c;
                return {
                    ...c,
                    images: c.images.map(i => {
                        if (i.id !== activeImage.imageId) return i;
                        const designChange = part === 'logo' ? changes : { [part]: changes };
                        // Mark image as unsaved when design is changed
                        return { ...i, design: deepMerge(i.design || {}, designChange), isSaved: false };
                    }),
                };
            })
        );
    };

    const handleGenerateImages = async () => {
        if (!headline.trim()) {
            alert("Please generate or write a headline first.");
            setEditorStep('content');
            return;
        }
        setIsLoading(true);
        setError(null);
        let wasAutoColorApplied = false;
        
        const totalStartTime = performance.now();
        console.log(`\n🚀 [PERF] ========== START "Create My Designs" ==========`);
        console.log(`[AUTO-OPTIMIZE] Toggle state: ${autoOptimizeText ? 'ON - Will use AI analysis' : 'OFF - Will use grid fallback'}`);
        
        try {
            // TRUE Progressive Loading: Process each image as soon as it completes
            const imagePrompt = imageSceneGuide || productInfo;
            const generationStartTime = performance.now();
            
            console.log(`🔄 [PERF] Using true progressive loading - ${imageQuantity} images will appear as they complete`);
            setLoadingMessage(`Generating ${imageQuantity} visuals...`);
            
            // Create a temporary campaign ID that we'll update incrementally
            const campaignId = Date.now().toString();
            const tempCampaign: Campaign = {
                id: campaignId,
                headline,
                subheadline,
                description,
                hashtags,
                images: []
            };
            
            // Add empty campaign first so user sees it immediately
            setCampaigns(prev => [tempCampaign, ...prev]);
            setActiveImageIndices(prev => ({ ...prev, [campaignId]: 0 }));
            
            // Track completion for progress updates
            let completedCount = 0;
            const completionTimes: number[] = [];
            
            // Process each image immediately as it completes (truly progressive)
            const processImage = async (index: number) => {
                const imageStartTime = performance.now();
                try {
                    // Generate single image using backend Runware API
                    const headers: Record<string, string> = {
                        'Content-Type': 'application/json',
                    };
                    const token = localStorage.getItem('token');
                    if (token) {
                        headers['Authorization'] = `Bearer ${token}`;
                    }
                    const response = await fetch('/api/generate/visual', {
                        method: 'POST',
                        headers,
                        body: JSON.stringify({
                            projectId: project.id,
                            prompt: imagePrompt,
                            negativePrompt: excludedKeywords || undefined,
                            numberOfImages: 1,
                            size: project.size
                        })
                    });
                    
                    if (!response.ok) {
                        throw new Error(`Image generation failed: ${response.statusText}`);
                    }
                    
                    const data = await response.json();
                    const imageSrc = data.visuals[0]?.imageUrl;
                    
                    if (!imageSrc) {
                        throw new Error('No image URL returned from API');
                    }
                    
                    const genTime = performance.now() - imageStartTime;
                    console.log(`✅ [PERF] Image ${index + 1}/${imageQuantity} generated in ${genTime.toFixed(0)}ms, analyzing...`);
                    setLoadingMessage(`Analyzing visual ${index + 1}/${imageQuantity}...`);
                    
                    // Analyze immediately
                    const analysisStartTime = performance.now();
                    const design = await analyzeImageForLayout(imageSrc, autoOptimizeText).catch(err => {
                        console.error(`Layout analysis failed for image ${index + 1}:`, err);
                        return {};
                    });
                    const analysisTime = performance.now() - analysisStartTime;
                    
                    // Add this image to the campaign RIGHT NOW (user sees it immediately!)
                    const newImage = {
                        id: `${Date.now()}-${Math.random()}`,
                        src: imageSrc,
                        design
                    };
                    
                    setCampaigns(prev => prev.map(c => 
                        c.id === campaignId 
                            ? { ...c, images: [newImage, ...c.images] }
                            : c
                    ));
                    
                    completedCount++;
                    const totalTime = performance.now() - imageStartTime;
                    completionTimes.push(totalTime);
                    
                    const progress = Math.round(completedCount / imageQuantity * 100);
                    setLoadingMessage(`Completed ${completedCount}/${imageQuantity} visuals (${progress}%)...`);
                    
                    console.log(`🎨 [PERF] Image ${index + 1}/${imageQuantity} DISPLAYED! Gen:${genTime.toFixed(0)}ms + Analysis:${analysisTime.toFixed(0)}ms = ${totalTime.toFixed(0)}ms total (${(performance.now() - generationStartTime).toFixed(0)}ms elapsed)`);
                    
                } catch (err) {
                    console.error(`Failed to process image ${index + 1}:`, err);
                }
            };
            
            // Start all images in parallel, but they'll update UI incrementally as they complete
            await Promise.all(
                Array(imageQuantity).fill(0).map((_, index) => processImage(index))
            );
            
            const totalDuration = performance.now() - totalStartTime;
            const avgCompletionTime = completionTimes.length > 0 
                ? completionTimes.reduce((a, b) => a + b, 0) / completionTimes.length 
                : 0;
            
            console.log(`🎉 [PERF] ========== TOTAL "Create My Designs" TIME: ${totalDuration.toFixed(0)}ms ==========`);
            console.log(`📊 [PERF] Progressive loading metrics:`);
            console.log(`  • Total time: ${totalDuration.toFixed(0)}ms`);
            console.log(`  • Average per image: ${avgCompletionTime.toFixed(0)}ms`);
            console.log(`  • First image appeared at: ~${Math.min(...completionTimes).toFixed(0)}ms`);
            console.log(`  • Completion times: [${completionTimes.map(t => t.toFixed(0)).join('ms, ')}ms]`);
            
            // Scroll to top of Generated Visuals panel to show new images
            setTimeout(() => {
                const visualsPanel = document.querySelector('.flex-1.overflow-y-auto.p-6');
                if (visualsPanel) {
                    visualsPanel.scrollTo({ top: 0, behavior: 'smooth' });
                }
            }, 100);
            
            wasAutoColorApplied = true;
            if (wasAutoColorApplied) {
                setToast({ message: "Auto color applied for better visibility.", type: 'info' });
            }

        } catch (err: any) {
            const displayError = `Failed to generate images: ${err.message || 'An unknown error occurred. Please try again later.'}`;
            setError(displayError);
            console.error("Image generation error:", err);
        } finally {
            setIsLoading(false);
            setLoadingMessage('');
        }
    };
    
    const handleDeleteImage = (campaignId: string, imageId: string) => {
        const newCampaigns = campaigns.map(c => {
            if (c.id === campaignId) {
                return { ...c, images: c.images.filter(img => img.id !== imageId) };
            }
            return c;
        });
        setCampaigns(newCampaigns);
        
        setActiveImageIndices(prev => {
            const campaign = newCampaigns.find(c => c.id === campaignId);
            const newImagesCount = campaign?.images.length ?? 0;
            if (newImagesCount > 0 && (prev[campaignId] ?? 0) >= newImagesCount) {
                return { ...prev, [campaignId]: 0 };
            }
            return prev;
        });
    };

    const handleRegenerateImage = async (campaignId: string, imageId: string) => {
        setRegeneratingImageId(imageId);
        setError(null);
        let wasAutoColorApplied = false;

        try {
            const campaign = campaigns.find(c => c.id === campaignId);
            if (!campaign) return;

            const imagePrompt = imageSceneGuide || productInfo;
            
            // Generate image using backend Runware API
            const headers: Record<string, string> = {
                'Content-Type': 'application/json',
            };
            const token = localStorage.getItem('token');
            if (token) {
                headers['Authorization'] = `Bearer ${token}`;
            }
            const response = await fetch('/api/generate/visual', {
                method: 'POST',
                headers,
                body: JSON.stringify({
                    projectId: project.id,
                    prompt: imagePrompt,
                    negativePrompt: excludedKeywords || undefined,
                    numberOfImages: 1,
                    size: project.size
                })
            });
            
            if (!response.ok) {
                throw new Error(`Image generation failed: ${response.statusText}`);
            }
            
            const data = await response.json();
            const newImageSrc = data.visuals[0]?.imageUrl;
            
            if (!newImageSrc) {
                throw new Error('No image URL returned from API');
            }
            
            const layoutSuggestion = await analyzeImageForLayout(newImageSrc, autoOptimizeText).catch(() => ({}));
            wasAutoColorApplied = true;
            const finalDesign = layoutSuggestion;

            const newCampaigns = campaigns.map(c =>
                    c.id === campaignId
                        ? {
                            ...c,
                            images: c.images.map(img =>
                                img.id === imageId ? { id: img.id, src: newImageSrc, design: finalDesign } : img
                            ),
                        }
                        : c
                );
            setCampaigns(newCampaigns);
            if (wasAutoColorApplied) {
                setToast({ message: "Auto color applied for better visibility.", type: 'info' });
            }
        } catch (err: any) {
            const displayError = `Failed to regenerate image: ${err.message || 'An unknown error occurred.'}`;
            setError(displayError);
            console.error("Image regeneration error:", err);
        } finally {
            setRegeneratingImageId(null);
        }
    };
    
    const handleCampaignTextChange = (campaignId: string, field: 'headline' | 'subheadline' | 'description', value: string) => {
        const campaign = campaigns.find(c => c.id === campaignId);
        if (campaign) {
            const imageIdsInCampaign = campaign.images.map(i => i.id);
            const savedImageIdsInCampaign = imageIdsInCampaign.filter(id => savedImages.some(saved => saved.id === id));
            if (savedImageIdsInCampaign.length > 0) {
                setModifiedImageIds(prev => {
                    const newSet = new Set(prev);
                    savedImageIdsInCampaign.forEach(id => newSet.add(id));
                    return newSet;
                });
            }
        }

        // Update campaigns and clear isSaved flag for edited images (green check disappears)
        const newCampaigns = campaigns.map(c => {
            if (c.id === campaignId) {
                return {
                    ...c,
                    [field]: value,
                    // Mark all images in this campaign as unsaved when text is edited
                    images: c.images.map(img => ({ ...img, isSaved: false }))
                };
            }
            return c;
        });
        setCampaigns(newCampaigns);
    };

    const handleDownload = async (campaign: Campaign, image: CampaignImage) => {
        const design = getEffectiveDesign(image);
        const [w, h] = project.size.split('x').map(Number);
        
        const canvas = document.createElement('canvas');
        canvas.width = w * 100;
        canvas.height = h * 100;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        try {
            await renderCampaignImageToCanvas(ctx, canvas.width, canvas.height, image, campaign, design, brandAssets, project.size, currentUserPlan);
    
            const link = document.createElement('a');
            link.download = `${campaign.headline.replace(/\s+/g, '-').toLowerCase()}-visual.jpg`;
            link.href = canvas.toDataURL('image/jpeg', 0.9);
            link.click();
        } catch (error) {
            console.error("Failed to render and download image", error);
            alert("Sorry, there was an error downloading the image. Please try again.");
        }
    };
    
    // Video control handlers
    const handleVideoPlayPause = (imageId: string) => {
        const videoEl = videoRefs.current.get(imageId);
        if (!videoEl) return;
        
        const isCurrentlyPlaying = videoPlayState.get(imageId) || false;
        
        if (isCurrentlyPlaying) {
            videoEl.pause();
            setVideoPlayState(prev => new Map(prev).set(imageId, false));
        } else {
            videoEl.play();
            setVideoPlayState(prev => new Map(prev).set(imageId, true));
        }
    };
    
    const handleVideoMuteToggle = (imageId: string) => {
        const videoEl = videoRefs.current.get(imageId);
        if (!videoEl) return;
        
        const isCurrentlyMuted = videoMuteState.get(imageId) ?? true; // Default muted
        
        videoEl.muted = !isCurrentlyMuted;
        setVideoMuteState(prev => new Map(prev).set(imageId, !isCurrentlyMuted));
    };
    
    const handleVideoDownload = (image: CampaignImage) => {
        // Direct download for videos (no canvas rendering needed)
        const link = document.createElement('a');
        link.download = `video-${image.id}.mp4`;
        link.href = image.src;
        link.click();
    };
    
    const handleVideoFullscreen = (imageId: string) => {
        const videoEl = videoRefs.current.get(imageId);
        if (!videoEl) return;
        
        if (videoEl.requestFullscreen) {
            videoEl.requestFullscreen();
        } else if ((videoEl as any).webkitRequestFullscreen) {
            (videoEl as any).webkitRequestFullscreen();
        } else if ((videoEl as any).mozRequestFullScreen) {
            (videoEl as any).mozRequestFullScreen();
        } else if ((videoEl as any).msRequestFullscreen) {
            (videoEl as any).msRequestFullscreen();
        }
    };

    const handleImageSelectToggle = (imageId: string, isShiftKey: boolean = false) => {
        console.log('[SELECT] Toggle called for imageId:', imageId, 'Shift:', isShiftKey);
        
        // PREVENT SELECTING VIDEOS: Videos are auto-saved and shouldn't be manually saved
        const allImages = campaigns.flatMap(c => c.images);
        const targetImage = allImages.find(img => img.id === imageId);
        if (targetImage && (targetImage as any).isVideo) {
            console.log('[SELECT] Blocked: Cannot select videos (already auto-saved)');
            setToast({ 
                message: '🎬 Videos are automatically saved to your project. No need to save them again!', 
                type: 'info' 
            });
            return;
        }
        
        setSelectedImageIds(prev => {
            const newSet = new Set(prev);
            
            if (isShiftKey) {
                // Shift+Click: Add to selection (multi-select)
                if (newSet.has(imageId)) {
                    newSet.delete(imageId);
                    console.log('[SELECT] [SHIFT] Removing from multi-selection:', imageId);
                } else {
                    newSet.add(imageId);
                    console.log('[SELECT] [SHIFT] Adding to multi-selection:', imageId);
                }
            } else {
                // Regular click: Single selection (clear others first)
                if (newSet.has(imageId) && newSet.size === 1) {
                    // Clicking the only selected image deselects it
                    newSet.clear();
                    console.log('[SELECT] Deselecting only image:', imageId);
                } else {
                    // Select only this image
                    newSet.clear();
                    newSet.add(imageId);
                    console.log('[SELECT] Single-selecting image:', imageId);
                }
            }
            
            console.log('[SELECT] New selection Set size:', newSet.size, 'IDs:', Array.from(newSet));
            return newSet;
        });
    };

    const handleSaveSelectedImages = async () => {
        // FIX: Prevent duplicate/concurrent saves
        if (isSavingProject) {
            console.log('[SAVE] Save already in progress, blocking duplicate save');
            return;
        }
        
        if (selectedImageIds.size === 0) {
            setToast({ message: "No new images selected to save.", type: 'info' });
            return;
        }
        
        // Check if any selected images are already saved
        const allGeneratedImages = campaigns.flatMap(c => c.images);
        const selectedImages = allGeneratedImages.filter(img => selectedImageIds.has(img.id));
        const hasAnySavedImages = selectedImages.some(img => img.isSaved);
        
        if (hasAnySavedImages) {
            // Show warning: can't re-save already saved images
            toast({
                title: '⚠️ This project was previously saved to My Projects, cannot be edited directly.',
                description: 'To make changes, please generate new visuals instead of re-selecting saved ones.',
                variant: 'warning',
                duration: 5000,
            });
            return;
        }
        
        // FIX: Set save-in-progress flag and ensure cleanup
        setIsSavingProject(true);
        console.log('[SAVE] Starting save operation, setting isSavingProject=true');
        
        try {
            const allGeneratedImages = campaigns.flatMap(c => c.images);
            const newlySelectedImages = allGeneratedImages.filter(img => selectedImageIds.has(img.id));
        
            // Generate high-quality rendered canvases for all newly selected images and upload to storage
            let imagesWithRenderedCanvas;
            try {
            imagesWithRenderedCanvas = await Promise.all(newlySelectedImages.map(async (image) => {
                // Find the campaign this image belongs to
                const campaign = campaigns.find(c => c.images.some(img => img.id === image.id));
                if (!campaign) return image;
                
                try {
                    const design = getEffectiveDesign(image);
                    const [w, h] = project.size.split('x').map(Number);
                    
                    const canvas = document.createElement('canvas');
                    // GUARANTEE minimum 1200px width for crystal-clear Community previews
                    // Calculate scale factor to ensure width is at least 1200px
                    const MIN_WIDTH = 1200;
                    const scaleFactor = Math.max(MIN_WIDTH / w, 6); // At least 6x for exceptional quality
                    canvas.width = w * scaleFactor;
                    canvas.height = h * scaleFactor;
                    const ctx = canvas.getContext('2d');
                    
                    if (ctx) {
                        await renderCampaignImageToCanvas(
                            ctx,
                            canvas.width,
                            canvas.height,
                            image,
                            campaign,
                            design,
                            brandAssets,
                            project.size,
                            currentUserPlan
                        );
                        
                        // ULTRA HIGH QUALITY JPEG - 0.98 quality for maximum sharpness
                        const highQualityJpeg = canvas.toDataURL('image/jpeg', 0.98);
                        
                        // Upload to object storage - REQUIRED (no base64 fallback)
                        // Retry up to 3 times with exponential backoff
                        let uploadUrl = null;
                        let lastError = null;
                        
                        for (let attempt = 0; attempt < 3; attempt++) {
                            try {
                                const uploadResponse = await fetch('/api/upload-community-image', {
                                    method: 'POST',
                                    headers: {
                                        ...getAuthHeaders(),
                                        'Content-Type': 'application/json',
                                    },
                                    credentials: 'include',
                                    body: JSON.stringify({ imageData: highQualityJpeg }),
                                });
                                
                                if (uploadResponse.ok) {
                                    const { url } = await uploadResponse.json();
                                    uploadUrl = url;
                                    break; // Success, exit retry loop
                                } else {
                                    const errorText = await uploadResponse.text();
                                    lastError = new Error(`Upload failed with status ${uploadResponse.status}: ${errorText}`);
                                }
                            } catch (uploadError) {
                                lastError = uploadError as Error;
                            }
                            
                            // Wait before retry (exponential backoff: 500ms, 1s, 2s)
                            if (attempt < 2) {
                                await new Promise(resolve => setTimeout(resolve, 500 * Math.pow(2, attempt)));
                            }
                        }
                        
                        // CRITICAL: If upload failed after retries, throw error (no base64 fallback)
                        if (!uploadUrl) {
                            console.error('❌ Upload to object storage failed after 3 attempts:', lastError);
                            throw new Error(`Failed to upload image to storage: ${lastError?.message || 'Unknown error'}`);
                        }
                        
                        console.log(`✅ Uploaded image ${image.id} to object storage: ${uploadUrl}`);
                        return { ...image, renderedImageUrl: uploadUrl };
                    }
                } catch (error) {
                    console.warn('Failed to generate rendered canvas for image:', image.id, error);
                    console.log('Using placeholder thumbnail for image:', image.id);
                    
                    // Generate placeholder thumbnail and upload it instead of failing
                    try {
                        const [w, h] = project.size.split('x').map(Number);
                        const MIN_WIDTH = 1200;
                        const scaleFactor = Math.max(MIN_WIDTH / w, 6);
                        const placeholderImage = generatePlaceholderThumbnail(w * scaleFactor, h * scaleFactor);
                        
                        // Upload placeholder to storage
                        let uploadUrl = null;
                        for (let attempt = 0; attempt < 3; attempt++) {
                            try {
                                const uploadResponse = await fetch('/api/upload-community-image', {
                                    method: 'POST',
                                    headers: {
                                        ...getAuthHeaders(),
                                        'Content-Type': 'application/json',
                                    },
                                    credentials: 'include',
                                    body: JSON.stringify({ imageData: placeholderImage }),
                                });
                                
                                if (uploadResponse.ok) {
                                    const { url } = await uploadResponse.json();
                                    uploadUrl = url;
                                    break;
                                }
                            } catch (uploadError) {
                                console.warn('Placeholder upload attempt', attempt + 1, 'failed:', uploadError);
                            }
                            
                            if (attempt < 2) {
                                await new Promise(resolve => setTimeout(resolve, 500 * Math.pow(2, attempt)));
                            }
                        }
                        
                        if (uploadUrl) {
                            console.log(`✅ Uploaded placeholder for image ${image.id}:`, uploadUrl);
                            return { ...image, renderedImageUrl: uploadUrl };
                        }
                    } catch (placeholderError) {
                        console.error('Even placeholder failed for image:', image.id, placeholderError);
                    }
                }
                
                // If everything failed, return image without rendered URL (save will still proceed)
                return image;
            }));
        } catch (error) {
            console.error('❌ Save operation failed:', error);
            setToast({ 
                message: `Failed to save images: ${error instanceof Error ? error.message : 'Unknown error'}. Please try again.`, 
                type: 'error' 
            });
            return; // Stop save operation
        }
        
        // Check if any uploads failed (warning only, don't block save)
        const failedUploads = imagesWithRenderedCanvas.filter(img => !(img as CampaignImage).renderedImageUrl);
        if (failedUploads.length > 0) {
            console.warn(`${failedUploads.length} image(s) saved without thumbnails (will use video URLs):`, failedUploads.map(img => img.id));
            // Don't block save - allow images to be saved even without rendered thumbnails
        }
    
        // Build final saved images: existing saved images + newly selected images (with rendered canvases)
        const savedImagesMap = new Map((project.savedImages || []).map(img => [img.id, img]));
        imagesWithRenderedCanvas.forEach(image => {
            savedImagesMap.set(image.id, image);
        });
        const finalSavedImages = Array.from(savedImagesMap.values());
        const finalSavedImageIds = new Set(finalSavedImages.map(img => img.id));
    
        // Create a map of enriched images (with renderedImageUrl) to use when building campaigns
        const enrichedImageMap = new Map(imagesWithRenderedCanvas.map(img => [img.id, img]));
    
        // Build campaigns map from existing saved campaigns (to preserve previously saved images)
        const campaignsMap = new Map<string, Campaign>();
        
        console.log('🔍 [SAVE] Current session campaigns before merge:', campaigns.map(c => ({ 
            id: c.id, 
            headline: c.headline, 
            subheadline: c.subheadline 
        })));
        
        // First, add all existing saved campaigns from the project
        (project.campaigns || []).forEach(campaign => {
            campaignsMap.set(campaign.id, campaign);
        });
        
        // Then, update with current session campaigns (campaigns already contain latest text edits)
        campaigns.forEach(campaign => {
            const existingCampaign = campaignsMap.get(campaign.id);
            if (existingCampaign) {
                // Merge: Replace modified images + add new saved images from current session
                // Use enriched images with renderedImageUrl for newly saved images
                const currentSessionImageMap = new Map(campaign.images.map(img => {
                    const enriched = enrichedImageMap.get(img.id);
                    return [img.id, enriched || img];
                }));
                
                // Update existing images with current session data (for modified images)
                // and keep images that aren't in the current session
                const updatedExistingImages = existingCampaign.images.map(existingImg => {
                    const currentVersionOfImage = currentSessionImageMap.get(existingImg.id);
                    // If this image exists in current session and is saved, use the updated version WITH isSaved: true
                    if (currentVersionOfImage && finalSavedImageIds.has(existingImg.id)) {
                        return { ...currentVersionOfImage, isSaved: true };
                    }
                    return existingImg;
                });
                
                // Add newly saved images that weren't in the existing campaign
                const existingImageIds = new Set(existingCampaign.images.map(img => img.id));
                const newImagesForThisCampaign = campaign.images
                    .map(img => enrichedImageMap.get(img.id) || img) // Use enriched version if available
                    .filter(img => finalSavedImageIds.has(img.id) && !existingImageIds.has(img.id))
                    .map(img => ({ ...img, isSaved: true })); // Mark as saved
                
                // Combine all images (unsaved visuals persist in memory during session)
                let allImages = [...updatedExistingImages, ...newImagesForThisCampaign];
                
                campaignsMap.set(campaign.id, {
                    ...campaign,
                    images: allImages
                });
            } else {
                // New campaign: only save images that are selected
                // Use enriched images with renderedImageUrl
                let campaignImages = campaign.images
                    .map(img => enrichedImageMap.get(img.id) || img) // Use enriched version if available
                    .filter(img => finalSavedImageIds.has(img.id))
                    .map(img => ({ ...img, isSaved: true })); // Mark as saved
                
                campaignsMap.set(campaign.id, {
                    ...campaign,
                    images: campaignImages
                });
            }
        });
        
        // Convert map to array and filter out campaigns with no saved images
        const persistedCampaigns = Array.from(campaignsMap.values())
            .filter(campaign => campaign.images.length > 0);
    
        const updatedProjectData: Project = {
            ...project,
            name: projectName,
            lastModified: new Date().toISOString().split('T')[0],
            campaigns: persistedCampaigns,
            savedImages: finalSavedImages,
            thumbnailUrl: project.thumbnailUrl,
        };
    
        // 🎯 FIX: ALWAYS update thumbnail when saving (not just when missing)
        if (newlySelectedImages.length > 0) {
            const firstImageToSave = newlySelectedImages[0];
            
            // Check if this is a QuickClip video
            const isVideo = firstImageToSave.src?.startsWith('blob:') || 
                           firstImageToSave.src?.includes('.mp4') ||
                           firstImageToSave.src?.includes('.webm') ||
                           (firstImageToSave as any).videoUrl;
            
            if (isVideo) {
                // For videos, use thumbnailUrl if available, otherwise use videoUrl
                const videoVisual = firstImageToSave as any;
                updatedProjectData.thumbnailUrl = videoVisual.thumbnailUrl || videoVisual.videoUrl || videoVisual.src;
                console.log('[THUMBNAIL] Using video thumbnail:', updatedProjectData.thumbnailUrl?.substring(0, 50));
            } else {
                // For images, generate rendered thumbnail
                const campaignForThumbnail = campaigns.find(c => c.images.some(i => i.id === firstImageToSave.id));
                if (campaignForThumbnail) {
                    try {
                        updatedProjectData.thumbnailUrl = await generateThumbnailDataUrl(
                            firstImageToSave,
                            campaignForThumbnail,
                            getEffectiveDesign(firstImageToSave),
                            brandAssets,
                            project.size,
                            currentUserPlan
                        );
                        console.log('[THUMBNAIL] Generated image thumbnail (data URL)');
                    } catch (e) {
                        console.error("Failed to generate thumbnail, using fallback.", e);
                        updatedProjectData.thumbnailUrl = firstImageToSave.src;
                    }
                }
            }
        }
    
        // Update session campaigns to mark selected images as saved WITHOUT removing unsaved images
        // Campaigns already contain latest text edits from both sidebar and Generated Visuals section
        setCampaigns(prevCampaigns => prevCampaigns.map(campaign => ({
            ...campaign,
            images: campaign.images.map(img => {
                // If this image was just saved, mark it as saved and add renderedImageUrl
                if (selectedImageIds.has(img.id)) {
                    const enriched = enrichedImageMap.get(img.id);
                    return enriched ? { ...enriched, isSaved: true } : { ...img, isSaved: true };
                }
                return img;
            })
        })));
        
        const numSaved = selectedImageIds.size;
        const message = `✅ ${numSaved} ${numSaved === 1 ? 'image has' : 'images have'} been saved to your project.`;
        
        // Persist project to database
        try {
            const authHeaders = getAuthHeaders();
            const savePayload = {
                name: updatedProjectData.name,
                campaigns: updatedProjectData.campaigns || [],
                thumbnailUrl: updatedProjectData.thumbnailUrl,
            };
            
            console.log('🔍 [SAVE] Sending to database:', {
                campaignCount: savePayload.campaigns.length,
                campaignDetails: savePayload.campaigns.map(c => ({
                    id: c.id,
                    headline: c.headline,
                    subheadline: c.subheadline,
                    imageCount: c.images?.length || 0
                }))
            });
            
            const saveResponse = await fetch(`/api/projects/${updatedProjectData.id}/save`, {
                method: 'POST',
                headers: {
                    ...authHeaders,
                    'Content-Type': 'application/json',
                },
                credentials: 'include',
                body: JSON.stringify(savePayload),
            });
            
            // 🎯 FIX: Invalidate and refetch projects cache for immediate Dashboard update
            if (saveResponse.ok) {
                // Use onUpdateProject callback for backward compatibility
                onUpdateProject({
                    ...updatedProjectData,
                    thumbnailUrl: updatedProjectData.thumbnailUrl,
                    lastModified: updatedProjectData.lastModified
                });
                console.log('[SAVE] 📝 Updated project via callback');
                
                // Invalidate projects cache and immediately refetch to show updated thumbnail
                await queryClient.invalidateQueries({ queryKey: ['/api/projects'] });
                await queryClient.refetchQueries({ queryKey: ['/api/projects'] });
                console.log('[SAVE] ✅ Projects cache invalidated and refetched - Dashboard will update immediately');
            }
        } catch (error) {
            console.error('Failed to save project to database:', error);
        }
        
        setToast({ message, type: 'success' });
        
        // AUTO-UPDATE SHARED IMAGE: If a saved image is currently shared to Community, automatically update it
        if (publicVisualId && selectedImageIds.has(publicVisualId)) {
            console.log('[AUTO-UPDATE] Shared image was edited and saved - updating Community version:', publicVisualId);
            // Silently update the Community version without showing a toast (already showing save success)
            await setPublicVisualInternal(publicVisualId, false);
            console.log('[AUTO-UPDATE] Community version updated successfully');
        }
        
            setSelectedImageIds(new Set());
            // Clear modified state for saved images
            setModifiedImageIds(prev => {
                const newSet = new Set(prev);
                selectedImageIds.forEach(id => newSet.delete(id));
                return newSet;
            });
        } finally {
            // FIX: Always reset save-in-progress flag
            setIsSavingProject(false);
            console.log('[SAVE] Save operation completed, setting isSavingProject=false');
        }
    };

    const handleUpdateImageDesign = useCallback((campaignId: string, imageId: string, newDesign: DesignSettingsOverride) => {
        setCampaigns(prevCampaigns => prevCampaigns.map(c => {
            if (c.id === campaignId) {
                return {
                    ...c,
                    images: c.images.map(img => {
                        if (img.id !== imageId) return img;
                        const mergedDesign = deepMerge(img.design || {}, newDesign);
                        // Mark image as unsaved when design is changed
                        return { ...img, design: mergedDesign, isSaved: false };
                    }),
                };
            }
            return c;
        }));
        setEditingImage(null);
    }, [setCampaigns]);
    
    // --- New Upload & Auto Layout Handlers ---

    const padImageToRatio = (dataUrl: string, targetRatio: number): Promise<string> => {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.crossOrigin = "Anonymous";
            img.src = dataUrl;
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const imageRatio = img.width / img.height;
    
                let canvasWidth = img.width;
                let canvasHeight = img.height;
    
                if (Math.abs(imageRatio - targetRatio) > 0.01) {
                    if (imageRatio > targetRatio) { // Image is wider than target, pad height
                        canvasHeight = img.width / targetRatio;
                    } else { // Image is taller than target, pad width
                        canvasWidth = img.height * targetRatio;
                    }
                }
    
                canvas.width = canvasWidth;
                canvas.height = canvasHeight;
    
                const ctx = canvas.getContext('2d');
                if (!ctx) return reject('Could not get canvas context for padding');
                
                ctx.fillStyle = '#000000';
                ctx.fillRect(0, 0, canvas.width, canvas.height);
    
                const x = (canvas.width - img.width) / 2;
                const y = (canvas.height - img.height) / 2;
                ctx.drawImage(img, x, y);
    
                resolve(canvas.toDataURL('image/jpeg', 0.9));
            };
            img.onerror = reject;
        });
    };

    const processUploadedImage = async (dataUrl: string, shouldPad: boolean = false) => {
        setIsLoading(true);
        setLoadingMessage('Analyzing image and creating layout...');
        setAspectRatioMismatch(null);
        setError(null);
        let wasAutoColorApplied = false;
        
        try {
            let finalDataUrl = dataUrl;
            if (shouldPad) {
                const [w, h] = project.size.split('x').map(Number);
                finalDataUrl = await padImageToRatio(dataUrl, w / h);
            }

            const layoutSuggestion = await analyzeImageForLayout(finalDataUrl, autoOptimizeText).catch(err => {
                console.error("Layout analysis failed for uploaded image:", err);
                return {};
            });
            wasAutoColorApplied = true;
            const finalDesign = layoutSuggestion;


            const newCampaign: Campaign = {
                id: `campaign-upload-${Date.now()}`,
                headline,
                subheadline,
                description,
                hashtags,
                images: [{
                    id: `img-upload-${Date.now()}`,
                    src: finalDataUrl,
                    design: finalDesign,
                }]
            };

            setCampaigns([newCampaign, ...campaigns]);
            if (wasAutoColorApplied) {
                setToast({ message: "Auto color applied for better visibility.", type: 'info' });
            } else {
                alert('✅ AI has optimized your layout based on your uploaded image.');
            }
        } catch (err) {
            console.error("Error processing uploaded image:", err);
            setError("Failed to process the uploaded image. Please try again.");
        } finally {
            setIsLoading(false);
            setLoadingMessage('');
        }
    };
    
    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (file.size > 10 * 1024 * 1024) {
            setError("File size exceeds 10MB. Please upload a smaller image.");
            return;
        }

        if (!['image/jpeg', 'image/png'].includes(file.type)) {
            setError("Invalid file type. Please upload a JPG or PNG image.");
            return;
        }
        
        setError(null);
        setIsLoading(true);
        setLoadingMessage('Validating image...');

        try {
            const reader = new FileReader();
            reader.onload = (event) => {
                const dataUrl = event.target?.result as string;
                const img = new Image();
                img.src = dataUrl;
                img.onload = () => {
                    const imageRatio = img.width / img.height;
                    const [w, h] = project.size.split('x').map(Number);
                    const projectRatio = w / h;
                    
                    setIsLoading(false);
                    setLoadingMessage('');

                    if (Math.abs(imageRatio - projectRatio) > 0.02) {
                        setAspectRatioMismatch({ file, dataUrl });
                    } else {
                        processUploadedImage(dataUrl);
                    }
                };
                 img.onerror = () => {
                    setIsLoading(false);
                    setError("Could not read the uploaded image file.");
                 }
            };
            reader.readAsDataURL(file);
        } catch (err) {
            setIsLoading(false);
            setError("An error occurred while reading the file.");
        } finally {
            if (uploadInputRef.current) {
                uploadInputRef.current.value = "";
            }
        }
    };

    // --- New AI Product Fusion Handlers ---

    const handleSceneUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsLoading(true);
        setLoadingMessage('Analyzing scene...');
        setError(null);
        setDetectedSceneType(null);

        try {
            const assetFile = await compressAndReadFile(file);
            setSceneImage(assetFile);
            const sceneType = await detectSceneType(assetFile.dataUrl, userApiKey);
            setDetectedSceneType(sceneType);
        } catch (err) {
            setError('Failed to process scene image. Please try again.');
        } finally {
            setIsLoading(false);
            setLoadingMessage('');
            if (sceneUploadRef.current) sceneUploadRef.current.value = "";
        }
    };

    const handleProductUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsLoading(true);
        setLoadingMessage('Processing product image...');
        setError(null);

        try {
            // First compress the image
            const assetFile = await compressAndReadFile(file);
            
            // Check if it's JPEG or needs background removal
            const needsBackgroundRemoval = file.type === 'image/jpeg' || file.type === 'image/jpg';
            
            if (needsBackgroundRemoval) {
                setLoadingMessage('Removing background (this may take a moment)...');
                try {
                    // Remove background using AI
                    const transparentDataUrl = await removeImageBackground(file);
                    setProductImage({ name: file.name, dataUrl: transparentDataUrl });
                    setToast({ message: "Background removed successfully!", type: 'success' });
                } catch (bgError) {
                    console.error('Background removal failed:', bgError);
                    // Fallback: Use the original image
                    setProductImage(assetFile);
                    setToast({ message: "Using original image (background removal failed)", type: 'info' });
                }
            } else {
                // PNG - use as-is
                setProductImage(assetFile);
            }
        } catch (err) {
            setError('Failed to process product image.');
        } finally {
            setIsLoading(false);
            setLoadingMessage('');
            if (productUploadRef.current) productUploadRef.current.value = "";
        }
    };
    
    const handleGeneratePlacementSuggestions = async () => {
        if (!sceneImage) {
            setError("Please upload a background scene first to get placement suggestions.");
            return;
        }

        setIsLoading(true);
        setLoadingMessage('Generating placement suggestion...');
        setError(null);

        try {
            const prompt = `You are helping a user place a product into a background scene for a product fusion image.

Scene context: ${detectedSceneType || 'Unknown scene type'}
Has product image: ${productImage ? 'Yes' : 'No'}

Generate a single creative and practical placement suggestion for how to place the product in this scene. The suggestion should be a clear sentence (10-20 words) describing the placement.

Requirements:
- Be specific about positioning (e.g., "on the table", "in the foreground", "centered")
- Consider the scene type if available
- Make the suggestion realistic and natural
- Keep it concise (10-20 words)
- Return ONLY the suggestion text, nothing else (no JSON, no formatting)

Example: "Place the product centered on the wooden table with soft natural light from the left"

Placement suggestion:`;

            const headers: Record<string, string> = {
                'Content-Type': 'application/json',
            };
            
            const token = localStorage.getItem('token');
            if (token) {
                headers['Authorization'] = `Bearer ${token}`;
            }

            const response = await fetch('/api/ai/generate-text', {
                method: 'POST',
                headers,
                credentials: 'include',
                body: JSON.stringify({
                    prompt,
                    modelPreference: 'gemini-flash',
                    brandContext: brandAssets,
                }),
            });

            if (!response.ok) throw new Error('Failed to generate suggestion');

            const data = await response.json();
            const suggestion = data.text.trim();

            if (suggestion && suggestion.length > 0) {
                setFusionPrompt(suggestion);
                setToast({ message: "AI placement suggestion added!", type: 'success' });
            } else {
                throw new Error('Empty suggestion received');
            }

        } catch (err: any) {
            setError(`Failed to generate suggestion: ${err.message || 'Please try again'}`);
            console.error("Placement suggestion error:", err);
        } finally {
            setIsLoading(false);
            setLoadingMessage('');
        }
    };
    
    const handleGenerateFusionSuggestion = async () => {
        if (!sceneImage || !productImage) {
            setError("Please upload both background and product images first.");
            return;
        }

        setIsGeneratingSuggestion(true);
        setError(null);

        try {
            const headers: HeadersInit = { 'Content-Type': 'application/json' };
            const token = localStorage.getItem('token');
            if (token) {
                headers['Authorization'] = `Bearer ${token}`;
            }

            const response = await fetch('/api/fusion/suggest-prompt', {
                method: 'POST',
                headers,
                credentials: 'include',
                body: JSON.stringify({
                    backgroundImageDataUrl: sceneImage.dataUrl,
                    productImageDataUrl: productImage.dataUrl,
                }),
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ error: response.statusText }));
                throw new Error(errorData.error || 'Failed to generate fusion suggestion');
            }

            const data = await response.json();
            setFusionPrompt(data.suggestion);
            setToast({ message: "Fusion suggestion generated!", type: 'success' });
        } catch (err: any) {
            setError(`Failed to generate suggestion: ${err.message || 'An unknown error occurred.'}`);
            console.error("Fusion Suggestion Error:", err);
        } finally {
            setIsGeneratingSuggestion(false);
        }
    };
    
    const handleGenerateFusionImage = async () => {
        if (!sceneImage || !productImage || !fusionPrompt.trim()) {
            setError("Please provide a background scene, product image, and a fusion description.");
            return;
        }

        if (!project?.id) {
            setError("Please create or select a project first.");
            return;
        }

        setIsLoading(true);
        setError(null);

        try {
            // Auto-save project if not already persisted
            setLoadingMessage('Preparing project...');
            const projectId = await ensureProjectPersisted();
            
            const headers: HeadersInit = {
                'Content-Type': 'application/json',
            };

            const token = localStorage.getItem('token');
            if (token) {
                headers['Authorization'] = `Bearer ${token}`;
            }

            // AI Blend fusion using Gemini
            setLoadingMessage('Fusing images with AI...');
            
            // Prepare reference images array (both scene and product images)
            const referenceImages = [sceneImage.dataUrl, productImage.dataUrl];
            
            const response = await fetch('/api/generate/fusion-gemini', {
                method: 'POST',
                headers,
                credentials: 'include',
                body: JSON.stringify({
                    projectId: projectId,
                    referenceImages: referenceImages,
                    fusionPrompt: fusionPrompt,
                    width: 1024,
                    height: 1024,
                }),
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ error: response.statusText }));
                throw new Error(errorData.error || 'Failed to generate fusion visual');
            }

            const visual = await response.json();
            const fusedImageSrc = visual.imageUrl;

            const newImageId = `img-fusion-${Date.now()}`;
            const newCampaign: Campaign = {
                id: `campaign-fusion-${Date.now()}`,
                headline,
                subheadline,
                description,
                hashtags,
                images: [{
                    id: newImageId,
                    src: fusedImageSrc,
                    design: {},
                }]
            };

            setCampaigns([newCampaign, ...campaigns]);
            setLatestGeneratedImageId(newImageId); // Trigger auto-scroll
            
            setToast({ message: "Images successfully fused with AI!", type: 'success' });

        } catch (err: any) {
            setError(`Failed to generate fusion image: ${err.message || 'An unknown error occurred.'}`);
            console.error("Fusion Error:", err);
        } finally {
            setIsLoading(false);
            setLoadingMessage('');
        }
    };

    // --- Enhance Tab Handlers ---
    
    const handleEnhanceImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (file.size > 10 * 1024 * 1024) {
            setError("File size exceeds 10MB. Please upload a smaller image.");
            return;
        }

        if (!['image/jpeg', 'image/png'].includes(file.type)) {
            setError("Invalid file type. Please upload a JPG or PNG image.");
            return;
        }

        setError(null);
        setIsLoading(true);
        setLoadingMessage('Uploading image...');

        try {
            const assetFile = await compressAndReadFile(file);
            setUploadedEnhanceImage(assetFile);
            setToast({ message: "Image uploaded successfully!", type: 'success' });
        } catch (err) {
            setError("Failed to upload image. Please try again.");
        } finally {
            setIsLoading(false);
            setLoadingMessage('');
            if (uploadInputRef.current) {
                uploadInputRef.current.value = "";
            }
        }
    };

    const handleGenerateCaptionScript = async () => {
        if (!uploadedEnhanceImage) {
            setError("Please upload an image first.");
            return;
        }

        setIsGeneratingScript(true);
        setError(null);

        try {
            const headers: Record<string, string> = {
                'Content-Type': 'application/json',
            };
            
            const token = localStorage.getItem('token');
            if (token) {
                headers['Authorization'] = `Bearer ${token}`;
            }

            const response = await fetch('/api/vertex/generate-caption-script', {
                method: 'POST',
                headers,
                body: JSON.stringify({
                    imageDataUrl: uploadedEnhanceImage.dataUrl,
                    brandContext: brandAssets,
                }),
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error || 'Failed to generate caption script');
            }

            const data = await response.json();
            const script = data.script.trim();

            if (script && script.length > 0) {
                setEnhanceScript(script);
                setToast({ message: "Caption script generated!", type: 'success' });
            } else {
                throw new Error('Empty script received');
            }

        } catch (err: any) {
            setError(`Failed to generate script: ${err.message || 'Please try again'}`);
            console.error("Script generation error:", err);
        } finally {
            setIsGeneratingScript(false);
        }
    };

    const handleGenerateFromScript = async () => {
        const scriptToUse = enhanceScript.trim() || '__BLANK__';
        
        if (scriptToUse !== '__BLANK__' && scriptToUse.length < 5) {
            setError("Script is too short. Please add more details or leave blank to use brand kit only.");
            return;
        }

        setIsLoading(true);
        setLoadingMessage('Generating visual from script...');
        setError(null);

        try {
            const imageUrls = await generateImages(
                project.id,
                scriptToUse,
                selectedStyle,
                brandAssets,
                1,
                project.size,
                enhanceNegativePrompt.trim() || undefined,
                userApiKey
            );

            const timestamp = Date.now();
            const newImageIds = imageUrls.map((_, idx) => `img-enhance-${timestamp}-${idx}`);
            const newCampaign: Campaign = {
                id: `campaign-enhance-${timestamp}`,
                headline,
                subheadline,
                description,
                hashtags,
                images: imageUrls.map((url, idx) => ({
                    id: newImageIds[idx],
                    src: url,
                    design: {},
                }))
            };

            setCampaigns([newCampaign, ...campaigns]);
            setLatestGeneratedImageId(newImageIds[0]); // Trigger auto-scroll to first image
            setToast({ message: "Visual generated successfully!", type: 'success' });

        } catch (err: any) {
            setError(`Failed to generate visual: ${err.message || 'An unknown error occurred.'}`);
            console.error("Enhance generation error:", err);
        } finally {
            setIsLoading(false);
            setLoadingMessage('');
        }
    };

    const handleGenerateInpaintImage = async () => {
        if (!uploadedEnhanceImage || !maskDataUrl) {
            setError("Please upload an image and mark areas to remove/correct.");
            return;
        }

        setIsGeneratingInpaint(true);
        setError(null);

        try {
            // Auto-save project if not already persisted
            setLoadingMessage('Preparing project...');
            const projectId = await ensureProjectPersisted();
            
            setLoadingMessage('Generating inpainted image...');
            const headers: HeadersInit = { 'Content-Type': 'application/json' };
            const token = localStorage.getItem('token');
            if (token) {
                headers['Authorization'] = `Bearer ${token}`;
            }

            const response = await fetch('/api/generate/inpaint', {
                method: 'POST',
                headers,
                credentials: 'include',
                body: JSON.stringify({
                    projectId: projectId,
                    imageDataUrl: uploadedEnhanceImage.dataUrl,
                    maskDataUrl,
                    prompt: enhanceScript.trim() || undefined,
                    negativePrompt: enhanceNegativePrompt.trim() || undefined,
                }),
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ error: response.statusText }));
                throw new Error(errorData.error || 'Failed to generate inpainted image');
            }

            const visual = await response.json();
            const inpaintedImageSrc = visual.imageUrl;
            
            const newImageId = `img-inpaint-${Date.now()}`;
            const newCampaign: Campaign = {
                id: `campaign-inpaint-${Date.now()}`,
                headline,
                subheadline,
                description,
                hashtags,
                images: [{
                    id: newImageId,
                    src: inpaintedImageSrc,
                    design: {},
                    originalImageUrl: uploadedEnhanceImage.dataUrl, // Store original for comparison
                }]
            };

            setCampaigns([newCampaign, ...campaigns]);
            setLatestGeneratedImageId(newImageId); // Trigger auto-scroll
            setToast({ message: "Inpainted image generated successfully!", type: 'success' });
            setMaskDataUrl(null); // Clear mask

        } catch (err: any) {
            setError(`Failed to generate inpainted image: ${err.message || 'An unknown error occurred.'}`);
            console.error("Inpaint Error:", err);
        } finally {
            setIsGeneratingInpaint(false);
            setLoadingMessage('');
        }
    };

    const handleGenerateOutpaintImage = async () => {
        if (!uploadedEnhanceImage) {
            setError("Please upload an image first.");
            return;
        }

        const selectedDirections = Object.values(outpaintDirections).some(Boolean);
        if (!selectedDirections) {
            setError("Please select at least one expansion direction.");
            return;
        }

        setIsGeneratingOutpaint(true);
        setError(null);

        try {
            // Auto-save project if not already persisted
            setLoadingMessage('Preparing project...');
            const projectId = await ensureProjectPersisted();
            
            setLoadingMessage('Generating outpainted image...');
            const headers: HeadersInit = { 'Content-Type': 'application/json' };
            const token = localStorage.getItem('token');
            if (token) {
                headers['Authorization'] = `Bearer ${token}`;
            }

            // Use user's prompt if they edited it, otherwise use direction-based default
            const effectivePrompt = enhanceScript.trim() || buildOutpaintPrompt(outpaintDirections);

            const response = await fetch('/api/generate/outpaint', {
                method: 'POST',
                headers,
                credentials: 'include',
                body: JSON.stringify({
                    projectId: projectId,
                    imageDataUrl: uploadedEnhanceImage.dataUrl,
                    directions: outpaintDirections,
                    prompt: effectivePrompt || undefined,
                    negativePrompt: enhanceNegativePrompt.trim() || undefined,
                }),
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ error: response.statusText }));
                throw new Error(errorData.error || 'Failed to generate outpainted image');
            }

            const visual = await response.json();
            const outpaintedImageSrc = visual.imageUrl;
            
            const newImageId = `img-outpaint-${Date.now()}`;
            const newCampaign: Campaign = {
                id: `campaign-outpaint-${Date.now()}`,
                headline,
                subheadline,
                description,
                hashtags,
                images: [{
                    id: newImageId,
                    src: outpaintedImageSrc,
                    design: {},
                    originalImageUrl: uploadedEnhanceImage.dataUrl, // Store original for comparison
                }]
            };

            setCampaigns([newCampaign, ...campaigns]);
            setLatestGeneratedImageId(newImageId); // Trigger auto-scroll
            setToast({ message: "Outpainted image generated successfully!", type: 'success' });

        } catch (err: any) {
            setError(`Failed to generate outpainted image: ${err.message || 'An unknown error occurred.'}`);
            console.error("Outpaint Error:", err);
        } finally {
            setIsGeneratingOutpaint(false);
            setLoadingMessage('');
        }
    };


    const handleUpscaleImage = async () => {
        if (!uploadedEnhanceImage) {
            setError("Please upload an image first.");
            return;
        }

        setIsUpscaling(true);
        setLoadingMessage('Upscaling image...');
        setError(null);

        try {
            const headers: HeadersInit = { 'Content-Type': 'application/json' };
            const token = localStorage.getItem('token');
            if (token) {
                headers['Authorization'] = `Bearer ${token}`;
            }

            const response = await fetch('/api/runware/upscale', {
                method: 'POST',
                headers,
                credentials: 'include',
                body: JSON.stringify({
                    imageDataUrl: uploadedEnhanceImage.dataUrl,
                }),
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ error: response.statusText }));
                throw new Error(errorData.error || 'Failed to upscale image');
            }

            const data = await response.json();
            const upscaledImageDataUrl = data.imageDataUrl;

            setUploadedEnhanceImage({
                ...uploadedEnhanceImage,
                dataUrl: upscaledImageDataUrl,
            });
            
            setToast({ message: "Image upscaled successfully! You can now continue editing.", type: 'success' });
            setMaskDataUrl(null);

        } catch (err: any) {
            setError(`Failed to upscale image: ${err.message || 'An unknown error occurred.'}`);
            console.error("Upscale Error:", err);
        } finally {
            setIsUpscaling(false);
            setLoadingMessage('');
        }
    };

    const handleCopyDescription = (campaign: Campaign) => {
        const parts: string[] = [];
        
        if (campaign.headline && campaign.headline.trim()) {
            parts.push(`**[Headline]**\n${campaign.headline.trim()}`);
        }
        
        if (campaign.subheadline && campaign.subheadline.trim()) {
            parts.push(`**[Subheadline]**\n${campaign.subheadline.trim()}`);
        }

        if (campaign.description && campaign.description.trim()) {
            parts.push(`**[Description]**\n${campaign.description.trim()}`);
        }

        if (campaign.hashtags && campaign.hashtags.length > 0) {
            const validHashtags = campaign.hashtags.filter(h => h && h.trim().startsWith('#')).join(' ');
            if (validHashtags) {
                 parts.push(`\n**[Hashtags]**\n${validHashtags}`);
            }
        }
        
        const fullText = parts.join('\n\n');
        navigator.clipboard.writeText(fullText).then(() => {
            setToast({ message: "Copied all text to clipboard!", type: 'success' });
            setCopiedCampaignId(campaign.id);
            setTimeout(() => setCopiedCampaignId(null), 2000);
        }).catch(err => {
            console.error('Failed to copy text: ', err);
            setToast({ message: "Failed to copy text.", type: 'error' });
        });
    };

    const handleBack = () => {
        if (projectName.trim() && projectName !== project.name) {
            onUpdateProject({ ...project, name: projectName, lastModified: new Date().toISOString().split('T')[0] });
        }
        onBack();
    };

    const activeCampaign = campaigns.find(c => c.id === activeImage?.campaignId);
    const activeImageObject = activeCampaign?.images.find(i => i.id === activeImage?.imageId);
    const activeDesign = getEffectiveDesign(activeImageObject);
    
    return (
        <>
        <div className="flex h-screen bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100">
            {enlargedPreview && (
                <EnlargedPreviewModal 
                    previewData={enlargedPreview}
                    brandAssets={brandAssets}
                    onClose={() => setEnlargedPreview(null)}
                    showAlignmentGrid={showAlignmentGrid}
                    projectSize={project.size}
                    getEffectiveDesign={getEffectiveDesign}
                    currentUserPlan={currentUserPlan}
                />
            )}
            {editingImage && (
                <LayoutEditorModal
                    campaign={editingImage.campaign}
                    image={editingImage.image}
                    design={getEffectiveDesign(editingImage.image)}
                    onClose={() => setEditingImage(null)}
                    onChange={(newDesign) => handleUpdateImageDesign(editingImage.campaign.id, editingImage.image.id, newDesign)}
                    onMetadataUpdate={(campaignId, imageId, editMetadata) => {
                        console.log('[EditorPage] onMetadataUpdate called:', {
                            campaignId,
                            imageId,
                            editMetadata
                        });
                        // Update the campaigns state with the new editMetadata
                        setCampaigns(prevCampaigns => {
                            const updated = prevCampaigns.map(c => {
                                if (c.id === campaignId) {
                                    return {
                                        ...c,
                                        images: c.images.map(img => {
                                            if (img.id === imageId) {
                                                console.log('[EditorPage] Updating image editMetadata:', {
                                                    oldMetadata: img.editMetadata,
                                                    newMetadata: editMetadata
                                                });
                                                return { ...img, editMetadata };
                                            }
                                            return img;
                                        })
                                    };
                                }
                                return c;
                            });
                            console.log('[EditorPage] Campaigns state updated');
                            return updated;
                        });
                    }}
                    projectSize={project.size}
                    brandAssets={brandAssets}
                    currentUserPlan={currentUserPlan}
                />
            )}
             {aspectRatioMismatch && (
                <AspectRatioMismatchModal
                    onStretch={() => processUploadedImage(aspectRatioMismatch.dataUrl)}
                    onKeepRatio={() => processUploadedImage(aspectRatioMismatch.dataUrl, true)}
                    onCancel={() => setAspectRatioMismatch(null)}
                />
            )}
            
            {/* Public Sharing Confirmation Modal */}
            <AlertDialog open={showPublicConfirmation} onOpenChange={setShowPublicConfirmation}>
                <AlertDialogContent data-testid="dialog-public-confirmation">
                    <AlertDialogHeader>
                        <AlertDialogTitle>Share to Public?</AlertDialogTitle>
                        <AlertDialogDescription>
                            <p>You can choose not to share at any time.</p>
                            <p>Unshared designs are only kept for 60 days — remember to download them!</p>
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel data-testid="button-cancel-public">Cancel</AlertDialogCancel>
                        <AlertDialogAction 
                            onClick={confirmTogglePublic}
                            data-testid="button-confirm-public"
                        >
                            Got it
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
            
            {/* Replace Public Image Confirmation Modal */}
            <AlertDialog open={showReplacePublicImageConfirmation} onOpenChange={setShowReplacePublicImageConfirmation}>
                <AlertDialogContent data-testid="dialog-replace-public-image">
                    <AlertDialogHeader>
                        <AlertDialogTitle>Replace Public Image?</AlertDialogTitle>
                        <AlertDialogDescription>
                            <p>You've already shared one image. Sharing this one will replace the previous public image. Continue?</p>
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel 
                            onClick={() => setPendingPublicImageId(null)}
                            data-testid="button-cancel-replace"
                        >
                            Cancel
                        </AlertDialogCancel>
                        <AlertDialogAction 
                            onClick={confirmReplacePublicVisual}
                            data-testid="button-confirm-replace"
                        >
                            Continue
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
            
            {/* Unsaved Image Tooltip */}
            {showUnsavedImageTooltip && (
                <div 
                    className="fixed z-50 bg-black text-white text-sm px-3 py-2 rounded-md shadow-lg"
                    style={{ top: `${unsavedImageTooltipPosition.top}px`, left: `${unsavedImageTooltipPosition.left}px` }}
                    data-testid="tooltip-unsaved-image"
                >
                    Please save this design to My Project before sharing it publicly.
                </div>
            )}
            
            {activeSuggestions && (
                <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 animate-fade-in" onClick={() => { setActiveSuggestions(null); setAiAction(null); }}>
                    <div 
                        ref={suggestionBoxRef}
                        className="bg-white dark:bg-zinc-800 rounded-lg shadow-2xl p-6 w-full max-w-2xl m-4 max-h-[80vh] overflow-y-auto" 
                        onClick={e => e.stopPropagation()}
                        data-testid="modal-suggestions"
                    >
                        <div className="flex items-start justify-between mb-4">
                            <div>
                                <h2 className="text-xl font-bold text-zinc-900 dark:text-white flex items-center gap-2">
                                    <MagicWandIcon className="w-6 h-6" />
                                    Improve Your Text
                                </h2>
                                <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-1">
                                    AI has generated optimized versions based on your input. Select one to use it.
                                </p>
                            </div>
                            <button 
                                onClick={() => { setActiveSuggestions(null); setAiAction(null); }} 
                                className="p-1.5 rounded-md hover:bg-slate-100 dark:hover:bg-zinc-700 transition-colors"
                                data-testid="button-close-suggestions"
                            >
                                <IconX />
                            </button>
                        </div>
                        
                        <div className="mb-4 p-3 bg-slate-50 dark:bg-zinc-900/50 rounded-md border border-slate-200 dark:border-zinc-700">
                            <p className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 mb-1">Your Original Text:</p>
                            <p className="text-sm text-zinc-700 dark:text-zinc-300">{activeSuggestions.originalText}</p>
                        </div>

                        <div className="mb-4">
                            <div className="flex items-center justify-between mb-3">
                                <p className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">AI-Improved Versions:</p>
                                <div className="flex items-center gap-3">
                                    {(activeSuggestions.field === 'headline' || activeSuggestions.field === 'subheadline') && (
                                        <button
                                            onClick={async () => {
                                                const field = activeSuggestions.field as 'headline' | 'subheadline';
                                                const text = activeSuggestions.originalText;
                                                setAiAction({ field, action: 'simplify' });
                                                try {
                                                    const suggestions = await simplifyText(field, text, brandAssets, userApiKey, project.language);
                                                    setActiveSuggestions({ field, suggestions, originalText: text });
                                                } catch (err) {
                                                    setToast({ message: `Failed to simplify text.`, type: 'error' });
                                                    console.error(err);
                                                } finally {
                                                    setAiAction(null);
                                                }
                                            }}
                                            disabled={!!aiAction && aiAction.field === activeSuggestions.field && aiAction.action === 'simplify'}
                                            className="flex items-center gap-2 px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white text-sm font-semibold rounded-md transition-colors disabled:bg-slate-400"
                                            title="Generate shorter and clearer options (6-8 words)"
                                            data-testid="button-simplify-text"
                                        >
                                            {aiAction?.field === activeSuggestions.field && aiAction?.action === 'simplify' ? (
                                                <div className="animate-spin h-4 w-4 border-b-2 border-white rounded-full"/>
                                            ) : (
                                                <>
                                                    <IconScissors />
                                                    <span>Simplify</span>
                                                </>
                                            )}
                                        </button>
                                    )}
                                    <button
                                        onClick={async () => {
                                            const field = activeSuggestions.field;
                                            const text = activeSuggestions.originalText;
                                            setAiAction({ field, action: 'moreOptions' });
                                            try {
                                                let suggestions: string[] = [];
                                                if (field === 'imageSceneGuide') {
                                                    suggestions = await regenerateImagePrompt(productInfo || text, excludedKeywords, userApiKey);
                                                } else if (field === 'hashtags') {
                                                    const improved = await regenerateSingleField(productInfo || text, field, excludedKeywords, text, brandAssets, userApiKey);
                                                    if (Array.isArray(improved)) {
                                                        suggestions = [improved.join(' ')];
                                                    } else {
                                                        suggestions = [improved];
                                                    }
                                                } else {
                                                    suggestions = await suggestAlternatives(field, productInfo || text, excludedKeywords, text, brandAssets, userApiKey, project.language);
                                                }
                                                setActiveSuggestions({ field, suggestions, originalText: text });
                                            } catch (err) {
                                                setToast({ message: `Failed to generate more options.`, type: 'error' });
                                                console.error(err);
                                            } finally {
                                                setAiAction(null);
                                            }
                                        }}
                                        disabled={!!aiAction && aiAction.field === activeSuggestions.field && aiAction.action === 'moreOptions'}
                                        className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-md transition-colors disabled:bg-slate-400"
                                        title="Generate more options"
                                        data-testid="button-more-options"
                                    >
                                        {aiAction?.field === activeSuggestions.field && aiAction?.action === 'moreOptions' ? (
                                            <div className="animate-spin h-4 w-4 border-b-2 border-white rounded-full"/>
                                        ) : (
                                            <span>More Options</span>
                                        )}
                                    </button>
                                </div>
                            </div>
                            <div className="space-y-3">
                                {activeSuggestions.suggestions.map((suggestion, index) => (
                                    <div 
                                        key={index}
                                        className="p-4 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-lg border-2 border-transparent hover:border-blue-400 dark:hover:border-blue-500 cursor-pointer transition-all group"
                                        onClick={() => handleApplySuggestion(suggestion)}
                                        data-testid={`suggestion-option-${index}`}
                                    >
                                        <div className="flex items-start justify-between gap-3">
                                            <div className="flex-1">
                                                <p className="text-xs font-semibold text-blue-600 dark:text-blue-400 mb-1">Option {index + 1}</p>
                                                <p className="text-sm text-zinc-800 dark:text-zinc-100">{suggestion}</p>
                                            </div>
                                            <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-600 dark:text-blue-400" viewBox="0 0 20 20" fill="currentColor">
                                                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                                </svg>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                        
                        <div className="mt-6 flex justify-end gap-3">
                            <button 
                                onClick={() => setActiveSuggestions(null)} 
                                className="px-4 py-2 bg-slate-200 dark:bg-zinc-700 text-zinc-800 dark:text-white rounded-md hover:bg-slate-300 dark:hover:bg-zinc-600 transition-colors font-semibold"
                                data-testid="button-cancel-suggestions"
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <aside className="w-[550px] bg-slate-50 dark:bg-zinc-800/50 p-6 flex flex-col h-full border-r border-slate-200 dark:border-zinc-700/80 overflow-x-hidden">
                <div className="flex items-center justify-between mb-6">
                    <button onClick={handleBack} className="flex items-center gap-2 text-sm font-semibold text-zinc-600 dark:text-zinc-300 hover:text-blue-600 dark:hover:text-blue-400">
                        <IconChevronLeft /> Back to Dashboard
                    </button>
                    <div className="flex items-center gap-2">
                        <button onClick={undo} disabled={!canUndo} className="p-1.5 rounded-md hover:bg-slate-200 dark:hover:bg-zinc-700 disabled:opacity-40"><IconUndo /></button>
                        <button onClick={redo} disabled={!canRedo} className="p-1.5 rounded-md hover:bg-slate-200 dark:hover:bg-zinc-700 disabled:opacity-40"><IconRedo /></button>
                    </div>
                </div>

                <div className="mb-6">
                    <div className="flex items-center gap-2 mb-3">
                        {/* Step 1 */}
                        <button
                            onClick={() => setEditorStep('content')}
                            className={`flex-1 relative overflow-hidden rounded-lg p-3 transition-all ${
                                editorStep === 'content'
                                    ? 'bg-blue-600 dark:bg-blue-500 text-white shadow-lg ring-2 ring-blue-400 dark:ring-blue-300'
                                    : 'bg-slate-200 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-400 hover:bg-slate-300 dark:hover:bg-zinc-600'
                            }`}
                            data-testid="step-content"
                        >
                            <div className="flex items-center gap-2">
                                <div className={`flex items-center justify-center w-6 h-6 rounded-full font-bold text-sm ${
                                    editorStep === 'content'
                                        ? 'bg-white/20 text-white'
                                        : 'bg-slate-300 dark:bg-zinc-600 text-zinc-700 dark:text-zinc-300'
                                }`}>
                                    1
                                </div>
                                <span className="font-semibold text-xs">Craft Content</span>
                            </div>
                        </button>

                        {/* Arrow */}
                        <svg className="w-4 h-4 text-zinc-400 dark:text-zinc-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>

                        {/* Step 2 */}
                        <button
                            onClick={() => { setEditorStep('visuals'); setVisualsTab('ai'); }}
                            className={`flex-1 relative overflow-hidden rounded-lg p-3 transition-all ${
                                editorStep === 'visuals'
                                    ? 'bg-blue-600 dark:bg-blue-500 text-white shadow-lg ring-2 ring-blue-400 dark:ring-blue-300'
                                    : 'bg-slate-200 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-400 hover:bg-slate-300 dark:hover:bg-zinc-600'
                            }`}
                            data-testid="step-visuals"
                        >
                            <div className="flex items-center gap-2">
                                <div className={`flex items-center justify-center w-6 h-6 rounded-full font-bold text-sm ${
                                    editorStep === 'visuals'
                                        ? 'bg-white/20 text-white'
                                        : 'bg-slate-300 dark:bg-zinc-600 text-zinc-700 dark:text-zinc-300'
                                }`}>
                                    2
                                </div>
                                <span className="font-semibold text-xs">Customize Visuals</span>
                            </div>
                        </button>
                    </div>
                </div>
                
                <div className="flex-1 overflow-y-auto overflow-x-hidden space-y-4 custom-scrollbar">
                    {editorStep === 'content' && (
                        <>
                            {/* Language Selector - Compact */}
                            <div className="bg-white dark:bg-zinc-800/50 border border-slate-200 dark:border-zinc-700 rounded-lg p-3 shadow-sm">
                                <div className="flex items-center gap-2">
                                    <svg className="w-4 h-4 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129" />
                                    </svg>
                                    <label className="block text-sm font-semibold text-zinc-700 dark:text-slate-100">Preferred Language</label>
                                    <Tooltip>
                                        <TooltipTrigger asChild>
                                            <HelpCircle className="w-4 h-4 text-zinc-500 dark:text-zinc-400 cursor-help ml-auto" />
                                        </TooltipTrigger>
                                        <TooltipContent side="right" className="max-w-[250px]">
                                            <p>All AI-generated content (headlines, descriptions, hashtags) and visual styling will adapt to your chosen language.</p>
                                        </TooltipContent>
                                    </Tooltip>
                                </div>
                                <select 
                                    value={project?.language || 'en'}
                                    onChange={async (e) => {
                                        const newLanguage = e.target.value;
                                        const updatedProject = { ...project, language: newLanguage };
                                        
                                        try {
                                            await fetch(`/api/projects/${project.id}/save`, {
                                                method: 'POST',
                                                headers: { 'Content-Type': 'application/json' },
                                                body: JSON.stringify(updatedProject)
                                            });
                                            onUpdateProject(updatedProject);
                                            setToast({ 
                                                message: `Language changed to ${newLanguage === 'ms' ? 'Bahasa Melayu' : newLanguage === 'zh' ? '中文' : 'English'}. AI content will now be generated in this language.`, 
                                                type: 'success' 
                                            });
                                        } catch (err) {
                                            console.error('Failed to update language:', err);
                                            setToast({ message: 'Failed to update language. Please try again.', type: 'error' });
                                        }
                                    }}
                                    className="w-full mt-2 bg-slate-100 dark:bg-zinc-700 border border-slate-300 dark:border-zinc-600 rounded-md px-3 py-2 text-sm text-zinc-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none cursor-pointer"
                                    data-testid="select-language"
                                >
                                    <option value="ms">🇲🇾 Bahasa Melayu</option>
                                    <option value="en">🇬🇧 English</option>
                                    <option value="zh">🇨🇳 中文 (Simplified Chinese)</option>
                                </select>
                            </div>

                            {/* Product/Service Section - Simplified */}
                            <div className="bg-white dark:bg-zinc-800/50 border border-slate-200 dark:border-zinc-700 rounded-lg p-3 shadow-sm">
                                <div className="flex items-center gap-2 mb-2">
                                    <label className="block text-sm font-semibold text-zinc-700 dark:text-slate-100">Product or Service</label>
                                    <Tooltip>
                                        <TooltipTrigger asChild>
                                            <HelpCircle className="w-4 h-4 text-zinc-500 dark:text-zinc-400 cursor-help" />
                                        </TooltipTrigger>
                                        <TooltipContent side="top" className="max-w-[250px]">
                                            <p>Your description will guide AI for content generation. Click "Need help?" below for examples.</p>
                                        </TooltipContent>
                                    </Tooltip>
                                </div>
                                <textarea 
                                    value={productInfo} 
                                    onChange={e => setProductInfo(e.target.value)} 
                                    rows={3} 
                                    className="w-full bg-slate-100 dark:bg-zinc-700 border border-slate-300 dark:border-zinc-600 rounded-md p-2 text-sm text-zinc-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none" 
                                    placeholder="e.g., A new line of eco-friendly sunglasses..."
                                    data-testid="input-product-service"
                                />
                                
                                {/* Product/Service Suggestion Helper - Collapsed */}
                                <button 
                                    onClick={() => setShowProductSuggestions(!showProductSuggestions)}
                                    className="mt-2 text-xs text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
                                    data-testid="button-product-suggestions"
                                >
                                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                    Need help?
                                </button>
                                    
                                {/* Inline Suggestion Popup */}
                                {showProductSuggestions && (
                                    <div ref={productSuggestionsRef} className="mt-2 bg-white dark:bg-zinc-800 border border-slate-300 dark:border-zinc-600 rounded-lg p-4 shadow-lg max-h-64 overflow-y-auto">
                                        <div className="flex items-center justify-between mb-3">
                                            <h4 className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">Industry Examples</h4>
                                            <button 
                                                onClick={() => setShowProductSuggestions(false)}
                                                className="text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
                                            >
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                                </svg>
                                            </button>
                                        </div>
                                        <div className="space-y-3">
                                            {INDUSTRY_EXAMPLES.map((industry, idx) => (
                                                <div key={idx} className="border-b border-slate-200 dark:border-zinc-700 last:border-0 pb-2 last:pb-0">
                                                    <p className="text-xs font-semibold text-zinc-600 dark:text-zinc-400 mb-1">{industry.category}</p>
                                                    <div className="flex flex-wrap gap-1.5">
                                                        {industry.examples.map((example, exIdx) => (
                                                            <button
                                                                key={exIdx}
                                                                onClick={() => {
                                                                    setProductInfo(example);
                                                                    setShowProductSuggestions(false);
                                                                }}
                                                                className="text-xs px-2 py-1 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 rounded hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-colors"
                                                                data-testid={`product-example-${idx}-${exIdx}`}
                                                            >
                                                                {example}
                                                            </button>
                                                        ))}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Show More Options Toggle */}
                            <div className="flex justify-center">
                                <button 
                                    onClick={() => setShowAdvancedOptions(!showAdvancedOptions)}
                                    className="text-xs text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1.5"
                                    data-testid="button-toggle-advanced"
                                >
                                    <svg className={`w-3.5 h-3.5 transition-transform ${showAdvancedOptions ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                    </svg>
                                    {showAdvancedOptions ? 'Hide' : 'Show'} more options
                                </button>
                            </div>

                            {/* Avoid Keywords Section - Collapsible */}
                            {showAdvancedOptions && (
                                <div className="bg-white dark:bg-zinc-800/50 border border-slate-200 dark:border-zinc-700 rounded-lg p-3 shadow-sm">
                                    <div className="flex items-center gap-2 mb-2">
                                        <label className="block text-sm font-semibold text-zinc-700 dark:text-slate-100">
                                            Avoid these keywords (optional)
                                        </label>
                                        <div className="group relative inline-block">
                                            <svg className="w-4 h-4 text-zinc-500 dark:text-zinc-400 cursor-help" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                            </svg>
                                            <div className="invisible group-hover:visible opacity-0 group-hover:opacity-100 transition-opacity absolute left-1/2 -translate-x-1/2 bottom-full mb-2 w-64 bg-zinc-900 text-white text-xs rounded-lg p-3 shadow-lg z-50">
                                                The AI will avoid generating content with these words. Separate with commas or spaces.
                                                <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 border-4 border-transparent border-t-zinc-900"></div>
                                            </div>
                                        </div>
                                    </div>
                                    <textarea 
                                        value={excludedKeywords} 
                                        onChange={e => setExcludedKeywords(e.target.value)} 
                                        rows={2} 
                                        className="w-full bg-slate-100 dark:bg-zinc-700 border border-slate-300 dark:border-zinc-600 rounded-md p-2 text-sm text-zinc-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none" 
                                        placeholder="e.g., Food Delivery, Cheapest, Promotion"
                                        data-testid="input-avoid-keywords"
                                    />
                                </div>
                            )}

                            {/* Step 1: Generate Headlines */}
                            <div className="flex justify-center">
                                <button
                                    onClick={handleGenerateStep1}
                                    disabled={!productInfo.trim() || isLoading}
                                    className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2.5 px-6 rounded-lg flex items-center gap-2 transition-colors disabled:bg-slate-400 disabled:cursor-not-allowed"
                                    data-testid="button-generate-step1"
                                >
                                    {isLoading && loadingMessage.includes('headline') ? (
                                        <div className="animate-spin h-5 w-5 border-b-2 rounded-full"/>
                                    ) : (
                                        <span>Step 1: Generate Headlines</span>
                                    )}
                                </button>
                            </div>

                            {/* All Content Fields - Always Visible */}
                            <div className="space-y-4 pt-2">
                                    {/* Step 1 Label */}
                                    <div className="flex items-center gap-3 pt-2">
                                        <div className="flex-1 border-t border-slate-200 dark:border-zinc-700"></div>
                                        <div className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wide">
                                            Step 1: Headline & Subheadline
                                        </div>
                                        <div className="flex-1 border-t border-slate-200 dark:border-zinc-700"></div>
                                    </div>
                                    
                                    {/* Headline Card */}
                                    <div className="bg-white dark:bg-zinc-800/50 border border-slate-200 dark:border-zinc-700 rounded-lg p-4 shadow-sm">
                                        <AiEnhancedTextArea 
                                            field="headline" 
                                            label="Headline (on image)" 
                                            value={headline} 
                                            onChange={handleHeadlineChange} 
                                            maxLength={80} 
                                            rows={3} 
                                            helpText="max 10-12 words rec." 
                                            placeholder="e.g., Cool Down with Ice Cream"
                                            onImprove={handleAiImprove} 
                                            aiAction={aiAction} 
                                            disabled={isLoading} 
                                        />
                                    </div>
                                    
                                    {/* Subheadline Card */}
                                    <div className="bg-white dark:bg-zinc-800/50 border border-slate-200 dark:border-zinc-700 rounded-lg p-4 shadow-sm">
                                        <AiEnhancedTextArea 
                                            field="subheadline" 
                                            label="Subheadline (on image)" 
                                            value={subheadline} 
                                            onChange={handleSubheadlineChange} 
                                            maxLength={80} 
                                            rows={3} 
                                            helpText="max 10-12 words rec." 
                                            placeholder="e.g., Fresh & Delicious Treats for Everyone"
                                            onImprove={handleAiImprove} 
                                            aiAction={aiAction} 
                                            disabled={isLoading} 
                                        />
                                    </div>
                                    
                                    {/* Step 2: Generate Description & Hashtags - Only show if headlines exist */}
                                    {(headline.trim() || subheadline.trim()) && (
                                        <div className="flex flex-col items-center gap-2 py-2">
                                            <div className="w-full border-t border-slate-200 dark:border-zinc-700 mb-2"></div>
                                            <div className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wide">
                                                Step 2: Description & Hashtags
                                            </div>
                                            <button
                                                onClick={handleGenerateStep2}
                                                disabled={!headline.trim() || !subheadline.trim() || isLoading}
                                                className="bg-purple-600 hover:bg-purple-700 text-white font-semibold py-2.5 px-6 rounded-lg flex items-center gap-2 transition-colors disabled:bg-slate-400 disabled:cursor-not-allowed"
                                                data-testid="button-generate-step2"
                                            >
                                                {isLoading && loadingMessage.includes('description') ? (
                                                    <div className="animate-spin h-5 w-5 border-b-2 rounded-full"/>
                                                ) : (
                                                    <><span>📝</span><span>Generate Description & Hashtags</span></>
                                                )}
                                            </button>
                                            <div className="text-xs text-slate-500 dark:text-slate-400 text-center max-w-md">
                                                Review and edit your headlines above, then generate description & hashtags based on them
                                            </div>
                                            <div className="w-full border-t border-slate-200 dark:border-zinc-700 mt-2"></div>
                                        </div>
                                    )}
                                    
                                    {/* Description Card */}
                                    <div className="bg-white dark:bg-zinc-800/50 border border-slate-200 dark:border-zinc-700 rounded-lg p-4 shadow-sm">
                                        <AiEnhancedTextArea 
                                            field="description" 
                                            label="Description (for post caption)" 
                                            value={description} 
                                            onChange={handleDescriptionChange} 
                                            maxLength={2200} 
                                            rows={5} 
                                            placeholder="e.g., Beat the heat with our creamy, handcrafted ice cream! Made fresh daily with premium ingredients..."
                                            onImprove={handleAiImprove} 
                                            aiAction={aiAction} 
                                            disabled={isLoading} 
                                        />
                                    </div>
                                    
                                    {/* Hashtags Card */}
                                    <div className="bg-white dark:bg-zinc-800/50 border border-slate-200 dark:border-zinc-700 rounded-lg p-4 shadow-sm">
                                        <div className="flex items-center justify-between mb-2">
                                            <label className="block text-sm font-semibold text-zinc-700 dark:text-slate-100">Hashtags (optional)</label>
                                            <button 
                                                type="button"
                                                onClick={() => handleAiImprove('hashtags')} 
                                                disabled={!!aiAction || isLoading} 
                                                className="p-1.5 rounded-md bg-white dark:bg-zinc-800 shadow hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-all disabled:opacity-50 disabled:cursor-not-allowed" 
                                                title="Improve with AI"
                                                data-testid="button-improve-hashtags"
                                            >
                                                {aiAction?.field === 'hashtags' ? (
                                                    <div className="animate-spin h-4 w-4 border-b-2 border-blue-600 dark:border-blue-400 rounded-full"/>
                                                ) : (
                                                    <Wand2Icon className="h-4 w-4 text-blue-500 dark:text-blue-400" />
                                                )}
                                            </button>
                                        </div>
                                        
                                        {/* Hashtag Pills Display */}
                                        {Array.isArray(hashtags) && hashtags.length > 0 && (
                                            <div className="flex flex-wrap gap-2 mb-2">
                                                {hashtags.map((tag, index) => (
                                                    <div 
                                                        key={index}
                                                        className="inline-flex items-center gap-1.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 px-3 py-1.5 rounded-full text-sm font-medium border border-blue-200 dark:border-blue-800 group hover:bg-blue-200 dark:hover:bg-blue-900/50 transition-colors"
                                                        data-testid={`hashtag-pill-${index}`}
                                                    >
                                                        <span>{tag}</span>
                                                        <button
                                                            onClick={() => {
                                                                const newHashtags = hashtags.filter((_, i) => i !== index);
                                                                setHashtags(newHashtags);
                                                            }}
                                                            className="hover:bg-blue-300 dark:hover:bg-blue-700 rounded-full p-0.5 transition-colors"
                                                            data-testid={`button-remove-hashtag-${index}`}
                                                        >
                                                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                                            </svg>
                                                        </button>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                        
                                        {/* Input Field with Autocomplete */}
                                        <div className="relative">
                                            <input 
                                                ref={hashtagInputRef}
                                                type="text"
                                                value={hashtagInput}
                                                onChange={(e) => {
                                                    const value = e.target.value;
                                                    setHashtagInput(value);
                                                    setShowHashtagSuggestions(value.length > 0);
                                                }}
                                                onKeyDown={(e) => {
                                                    if (e.key === 'Enter' || e.key === ' ' || e.key === ',') {
                                                        e.preventDefault();
                                                        const value = hashtagInput.trim();
                                                        if (value) {
                                                            const newTag = value.startsWith('#') ? value : `#${value}`;
                                                            const currentHashtags = Array.isArray(hashtags) ? hashtags : [];
                                                            if (!currentHashtags.includes(newTag)) {
                                                                setHashtags([...currentHashtags, newTag]);
                                                            }
                                                            setHashtagInput('');
                                                            setShowHashtagSuggestions(false);
                                                        }
                                                    } else if (e.key === 'Escape') {
                                                        setShowHashtagSuggestions(false);
                                                    }
                                                }}
                                                onBlur={() => setTimeout(() => setShowHashtagSuggestions(false), 200)}
                                                data-testid="input-hashtags"
                                                placeholder={(hashtags?.length ?? 0) === 0 ? "Type hashtag and press Enter (e.g., FrozenTreats)" : "Add another hashtag..."}
                                                className="w-full bg-slate-100 dark:bg-zinc-700 border border-slate-300 dark:border-zinc-600 rounded-md p-2 text-zinc-900 dark:text-white placeholder:text-zinc-400 dark:placeholder:text-zinc-500 focus:ring-2 focus:ring-blue-500 outline-none" 
                                            />
                                            
                                            {/* Autocomplete Suggestions Dropdown */}
                                            {showHashtagSuggestions && hashtagInput.length > 0 && (
                                                <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-zinc-800 border border-slate-300 dark:border-zinc-600 rounded-md shadow-lg max-h-48 overflow-y-auto z-10">
                                                    {POPULAR_HASHTAGS
                                                        .filter(tag => {
                                                            const currentHashtags = Array.isArray(hashtags) ? hashtags : [];
                                                            return !currentHashtags.includes(tag) && 
                                                                tag.toLowerCase().includes(hashtagInput.toLowerCase().replace('#', ''));
                                                        })
                                                        .slice(0, 8)
                                                        .map((suggestion, index) => (
                                                            <button
                                                                key={index}
                                                                onClick={() => {
                                                                    const currentHashtags = Array.isArray(hashtags) ? hashtags : [];
                                                                    if (!currentHashtags.includes(suggestion)) {
                                                                        setHashtags([...currentHashtags, suggestion]);
                                                                    }
                                                                    setHashtagInput('');
                                                                    setShowHashtagSuggestions(false);
                                                                    hashtagInputRef.current?.focus();
                                                                }}
                                                                className="w-full text-left px-3 py-2 hover:bg-blue-50 dark:hover:bg-blue-900/20 text-sm text-zinc-700 dark:text-zinc-300 transition-colors"
                                                                data-testid={`hashtag-suggestion-${index}`}
                                                            >
                                                                {suggestion}
                                                            </button>
                                                        ))
                                                    }
                                                    {POPULAR_HASHTAGS.filter(tag => 
                                                        !hashtags.includes(tag) && 
                                                        tag.toLowerCase().includes(hashtagInput.toLowerCase().replace('#', ''))
                                                    ).length === 0 && (
                                                        <div className="px-3 py-2 text-sm text-zinc-500 dark:text-zinc-400">
                                                            No suggestions found
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                        <p className="text-xs text-zinc-500 mt-1">Press Enter, Space, or Comma to add hashtags. Start typing to see suggestions.</p>
                                    </div>
                            </div>
                        </>
                    )}

                    {editorStep === 'visuals' && (
                        <>
                             <div className="flex bg-slate-200 dark:bg-zinc-700 rounded-lg p-1 mb-4">
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <button onClick={() => setVisualsTab('ai')} className={`flex-1 text-center py-1.5 rounded-md font-semibold text-xs transition-colors ${visualsTab === 'ai' ? 'bg-white dark:bg-zinc-800 text-blue-600 dark:text-blue-400 shadow' : 'text-zinc-600 dark:text-zinc-300'}`}>🧠 Content</button>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                        <p>Generate social media posts with AI — including headline, description, hashtags, image, and layout.</p>
                                    </TooltipContent>
                                </Tooltip>
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <button onClick={() => setVisualsTab('upload')} className={`flex-1 text-center py-1.5 rounded-md font-semibold text-xs transition-colors ${visualsTab === 'upload' ? 'bg-white dark:bg-zinc-800 text-blue-600 dark:text-blue-400 shadow' : 'text-zinc-600 dark:text-zinc-300'}`}>🖼️ Enhance</button>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                        <p>Upload an image to enhance it with AI and generate visual designs using a smart script.</p>
                                    </TooltipContent>
                                </Tooltip>
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <button onClick={() => setVisualsTab('fusion')} className={`flex-1 text-center py-1.5 rounded-md font-semibold text-xs transition-colors ${visualsTab === 'fusion' ? 'bg-white dark:bg-zinc-800 text-blue-600 dark:text-blue-400 shadow' : 'text-zinc-600 dark:text-zinc-300'}`}>🛍️ Fusion</button>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                        <p>Combine your product image with a background scene using AI-powered product placement.</p>
                                    </TooltipContent>
                                </Tooltip>
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <button onClick={() => setVisualsTab('promo-video')} className={`flex-1 text-center py-1.5 rounded-md font-semibold text-xs transition-colors ${visualsTab === 'promo-video' ? 'bg-white dark:bg-zinc-800 text-blue-600 dark:text-blue-400 shadow' : 'text-zinc-600 dark:text-zinc-300'}`} data-testid="tab-video-maker">🎬 VideoMaker</button>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                        <p>Create AI-powered videos: Quick single-image clips or multi-scene promotional videos with voiceover and music.</p>
                                    </TooltipContent>
                                </Tooltip>
                            </div>
                            
                            {visualsTab === 'ai' && (
                                <>
                                    <ImageSceneGuideField
                                        value={imageSceneGuide}
                                        onChange={setImageSceneGuide}
                                        onImprove={() => handleAiImprove('imageSceneGuide')}
                                        aiAction={aiAction}
                                        disabled={isLoading}
                                    />
                                    <div>
                                        <label className="block text-sm font-semibold text-zinc-700 dark:text-slate-100 mb-2">2. Select an Image Style</label>
                                        <Collapsible open={isStyleSelectorOpen} onOpenChange={setIsStyleSelectorOpen}>
                                            <CollapsibleTrigger asChild>
                                                <button 
                                                    className="w-full flex items-center justify-between px-4 py-2.5 bg-slate-100 dark:bg-zinc-700 border border-slate-300 dark:border-zinc-600 rounded-md text-zinc-900 dark:text-white hover:bg-slate-200 dark:hover:bg-zinc-600 transition-colors"
                                                    data-testid="button-style-selector"
                                                >
                                                    <span className="text-sm font-medium">{selectedStyle}</span>
                                                    <ChevronDown className={`h-4 w-4 transition-transform ${isStyleSelectorOpen ? 'rotate-180' : ''}`} />
                                                </button>
                                            </CollapsibleTrigger>
                                            <CollapsibleContent className="mt-2">
                                                <div className="flex flex-wrap gap-2 p-3 bg-slate-50 dark:bg-zinc-800/50 rounded-md border border-slate-200 dark:border-zinc-700">
                                                    {IMAGE_STYLES.map(style => (
                                                        <button 
                                                            key={style} 
                                                            onClick={() => {
                                                                setSelectedStyle(style);
                                                                setIsStyleSelectorOpen(false);
                                                            }} 
                                                            className={`px-3 py-1.5 rounded-full text-sm font-semibold transition-colors ${selectedStyle === style ? 'bg-blue-600 text-white' : 'bg-slate-200 dark:bg-zinc-600 hover:bg-slate-300 dark:hover:bg-zinc-500'}`}
                                                            data-testid={`style-option-${style.toLowerCase()}`}
                                                        >
                                                            {style}
                                                        </button>
                                                    ))}
                                                </div>
                                            </CollapsibleContent>
                                        </Collapsible>
                                    </div>
                                    <div className="space-y-3">
                                        <h3 className="text-sm font-semibold text-zinc-700 dark:text-slate-100 pt-3 border-t border-slate-200 dark:border-zinc-700 mt-3">3. Customize Design</h3>
                                        {!activeImage || !activeCampaign || !activeImageObject ? (
                                            <div className="text-center text-zinc-500 py-8 px-2 bg-slate-100 dark:bg-zinc-700/50 rounded-lg">
                                                <IconPointer />
                                                <p className="font-semibold text-sm">No Image Selected</p>
                                                <p className="text-xs">Generate or select an image on the canvas to edit its design.</p>
                                            </div>
                                        ) : (
                                            <>
                                                <div className="p-3 rounded-lg bg-slate-100 dark:bg-zinc-700/50 space-y-2">
                                                    <p className="text-sm font-semibold text-zinc-800 dark:text-slate-100">Headline</p>
                                                    <div className="flex items-center justify-between">
                                                        <label className="text-sm">Position</label>
                                                        <div className="flex items-center gap-1">
                                                            <button title="Align Top" onClick={() => handleActiveImageDesignChange('headline', { verticalPosition: 'top' })} className={`p-1.5 rounded-md ${activeDesign.headline.verticalPosition === 'top' ? 'bg-blue-600 text-white' : 'bg-slate-200 dark:bg-zinc-600'}`}><IconVerticalAlignTop /></button>
                                                            <button title="Align Center" onClick={() => handleActiveImageDesignChange('headline', { verticalPosition: 'center' })} className={`p-1.5 rounded-md ${activeDesign.headline.verticalPosition === 'center' ? 'bg-blue-600 text-white' : 'bg-slate-200 dark:bg-zinc-600'}`}><IconVerticalAlignCenter /></button>
                                                            <button title="Align Bottom" onClick={() => handleActiveImageDesignChange('headline', { verticalPosition: 'bottom' })} className={`p-1.5 rounded-md ${activeDesign.headline.verticalPosition === 'bottom' ? 'bg-blue-600 text-white' : 'bg-slate-200 dark:bg-zinc-600'}`}><IconVerticalAlignBottom /></button>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center justify-between">
                                                        <label className="text-sm">Line Spacing</label>
                                                        <div className="flex items-center gap-2 w-2/3">
                                                            <input type="range" min="0.8" max="2.5" step="0.1" value={activeDesign.headline.lineSpacing} onChange={(e) => handleActiveImageDesignChange('headline', { lineSpacing: Number(e.target.value) })} className="w-full h-1 bg-slate-200 dark:bg-zinc-600 rounded-lg appearance-none cursor-pointer" />
                                                            <span className="text-sm w-10 text-center font-mono bg-white dark:bg-zinc-800 rounded-md p-1">{activeDesign.headline.lineSpacing.toFixed(1)}</span>
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="pl-3 border-l-2 border-blue-300 dark:border-blue-700/60 space-y-2">
                                                   {activeCampaign.headline.split('\n').map((_, index) => {
                                                       const rowSettings = activeDesign.headline.rows[index];
                                                       if (!rowSettings) return null;
                                                       return (
                                                           <TextSettingsEditor
                                                                key={`main-headline-row-${index}`}
                                                                title={`Headline Row ${index + 1}`}
                                                                settings={rowSettings}
                                                                onChange={(changes) => {
                                                                    const newRows = [...activeDesign.headline.rows];
                                                                    newRows[index] = { ...newRows[index], ...changes };
                                                                    handleActiveImageDesignChange('headline', { rows: newRows });
                                                                }}
                                                                isActive={activeTextEditor === `headline-row-${index}`}
                                                                onActivate={() => setActiveTextEditor(`headline-row-${index}`)}
                                                                isExpanded={activeTextEditor === `headline-row-${index}`}
                                                                onToggleExpand={() => setActiveTextEditor(prev => prev === `headline-row-${index}` ? '' : `headline-row-${index}`)}
                                                                hidePositionControl={true}
                                                           />
                                                       )
                                                   })}
                                                </div>
                                                <TextSettingsEditor
                                                    title="Subheadline"
                                                    settings={activeDesign.subheadline}
                                                    onChange={(changes) => handleActiveImageDesignChange('subheadline', changes)}
                                                    isActive={activeTextEditor === 'subheadline'}
                                                    onActivate={() => setActiveTextEditor('subheadline')}
                                                    isExpanded={activeTextEditor === 'subheadline'}
                                                    onToggleExpand={() => setActiveTextEditor(prev => prev === 'subheadline' ? '' : 'subheadline')}
                                                    isSubheadline={true}
                                                />
                                                <LogoSettingsEditor
                                                    settings={activeDesign}
                                                    onChange={(changes) => handleActiveImageDesignChange('logo', changes)}
                                                />
                                                <CTAButtonEditor
                                                    settings={activeDesign.ctaButton}
                                                    onChange={(changes) => handleActiveImageDesignChange('ctaButton', changes)}
                                                />
                                            </>
                                        )}
                                    </div>
                                    <div>
                                        <label className="block text-sm font-semibold text-zinc-700 dark:text-slate-100 mb-2">4. Number of Images</label>
                                        <div className="flex items-center gap-2">
                                            {[1, 2, 4].map(num => <button key={num} onClick={() => setImageQuantity(num)} className={`w-10 h-10 rounded-md text-sm font-bold transition-colors ${imageQuantity === num ? 'bg-blue-600 text-white' : 'bg-slate-200 dark:bg-zinc-600 hover:bg-slate-300'}`}>{num}</button>)}
                                        </div>
                                    </div>
                                </>
                            )}

                             {visualsTab === 'upload' && (
                                <div className="space-y-4">
                                    {/* Enhance Mode Switcher */}
                                    <div className="flex bg-slate-200 dark:bg-zinc-700 rounded-lg p-1 mb-3">
                                        <Tooltip>
                                            <TooltipTrigger asChild>
                                                <button 
                                                    onClick={() => setEnhanceEditMode('caption')} 
                                                    className={`flex-1 text-center py-1.5 px-2 rounded-md font-semibold text-xs transition-colors ${enhanceEditMode === 'caption' ? 'bg-white dark:bg-zinc-800 text-blue-600 dark:text-blue-400 shadow' : 'text-zinc-600 dark:text-zinc-300'}`}
                                                    data-testid="button-mode-caption"
                                                >
                                                    📝 PhotoMaker
                                                </button>
                                            </TooltipTrigger>
                                            <TooltipContent>
                                                <p className="text-sm max-w-xs">Turn your text prompts into creative visuals, inspired by real-life photos.</p>
                                            </TooltipContent>
                                        </Tooltip>
                                        <Tooltip>
                                            <TooltipTrigger asChild>
                                                <button 
                                                    onClick={() => setEnhanceEditMode('inpaint')} 
                                                    className={`flex-1 text-center py-1.5 px-2 rounded-md font-semibold text-xs transition-colors ${enhanceEditMode === 'inpaint' ? 'bg-white dark:bg-zinc-800 text-blue-600 dark:text-blue-400 shadow' : 'text-zinc-600 dark:text-zinc-300'}`}
                                                    data-testid="button-mode-inpaint"
                                                >
                                                    🎨 Inpaint
                                                </button>
                                            </TooltipTrigger>
                                            <TooltipContent>
                                                <p className="text-sm max-w-xs">Remove or correct parts of your image by brushing over them. The AI will regenerate those marked areas based on your prompt or the original style.</p>
                                            </TooltipContent>
                                        </Tooltip>
                                        <Tooltip>
                                            <TooltipTrigger asChild>
                                                <button 
                                                    onClick={() => setEnhanceEditMode('outpaint')} 
                                                    className={`flex-1 text-center py-1.5 px-2 rounded-md font-semibold text-xs transition-colors ${enhanceEditMode === 'outpaint' ? 'bg-white dark:bg-zinc-800 text-blue-600 dark:text-blue-400 shadow' : 'text-zinc-600 dark:text-zinc-300'}`}
                                                    data-testid="button-mode-outpaint"
                                                >
                                                    🖼️ Outpaint
                                                </button>
                                            </TooltipTrigger>
                                            <TooltipContent>
                                                <p className="text-sm max-w-xs">Expand your image by generating new content beyond its original borders. Useful for creating wider or taller visuals while maintaining consistent style.</p>
                                            </TooltipContent>
                                        </Tooltip>
                                        <Tooltip>
                                            <TooltipTrigger asChild>
                                                <button 
                                                    onClick={() => setEnhanceEditMode('image2image')} 
                                                    className={`flex-1 text-center py-1.5 px-2 rounded-md font-semibold text-xs transition-colors ${enhanceEditMode === 'image2image' ? 'bg-white dark:bg-zinc-800 text-blue-600 dark:text-blue-400 shadow' : 'text-zinc-600 dark:text-zinc-300'}`}
                                                    data-testid="button-mode-image2image"
                                                >
                                                    🔄 Image2Image
                                                </button>
                                            </TooltipTrigger>
                                            <TooltipContent>
                                                <p className="text-sm max-w-xs">Transform your images with AI-powered style transfer and artistic filters.</p>
                                            </TooltipContent>
                                        </Tooltip>
                                    </div>

                                    {/* Step 1: Upload Image */}
                                    <div>
                                        <div className="flex items-center gap-2 mb-2">
                                            <label className="block text-sm font-semibold text-zinc-700 dark:text-slate-100">1. Upload Image (JPG or PNG, max 10MB)</label>
                                            <Tooltip>
                                                <TooltipTrigger asChild>
                                                    <HelpCircle className="h-4 w-4 text-muted-foreground cursor-help" data-testid="tooltip-upload-image-info" />
                                                </TooltipTrigger>
                                                <TooltipContent side="right" className="max-w-xs">
                                                    <p>Extract a prompt from your uploaded image to generate creative outputs.</p>
                                                </TooltipContent>
                                            </Tooltip>
                                        </div>
                                        <input 
                                            type="file" 
                                            ref={uploadInputRef} 
                                            onChange={handleEnhanceImageUpload} 
                                            accept="image/png, image/jpeg" 
                                            className="hidden"
                                            data-testid="input-enhance-image-upload" 
                                        />
                                        {uploadedEnhanceImage ? (
                                            <div className="relative w-full h-32 rounded-lg border-2 border-blue-500 bg-slate-100 dark:bg-zinc-700/50">
                                                <img 
                                                    src={uploadedEnhanceImage.dataUrl} 
                                                    alt="Uploaded preview" 
                                                    className="absolute inset-0 w-full h-full object-cover rounded-lg" 
                                                />
                                                <button
                                                    onClick={() => uploadInputRef.current?.click()}
                                                    className="absolute top-2 right-2 bg-blue-600 hover:bg-blue-700 text-white text-xs px-2 py-1 rounded-md transition-colors"
                                                    data-testid="button-change-image"
                                                >
                                                    Change
                                                </button>
                                            </div>
                                        ) : (
                                            <button 
                                                onClick={() => uploadInputRef.current?.click()} 
                                                disabled={isLoading}
                                                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-4 rounded-lg flex items-center justify-center transition-colors disabled:bg-slate-400"
                                                data-testid="button-upload-image"
                                            >
                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                                                </svg>
                                                Upload Image
                                            </button>
                                        )}
                                    </div>

                                    {/* Inpaint/Outpaint Mode - Show helpful message if no image uploaded */}
                                    {(enhanceEditMode === 'inpaint' || enhanceEditMode === 'outpaint') && !uploadedEnhanceImage && (
                                        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                                            <p className="text-sm text-blue-700 dark:text-blue-300 font-medium">
                                                {enhanceEditMode === 'inpaint' ? '🎨 Inpainting Mode' : '🖼️ Outpainting Mode'}
                                            </p>
                                            <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                                                {enhanceEditMode === 'inpaint' 
                                                    ? 'Upload an image above, then use the canvas brush tool to mark areas you want to remove or correct.'
                                                    : 'Upload an image above, then select the directions you want to expand your image in.'
                                                }
                                            </p>
                                        </div>
                                    )}

                                    {/* Caption Mode UI */}
                                    {enhanceEditMode === 'caption' && (
                                    <>
                                    {/* Step 2: Generate Caption Script */}
                                    <div>
                                        <div className="flex items-center justify-between mb-2">
                                            <label className="block text-sm font-semibold text-zinc-700 dark:text-slate-100">2. Generate Caption Script</label>
                                            <Tooltip>
                                                <TooltipTrigger asChild>
                                                    <button
                                                        onClick={handleGenerateCaptionScript}
                                                        disabled={!uploadedEnhanceImage || isGeneratingScript}
                                                        className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-md transition-colors disabled:bg-slate-400 disabled:cursor-not-allowed"
                                                        data-testid="button-generate-script"
                                                    >
                                                        {isGeneratingScript ? (
                                                            <div className="animate-spin h-4 w-4 border-b-2 border-white rounded-full"/>
                                                        ) : (
                                                            <>
                                                                <MagicWandIcon className="w-4 h-4" />
                                                                <span>Generate Script</span>
                                                            </>
                                                        )}
                                                    </button>
                                                </TooltipTrigger>
                                                <TooltipContent>
                                                    <p>Generate a smart caption script based on the uploaded image.</p>
                                                </TooltipContent>
                                            </Tooltip>
                                        </div>
                                    </div>

                                    {/* Step 3: Script Box (Editable) */}
                                    <div>
                                        <label className="block text-sm font-semibold text-zinc-700 dark:text-slate-100 mb-2">3. Script</label>
                                        <textarea
                                            value={enhanceScript}
                                            onChange={(e) => setEnhanceScript(e.target.value)}
                                            rows={4}
                                            className="w-full bg-slate-100 dark:bg-zinc-700 border border-slate-300 dark:border-zinc-600 rounded-md p-3 text-zinc-900 dark:text-white placeholder:text-zinc-400 dark:placeholder:text-zinc-500 focus:ring-2 focus:ring-blue-500 outline-none resize-none"
                                            placeholder="e.g., A woman standing under cherry blossoms, cinematic lighting"
                                            data-testid="input-enhance-script"
                                        />
                                        <p className="text-xs text-zinc-500 mt-1">
                                            You can also skip image upload and write your own prompt in the script box.
                                        </p>
                                    </div>

                                    {/* Step 4: Negative Prompt */}
                                    <div>
                                        <label className="block text-sm font-semibold text-zinc-700 dark:text-slate-100 mb-2">4. Negative Prompt (Optional)</label>
                                        <textarea
                                            value={enhanceNegativePrompt}
                                            onChange={(e) => setEnhanceNegativePrompt(e.target.value)}
                                            rows={2}
                                            className="w-full bg-slate-100 dark:bg-zinc-700 border border-slate-300 dark:border-zinc-600 rounded-md p-3 text-zinc-900 dark:text-white placeholder:text-zinc-400 dark:placeholder:text-zinc-500 focus:ring-2 focus:ring-blue-500 outline-none resize-none"
                                            placeholder="e.g., blurry, low quality, distorted, text, watermark"
                                            data-testid="input-negative-prompt"
                                        />
                                        <p className="text-xs text-zinc-500 mt-1">
                                            Describe elements to exclude from the generated images.
                                        </p>
                                    </div>

                                    {/* Info about __BLANK__ token */}
                                    <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
                                        <p className="text-xs text-blue-700 dark:text-blue-300">
                                            <strong>💡 Tip:</strong> Leave the script blank to use the special <code className="bg-blue-100 dark:bg-blue-900/50 px-1 py-0.5 rounded">__BLANK__</code> token. This generates images based solely on your brand kit colors and context.
                                        </p>
                                    </div>
                                    </>
                                    )}

                                    {/* Inpainting Mode UI */}
                                    {enhanceEditMode === 'inpaint' && uploadedEnhanceImage && (
                                        <div className="space-y-4">
                                            <div>
                                                <label className="block text-sm font-semibold text-zinc-700 dark:text-slate-100 mb-2">2. Mark Areas to Remove/Correct</label>
                                                <ImageEditCanvas
                                                    imageDataUrl={uploadedEnhanceImage.dataUrl}
                                                    mode="inpaint"
                                                    brushSize={brushSize}
                                                    onBrushSizeChange={setBrushSize}
                                                    onMaskChange={setMaskDataUrl}
                                                />
                                            </div>

                                            <div>
                                                <Tooltip>
                                                    <TooltipTrigger asChild>
                                                        <label className="block text-sm font-semibold text-zinc-700 dark:text-slate-100 mb-2 cursor-help">
                                                            3. Removal Instruction (Optional) <span className="text-zinc-400">ⓘ</span>
                                                        </label>
                                                    </TooltipTrigger>
                                                    <TooltipContent>
                                                        <p className="text-sm max-w-xs">Use removal keywords for best results: "remove watch", "erase logo", "delete text". Leave blank for automatic clean removal.</p>
                                                    </TooltipContent>
                                                </Tooltip>
                                                <textarea
                                                    value={enhanceScript}
                                                    onChange={(e) => setEnhanceScript(e.target.value)}
                                                    rows={3}
                                                    className="w-full bg-slate-100 dark:bg-zinc-700 border border-slate-300 dark:border-zinc-600 rounded-md p-3 text-zinc-900 dark:text-white placeholder:text-zinc-400 dark:placeholder:text-zinc-500 focus:ring-2 focus:ring-blue-500 outline-none resize-none"
                                                    placeholder='Use removal keywords: "remove watch", "erase logo", "delete bracelet" (or leave blank for auto-removal)'
                                                    data-testid="input-inpaint-description"
                                                />
                                                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1.5">
                                                    💡 <strong>Tip:</strong> For best results, use removal keywords like "remove", "erase", or "delete" followed by the object name.
                                                </p>
                                            </div>

                                            <Tooltip>
                                                <TooltipTrigger asChild>
                                                    <button
                                                        onClick={handleUpscaleImage}
                                                        disabled={isUpscaling}
                                                        className="w-full bg-purple-600 hover:bg-purple-700 text-white font-semibold py-2.5 px-4 rounded-lg flex items-center justify-center gap-2 transition-colors disabled:bg-slate-400 disabled:cursor-not-allowed"
                                                        data-testid="button-upscale-image"
                                                    >
                                                        {isUpscaling ? (
                                                            <>
                                                                <div className="animate-spin h-4 w-4 border-b-2 border-white rounded-full"/>
                                                                <span>Upscaling...</span>
                                                            </>
                                                        ) : (
                                                            <>
                                                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
                                                                <span>Upscale Image</span>
                                                            </>
                                                        )}
                                                    </button>
                                                </TooltipTrigger>
                                                <TooltipContent>
                                                    <p>Sharpen and enhance the clarity of your uploaded image using AI-powered upscaling.</p>
                                                </TooltipContent>
                                            </Tooltip>

                                            <button
                                                onClick={handleGenerateInpaintImage}
                                                disabled={!maskDataUrl || isGeneratingInpaint}
                                                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-4 rounded-lg flex items-center justify-center transition-colors disabled:bg-slate-400 disabled:cursor-not-allowed"
                                                data-testid="button-generate-inpaint"
                                            >
                                                {isGeneratingInpaint ? (
                                                    <div className="animate-spin h-5 w-5 border-b-2 border-white rounded-full"/>
                                                ) : (
                                                    'Generate Inpainted Image'
                                                )}
                                            </button>
                                        </div>
                                    )}

                                    {/* Outpainting Mode UI */}
                                    {enhanceEditMode === 'outpaint' && uploadedEnhanceImage && (
                                        <div className="space-y-4">
                                            <div>
                                                <label className="block text-sm font-semibold text-zinc-700 dark:text-slate-100 mb-2">2. Image Preview</label>
                                                <ImageEditCanvas
                                                    imageDataUrl={uploadedEnhanceImage.dataUrl}
                                                    mode="outpaint"
                                                    brushSize={brushSize}
                                                    onBrushSizeChange={setBrushSize}
                                                    onMaskChange={() => {}}
                                                />
                                            </div>

                                            <div>
                                                <label className="block text-sm font-semibold text-zinc-700 dark:text-slate-100 mb-2">3. Expansion Direction</label>
                                                <div className="grid grid-cols-2 gap-2">
                                                    <button
                                                        onClick={() => setOutpaintDirections(prev => ({ ...prev, left: !prev.left }))}
                                                        className={`py-2 px-4 rounded-md font-medium text-sm transition-colors ${outpaintDirections.left ? 'bg-blue-600 text-white' : 'bg-slate-200 dark:bg-zinc-600 hover:bg-slate-300 dark:hover:bg-zinc-500'}`}
                                                        data-testid="button-outpaint-left"
                                                    >
                                                        ← Left
                                                    </button>
                                                    <button
                                                        onClick={() => setOutpaintDirections(prev => ({ ...prev, right: !prev.right }))}
                                                        className={`py-2 px-4 rounded-md font-medium text-sm transition-colors ${outpaintDirections.right ? 'bg-blue-600 text-white' : 'bg-slate-200 dark:bg-zinc-600 hover:bg-slate-300 dark:hover:bg-zinc-500'}`}
                                                        data-testid="button-outpaint-right"
                                                    >
                                                        Right →
                                                    </button>
                                                    <button
                                                        onClick={() => setOutpaintDirections(prev => ({ ...prev, top: !prev.top }))}
                                                        className={`py-2 px-4 rounded-md font-medium text-sm transition-colors ${outpaintDirections.top ? 'bg-blue-600 text-white' : 'bg-slate-200 dark:bg-zinc-600 hover:bg-slate-300 dark:hover:bg-zinc-500'}`}
                                                        data-testid="button-outpaint-top"
                                                    >
                                                        ↑ Top
                                                    </button>
                                                    <button
                                                        onClick={() => setOutpaintDirections(prev => ({ ...prev, bottom: !prev.bottom }))}
                                                        className={`py-2 px-4 rounded-md font-medium text-sm transition-colors ${outpaintDirections.bottom ? 'bg-blue-600 text-white' : 'bg-slate-200 dark:bg-zinc-600 hover:bg-slate-300 dark:hover:bg-zinc-500'}`}
                                                        data-testid="button-outpaint-bottom"
                                                    >
                                                        ↓ Bottom
                                                    </button>
                                                </div>
                                            </div>

                                            <div>
                                                <Tooltip>
                                                    <TooltipTrigger asChild>
                                                        <label className="block text-sm font-semibold text-zinc-700 dark:text-slate-100 mb-2 cursor-help">
                                                            4. Description for Extended Area (Optional) <span className="text-zinc-400">ⓘ</span>
                                                        </label>
                                                    </TooltipTrigger>
                                                    <TooltipContent>
                                                        <p>Optional, but helps AI understand your intent more accurately (e.g., "natural forest background")</p>
                                                    </TooltipContent>
                                                </Tooltip>
                                                <textarea
                                                    value={enhanceScript}
                                                    onChange={(e) => {
                                                        setEnhanceScript(e.target.value);
                                                        // Mark as dirty when user manually types
                                                        setOutpaintPromptIsDirty(true);
                                                    }}
                                                    rows={3}
                                                    className="w-full bg-slate-100 dark:bg-zinc-700 border border-slate-300 dark:border-zinc-600 rounded-md p-3 text-zinc-900 dark:text-white placeholder:text-zinc-400 dark:placeholder:text-zinc-500 focus:ring-2 focus:ring-blue-500 outline-none resize-none"
                                                    placeholder="Describe what should appear in the extended areas (auto-filled based on direction)"
                                                    data-testid="input-outpaint-description"
                                                />
                                            </div>

                                            <button
                                                onClick={handleGenerateOutpaintImage}
                                                disabled={!Object.values(outpaintDirections).some(Boolean) || isGeneratingOutpaint}
                                                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-4 rounded-lg flex items-center justify-center transition-colors disabled:bg-slate-400 disabled:cursor-not-allowed"
                                                data-testid="button-generate-outpaint"
                                            >
                                                {isGeneratingOutpaint ? (
                                                    <div className="animate-spin h-5 w-5 border-b-2 border-white rounded-full"/>
                                                ) : (
                                                    'Generate Outpainted Image'
                                                )}
                                            </button>
                                        </div>
                                    )}

                                    {/* Image2Image Mode UI */}
                                    {enhanceEditMode === 'image2image' && (
                                        <Image2ImageMode 
                                            projectId={project.id}
                                            uploadedImage={uploadedEnhanceImage?.dataUrl}
                                        />
                                    )}

                                </div>
                             )}

                             {visualsTab === 'fusion' && <div className="space-y-4">
                                <div>
                                    <p className="text-sm font-medium text-zinc-600 dark:text-zinc-400 mb-2">1. Upload Background Image</p>
                                    <input type="file" ref={sceneUploadRef} onChange={handleSceneUpload} accept="image/png, image/jpeg" className="hidden" />
                                    <div onClick={() => sceneUploadRef.current?.click()} className="relative w-full h-32 rounded-lg border-2 border-dashed border-slate-300 dark:border-zinc-600 flex flex-col items-center justify-center cursor-pointer hover:border-blue-500 bg-slate-100 dark:bg-zinc-700/50">
                                        {sceneImage ? <img src={sceneImage.dataUrl} alt="Scene preview" className="absolute inset-0 w-full h-full object-contain rounded-lg" /> : <><IconScene /> <span className="text-xs mt-1">Click to upload scene</span></>}
                                    </div>
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-zinc-600 dark:text-zinc-400 mb-2">2. Upload Your Product Image (PNG or JPEG - background auto-removed)</p>
                                    <input type="file" ref={productUploadRef} onChange={handleProductUpload} accept="image/png,image/jpeg,image/jpg" className="hidden" />
                                    <div onClick={() => productUploadRef.current?.click()} className="relative w-full h-32 rounded-lg border-2 border-dashed border-slate-300 dark:border-zinc-600 flex flex-col items-center justify-center cursor-pointer hover:border-blue-500 bg-slate-100 dark:bg-zinc-700/50">
                                        {productImage ? <img src={productImage.dataUrl} alt="Product preview" className="absolute inset-0 w-full h-full object-contain p-2 rounded-lg" /> : <><IconProduct /> <span className="text-xs mt-1">Click to upload product (PNG/JPEG)</span></>}
                                    </div>
                                </div>
                                <div className="relative">
                                     <p className="text-sm font-medium text-zinc-600 dark:text-zinc-400 mb-2">3. Describe Fusion Instructions</p>
                                     <textarea 
                                         value={fusionPrompt} 
                                         onChange={e => setFusionPrompt(e.target.value)} 
                                         rows={4} 
                                         className="w-full bg-slate-100 dark:bg-zinc-700 border border-slate-300 dark:border-zinc-600 rounded-md p-2 text-sm text-zinc-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none resize-none" 
                                         placeholder="e.g., Place the product gently on the soft sand with ocean waves subtly blurred behind it"
                                         data-testid="input-placement-description"
                                     />
                                     <button
                                        onClick={handleGenerateFusionSuggestion}
                                        disabled={!sceneImage || !productImage || isGeneratingSuggestion}
                                        className="mt-2 w-full bg-purple-600 hover:bg-purple-700 text-white font-medium py-2 px-3 rounded-md flex items-center justify-center transition-colors disabled:bg-slate-400 disabled:cursor-not-allowed text-sm"
                                        data-testid="button-generate-fusion-suggestion"
                                     >
                                        {isGeneratingSuggestion ? (
                                            <>
                                                <div className="animate-spin h-4 w-4 border-b-2 border-white rounded-full mr-2" />
                                                Analyzing images...
                                            </>
                                        ) : (
                                            <>
                                                <MagicWandIcon className="w-4 h-4 mr-2" />
                                                Auto-Generate Fusion Instructions
                                            </>
                                        )}
                                     </button>
                                     <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                                        AI will analyze both images and suggest how to blend them naturally
                                     </p>
                                     
                                     {/* Placement Suggestions Popup */}
                                     {showPlacementSuggestions && placementSuggestions.length === 3 && (
                                         <div className="mt-2 bg-white dark:bg-zinc-800 border border-blue-300 dark:border-blue-700 rounded-lg p-3 shadow-lg animate-in fade-in slide-in-from-top-2 duration-200">
                                             <div className="flex items-center justify-between mb-2">
                                                 <p className="text-xs font-semibold text-blue-600 dark:text-blue-400 flex items-center gap-1.5">
                                                     <MagicWandIcon className="w-3.5 h-3.5" />
                                                     AI Placement Suggestions
                                                 </p>
                                                 <button 
                                                     onClick={() => setShowPlacementSuggestions(false)}
                                                     className="text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 transition-colors"
                                                     data-testid="button-close-suggestions"
                                                 >
                                                     <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                         <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                                     </svg>
                                                 </button>
                                             </div>
                                             <div className="space-y-1.5">
                                                 {placementSuggestions.map((suggestion, idx) => (
                                                     <button
                                                         key={idx}
                                                         onClick={() => {
                                                             setFusionPrompt(suggestion);
                                                             setShowPlacementSuggestions(false);
                                                         }}
                                                         className="w-full text-left px-3 py-2 text-sm bg-slate-50 dark:bg-zinc-700 hover:bg-blue-50 dark:hover:bg-blue-900/20 text-zinc-700 dark:text-zinc-200 rounded-md transition-colors border border-slate-200 dark:border-zinc-600 hover:border-blue-300 dark:hover:border-blue-700"
                                                         data-testid={`button-suggestion-${idx}`}
                                                     >
                                                         {suggestion}
                                                     </button>
                                                 ))}
                                             </div>
                                         </div>
                                     )}
                                </div>

                                {/* Canvas Size Selection - HIDDEN: Now automatically preserving original background dimensions */}
                             </div>}

                             {visualsTab === 'promo-video' && (
                                <PromoVideoTab projectId={project.id} />
                             )}
                        </>
                    )}
                </div>

                <div className="mt-auto pt-6 border-t border-slate-200 dark:border-zinc-700/80">
                    {editorStep === 'content' && (
                        <button
                            onClick={() => {
                                setEditorStep('visuals');
                                setVisualsTab('ai'); // Ensure AI tab opens after confirmation
                            }}
                            disabled={!headline.trim() || isLoading}
                            className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-bold py-3.5 px-4 rounded-lg flex items-center justify-center transition-all duration-200 disabled:from-slate-400 disabled:to-slate-400 disabled:cursor-not-allowed shadow-lg hover:shadow-blue-500/50 hover:scale-[1.02] active:scale-[0.98] group"
                            data-testid="button-confirm-continue"
                        >
                            <svg className="w-5 h-5 mr-2 group-hover:scale-110 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <span>Confirm and Continue to Visuals</span>
                            <svg className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                        </button>
                    )}
                    {editorStep === 'visuals' && visualsTab === 'ai' && (
                        <button
                            onClick={handleGenerateImages}
                            disabled={!headline.trim() || isLoading}
                            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-lg flex items-center justify-center transition-colors disabled:bg-slate-400"
                        >
                            {isLoading ? <div className="animate-spin h-5 w-5 border-b-2 rounded-full"/> : <><span>🎨</span><span className="ml-2">Create My Designs</span></>}
                        </button>
                    )}
                    {editorStep === 'visuals' && visualsTab === 'upload' && enhanceEditMode === 'caption' && (
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <button
                                    onClick={handleGenerateFromScript}
                                    disabled={isLoading}
                                    className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-lg flex items-center justify-center transition-colors disabled:bg-slate-400"
                                    data-testid="button-generate-from-script"
                                >
                                   {isLoading ? <div className="animate-spin h-5 w-5 border-b-2 rounded-full"/> : <><MagicWandIcon className="w-5 h-5" /><span className="ml-2">Generate Image</span></>}
                                </button>
                            </TooltipTrigger>
                            <TooltipContent>
                                <p>Use this script to generate a new visual.</p>
                            </TooltipContent>
                        </Tooltip>
                    )}
                     {editorStep === 'visuals' && visualsTab === 'fusion' && (
                        <button
                            onClick={handleGenerateFusionImage}
                            disabled={!sceneImage || !productImage || !fusionPrompt.trim() || isLoading}
                            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-lg flex items-center justify-center transition-colors disabled:bg-slate-400"
                        >
                            {isLoading ? <div className="animate-spin h-5 w-5 border-b-2 rounded-full"/> : <><MagicWandIcon className="w-5 h-5" /><span className="ml-2">Generate Fused Image</span></>}
                        </button>
                    )}
                     {/* PromoVideo generate button REMOVED - now managed by PromoVideoTab component (Nov 2025) */}
                </div>
            </aside>

            <main className="flex-1 flex flex-col h-full bg-slate-100 dark:bg-zinc-900 overflow-hidden">
                <header className="flex-shrink-0 bg-white dark:bg-zinc-800/50 p-4 border-b border-slate-200 dark:border-zinc-700/80">
                    {/* Project Name - Centered */}
                    <div 
                        className="flex items-center justify-center gap-2 mb-3 group"
                        onMouseEnter={() => setIsHoveringProjectName(true)}
                        onMouseLeave={() => setIsHoveringProjectName(false)}
                    >
                        {isEditingProjectName ? (
                            <input
                                ref={projectNameInputRef}
                                type="text"
                                value={projectName}
                                onChange={(e) => setProjectName(e.target.value)}
                                onBlur={() => {
                                    setIsEditingProjectName(false);
                                    if (projectName.trim() && projectName !== project.name) {
                                        onUpdateProject({ ...project, name: projectName.trim(), lastModified: new Date().toISOString().split('T')[0] }, '✅ Project name updated');
                                    }
                                }}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                        setIsEditingProjectName(false);
                                        if (projectName.trim() && projectName !== project.name) {
                                            onUpdateProject({ ...project, name: projectName.trim(), lastModified: new Date().toISOString().split('T')[0] }, '✅ Project name updated');
                                        }
                                    } else if (e.key === 'Escape') {
                                        setProjectName(project.name);
                                        setIsEditingProjectName(false);
                                    }
                                }}
                                className="text-center bg-transparent font-semibold focus:outline-none focus:ring-2 focus:ring-purple-500 rounded px-2 py-1"
                                style={{ fontSize: '20px', fontWeight: '600', color: getProjectNameColor() }}
                                data-testid="input-project-name"
                                autoFocus
                            />
                        ) : (
                            <>
                                <span 
                                    className="font-semibold text-center"
                                    style={{ fontSize: '20px', fontWeight: '600', color: getProjectNameColor() }}
                                >
                                    {projectName}
                                </span>
                                <button
                                    onClick={() => {
                                        setIsEditingProjectName(true);
                                        setTimeout(() => projectNameInputRef.current?.focus(), 0);
                                    }}
                                    className={`p-1.5 rounded-md hover:bg-purple-100 dark:hover:bg-purple-900/30 transition-all ${isHoveringProjectName ? 'opacity-100' : 'opacity-0'}`}
                                    title="Click to rename your project"
                                    data-testid="button-edit-project-name"
                                >
                                    <Pencil className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                                </button>
                            </>
                        )}
                    </div>
                    
                    {/* Community Attribution Banner */}
                    {project.source === 'community' && (
                        <div className="mb-3 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3 text-center" data-testid="banner-community-attribution">
                            <p className="flex items-center justify-center gap-2 text-sm text-blue-800 dark:text-blue-300 font-medium mb-1">
                                <Sparkles className="w-4 h-4" />
                                You're customizing a duplicated design from the Community
                            </p>
                            <p className="text-xs text-blue-600 dark:text-blue-400">
                                Originally created by: <span className="font-semibold">{project.originalCreatorName || 'Community User'}</span>
                                {project.originalPublishDate && (
                                    <> • Published on: {new Date(project.originalPublishDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</>
                                )}
                            </p>
                        </div>
                    )}
                    
                    {/* Controls Row */}
                    <div className="flex justify-between items-center">
                        <h2 className="text-sm font-semibold text-zinc-600 dark:text-zinc-400">Generated Visuals</h2>
                        <div className="flex items-center gap-3">
                        <span className="bg-slate-100 dark:bg-zinc-700 text-slate-600 dark:text-slate-300 text-xs font-mono px-2 py-1 rounded">Canvas: {sizeLabel}</span>
                        
                        {/* Share to Community Toggle */}
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <div className="flex items-center gap-2 bg-slate-100 dark:bg-zinc-700 px-3 py-1.5 rounded-md">
                                    {isPublic ? (
                                        <Globe className="w-4 h-4 text-blue-600" />
                                    ) : (
                                        <Lock className="w-4 h-4 text-slate-500 dark:text-slate-400" />
                                    )}
                                    <Switch 
                                        checked={isPublic}
                                        onCheckedChange={handleTogglePublic}
                                        disabled={isTogglingPublic}
                                        data-testid="switch-share-community"
                                        aria-label="Share to Community"
                                    />
                                </div>
                            </TooltipTrigger>
                            <TooltipContent>
                                {isPublic ? (
                                    <p>Public: Shared to Community gallery for others to view and use.</p>
                                ) : (
                                    <p>Private: Only you can see this design.</p>
                                )}
                            </TooltipContent>
                        </Tooltip>
                        
                        <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-zinc-700 p-1 rounded-md">
                            <button
                                onClick={() => setImageGridLayout('4')}
                                data-testid="button-layout-4"
                                className={`px-2.5 py-1 text-xs font-semibold rounded transition-colors ${
                                    imageGridLayout === '4' 
                                    ? 'bg-blue-600 text-white' 
                                    : 'text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-zinc-600'
                                }`}
                                title="4-image grid layout"
                            >
                                🔲 4-Grid
                            </button>
                            <button
                                onClick={() => setImageGridLayout('2')}
                                data-testid="button-layout-2"
                                className={`px-2.5 py-1 text-xs font-semibold rounded transition-colors ${
                                    imageGridLayout === '2' 
                                    ? 'bg-blue-600 text-white' 
                                    : 'text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-zinc-600'
                                }`}
                                title="2-image grid layout"
                            >
                                🔳 2-Grid
                            </button>
                        </div>
                        
                        {/* Auto-Optimize Text Design Toggle */}
                        {editorStep === 'visuals' && (
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <div className="flex items-center gap-2 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 px-3 py-1.5 rounded-md" data-testid="control-auto-optimize">
                                        <span className="text-xs font-medium text-blue-700 dark:text-blue-300">Auto-Optimize Text Design</span>
                                        <Switch 
                                            checked={autoOptimizeText}
                                            onCheckedChange={(checked) => setAutoOptimizeText(checked)}
                                            data-testid="switch-auto-optimize"
                                            aria-label="Auto-Optimize Text Design"
                                        />
                                    </div>
                                </TooltipTrigger>
                                <TooltipContent>
                                    <p>Automatically enhances text readability by avoiding faces and improving contrast in your design.</p>
                                </TooltipContent>
                            </Tooltip>
                        )}
                    </div>
                    </div>
                </header>
                
                <div className="flex-1 overflow-y-auto p-6 space-y-8 relative">
                    {/* Local Loading Overlay - Only covers Generated Visuals section */}
                    {isLoading && (
                        <div className="absolute inset-0 bg-slate-100/95 dark:bg-zinc-900/95 flex flex-col items-center justify-center z-40 backdrop-blur-sm">
                            <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                            <p className="mt-4 text-lg font-semibold text-zinc-700 dark:text-zinc-200">{loadingMessage}</p>
                            <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">This may take a moment...</p>
                        </div>
                    )}
                    
                    {error && <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4" role="alert"><p>{error}</p></div>}
                    
                    {!isLoading && campaigns.length === 0 && (
                        <div className="text-center py-20">
                            <h2 className="text-2xl font-bold text-zinc-700 dark:text-zinc-200">Your Generated Visuals Will Appear Here</h2>
                            <p className="text-zinc-500 dark:text-zinc-400 mt-2">Finish Step 1, then click "Create My Designs" to get started.</p>
                        </div>
                    )}
                    
                    {campaigns.map((campaign, campIndex) => (
                        <section key={campaign.id}>
                             <div className="mb-4 bg-white dark:bg-zinc-800 p-4 rounded-lg shadow-sm border border-slate-200 dark:border-zinc-700">
                                <div className="flex justify-between items-start">
                                    <div className="flex-1 pr-4">
                                        <div className="flex items-start gap-2">
                                            <AutoExpandingTextarea
                                                value={campaign.headline}
                                                onChange={(e) => handleCampaignTextChange(campaign.id, 'headline', e.target.value)}
                                                className="font-bold text-lg bg-transparent border-none focus:ring-0 p-0 w-full"
                                                placeholder="Enter headline..."
                                            />
                                            <button
                                                onClick={() => handleOpenAiImprove(campaign.id, 'headline')}
                                                className="flex-shrink-0 p-2 hover:bg-blue-100 dark:hover:bg-blue-900/30 rounded-md transition-colors"
                                                title="Improve Your Text with AI"
                                                data-testid={`button-improve-headline-${campaign.id}`}
                                            >
                                                <MagicWandIcon className="w-5 h-5" />
                                            </button>
                                        </div>
                                        <div className="flex items-start gap-2 mt-1">
                                            <AutoExpandingTextarea
                                                value={campaign.subheadline}
                                                onChange={(e) => handleCampaignTextChange(campaign.id, 'subheadline', e.target.value)}
                                                className="text-zinc-600 dark:text-zinc-400 text-sm bg-transparent border-none focus:ring-0 p-0 w-full"
                                                placeholder="Enter subheadline..."
                                            />
                                            <button
                                                onClick={() => handleOpenAiImprove(campaign.id, 'subheadline')}
                                                className="flex-shrink-0 p-2 hover:bg-blue-100 dark:hover:bg-blue-900/30 rounded-md transition-colors"
                                                title="Improve Your Text with AI"
                                                data-testid={`button-improve-subheadline-${campaign.id}`}
                                            >
                                                <MagicWandIcon className="w-5 h-5" />
                                            </button>
                                        </div>
                                    </div>
                                     <button onClick={() => handleCopyDescription(campaign)} title="Copy Text" className="flex items-center gap-1.5 text-sm font-semibold text-zinc-600 dark:text-zinc-300 hover:text-blue-600 dark:hover:text-blue-400 bg-slate-100 dark:bg-zinc-700 px-3 py-1.5 rounded-md transition-colors">
                                        {copiedCampaignId === campaign.id ? <IconCheck /> : <IconCopy />}
                                        {copiedCampaignId === campaign.id ? 'Copied!' : 'Copy Text'}
                                    </button>
                                </div>
                            </div>
                            <div className={`grid gap-6 ${imageGridLayout === '4' ? 'grid-cols-2 lg:grid-cols-4' : 'grid-cols-2'}`}>
                                {campaign.images.map((image) => {
                                    // isSaved comes directly from database via GET /api/projects/:id/full
                                    const isSaved = image.isSaved === true;
                                    const isModified = modifiedImageIds.has(image.id);
                                    const isSelectedForSave = selectedImageIds.has(image.id);
                                    const isSelected = activeImage?.campaignId === campaign.id && activeImage?.imageId === image.id;
                                    const effectiveDesign = getEffectiveDesign(image);

                                    return (
                                        <div key={image.id} className="group relative" data-image-id={image.id} data-testid={`visual-card-${image.id}`}>
                                            <div
                                                className={`relative rounded-lg overflow-hidden cursor-pointer transition-all duration-300 shadow-md hover:shadow-xl dark:shadow-black/20
                                                    ${isSelectedForSave ? 'ring-4 ring-blue-500' : 'ring-2 ring-transparent'}`
                                                }
                                                style={{ aspectRatio: project.size.replace('x', '/') }}
                                                data-testid={`visual-wrapper-${image.id}`}
                                                onClick={(e) => {
                                                    // Don't toggle selection if clicking on control buttons
                                                    if ((e.target as HTMLElement).closest('button')) {
                                                        return;
                                                    }
                                                    console.log('[CLICK] Visual wrapper clicked for image:', image.id, 'Shift:', e.shiftKey);
                                                    setActiveImage({ campaignId: campaign.id, imageId: image.id });
                                                    // Select for saving (Shift+Click for multi-select)
                                                    handleImageSelectToggle(image.id, e.shiftKey);
                                                }}
                                                onDoubleClick={() => {
                                                    // For videos: open fullscreen, for images: show enlarged preview
                                                    if ((image as any).isVideo) {
                                                        handleVideoFullscreen(image.id);
                                                    } else {
                                                        setEnlargedPreview({ campaign, image });
                                                    }
                                                }}
                                            >
                                                {/* 🎯 FIX 2: Show loading spinner for placeholder videos */}
                                                {(image as any).isGenerating ? (
                                                    <div className="w-full h-full flex items-center justify-center bg-slate-100 dark:bg-zinc-900">
                                                        <div className="text-center">
                                                            <Loader2 className="h-12 w-12 animate-spin text-blue-500 mx-auto mb-2" />
                                                            <p className="text-sm text-zinc-600 dark:text-zinc-400">Generating video...</p>
                                                        </div>
                                                    </div>
                                                ) : (image as any).isVideo ? (
                                                    <video
                                                        ref={(el) => {
                                                            if (el) {
                                                                videoRefs.current.set(image.id, el);
                                                                // Set default muted state
                                                                el.muted = videoMuteState.get(image.id) ?? true;
                                                            }
                                                        }}
                                                        src={image.src}
                                                        loop
                                                        muted
                                                        className="w-full h-full object-contain bg-black"
                                                        data-testid={`video-${image.id}`}
                                                        onPlay={() => setVideoPlayState(prev => new Map(prev).set(image.id, true))}
                                                        onPause={() => setVideoPlayState(prev => new Map(prev).set(image.id, false))}
                                                    />
                                                ) : (
                                                    <CanvasPreview 
                                                        image={image}
                                                        campaign={campaign}
                                                        design={effectiveDesign}
                                                        brandAssets={brandAssets}
                                                        projectSize={project.size}
                                                        currentUserPlan={currentUserPlan}
                                                        className="w-full h-full"
                                                    />
                                                )}
                                                <ImageStatusIndicator isSaved={isSaved} isSelectedForSave={isSelectedForSave} onToggle={() => handleImageSelectToggle(image.id)} imageId={image.id} />
                                                
                                                {/* Expiration warning for visuals expiring soon (< 10 days) */}
                                                {(image as any).isExpiringSoon && (image as any).daysUntilExpiration > 0 && (
                                                    <div 
                                                        className="absolute bottom-2 left-2 bg-orange-500 text-white text-xs font-semibold px-2 py-1 rounded-md shadow-lg z-10 flex items-center gap-1"
                                                        title={`This visual will be automatically deleted in ${(image as any).daysUntilExpiration} day${(image as any).daysUntilExpiration !== 1 ? 's' : ''}`}
                                                        data-testid={`expiration-warning-${image.id}`}
                                                    >
                                                        <span>🕒</span>
                                                        <span>Expires in {(image as any).daysUntilExpiration}d</span>
                                                    </div>
                                                )}
                                                
                                                {/* Globe icon for public sharing - show for ALL saved images when toggle is ON, and always for shared image */}
                                                {isPublic && (isSaved || publicVisualId === image.id) && (
                                                    <button
                                                        onClick={(e) => handleGlobeIconClick(image.id, isSaved, e)}
                                                        className={`absolute top-2 left-2 p-1.5 rounded-full transition-all z-10 cursor-pointer ${
                                                            publicVisualId === image.id 
                                                                ? 'bg-blue-500 hover:bg-blue-600 text-white' 
                                                                : 'bg-gray-400 hover:bg-gray-500 text-white opacity-70'
                                                        }`}
                                                        title={
                                                            publicVisualId === image.id 
                                                                ? 'Shared to Community - Click to unshare' 
                                                                : 'Click to share to Community'
                                                        }
                                                        data-testid={`button-globe-${image.id}`}
                                                    >
                                                        <Globe className="w-4 h-4" />
                                                    </button>
                                                )}
                                                
                                                {/* Blue label indicator for shared image - centered and only visible when actually shared */}
                                                {publicVisualId === image.id && (
                                                    <div 
                                                        className="absolute top-2 left-1/2 -translate-x-1/2 bg-blue-500 text-white text-xs font-semibold px-2 py-1 rounded-md shadow-lg z-10"
                                                        data-testid={`label-shared-${image.id}`}
                                                    >
                                                        Shared to Community
                                                    </div>
                                                )}
                                            </div>
                                            
                                            {/* Action Bar: Video-specific controls for videos, image controls for images */}
                                            {(image as any).isVideo ? (
                                                <div className="absolute bottom-2 left-2 right-2 flex justify-center items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                                                    <button 
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleVideoPlayPause(image.id);
                                                        }} 
                                                        className="bg-black/80 text-white rounded-full p-2.5 hover:bg-blue-600 transition-colors" 
                                                        title={videoPlayState.get(image.id) ? "Pause" : "Play"}
                                                        data-testid={`button-video-play-pause-${image.id}`}
                                                    >
                                                        {videoPlayState.get(image.id) ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
                                                    </button>
                                                    <button 
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleVideoMuteToggle(image.id);
                                                        }} 
                                                        className="bg-black/80 text-white rounded-full p-2.5 hover:bg-blue-600 transition-colors" 
                                                        title={videoMuteState.get(image.id) ?? true ? "Unmute" : "Mute"}
                                                        data-testid={`button-video-mute-${image.id}`}
                                                    >
                                                        {videoMuteState.get(image.id) ?? true ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
                                                    </button>
                                                    <button 
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleVideoDownload(image);
                                                        }} 
                                                        className="bg-black/80 text-white rounded-full p-2.5 hover:bg-blue-600 transition-colors" 
                                                        title="Download MP4"
                                                        data-testid={`button-video-download-${image.id}`}
                                                    >
                                                        <IconDownload />
                                                    </button>
                                                    <button 
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleDeleteImage(campaign.id, image.id);
                                                        }} 
                                                        className="bg-black/80 text-white rounded-full p-2.5 hover:bg-red-600 transition-colors" 
                                                        title="Delete"
                                                        data-testid={`button-video-delete-${image.id}`}
                                                    >
                                                        <IconTrash />
                                                    </button>
                                                </div>
                                            ) : (
                                                <div className="absolute bottom-2 left-2 right-2 flex justify-center items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                                                    <button onClick={() => setEditingImage({ campaign, image })} className="bg-black/60 text-white rounded-full p-2 hover:bg-blue-600" title="Adjust Layout"><IconSlidersHorizontal /></button>
                                                    {!(campaign.id.startsWith('campaign-fusion-') || image.id.startsWith('img-fusion-')) && (
                                                      <button onClick={() => handleRegenerateImage(campaign.id, image.id)} className="bg-black/60 text-white rounded-full p-2 hover:bg-blue-600" title="Regenerate this image">{regeneratingImageId === image.id ? <div className="animate-spin h-5 w-5 border-b-2 rounded-full"/> : <IconRegenerate />}</button>
                                                    )}
                                                    <button onClick={() => handleDownload(campaign, image)} className="bg-black/60 text-white rounded-full p-2 hover:bg-blue-600" title="Download"><IconDownload /></button>
                                                    <button onClick={() => handleDeleteImage(campaign.id, image.id)} className="bg-black/60 text-white rounded-full p-2 hover:bg-red-600" title="Delete"><IconTrash /></button>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                            
                            {/* Before/After Comparison for Inpaint/Outpaint Results */}
                            {(campaign.id.startsWith('campaign-inpaint-') || campaign.id.startsWith('campaign-outpaint-')) && 
                             campaign.images.length > 0 && 
                             campaign.images[0].originalImageUrl && (
                                <div className="mt-6 bg-white dark:bg-zinc-800 p-6 rounded-lg border border-slate-200 dark:border-zinc-700">
                                    <h3 className="text-lg font-semibold text-zinc-700 dark:text-slate-100 mb-4">
                                        📊 Before & After Comparison
                                    </h3>
                                    <BeforeAfterComparison
                                        beforeImageUrl={campaign.images[0].originalImageUrl}
                                        afterImageUrl={campaign.images[0].src}
                                        altBefore="Original Image"
                                        altAfter={campaign.id.startsWith('campaign-inpaint-') ? "Inpainted Image" : "Outpainted Image"}
                                    />
                                </div>
                            )}
                            
                            {/* Onboarding Tooltips - Show only for first campaign */}
                            {campIndex === 0 && (
                                <div className="mt-6 space-y-3">
                                    {/* Tooltip A - Save Reminder */}
                                    {showSaveReminderTooltip && (
                                        <div 
                                            className="flex items-start gap-3 p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg"
                                            data-testid="tooltip-save-reminder"
                                        >
                                            <span className="text-2xl flex-shrink-0">💡</span>
                                            <p className="flex-1 text-sm text-amber-900 dark:text-amber-100">
                                                Don't forget to click the blue "Save to My Project" button to store your visual.
                                            </p>
                                            <button
                                                onClick={() => setShowSaveReminderTooltip(false)}
                                                className="text-amber-600 dark:text-amber-400 hover:text-amber-800 dark:hover:text-amber-200 flex-shrink-0 text-lg font-bold"
                                                title="Close tooltip"
                                                data-testid="button-close-save-tooltip"
                                            >
                                                ×
                                            </button>
                                        </div>
                                    )}
                                    
                                    {/* Tooltip B - Edit Visual Reminder */}
                                    {showEditVisualTooltip && (
                                        <div 
                                            className="flex items-start gap-3 p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg"
                                            data-testid="tooltip-edit-visual"
                                        >
                                            <span className="text-2xl flex-shrink-0">💡</span>
                                            <p className="flex-1 text-sm text-amber-900 dark:text-amber-100">
                                                Click on a visual to enter editing mode. A blue border will appear around the selected visual.
                                            </p>
                                            <button
                                                onClick={() => setShowEditVisualTooltip(false)}
                                                className="text-amber-600 dark:text-amber-400 hover:text-amber-800 dark:hover:text-amber-200 flex-shrink-0 text-lg font-bold"
                                                title="Close tooltip"
                                                data-testid="button-close-edit-tooltip"
                                            >
                                                ×
                                            </button>
                                        </div>
                                    )}
                                </div>
                            )}
                        </section>
                    ))}
                </div>
                 {campaigns.length > 0 && (
                     <div className="flex justify-center p-6">
                        <button 
                            onClick={handleSaveSelectedImages} 
                            disabled={selectedImageIds.size === 0 || isSavingProject} 
                            className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-6 rounded-lg flex items-center transition-colors disabled:bg-slate-400 shadow-lg hover:shadow-xl"
                            data-testid="button-save-selected"
                        >
                            <IconSave />
                            <span>Save to My Project ({selectedImageIds.size})</span>
                        </button>
                    </div>
                 )}
            </main>
        </div>
        
        {aiImprovementPopup && (
            <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 animate-fade-in" onClick={() => setAiImprovementPopup(null)}>
                <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl p-8 w-full max-w-3xl m-4 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
                    <div className="flex justify-between items-center mb-6">
                        <h2 className="text-2xl font-bold text-zinc-900 dark:text-white flex items-center gap-2">
                            <MagicWandIcon className="w-6 h-6" />
                            Improve Your {aiImprovementPopup.fieldType === 'headline' ? 'Headline' : 'Subheadline'}
                        </h2>
                        <button
                            onClick={() => setAiImprovementPopup(null)}
                            className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 transition-colors"
                            data-testid="button-close-ai-popup"
                        >
                            ✕
                        </button>
                    </div>
                    
                    {/* Current Text */}
                    <div className="mb-6 p-4 bg-slate-100 dark:bg-zinc-800 rounded-lg">
                        <p className="text-sm font-semibold text-zinc-600 dark:text-zinc-400 mb-2">Current Text:</p>
                        <p className="text-lg font-medium text-zinc-900 dark:text-white">{aiImprovementPopup.currentText}</p>
                    </div>
                    
                    {/* AI Improved Versions */}
                    <div className="mb-6">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-bold text-zinc-800 dark:text-zinc-200">
                                AI-Improved Versions (Options {(aiImprovementPopup.suggestionSet - 1) * 3 + 1}–{aiImprovementPopup.suggestionSet * 3})
                            </h3>
                            <div className="flex items-center gap-3">
                                <button
                                    onClick={handleSimplifyText}
                                    disabled={!!aiImprovementPopup.loadingAction}
                                    className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white font-semibold rounded-lg transition-colors disabled:bg-slate-400 disabled:cursor-not-allowed"
                                    title="Generate shorter and clearer headline options"
                                    data-testid="button-simplify-text"
                                >
                                    {aiImprovementPopup.loadingAction === 'simplify' ? (
                                        <div className="animate-spin h-5 w-5 border-b-2 border-white rounded-full"/>
                                    ) : (
                                        <>
                                            <IconScissors />
                                            <span>Simplify</span>
                                        </>
                                    )}
                                </button>
                                <button
                                    onClick={handleGenerateMoreSuggestions}
                                    disabled={!!aiImprovementPopup.loadingAction}
                                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors disabled:bg-slate-400 disabled:cursor-not-allowed"
                                    title="Generate more options"
                                    data-testid="button-generate-more-suggestions"
                                >
                                    {aiImprovementPopup.loadingAction === 'more' ? (
                                        <div className="animate-spin h-5 w-5 border-b-2 border-white rounded-full"/>
                                    ) : (
                                        <span>More Options</span>
                                    )}
                                </button>
                            </div>
                        </div>
                        
                        <div className="relative">
                            {aiImprovementPopup.suggestions.length > 0 ? (
                                <div className={`space-y-3 ${aiImprovementPopup.loadingAction ? 'opacity-40 pointer-events-none' : ''}`}>
                                    {aiImprovementPopup.suggestions.map((suggestion, index) => (
                                        <div
                                            key={`${aiImprovementPopup.suggestionSet}-${index}`}
                                            className="p-4 bg-white dark:bg-zinc-800 border-2 border-slate-200 dark:border-zinc-700 rounded-lg hover:border-blue-500 dark:hover:border-blue-500 transition-colors cursor-pointer group"
                                            onClick={() => handleApplyImprovedText(suggestion)}
                                            data-testid={`suggestion-option-${index + 1}`}
                                        >
                                            <div className="flex items-start justify-between gap-4">
                                                <div className="flex-1">
                                                    <p className="text-sm font-semibold text-blue-600 dark:text-blue-400 mb-1">
                                                        Option {(aiImprovementPopup.suggestionSet - 1) * 3 + index + 1}
                                                    </p>
                                                    <p className="text-zinc-900 dark:text-white font-medium">{suggestion}</p>
                                                </div>
                                                <button
                                                    className="flex-shrink-0 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-md opacity-0 group-hover:opacity-100 transition-opacity"
                                                    data-testid={`button-apply-suggestion-${index + 1}`}
                                                >
                                                    Apply
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : aiImprovementPopup.loadingAction ? (
                                <div className="flex flex-col items-center justify-center py-12">
                                    <div className="animate-spin h-12 w-12 border-4 border-blue-500 border-t-transparent rounded-full mb-4"/>
                                    <p className="text-zinc-600 dark:text-zinc-400">
                                        {aiImprovementPopup.loadingAction === 'simplify' ? 'Simplifying text...' : 'Generating AI suggestions...'}
                                    </p>
                                </div>
                            ) : (
                                <div className="flex flex-col items-center justify-center py-12">
                                    <p className="text-zinc-600 dark:text-zinc-400">No suggestions available</p>
                                </div>
                            )}
                            
                            {aiImprovementPopup.loadingAction && aiImprovementPopup.suggestions.length > 0 && (
                                <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/90 dark:bg-zinc-900/90 backdrop-blur-sm rounded-lg">
                                    <div className="animate-spin h-12 w-12 border-4 border-blue-500 border-t-transparent rounded-full mb-4"/>
                                    <p className="text-zinc-900 dark:text-white font-semibold">
                                        {aiImprovementPopup.loadingAction === 'simplify' ? 'Simplifying text...' : 'Generating new options...'}
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>
                    
                    <div className="flex justify-end gap-3">
                        <button
                            onClick={() => setAiImprovementPopup(null)}
                            className="px-6 py-2 bg-slate-200 dark:bg-zinc-700 hover:bg-slate-300 dark:hover:bg-zinc-600 text-zinc-900 dark:text-white font-semibold rounded-lg transition-colors"
                            data-testid="button-cancel-ai-popup"
                        >
                            Cancel
                        </button>
                    </div>
                </div>
            </div>
        )}
        </>
    );
};

/**
 * Generate direction-specific default prompt for outpainting based on selected directions
 */
function buildOutpaintPrompt(directions: { left: boolean; right: boolean; top: boolean; bottom: boolean }): string {
    const activeDirections = Object.entries(directions)
        .filter(([_, isActive]) => isActive)
        .map(([direction]) => direction);

    if (activeDirections.length === 0) {
        return '';
    }

    // Single direction prompts
    if (activeDirections.length === 1) {
        const direction = activeDirections[0];
        switch (direction) {
            case 'left':
                return "Extend the image to the left, continuing the environment seamlessly, preserving lighting and subject, reveal more of the left scene.";
            case 'right':
                return "Extend the image to the right, maintaining same lighting and environment, reveal more of the right side scene.";
            case 'top':
                return "Expand the image upward, preserve the style and lighting, include background ceiling or sky consistent with the original.";
            case 'bottom':
                return "Extend the image downward, same lighting and background style, add floor, lower part of subject or environment.";
            default:
                return '';
        }
    }

    // Multiple directions - create combined prompt
    const directionPhrases: Record<string, string> = {
        left: 'extend left',
        right: 'extend right',
        top: 'expand upward',
        bottom: 'extend downward',
    };

    const phraseList = activeDirections.map(dir => directionPhrases[dir]).join(' and ');
    return `Seamlessly ${phraseList}, maintaining consistent lighting, environment, and style throughout. Preserve the original subject and atmosphere while revealing more of the surrounding scene.`;
}

const App = () => {
    // Replit Auth
    const { user, signOut } = useAuth();
    
    // Wouter routing
    const [location] = useLocation();
    
    // Helper to get auth headers
    const getAuthHeaders = useCallback((): Record<string, string> => {
        const token = localStorage.getItem('token');
        if (token) {
            return {
                'Authorization': `Bearer ${token}`,
            };
        }
        return {};
    }, []);
    
    // Handle sign out
    const handleSignOut = async () => {
        try {
            await signOut();
            setToast({ message: 'Successfully signed out', type: 'success' });
            setIsBrandKitModalOpen(false);
        } catch (error) {
            console.error('Sign out error:', error);
            setToast({ message: 'Failed to sign out', type: 'error' });
        }
    };
    
    // State Management
    const [page, setPage] = useState<Page>('PROJECTS');
    const [brandAssets, setBrandAssets] = useState<BrandAssets>(() => {
        try {
            const saved = localStorage.getItem('aiMagicBox_brandAssets');
            return saved ? JSON.parse(saved) : INITIAL_BRAND_ASSETS;
        } catch (e) {
            return INITIAL_BRAND_ASSETS;
        }
    });
    const [currentProject, setCurrentProject] = useState<Project | null>(null);
    const [toast, setToast] = useState<{ message: string, type: 'success' | 'error' | 'info' } | null>(null);
    const [isBrandKitModalOpen, setIsBrandKitModalOpen] = useState(false);
    const [settingsInitialTab, setSettingsInitialTab] = useState<'account' | 'brand-kit' | 'usage' | 'feedback'>('account');
    const [isSizeModalOpen, setIsSizeModalOpen] = useState(false);
    const [preselectedSize, setPreselectedSize] = useState<string | undefined>(undefined);
    const [lastOpenedProjectId, setLastOpenedProjectId] = useState<string | null>(() => localStorage.getItem('aiMagicBox_lastOpenedProjectId'));
    const [currentUserPlan, setCurrentUserPlan] = useState<'Starter' | 'Creator' | 'ProFusion'>('Starter');

    // Load projects using TanStack Query
    const { data: projectsData, isLoading: isLoadingProjects } = useQuery({
        queryKey: ['/api/projects'],
        enabled: !!user,
        staleTime: 1000 * 60 * 5, // 5 minutes
    });

    // Derive projects from query data, preserving savedImages
    const projects = useMemo(() => {
        if (!projectsData || !Array.isArray(projectsData)) {
            return [];
        }
        
        return projectsData.map((proj: any) => ({
            ...proj,
            lastModified: new Date(proj.updatedAt).toISOString().split('T')[0],
            creationDate: new Date(proj.createdAt).toISOString().split('T')[0],
            thumbnailUrl: proj.thumbnailUrl || '',
            savedImages: proj.savedImages || [], // CRITICAL: Preserve savedImages from backend
        }));
    }, [projectsData]);

    // AUTO-SAVE REMOVED: Users must manually click "Save to My Project" button
    // Green checkmarks will disappear when editing and reappear after manual save

    useEffect(() => {
        localStorage.setItem('aiMagicBox_brandAssets', JSON.stringify(brandAssets));
    }, [brandAssets]);
    
    useEffect(() => {
        if (lastOpenedProjectId) {
            localStorage.setItem('aiMagicBox_lastOpenedProjectId', lastOpenedProjectId);
        } else {
            localStorage.removeItem('aiMagicBox_lastOpenedProjectId');
        }
    }, [lastOpenedProjectId]);

    // Handlers
    const handleSelectProject = (project: Project) => {
        setCurrentProject(project);
        setPage('EDITOR');
        setLastOpenedProjectId(project.id);
    };

    const handleCreateNew = (size?: string) => {
        setPreselectedSize(size);
        setIsSizeModalOpen(true);
    };

    const handleConfirmNewProject = async (size: string, name: string) => {
        if (!user) {
            setToast({ message: 'Please sign in to create projects', type: 'error' });
            return;
        }
        
        try {
            const authHeaders = getAuthHeaders();
            
            const response = await fetch('/api/projects', {
                method: 'POST',
                headers: {
                    ...authHeaders,
                    'Content-Type': 'application/json',
                },
                credentials: 'include',
                body: JSON.stringify({
                    name: name,
                    description: `A new project for ${name}`,
                    size: size,
                }),
            });
            
            if (response.ok) {
                const dbProject = await response.json();
                const newProject: Project = {
                    id: dbProject.id,
                    name: dbProject.name,
                    lastModified: new Date(dbProject.updatedAt).toISOString().split('T')[0],
                    thumbnailUrl: '',
                    creationDate: new Date(dbProject.createdAt).toISOString().split('T')[0],
                    description: dbProject.description,
                    size: dbProject.size,
                    campaigns: [],
                    savedImages: []
                };
                // Invalidate projects query to trigger refetch
                queryClient.invalidateQueries({ queryKey: ['/api/projects'] });
                handleSelectProject(newProject);
            } else {
                setToast({ message: 'Failed to create project in database', type: 'error' });
            }
        } catch (error) {
            console.error('Failed to create project:', error);
            setToast({ message: 'Failed to create project', type: 'error' });
        }
        setIsSizeModalOpen(false);
    };
    
    const handleNavigateToFeedback = () => {
        setSettingsInitialTab('feedback');
        setIsBrandKitModalOpen(true);
    };
    
    const handleDeleteProject = async (id: string) => {
        if (!user) return;
        
        if (window.confirm('Are you sure you want to delete this project? This action cannot be undone.')) {
            try {
                const authHeaders = getAuthHeaders();
                
                const response = await fetch(`/api/projects/${id}`, {
                    method: 'DELETE',
                    headers: authHeaders,
                    credentials: 'include',
                });
                
                if (response.ok || response.status === 204) {
                    // Invalidate projects query to trigger refetch
                    queryClient.invalidateQueries({ queryKey: ['/api/projects'] });
                    if (lastOpenedProjectId === id) {
                        setLastOpenedProjectId(null);
                    }
                    setToast({ message: 'Project deleted successfully', type: 'success' });
                } else {
                    setToast({ message: 'Failed to delete project', type: 'error' });
                }
            } catch (error) {
                console.error('Failed to delete project:', error);
                setToast({ message: 'Failed to delete project', type: 'error' });
            }
        }
    };

    const handleUpdateProject = async (updatedProject: Project, successMessage?: string) => {
        // Optimistically update current project state
        setCurrentProject(updatedProject);
        
        // Invalidate projects query to trigger refetch from backend
        queryClient.invalidateQueries({ queryKey: ['/api/projects'] });
        
        // Persist project name to database
        try {
            const authHeaders = getAuthHeaders();
            await fetch(`/api/projects/${updatedProject.id}/save`, {
                method: 'POST',
                headers: {
                    ...authHeaders,
                    'Content-Type': 'application/json',
                },
                credentials: 'include',
                body: JSON.stringify({
                    name: updatedProject.name,
                    campaigns: updatedProject.campaigns || [],
                    thumbnailUrl: updatedProject.thumbnailUrl,
                }),
            });
        } catch (error) {
            console.error('Failed to save project name to database:', error);
        }
        
        if (successMessage) {
            setToast({ message: successMessage, type: 'success' });
        }
    };
    
    const handleSaveBrandAssets = (assets: BrandAssets) => {
        setBrandAssets(assets);
        setToast({ message: 'Brand Kit and API settings saved!', type: 'success' });
    };

    const handleSaveApiKey = (key: string) => {
        localStorage.setItem('aiMagicBox_userApiKey', key);
        setIsBrandKitModalOpen(false);
    };

    const handleBackToDashboard = () => {
        setPage('PROJECTS');
        setCurrentProject(null);
    };

    // Render Logic
    const userApiKey = useMemo(() => {
        try {
            return localStorage.getItem('aiMagicBox_userApiKey');
        } catch (e) {
            return null;
        }
    }, [isBrandKitModalOpen]);

    // Wouter routing: render Community page if on /community route
    if (location === '/community') {
        return (
            <ThemeProvider>
                <TooltipProvider>
                    <CommunityShowcase />
                </TooltipProvider>
            </ThemeProvider>
        );
    }

    if (page === 'SUBSCRIPTION') {
        return (
            <ThemeProvider>
                <TooltipProvider>
                    <SubscriptionPage onBack={() => setPage('PROJECTS')} />
                </TooltipProvider>
            </ThemeProvider>
        );
    }

    return (
        <ThemeProvider>
            <TooltipProvider>
            {page === 'PROJECTS' && (
                <ProjectsPage
                    projects={projects}
                    onSelectProject={handleSelectProject}
                    onCreateNew={handleCreateNew}
                    onNavigateToBrandKit={() => setIsBrandKitModalOpen(true)}
                    onNavigateToSubscription={() => setPage('SUBSCRIPTION')}
                    onDeleteProject={handleDeleteProject}
                    lastOpenedProjectId={lastOpenedProjectId}
                    onNavigateToFeedback={handleNavigateToFeedback}
                />
            )}
            {page === 'EDITOR' && currentProject && (
                <EditorPage
                    project={currentProject}
                    brandAssets={brandAssets}
                    onBack={handleBackToDashboard}
                    onUpdateProject={handleUpdateProject}
                    setToast={setToast}
                    userApiKey={userApiKey}
                    currentUserPlan={currentUserPlan}
                />
            )}
            {isBrandKitModalOpen && (
                <SettingsPage
                    initialAssets={brandAssets}
                    onSaveBrandAssets={handleSaveBrandAssets}
                    onBack={() => {
                        setIsBrandKitModalOpen(false);
                        setSettingsInitialTab('account');
                    }}
                    userApiKey={userApiKey}
                    onSaveApiKey={handleSaveApiKey}
                    onSignOut={handleSignOut}
                    initialTab={settingsInitialTab}
                />
            )}
            {isSizeModalOpen && (
                <SelectSizeModal
                    onConfirm={handleConfirmNewProject}
                    onClose={() => setIsSizeModalOpen(false)}
                    preselectedSize={preselectedSize}
                />
            )}
            {toast && <ToastNotification message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
            <Toaster />
            </TooltipProvider>
        </ThemeProvider>
    );
};

// FIX: Added a default export for the App component to resolve the "Module has no default export" error in index.tsx.
export default App;