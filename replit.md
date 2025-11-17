# AI MagicBox Platform

## Overview
AI MagicBox is an AI-driven creative automation platform designed for marketers, designers, and businesses. It offers AI-powered ad copy generation, visual design templates, and fusion visuals (combining product photos with AI-generated backgrounds). The platform supports multilingual content (Bahasa Melayu, English, Simplified Chinese) with specialized CJK typography, integrates BrandKit summaries, and tracks API usage. Its core purpose is to provide a comprehensive, AI-enhanced creative tool with a strong focus on business vision, market potential, and ambitious project goals.

## User Preferences
- **Design System**: ShadCN UI with blue primary color (#3B82F6 / 217 91% 60%)
- **Typography**: Inter (sans), Space Grotesk (serif/headings)
- **Theme**: Dark mode by default with light mode support
- **Layout**: Sidebar navigation (16rem width) with collapsible functionality

## System Architecture
The platform is a full-stack application. The frontend uses React 18, Vite, TypeScript, ShadCN UI, and Tailwind CSS. The backend is powered by Express.js.

### UI/UX Decisions
- Features a unified single-screen experience, inline editing, AI suggestion popups, and first-time user onboarding.
- Community Creations page uses a responsive 4-column grid with filtering and search.
- Mobile-responsive navigation with a hamburger menu.
- Visual Customization Tabs (Content, Enhance, Fusion, PromoVideo) with emoji icons and tooltips.
- Multi-mode image enhancement system within the Enhance Tab: Caption Mode, Inpaint Mode, and Outpaint Mode.
- Enhanced layout for content editing fields with smart expand/collapse functionality.
- Comprehensive multi-step workflow for AI-powered promotional video generation, including visual uploads, AI-powered scene description and text generation, voiceover and music selection, video duration control, and narration summary generation.
- Image2Image Tab for AI-powered style transfer and image transformation.
- Animated gradient effects on the login page with a tagline "Create Stunning Marketing Campaigns with AI" and a password visibility toggle.
- Unified tooltip design and a Message Center for notifications.
- "Adjust Layout" panel improvements for better usability on 1280px-1440px screens.

### Technical Implementations & Feature Specifications
- **Authentication**: Replit Auth for user authentication.
- **Data Management**: PostgreSQL via Drizzle ORM for project, campaign, image, and promotional video data, with TanStack Query for server state.
- **Backend**: Express.js for authenticated and authorized API routes.
- **AI Generation & Brand Kit Integration**: Brand Kit-driven personalization for AI prompts, with multilingual support including CJK typography.
- **Payment Processing**: Stripe for subscriptions.
- **File Uploads**: Multer for server-side uploads, `@imgly/background-removal` for client-side background removal.
- **Object Storage**: Replit App Storage (Google Cloud Storage) for high-quality community image hosting.
- **Validation**: Zod schemas for data validation.
- **Key Features**: Dashboard, Project Workspace (ad copy, Visual Generator, Fusion Visuals, BrandKit), AI Visual-Aware Text Adjustment, Community Creations (browse/share/duplicate), Settings, Subscription management.
- **Community Features**: Public projects, likes, filtering, search, direct sharing, duplication with Brand Kit application, user avatars, optimistic UI for likes, and cursor-based infinite scroll.
- **Performance Optimizations**: Progressive image loading, parallel processing, real-time progress indicators, and debounced search.
- **Async Operation Management**: Client-side utilities for cancellation, timeouts, retry logic, and deduplication.
- **PromoVideo Scene Reordering**: Drag-and-drop reordering with stable timestamp-based IDs.
- **Save Behavior**: Campaign map merging system preserves previously saved images, supporting multiple saves with dual-indicator UI.
- **Persistent States**: Visual indicators for saved/shared images with optimistic updates.
- **Ultra High-Quality Image Rendering & Community Sharing**: Generates and uses ultra high-quality rendered canvases for community sharing.
- **Storage Management**: Usage logs and campaign data in PostgreSQL.
- **Fusion Visual Implementation**: AI-only fusion system using Gemini 2.5 Flash Image model with intelligent prompt auto-suggestion.
- **"Use This Design" Workflow**: Redirects users to Dashboard post-duplication.
- **Community Project Attribution**: "From Community" badge for duplicated projects.
- **User Profile Management**: Editable display name and custom profile picture upload.
- **Video Maker Tab Refactor**: Split into QuickClip (single-image video) and PromoVideo (multi-scene generator).
- **Screenshot Upload for Feedback**: Allows users to attach images to feedback submissions with validation and previews.
- **Logo Aspect Ratio Preservation**: Canvas rendering uses `naturalWidth` and `naturalHeight` to maintain uploaded logo's original shape without compression or distortion.
- **QuickClip Video Generator**: Uses Seedance 1.0 Pro Fast (`bytedance:2@2`) with duration options from 1.2s to 12s, MP4 output, and various HD resolutions. Features automatic background music generation using Runware audioInference API (`elevenlabs:1@1`) with intelligent music mood detection from animation prompts (no manual style selection needed).
- **QuickClip Automatic Music System**: Automatically detects music mood (upbeat, calm, dramatic, corporate, energetic) from animation prompts using keyword analysis, generates background music via Runware audioInference API with ElevenLabs model, and combines video+audio using FFmpeg (November 15, 2025).
- **Promo Video Scene Generation**: Unified Runware → FFmpeg pipeline for generating and concatenating scenes, including voiceover/music integration.
- **PromoVideo Multi-Clip Stitching**: Advanced video concatenation system combines 3+ scene videos into a single promotional video with smooth crossfade transitions (0.5s), automatic background music generation using Runware audioInference API, optional voiceover narration, and seamless integration with Generated Visuals panel. Uses FFmpeg for video processing with intelligent duration detection and NaN guards (November 15, 2025).
- **PromoVideo Immediate Visual Feedback**: Event-driven UX matching QuickClip pattern - dispatches `promovideo-generation-started` event when generation begins, creates placeholder campaign with `isGenerating: true` flag and loading spinner in Generated Visuals panel, polls backend every 2 seconds for completion status, automatically fetches and displays completed video via `visuals-updated` event without manual save or page refresh. Fully automatic experience from generation to display (November 15, 2025).
- **Dashboard Video Badge System**: Implemented video detection and badging for QuickClip projects on the Dashboard, with play icon overlays and client-side poster frame extraction.
- **MyProject Card Auto-Update**: Fixed cache invalidation after save - replaced `queryClient.setQueryData()` with `invalidateQueries()` + `refetchQueries()` pattern to ensure Dashboard MyProject cards update immediately after saving visuals without requiring page refresh (November 15, 2025).
- **Saved Image Loading Fix**: Fixed "Failed to load Image" error when reopening saved projects - added imageUrl → src field mapping transformation when loading campaigns from database to ensure canvas renderer receives valid image sources (November 15, 2025).
- **Video Thumbnail Black Screen Fix**: Fixed black screens on Dashboard video thumbnails by excluding video URLs from CSS background-image rendering - added `!isVideoUrl()` check at line 1496 to prevent `.mp4` URLs from being used as backgrounds, ensuring gradient fallback displays when poster extraction fails or is pending (November 15, 2025).
- **Design Persistence Fix**: Fixed design customizations (text size, position, colors) being lost after save/reload - added `design: img.design ?? img.designOverride ?? null` mapping at line 5077 to preserve layout changes from Adjust Layout modal when loading projects from database (November 15, 2025).
- **QuickClip Music Generation Fixes**: Fixed two critical bugs preventing automatic music generation - (1) Changed `enableMusic` default from `false` to `true` to match UI toggle state, (2) Fixed invalid Runware model from `meta:2@1` to `elevenlabs:1@1` for audioInference API (November 15, 2025).
- **Production CORS Configuration**: Added CORS middleware to allow production domain (aimagicbox.ai) to communicate with backend API - configured with credentials support and allowedOrigins whitelist including production and development domains (November 15, 2025).
- **Production API Base URL Support**: Frontend now supports `VITE_API_BASE_URL` environment variable for production deployments where frontend is hosted separately from backend. Updated `queryClient.ts`, `auth-context.tsx`, and `LoginPage.tsx` to use configurable API base URL. In development, uses relative URLs (empty string). In production, set to backend server URL (e.g., `https://backend.repl.co`) (November 15, 2025).

## External Dependencies
- **Runware.ai API**: For image generation, inpainting, outpainting, upscaling, and image-to-image transformations.
- **Google Gemini API**: For text generation, ad copy, and product image analysis.
- **Google Vertex AI**: For Smart Text Rewriting and Contextual Copywriting.
- **Google Cloud Storage**: Via Replit App Storage.
- **Replit Authentication**: For user authentication and session management.
- **PostgreSQL**: Relational database.
- **Stripe**: Payment gateway.
- **Wouter**: Client-side routing.
- **TanStack Query**: Server state management.
- **ShadCN UI**: Component library.
- **Tailwind CSS**: CSS framework.
- **Lucide React**: Icon library.
- **react-beautiful-dnd**: Drag-and-drop library for scene reordering.
- **@imgly/background-removal**: Client-side background removal.
- **Sharp**: High-performance image processing.