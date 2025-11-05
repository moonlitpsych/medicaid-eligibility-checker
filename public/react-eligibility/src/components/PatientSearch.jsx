import React, { useState, useEffect, useRef } from 'react';
import { useIntakeQSearch } from '../hooks/useIntakeQSearch';

/**
 * PatientSearch - Search IntakeQ for patients and auto-fill form
 * @param {Function} onPatientSelect - Callback when patient is selected with mapped data
 */
export default function PatientSearch({ onPatientSelect }) {
  const [query, setQuery] = useState('');
  const [showResults, setShowResults] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const { searchPatients, getPatientDetails, mapPatientToFormData, clearSearch, patients, loading } = useIntakeQSearch();
  const searchRef = useRef(null);

  // Debounce search
  useEffect(() => {
    // Don't search if we just selected a patient
    if (selectedPatient) {
      return;
    }

    if (query.length < 2) {
      setShowResults(false);
      return;
    }

    const timeoutId = setTimeout(() => {
      searchPatients(query);
      setShowResults(true);
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [query, selectedPatient]);

  // Click outside to close results
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (searchRef.current && !searchRef.current.contains(event.target)) {
        setShowResults(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelectPatient = async (patient) => {
    try {
      // The search results already include all the data we need!
      // No need to fetch patient details again from IntakeQ API

      // Map to form data directly from search results
      const formData = mapPatientToFormData(patient);

      // Call parent callback with mapped data
      onPatientSelect(formData, patient);

      // Update search display (handle both field name formats)
      const firstName = patient.FirstName || patient.first_name || '';
      const lastName = patient.LastName || patient.last_name || '';

      // Set selected patient flag to prevent re-searching
      setSelectedPatient(patient);
      setQuery(`${firstName} ${lastName}`);
      setShowResults(false);
      clearSearch(); // Clear the search results
    } catch (error) {
      console.error('Error selecting patient:', error);
      alert(`Failed to load patient details: ${error.message}`);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString();
  };

  const handleSyncIntakeQ = async () => {
    setSyncing(true);
    try {
      const response = await fetch('/api/intakeq/clients/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });

      if (!response.ok) {
        throw new Error('Failed to sync IntakeQ clients');
      }

      const data = await response.json();
      alert(`✅ Synced ${data.results.updated} IntakeQ clients to database!`);

      // Refresh search results if there's a query
      if (query.length >= 2) {
        searchPatients(query);
      }
    } catch (error) {
      console.error('Error syncing IntakeQ:', error);
      alert(`Failed to sync: ${error.message}`);
    } finally {
      setSyncing(false);
    }
  };

  return (
    <div className="form-field relative" ref={searchRef}>
      <div className="flex justify-between items-center mb-1">
        <label
          htmlFor="patientSearch"
          className="block text-sm font-medium text-gray-700"
        >
          Search IntakeQ Patient (Optional)
        </label>

        <button
          type="button"
          onClick={handleSyncIntakeQ}
          disabled={syncing}
          className="text-xs px-3 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700
                     rounded-md border border-blue-200 disabled:opacity-50
                     disabled:cursor-not-allowed transition-colors"
          title="Sync latest patients from IntakeQ"
        >
          {syncing ? '⏳ Syncing...' : '🔄 Sync IntakeQ'}
        </button>
      </div>

      <div className="relative">
        <input
          id="patientSearch"
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            // Clear selected patient when user types to enable new search
            if (selectedPatient) {
              setSelectedPatient(null);
            }
          }}
          placeholder="Search by name or email..."
          className="w-full px-4 py-2 pl-10 border border-gray-300 rounded-lg
                     focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />

        {/* Search icon */}
        <div className="absolute left-3 top-1/2 transform -translate-y-1/2">
          <svg
            className={`w-5 h-5 ${loading ? 'text-blue-500 animate-spin' : 'text-gray-400'}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            {loading ? (
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            ) : (
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            )}
          </svg>
        </div>

        {/* Clear button */}
        {query && (
          <button
            type="button"
            onClick={() => {
              setQuery('');
              setShowResults(false);
              setSelectedPatient(null);
              clearSearch();
            }}
            className="absolute right-3 top-1/2 transform -translate-y-1/2
                       text-gray-400 hover:text-gray-600"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        )}
      </div>

      <p className="help-text">
        Auto-fill form from existing IntakeQ patient records
      </p>

      {/* Search Results Dropdown */}
      {showResults && patients.length > 0 && (
        <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-64 overflow-y-auto">
          {patients.map((patient) => (
            <button
              key={patient.intakeq_client_id || patient.Id || patient.ClientId}
              type="button"
              onClick={() => handleSelectPatient(patient)}
              className="w-full px-4 py-3 text-left hover:bg-blue-50 border-b border-gray-100
                         focus:bg-blue-50 focus:outline-none transition-colors"
            >
              <div className="flex justify-between items-start">
                <div>
                  <div className="font-medium text-gray-900">
                    {patient.FirstName || patient.first_name} {patient.LastName || patient.last_name}
                  </div>
                  <div className="text-sm text-gray-600">
                    {patient.Email || patient.email}
                  </div>
                  {(patient.DateOfBirth || patient.date_of_birth) && (
                    <div className="text-xs text-gray-500 mt-1">
                      DOB: {formatDate(patient.DateOfBirth || patient.date_of_birth)}
                    </div>
                  )}
                </div>
                <div className="text-xs text-blue-600 font-medium">
                  Select →
                </div>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* No Results */}
      {showResults && patients.length === 0 && !loading && query.length >= 2 && (
        <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg p-4">
          <div className="text-center text-gray-500 text-sm">
            <svg
              className="w-12 h-12 mx-auto text-gray-400 mb-2"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            No patients found matching "{query}"
          </div>
        </div>
      )}
    </div>
  );
}
