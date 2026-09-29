# DatePickerModal Component

A modal date picker component based on Figma design with reasonable defaults.

## Features

- ✅ **28px border radius modal** (as per Figma)
- ✅ **360px width** (as per Figma spec)
- ✅ **Green color scheme** (primary color from your design system)
- ✅ **Past dates disabled**
- ✅ **OK/Cancel/Clear buttons** with full functionality
- ✅ **Date format**: `${startDate}T00:00:00.000Z`
- ✅ **Today highlighted** with ring
- ✅ **Selected date** with green circle
- ✅ **Responsive design**
- ✅ **Uses your app's fonts** (Inter, not Roboto from Figma)

## Usage

```jsx
import DatePickerModal from '@/components/DatePickerModal';
import { useState } from 'react';

function MyComponent() {
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState(null);

  const handleDateSelect = (date) => {
    // date is formatted as `${startDate}T00:00:00.000Z`
    setSelectedDate(date);
    console.log('Selected date:', date);
  };

  return (
    <div>
      <button onClick={() => setIsDatePickerOpen(true)}>
        Open Date Picker
      </button>

      <DatePickerModal
        isOpen={isDatePickerOpen}
        onClose={() => setIsDatePickerOpen(false)}
        onDateSelect={handleDateSelect}
        initialDate={selectedDate ? new Date(selectedDate) : null}
        title="Select rental date"
        supportingText="Choose when you want to rent this item"
      />
    </div>
  );
}
```

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `isOpen` | boolean | required | Controls modal visibility |
| `onClose` | function | required | Called when modal should close |
| `onDateSelect` | function | required | Called with formatted date string `${startDate}T00:00:00.000Z` |
| `initialDate` | Date \| null | null | Initial selected date |
| `title` | string | "Select date" | Modal title |
| `supportingText` | string | "Choose a date for your rental" | Supporting text below title |

## Design Specifications

Based on Figma design analysis:

### Dimensions
- **Modal width**: 360px
- **Border radius**: 28px
- **Day cell size**: ~40px × 40px
- **Header height**: 120px

### Colors
- **Primary**: Green (`#10B981` from your design system)
- **Text**: Dark gray (`#1F2937`)
- **Background**: White
- **Today ring**: Light gray border (`#D1D5DB`)
- **Disabled dates**: Light gray (`#9CA3AF`)

### Typography
- **Font family**: Inter (your app's font, not Roboto from Figma)
- **Heading**: 32px
- **Labels**: 14px
- **Day numbers**: 16px

## Testing

Visit `/test/datepicker` to see a standalone test page with:
- Component demo
- Design specifications
- Integration instructions

## Integration with ItemDetail.jsx

To integrate with your rental modal:

1. Add state for date picker visibility
2. Add state for selected date
3. Add button to trigger date picker
4. Pass selected date to your rental booking API

Example integration snippet:

```jsx
// In ItemDetail.jsx rental section
const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
const [rentalDate, setRentalDate] = useState(null);

// When booking rental
const handleRentalBooking = () => {
  if (!rentalDate) {
    alert('Please select a rental date');
    return;
  }
  
  // rentalDate is already formatted as `${startDate}T00:00:00.000Z`
  api.bookRental(itemId, rentalDate, ...otherParams);
};

// Render
<DatePickerModal
  isOpen={isDatePickerOpen}
  onClose={() => setIsDatePickerOpen(false)}
  onDateSelect={setRentalDate}
  initialDate={rentalDate ? new Date(rentalDate) : null}
  title="Select rental date"
  supportingText={`Choose when you want to rent "${itemTitle}"`}
/>
```

## Customization

The component uses your app's design system variables:
- `--primary` for green colors
- `--font-sans` for Inter font
- `--radius` for border radii (overridden to 28px for modal)

To customize, modify the CSS classes in the component or extend the theme in your `index.css`.