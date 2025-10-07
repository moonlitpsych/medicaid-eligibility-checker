// lib/edi-837-generator.js - EDI 837P (Professional) Claims Generator
require('dotenv').config({ path: '.env.local' });

/**
 * Generate EDI 837P claim file for Office Ally
 *
 * Format: HIPAA 5010 X12 837P (Professional)
 *
 * @param {Object} claim - Claim data
 * @returns {String} X12 EDI 837P formatted string
 */
function generate837P(claim) {
    const now = new Date();
    const controlNumber = Date.now().toString().slice(-9);
    const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '').slice(2); // YYMMDD
    const timeStr = now.toISOString().slice(11, 16).replace(':', ''); // HHMM
    const fullDateStr = now.toISOString().slice(0, 10).replace(/-/g, ''); // CCYYMMDD

    const senderID = process.env.OFFICE_ALLY_SENDER_ID || '1161680';
    const receiverID = 'OFFALLY';
    const providerNPI = process.env.PROVIDER_NPI || '1275348807';
    const providerName = process.env.PROVIDER_NAME || 'MOONLIT_PLLC';

    // Pad ISA fields to exact lengths
    const pad15 = (s) => (s || '').toString().padEnd(15, ' ');
    const ISA06 = pad15(senderID);
    const ISA08 = pad15('330897513'); // Office Ally Tax ID (per OA Companion Guide)

    // Build X12 837P segments
    const segments = [];

    // ISA - Interchange Control Header
    segments.push(`ISA*00*          *00*          *ZZ*${ISA06}*01*${ISA08}*${dateStr}*${timeStr}*^*00501*${controlNumber}*0*P*:`);

    // GS - Functional Group Header (HC = Health Care Claim)
    segments.push(`GS*HC*${senderID}*330897513*${fullDateStr}*${timeStr}*${controlNumber}*X*005010X222A1`);

    // ST - Transaction Set Header (837 = Health Care Claim)
    segments.push(`ST*837*0001*005010X222A1`);

    // BHT - Beginning of Hierarchical Transaction
    segments.push(`BHT*0019*00*${controlNumber}*${fullDateStr}*${timeStr}*CH`);

    // NM1 - Submitter Name (Loop 1000A)
    segments.push(`NM1*41*2*${providerName}*****46*${senderID}`);

    // PER - Submitter EDI Contact Information
    const billingPhone = process.env.BILLING_CONTACT_PHONE || '8015556789';
    segments.push(`PER*IC*BILLING CONTACT*TE*${billingPhone}`);

    // NM1 - Receiver Name (Loop 1000B)
    segments.push(`NM1*40*2*OFFICE ALLY*****PI*330897513`);

    // HL - Billing Provider Hierarchical Level (Loop 2000A)
    segments.push(`HL*1**20*1`);

    // PRV - Billing Provider Specialty Information
    const taxonomy = claim.billingProvider.taxonomy || '103T00000X'; // Default to Psychologist if not provided
    segments.push(`PRV*BI*PXC*${taxonomy}`);

    // NM1 - Billing Provider Name (Loop 2010AA)
    segments.push(`NM1*85*2*${providerName}*****XX*${providerNPI}`);

    // N3 - Billing Provider Address
    segments.push(`N3*${claim.billingProvider.address || '123 MAIN ST'}`);

    // N4 - Billing Provider City/State/ZIP
    segments.push(`N4*${claim.billingProvider.city || 'SALT LAKE CITY'}*${claim.billingProvider.state || 'UT'}*${claim.billingProvider.zip || '84101'}`);

    // REF - Billing Provider Tax ID
    const providerTaxId = process.env.PROVIDER_TAX_ID || claim.billingProvider.taxId || '123456789';
    segments.push(`REF*EI*${providerTaxId}`);

    // REF - Utah Medicaid Provider Number (Required for Utah Medicaid claims)
    // Qualifier 1C = Medicaid Provider Number
    if (claim.billingProvider.medicaidProviderId) {
        segments.push(`REF*1C*${claim.billingProvider.medicaidProviderId}`);
    }

    // HL - Subscriber Hierarchical Level (Loop 2000B)
    segments.push(`HL*2*1*22*0`);

    // SBR - Subscriber Information
    segments.push(`SBR*P*18*******MC`); // P=Primary, 18=Self, MC=Medicaid

    // NM1 - Subscriber Name (Loop 2010BA)
    const patient = claim.patient;
    segments.push(`NM1*IL*1*${patient.lastName.toUpperCase()}*${patient.firstName.toUpperCase()}****MI*${patient.memberId || ''}`);

    // N3 - Subscriber Address
    segments.push(`N3*${patient.address || '456 ELM ST'}`);

    // N4 - Subscriber City/State/ZIP
    segments.push(`N4*${patient.city || 'SALT LAKE CITY'}*${patient.state || 'UT'}*${patient.zip || '84101'}`);

    // DMG - Subscriber Demographic Information
    const gender = patient.gender === 'M' ? 'M' : patient.gender === 'F' ? 'F' : 'U';
    const dob = patient.dateOfBirth.replace(/-/g, ''); // CCYYMMDD
    segments.push(`DMG*D8*${dob}*${gender}`);

    // NM1 - Payer Name (Loop 2010BB)
    segments.push(`NM1*PR*2*${claim.payer.name}*****PI*${claim.payer.id}`);

    // CLM - Claim Information (Loop 2300)
    const claimId = `CLM${Date.now().toString().slice(-10)}`;
    const totalCharge = claim.serviceLines.reduce((sum, line) => sum + line.charge, 0).toFixed(2);
    segments.push(`CLM*${claimId}*${totalCharge}***11:B:1*Y*A*Y*Y`);

    // NOTE: Service dates (DTP*472) belong in Loop 2400 (Service Line), not here in Loop 2300
    // We add them at the service line level below
    const serviceDate = claim.serviceDate.replace(/-/g, ''); // Format: CCYYMMDD

    // HI - Health Care Diagnosis Code (ICD-10)
    const diagnosisCodes = claim.diagnosisCodes.map((code, idx) => {
        const pointer = idx === 0 ? 'ABK' : 'ABF';
        return `${pointer}:${code}`;
    }).join('*');
    segments.push(`HI*${diagnosisCodes}`);

    // Loop 2400 - Service Line (for each service)
    claim.serviceLines.forEach((line, idx) => {
        const lineNumber = (idx + 1).toString();

        // LX - Service Line Number
        segments.push(`LX*${lineNumber}`);

        // SV1 - Professional Service
        segments.push(`SV1*HC:${line.cptCode}*${line.charge.toFixed(2)}*UN*${line.units}***${line.diagnosisPointer || '1'}`);

        // DTP - Service Date (Line Level)
        segments.push(`DTP*472*D8*${serviceDate}`);

        // Loop 2420A - Rendering Provider (Box 24J on CMS-1500)
        if (claim.renderingProvider && claim.renderingProvider.npi) {
            const lastName = claim.renderingProvider.lastName || '';
            const firstName = claim.renderingProvider.firstName || '';
            segments.push(`NM1*82*1*${lastName}*${firstName}***XX*${claim.renderingProvider.npi}`);

            // PRV - Rendering Provider Specialty (if different from billing)
            if (claim.renderingProvider.taxonomy) {
                segments.push(`PRV*PE*PXC*${claim.renderingProvider.taxonomy}`);
            }
        }
    });

    // SE - Transaction Set Trailer
    const segmentCount = segments.length + 1; // +1 for SE itself
    segments.push(`SE*${segmentCount}*0001`);

    // GE - Functional Group Trailer
    segments.push(`GE*1*${controlNumber}`);

    // IEA - Interchange Control Trailer
    segments.push(`IEA*1*${controlNumber}`);

    // Join all segments with ~ delimiter and add final ~
    return segments.join('~') + '~';
}

