// api-admin.js - Admin API endpoints for payer discovery and management

const express = require('express');
const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');
const autoDiscovery = require('./auto_payer_discovery');
const networkIntegration = require('./supabase_network_integration');

require('dotenv').config({ path: '.env.local' });

const app = express();
app.use(express.json());

// Enable CORS for localhost development
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    next();
});

// Initialize Supabase client
const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
);

const PENDING_MAPPINGS_FILE = 'pending_payer_mappings.json';

// Utility functions
function loadPendingMappings() {
    try {
        if (fs.existsSync(PENDING_MAPPINGS_FILE)) {
            const data = fs.readFileSync(PENDING_MAPPINGS_FILE, 'utf8');
            return JSON.parse(data);
        }
        return [];
    } catch (error) {
        console.error('Error loading pending mappings:', error);
        return [];
    }
}

function savePendingMappings(mappings) {
    try {
        fs.writeFileSync(PENDING_MAPPINGS_FILE, JSON.stringify(mappings, null, 2));
        return true;
    } catch (error) {
        console.error('Error saving pending mappings:', error);
        return false;
    }
}

// API Endpoints

// Get dashboard statistics
app.get('/api/admin/stats', (req, res) => {
    try {
        const pendingMappings = loadPendingMappings();
        const currentMappings = Object.keys(networkIntegration.OFFICE_ALLY_PAYER_MAP);
        
        const stats = {
            mappedCount: currentMappings.length,
            pendingCount: pendingMappings.length,
            avgConfidence: pendingMappings.length > 0 
                ? Math.round(pendingMappings.reduce((sum, m) => sum + m.confidence, 0) / pendingMappings.length)
                : 0,
            weeklyDiscoveries: pendingMappings.filter(m => {
                const weekAgo = new Date();
                weekAgo.setDate(weekAgo.getDate() - 7);
                return new Date(m.discoveredAt) > weekAgo;
            }).length
        };
        
        res.json(stats);
    } catch (error) {
        console.error('Error getting stats:', error);
        res.status(500).json({ error: 'Failed to get statistics' });
    }
});

// Get all pending mappings
app.get('/api/admin/pending', (req, res) => {
    try {
        const pendingMappings = loadPendingMappings();
        res.json(pendingMappings);
    } catch (error) {
        console.error('Error getting pending mappings:', error);
        res.status(500).json({ error: 'Failed to get pending mappings' });
    }
});

// Get current mappings (from OFFICE_ALLY_PAYER_MAP)
app.get('/api/admin/mappings', (req, res) => {
    try {
        const mappings = Object.entries(networkIntegration.OFFICE_ALLY_PAYER_MAP).map(([payerId, info]) => ({
            payerId,
            name: info.name,
            aliases: info.aliases,
            state: info.state,
            type: info.type
        }));
        
        res.json(mappings);
    } catch (error) {
        console.error('Error getting current mappings:', error);
        res.status(500).json({ error: 'Failed to get current mappings' });
    }
});

// Approve a pending mapping
app.post('/api/admin/approve/:mappingId', async (req, res) => {
    try {
        const mappingId = req.params.mappingId;
        const pendingMappings = loadPendingMappings();
        
        const mappingIndex = pendingMappings.findIndex(m => m.id === mappingId);
        if (mappingIndex === -1) {
            return res.status(404).json({ error: 'Mapping not found' });
        }
        
        const mapping = pendingMappings[mappingIndex];
        
        // Add to OFFICE_ALLY_PAYER_MAP (in reality, this would update the actual file)
        console.log(`✅ APPROVED: Adding ${mapping.payerId} → ${mapping.suggestedMatch.name}`);
        
        // For now, log the mapping that should be added to supabase_network_integration.js
        const newMappingCode = `
    '${mapping.payerId}': {
        name: '${mapping.suggestedMatch.name}',
        aliases: ['${mapping.suggestedMatch.name}', '${mapping.payerName}'],
        state: '${mapping.suggestedMatch.state || 'UT'}',
        type: '${mapping.suggestedMatch.type || 'Unknown'}'
    },`;
        
        console.log('Add this to OFFICE_ALLY_PAYER_MAP:', newMappingCode);
        
        // Remove from pending
        pendingMappings.splice(mappingIndex, 1);
        savePendingMappings(pendingMappings);
        
        // In a production system, you'd also update the actual mapping file here
        // For now, we'll simulate this by logging
        
        res.json({ 
            success: true, 
            message: `Approved mapping for ${mapping.payerId}`,
            mappingCode: newMappingCode.trim()
        });
        
    } catch (error) {
        console.error('Error approving mapping:', error);
        res.status(500).json({ error: 'Failed to approve mapping' });
    }
});

