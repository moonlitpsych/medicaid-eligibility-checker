import { useState } from 'react';

/**
 * Custom hook to search IntakeQ patients and fetch patient details
 * @returns {Object} - { searchPatients, getPatientDetails, patients, loading, error }
 */
export function useIntakeQSearch() {
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  /**
   * Search for patients by name or email
   * @param {string} query - Search query (name or email)
   */
  const searchPatients = async (query) => {
    if (!query || query.trim().length < 2) {
      setPatients([]);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/intakeq/clients/list?search=${encodeURIComponent(query)}`);

      if (!response.ok) {
        throw new Error(`Failed to search patients: ${response.statusText}`);
      }

      const data = await response.json();
      setPatients(data.clients || []);
    } catch (err) {
      console.error('Error searching patients:', err);
      setError(err.message);
      setPatients([]);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Get detailed information for a specific patient
   * @param {string} clientId - IntakeQ client ID
   * @returns {Promise<Object>} - Patient details
   */
  const getPatientDetails = async (clientId) => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/intakeq/clients/${clientId}`);

      if (!response.ok) {
        throw new Error(`Failed to fetch patient details: ${response.statusText}`);
      }

      const data = await response.json();
      return data;
    } catch (err) {
      console.error('Error fetching patient details:', err);
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  /**
   * Map IntakeQ patient data to eligibility form fields
   * Handles both PascalCase (API) and snake_case (database) field names
   * @param {Object} patient - IntakeQ patient object
   * @returns {Object} - Mapped form data
   */
  const mapPatientToFormData = (patient) => {
    const formData = {};

    // Map basic demographics - handle both PascalCase and snake_case
    if (patient.FirstName || patient.first_name) {
      formData.firstName = patient.FirstName || patient.first_name;
    }
    if (patient.LastName || patient.last_name) {
      formData.lastName = patient.LastName || patient.last_name;
    }

    // Handle date of birth in various formats
    const dob = patient.DateOfBirth || patient.date_of_birth;
    if (dob) {
      // Handle ISO format or YYYY-MM-DD format
      formData.dateOfBirth = dob.split('T')[0];
    }

    // Handle gender
    const gender = patient.Gender || patient.gender;
    if (gender) {
      // Map gender values
      const genderMap = {
        'Male': 'M',
        'Female': 'F',
        'Other': 'U',
        'Unknown': 'U',
        'M': 'M',
        'F': 'F',
        'U': 'U'
      };
      formData.gender = genderMap[gender] || 'U';
    }

    // Phone and email
    if (patient.Phone || patient.phone) {
      formData.phone = patient.Phone || patient.phone;
    }
    if (patient.Email || patient.email) {
      formData.email = patient.Email || patient.email;
    }

    // Address fields (if needed)
    if (patient.StreetAddress || patient.street_address) {
      formData.streetAddress = patient.StreetAddress || patient.street_address;
    }
    if (patient.City || patient.city) {
      formData.city = patient.City || patient.city;
    }
    if (patient.State || patient.state) {
      formData.state = patient.State || patient.state;
    }
    if (patient.ZipCode || patient.zip_code) {
      formData.zipCode = patient.ZipCode || patient.zip_code;
    }

    // Try to extract insurance information from database fields or custom fields
    if (patient.primary_insurance_policy_number) {
      // Map to both memberNumber and medicaidId for compatibility with different payers
      formData.memberNumber = patient.primary_insurance_policy_number;
      formData.medicaidId = patient.primary_insurance_policy_number;
    }
    if (patient.primary_insurance_name) {
      // Store for reference but don't map to form
      formData._insuranceName = patient.primary_insurance_name;
    }

    // Also check for current_member_id from enhanced parser
    if (patient.current_member_id) {
      formData.memberNumber = patient.current_member_id;
      formData.medicaidId = patient.current_member_id;
    }

    // Try custom fields if available
    if (patient.CustomFields) {
      // Look for common insurance field names
      const insuranceFields = patient.CustomFields.filter(field =>
        field.Name && (
          field.Name.toLowerCase().includes('insurance') ||
          field.Name.toLowerCase().includes('member') ||
          field.Name.toLowerCase().includes('policy') ||
          field.Name.toLowerCase().includes('group')
        )
      );

      insuranceFields.forEach(field => {
        const name = field.Name.toLowerCase();
        if (name.includes('member') || name.includes('policy')) {
          formData.memberNumber = field.Value;
        } else if (name.includes('group')) {
          formData.groupNumber = field.Value;
        } else if (name.includes('medicaid')) {
          formData.medicaidId = field.Value;
        }
      });
    }

    return formData;
  };

  const clearSearch = () => {
    setPatients([]);
    setError(null);
  };

  return {
    searchPatients,
    getPatientDetails,
    mapPatientToFormData,
    clearSearch,
    patients,
    loading,
    error
  };
}