/**
 * Create a test claim for Jeremy Montoya
 */
function createTestClaim() {
    return {
        patient: {
            firstName: 'Jeremy',
            lastName: 'Montoya',
            dateOfBirth: '1984-07-17',
            gender: 'M',
            memberId: '', // Utah Medicaid doesn't require member ID for eligibility
            address: '123 TEST ST',
            city: 'SALT LAKE CITY',
            state: 'UT',
            zip: '84101'
        },
        billingProvider: {
            name: 'MOONLIT_PLLC',
            npi: process.env.PROVIDER_NPI || '1275348807',
            taxId: process.env.PROVIDER_TAX_ID || '870000000',
            address: '456 PROVIDER AVE',
            city: 'SALT LAKE CITY',
            state: 'UT',
            zip: '84102'
        },
        payer: {
            name: 'MEDICAID UTAH',
            id: 'U4005' // ✅ CORRECT: Utah Medicaid 837P claims ID (NOT UTMCD - that's for eligibility!)
            // IMPORTANT: For production, fetch from database using lib/payer-id-service.js
            // const ids = await getPayerIds('Utah Medicaid Fee-for-Service');
            // id: ids.claims_837p
        },
        serviceDate: '2025-10-01', // Recent service date
        diagnosisCodes: ['F329'], // Major depressive disorder, single episode, unspecified
        serviceLines: [
            {
                cptCode: '90834', // Psychotherapy, 45 minutes
                charge: 150.00,
                units: 1,
                diagnosisPointer: '1'
            }
        ]
    };
}

module.exports = {
    generate837P,
    createTestClaim
};
