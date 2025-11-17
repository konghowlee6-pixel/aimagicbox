// FIX: Added application constants to resolve 'Cannot find name' errors and centralize UI strings and configurations.

import { Project, BrandAssets, Template } from './types';

export const APP_TITLE = "AI Marketing Assistant";

export const PRODUCT_INPUT_PLACEHOLDER = "e.g., 'A new line of eco-friendly sunglasses'";

export const IMAGE_STYLES = [
  "Photorealistic",
  "Minimalist",
  "Vintage",
  "Abstract",
  "Futuristic",
  "Watercolor",
  "Cartoon",
];

export const INDUSTRY_TAGS = ['Logistics', 'eCommerce', 'Food & Beverage', 'Retail', 'Technology', 'Health & Wellness'];

export const BUSINESS_CATEGORIES = ['Fashion', 'Restaurant', 'Salon', 'Tech', 'Delivery', 'Retail', 'Health & Wellness', 'Other'];
export const TONE_OF_VOICES = ['Friendly', 'Professional', 'Playful', 'Feminine', 'Bold', 'Corporate', 'Minimalist'];

export const COMMUNITY_CATEGORIES = [
  { value: 'ecommerce', label: 'E-commerce' },
  { value: 'social_media', label: 'Social Media' },
  { value: 'real_estate', label: 'Real Estate' },
  { value: 'food_beverage', label: 'Food & Beverage' },
  { value: 'fashion', label: 'Fashion' },
  { value: 'technology', label: 'Technology' },
  { value: 'health', label: 'Health & Wellness' },
  { value: 'education', label: 'Education' },
  { value: 'other', label: 'Other' },
];

export const PROJECT_SIZES = [
    { size: '12x12', label: '1:1' },
    { size: '9x12', label: '3:4' },
    { size: '16x9', label: '16:9' },
    { size: '9x16', label: '9:16' },
];

// FIX: Expanded project data to include creation dates and descriptions for a richer UI experience and to match the Project type.
// FIX: Replaced unreliable picsum.photos URLs with a more stable placeholder service to fix broken thumbnail images.
export const INITIAL_PROJECTS: Project[] = [
    { id: '1', name: 'Summer Sale Campaign', lastModified: '2024-07-28', thumbnailUrl: 'https://placehold.co/400x300/a78bfa/ffffff?text=Summer+Sale', creationDate: '2024-07-20', description: 'A campaign for the annual summer sale event, targeting beach-goers.', size: '12x6', savedImages: [] },
    { id: '2', name: 'New Sunglasses Launch', lastModified: '2024-07-27', thumbnailUrl: 'https://placehold.co/400x300/fca5a5/ffffff?text=Sunglasses', creationDate: '2024-07-15', description: 'Marketing materials for the new "Aura" sunglasses line.', size: '12x12', savedImages: [] },
    { id: '3', name: 'Autumn Collection Promo', lastModified: '2024-07-25', thumbnailUrl: 'https://placehold.co/400x300/fdba74/ffffff?text=Autumn', creationDate: '2024-07-10', description: 'Promotional content for the upcoming autumn fashion collection.', size: '9x18', savedImages: [] },
    { id: '4', name: 'Social Media Posts - Aug', lastModified: '2024-07-22', thumbnailUrl: 'https://placehold.co/400x300/6ee7b7/ffffff?text=Social', creationDate: '2024-07-01', description: 'A batch of social media graphics and copy for August.', size: '12x12', savedImages: [] },
];

// FIX: Added an initial empty state for the Brand Kit.
export const INITIAL_BRAND_ASSETS: BrandAssets = {
    brandName: 'My Brand',
    logos: [],
    primaryLogoIndex: 0,
    colors: ['#0EA5E9', '#FFFFFF', '#334155', '#000000'],
    sampleFiles: [],
    referenceFiles: [],
    sampleText: '',
    businessCategory: BUSINESS_CATEGORIES[0],
    customBusinessCategory: '',
    tagline: '',
    brandKeywords: '',
    toneOfVoice: TONE_OF_VOICES[0],
};

