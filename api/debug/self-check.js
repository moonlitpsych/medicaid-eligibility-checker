// api/debug/self-check.js - Self-check endpoint for debugging Office Ally configuration

module.exports = async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        // Provider Configuration
        function getEligibilityProvider() {
            return process.env.ELIGIBILITY_PROVIDER || 'office_ally';
        }

        const ELIGIBILITY_PROVIDER = getEligibilityProvider();
        
        // Office Ally Configuration
        const OFFICE_ALLY_CONFIG = {
            endpoint: process.env.OFFICE_ALLY_ENDPOINT || 'https://wsd.officeally.com/TransactionService/rtx.svc',
            receiverID: 'OFFALLY',
            senderID: process.env.OFFICE_ALLY_SENDER_ID || '1161680',
            username: process.env.OFFICE_ALLY_USERNAME,
            password: process.env.OFFICE_ALLY_PASSWORD,
            providerNPI: process.env.PROVIDER_NPI || '1275348807',
            payerID: process.env.OFFICE_ALLY_PAYER_ID || 'UTMCD'
        };

        // Test X12 270 Generation
        function generateSampleX12_270() {
            const now = new Date();
            const ctrl = Date.now().toString().slice(-9);
            const yymmdd = now.toISOString().slice(2,10).replace(/-/g,'');
            const hhmm = now.toISOString().slice(11,16).replace(':','');
            const ccyymmdd = now.toISOString().slice(0,10).replace(/-/g,'');

            const pad15 = s => (s ?? '').toString().padEnd(15, ' ');
            const ISA06 = pad15('1161680');
            const ISA08 = pad15('OFFALLY');

            const seg = [];
            seg.push(`ISA*00*          *00*          *ZZ*${ISA06}*01*${ISA08}*${yymmdd}*${hhmm}*^*00501*${ctrl}*0*P*:`);
            seg.push(`GS*HS*1161680*OFFALLY*${ccyymmdd}*${hhmm}*${ctrl}*X*005010X279A1`);
            seg.push(`ST*270*0001*005010X279A1`);
            seg.push(`BHT*0022*13*MOONLIT-${ctrl}*20${yymmdd}*${hhmm}`);
            seg.push(`HL*1**20*1`);
            seg.push(`NM1*PR*2*UTAH MEDICAID*****PI*UTMCD`);
            seg.push(`HL*2*1*21*1`);
            seg.push(`NM1*1P*2*MOONLIT PLLC*****XX*1275348807`);
            seg.push(`HL*3*2*22*0`);
            seg.push(`TRN*1*${ctrl}*1275348807*ELIGIBILITY`);
            seg.push(`NM1*IL*1*TEST*PATIENT`);
            seg.push(`DMG*D8*19840717`);
            seg.push(`DTP*291*D8*${ccyymmdd}`);
            seg.push(`EQ*30`);

            const stIndex = seg.findIndex(s => s.startsWith('ST*'));
            const count = seg.length - stIndex + 1;
            seg.push(`SE*${count}*0001`);
            seg.push(`GE*1*${ctrl}`);
            seg.push(`IEA*1*${ctrl}`);

            return seg.join('~') + '~';
        }

        // Database connection check
        let dbStatus = 'not_configured';
        let pool = null;
        try {
            const db = require('../_db');
            pool = db.pool;
            if (pool) {
                dbStatus = 'configured';
            } else {
                dbStatus = 'configured_but_disabled';
            }
        } catch (error) {
            dbStatus = 'not_available';
        }

        const sampleX12 = generateSampleX12_270();
        const hasCredentials = !!(OFFICE_ALLY_CONFIG.username && OFFICE_ALLY_CONFIG.password);

        const selfCheck = {
            timestamp: new Date().toISOString(),
            provider: ELIGIBILITY_PROVIDER,
            environment: {
                NODE_ENV: process.env.NODE_ENV,
                ELIGIBILITY_PROVIDER: process.env.ELIGIBILITY_PROVIDER,
                SIMULATION_MODE: process.env.SIMULATION_MODE,
                DATABASE_URL_configured: !!(process.env.DATABASE_URL && process.env.DATABASE_URL !== 'postgresql://user:pass@host:5432/database')
            },
            office_ally: {
                endpoint: OFFICE_ALLY_CONFIG.endpoint,
                receiverID: OFFICE_ALLY_CONFIG.receiverID,
                senderID: OFFICE_ALLY_CONFIG.senderID,
                providerNPI: OFFICE_ALLY_CONFIG.providerNPI,
                payerID: OFFICE_ALLY_CONFIG.payerID,
                username_configured: !!OFFICE_ALLY_CONFIG.username,
                password_configured: !!OFFICE_ALLY_CONFIG.password,
                password_length: OFFICE_ALLY_CONFIG.password?.length || 0,
                credentials_ready: hasCredentials
            },
            x12_test: {
                sample_length: sampleX12.length,
                segment_count: (sampleX12.match(/~/g) || []).length,
                first_100_chars: sampleX12.substring(0, 100),
                contains_required_segments: {
                    ISA: sampleX12.includes('ISA*'),
                    GS: sampleX12.includes('GS*'),
                    ST: sampleX12.includes('ST*270*'),
                    BHT: sampleX12.includes('BHT*0022*13*'),
                    SE: sampleX12.includes('SE*'),
                    GE: sampleX12.includes('GE*'),
                    IEA: sampleX12.includes('IEA*')
                }
            },
            database: {
                status: dbStatus,
                pool_available: !!pool
            },
            readiness: {
                config_complete: hasCredentials && ELIGIBILITY_PROVIDER === 'office_ally',
                simulation_mode: process.env.SIMULATION_MODE === 'true',
                ready_for_live_testing: hasCredentials && process.env.SIMULATION_MODE !== 'true',
                issues: []
            }
        };

        // Identify any issues
        if (!hasCredentials) {
            selfCheck.readiness.issues.push('Missing Office Ally credentials (OFFICE_ALLY_USERNAME or OFFICE_ALLY_PASSWORD)');
        }
        if (ELIGIBILITY_PROVIDER !== 'office_ally') {
            selfCheck.readiness.issues.push('ELIGIBILITY_PROVIDER not set to office_ally');
        }
        if (process.env.SIMULATION_MODE === 'true') {
            selfCheck.readiness.issues.push('Running in SIMULATION_MODE (set to false for live testing)');
        }

        res.json(selfCheck);

    } catch (error) {
        console.error('Self-check failed:', error);
        res.status(500).json({
            error: 'Self-check failed',
            message: error.message,
            timestamp: new Date().toISOString()
        });
    }
};