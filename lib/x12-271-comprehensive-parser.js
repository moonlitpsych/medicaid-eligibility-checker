/**
 * Comprehensive X12 271 Response Parser
 * Extracts ALL available data from X12 271 eligibility responses
 *
 * This parser extracts:
 * - Patient demographics (name, DOB, gender, address, phone)
 * - Payer information (name, ID, contact info)
 * - Reference numbers (case, account, group, policy)
 * - Coverage dates (begin, end, termination, last seen)
 * - Insurance relationships
 * - Managed care organizations
 * - Primary care provider assignments
 * - Messages and instructions
 * - Coordination of benefits
 */

/**
 * Parse X12 271 response and extract ALL available data
 * @param {string} x12_271 - Raw X12 271 response string
 * @param {Object} patientData - Original patient data sent in request
 * @returns {Object} Comprehensive extracted data
 */
function parseX12_271Comprehensive(x12_271, patientData = {}) {
    const extractedData = {
        // Basic patient info
        phone: null,
        medicaidId: null,
        gender: null,
        address: null,

        // Member validation
        memberIdValidation: {
            sent: patientData.memberNumber || patientData.medicaidId || null,
            returned: null,
            matches: null,
            warnings: []
        },

        // Coverage period
        coveragePeriod: {
            startDate: null,
            endDate: null,
            isActive: null,
            isExpired: null,
            expirationDate: null
        },

        // NEW: Patient Demographics
        patientName: {
            firstName: null,
            lastName: null,
            middleName: null,
            fullName: null
        },
        dateOfBirth: null,

        // NEW: Payer Information
        payerInfo: {
            name: null,
            payerId: null,
            contactPhone: null,
            alternatePhone: null
        },

        // NEW: Reference Numbers
        references: {
            caseNumber: null,          // REF*3H
            patientAccountNumber: null, // REF*18
            groupNumber: null,          // REF*1L
            alternateId: null,          // REF*Q4
            policyNumber: null,         // REF*6P
            ssn: null                   // REF*SY
        },

        // NEW: Coverage Dates (detailed)
        coverageDates: {
            eligibilityBeginDate: null,  // DTP*346
            effectiveDate: null,          // DTP*356
            terminationDate: null,        // DTP*290
            lastSeenDate: null,           // DTP*295
            inquiryDate: null             // DTP*472
        },

        // NEW: Insured Relationship
        insuredInfo: {
            isSubscriber: null,
            relationshipCode: null,
            relationshipDescription: null
        },

        // NEW: Managed Care Organization
        managedCareOrg: null, // Will be object or null

        // NEW: Primary Care Provider
        primaryCareProvider: null, // Will be object or null

        // NEW: Plan Messages
        messages: [],

        // NEW: Coordination of Benefits
        otherInsurance: {
            hasOtherInsurance: false,
            otherPayers: []
        }
    };

    try {
        // === PATIENT NAME (NM1*IL segment) ===
        // Format: NM1*IL*1*LASTNAME*FIRSTNAME*MIDDLENAME*PREFIX*SUFFIX*MI*MEMBERID
        const patientNameMatch = x12_271.match(/NM1\*IL\*1\*([^*~]+)\*([^*~]*)\*([^*~]*)\*[^*~]*\*[^*~]*\*[^*~]*\*([^~]*)/i);
        if (patientNameMatch) {
            extractedData.patientName.lastName = patientNameMatch[1] || null;
            extractedData.patientName.firstName = patientNameMatch[2] || null;
            extractedData.patientName.middleName = patientNameMatch[3] || null;

            // Build full name
            const nameParts = [
                extractedData.patientName.firstName,
                extractedData.patientName.middleName,
                extractedData.patientName.lastName
            ].filter(Boolean);
            extractedData.patientName.fullName = nameParts.join(' ');

            // Also extract member ID if present
            if (patientNameMatch[4]) {
                extractedData.medicaidId = patientNameMatch[4];
                extractedData.memberIdValidation.returned = patientNameMatch[4];
            }
        }

        // === DATE OF BIRTH (DMG segment) ===
        // Format: DMG*D8*YYYYMMDD*GENDER
        const dmgMatch = x12_271.match(/DMG\*D8\*([0-9]{8})\*([MFU])/i);
        if (dmgMatch) {
            const dobStr = dmgMatch[1];
            extractedData.dateOfBirth = `${dobStr.substring(0,4)}-${dobStr.substring(4,6)}-${dobStr.substring(6,8)}`;
            extractedData.gender = dmgMatch[2].toUpperCase();
        }

        // === PAYER INFORMATION (NM1*PR segment) ===
        // Format: NM1*PR*2*PAYERNAME*****PI*PAYERID
        const payerMatch = x12_271.match(/NM1\*PR\*2\*([^*~]+)\*[^*~]*\*[^*~]*\*[^*~]*\*[^*~]*\*[^*~]*\*([^~]*)/i);
        if (payerMatch) {
            extractedData.payerInfo.name = payerMatch[1];
            extractedData.payerInfo.payerId = payerMatch[2];
        }

        // === PAYER CONTACT INFO (PER segment) ===
        // Format: PER*IC*NAME*TE*PHONE*EX*EXTENSION*EM*EMAIL
        const perMatches = x12_271.match(/PER\*IC\*([^*~]*)\*TE\*([0-9]{10})[^~]*/gi);
        if (perMatches && perMatches.length > 0) {
            const phoneMatch = perMatches[0].match(/TE\*([0-9]{10})/);
            if (phoneMatch) {
                extractedData.payerInfo.contactPhone = phoneMatch[1];
            }
            // Check for alternate phone
            if (perMatches.length > 1) {
                const altPhoneMatch = perMatches[1].match(/TE\*([0-9]{10})/);
                if (altPhoneMatch) {
                    extractedData.payerInfo.alternatePhone = altPhoneMatch[1];
                }
            }
        }

        // Also extract phone for patient (backward compatibility)
        const perPhoneMatch = x12_271.match(/PER\*[^~]*\*[^~]*\*TE\*([0-9]{10})/i);
        if (perPhoneMatch) {
            extractedData.phone = perPhoneMatch[1];
        }

        // === REFERENCE NUMBERS ===

        // REF*3H - Case Number
        const caseNumberMatch = x12_271.match(/REF\*3H\*([^~]+)/i);
        if (caseNumberMatch) {
            extractedData.references.caseNumber = caseNumberMatch[1];
        }

        // REF*18 - Patient Account Number
        const accountNumberMatch = x12_271.match(/REF\*18\*([^~]+)/i);
        if (accountNumberMatch) {
            extractedData.references.patientAccountNumber = accountNumberMatch[1];
        }

        // REF*1L - Group Number
        const groupNumberMatch = x12_271.match(/REF\*1L\*([^~]+)/i);
        if (groupNumberMatch) {
            extractedData.references.groupNumber = groupNumberMatch[1];
        }

        // REF*Q4 - Alternate ID
        const alternateIdMatch = x12_271.match(/REF\*Q4\*([^~]+)/i);
        if (alternateIdMatch) {
            extractedData.references.alternateId = alternateIdMatch[1];
        }

        // REF*6P - Policy/Group Number
        const policyNumberMatch = x12_271.match(/REF\*6P\*([^*~]+)/i);
        if (policyNumberMatch) {
            extractedData.references.policyNumber = policyNumberMatch[1];
        }

        // REF*SY - SSN (last 4 digits usually)
        const ssnMatch = x12_271.match(/REF\*SY\*([^~]+)/i);
        if (ssnMatch) {
            extractedData.references.ssn = ssnMatch[1];
        }

        // === COVERAGE DATES ===

        // DTP*291 - Plan Begin/End Date (most important)
        const planDateMatch = x12_271.match(/DTP\*291\*RD8\*([0-9]{8})-([0-9]{8})/i);
        if (planDateMatch) {
            const startDateStr = planDateMatch[1];
            const endDateStr = planDateMatch[2];

            extractedData.coveragePeriod.startDate = formatDate(startDateStr);
            extractedData.coveragePeriod.endDate = formatDate(endDateStr);
            extractedData.coveragePeriod.expirationDate = extractedData.coveragePeriod.endDate;

            console.log(`📅 Coverage dates parsed: ${extractedData.coveragePeriod.startDate} to ${extractedData.coveragePeriod.endDate}`);

            // Check if coverage has expired
            // Coverage that ends today is still valid for today
            // Parse dates as YYYY-MM-DD strings for proper comparison
            const coverageEndDate = extractedData.coveragePeriod.endDate; // Format: "YYYY-MM-DD"
            const todayStr = new Date().toISOString().split('T')[0]; // Format: "YYYY-MM-DD"

            console.log(`📅 Comparing dates: End date = ${coverageEndDate}, Today = ${todayStr}`);

            // Simple string comparison works for YYYY-MM-DD format
            // Coverage is expired if end date is before today (not including today)
            extractedData.coveragePeriod.isExpired = coverageEndDate < todayStr;
            extractedData.coveragePeriod.isActive = !extractedData.coveragePeriod.isExpired;

            console.log(`📅 Is expired? ${extractedData.coveragePeriod.isExpired}`);

            if (extractedData.coveragePeriod.isExpired) {
                const endDate = new Date(coverageEndDate);
                const today = new Date(todayStr);
                const daysExpired = Math.floor((today - endDate) / (1000 * 60 * 60 * 24));
                const monthsExpired = Math.floor(daysExpired / 30);
                const yearsExpired = Math.floor(daysExpired / 365);

                let expiredDuration = '';
                if (yearsExpired > 0) {
                    expiredDuration = `${yearsExpired} year${yearsExpired > 1 ? 's' : ''} and ${monthsExpired % 12} month${monthsExpired % 12 !== 1 ? 's' : ''}`;
                } else if (monthsExpired > 0) {
                    expiredDuration = `${monthsExpired} month${monthsExpired > 1 ? 's' : ''}`;
                } else {
                    expiredDuration = `${daysExpired} day${daysExpired !== 1 ? 's' : ''}`;
                }

                extractedData.memberIdValidation.warnings.push({
                    severity: 'CRITICAL',
                    type: 'COVERAGE_EXPIRED',
                    message: `Coverage has EXPIRED! Last active date was ${extractedData.coveragePeriod.endDate}`,
                    details: `This coverage ended ${expiredDuration} ago. The payer returned historical eligibility data, not current active coverage.`,
                    coveragePeriod: `${extractedData.coveragePeriod.startDate} to ${extractedData.coveragePeriod.endDate}`
                });
            }
        }

        // DTP*346 - Eligibility Begin Date
        const eligBeginMatch = x12_271.match(/DTP\*346\*D8\*([0-9]{8})/i);
        if (eligBeginMatch) {
            extractedData.coverageDates.eligibilityBeginDate = formatDate(eligBeginMatch[1]);
        }

        // DTP*356 - Effective Date
        const effectiveDateMatch = x12_271.match(/DTP\*356\*D8\*([0-9]{8})/i);
        if (effectiveDateMatch) {
            extractedData.coverageDates.effectiveDate = formatDate(effectiveDateMatch[1]);
            // Use as fallback for coverage start if not already set
            if (!extractedData.coveragePeriod.startDate) {
                extractedData.coveragePeriod.startDate = extractedData.coverageDates.effectiveDate;
            }
        }

        // DTP*290 - Plan Termination Date
        const termDateMatch = x12_271.match(/DTP\*290\*D8\*([0-9]{8})/i);
        if (termDateMatch) {
            extractedData.coverageDates.terminationDate = formatDate(termDateMatch[1]);
        }

        // DTP*295 - Date Last Seen
        const lastSeenMatch = x12_271.match(/DTP\*295\*D8\*([0-9]{8})/i);
        if (lastSeenMatch) {
            extractedData.coverageDates.lastSeenDate = formatDate(lastSeenMatch[1]);
        }

        // DTP*472 - Service/Inquiry Date
        const inquiryDateMatch = x12_271.match(/DTP\*472\*D8\*([0-9]{8})/i);
        if (inquiryDateMatch) {
            extractedData.coverageDates.inquiryDate = formatDate(inquiryDateMatch[1]);
        }

        // === ADDRESS (N3/N4 segments) ===
        const addressMatch = x12_271.match(/N3\*([^~]+)~N4\*([^*~]+)\*([^*~]+)\*([^*~]+)/i);
        if (addressMatch) {
            extractedData.address = {
                street: addressMatch[1],
                city: addressMatch[2],
                state: addressMatch[3],
                zip: addressMatch[4]
            };
        }

        // === INSURED RELATIONSHIP (INS segment) ===
        const insMatch = x12_271.match(/INS\*([YN])\*([0-9]{2})/i);
        if (insMatch) {
            extractedData.insuredInfo.isSubscriber = insMatch[1] === 'Y';
            extractedData.insuredInfo.relationshipCode = insMatch[2];
            extractedData.insuredInfo.relationshipDescription = getRelationshipDescription(insMatch[2]);
        }

        // === MANAGED CARE ORGANIZATION (Loop 2120) ===
        // Look for MCO information in Loop 2120
        const mcoLoopMatch = x12_271.match(/LS\*2120[^~]*~(.*?)LE\*2120/i);
        if (mcoLoopMatch) {
            const mcoContent = mcoLoopMatch[1];

            // Extract MCO name from NM1*PR segment within loop
            const mcoNameMatch = mcoContent.match(/NM1\*PR\*2\*([^*~]+)/i);
            if (mcoNameMatch) {
                extractedData.managedCareOrg = {
                    name: mcoNameMatch[1],
                    payerId: null,
                    address: null,
                    phone: null,
                    type: null
                };

                // Extract MCO payer ID
                const mcoIdMatch = mcoContent.match(/NM1\*PR\*2\*[^*~]+\*[^*~]*\*[^*~]*\*[^*~]*\*[^*~]*\*PI\*([^~]+)/i);
                if (mcoIdMatch) {
                    extractedData.managedCareOrg.payerId = mcoIdMatch[1];
                }

                // Extract MCO address
                const mcoAddressMatch = mcoContent.match(/N3\*([^~]+)~N4\*([^*~]+)\*([^*~]+)\*([^*~]+)/i);
                if (mcoAddressMatch) {
                    extractedData.managedCareOrg.address = `${mcoAddressMatch[1]}, ${mcoAddressMatch[2]}, ${mcoAddressMatch[3]} ${mcoAddressMatch[4]}`;
                }

                // Extract MCO phone
                const mcoPhoneMatch = mcoContent.match(/PER\*[^*~]*\*[^*~]*\*TE\*([0-9]{10})/i);
                if (mcoPhoneMatch) {
                    extractedData.managedCareOrg.phone = mcoPhoneMatch[1];
                }

                // Determine MCO type based on name
                const mcoName = extractedData.managedCareOrg.name.toLowerCase();
                if (mcoName.includes('behavioral') || mcoName.includes('mental') || mcoName.includes('bhn')) {
                    extractedData.managedCareOrg.type = 'Behavioral Health';
                } else if (mcoName.includes('dental')) {
                    extractedData.managedCareOrg.type = 'Dental';
                } else if (mcoName.includes('vision')) {
                    extractedData.managedCareOrg.type = 'Vision';
                } else if (mcoName.includes('transport') || mcoName.includes('modivcare')) {
                    extractedData.managedCareOrg.type = 'Transportation';
                } else {
                    extractedData.managedCareOrg.type = 'Medical';
                }
            }
        }

        // === PRIMARY CARE PROVIDER (NM1*P3 segment) ===
        const pcpMatch = x12_271.match(/NM1\*P3\*1\*([^*~]+)\*([^*~]+)\*([^*~]*)\*[^*~]*\*[^*~]*\*XX\*([^~]+)/i);
        if (pcpMatch) {
            extractedData.primaryCareProvider = {
                lastName: pcpMatch[1],
                firstName: pcpMatch[2],
                middleName: pcpMatch[3] || null,
                npi: pcpMatch[4],
                name: `${pcpMatch[2]} ${pcpMatch[3] ? pcpMatch[3] + ' ' : ''}${pcpMatch[1]}`.trim(),
                address: null,
                phone: null
            };

            // Look for PCP address and phone following the NM1*P3 segment
            const pcpDetailsMatch = x12_271.match(/NM1\*P3[^~]+~(?:N3\*([^~]+)~)?(?:N4\*([^*~]+)\*([^*~]+)\*([^*~]+)[^~]*~)?(?:PER\*[^*~]*\*[^*~]*\*TE\*([0-9]{10}))?/i);
            if (pcpDetailsMatch) {
                if (pcpDetailsMatch[1]) {
                    extractedData.primaryCareProvider.address = pcpDetailsMatch[1];
                    if (pcpDetailsMatch[2]) {
                        extractedData.primaryCareProvider.address += `, ${pcpDetailsMatch[2]}, ${pcpDetailsMatch[3]} ${pcpDetailsMatch[4]}`;
                    }
                }
                if (pcpDetailsMatch[5]) {
                    extractedData.primaryCareProvider.phone = pcpDetailsMatch[5];
                }
            }
        }

        // === MESSAGES (MSG segments) ===
        const msgMatches = x12_271.match(/MSG\*([^~]+)/gi);
        if (msgMatches) {
            extractedData.messages = msgMatches.map(msg => {
                const match = msg.match(/MSG\*(.+)/i);
                return match ? match[1] : '';
            }).filter(Boolean);
        }

        // === COORDINATION OF BENEFITS ===
        // Check for EB*R segment indicating other insurance
        const cobMatch = x12_271.match(/EB\*R/i);
        if (cobMatch) {
            extractedData.otherInsurance.hasOtherInsurance = true;

            // Look for additional payer information in Loop 2120
            const otherPayerMatch = x12_271.match(/LS\*2120.*?NM1\*PR\*2\*([^*~]+).*?LE\*2120/gi);
            if (otherPayerMatch) {
                otherPayerMatch.forEach(match => {
                    const payerNameMatch = match.match(/NM1\*PR\*2\*([^*~]+)/i);
                    if (payerNameMatch) {
                        extractedData.otherInsurance.otherPayers.push({
                            name: payerNameMatch[1],
                            isPrimary: false // Would need more logic to determine primary/secondary
                        });
                    }
                });
            }
        }

        // === MEMBER ID VALIDATION ===
        if (extractedData.memberIdValidation.sent && extractedData.memberIdValidation.returned) {
            const sent = extractedData.memberIdValidation.sent.trim().toUpperCase();
            const returned = extractedData.memberIdValidation.returned.trim().toUpperCase();

            extractedData.memberIdValidation.matches = (sent === returned);

            if (!extractedData.memberIdValidation.matches) {
                extractedData.memberIdValidation.warnings.push({
                    severity: 'CRITICAL',
                    type: 'MEMBER_ID_MISMATCH',
                    message: `Member ID mismatch! You sent ${sent}, but payer returned ${returned}`,
                    details: `This may indicate: (1) Patient has coverage under a different member ID, (2) Wrong payer selected, or (3) Payer cross-referenced with another database`
                });
            }
        } else if (extractedData.memberIdValidation.sent && !extractedData.memberIdValidation.returned) {
            extractedData.memberIdValidation.warnings.push({
                severity: 'WARNING',
                type: 'NO_MEMBER_ID_RETURNED',
                message: `Payer did not return a member ID in the response`,
                details: `You sent member ID ${extractedData.memberIdValidation.sent}, but the payer's response doesn't include a member ID.`
            });
        }

        console.log('📋 Comprehensive X12 271 parsing complete');
        return extractedData;

    } catch (error) {
        console.error('❌ X12 271 comprehensive parsing failed:', error);
        // Return basic structure with error info
        extractedData.parsingError = error.message;
        return extractedData;
    }
}

/**
 * Format date from YYYYMMDD to YYYY-MM-DD
 */
function formatDate(dateStr) {
    if (!dateStr || dateStr.length !== 8) return null;
    return `${dateStr.substring(0,4)}-${dateStr.substring(4,6)}-${dateStr.substring(6,8)}`;
}

/**
 * Get relationship description from code
 */
function getRelationshipDescription(code) {
    const relationships = {
        '01': 'Spouse',
        '18': 'Self',
        '19': 'Child',
        '20': 'Employee',
        '21': 'Unknown',
        '39': 'Organ Donor',
        '40': 'Cadaver Donor',
        '53': 'Life Partner',
        'G8': 'Other Relationship'
    };
    return relationships[code] || 'Unknown';
}

module.exports = {
    parseX12_271Comprehensive,
    formatDate,
    getRelationshipDescription
};