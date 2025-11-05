import React from 'react';

/**
 * ResultsDisplay - Shows eligibility check results
 * @param {Object} result - Eligibility check result from API
 * @param {Function} onReset - Callback to reset and check another patient
 */
export default function ResultsDisplay({ result, onReset }) {
  if (!result) return null;

  const { enrolled, program, planType, details, copayInfo, estimatedCosts, extractedData } = result;

  const isActive = enrolled;
  const networkStatus = copayInfo?.networkStatus || 'UNKNOWN';

  // Extract validation warnings
  const warnings = extractedData?.memberIdValidation?.warnings || [];
  const hasWarnings = warnings.length > 0;

  // Extract coverage period
  const coveragePeriod = extractedData?.coveragePeriod;
  const hasCoveragePeriod = coveragePeriod && (coveragePeriod.startDate || coveragePeriod.endDate);

  // Format currency
  const formatCurrency = (amount) => {
    if (amount === null || amount === undefined || amount === 'N/A') return 'N/A';
    return `$${parseFloat(amount).toFixed(2)}`;
  };

  // Get network badge classes
  const getNetworkBadgeClass = () => {
    switch (networkStatus) {
      case 'IN_NETWORK':
        return 'network-in';
      case 'OUT_OF_NETWORK':
        return 'network-out';
      default:
        return 'network-unknown';
    }
  };

  const getNetworkText = () => {
    switch (networkStatus) {
      case 'IN_NETWORK':
        return '✅ In-Network';
      case 'OUT_OF_NETWORK':
        return '⚠️ Out-of-Network';
      default:
        return '❓ Unknown';
    }
  };

  return (
    <div className={`eligibility-result ${isActive ? 'eligibility-active' : 'eligibility-inactive'}`}>
      {/* Header */}
      <div className="flex justify-between items-start mb-6">
        <div>
          <h3 className="text-2xl font-bold text-gray-900 mb-2">
            {isActive ? '✅ Active Coverage' : '❌ No Active Coverage'}
          </h3>
          {program && (
            <p className="text-lg text-gray-700">{program}</p>
          )}
          {planType && (
            <p className="text-sm text-gray-600">Plan Type: {planType}</p>
          )}
        </div>
        <button
          onClick={onReset}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700
                     focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
        >
          Check Another Patient
        </button>
      </div>

      {/* Coverage Period */}
      {hasCoveragePeriod && (
        <div className={`mb-4 border-l-4 p-4 rounded-r-lg ${
          coveragePeriod.isExpired
            ? 'bg-red-50 border-red-500'
            : coveragePeriod.isActive
            ? 'bg-green-50 border-green-500'
            : 'bg-blue-50 border-blue-500'
        }`}>
          <div className="flex items-center">
            <div className="flex-shrink-0">
              {coveragePeriod.isExpired ? (
                <svg className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              ) : coveragePeriod.isActive ? (
                <svg className="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              ) : (
                <svg className="h-6 w-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              )}
            </div>
            <div className="ml-3">
              <h4 className={`text-sm font-bold ${
                coveragePeriod.isExpired
                  ? 'text-red-800'
                  : coveragePeriod.isActive
                  ? 'text-green-800'
                  : 'text-blue-800'
              }`}>
                Coverage Period
              </h4>
              <p className={`text-sm ${
                coveragePeriod.isExpired
                  ? 'text-red-700'
                  : coveragePeriod.isActive
                  ? 'text-green-700'
                  : 'text-blue-700'
              }`}>
                {coveragePeriod.startDate && coveragePeriod.endDate ? (
                  <>
                    {new Date(coveragePeriod.startDate).toLocaleDateString()} - {new Date(coveragePeriod.endDate).toLocaleDateString()}
                    {coveragePeriod.isExpired && (
                      <span className="ml-2 font-bold">[ EXPIRED ]</span>
                    )}
                    {coveragePeriod.isActive && (
                      <span className="ml-2 font-bold">[ ACTIVE ]</span>
                    )}
                  </>
                ) : coveragePeriod.startDate ? (
                  <>Started: {new Date(coveragePeriod.startDate).toLocaleDateString()}</>
                ) : (
                  <>Ends: {new Date(coveragePeriod.endDate).toLocaleDateString()}</>
                )}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Validation Warnings */}
      {hasWarnings && (
        <div className="mb-6 space-y-3">
          {warnings.map((warning, index) => (
            <div
              key={index}
              className={`border-l-4 p-4 rounded-r-lg ${
                warning.severity === 'CRITICAL'
                  ? 'bg-red-50 border-red-500'
                  : 'bg-yellow-50 border-yellow-500'
              }`}
            >
              <div className="flex items-start">
                <div className="flex-shrink-0">
                  {warning.severity === 'CRITICAL' ? (
                    <svg className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                  ) : (
                    <svg className="h-6 w-6 text-yellow-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  )}
                </div>
                <div className="ml-3 flex-1">
                  <h4 className={`text-sm font-bold ${
                    warning.severity === 'CRITICAL' ? 'text-red-800' : 'text-yellow-800'
                  }`}>
                    {warning.severity === 'CRITICAL' ? '🚨 CRITICAL WARNING' : '⚠️ WARNING'}
                  </h4>
                  <p className={`mt-2 text-sm ${
                    warning.severity === 'CRITICAL' ? 'text-red-700' : 'text-yellow-700'
                  }`}>
                    {warning.message}
                  </p>
                  {warning.details && (
                    <p className={`mt-2 text-xs ${
                      warning.severity === 'CRITICAL' ? 'text-red-600' : 'text-yellow-600'
                    }`}>
                      {warning.details}
                    </p>
                  )}
                  {extractedData?.memberIdValidation && (
                    <div className="mt-3 text-xs font-mono bg-white/50 p-2 rounded">
                      <div className="text-gray-700">
                        <span className="font-semibold">Sent:</span> {extractedData.memberIdValidation.sent}
                      </div>
                      <div className="text-gray-700">
                        <span className="font-semibold">Returned:</span> {extractedData.memberIdValidation.returned || 'None'}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {details && (
        <div className="bg-white border border-gray-200 rounded-lg p-4 mb-4">
          <p className="text-gray-700">{details}</p>
        </div>
      )}

      {/* Network Status */}
      {copayInfo && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <h4 className="text-lg font-semibold text-gray-900 mb-3">
              Network Status
            </h4>
            <div className="mb-4">
              <span className={getNetworkBadgeClass()}>
                {getNetworkText()}
              </span>
            </div>
          </div>

          {/* Deductible Info */}
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <h4 className="text-lg font-semibold text-gray-900 mb-3">
              Deductible Status
            </h4>
            <div className="space-y-2 text-sm">
              {copayInfo.deductibleRemaining !== null && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Individual Remaining:</span>
                  <span className="font-medium">{formatCurrency(copayInfo.deductibleRemaining)}</span>
                </div>
              )}
              {copayInfo.familyDeductibleRemaining !== null && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Family Remaining:</span>
                  <span className="font-medium">{formatCurrency(copayInfo.familyDeductibleRemaining)}</span>
                </div>
              )}
              {copayInfo.deductibleRemaining === null && copayInfo.familyDeductibleRemaining === null && (
                <p className="text-gray-500 italic">No deductible information available</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Psychiatric Outpatient Copay (Service Type A8 - PRIMARY SERVICE FOR MOONLIT) */}
      {copayInfo && copayInfo.psychiatricAvailable && (
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-400 rounded-lg p-4 mb-6">
          <div className="flex items-center mb-3">
            <span className="text-2xl mr-2">🧠</span>
            <h4 className="text-lg font-semibold text-gray-900">
              Psychiatric Outpatient Copay (Primary Service - A8)
            </h4>
          </div>
          <div className="bg-white rounded-lg p-4 border border-blue-200">
            <div className="text-sm text-gray-600 mb-1">Psychiatric/Behavioral Health Outpatient Visit</div>
            <div className="text-3xl font-bold text-blue-700">
              {formatCurrency(copayInfo.psychiatricOutpatientCopay)}
            </div>
          </div>
          <p className="text-xs text-gray-600 mt-3 italic">
            ✓ This is the copay for Moonlit's psychiatric outpatient services (Service Type A8)
          </p>
        </div>
      )}

      {/* Telemedicine Copay Information (Displayed First - PRIMARY SERVICE FOR MOONLIT) */}
      {copayInfo && copayInfo.telemedicineAvailable && (
        <div className="bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-400 rounded-lg p-4 mb-6">
          <div className="flex items-center mb-3">
            <span className="text-2xl mr-2">🧠📱</span>
            <h4 className="text-lg font-semibold text-gray-900">
              Psychiatric Telemedicine Copay (Moonlit's Primary Service)
            </h4>
          </div>
          <div className="bg-white rounded-lg p-4 border border-green-200">
            <div className="text-sm text-gray-600 mb-1">
              Psychiatric/Behavioral Health via Telemedicine
            </div>
            <div className="text-3xl font-bold text-green-700">
              {formatCurrency(copayInfo.telemedicinePrimaryCareCopay !== null
                ? copayInfo.telemedicinePrimaryCareCopay
                : copayInfo.telemedicineSpecialistCopay)}
            </div>
            <div className="mt-2 text-xs text-gray-500">
              Service Type: A8 (Psychiatric Outpatient) via Telemedicine
            </div>
          </div>
          <p className="text-xs text-gray-600 mt-3 italic">
            ✓ Moonlit provides psychiatric outpatient services via telemedicine (99% of visits)
          </p>
        </div>
      )}

      {/* In-Person Copay Information */}
      {copayInfo && (copayInfo.primaryCareCopay !== null || copayInfo.specialistCopay !== null || copayInfo.urgentCareCopay !== null) && (
        <div className="bg-white border border-gray-200 rounded-lg p-4 mb-6">
          <h4 className="text-lg font-semibold text-gray-900 mb-3">
            In-Person Visit Copays {copayInfo.telemedicineAvailable && <span className="text-sm font-normal text-gray-500">(if applicable)</span>}
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {copayInfo.primaryCareCopay !== null && (
              <div className="bg-blue-50 rounded-lg p-3">
                <div className="text-sm text-gray-600 mb-1">Primary Care</div>
                <div className="text-2xl font-bold text-blue-700">
                  {formatCurrency(copayInfo.primaryCareCopay)}
                </div>
              </div>
            )}
            {copayInfo.specialistCopay !== null && (
              <div className="bg-purple-50 rounded-lg p-3">
                <div className="text-sm text-gray-600 mb-1">Specialist</div>
                <div className="text-2xl font-bold text-purple-700">
                  {formatCurrency(copayInfo.specialistCopay)}
                </div>
              </div>
            )}
            {copayInfo.urgentCareCopay !== null && (
              <div className="bg-orange-50 rounded-lg p-3">
                <div className="text-sm text-gray-600 mb-1">Urgent Care</div>
                <div className="text-2xl font-bold text-orange-700">
                  {formatCurrency(copayInfo.urgentCareCopay)}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Estimated Patient Costs */}
      {estimatedCosts && (
        <div className="bg-white border border-gray-200 rounded-lg p-4 mb-6">
          <h4 className="text-lg font-semibold text-gray-900 mb-3">
            Estimated Patient Costs at Moonlit
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {estimatedCosts.INTAKE_VISIT && (
              <div className="border border-gray-200 rounded-lg p-3">
                <div className="text-sm text-gray-600 mb-2">Initial Intake Visit</div>
                <div className="text-3xl font-bold text-green-700 mb-1">
                  {formatCurrency(estimatedCosts.INTAKE_VISIT.patientOwes)}
                </div>
                <div className="text-xs text-gray-500">
                  Moonlit fee: {formatCurrency(estimatedCosts.INTAKE_VISIT.moonlitFee)}
                </div>
              </div>
            )}
            {estimatedCosts.FOLLOWUP_BRIEF && (
              <div className="border border-gray-200 rounded-lg p-3">
                <div className="text-sm text-gray-600 mb-2">Follow-up (Brief)</div>
                <div className="text-3xl font-bold text-green-700 mb-1">
                  {formatCurrency(estimatedCosts.FOLLOWUP_BRIEF.patientOwes)}
                </div>
                <div className="text-xs text-gray-500">
                  Moonlit fee: {formatCurrency(estimatedCosts.FOLLOWUP_BRIEF.moonlitFee)}
                </div>
              </div>
            )}
            {estimatedCosts.FOLLOWUP_EXTENDED && (
              <div className="border border-gray-200 rounded-lg p-3">
                <div className="text-sm text-gray-600 mb-2">Follow-up (Extended)</div>
                <div className="text-3xl font-bold text-green-700 mb-1">
                  {formatCurrency(estimatedCosts.FOLLOWUP_EXTENDED.patientOwes)}
                </div>
                <div className="text-xs text-gray-500">
                  Moonlit fee: {formatCurrency(estimatedCosts.FOLLOWUP_EXTENDED.moonlitFee)}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Data Validation Results */}
      {extractedData?.dataValidation && extractedData.dataValidation.hasIssues && (
        <div className="bg-white border border-gray-200 rounded-lg p-4 mb-6">
          <h4 className="text-lg font-semibold text-gray-900 mb-3 flex items-center">
            <svg className="h-5 w-5 mr-2 text-yellow-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Data Verification Results
          </h4>

          <div className="mb-4 text-sm text-gray-600">
            {extractedData.dataValidation.summary}
          </div>

          {/* Show critical issues */}
          {extractedData.dataValidation.criticalCount > 0 && (
            <div className="mb-4">
              <h5 className="text-sm font-semibold text-red-700 mb-2">Critical Issues</h5>
              {Object.entries(extractedData.dataValidation.issues)
                .filter(([_, issue]) => issue.severity === 'CRITICAL')
                .map(([key, issue]) => (
                  <div key={key} className="bg-red-50 p-3 rounded-lg mb-2">
                    <p className="text-sm font-medium text-red-800">{issue.message}</p>
                    <div className="mt-1 text-xs text-red-600">
                      <span>IntakeQ: {issue.intakeq_value || 'Not provided'}</span> |
                      <span> Payer: {issue.payer_value || 'Not provided'}</span>
                    </div>
                  </div>
                ))}
            </div>
          )}

          {/* Show recommendations */}
          {extractedData.dataValidation.recommendations && extractedData.dataValidation.recommendations.length > 0 && (
            <div>
              <h5 className="text-sm font-semibold text-gray-700 mb-2">Recommended Actions</h5>
              <ol className="list-decimal list-inside space-y-1">
                {extractedData.dataValidation.recommendations.slice(0, 3).map((rec, idx) => (
                  <li key={idx} className="text-sm text-gray-600">
                    <span className="font-medium">{rec.action}</span> - {rec.details}
                  </li>
                ))}
              </ol>
            </div>
          )}
        </div>
      )}

      {/* Verified Patient Information */}
      {extractedData && (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-6">
          <h4 className="text-lg font-semibold text-gray-900 mb-3">
            Verified Patient Information
          </h4>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Basic Demographics */}
            <div>
              <h5 className="text-sm font-semibold text-gray-700 mb-2">Demographics</h5>
              <div className="space-y-2 text-sm">
                {extractedData.patientName?.fullName && (
                  <div>
                    <span className="text-gray-600">Name:</span>{' '}
                    <span className="font-medium">{extractedData.patientName.fullName}</span>
                    <span className="ml-1 text-xs text-green-600">✓ Verified</span>
                  </div>
                )}
                {extractedData.dateOfBirth && (
                  <div>
                    <span className="text-gray-600">Date of Birth:</span>{' '}
                    <span className="font-medium">{new Date(extractedData.dateOfBirth).toLocaleDateString()}</span>
                    <span className="ml-1 text-xs text-green-600">✓ Verified</span>
                  </div>
                )}
                {extractedData.gender && (
                  <div>
                    <span className="text-gray-600">Gender:</span>{' '}
                    <span className="font-medium">{extractedData.gender}</span>
                    <span className="ml-1 text-xs text-green-600">✓ Verified</span>
                  </div>
                )}
                {extractedData.phone && (
                  <div>
                    <span className="text-gray-600">Phone:</span>{' '}
                    <span className="font-medium">{extractedData.phone}</span>
                    <span className="ml-1 text-xs text-green-600">✓ Verified</span>
                  </div>
                )}
              </div>
            </div>

            {/* Address */}
            <div>
              <h5 className="text-sm font-semibold text-gray-700 mb-2">Address</h5>
              {extractedData.address && (
                <div className="text-sm">
                  <div className="font-medium">{extractedData.address.street}</div>
                  <div className="font-medium">
                    {extractedData.address.city}, {extractedData.address.state} {extractedData.address.zip}
                  </div>
                  <span className="text-xs text-green-600">✓ Verified by payer</span>
                </div>
              )}
            </div>
          </div>

          {/* Insurance Information */}
          {(extractedData.payerInfo || extractedData.references) && (
            <div className="mt-4 pt-4 border-t border-gray-200">
              <h5 className="text-sm font-semibold text-gray-700 mb-2">Insurance Details</h5>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                {extractedData.payerInfo?.name && (
                  <div>
                    <span className="text-gray-600">Payer:</span>{' '}
                    <span className="font-medium">{extractedData.payerInfo.name}</span>
                  </div>
                )}
                {extractedData.medicaidId && (
                  <div>
                    <span className="text-gray-600">Member ID:</span>{' '}
                    <span className="font-medium font-mono">{extractedData.medicaidId}</span>
                  </div>
                )}
                {extractedData.references?.caseNumber && (
                  <div>
                    <span className="text-gray-600">Case Number:</span>{' '}
                    <span className="font-medium font-mono">{extractedData.references.caseNumber}</span>
                  </div>
                )}
                {extractedData.references?.groupNumber && (
                  <div>
                    <span className="text-gray-600">Group Number:</span>{' '}
                    <span className="font-medium font-mono">{extractedData.references.groupNumber}</span>
                  </div>
                )}
                {extractedData.references?.policyNumber && (
                  <div>
                    <span className="text-gray-600">Policy Number:</span>{' '}
                    <span className="font-medium font-mono">{extractedData.references.policyNumber}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Managed Care Organization */}
          {extractedData.managedCareOrg && (
            <div className="mt-4 pt-4 border-t border-gray-200">
              <h5 className="text-sm font-semibold text-gray-700 mb-2">Managed Care Organization</h5>
              <div className="bg-blue-50 p-3 rounded-lg">
                <div className="text-sm">
                  <div className="font-medium text-blue-900">{extractedData.managedCareOrg.name}</div>
                  {extractedData.managedCareOrg.type && (
                    <div className="text-xs text-blue-700">Type: {extractedData.managedCareOrg.type}</div>
                  )}
                  {extractedData.managedCareOrg.phone && (
                    <div className="text-xs text-blue-700">Phone: {extractedData.managedCareOrg.phone}</div>
                  )}
                  {extractedData.managedCareOrg.payerId && (
                    <div className="text-xs text-blue-700">ID: {extractedData.managedCareOrg.payerId}</div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Primary Care Provider */}
          {extractedData.primaryCareProvider && (
            <div className="mt-4 pt-4 border-t border-gray-200">
              <h5 className="text-sm font-semibold text-gray-700 mb-2">Assigned Primary Care Provider</h5>
              <div className="bg-green-50 p-3 rounded-lg">
                <div className="text-sm">
                  <div className="font-medium text-green-900">{extractedData.primaryCareProvider.name}</div>
                  <div className="text-xs text-green-700">NPI: {extractedData.primaryCareProvider.npi}</div>
                  {extractedData.primaryCareProvider.phone && (
                    <div className="text-xs text-green-700">Phone: {extractedData.primaryCareProvider.phone}</div>
                  )}
                  {extractedData.primaryCareProvider.address && (
                    <div className="text-xs text-green-700 mt-1">{extractedData.primaryCareProvider.address}</div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Coordination of Benefits */}
          {extractedData.otherInsurance?.hasOtherInsurance && (
            <div className="mt-4 pt-4 border-t border-gray-200">
              <h5 className="text-sm font-semibold text-gray-700 mb-2">
                ⚠️ Other Insurance Coverage Detected
              </h5>
              <div className="bg-yellow-50 p-3 rounded-lg">
                <p className="text-sm text-yellow-800">
                  Patient has coordination of benefits with other insurance.
                  {extractedData.otherInsurance.otherPayers?.length > 0 && (
                    <div className="mt-2">
                      <span className="font-medium">Other payers: </span>
                      {extractedData.otherInsurance.otherPayers.map(p => p.name).join(', ')}
                    </div>
                  )}
                </p>
              </div>
            </div>
          )}

          {/* Payer Messages */}
          {extractedData.messages && extractedData.messages.length > 0 && (
            <div className="mt-4 pt-4 border-t border-gray-200">
              <h5 className="text-sm font-semibold text-gray-700 mb-2">Messages from Payer</h5>
              <div className="space-y-2">
                {extractedData.messages.map((msg, idx) => (
                  <div key={idx} className="bg-blue-50 p-2 rounded text-xs text-blue-800">
                    {msg}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
