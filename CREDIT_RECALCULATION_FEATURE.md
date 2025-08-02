# Credit Recalculation System

## Overview
The customer management system now automatically recalculates credits when payment dates are changed, ensuring accurate tracking of service credits based on actual service duration.

## How It Works

### Automatic Credit Recalculation
When a payment date is modified in either the Customer Detail page or Edit Customer page:

1. **Service Duration Calculation**: The system calculates how many months have passed since the new payment date
2. **Credit Adjustment**: Credits are automatically adjusted based on the time elapsed
3. **Visual Feedback**: A notification appears confirming the recalculation
4. **Expiry Date Update**: The service expiry date is also updated based on the new payment date

### Key Features

#### 1. Real-time Recalculation
- Credits update instantly when payment date changes
- No need to manually recalculate or refresh the page
- Visual toast notification confirms the action

#### 2. Smart Credit Logic
- **Already Given**: Calculated based on months of service provided since payment date
- **Remaining Credits**: Total credit minus already given amount
- **Service Price**: Defaults to $25/month (configurable)

#### 3. Multiple Update Points
- **Customer Detail Page**: Edit mode allows payment date changes
- **Edit Customer Page**: Full editing interface with credit recalculation

### Example Scenario

**Initial State:**
- Payment Date: January 1, 2024
- Service Duration: 12 months
- Total Credit: $500.00
- Already Given: $125.00 (5 months × $25)
- Remaining Credits: $375.00

**After Changing Payment Date to March 1, 2024:**
- Payment Date: March 1, 2024
- Service Duration: 12 months (unchanged)
- Total Credit: $500.00 (unchanged)
- Already Given: $75.00 (3 months × $25)
- Remaining Credits: $425.00
- Expiry Date: Updated to March 1, 2025

### Technical Implementation

#### Files Modified:
1. `src/data/customersDB.ts` - Added credit recalculation functions
2. `src/pages/CustomerDetail.tsx` - Enhanced with automatic recalculation
3. `src/pages/EditCustomer.tsx` - Added recalculation on payment date change
4. `src/components/common/ToastNotification.tsx` - Added notification system

#### Key Functions:
- `calculateCustomerCredits()` - Core credit calculation logic
- `recalculateCreditsOnPaymentDateChange()` - Handles payment date changes
- Toast notification system for user feedback

### Benefits

1. **Accuracy**: Ensures credits reflect actual service usage
2. **Efficiency**: Automatic calculations reduce manual errors
3. **Transparency**: Clear notifications show when recalculation occurs
4. **Flexibility**: Works with different service durations and pricing

### Usage Tips

1. **Payment Date Changes**: Simply update the payment date field - credits recalculate automatically
2. **Service Duration**: Modify service duration to see how it affects credit calculations
3. **Validation**: The system prevents negative credits and handles edge cases
4. **Visual Feedback**: Look for the blue notification confirming recalculation

This feature ensures that customer credits accurately reflect the services provided, especially important when payment dates need to be adjusted retroactively.
