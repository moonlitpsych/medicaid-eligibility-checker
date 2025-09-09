// routes/utah-medicaid-working.js - WORKING Utah Medicaid eligibility (DO NOT MODIFY)
// Based on successful test-office-ally-final.js format

const OFFICE_ALLY_CONFIG = {
    endpoint: 'https://wsd.officeally.com/TransactionService/rtx.svc',
    username: process.env.OFFICE_ALLY_USERNAME || 'moonlit',
    password: process.env.OFFICE_ALLY_PASSWORD || '***REDACTED-OLD-OA-PASSWORD***',
    senderID: '1161680',
    receiverID: 'OFFALLY',
    providerNPI: '1275348807',
    providerName: 'MOONLIT PLLC'
};

// WORKING X12 270 format (Name/DOB only, no SSN/ID)
function generateWorkingX12_270(patient) {
    const now = new Date();
    const ctrl = Date.now().toString().slice(-9);
    const yymmdd = now.toISOString().slice(2,10).replace(/-/g,'');
    const hhmm = now.toISOString().slice(11,16).replace(':','');
    const ccyymmdd = now.toISOString().slice(0,10).replace(/-/g,'');
    const dob = (patient.dob || '').replace(/-/g,'');

    const pad15 = s => (s ?? '').toString().padEnd(15, ' ');
    const ISA06 = pad15('1161680');
    const ISA08 = pad15('OFFALLY');

    const seg = [];

    seg.push(`ISA*00*          *00*          *ZZ*${ISA06}*01*${ISA08}*${yymmdd}*${hhmm}*^*00501*${ctrl}*0*P*:`);
    seg.push(`GS*HS*1161680*OFFALLY*${ccyymmdd}*${hhmm}*${ctrl}*X*005010X279A1`);
    seg.push(`ST*270*0001*005010X279A1`);
    seg.push(`BHT*0022*13*MOONLIT-${ctrl}*${ccyymmdd}*${hhmm}`);

    // 2100A: Payer
    seg.push(`HL*1**20*1`);
    seg.push(`NM1*PR*2*UTAH MEDICAID*****PI*UTMCD`);

    // 2100B: Information Receiver (organization)
    seg.push(`HL*2*1*21*1`);
    seg.push(`NM1*1P*2*MOONLIT PLLC*****XX*1275348807`);

    // 2100C: Subscriber (Name/DOB only - WORKING FORMAT!)
    seg.push(`HL*3*2*22*0`);
    seg.push(`TRN*1*${ctrl}*1275348807*ELIGIBILITY`);
    seg.push(`NM1*IL*1*${patient.last?.toUpperCase()||''}*${patient.first?.toUpperCase()||''}`);
    seg.push(`DMG*D8*${dob}*${(patient.gender||'U').toUpperCase()}`);
    seg.push(`DTP*291*D8*${ccyymmdd}`);
    seg.push(`EQ*30`);

    const stIndex = seg.findIndex(s => s.startsWith('ST*'));
    const count = seg.length - stIndex + 1;
    seg.push(`SE*${count}*0001`);
    seg.push(`GE*1*${ctrl}`);
    seg.push(`IEA*1*${ctrl}`);

    return seg.join('~') + '~';
}

// Generate SOAP request
function generateSOAPRequest(x12Payload) {
    const timestamp = new Date().toISOString().replace(/\.\d{3}Z$/, 'Z');
    const payloadID = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        const r = Math.random() * 16 | 0;
        const v = c == 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
    
    return `<soapenv:Envelope xmlns:soapenv="http://www.w3.org/2003/05/soap-envelope">
<soapenv:Header>
<wsse:Security xmlns:wsse="http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-wssecurity-secext-1.0.xsd">
<wsse:UsernameToken>
<wsse:Username>${OFFICE_ALLY_CONFIG.username}</wsse:Username>
<wsse:Password>${OFFICE_ALLY_CONFIG.password}</wsse:Password>
</wsse:UsernameToken>
</wsse:Security>
</soapenv:Header>
<soapenv:Body>
<ns1:COREEnvelopeRealTimeRequest xmlns:ns1="http://www.caqh.org/SOAP/WSDL/CORERule2.2.0.xsd">
<PayloadType>X12_270_Request_005010X279A1</PayloadType>
<ProcessingMode>RealTime</ProcessingMode>
<PayloadID>${payloadID}</PayloadID>
<TimeStamp>${timestamp}</TimeStamp>
<SenderID>${OFFICE_ALLY_CONFIG.senderID}</SenderID>
<ReceiverID>${OFFICE_ALLY_CONFIG.receiverID}</ReceiverID>
<CORERuleVersion>2.2.0</CORERuleVersion>
<Payload>
<![CDATA[${x12Payload}]]>
</Payload>
</ns1:COREEnvelopeRealTimeRequest>
</soapenv:Body>
</soapenv:Envelope>`;
}

