import { useState, useEffect } from 'react';

interface CalendarEvent {
  id: string;
  title: string;
  description?: string;
  date: string;
  time: string;
  endTime?: string;
  type: 'meeting' | 'deadline' | 'presentation' | 'review' | 'event' | 'personal';
  color: string;
  recurring?: 'none' | 'daily' | 'weekly' | 'monthly';
  location?: string;
}

interface EventFormData {
  title: string;
  description: string;
  date: string;
  time: string;
  endTime: string;
  type: CalendarEvent['type'];
  recurring: CalendarEvent['recurring'];
  location: string;
}

const Calendar = () => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<'month' | 'week' | 'day'>('month');
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [isAddEventModalOpen, setIsAddEventModalOpen] = useState(false);
  const [isEditEventModalOpen, setIsEditEventModalOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [eventFormData, setEventFormData] = useState<EventFormData>({
    title: '',
    description: '',
    date: new Date().toISOString().split('T')[0], // Set to today's date
    time: '',
    endTime: '',
    type: 'meeting',
    recurring: 'none',
    location: ''
  });

  // Load events from localStorage on mount
  useEffect(() => {
    const savedEvents = localStorage.getItem('calendarEvents');
    if (savedEvents) {
      setEvents(JSON.parse(savedEvents));
    } else {
      // Default events if none exist
      const defaultEvents: CalendarEvent[] = [
        { id: '1', title: 'Team Meeting', date: '2025-07-15', time: '10:00', endTime: '11:00', type: 'meeting', color: 'bg-blue-500', description: 'Weekly team standup meeting' },
        { id: '2', title: 'Project Deadline', date: '2025-07-18', time: '23:59', type: 'deadline', color: 'bg-red-500', description: 'Final submission deadline' },
        { id: '3', title: 'Client Presentation', date: '2025-07-20', time: '14:00', endTime: '15:30', type: 'presentation', color: 'bg-green-500', description: 'Q4 results presentation' },
        { id: '4', title: 'Code Review', date: '2025-07-22', time: '15:30', endTime: '16:30', type: 'review', color: 'bg-yellow-500', description: 'Frontend code review session' },
        { id: '5', title: 'Launch Event', date: '2025-07-25', time: '09:00', endTime: '17:00', type: 'event', color: 'bg-purple-500', description: 'Product launch event' },
      ];
      setEvents(defaultEvents);
      localStorage.setItem('calendarEvents', JSON.stringify(defaultEvents));
    }
  }, []);

  // Save events to localStorage whenever events change
  useEffect(() => {
    localStorage.setItem('calendarEvents', JSON.stringify(events));
  }, [events]);

  // Helper function to calculate duration between two times
  const calculateDuration = (startTime: string, endTime: string): string => {
    if (!startTime || !endTime) return '';
    
    const [startHour, startMinute] = startTime.split(':').map(Number);
    const [endHour, endMinute] = endTime.split(':').map(Number);
    
    const startTotalMinutes = startHour * 60 + startMinute;
    const endTotalMinutes = endHour * 60 + endMinute;
    
    let durationMinutes = endTotalMinutes - startTotalMinutes;
    
    // Handle cases where end time is next day
    if (durationMinutes < 0) {
      durationMinutes += 24 * 60;
    }
    
    const hours = Math.floor(durationMinutes / 60);
    const minutes = durationMinutes % 60;
    
    if (hours === 0) {
      return `${minutes}m`;
    } else if (minutes === 0) {
      return `${hours}h`;
    } else {
      return `${hours}h ${minutes}m`;
    }
  };

  // Event management functions
  const addEvent = (eventData: EventFormData) => {
    const newEvent: CalendarEvent = {
      id: Date.now().toString(),
      title: eventData.title,
      description: eventData.description,
      date: eventData.date,
      time: eventData.time,
      endTime: eventData.endTime,
      type: eventData.type,
      recurring: eventData.recurring,
      location: eventData.location,
      color: getEventColor(eventData.type)
    };
    
    setEvents(prev => [...prev, newEvent]);
    setIsAddEventModalOpen(false);
    resetEventForm();
  };

  const editEvent = (eventData: EventFormData) => {
    if (!selectedEvent) return;
    
    const updatedEvent: CalendarEvent = {
      ...selectedEvent,
      title: eventData.title,
      description: eventData.description,
      date: eventData.date,
      time: eventData.time,
      endTime: eventData.endTime,
      type: eventData.type,
      recurring: eventData.recurring,
      location: eventData.location,
      color: getEventColor(eventData.type)
    };
    
    setEvents(prev => prev.map(event => 
      event.id === selectedEvent.id ? updatedEvent : event
    ));
    setIsEditEventModalOpen(false);
    setSelectedEvent(null);
    resetEventForm();
  };

  const deleteEvent = (eventId: string) => {
    setEvents(prev => prev.filter(event => event.id !== eventId));
    setIsEditEventModalOpen(false);
    setSelectedEvent(null);
  };

  const getEventColor = (type: CalendarEvent['type']) => {
    switch (type) {
      case 'meeting': return 'bg-blue-500';
      case 'deadline': return 'bg-red-500';
      case 'presentation': return 'bg-green-500';
      case 'review': return 'bg-yellow-500';
      case 'event': return 'bg-purple-500';
      case 'personal': return 'bg-pink-500';
      default: return 'bg-gray-500';
    }
  };

  const resetEventForm = () => {
    setEventFormData({
      title: '',
      description: '',
      date: new Date().toISOString().split('T')[0], // Reset to today's date
      time: '',
      endTime: '',
      type: 'meeting',
      recurring: 'none',
      location: ''
    });
  };

  const openAddEventModal = (date?: string) => {
    if (date) {
      setEventFormData(prev => ({ ...prev, date }));
    }
    setIsAddEventModalOpen(true);
  };

  const openEditEventModal = (event: CalendarEvent) => {
    setSelectedEvent(event);
    setEventFormData({
      title: event.title,
      description: event.description || '',
      date: event.date,
      time: event.time,
      endTime: event.endTime || '',
      type: event.type,
      recurring: event.recurring || 'none',
      location: event.location || ''
    });
    setIsEditEventModalOpen(true);
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedEvent) {
      editEvent(eventFormData);
    } else {
      addEvent(eventFormData);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    
    // Special handling for time fields to provide validation
    if (name === 'time' || name === 'endTime') {
      setEventFormData(prev => {
        const newData = { ...prev, [name]: value };
        
        // If both start and end time are set, validate that end time is after start time
        if (newData.time && newData.endTime) {
          const [startHour, startMinute] = newData.time.split(':').map(Number);
          const [endHour, endMinute] = newData.endTime.split(':').map(Number);
          
          const startTotalMinutes = startHour * 60 + startMinute;
          const endTotalMinutes = endHour * 60 + endMinute;
          
          // If end time is before start time (same day), show warning but allow it
          if (endTotalMinutes <= startTotalMinutes) {
            console.warn('End time should be after start time');
          }
        }
        
        return newData;
      });
    } else {
      setEventFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const todayEvents = events.filter(event => {
    const eventDate = new Date(event.date);
    const today = new Date();
    return eventDate.toDateString() === today.toDateString();
  });

  const upcomingEvents = events.filter(event => {
    const eventDate = new Date(event.date);
    const today = new Date();
    return eventDate > today;
  }).slice(0, 5);

  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  const getDaysInMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth(), 1).getDay();
  };

  const getDaysArray = () => {
    const daysInMonth = getDaysInMonth(currentDate);
    const startingDayOfWeek = getFirstDayOfMonth(currentDate);
    const days: (number | null)[] = [];
    
    // Add empty cells for days before the first day of the month
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null);
    }
    
    // Add days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      days.push(day);
    }
    
    return days;
  };

  const navigateMonth = (direction: 'prev' | 'next') => {
    setCurrentDate(prev => {
      const newDate = new Date(prev);
      if (direction === 'prev') {
        newDate.setMonth(newDate.getMonth() - 1);
      } else {
        newDate.setMonth(newDate.getMonth() + 1);
      }
      return newDate;
    });
  };

  const getEventsForDate = (day: number) => {
    const dateStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return events.filter(event => event.date === dateStr);
  };

  const formatTime = (time: string) => {
    const [hours, minutes] = time.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${minutes} ${ampm}`;
  };

  const handleDateClick = (day: number) => {
    const dateStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    openAddEventModal(dateStr);
  };

  const getEventTypeIcon = (type: string) => {
    switch (type) {
      case 'meeting':
        return (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
          </svg>
        );
      case 'deadline':
        return (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
      case 'presentation':
        return (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 4V2a1 1 0 011-1h8a1 1 0 011 1v2M7 4H5a2 2 0 00-2 2v10a2 2 0 002 2h14a2 2 0 002-2V6a2 2 0 00-2-2h-2M7 4v4l3 3 3-3V4" />
          </svg>
        );
      case 'review':
        return (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
      case 'event':
        return (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        );
      case 'personal':
        return (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
        );
      default:
        return null;
    }
  };

  // Event Modal Component
  const EventModal = ({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) => {
    // Handle keyboard navigation
    useEffect(() => {
      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
          onClose();
        }
      };

      if (isOpen) {
        document.addEventListener('keydown', handleKeyDown);
        // Focus management
        const firstInput = document.querySelector('input[name="title"]') as HTMLInputElement;
        if (firstInput) {
          setTimeout(() => firstInput.focus(), 100);
        }
      }

      return () => {
        document.removeEventListener('keydown', handleKeyDown);
      };
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md mx-4 max-h-[90vh] overflow-y-auto">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              {selectedEvent ? 'Edit Event' : 'Add New Event'}
            </h2>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <form onSubmit={handleFormSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Event Title *
              </label>
              <input
                type="text"
                name="title"
                value={eventFormData.title}
                onChange={handleInputChange}
                required
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white transition-all duration-200 text-base font-medium"
                placeholder="Enter event title..."
                maxLength={100}
              />
              <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                {eventFormData.title.length}/100 characters
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Description
              </label>
              <textarea
                name="description"
                value={eventFormData.description}
                onChange={handleInputChange}
                rows={3}
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white transition-all duration-200 text-base resize-none"
                placeholder="Enter event description..."
                maxLength={500}
              />
              <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                {eventFormData.description.length}/500 characters
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Date *
                </label>
                <div className="relative">
                  <input
                    type="date"
                    name="date"
                    value={eventFormData.date}
                    onChange={handleInputChange}
                    required
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white transition-all duration-200 text-base font-medium"
                  />
                  <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                    <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Event Type *
                </label>
                <div className="relative">
                  <select
                    name="type"
                    value={eventFormData.type}
                    onChange={handleInputChange}
                    required
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white transition-all duration-200 text-base font-medium appearance-none"
                  >
                    <option value="meeting">Meeting</option>
                    <option value="deadline">Deadline</option>
                    <option value="presentation">Presentation</option>
                    <option value="review">Review</option>
                    <option value="event">Event</option>
                    <option value="personal">Personal</option>
                  </select>
                  <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                    <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Start Time *
                </label>
                <input
                  type="time"
                  name="time"
                  value={eventFormData.time}
                  onChange={handleInputChange}
                  required
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white transition-all duration-200 text-base font-medium"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  End Time
                </label>
                <input
                  type="time"
                  name="endTime"
                  value={eventFormData.endTime}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white transition-all duration-200 text-base font-medium"
                />
                {eventFormData.time && eventFormData.endTime && (
                  <div className="text-xs mt-1">
                    {(() => {
                      const [startHour, startMinute] = eventFormData.time.split(':').map(Number);
                      const [endHour, endMinute] = eventFormData.endTime.split(':').map(Number);
                      const startTotalMinutes = startHour * 60 + startMinute;
                      const endTotalMinutes = endHour * 60 + endMinute;
                      
                      if (endTotalMinutes <= startTotalMinutes) {
                        return (
                          <span className="text-amber-600 dark:text-amber-400">
                            ⚠️ End time should be after start time
                          </span>
                        );
                      } else {
                        return (
                          <span className="text-gray-500 dark:text-gray-400">
                            Duration: {calculateDuration(eventFormData.time, eventFormData.endTime)}
                          </span>
                        );
                      }
                    })()}
                  </div>
                )}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Location
              </label>
              <div className="relative">
                <input
                  type="text"
                  name="location"
                  value={eventFormData.location}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white transition-all duration-200 text-base"
                  placeholder="Enter event location..."
                  maxLength={100}
                />
                <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                  <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </div>
              </div>
              {eventFormData.location && (
                <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  {eventFormData.location.length}/100 characters
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Recurring
              </label>
              <div className="relative">
                <select
                  name="recurring"
                  value={eventFormData.recurring}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white transition-all duration-200 text-base appearance-none"
                >
                  <option value="none">No Repeat</option>
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                </select>
                <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                  <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                </div>
              </div>
            </div>

            {/* Time Presets */}
            {eventFormData.time && (
              <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded-lg">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Quick Duration Presets
                </label>
                <div className="flex flex-wrap gap-2">
                  {[
                    { label: '30 min', minutes: 30 },
                    { label: '1 hour', minutes: 60 },
                    { label: '1.5 hours', minutes: 90 },
                    { label: '2 hours', minutes: 120 },
                  ].map(preset => (
                    <button
                      key={preset.label}
                      type="button"
                      onClick={() => {
                        if (eventFormData.time) {
                          const [hour, minute] = eventFormData.time.split(':').map(Number);
                          const startTotalMinutes = hour * 60 + minute;
                          const endTotalMinutes = startTotalMinutes + preset.minutes;
                          const endHour = Math.floor(endTotalMinutes / 60) % 24;
                          const endMinute = endTotalMinutes % 60;
                          const endTime = `${endHour.toString().padStart(2, '0')}:${endMinute.toString().padStart(2, '0')}`;
                          setEventFormData(prev => ({ ...prev, endTime }));
                        }
                      }}
                      className="px-3 py-1 text-sm bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 rounded-full hover:bg-blue-200 dark:hover:bg-blue-800 transition-colors"
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="flex justify-end space-x-3 pt-4">
              {selectedEvent && (
                <button
                  type="button"
                  onClick={() => {
                    if (selectedEvent && confirm('Are you sure you want to delete this event?')) {
                      deleteEvent(selectedEvent.id);
                    }
                  }}
                  className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors"
                >
                  Delete
                </button>
              )}
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-200 dark:bg-gray-700 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
              >
                {selectedEvent ? 'Update Event' : 'Create Event'}
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Calendar</h1>
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setViewMode('month')}
              className={`px-3 py-1 text-sm rounded-md ${
                viewMode === 'month'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
              }`}
            >
              Month
            </button>
            <button
              onClick={() => setViewMode('week')}
              className={`px-3 py-1 text-sm rounded-md ${
                viewMode === 'week'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
              }`}
            >
              Week
            </button>
            <button
              onClick={() => setViewMode('day')}
              className={`px-3 py-1 text-sm rounded-md ${
                viewMode === 'day'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
              }`}
            >
              Day
            </button>
          </div>
          <button 
            onClick={() => openAddEventModal()}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Add Event
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Calendar Grid */}
        <div className="lg:col-span-3">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
            {/* Calendar Header */}
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                {months[currentDate.getMonth()]} {currentDate.getFullYear()}
              </h2>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => navigateMonth('prev')}
                  className="p-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
                <button
                  onClick={() => setCurrentDate(new Date())}
                  className="px-3 py-1 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                >
                  Today
                </button>
                <button
                  onClick={() => navigateMonth('next')}
                  className="p-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Days of Week Header */}
            <div className="grid grid-cols-7 gap-1 mb-2">
              {daysOfWeek.map((day) => (
                <div key={day} className="p-3 text-center text-sm font-medium text-gray-500 dark:text-gray-400">
                  {day}
                </div>
              ))}
            </div>

            {/* Calendar Days */}
            <div className="grid grid-cols-7 gap-1">
              {getDaysArray().map((day, index) => {
                const isToday = day && 
                  currentDate.getFullYear() === new Date().getFullYear() &&
                  currentDate.getMonth() === new Date().getMonth() &&
                  day === new Date().getDate();
                
                const dayEvents = day ? getEventsForDate(day) : [];
                
                return (
                  <div
                    key={index}
                    className={`
                      min-h-[100px] p-2 border border-gray-200 dark:border-gray-700 
                      ${day ? 'bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer' : 'bg-gray-50 dark:bg-gray-900'}
                      ${isToday ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-300' : ''}
                      transition-colors
                    `}
                    onClick={() => day && handleDateClick(day)}
                  >
                    {day && (
                      <>
                        <div className={`text-sm font-medium mb-1 ${isToday ? 'text-blue-600 dark:text-blue-400' : 'text-gray-900 dark:text-white'}`}>
                          {day}
                        </div>
                        <div className="space-y-1">
                          {dayEvents.slice(0, 2).map((event) => (
                            <div 
                              key={event.id}
                              className={`p-1 rounded text-xs text-white ${event.color} cursor-pointer hover:opacity-80 transition-opacity`}
                              onClick={(e) => {
                                e.stopPropagation();
                                openEditEventModal(event);
                              }}
                            >
                              <div className="flex items-center space-x-1">
                                {getEventTypeIcon(event.type)}
                                <span className="truncate">{event.title}</span>
                              </div>
                              <div className="text-xs opacity-75">
                                {formatTime(event.time)}
                              </div>
                            </div>
                          ))}
                          {dayEvents.length > 2 && (
                            <div className="text-xs text-gray-500 dark:text-gray-400 text-center">
                              +{dayEvents.length - 2} more
                            </div>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Today's Events */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Today's Events
            </h3>
            {todayEvents.length > 0 ? (
              <div className="space-y-3">
                {todayEvents.map((event) => (
                  <div 
                    key={event.id} 
                    className="flex items-center space-x-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
                    onClick={() => openEditEventModal(event)}
                  >
                    <div className={`p-2 rounded-full ${event.color} text-white`}>
                      {getEventTypeIcon(event.type)}
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-gray-900 dark:text-white">{event.title}</p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {formatTime(event.time)}
                        {event.endTime && ` - ${formatTime(event.endTime)}`}
                      </p>
                      {event.location && (
                        <p className="text-xs text-gray-500 dark:text-gray-400">📍 {event.location}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 dark:text-gray-400 text-sm">No events today</p>
            )}
          </div>

          {/* Upcoming Events */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Upcoming Events
            </h3>
            {upcomingEvents.length > 0 ? (
              <div className="space-y-3">
                {upcomingEvents.map((event) => (
                  <div 
                    key={event.id} 
                    className="flex items-center space-x-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
                    onClick={() => openEditEventModal(event)}
                  >
                    <div className={`p-2 rounded-full ${event.color} text-white`}>
                      {getEventTypeIcon(event.type)}
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-gray-900 dark:text-white">{event.title}</p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {new Date(event.date).toLocaleDateString()} • {formatTime(event.time)}
                        {event.endTime && ` - ${formatTime(event.endTime)}`}
                      </p>
                      {event.location && (
                        <p className="text-xs text-gray-500 dark:text-gray-400">📍 {event.location}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 dark:text-gray-400 text-sm">No upcoming events</p>
            )}
          </div>

          {/* Quick Actions */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Quick Actions
            </h3>
            <div className="space-y-2">
              <button 
                onClick={() => openAddEventModal()}
                className="w-full text-left p-3 bg-gray-50 dark:bg-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
              >
                <div className="flex items-center space-x-3">
                  <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                  <span className="font-medium text-gray-900 dark:text-white">Add Event</span>
                </div>
              </button>
              <button 
                onClick={() => setViewMode('month')}
                className="w-full text-left p-3 bg-gray-50 dark:bg-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
              >
                <div className="flex items-center space-x-3">
                  <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <span className="font-medium text-gray-900 dark:text-white">View Schedule</span>
                </div>
              </button>
              <button 
                onClick={() => {
                  // Navigate to today's date
                  setCurrentDate(new Date());
                }}
                className="w-full text-left p-3 bg-gray-50 dark:bg-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
              >
                <div className="flex items-center space-x-3">
                  <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  <span className="font-medium text-gray-900 dark:text-white">Go to Today</span>
                </div>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Event Modal */}
      <EventModal 
        isOpen={isAddEventModalOpen || isEditEventModalOpen}
        onClose={() => {
          setIsAddEventModalOpen(false);
          setIsEditEventModalOpen(false);
          setSelectedEvent(null);
          resetEventForm();
        }}
      />
    </div>
  );
};

export default Calendar;
