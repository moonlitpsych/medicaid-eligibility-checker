// lib/x12-276-generator.js - X12 276 Claims Status Request Generator
require('dotenv').config({ path: '.env.local' });

/**
 * Generate X12 276 Claims Status Request for Office Ally
 *
 * Format: HIPAA 5010 X12 276 (Health Care Claim Status Request)
 *
 * Used to inquire about the status of previously submitted claims.
 * The response will be an X12 277 (Health Care Claim Status Response).
 *
 * @param {Object} claimInquiry - Claim inquiry data
 * @param {string} claimInquiry.payerId - Payer ID (e.g., "UTMCD" for Utah Medicaid)
 * @param {string} claimInquiry.payerName - Payer name (e.g., "UTAH MEDICAID")
 * @param {string} claimInquiry.providerNPI - Provider NPI
 * @param {string} claimInquiry.providerName - Provider name
 * @param {Object} claimInquiry.patient - Patient information
 * @param {string} claimInquiry.patient.firstName - Patient first name
 * @param {string} claimInquiry.patient.lastName - Patient last name
 * @param {string} claimInquiry.patient.dateOfBirth - Patient DOB (YYYY-MM-DD)
 * @param {string} claimInquiry.patient.memberId - Member/Medicaid ID
 * @param {string} claimInquiry.claimControlNumber - Claim control number (from 837)
 * @param {string} claimInquiry.serviceDate - Date of service (YYYY-MM-DD)
 * @param {number} claimInquiry.claimAmount - Total claim amount
 * @returns {string} X12 276 formatted string
 */
function generateX12_276(claimInquiry) {
    const now = new Date();
    const controlNumber = Date.now().toString().slice(-9);

    // Use LOCAL time for dates (not UTC) to avoid timezone issues
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');

    const yymmdd = `${String(year).slice(2)}${month}${day}`;
    const hhmm = `${hours}${minutes}`;
    const ccyymmdd = `${year}${month}${day}`;

    // Format dates from claim inquiry
    const serviceDate = (claimInquiry.serviceDate || '').replace(/-/g, '');
    const patientDOB = (claimInquiry.patient.dateOfBirth || '').replace(/-/g, '');

    // Office Ally configuration
    const senderID = process.env.OFFICE_ALLY_SENDER_ID || '1161680';
    const receiverID = 'OFFALLY';

    // Pad ISA fields to 15 characters
    const pad15 = (s) => (s || '').toString().padEnd(15, ' ');
    const ISA06 = pad15(senderID);
    const ISA08 = pad15(receiverID);

    const segments = [];

    // ISA - Interchange Control Header
    segments.push(`ISA*00*          *00*          *ZZ*${ISA06}*01*${ISA08}*${yymmdd}*${hhmm}*^*00501*${controlNumber}*0*P*:`);

    // GS - Functional Group Header (HI = Health Care Claim Status Request)
    segments.push(`GS*HI*${senderID}*${receiverID}*${ccyymmdd}*${hhmm}*${controlNumber}*X*005010X212`);

    // ST - Transaction Set Header (276 = Health Care Claim Status Request)
    segments.push(`ST*276*0001*005010X212`);

    // BHT - Beginning of Hierarchical Transaction
    // 0010 = Request for Status
    // 13 = Status
    segments.push(`BHT*0010*13*${controlNumber}*${ccyymmdd}*${hhmm}`);

    // HL - Information Source (Payer) - Level 1
    segments.push(`HL*1**20*1`);

    // NM1 - Information Source Name (Payer)
    segments.push(`NM1*PR*2*${claimInquiry.payerName}*****PI*${claimInquiry.payerId}`);

    // HL - Information Receiver (Provider) - Level 2
    segments.push(`HL*2*1*21*1`);

    // NM1 - Information Receiver Name (Provider)
    // Determine if provider is individual (Type 1) or organization (Type 2)
    const isOrganization = /\b(PLLC|LLC|PC|INC|CORP|ASSOCIATES|GROUP|CENTER|CLINIC)\b/i.test(claimInquiry.providerName);

    if (isOrganization) {
        // Type 2: Non-Person Entity (Organization)
        segments.push(`NM1*1P*2*${claimInquiry.providerName}*****XX*${claimInquiry.providerNPI}`);
    } else {
        // Type 1: Person (Individual Provider)
        // Parse name: "ANTHONY PRIVRATSKY" -> "PRIVRATSKY*ANTHONY"
        const nameParts = claimInquiry.providerName.replace(/_/g, ' ').trim().split(/\s+/);
        if (nameParts.length >= 2) {
            const firstName = nameParts[0];
            const lastName = nameParts[nameParts.length - 1];
            segments.push(`NM1*1P*1*${lastName}*${firstName}****XX*${claimInquiry.providerNPI}`);
        } else {
            segments.push(`NM1*1P*1*${claimInquiry.providerName}*****XX*${claimInquiry.providerNPI}`);
        }
    }

    // HL - Subscriber (Patient) - Level 3
    segments.push(`HL*3*2*22*1`);

    // TRN - Trace Number (unique identifier for this inquiry)
    segments.push(`TRN*1*${controlNumber}*${claimInquiry.providerNPI}`);

    // NM1 - Subscriber Name (Patient)
    segments.push(`NM1*IL*1*${claimInquiry.patient.lastName.toUpperCase()}*${claimInquiry.patient.firstName.toUpperCase()}****MI*${claimInquiry.patient.memberId}`);

    // DMG - Subscriber Demographic Information
    if (patientDOB) {
        segments.push(`DMG*D8*${patientDOB}`);
    }

    // HL - Dependent (if different from subscriber) - Level 4
    // For now, assume patient is subscriber, skip dependent level

    // TRN - Patient Trace Number
    segments.push(`TRN*1*${claimInquiry.claimControlNumber}*${claimInquiry.providerNPI}`);

    // REF - Service Provider Identification
    segments.push(`REF*D9*${claimInquiry.claimControlNumber}`);

    // DTP - Service Date
    if (serviceDate) {
        segments.push(`DTP*472*D8*${serviceDate}`);
    }

    // AMT - Claim Amount
    if (claimInquiry.claimAmount) {
        const formattedAmount = Number(claimInquiry.claimAmount).toFixed(2);
        segments.push(`AMT*T3*${formattedAmount}`);
    }

    // SE - Transaction Set Trailer
    const stIndex = segments.findIndex(s => s.startsWith('ST*'));
    const segmentCount = segments.length - stIndex + 1;
    segments.push(`SE*${segmentCount}*0001`);

    // GE - Functional Group Trailer
    segments.push(`GE*1*${controlNumber}`);

    // IEA - Interchange Control Trailer
    segments.push(`IEA*1*${controlNumber}`);

    return segments.join('~') + '~';
}

