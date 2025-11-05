import React from 'react';

/**
 * DynamicFormField - Renders form fields with requirement-based styling
 * @param {Object} field - Field configuration from payer config
 * @param {Object} register - react-hook-form register function
 * @param {Object} errors - react-hook-form errors object
 * @param {string} value - Current field value
 * @param {Function} onChange - Change handler
 */
export default function DynamicFormField({ field, register, errors, value, onChange }) {
  const {
    name,
    label,
    type = 'text',
    required,
    helpText,
    options,
    placeholder,
    validationRules = {}
  } = field;

  // Determine styling based on requirement level
  const getRequirementClass = () => {
    switch (required) {
      case 'required':
        return 'field-required';
      case 'recommended':
        return 'field-recommended';
      default:
        return 'field-optional';
    }
  };

  const getLabelClass = () => {
    switch (required) {
      case 'required':
        return 'label-required';
      case 'recommended':
        return 'label-recommended';
      default:
        return '';
    }
  };

  const hasError = errors && errors[name];

  // Render different input types
  const renderInput = () => {
    const baseClasses = `
      w-full px-4 py-2 border rounded-lg
      focus:ring-2 focus:ring-blue-500 focus:border-transparent
      ${hasError ? 'border-red-500' : 'border-gray-300'}
      ${getRequirementClass()}
    `;

    if (type === 'select') {
      return (
        <select
          {...register(name, validationRules)}
          className={baseClasses}
          value={value || ''}
          onChange={onChange}
        >
          <option value="">Select {label}</option>
          {options?.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      );
    }

    if (type === 'date') {
      return (
        <input
          type="date"
          {...register(name, validationRules)}
          className={baseClasses}
          placeholder={placeholder || 'YYYY-MM-DD'}
          value={value || ''}
          onChange={onChange}
        />
      );
    }

    // Default text/email/tel inputs
    return (
      <input
        type={type}
        {...register(name, validationRules)}
        className={baseClasses}
        placeholder={placeholder || label}
        value={value || ''}
        onChange={onChange}
      />
    );
  };

  return (
    <div className="form-field">
      {/* Label with requirement indicator */}
      <label
        htmlFor={name}
        className={`block text-sm font-medium text-gray-700 mb-1 ${getLabelClass()}`}
      >
        {label}
      </label>

      {/* Input field */}
      {renderInput()}

      {/* Help text */}
      {helpText && !hasError && (
        <p className="help-text">
          {helpText}
        </p>
      )}

      {/* Error message */}
      {hasError && (
        <p className="text-sm text-red-600 mt-1">
          {errors[name]?.message || `${label} is required`}
        </p>
      )}

      {/* Requirement indicator badge */}
      {required === 'recommended' && !hasError && (
        <div className="mt-1">
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-800">
            Recommended for best results
          </span>
        </div>
      )}
    </div>
  );
}
