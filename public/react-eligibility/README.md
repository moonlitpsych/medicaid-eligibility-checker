# Dynamic React Eligibility Checker

A modern, dynamic React-based universal eligibility checker that adapts form fields based on payer-specific X12 270 requirements.

## Features

- ✅ **Dynamic Field Rendering** - Form fields automatically adjust based on selected payer
- ✅ **Color-Coded Requirements** - Visual indicators for required/recommended/optional fields
- ✅ **IntakeQ Integration** - Auto-fill patient information from IntakeQ
- ✅ **Smart Validation** - Handles flexible "OR" requirements (e.g., DOB OR Medicaid ID)
- ✅ **Real-Time Results** - Displays network status, copays, and estimated costs
- ✅ **Graceful Fallbacks** - Uses cached configs when offline or payer not configured
- ✅ **Requirements Summary** - Shows field requirements after payer selection

## Development

### Prerequisites

- Node.js 18+
- npm or yarn
- Backend API server running on port 3000

### Install Dependencies

```bash
npm install
```

### Run Development Server

```bash
npm run dev
```

The app will be available at http://localhost:5174

The Vite dev server includes:
- Hot module replacement (HMR)
- API proxy to backend (http://localhost:3000)
- Fast refresh for React components

### Build for Production

```bash
npm run build
```

This creates optimized production files in `/dist` directory.

### Preview Production Build

```bash
npm run preview
```

## Project Structure

```
src/
├── components/           # React components
│   ├── EligibilityChecker.jsx    # Main component
│   ├── PayerSelector.jsx         # Payer dropdown with grouping
│   ├── DynamicFormField.jsx      # Field renderer with color coding
│   ├── PatientSearch.jsx         # IntakeQ search & auto-fill
│   ├── RequirementsSummary.jsx   # Field requirements panel
│   └── ResultsDisplay.jsx        # Eligibility results display
├── hooks/                # Custom React hooks
│   ├── usePayerConfig.js         # Fetch payer field requirements
│   ├── useEligibilityCheck.js    # Submit eligibility checks
│   └── useIntakeQSearch.js       # IntakeQ patient search
├── utils/                # Utility functions (future)
├── App.jsx               # Root app component
├── main.jsx              # React entry point
└── index.css             # Global styles with Tailwind

```

## API Endpoints Used

The React app communicates with these backend endpoints:

- `GET /api/payers/list` - Get list of all payers
- `GET /api/universal-eligibility/payer/:payerId/config` - Get payer-specific field config
- `POST /api/database-eligibility/check` - Submit eligibility check
- `GET /api/intakeq/clients/list?search=:query` - Search IntakeQ patients
- `GET /api/intakeq/clients/:clientId` - Get patient details

## Configuration

### Payer Field Configuration

Payer configurations are fetched dynamically from `/api/universal-eligibility/payer/:payerId/config`.

Each config includes:
- `fields` - Array of field definitions with requirement levels
- `flexibleRequirements` - OR conditions for validation
- `notes` - Payer-specific instructions

Example field definition:
```javascript
{
  name: 'firstName',
  label: 'First Name',
  type: 'text',
  required: 'required', // or 'recommended' or 'optional'
  helpText: 'Patient\'s legal first name',
  validationRules: { required: true, minLength: 1 }
}
```

### Tested Payers

The following payers have been tested and verified:
- ✅ Utah Medicaid (UTMCD)
- ✅ Aetna (60054)
- ✅ Regence BCBS Utah (00910)
- ✅ HMHI-BHN (HMHI-BHN)

## Color Coding System

Fields are color-coded based on requirement level:

- **Red** 🔴 - Required fields (must be completed)
- **Yellow** 🟡 - Recommended fields (improve accuracy)
- **Gray** ⚪ - Optional fields (provide if available)

## Smart Validation

The system handles flexible "OR" requirements:

Example: Utah Medicaid accepts "Date of Birth OR Medicaid ID"
- At least one must be provided
- Validation shows helpful message if neither is filled
- Form adapts based on what user provides

## IntakeQ Auto-Fill

When patient is selected from IntakeQ:
1. Search by name or email
2. System fetches full patient record
3. Maps IntakeQ fields to eligibility form fields:
   - `FirstName` → `firstName`
   - `LastName` → `lastName`
   - `DateOfBirth` → `dateOfBirth` (formatted to YYYY-MM-DD)
   - `Gender` → `gender` (mapped to M/F/U)
   - `Phone` → `phone`
   - Custom insurance fields → `memberNumber`, `groupNumber`, `medicaidId`

## Graceful Error Handling

The system includes multiple fallback layers:

1. **Cached Configs** - Payer configs cached in localStorage for 1 hour
2. **Expired Cache Fallback** - Uses expired cache if API fails
3. **Default Config** - Shows all possible fields if payer not configured
4. **Offline Mode** - Works with cached data when backend unavailable

## Testing

### Test Patients

Use these known patients to test the system:

**Deanne Stookey (Regence BCBS)**
- DOB: 1981-09-29
- Member ID: PAM911050467
- Expected: IN_NETWORK, $20 copay

**Jamie Vancleave (Aetna)**
- DOB: 1991-04-13
- Member ID: W269522282
- Expected: IN_NETWORK, $25 PCP / $40 specialist

**Kristine Phillips (Utah Medicaid)**
- DOB: 1982-10-03
- Medicaid ID: 0812735020
- Expected: Active coverage, address returned

## Deployment

### Integration with Express

The production build can be served by the main Express server:

```javascript
// In api-server.js
const path = require('path');

// Serve React app
app.use('/eligibility', express.static(path.join(__dirname, 'public/react-eligibility/dist')));

// Fallback to index.html for client-side routing
app.get('/eligibility/*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public/react-eligibility/dist/index.html'));
});
```

Access at: `http://localhost:3000/eligibility`

### Build Process

```bash
# Navigate to React app directory
cd public/react-eligibility

# Install dependencies (if not already done)
npm install

# Build for production
npm run build

# Preview production build locally (optional)
npm run preview
```

## Troubleshooting

### CORS Issues

If you encounter CORS errors during development, ensure the Vite proxy is configured:

```javascript
// vite.config.js
server: {
  proxy: {
    '/api': {
      target: 'http://localhost:3000',
      changeOrigin: true,
    }
  }
}
```

### Payer Config Not Found

If payer configuration is missing:
1. Check that payer exists in database
2. Verify `/api/universal-eligibility/payer/:payerId/config` endpoint
3. System will show graceful fallback with all fields

### IntakeQ Integration Issues

If patient search fails:
1. Check IntakeQ API key in `.env.local`
2. Verify `/api/intakeq/clients/list` endpoint is working
3. Ensure CORS is properly configured

## Future Enhancements

Potential improvements:
- [ ] Provider NPI selection dropdown (currently hardcoded to Anthony Privratsky)
- [ ] Save recent eligibility checks to localStorage
- [ ] Export results to PDF
- [ ] Bulk eligibility checking
- [ ] Real-time field validation as user types
- [ ] Dark mode support
- [ ] Mobile-responsive improvements

## Support

For issues or questions:
- Check API server logs at `http://localhost:3000`
- Review browser console for client-side errors
- Verify backend is running and healthy
- Check network tab for API request/response details