// Parse X12 271 response (enhanced from working test)
function parseX12_271Working(x12Data) {
    try {
        const result = {
            enrolled: false,
            program: '',
            effectiveDate: '',
            details: '',
            verified: true,
            error: '',
            payerInfo: {
                payerId: 'UTMCD',
                payerName: 'Utah Medicaid',
                payerType: 'MEDICAID'
            },
            copayInfo: null
        };

        // Check for EB segments (eligibility benefits)
        const ebSegments = x12Data.match(/EB\*([^~]*)/g) || [];
        
        if (ebSegments.length > 0) {
            // Found eligibility data
            result.enrolled = true;
            result.program = 'Utah Medicaid';
            result.details = 'Active Utah Medicaid coverage verified';
            
            // Look for specific program types
            if (x12Data.includes('TARGETED ADULT MEDICAID')) {
                result.program = 'Utah Medicaid - Targeted Adult';
            } else if (x12Data.includes('MENTAL HEALTH')) {
                result.program = 'Utah Medicaid - Mental Health';
            }
            
        } else {
            // Check for AAA rejection messages
            const aaaSegments = x12Data.match(/AAA\*([^~]*)/g) || [];
            if (aaaSegments.length > 0) {
                result.enrolled = false;
                result.error = 'No active Utah Medicaid coverage found';
            } else {
                result.enrolled = false;
                result.error = 'Unable to determine eligibility status';
            }
        }

        return result;
    } catch (error) {
        console.error('X12 271 parsing error:', error);
        return {
            enrolled: false,
            error: 'Unable to parse eligibility response',
            verified: true,
            payerInfo: {
                payerId: 'UTMCD',
                payerName: 'Utah Medicaid',
                payerType: 'MEDICAID'
            }
        };
    }
}

// Main Utah Medicaid eligibility check
async function checkUtahMedicaidEligibility(req, res) {
    const startTime = Date.now();
    console.log(`🔍 UTAH MEDICAID: Checking eligibility for ${req.body.first} ${req.body.last}`);
    
    try {
        const { first, last, dob, gender } = req.body;

        // Validate required fields
        if (!first || !last || !dob) {
            return res.status(400).json({
                error: 'Missing required fields: first, last, dob',
                enrolled: false,
                verified: false
            });
        }

        // Generate working X12 270 request
        const x12_270 = generateWorkingX12_270({
            first: first.trim(),
            last: last.trim(),
            dob,
            gender: gender || 'U'
        });

        // Generate SOAP request
        const soapRequest = generateSOAPRequest(x12_270);
        
        console.log('🚀 Sending Utah Medicaid eligibility check to Office Ally...');
        
        // Send request to Office Ally
        const fetch = (await import('node-fetch')).default;
        const response = await fetch(OFFICE_ALLY_CONFIG.endpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/soap+xml; charset=utf-8;action=RealTimeTransaction;',
                'Action': 'RealTimeTransaction'
            },
            body: soapRequest
        });

        if (!response.ok) {
            throw new Error(`Office Ally API error: ${response.status} ${response.statusText}`);
        }

        const soapResponse = await response.text();
        
        // Parse X12 271 from SOAP response
        const payloadMatch = soapResponse.match(/<Payload[^>]*>\s*<!\[CDATA\[(.*?)\]\]>\s*<\/Payload>/s) ||
                             soapResponse.match(/<Payload[^>]*>(.*?)<\/Payload>/s);
        
        if (!payloadMatch) {
            console.log('🔍 SOAP Response (first 500 chars):', soapResponse.substring(0, 500));
            throw new Error('No payload found in Office Ally SOAP response');
        }
        
        const x12_271 = payloadMatch[1].trim();
        const eligibilityResult = parseX12_271Working(x12_271);

        // Log the processing time
        const processingTime = Date.now() - startTime;
        console.log(`✅ Utah Medicaid eligibility check complete: ${eligibilityResult.enrolled ? 'ENROLLED' : 'NOT ENROLLED'} (${processingTime}ms)`);

        // Save X12 271 response for analysis
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const patientName = `${first.replace(/\s+/g, '_')}_${last.replace(/\s+/g, '_')}`;
        const filename = `raw_x12_271_${patientName}_UTAH_${timestamp}.txt`;
        
        // Write X12 271 to file for analysis (in background)
        const fs = require('fs').promises;
        fs.writeFile(filename, x12_271).catch(err => 
            console.log('Note: Could not save X12 271 file:', err.message)
        );

        res.json(eligibilityResult);

    } catch (error) {
        console.error('❌ Utah Medicaid eligibility check failed:', error);
        
        res.status(500).json({
            enrolled: false,
            error: 'Unable to verify Utah Medicaid eligibility at this time',
            verified: false,
            payerInfo: {
                payerId: 'UTMCD',
                payerName: 'Utah Medicaid',
                payerType: 'MEDICAID'
            }
        });
    }
}

module.exports = checkUtahMedicaidEligibility;