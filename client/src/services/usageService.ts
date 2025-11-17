import { AiModel, UsageLog, UsageSummary } from '../types';

// --- Cost Formulas ---
const COST_PER_1K_TOKENS_GEMINI = 0.002;
const COST_PER_IMAGE_IMAGEN = 0.25;
const COST_PER_IMAGE_SDXL = 0.45;

// In-memory store to simulate a database
let usageLogs: UsageLog[] = [];
const SIMULATED_USER_ID = 'user-123';

try {
    const savedLogs = localStorage.getItem('aiMagicBox_usageLogs');
    if (savedLogs) {
        usageLogs = JSON.parse(savedLogs);
    }
} catch (e) {
    console.error("Could not load usage logs from localStorage", e);
    usageLogs = [];
}

const MAX_LOGS_IN_STORAGE = 50; // Limit to prevent localStorage quota errors

const saveLogsToLocalStorage = () => {
    try {
        // Keep only the most recent logs to prevent quota exceeded errors
        const logsToSave = usageLogs.slice(0, MAX_LOGS_IN_STORAGE);
        localStorage.setItem('aiMagicBox_usageLogs', JSON.stringify(logsToSave));
    } catch (e) {
        console.error("Could not save usage logs to localStorage", e);
        // If quota is exceeded, try clearing the key and retrying with fewer logs
        try {
            localStorage.removeItem('aiMagicBox_usageLogs');
            const logsToSave = usageLogs.slice(0, 10); // Save only last 10
            localStorage.setItem('aiMagicBox_usageLogs', JSON.stringify(logsToSave));
        } catch (retryError) {
            console.error("Failed to save even after clearing, giving up", retryError);
        }
    }
}

const calculateCost = (model: AiModel, details: { tokens?: number; imageCount?: number }): number => {
    switch (model) {
        // FIX: Changed 'Gemini 2.5' to 'Gemini 2.5 Flash' to match AiModel type
        case 'Gemini 2.5 Flash':
            return ((details.tokens || 0) / 1000) * COST_PER_1K_TOKENS_GEMINI;
        case 'Imagen 4.0':
            return (details.imageCount || 0) * COST_PER_IMAGE_IMAGEN;
        case 'SDXL':
            return (details.imageCount || 0) * COST_PER_IMAGE_SDXL;
        default:
            return 0;
    }
};

/**
 * Logs an AI usage event. In a real app, this would be an API call to the backend.
 */
export const logUsage = (
    model: AiModel,
    feature: string,
    apiSource: 'System Key' | 'User Key',
    status: 'Success' | 'Failure',
    details: { tokens?: number; imageCount?: number }
) => {
    const logEntry: UsageLog = {
        id: `log_${Date.now()}_${Math.random()}`,
        userId: SIMULATED_USER_ID,
        modelUsed: model,
        feature: feature,
        apiSource: apiSource,
        details: details,
        estimatedCost: status === 'Success' ? calculateCost(model, details) : 0,
        status: status,
        timestamp: new Date().toISOString(),
    };
    usageLogs.unshift(logEntry); // Add to the beginning of the array for recent-first order
    saveLogsToLocalStorage();
    console.log("Logged AI Usage:", logEntry);
};

/**
 * Retrieves a summary of AI usage for the user.
 */
export const getUsageSummary = (userId: string, userApiKey: string | null): Promise<UsageSummary> => {
    return new Promise((resolve) => {
        // Simulate network delay
        setTimeout(() => {
            const userLogs = usageLogs.filter(log => log.userId === userId);

            const summary: UsageSummary = userLogs.reduce(
                (acc, log) => {
                    if (log.status === 'Success') {
                        acc.totalGenerations += 1;
                        acc.totalCost += log.estimatedCost;
                        // FIX: Changed 'Gemini 2.5' to 'Gemini 2.5 Flash' to match AiModel type
                        const modelCount = log.modelUsed === 'Gemini 2.5 Flash' ? 1 : (log.details.imageCount || 1);
                        acc.modelBreakdown[log.modelUsed] = (acc.modelBreakdown[log.modelUsed] || 0) + modelCount;
                    }
                    return acc;
                },
                {
                    totalGenerations: userLogs.filter(l => l.status === 'Success').length,
                    totalCost: 0,
                    apiSource: userApiKey ? 'User Key' : 'System Key',
                    modelBreakdown: {},
                    recentActivity: userLogs,
                }
            );

             // Recalculate total cost separately to avoid floating point issues
            summary.totalCost = userLogs.reduce((sum, log) => sum + (log.status === 'Success' ? log.estimatedCost : 0), 0);

            resolve(summary);
        }, 500);
    });
};