// Reject a pending mapping
app.post('/api/admin/reject/:mappingId', (req, res) => {
    try {
        const mappingId = req.params.mappingId;
        const pendingMappings = loadPendingMappings();
        
        const mappingIndex = pendingMappings.findIndex(m => m.id === mappingId);
        if (mappingIndex === -1) {
            return res.status(404).json({ error: 'Mapping not found' });
        }
        
        const mapping = pendingMappings[mappingIndex];
        console.log(`❌ REJECTED: ${mapping.payerId} → ${mapping.suggestedMatch?.name || 'No match'}`);
        
        // Remove from pending
        pendingMappings.splice(mappingIndex, 1);
        savePendingMappings(pendingMappings);
        
        res.json({ 
            success: true, 
            message: `Rejected mapping for ${mapping.payerId}` 
        });
        
    } catch (error) {
        console.error('Error rejecting mapping:', error);
        res.status(500).json({ error: 'Failed to reject mapping' });
    }
});

// Manually trigger discovery for a specific payer
app.post('/api/admin/discover', async (req, res) => {
    try {
        const { payerId, payerName } = req.body;
        
        if (!payerId || !payerName) {
            return res.status(400).json({ error: 'payerId and payerName are required' });
        }
        
        console.log(`🔍 Manual discovery triggered for: ${payerId} (${payerName})`);
        
        // Use the auto-discovery system
        const discoveryResult = await autoDiscovery.discoverPayer(payerId, payerName, 'UT');
        
        if (discoveryResult.requiresApproval) {
            res.json({
                success: true,
                message: 'Discovery complete - pending approval',
                confidence: discoveryResult.confidence,
                suggestedMatch: discoveryResult.suggestedMatch
            });
        } else {
            res.json({
                success: true,
                message: discoveryResult.message,
                autoMapped: discoveryResult.autoMapped
            });
        }
        
    } catch (error) {
        console.error('Error in manual discovery:', error);
        res.status(500).json({ error: 'Failed to discover payer' });
    }
});

// Get discovery logs (recent activity)
app.get('/api/admin/activity', (req, res) => {
    try {
        // In a real system, this would read from logs
        // For now, return recent pending mappings as activity
        const pendingMappings = loadPendingMappings();
        
        const activity = pendingMappings
            .slice(-10) // Last 10 discoveries
            .map(mapping => ({
                id: mapping.id,
                timestamp: mapping.discoveredAt,
                action: 'discovery',
                payerId: mapping.payerId,
                payerName: mapping.payerName,
                confidence: mapping.confidence,
                status: 'pending'
            }))
            .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
        
        res.json(activity);
    } catch (error) {
        console.error('Error getting activity:', error);
        res.status(500).json({ error: 'Failed to get activity log' });
    }
});

// Health check
app.get('/api/admin/health', (req, res) => {
    res.json({ 
        status: 'healthy',
        timestamp: new Date().toISOString(),
        services: {
            supabase: !!supabase,
            autoDiscovery: !!autoDiscovery,
            networkIntegration: !!networkIntegration
        }
    });
});

const PORT = process.env.ADMIN_PORT || 3001;
app.listen(PORT, () => {
    console.log(`🚀 Admin API server running on http://localhost:${PORT}`);
    console.log(`📊 Dashboard available at: admin_dashboard.html`);
    console.log(`🔗 API endpoints:`);
    console.log(`   GET  /api/admin/stats     - Dashboard statistics`);
    console.log(`   GET  /api/admin/pending   - Pending mappings`);
    console.log(`   GET  /api/admin/mappings  - Current mappings`);
    console.log(`   POST /api/admin/approve/:id - Approve mapping`);
    console.log(`   POST /api/admin/reject/:id  - Reject mapping`);
    console.log(`   POST /api/admin/discover    - Manual discovery`);
    console.log(`   GET  /api/admin/activity    - Recent activity`);
});

module.exports = app;