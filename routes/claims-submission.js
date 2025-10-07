// routes/claims-submission.js - API routes for claims submission

require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const { generate837P } = require('../lib/edi-837-generator');
const { getBillingProvider, getRenderingProvider } = require('../lib/provider-service');
const Client = require('ssh2-sftp-client');
const fs = require('fs');
const path = require('path');

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
);

/**
 * POST /api/claims/submit-837p
 * Submit a professional claim (837P) to Office Ally via SFTP
 */
async function handleSubmitClaim(req, res) {
    try {
        const {
            testMode,
            patient,
            payer,
            diagnosisCodes,
            serviceLines,
            renderingProviderNPI,
            relationshipToInsured,
            groupNumber,
            insurancePlanName
        } = req.body;

        console.log('\n🏥 Claims Submission Request:');
        console.log(`   Test Mode: ${testMode ? 'YES (OATEST)' : 'NO (PRODUCTION)'}`);
        console.log(`   Patient: ${patient.firstName} ${patient.lastName}`);
        console.log(`   Payer ID (from request): ${payer.id}`);
        console.log(`   Service Lines: ${serviceLines.length}`);

        // 1. Fetch payer information from database
        const { data: payerData, error: payerError } = await supabase
            .from('payers')
            .select('id, name, oa_professional_837p_id')
            .eq('id', payer.id)
            .single();

        if (payerError || !payerData) {
            console.error('❌ Payer not found:', payer.id);
            return res.status(400).json({
                success: false,
                error: `Payer not found: ${payer.id}`
            });
        }

        const payer837pId = payerData.oa_professional_837p_id;
        console.log(`   ✅ Payer 837P ID from database: ${payer837pId}`);

        if (!payer837pId) {
            return res.status(400).json({
                success: false,
                error: `Payer "${payerData.name}" does not have an Office Ally 837P ID configured`
            });
        }

        // 2. Fetch billing provider from database
        console.log('   📋 Fetching billing provider (Moonlit PLLC) from database...');
        const billingProvider = await getBillingProvider();
        console.log(`   ✅ Billing Provider: ${billingProvider.name}`);
        console.log(`      NPI: ${billingProvider.npi}, Tax ID: ${billingProvider.taxId}`);

        // 3. Fetch rendering provider from database
        let renderingProvider = null;
        if (renderingProviderNPI) {
            console.log(`   📋 Fetching rendering provider (NPI: ${renderingProviderNPI})...`);
            renderingProvider = await getRenderingProvider(renderingProviderNPI);
            if (renderingProvider) {
                console.log(`   ✅ Rendering Provider: ${renderingProvider.firstName} ${renderingProvider.lastName}`);
            } else {
                console.log(`   ⚠️  Rendering provider not found, using billing provider`);
            }
        }

        // 4. Calculate service date range
        const serviceDates = serviceLines.map(line => new Date(line.serviceDate));
        const serviceFrom = new Date(Math.min(...serviceDates));
        const serviceTo = new Date(Math.max(...serviceDates));

        // 3. Calculate total charge
        const totalCharge = serviceLines.reduce((sum, line) => sum + (line.charge * line.units), 0);

        // 5. Build claim object for EDI generator
        const claimData = {
            patient: {
                firstName: patient.firstName,
                lastName: patient.lastName,
                middleName: patient.middleName || '',
                dateOfBirth: patient.dateOfBirth,
                gender: patient.gender,
                memberId: patient.memberId || '',
                address: patient.address,
                city: patient.city,
                state: patient.state,
                zip: patient.zip,
                phone: patient.phone
            },
            billingProvider: {
                name: billingProvider.name,
                npi: billingProvider.npi,
                taxId: billingProvider.taxId,
                taxonomy: billingProvider.taxonomy,
                address: billingProvider.address,
                city: billingProvider.city,
                state: billingProvider.state,
                zip: billingProvider.zip,
                phone: billingProvider.phone
            },
            renderingProvider: renderingProvider ? {
                npi: renderingProvider.npi,
                firstName: renderingProvider.firstName,
                lastName: renderingProvider.lastName,
                taxonomy: renderingProvider.taxonomy
            } : null,
            payer: {
                name: payerData.name,
                id: payer837pId // Use correct 837P ID from database
            },
            serviceDate: serviceLines[0].serviceDate, // Will be overridden at service line level
            diagnosisCodes: diagnosisCodes,
            serviceLines: serviceLines.map(line => ({
                cptCode: line.cptCode,
                charge: line.charge,
                units: line.units,
                diagnosisPointer: line.diagnosisPointer || '1',
                serviceDate: line.serviceDate,
                placeOfService: line.placeOfService,
                modifiers: line.modifiers
            })),
            relationshipToInsured: relationshipToInsured || '18', // Default to Self
            groupNumber: groupNumber || '',
            insurancePlanName: insurancePlanName || ''
        };

        // 5. Generate EDI 837P
        console.log('   📄 Generating 837P EDI...');
        const edi837p = generate837P(claimData);

        // 6. Generate filename
        const timestamp = new Date().toISOString().replace(/:/g, '-').split('.')[0];
        const prefix = testMode ? 'OATEST_' : '';
        const filename = `${prefix}837P_${timestamp}.txt`;

        console.log(`   📋 Filename: ${filename}`);

        // 7. Save file locally
        const outputDir = path.join(__dirname, '../claims-output');
        if (!fs.existsSync(outputDir)) {
            fs.mkdirSync(outputDir, { recursive: true });
        }
        const localPath = path.join(outputDir, filename);
        fs.writeFileSync(localPath, edi837p);

        console.log(`   💾 Saved locally: ${localPath}`);

        // 8. Upload to Office Ally SFTP
        const sftp = new Client();
        try {
            await sftp.connect({
                host: process.env.OFFICE_ALLY_SFTP_HOST,
                port: parseInt(process.env.OFFICE_ALLY_SFTP_PORT || '22'),
                username: process.env.OFFICE_ALLY_SFTP_USERNAME,
                password: process.env.OFFICE_ALLY_SFTP_PASSWORD
            });

            console.log('   ✅ Connected to Office Ally SFTP');

            const remotePath = `/inbound/${filename}`;
            await sftp.put(localPath, remotePath);

            console.log(`   📤 Uploaded to: ${remotePath}`);

            await sftp.end();

            // 9. Extract claim ID from EDI
            const clmMatch = edi837p.match(/CLM\*([^*]+)\*/);
            const claimId = clmMatch ? clmMatch[1] : `CLM${Date.now()}`;

            // 10. Save to database
            const { data: submission, error: dbError } = await supabase
                .from('claims_submissions')
                .insert([{
                    claim_id: claimId,
                    patient_name: `${patient.firstName} ${patient.lastName}`,
                    patient_dob: patient.dateOfBirth,
                    patient_member_id: patient.memberId,
                    payer_id: payerData.id,
                    payer_name: payerData.name,
                    payer_837p_id: payer837pId,
                    billing_provider_npi: claimData.billingProvider.npi,
                    rendering_provider_npi: renderingProviderNPI,
                    service_date_from: serviceFrom.toISOString().split('T')[0],
                    service_date_to: serviceTo.toISOString().split('T')[0],
                    total_charge: totalCharge,
                    total_units: serviceLines.reduce((sum, line) => sum + line.units, 0),
                    diagnosis_codes: diagnosisCodes,
                    service_lines: serviceLines,
                    test_mode: testMode,
                    filename: filename,
                    file_size: edi837p.length,
                    remote_path: remotePath,
                    edi_content: edi837p,
                    status: 'SUBMITTED',
                    submitted_at: new Date().toISOString()
                }])
                .select()
                .single();

            if (dbError) {
                console.error('   ⚠️  Database insert failed:', dbError);
                // Don't fail the whole request - file was already uploaded
            } else {
                console.log('   ✅ Saved to database');
            }

            // 11. Return success
            console.log('   🎉 Claim submitted successfully!\n');

            return res.json({
                success: true,
                claimId: claimId,
                filename: filename,
                status: 'SUBMITTED',
                message: testMode
                    ? 'Test claim submitted successfully with OATEST prefix'
                    : 'Production claim submitted successfully',
                fileSize: edi837p.length,
                remotePath: remotePath,
                submissionId: submission?.id
            });

        } catch (sftpError) {
            console.error('   ❌ SFTP Error:', sftpError.message);
            await sftp.end().catch(() => {});

            return res.status(500).json({
                success: false,
                error: `SFTP upload failed: ${sftpError.message}`
            });
        }

    } catch (error) {
        console.error('❌ Claim submission error:', error);
        return res.status(500).json({
            success: false,
            error: error.message
        });
    }
}

/**
 * GET /api/claims/history
 * Retrieve claim submission history
 */
async function handleGetClaimsHistory(req, res) {
    try {
        const { limit = 50, offset = 0, status } = req.query;

        let query = supabase
            .from('claims_submissions')
            .select('*')
            .order('submitted_at', { ascending: false })
            .range(offset, offset + limit - 1);

        if (status) {
            query = query.eq('status', status);
        }

        const { data, error } = await query;

        if (error) {
            return res.status(500).json({
                success: false,
                error: error.message
            });
        }

        return res.json({
            success: true,
            claims: data || [],
            count: data?.length || 0
        });

    } catch (error) {
        console.error('Error fetching claims history:', error);
        return res.status(500).json({
            success: false,
            error: error.message
        });
    }
}

module.exports = {
    handleSubmitClaim,
    handleGetClaimsHistory
};
