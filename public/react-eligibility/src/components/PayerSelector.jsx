import React, { useMemo } from 'react';

/**
 * PayerSelector - Dropdown for selecting insurance payer with grouping by category
 * @param {Array} payers - List of payers from API
 * @param {string} value - Currently selected payer ID
 * @param {Function} onChange - Change handler
 * @param {boolean} disabled - Whether the selector is disabled
 */
export default function PayerSelector({ payers, value, onChange, disabled = false }) {
  // Group payers by category
  const groupedPayers = useMemo(() => {
    if (!payers || payers.length === 0) return {};

    const groups = {};

    payers.forEach((payer) => {
      const category = payer.category || 'Other';

      if (!groups[category]) {
        groups[category] = [];
      }

      groups[category].push(payer);
    });

    // Sort payers within each category alphabetically
    Object.keys(groups).forEach((category) => {
      groups[category].sort((a, b) => a.name.localeCompare(b.name));
    });

    return groups;
  }, [payers]);

  // Determine which payers have been tested
  const testedPayers = new Set([
    'UTMCD',      // Utah Medicaid
    '60054',      // Aetna
    '00910',      // Regence BCBS
    'INT-BENE-ADMIN', // First Health (if configured)
    'HMHI-BHN'    // Hayden-Moore Health Innovations
  ]);

  // Category display order
  const categoryOrder = [
    'Medicaid',
    'Medicaid Managed Care',
    'Commercial',
    'Private',
    'Medicare',
    'Other'
  ];

  const handleChange = (e) => {
    const selectedId = e.target.value;
    const selectedPayer = payers.find(p => p.oa_eligibility_270_id === selectedId);
    onChange(selectedPayer);
  };

  return (
    <div className="form-field">
      <label
        htmlFor="payerSelector"
        className="block text-sm font-medium text-gray-700 mb-1 label-required"
      >
        Insurance Payer
      </label>

      <select
        id="payerSelector"
        value={value || ''}
        onChange={handleChange}
        disabled={disabled}
        className="w-full px-4 py-2 border border-gray-300 rounded-lg
                   focus:ring-2 focus:ring-blue-500 focus:border-transparent
                   field-required disabled:bg-gray-100 disabled:cursor-not-allowed"
      >
        <option value="">Select Insurance Payer</option>

        {categoryOrder.map((category) => {
          if (!groupedPayers[category] || groupedPayers[category].length === 0) {
            return null;
          }

          return (
            <optgroup key={category} label={category}>
              {groupedPayers[category].map((payer) => {
                const isTested = testedPayers.has(payer.oa_eligibility_270_id);
                const label = `${payer.name}${isTested ? ' ✅' : ''}`;

                return (
                  <option
                    key={payer.id}
                    value={payer.oa_eligibility_270_id}
                  >
                    {label}
                  </option>
                );
              })}
            </optgroup>
          );
        })}

        {/* Uncategorized payers */}
        {Object.keys(groupedPayers).filter(cat => !categoryOrder.includes(cat)).map((category) => (
          <optgroup key={category} label={category}>
            {groupedPayers[category].map((payer) => {
              const isTested = testedPayers.has(payer.oa_eligibility_270_id);
              const label = `${payer.name}${isTested ? ' ✅' : ''}`;

              return (
                <option
                  key={payer.id}
                  value={payer.oa_eligibility_270_id}
                >
                  {label}
                </option>
              );
            })}
          </optgroup>
        ))}
      </select>

      <p className="help-text">
        Select the patient's insurance payer to see required fields
      </p>

      <div className="mt-2 text-xs text-gray-500">
        <span className="inline-flex items-center">
          <span className="mr-1">✅</span>
          = Tested and working
        </span>
      </div>
    </div>
  );
}
