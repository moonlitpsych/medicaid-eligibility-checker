import { useState, useEffect } from 'react';

/**
 * Custom hook to fetch and manage payer-specific field configuration
 * @param {string} payerId - Office Ally payer ID (e.g., "UTMCD", "60054", "00910")
 * @returns {Object} - { config, loading, error }
 */
export function usePayerConfig(payerId) {
  const [config, setConfig] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!payerId) {
      setConfig(null);
      return;
    }

    const fetchPayerConfig = async () => {
      setLoading(true);
      setError(null);

      try {
        // Try to get from localStorage cache first
        const cacheKey = `payer_config_${payerId}`;
        const cached = localStorage.getItem(cacheKey);

        if (cached) {
          const parsedCache = JSON.parse(cached);
          const cacheAge = Date.now() - parsedCache.timestamp;

          // Use cache if less than 1 hour old
          if (cacheAge < 3600000) {
            setConfig(parsedCache.data);
            setLoading(false);
            return;
          }
        }

        // Fetch from API - use database-driven endpoint instead of static config
        const response = await fetch(`/api/database-eligibility/payer/${payerId}/config`);

        if (!response.ok) {
          throw new Error(`Failed to fetch payer config: ${response.statusText}`);
        }

        const apiResponse = await response.json();

        // Extract config from wrapped response
        const configData = apiResponse.config || apiResponse;

        // Map field format from API to React component format
        const mappedConfig = mapApiConfigToComponentFormat(configData);

        // Cache the mapped response
        localStorage.setItem(cacheKey, JSON.stringify({
          data: mappedConfig,
          timestamp: Date.now()
        }));

        setConfig(mappedConfig);
      } catch (err) {
        console.error('Error fetching payer config:', err);
        setError(err.message);

        // Try to use cached version even if expired
        const cacheKey = `payer_config_${payerId}`;
        const cached = localStorage.getItem(cacheKey);
        if (cached) {
          const parsedCache = JSON.parse(cached);
          setConfig(parsedCache.data);
          setError('Using cached configuration (offline)');
        } else {
          // Use fallback config
          setConfig(getFallbackConfig());
          setError('Using default configuration (payer not configured)');
        }
      } finally {
        setLoading(false);
      }
    };

    fetchPayerConfig();
  }, [payerId]);

  return { config, loading, error };
}

/**
 * Fallback configuration when payer is not found
 * Shows all possible fields as "recommended"
 */
function getFallbackConfig() {
  return {
    payerId: 'UNKNOWN',
    payerName: 'Unknown Payer',
    fields: [
      {
        name: 'firstName',
        label: 'First Name',
        type: 'text',
        required: 'required',
        helpText: 'Patient\'s legal first name',
        validationRules: { required: true, minLength: 1 }
      },
      {
        name: 'lastName',
        label: 'Last Name',
        type: 'text',
        required: 'required',
        helpText: 'Patient\'s legal last name',
        validationRules: { required: true, minLength: 1 }
      },
      {
        name: 'dateOfBirth',
        label: 'Date of Birth',
        type: 'date',
        required: 'recommended',
        helpText: 'Format: MM/DD/YYYY',
        validationRules: { required: false }
      },
      {
        name: 'gender',
        label: 'Gender',
        type: 'select',
        options: [
          { value: 'M', label: 'Male' },
          { value: 'F', label: 'Female' },
          { value: 'U', label: 'Unknown' }
        ],
        required: 'recommended',
        helpText: 'Required by most commercial payers',
        validationRules: { required: false }
      },
      {
        name: 'memberNumber',
        label: 'Member ID',
        type: 'text',
        required: 'recommended',
        helpText: 'Insurance member/policy number',
        validationRules: { required: false }
      },
      {
        name: 'medicaidId',
        label: 'Medicaid ID',
        type: 'text',
        required: 'optional',
        helpText: 'State-issued Medicaid ID (if applicable)',
        validationRules: { required: false }
      },
      {
        name: 'groupNumber',
        label: 'Group Number',
        type: 'text',
        required: 'optional',
        helpText: 'Employer group number (if applicable)',
        validationRules: { required: false }
      },
      {
        name: 'subscriberFirstName',
        label: 'Subscriber First Name',
        type: 'text',
        required: 'optional',
        helpText: 'If patient is a dependent',
        validationRules: { required: false }
      },
      {
        name: 'subscriberLastName',
        label: 'Subscriber Last Name',
        type: 'text',
        required: 'optional',
        helpText: 'If patient is a dependent',
        validationRules: { required: false }
      },
      {
        name: 'relationship',
        label: 'Relationship to Subscriber',
        type: 'select',
        options: [
          { value: '01', label: 'Spouse' },
          { value: '18', label: 'Self' },
          { value: '19', label: 'Child' },
          { value: '21', label: 'Unknown' }
        ],
        required: 'optional',
        helpText: 'Patient\'s relationship to policy holder',
        validationRules: { required: false }
      }
    ],
    notes: [
      'Payer configuration not found - showing all possible fields',
      'Contact support to add this payer to the system',
      'Provide as much information as possible for best results'
    ],
    flexibleRequirements: []
  };
}

/**
 * Map API config format to React component format
 * API uses "requirement" field, React components expect "required"
 */
function mapApiConfigToComponentFormat(apiConfig) {
  if (!apiConfig) return null;

  return {
    payerId: apiConfig.payerId,
    payerName: apiConfig.payerName,
    category: apiConfig.category,
    notes: apiConfig.notes ? (Array.isArray(apiConfig.notes) ? apiConfig.notes : [apiConfig.notes]) : [],
    flexibleRequirements: apiConfig.flexibleRequirements || [],
    fields: apiConfig.fields?.map(field => ({
      name: field.name,
      label: field.label,
      type: field.type,
      required: field.requirement || field.required || 'optional', // Map 'requirement' to 'required'
      helpText: field.helpText || '',
      placeholder: field.placeholder || '',
      options: field.options || [],
      validationRules: field.validation || field.validationRules || {}
    })) || []
  };
}

/**
 * Hook to get list of all payers
 */
export function usePayersList() {
  const [payers, setPayers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchPayers = async () => {
      try {
        const response = await fetch('/api/payers/list');
        if (!response.ok) {
          throw new Error('Failed to fetch payers list');
        }
        const data = await response.json();
        setPayers(data.payers || []);
      } catch (err) {
        console.error('Error fetching payers:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchPayers();
  }, []);

  return { payers, loading, error };
}
