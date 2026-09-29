import React, { useState } from 'react';
import DatePickerModal from '@/components/DatePickerModal';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Calendar } from 'lucide-react';

const DatePickerTest = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState(null);

  const handleDateSelect = (date) => {
    console.log('Selected date:', date);
    setSelectedDate(date);
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="text-2xl flex items-center gap-2">
              <Calendar className="h-6 w-6" />
              Date Picker Modal Test
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600 mb-4">
              This is a standalone test of the DatePickerModal component based on your Figma design.
              The component uses reasonable defaults based on your design system.
            </p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Design Specs */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Design Specifications</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="space-y-2">
                    <h4 className="font-medium">Colors:</h4>
                    <div className="flex items-center gap-2">
                      <div className="h-4 w-4 rounded-full bg-green-500"></div>
                      <span>Primary (Green): #10B981</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="h-4 w-4 rounded-full bg-gray-900"></div>
                      <span>Text: #1F2937</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="h-4 w-4 rounded-full bg-gray-300 border border-gray-400"></div>
                      <span>Today Ring: #D1D5DB border</span>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <h4 className="font-medium">Sizing:</h4>
                    <ul className="list-disc pl-5 text-sm text-gray-600">
                      <li>Modal: 360px × 524px</li>
                      <li>Border radius: 28px</li>
                      <li>Day cells: ~40px × 40px</li>
                      <li>Header: 120px height</li>
                    </ul>
                  </div>
                  
                  <div className="space-y-2">
                    <h4 className="font-medium">Typography:</h4>
                    <ul className="list-disc pl-5 text-sm text-gray-600">
                      <li>Font: Inter (your app's font)</li>
                      <li>Heading: 32px</li>
                      <li>Labels: 14px</li>
                      <li>Day numbers: 16px</li>
                    </ul>
                  </div>
                </CardContent>
              </Card>
              
              {/* Test Controls */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Test Controls</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <p className="text-sm text-gray-600">
                      Current selected date: <strong>{selectedDate || 'None'}</strong>
                    </p>
                    <Button 
                      onClick={() => setIsModalOpen(true)}
                      className="w-full h-12 bg-green-500 hover:bg-green-600"
                    >
                      Open Date Picker Modal
                    </Button>
                    
                    <div className="mt-4 p-4 bg-gray-100 rounded-lg">
                      <h4 className="font-medium mb-2">Features implemented:</h4>
                      <ul className="list-disc pl-5 text-sm space-y-1">
                        <li>Past dates disabled</li>
                        <li>OK/Cancel/Clear buttons working</li>
                        <li>Date format: `${startDate}T00:00:00.000Z`</li>
                        <li>Today highlighted with ring</li>
                        <li>Selected date with green circle</li>
                        <li>28px border radius modal</li>
                        <li>360px width (as per Figma)</li>
                      </ul>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </CardContent>
        </Card>
        
        {/* Instructions */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Integration Instructions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <h4 className="font-medium mb-2">To use in ItemDetail.jsx:</h4>
                <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg text-sm overflow-x-auto">
{`import DatePickerModal from '@/components/DatePickerModal';
import { useState } from 'react';

// In your component:
const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
const [selectedDate, setSelectedDate] = useState(null);

const handleDateSelect = (date) => {
  // date is formatted as \`\${startDate}T00:00:00.000Z\`
  setSelectedDate(date);
  // Send to your API or state management
};

// Render:
<DatePickerModal
  isOpen={isDatePickerOpen}
  onClose={() => setIsDatePickerOpen(false)}
  onDateSelect={handleDateSelect}
  initialDate={selectedDate}
  title="Select rental date"
  supportingText="Choose when you want to rent this item"
/>`}
                </pre>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
      
      {/* The Modal */}
      <DatePickerModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onDateSelect={handleDateSelect}
        initialDate={selectedDate ? new Date(selectedDate) : null}
        title="Test Date Picker"
        supportingText="Select a date to test the component"
      />
    </div>
  );
};

export default DatePickerTest;