// FIX: Updated all templates to use the new multi-row headline data structure, ensuring backward compatibility with the new editor features.
// FIX: Added new default values for advanced text effects to ensure type compatibility.
// FIX: Replaced unreliable picsum.photos URLs with a more stable placeholder service to fix broken template preview images.
export const INITIAL_TEMPLATES: Template[] = [
    {
        id: 't1', name: 'Bold & Modern',
        previewUrl: 'https://placehold.co/200x200/3b82f6/ffffff?text=Bold',
        defaultImageSrc: 'https://placehold.co/1080x1080/1e293b/ffffff?text=Modern',
        defaultCampaign: {
            headline: 'Unleash Your Potential',
            subheadline: 'Discover our new collection designed for the modern achiever.',
            description: 'Our latest collection combines cutting-edge technology with sleek, minimalist design. Perfect for those who demand both style and performance.',
            hashtags: ['#Modern', '#Achieve', '#Style', '#Innovation'],
        },
        defaultDesign: {
            headline: {
                rows: [{ fontFamily: 'Inter', fontSize: 32, fontColor: '#FFFFFF', textAlign: 'left', verticalPosition: 'bottom', shadowColor: 'rgba(0,0,0,0.5)', shadowBlur: 10, letterSpacing: 0, useGradient: false, useBackground: false }],
                lineSpacing: 1.2,
                verticalPosition: 'bottom',
            },
            subheadline: { fontFamily: 'Inter', fontSize: 18, fontColor: '#E5E7EB', textAlign: 'left', verticalPosition: 'bottom', letterSpacing: 0, useGradient: false, useBackground: false, lineSpacing: 1.4 },
            addLogo: true, logoPosition: 'top-right', logoSize: 90, logoOpacity: 0.9,
            ctaButton: {
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
            }
        }
    },
    {
        id: 't2', name: 'Elegant & Crisp',
        previewUrl: 'https://placehold.co/200x200/9ca3af/111827?text=Elegant',
        defaultImageSrc: 'https://placehold.co/1080x1080/f3f4f6/111827?text=Crisp',
        defaultCampaign: {
            headline: 'The Art of Simplicity',
            subheadline: 'Experience timeless elegance with our handcrafted essentials.',
            description: 'Each piece in our collection is meticulously crafted to perfection. Quality materials and timeless design make for an unforgettable experience.',
            hashtags: ['#Elegant', '#Timeless', '#Handcrafted', '#Luxury'],
        },
        defaultDesign: {
            headline: {
                rows: [{ fontFamily: 'Georgia', fontSize: 40, fontColor: '#121212', textAlign: 'center', verticalPosition: 'center', letterSpacing: 0, useGradient: false, useBackground: false }],
                lineSpacing: 1.2,
                verticalPosition: 'center',
            },
            subheadline: { fontFamily: 'Georgia', fontSize: 20, fontColor: '#333333', textAlign: 'center', verticalPosition: 'center', letterSpacing: 0, useGradient: false, useBackground: false, lineSpacing: 1.4 },
            addLogo: true, logoPosition: 'bottom-center', logoSize: 80, logoOpacity: 0.8,
            ctaButton: {
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
            }
        }
    },
    {
        id: 't3', name: 'Vibrant & Playful',
        previewUrl: 'https://placehold.co/200x200/ec4899/ffffff?text=Vibrant',
        defaultImageSrc: 'https://placehold.co/1080x1080/f472b6/ffffff?text=Playful',
        defaultCampaign: {
            headline: 'Add a Splash of Color!',
            subheadline: 'Our new vibrant line is here to brighten up your day.',
            description: 'Get ready for a burst of excitement! Fun, fresh, and full of life, our new products are designed to make you smile.',
            hashtags: ['#Colorful', '#Playful', '#Fun', '#Vibrant'],
        },
        defaultDesign: {
            headline: {
                rows: [{ fontFamily: 'Arial', fontSize: 36, fontColor: '#FFFFFF', textAlign: 'center', verticalPosition: 'center', strokeColor: '#000000', strokeWidth: 2, shadowColor: 'rgba(0,0,0,0.3)', shadowBlur: 5, letterSpacing: 0, useGradient: false, useBackground: false }],
                lineSpacing: 1.2,
                verticalPosition: 'center',
            },
            subheadline: { fontFamily: 'Arial', fontSize: 18, fontColor: '#FFFFFF', textAlign: 'center', verticalPosition: 'center', strokeColor: '#000000', strokeWidth: 1, letterSpacing: 0, useGradient: false, useBackground: false, lineSpacing: 1.4 },
            addLogo: true, logoPosition: 'bottom-right', logoSize: 110, logoOpacity: 1.0,
            ctaButton: {
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
            }
        }
    },
    {
        id: 't4', name: 'Minimal & Clean',
        previewUrl: 'https://placehold.co/200x200/d1d5db/4b5563?text=Minimal',
        defaultImageSrc: 'https://placehold.co/1080x1080/e5e7eb/4b5563?text=Clean',
        defaultCampaign: {
            headline: 'Less is More',
            subheadline: 'Pure. Simple. Perfect.',
            description: 'We believe in the power of minimalism. Our products are designed to be clean, functional, and beautiful without the clutter.',
            hashtags: ['#Minimalist', '#CleanDesign', '#Simplicity', '#Essentials'],
        },
        defaultDesign: {
            headline: {
                rows: [{ fontFamily: 'Courier New', fontSize: 28, fontColor: '#2d3748', textAlign: 'right', verticalPosition: 'top', letterSpacing: 0, useGradient: false, useBackground: false }],
                lineSpacing: 1.2,
                verticalPosition: 'top'
            },
            subheadline: { fontFamily: 'Courier New', fontSize: 16, fontColor: '#4a5568', textAlign: 'right', verticalPosition: 'top', letterSpacing: 0, useGradient: false, useBackground: false, lineSpacing: 1.4 },
            addLogo: true, logoPosition: 'bottom-left', logoSize: 100, logoOpacity: 0.7,
            ctaButton: {
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
            }
        }
    }
];