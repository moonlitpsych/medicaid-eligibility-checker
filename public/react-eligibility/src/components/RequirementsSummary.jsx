import React from 'react';

/**
 * RequirementsSummary - Displays payer-specific field requirements
 * @param {Object} config - Payer configuration from usePayerConfig
 */
export default function RequirementsSummary({ config }) {
  if (!config) return null;

  const { fields, notes, flexibleRequirements, payerName } = config;

  // Group fields by requirement level
  const required = fields?.filter(f => f.required === 'required') || [];
  const recommended = fields?.filter(f => f.required === 'recommended') || [];
  const optional = fields?.filter(f => f.required === 'optional') || [];

  return (
    <div className="requirements-summary">
      <div className="flex items-start justify-between mb-3">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">
            Field Requirements for {payerName || 'Selected Payer'}
          </h3>
          <p className="text-sm text-gray-600 mt-1">
            Complete the form below based on these requirements
          </p>
        </div>
        <div className="flex-shrink-0">
          <svg
            className="w-6 h-6 text-blue-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
        {/* Required Fields */}
        {required.length > 0 && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3">
            <div className="flex items-center mb-2">
              <div className="w-3 h-3 bg-red-600 rounded-full mr-2"></div>
              <h4 className="text-sm font-semibold text-red-900">
                Required ({required.length})
              </h4>
            </div>
            <ul className="text-sm text-red-800 space-y-1">
              {required.map((field) => (
                <li key={field.name}>• {field.label}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Recommended Fields */}
        {recommended.length > 0 && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
            <div className="flex items-center mb-2">
              <div className="w-3 h-3 bg-yellow-600 rounded-full mr-2"></div>
              <h4 className="text-sm font-semibold text-yellow-900">
                Recommended ({recommended.length})
              </h4>
            </div>
            <ul className="text-sm text-yellow-800 space-y-1">
              {recommended.map((field) => (
                <li key={field.name}>• {field.label}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Optional Fields */}
        {optional.length > 0 && (
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
            <div className="flex items-center mb-2">
              <div className="w-3 h-3 bg-gray-600 rounded-full mr-2"></div>
              <h4 className="text-sm font-semibold text-gray-900">
                Optional ({optional.length})
              </h4>
            </div>
            <ul className="text-sm text-gray-700 space-y-1">
              {optional.map((field) => (
                <li key={field.name}>• {field.label}</li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Flexible Requirements (OR conditions) */}
      {flexibleRequirements && flexibleRequirements.length > 0 && (
        <div className="bg-purple-50 border border-purple-200 rounded-lg p-3 mb-4">
          <h4 className="text-sm font-semibold text-purple-900 mb-2">
            Flexible Requirements
          </h4>
          <ul className="text-sm text-purple-800 space-y-2">
            {flexibleRequirements.map((req, index) => (
              <li key={index} className="flex items-start">
                <svg
                  className="w-5 h-5 text-purple-600 mr-2 flex-shrink-0 mt-0.5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <span>{req}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Payer Notes */}
      {notes && notes.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
          <h4 className="text-sm font-semibold text-blue-900 mb-2">
            Important Notes
          </h4>
          <ul className="text-sm text-blue-800 space-y-1">
            {notes.map((note, index) => (
              <li key={index} className="flex items-start">
                <span className="mr-2">ℹ️</span>
                <span>{note}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