/**
 * Generate X12 276 for multiple claims in batch
 *
 * @param {Array<Object>} claimInquiries - Array of claim inquiry objects
 * @returns {string} X12 276 formatted string with multiple claims
 */
function generateBatchX12_276(claimInquiries) {
    if (!Array.isArray(claimInquiries) || claimInquiries.length === 0) {
        throw new Error('claimInquiries must be a non-empty array');
    }

    // For simplicity, generate separate 276 for each claim
    // In production, you might want to batch multiple claims in a single interchange
    return claimInquiries.map(inquiry => generateX12_276(inquiry)).join('');
}

/**
 * Validate claim inquiry data before generating X12 276
 *
 * @param {Object} claimInquiry - Claim inquiry data
 * @returns {Object} { valid: boolean, errors: string[] }
 */
function validateClaimInquiry(claimInquiry) {
    const errors = [];

    // Required fields
    if (!claimInquiry.payerId) errors.push('payerId is required');
    if (!claimInquiry.payerName) errors.push('payerName is required');
    if (!claimInquiry.providerNPI) errors.push('providerNPI is required');
    if (!claimInquiry.providerName) errors.push('providerName is required');
    if (!claimInquiry.claimControlNumber) errors.push('claimControlNumber is required');

    // Patient information
    if (!claimInquiry.patient) {
        errors.push('patient object is required');
    } else {
        if (!claimInquiry.patient.firstName) errors.push('patient.firstName is required');
        if (!claimInquiry.patient.lastName) errors.push('patient.lastName is required');
        if (!claimInquiry.patient.dateOfBirth) errors.push('patient.dateOfBirth is required');
        if (!claimInquiry.patient.memberId) errors.push('patient.memberId is required');
    }

    // Optional but recommended
    if (!claimInquiry.serviceDate) {
        errors.push('serviceDate is recommended (optional)');
    }
    if (!claimInquiry.claimAmount) {
        errors.push('claimAmount is recommended (optional)');
    }

    return {
        valid: errors.filter(e => !e.includes('recommended')).length === 0,
        errors
    };
}

module.exports = {
    generateX12_276,
    generateBatchX12_276,
    validateClaimInquiry
};
