import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import PayerSelector from './PayerSelector';
import DynamicFormField from './DynamicFormField';
import PatientSearch from './PatientSearch';
import RequirementsSummary from './RequirementsSummary';
import ResultsDisplay from './ResultsDisplay';
import { usePayerConfig, usePayersList } from '../hooks/usePayerConfig';
import { useEligibilityCheck } from '../hooks/useEligibilityCheck';

export default function EligibilityChecker() {
  const [selectedPayer, setSelectedPayer] = useState(null);
  const [formData, setFormData] = useState({});
  const [showResults, setShowResults] = useState(false);

  // Hooks
  const { payers, loading: payersLoading } = usePayersList();
  const { config, loading: configLoading, error: configError } = usePayerConfig(
    selectedPayer?.oa_eligibility_270_id
  );
  const { checkEligibility, result, loading: checkLoading, error: checkError, reset: resetCheck } = useEligibilityCheck();

  // React Hook Form
  const { register, handleSubmit, formState: { errors }, setValue, watch, reset: resetForm } = useForm({
    mode: 'onBlur'
  });

  // Watch all form values for dynamic updates
  const watchedValues = watch();

  // Update form data when payer changes
  useEffect(() => {
    if (selectedPayer) {
      // Reset form when payer changes
      resetForm();
      setFormData({});
      setShowResults(false);
      resetCheck();
    }
  }, [selectedPayer]);

  // Handle payer selection
  const handlePayerChange = (payer) => {
    setSelectedPayer(payer);
  };

  // Handle patient selection from IntakeQ
  const handlePatientSelect = (patientData, fullPatient) => {
    // Auto-fill form fields
    Object.keys(patientData).forEach((key) => {
      setValue(key, patientData[key]);
    });
    setFormData({ ...formData, ...patientData });
  };

  // Handle form field changes
  const handleFieldChange = (fieldName, value) => {
    setValue(fieldName, value);
    setFormData({ ...formData, [fieldName]: value });
  };

  // Validate flexible requirements (OR conditions)
  const validateFlexibleRequirements = (data) => {
    if (!config?.flexibleRequirements) return true;

    const errors = [];

    config.flexibleRequirements.forEach((requirement) => {
      // Parse requirement string like "Provide either Date of Birth OR Medicaid ID"
      const orMatch = requirement.match(/either (.+?) OR (.+?)$/i);

      if (orMatch) {
        const field1 = orMatch[1].trim().replace(/\s+/g, '');
        const field2 = orMatch[2].trim().replace(/\s+/g, '');

        // Convert to camelCase field names
        const fieldName1 = field1.charAt(0).toLowerCase() + field1.slice(1).replace(/\s+/g, '');
        const fieldName2 = field2.charAt(0).toLowerCase() + field2.slice(1).replace(/\s+/g, '');

        // Check if at least one is provided
        if (!data[fieldName1] && !data[fieldName2]) {
          errors.push(requirement);
        }
      }
    });

    return errors.length === 0 ? true : errors;
  };

  // Handle form submission
  const onSubmit = async (data) => {
    try {
      // Validate flexible requirements
      const flexibleValidation = validateFlexibleRequirements(data);
      if (flexibleValidation !== true) {
        alert(`Please provide: ${flexibleValidation.join(', ')}`);
        return;
      }

      // Prepare submission data
      const submissionData = {
        ...data,
        payerId: selectedPayer.oa_eligibility_270_id,
        providerNpi: '1336726843' // Anthony Privratsky's NPI - could be made dynamic
      };

      // Remove empty fields
      Object.keys(submissionData).forEach((key) => {
        if (submissionData[key] === '' || submissionData[key] === null || submissionData[key] === undefined) {
          delete submissionData[key];
        }
      });

      // Submit eligibility check
      await checkEligibility(submissionData);
      setShowResults(true);

      // Scroll to results
      setTimeout(() => {
        document.getElementById('results')?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    } catch (error) {
      console.error('Eligibility check failed:', error);
    }
  };

  // Handle reset
  const handleReset = () => {
    setShowResults(false);
    resetCheck();
    resetForm();
    setFormData({});
    setSelectedPayer(null);
  };

  // Loading states
  if (payersLoading) {
    return (
      <div className="flex justify-center items-center min-h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading payers...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Configuration Error Alert */}
      {configError && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-yellow-800">Configuration Warning</h3>
              <div className="mt-2 text-sm text-yellow-700">{configError}</div>
            </div>
          </div>
        </div>
      )}

      {/* Form Container */}
      <div className="bg-white rounded-lg shadow-lg p-6">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Step 1: Payer Selection */}
          <div>
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              Step 1: Select Insurance Payer
            </h2>
            <PayerSelector
              payers={payers}
              value={selectedPayer?.oa_eligibility_270_id}
              onChange={handlePayerChange}
            />
          </div>

          {/* Requirements Summary */}
          {selectedPayer && config && (
            <RequirementsSummary config={config} />
          )}

          {/* Configuration Loading */}
          {selectedPayer && configLoading && (
            <div className="flex justify-center py-8">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
                <p className="text-sm text-gray-600">Loading payer configuration...</p>
              </div>
            </div>
          )}

          {/* Step 2: Patient Search (Optional) */}
          {selectedPayer && config && (
            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">
                Step 2: Patient Information
              </h2>

              <PatientSearch onPatientSelect={handlePatientSelect} />

              {/* Dynamic Form Fields */}
              <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                {config.fields?.map((field) => (
                  <DynamicFormField
                    key={field.name}
                    field={field}
                    register={register}
                    errors={errors}
                    value={watchedValues[field.name]}
                    onChange={(e) => handleFieldChange(field.name, e.target.value)}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Submit Button */}
          {selectedPayer && config && (
            <div className="flex justify-between items-center pt-6 border-t">
              <button
                type="button"
                onClick={handleReset}
                className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg
                           hover:bg-gray-50 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
                           transition-colors"
              >
                Reset Form
              </button>

              <button
                type="submit"
                disabled={checkLoading}
                className="px-8 py-3 bg-blue-600 text-white font-semibold rounded-lg
                           hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
                           disabled:bg-gray-400 disabled:cursor-not-allowed
                           transition-colors flex items-center"
              >
                {checkLoading ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Checking Eligibility...
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Check Eligibility
                  </>
                )}
              </button>
            </div>
          )}

          {/* Check Error */}
          {checkError && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-red-800">Eligibility Check Failed</h3>
                  <div className="mt-2 text-sm text-red-700">{checkError}</div>
                </div>
              </div>
            </div>
          )}
        </form>
      </div>

      {/* Results Section */}
      {showResults && result && (
        <div id="results">
          <ResultsDisplay result={result} onReset={handleReset} />
        </div>
      )}

      {/* Instructions Card */}
      {!selectedPayer && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-blue-900 mb-3">
            How to Use This Tool
          </h3>
          <ol className="list-decimal list-inside space-y-2 text-blue-800">
            <li>Select the patient's insurance payer from the dropdown</li>
            <li>Review the field requirements that appear for that payer</li>
            <li>Optionally search for the patient in IntakeQ to auto-fill information</li>
            <li>Complete the form fields (required fields must be filled)</li>
            <li>Click "Check Eligibility" to verify coverage</li>
            <li>Review the results including network status, copays, and estimated costs</li>
          </ol>
          <div className="mt-4 text-sm text-blue-700">
            <strong>Note:</strong> Different payers require different information. The form will automatically
            adjust to show only the fields needed for your selected payer.
          </div>
        </div>
      )}
    </div>
  );
}
