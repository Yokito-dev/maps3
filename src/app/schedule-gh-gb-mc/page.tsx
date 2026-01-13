'use client';

import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, Plus, Calendar, Clock, MapPin, User } from 'lucide-react';
import plnkecil from '@/app/assets/plnup3/plnkecil.svg'
import Image from 'next/image';
import { useRouter } from "next/navigation";
import { IoArrowBack } from "react-icons/io5";

interface Event {
  id: number;
  title: string;
  date: Date;
  startTime: string;
  endTime: string;
  location?: string;
  assignee?: string;
  color: string;
  description?: string;
}

const SchedulePage = () => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState<'day' | 'week' | 'month'>('month');
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [events] = useState<Event[]>([
    {
      id: 1,
      title: 'Site Inspection',
      date: new Date(2026, 0, 6),
      startTime: '09:00',
      endTime: '11:00',
      location: 'Palu Site A',
      assignee: 'Team 1',
      color: '#14b8a6',
      description: 'Monthly site inspection'
    },
    {
      id: 2,
      title: 'Team Meeting',
      date: new Date(2026, 0, 6),
      startTime: '14:00',
      endTime: '15:30',
      location: 'Office',
      assignee: 'All Teams',
      color: '#3b82f6',
      description: 'Weekly sync meeting'
    },
    {
      id: 3,
      title: 'Client Presentation',
      date: new Date(2026, 0, 8),
      startTime: '10:00',
      endTime: '12:00',
      location: 'Conference Room',
      assignee: 'Team 2',
      color: '#8b5cf6',
      description: 'Project update presentation'
    },
    {
      id: 4,
      title: 'Equipment Check',
      date: new Date(2026, 0, 13),
      startTime: '08:00',
      endTime: '09:30',
      location: 'Warehouse',
      assignee: 'Team 3',
      color: '#f59e0b',
      description: 'Routine equipment inspection'
    },
    {
      id: 5,
      title: 'Training Session',
      date: new Date(2026, 0, 13),
      startTime: '13:00',
      endTime: '16:00',
      location: 'Training Center',
      assignee: 'All Teams',
      color: '#ec4899',
      description: 'Safety training'
    }
  ]);

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const router = useRouter();

  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const dayNamesShort = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const daysOfWeek = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    const days = [];

    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null);
    }

    for (let day = 1; day <= daysInMonth; day++) {
      days.push(new Date(year, month, day));
    }

    return days;
  };

  const isToday = (date: Date | null) => {
    if (!date) return false;
    const today = new Date();
    return date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear();
  };

  const isSameDay = (date1: Date | null, date2: Date | null) => {
    if (!date1 || !date2) return false;
    return date1.getDate() === date2.getDate() &&
      date1.getMonth() === date2.getMonth() &&
      date1.getFullYear() === date2.getFullYear();
  };

  const getEventsForDate = (date: Date | null) => {
    if (!date) return [];
    return events.filter(event => isSameDay(event.date, date))
      .sort((a, b) => a.startTime.localeCompare(b.startTime));
  };

  const getWeekDates = (date: Date) => {
    const day = date.getDay();
    const diff = date.getDate() - day;
    const sunday = new Date(date);
    sunday.setDate(diff);

    const weekDates = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(sunday);
      d.setDate(sunday.getDate() + i);
      weekDates.push(d);
    }
    return weekDates;
  };

  const previousPeriod = () => {
    if (view === 'month') {
      setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1));
    } else if (view === 'week') {
      const newDate = new Date(currentDate);
      newDate.setDate(currentDate.getDate() - 7);
      setCurrentDate(newDate);
    } else {
      const newDate = new Date(currentDate);
      newDate.setDate(currentDate.getDate() - 1);
      setCurrentDate(newDate);
      setSelectedDate(newDate);
    }
  };

  const nextPeriod = () => {
    if (view === 'month') {
      setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1));
    } else if (view === 'week') {
      const newDate = new Date(currentDate);
      newDate.setDate(currentDate.getDate() + 7);
      setCurrentDate(newDate);
    } else {
      const newDate = new Date(currentDate);
      newDate.setDate(currentDate.getDate() + 1);
      setCurrentDate(newDate);
      setSelectedDate(newDate);
    }
  };

  const goToToday = () => {
    const today = new Date();
    setCurrentDate(today);
    setSelectedDate(today);
  };

  const getTimeSlots = () => {
    const slots = [];
    for (let hour = 0; hour < 24; hour++) {
      const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
      const period = hour < 12 ? 'AM' : 'PM';
      slots.push({ display: `${displayHour} ${period}`, hour });
    }
    return slots;
  };

  const getEventPosition = (startTime: string, endTime: string) => {
    const [startHour, startMin] = startTime.split(':').map(Number);
    const [endHour, endMin] = endTime.split(':').map(Number);

    const startMinutes = startHour * 60 + startMin;
    const endMinutes = endHour * 60 + endMin;
    const duration = endMinutes - startMinutes;

    const top = (startMinutes / 60) * 64; // 64px per hour
    const height = (duration / 60) * 64;

    return { top, height };
  };

  const handleDateClick = (date: Date) => {
    setSelectedDate(date);
    setView('day');
    setCurrentDate(date);
  };

  const getDisplayTitle = () => {
    if (view === 'month') {
      return `${monthNames[currentDate.getMonth()]} ${currentDate.getFullYear()}`;
    } else if (view === 'week') {
      const weekDates = getWeekDates(currentDate);
      const startDate = weekDates[0];
      const endDate = weekDates[6];

      if (startDate.getMonth() === endDate.getMonth()) {
        return `${monthNames[startDate.getMonth()]} ${String(startDate.getDate()).padStart(2, '0')} – ${String(endDate.getDate()).padStart(2, '0')}`;
      } else {
        return `${monthNames[startDate.getMonth()]} ${String(startDate.getDate()).padStart(2, '0')} – ${monthNames[endDate.getMonth()]} ${String(endDate.getDate()).padStart(2, '0')}`;
      }
    } else {
      const date = selectedDate || currentDate;
      return `${dayNames[date.getDay()]} ${monthNames[date.getMonth()].slice(0, 3)} ${String(date.getDate()).padStart(2, '0')}`;
    }
  };

  const days = getDaysInMonth(currentDate);
  const timeSlots = getTimeSlots();
  const weekDates = getWeekDates(currentDate);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="sticky top-0 z-30 px-4 pt-4">
        <div className="max-w-[1600px] mx-auto">
          <div className="bg-white rounded-full shadow-lg px-6 py-3 flex items-center gap-4">

            {/* BACK BUTTON */}
            <button
              onClick={() => router.push("/menu")}
              className="w-11 h-11 rounded-full hover:bg-gray-200 flex items-center justify-center transition active:scale-95">
              <IoArrowBack size={24} className="text-gray-700" />
            </button>

            {/* LOGO PLN (PALING KIRI) */}
            <Image
              src={plnkecil}
              alt="PLN"
              width={40}
              height={40}
              className="object-contain" />
            {/* TITLE */}
            <h1 className="text-lg md:text-xl font-medium text-gray-800">
              Schedule GH GB MC
            </h1>

          </div>
        </div>
      </div>

      <div className="max-w-[1600px] mx-auto px-6 py-6">
        {/* View Selector & Navigation */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-6">
          <div className="flex items-center justify-between px-6 py-4">
            <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
              <button
                onClick={() => {
                  setView('day');
                  setSelectedDate(currentDate);
                }}
                className={`px-5 py-2 rounded-md text-sm font-semibold transition-all ${view === 'day'
                  ? 'bg-white text-teal-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
                  }`}
              >
                Day
              </button>
              <button
                onClick={() => setView('week')}
                className={`px-5 py-2 rounded-md text-sm font-semibold transition-all ${view === 'week'
                  ? 'bg-white text-teal-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
                  }`}
              >
                Week
              </button>
              <button
                onClick={() => setView('month')}
                className={`px-5 py-2 rounded-md text-sm font-semibold transition-all ${view === 'month'
                  ? 'bg-white text-teal-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
                  }`}
              >
                Month
              </button>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={previousPeriod}
                className="p-2.5 hover:bg-gray-100 rounded-lg transition-all flex-shrink-0"
              >
                <ChevronLeft size={22} className="text-gray-700" strokeWidth={2.5} />
              </button>
              <div className="min-w-[240px] text-center">
                <h2 className="text-base font-semibold text-gray-800">
                  {getDisplayTitle()}
                </h2>
              </div>
              <button
                onClick={nextPeriod}
                className="p-2.5 hover:bg-gray-100 rounded-lg transition-all flex-shrink-0"
              >
                <ChevronRight size={22} className="text-gray-700" strokeWidth={2.5} />
              </button>
            </div>
          </div>
        </div>

        {/* Calendar Content */}
        {view === 'month' && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            <div className="grid grid-cols-7 bg-gray-50 border-b border-gray-200">
              {daysOfWeek.map((day, idx) => (
                <div
                  key={idx}
                  className="py-3 text-center text-xs font-bold text-gray-600 uppercase tracking-wide"
                >
                  {day}
                </div>
              ))}
            </div>

            <div className="grid grid-cols-7">
              {days.map((day, idx) => {
                const dayEvents = getEventsForDate(day);
                const isTodayDate = isToday(day);

                return (
                  <div
                    key={idx}
                    onClick={() => day && handleDateClick(day)}
                    className={`min-h-28 border-b border-r border-gray-100 p-2 ${!day ? 'bg-gray-50/50' : 'bg-white hover:bg-gray-50/50'
                      } transition-colors cursor-pointer`}
                  >
                    {day && (
                      <>
                        <div className="flex justify-start mb-2">
                          <span
                            className={`text-sm font-semibold ${isTodayDate
                              ? 'bg-teal-500 text-white w-7 h-7 rounded-full flex items-center justify-center'
                              : 'text-gray-700'
                              }`}
                          >
                            {day.getDate()}
                          </span>
                        </div>
                        <div className="space-y-1">
                          {dayEvents.slice(0, 3).map(event => (
                            <div
                              key={event.id}
                              className="text-xs px-2 py-1 rounded truncate font-medium"
                              style={{ backgroundColor: `${event.color}15`, color: event.color, borderLeft: `3px solid ${event.color}` }}
                            >
                              <div className="truncate">{event.title}</div>
                            </div>
                          ))}
                          {dayEvents.length > 3 && (
                            <div className="text-xs text-gray-500 px-2">
                              +{dayEvents.length - 3} more
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
        )}

        {/* Day View */}
        {view === 'day' && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            <div className="border-b border-gray-200 px-6 py-3 bg-gray-50">
              <div className="text-sm font-semibold text-gray-600 uppercase tracking-wide">
                {dayNamesShort[(selectedDate || currentDate).getDay()]}
              </div>
            </div>

            <div className="overflow-y-auto" style={{ maxHeight: 'calc(100vh - 280px)' }}>
              <div className="relative">
                {timeSlots.map((slot, idx) => (
                  <div key={idx} className="flex">
                    <div className="w-20 py-4 px-4 text-xs font-medium text-gray-500 text-right flex-shrink-0 bg-gray-50/50 border-r border-b border-gray-200">
                      {slot.display}
                    </div>
                    <div className="flex-1 relative h-16 border-b border-gray-200"></div>
                  </div>
                ))}

                {/* Render events */}
                <div className="absolute top-0 left-20 right-0 bottom-0 pointer-events-none">
                  {getEventsForDate(selectedDate || currentDate).map(event => {
                    const { top, height } = getEventPosition(event.startTime, event.endTime);
                    return (
                      <div
                        key={event.id}
                        className="absolute left-2 right-2 rounded-lg p-3 pointer-events-auto cursor-pointer hover:shadow-lg transition-all border-l-4"
                        style={{
                          top: `${top}px`,
                          height: `${Math.max(height, 48)}px`,
                          backgroundColor: `${event.color}15`,
                          borderLeftColor: event.color,
                          color: event.color
                        }}
                      >
                        <div className="font-bold text-sm mb-1">{event.title}</div>
                        <div className="text-xs font-medium opacity-90 flex items-center gap-1">
                          <Clock size={12} />
                          {event.startTime} - {event.endTime}
                        </div>
                        {event.location && (
                          <div className="text-xs opacity-75 flex items-center gap-1 mt-1">
                            <MapPin size={12} />
                            {event.location}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Week View */}
        {view === 'week' && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            {/* Week Header */}
            <div className="grid grid-cols-8 border-b border-gray-200 bg-gray-50">
              <div className="w-20"></div>
              {weekDates.map((date, idx) => (
                <div
                  key={idx}
                  className="text-center py-3 border-l border-gray-200"
                >
                  <div className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">
                    {dayNamesShort[date.getDay()]}
                  </div>
                  <div
                    className={`text-sm font-bold mx-auto ${isToday(date)
                      ? 'bg-teal-500 text-white w-7 h-7 rounded-full flex items-center justify-center'
                      : 'text-gray-700'
                      }`}
                  >
                    {date.getDate()}
                  </div>
                </div>
              ))}
            </div>

            {/* Week Grid */}
            <div className="overflow-y-auto" style={{ maxHeight: 'calc(100vh - 280px)' }}>
              <div className="relative">
                {timeSlots.map((slot, idx) => (
                  <div key={idx} className="flex border-b border-gray-100">
                    <div className="w-20 py-4 px-4 text-xs font-medium text-gray-500 text-right flex-shrink-0 bg-gray-50/50">
                      {slot.display}
                    </div>
                    {weekDates.map((date, dateIdx) => (
                      <div
                        key={dateIdx}
                        className="flex-1 relative h-16 border-l border-gray-200 hover:bg-gray-50/50 transition-colors"
                      ></div>
                    ))}
                  </div>
                ))}

                {/* Render week events */}
                {weekDates.map((date, dateIdx) => {
                  const dayEvents = getEventsForDate(date);
                  return (
                    <div
                      key={dateIdx}
                      className="absolute top-0 bottom-0 pointer-events-none"
                      style={{
                        left: `calc(5rem + ${dateIdx * (100 / 7)}%)`,
                        width: `calc(${100 / 7}% - 4px)`
                      }}
                    >
                      {dayEvents.map(event => {
                        const { top, height } = getEventPosition(event.startTime, event.endTime);
                        return (
                          <div
                            key={event.id}
                            className="absolute left-1 right-1 rounded-md p-2 pointer-events-auto cursor-pointer hover:shadow-lg transition-all overflow-hidden border-l-3"
                            style={{
                              top: `${top}px`,
                              height: `${Math.max(height, 40)}px`,
                              backgroundColor: `${event.color}15`,
                              borderLeftWidth: '3px',
                              borderLeftColor: event.color,
                              color: event.color
                            }}
                          >
                            <div className="font-bold text-xs truncate">
                              {event.title}
                            </div>
                            <div className="text-xs font-medium opacity-90 truncate">
                              {event.startTime}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Floating Add Button */}
      <button
        className="fixed bottom-8 right-8 w-14 h-14 bg-teal-500 text-white rounded-full shadow-lg hover:bg-teal-600 hover:shadow-xl transition-all flex items-center justify-center z-50">
        <Plus size={26} strokeWidth={2.5} />
      </button>
    </div>
  );
};

export default SchedulePage; 3