import { useState } from 'react';

/**
 * Custom hook to handle eligibility check submission
 * @returns {Object} - { checkEligibility, result, loading, error }
 */
export function useEligibilityCheck() {
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const checkEligibility = async (formData) => {
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch('/api/database-eligibility/check', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();

      // Check if there's an error in the response
      if (data.error && !data.enrolled) {
        throw new Error(data.error);
      }

      setResult(data);
      return data;
    } catch (err) {
      console.error('Eligibility check error:', err);
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setResult(null);
    setError(null);
  };

  return {
    checkEligibility,
    result,
    loading,
    error,
    reset
  };
}
