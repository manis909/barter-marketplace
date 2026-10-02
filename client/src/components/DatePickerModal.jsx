import React, { useState } from 'react';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { format } from 'date-fns';
import { CalendarIcon, X, Check, Trash2 } from 'lucide-react';

const DatePickerModal = ({ 
  isOpen, 
  onClose, 
  onDateSelect,
  initialDate = null,
  title = "Select date",
  supportingText = "Choose a date for your rental"
}) => {
  const [selectedDate, setSelectedDate] = useState(initialDate);
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);

  // Format: ${startDate}T00:00:00.000Z
  const formatDateForAPI = (date) => {
    if (!date) return null;
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}T00:00:00.000Z`;
  };

  const handleOK = () => {
    if (selectedDate) {
      const formattedDate = formatDateForAPI(selectedDate);
      onDateSelect(formattedDate);
    }
    onClose();
  };

  const handleCancel = () => {
    setSelectedDate(initialDate);
    onClose();
  };

  const handleClear = () => {
    setSelectedDate(null);
  };

  const handleDateSelect = (date) => {
    if (date) {
      setSelectedDate(date);
      // Auto-close calendar after selection
      setIsCalendarOpen(false);
    }
  };

  // Disable past dates
  const isDateDisabled = (date) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return date < today;
  };

  // Format for display
  const formatDisplayDate = (date) => {
    if (!date) return "No date selected";
    return format(date, 'EEE, MMM d');
  };

  const formatFullDate = (date) => {
    if (!date) return "Select a date";
    return format(date, 'MMMM d, yyyy');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <Card className="w-full max-w-[360px] rounded-[28px] border-0 shadow-2xl bg-white">
        {/* Header */}
        <CardHeader className="pb-4 pt-6 px-6 border-b border-gray-100">
          <div className="space-y-1">
            <p className="text-sm font-medium text-gray-500">
              {supportingText}
            </p>
            <div className="flex items-center justify-between">
              <h3 className="text-2xl font-semibold text-gray-900">
                {formatDisplayDate(selectedDate)}
              </h3>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleCancel}
                className="h-8 w-8 rounded-full hover:bg-gray-100"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>

        {/* Content */}
        <CardContent className="p-6">
          <div className="space-y-6">
            {/* Date display */}
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl">
              <div>
                <p className="text-sm text-gray-500">Selected date</p>
                <p className="text-2xl font-semibold text-gray-900">
                  {formatFullDate(selectedDate)}
                </p>
              </div>
              <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="h-12 w-12 rounded-xl border-2 border-gray-200 hover:border-green-500 hover:bg-green-50"
                  >
                    <CalendarIcon className="h-5 w-5 text-gray-600" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent 
                  className="w-auto p-0 rounded-2xl border-0 shadow-2xl" 
                  align="end"
                >
                  <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={handleDateSelect}
                    disabled={isDateDisabled}
                    initialFocus
                    className="rounded-2xl p-4"
                    classNames={{
                      months: "flex flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0",
                      month: "space-y-4",
                      caption: "flex justify-center pt-1 relative items-center",
                      caption_label: "text-sm font-medium",
                      nav: "space-x-1 flex items-center",
                      nav_button: "h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100",
                      nav_button_previous: "absolute left-1",
                      nav_button_next: "absolute right-1",
                      table: "w-full border-collapse space-y-1",
                      head_row: "flex",
                      head_cell: "text-gray-500 rounded-md w-9 font-normal text-[0.8rem]",
                      row: "flex w-full mt-2",
                      cell: "h-9 w-9 text-center text-sm p-0 relative [&:has([aria-selected].day-range-end)]:rounded-r-md [&:has([aria-selected].day-outside)]:bg-gray-100/50 [&:has([aria-selected])]:bg-green-50 first:[&:has([aria-selected])]:rounded-l-md last:[&:has([aria-selected])]:rounded-r-md focus-within:relative focus-within:z-20",
                      day: "h-9 w-9 p-0 font-normal aria-selected:opacity-100",
                      day_selected: "bg-green-500 text-white hover:bg-green-600 focus:bg-green-500 rounded-full",
                      day_today: "border-2 border-green-300 rounded-full",
                      day_outside: "text-gray-400 opacity-50",
                      day_disabled: "text-gray-300 opacity-50",
                      day_range_middle: "aria-selected:bg-green-100 aria-selected:text-green-900",
                      day_hidden: "invisible",
                    }}
                  />
                </PopoverContent>
              </Popover>
            </div>

            {/* Calendar preview */}
            <div className="bg-gray-50 rounded-2xl p-4">
              <div className="grid grid-cols-7 gap-1 mb-2">
                {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, i) => (
                  <div key={i} className="text-center text-sm font-medium text-gray-500 py-2">
                    {day}
                  </div>
                ))}
              </div>
              <p className="text-sm text-gray-600 text-center">
                Tap the calendar icon to pick a date
              </p>
            </div>
          </div>
        </CardContent>

        {/* Footer */}
        <CardFooter className="flex gap-3 p-6 pt-4 border-t border-gray-100">
          <Button
            variant="outline"
            onClick={handleClear}
            className="flex-1 h-12 rounded-xl border-2 border-gray-200 hover:border-gray-300 hover:bg-gray-50 text-gray-700"
            disabled={!selectedDate}
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Clear
          </Button>
          <Button
            variant="outline"
            onClick={handleCancel}
            className="flex-1 h-12 rounded-xl border-2 border-gray-200 hover:border-gray-300 hover:bg-gray-50 text-gray-700"
          >
            Cancel
          </Button>
          <Button
            onClick={handleOK}
            className="flex-1 h-12 rounded-xl bg-green-500 hover:bg-green-600 text-white"
            disabled={!selectedDate}
          >
            <Check className="h-4 w-4 mr-2" />
            OK
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
};

export default DatePickerModal;