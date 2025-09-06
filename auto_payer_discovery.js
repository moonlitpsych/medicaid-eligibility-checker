// auto_payer_discovery.js - Automatically discover and map new Office Ally payers

require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
);

/**
 * Auto-discover new payers from Office Ally responses
 * This creates a dynamic payer mapping that learns over time
 */
class AutoPayerDiscovery {
    constructor() {
        this.discoveredPayers = new Map();
    }

    /**
     * Extract payer info from raw X12 271 response
     */
    extractPayerFromX12(x12Response) {
        const payerMatch = x12Response.match(/NM1\*PR\*2\*([^*]+)\*.*?\*PI\*([^~]+)/);
        if (!payerMatch) return null;

        return {
            payerName: payerMatch[1].trim(),
            payerId: payerMatch[2].trim()
        };
    }

    /**
     * Smart payer name matching with fuzzy logic
     */
    async findBestMatch(officeName, contractedPayers) {
        const normalizedOfficeName = this.normalizeName(officeName);
        
        let bestMatch = null;
        let bestScore = 0;

        for (const payer of contractedPayers) {
            const normalizedContractName = this.normalizeName(payer.name);
            const score = this.calculateSimilarity(normalizedOfficeName, normalizedContractName);
            
            if (score > bestScore && score > 0.6) { // 60% similarity threshold
                bestScore = score;
                bestMatch = payer;
            }
        }

        return { match: bestMatch, confidence: bestScore };
    }

    /**
     * Normalize payer names for comparison
     */
    normalizeName(name) {
        return name
            .toLowerCase()
            .replace(/[^\w\s]/g, '') // Remove punctuation
            .replace(/\b(healthcare|health|care|insurance|plan|network|medicaid|bcbs|bluecross|blueshield)\b/g, '') // Remove common words
            .replace(/\s+/g, ' ') // Normalize spaces
            .trim();
    }

    /**
     * Calculate string similarity (Jaro-Winkler-like)
     */
    calculateSimilarity(str1, str2) {
        const len1 = str1.length;
        const len2 = str2.length;
        
        if (len1 === 0) return len2 === 0 ? 1.0 : 0.0;
        if (len2 === 0) return 0.0;
        
        const matchDistance = Math.floor(Math.max(len1, len2) / 2) - 1;
        const str1Matches = new Array(len1).fill(false);
        const str2Matches = new Array(len2).fill(false);
        
        let matches = 0;
        let transpositions = 0;
        
        // Find matches
        for (let i = 0; i < len1; i++) {
            const start = Math.max(0, i - matchDistance);
            const end = Math.min(i + matchDistance + 1, len2);
            
            for (let j = start; j < end; j++) {
                if (str2Matches[j] || str1[i] !== str2[j]) continue;
                str1Matches[i] = true;
                str2Matches[j] = true;
                matches++;
                break;
            }
        }
        
        if (matches === 0) return 0.0;
        
        // Count transpositions
        let k = 0;
        for (let i = 0; i < len1; i++) {
            if (!str1Matches[i]) continue;
            while (!str2Matches[k]) k++;
            if (str1[i] !== str2[k]) transpositions++;
            k++;
        }
        
        const jaro = (matches / len1 + matches / len2 + (matches - transpositions / 2) / matches) / 3.0;
        return jaro;
    }

    /**
     * Process eligibility response and auto-learn payers
     */
    async processEligibilityResponse(x12Response) {
        try {
            const payerInfo = this.extractPayerFromX12(x12Response);
            if (!payerInfo) return null;

            console.log(`🔍 Discovered payer: ${payerInfo.payerName} (ID: ${payerInfo.payerId})`);

            // Get all contracted payers
            const { data: contractedPayers } = await supabase
                .from('payers')
                .select('*')
                .eq('state', 'UT'); // Assuming UT for now

            if (!contractedPayers) return null;

            // Find best match
            const { match, confidence } = await this.findBestMatch(payerInfo.payerName, contractedPayers);

            if (match) {
                console.log(`✅ Matched with confidence ${(confidence * 100).toFixed(1)}%: ${match.name}`);
                
                // Store the learning
                this.discoveredPayers.set(payerInfo.payerId, {
                    officeName: payerInfo.payerName,
                    contractedPayer: match,
                    confidence: confidence,
                    discoveredAt: new Date().toISOString()
                });

                return {
                    payerId: payerInfo.payerId,
                    payerName: payerInfo.payerName,
                    matchedPayer: match,
                    networkStatus: this.getNetworkStatus(match),
                    confidence: confidence
                };
            } else {
                console.log(`❓ No match found for ${payerInfo.payerName} (${payerInfo.payerId})`);
                
                // Store as unknown for manual review
                this.discoveredPayers.set(payerInfo.payerId, {
                    officeName: payerInfo.payerName,
                    contractedPayer: null,
                    confidence: 0,
                    discoveredAt: new Date().toISOString(),
                    needsManualReview: true
                });

                return {
                    payerId: payerInfo.payerId,
                    payerName: payerInfo.payerName,
                    matchedPayer: null,
                    networkStatus: 'unknown',
                    confidence: 0
                };
            }

        } catch (error) {
            console.error('Auto-discovery error:', error);
            return null;
        }
    }

    /**
     * Get network status from matched payer
     */
    getNetworkStatus(matchedPayer) {
        if (!matchedPayer) return 'unknown';

        switch (matchedPayer.status_code) {
            case 'approved':
                return matchedPayer.effective_date && new Date(matchedPayer.effective_date) <= new Date()
                    ? 'in_network' : 'pending_activation';
            case 'waiting_on_them':
                return 'pending_approval';
            case 'denied':
            case 'not_started':
                return 'out_of_network';
            default:
                return 'unknown';
        }
    }

    /**
     * Generate updated OFFICE_ALLY_PAYER_MAP code
     */
    generateUpdatedMapping() {
        console.log('\n📋 SUGGESTED OFFICE_ALLY_PAYER_MAP UPDATES:');
        console.log('='.repeat(50));

        for (const [payerId, info] of this.discoveredPayers) {
            if (info.contractedPayer && info.confidence > 0.8) {
                console.log(`'${payerId}': {`);
                console.log(`    name: '${info.contractedPayer.name}',`);
                console.log(`    aliases: ['${info.officeName}', '${info.contractedPayer.name}'],`);
                console.log(`    state: 'UT',`);
                console.log(`    type: '${info.contractedPayer.payer_type}'`);
                console.log(`},`);
                console.log('');
            }
        }
    }
}

module.exports = AutoPayerDiscovery;