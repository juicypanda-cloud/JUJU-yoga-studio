import React from 'react';
import { ClipboardCheck, CalendarClock, ClipboardList, Plus, Trash2 } from 'lucide-react';
import { Button } from '../ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '../ui/dialog';
import { Input } from '../ui/input';
import { Textarea } from '../ui/textarea';

export type RosterAttendance = 'present' | 'absent' | 'unknown';

export type RosterStudent = {
  key: string;
  name: string;
  email: string;
  attendance: RosterAttendance;
  bookingIds: string[];
};

export type TeacherClassSummary = {
  id: string;
  title: string;
  teacher: string;
  teacherId: string;
  duration: string;
  participantCount: number;
  capacityTotal: number;
  sessionCount: number;
  roster: RosterStudent[];
};

export type ScheduleRow = {
  id: string;
  classId?: string;
  dayOfWeek?: string;
  startTime?: string;
  endTime?: string;
  room?: string;
  bookedCount?: number;
  capacity?: number;
};

const WEEK_DAYS = ['Даваа', 'Мягмар', 'Лхагва', 'Пүрэв', 'Баасан', 'Бямба', 'Ням'];

interface TeacherScheduleProps {
  teacherClasses: TeacherClassSummary[];
  teacherLoading: boolean;
  scheduleRows: ScheduleRow[];
  onOpenScheduleDialog: (classId: string) => void;
  onOpenRosterDialog: (classId: string) => void;
  onDeleteClass: (classId: string) => void;
  onOpenNewClassDialog: () => void;
}

export const TeacherSchedule: React.FC<TeacherScheduleProps> = ({
  teacherClasses,
  teacherLoading,
  onOpenScheduleDialog,
  onOpenRosterDialog,
  onDeleteClass,
  onOpenNewClassDialog,
}) => {
  return (
    <div className="mb-12 rounded-2xl border border-brand-ink/10 p-4 sm:rounded-[2rem] sm:p-8">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h3 className="flex items-center gap-3 text-xl font-serif text-brand-ink">
          <ClipboardCheck className="text-brand-icon" size={20} />
          Багшийн хуваарь ба хичээлүүд
        </h3>
        {!teacherLoading ? (
          <Button
            type="button"
            className="shrink-0 rounded-full bg-brand-ink px-5 text-white hover:bg-brand-icon"
            onClick={onOpenNewClassDialog}
          >
            <Plus size={16} className="mr-2" />
            Шинэ хичээл нэмэх
          </Button>
        ) : null}
      </div>

      {teacherLoading ? (
        <p className="py-6 text-center text-sm text-brand-ink/50">Уншиж байна...</p>
      ) : teacherClasses.length === 0 ? (
        <p className="py-4 text-sm text-brand-ink/60">
          Танд хуваарилагдсан эсвэл үүсгэсэн хичээл байхгүй байна.
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {teacherClasses.map((c) => (
            <div
              key={c.id}
              className="flex flex-col justify-between rounded-2xl border border-brand-ink/10 bg-white p-5 shadow-sm transition-shadow hover:shadow-md"
            >
              <div>
                <h4 className="font-serif text-lg font-medium text-brand-ink">{c.title}</h4>
                <p className="mt-1 text-xs text-brand-ink/60">{c.duration}</p>
                <div className="mt-4 space-y-1 text-xs text-brand-ink/70">
                  <p className="flex justify-between">
                    <span>Бүртгүүлсэн сурагч:</span>
                    <span className="font-bold text-brand-ink">
                      {c.participantCount} / {c.capacityTotal}
                    </span>
                  </p>
                  <p className="flex justify-between">
                    <span>Нийт цаг/хичээл:</span>
                    <span className="font-semibold text-brand-ink">{c.sessionCount}</span>
                  </p>
                </div>
              </div>

              <div className="mt-6 space-y-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="w-full justify-start rounded-xl text-xs font-semibold text-brand-ink"
                  onClick={() => onOpenScheduleDialog(c.id)}
                >
                  <CalendarClock size={14} className="mr-2 text-brand-icon" />
                  Цагийн хуваарь засах
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="w-full justify-start rounded-xl text-xs font-semibold text-brand-ink"
                  onClick={() => onOpenRosterDialog(c.id)}
                >
                  <ClipboardList size={14} className="mr-2 text-brand-icon" />
                  Сурагчдын жагсаалт ({c.participantCount})
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="w-full justify-start rounded-xl text-xs font-semibold text-red-600 hover:bg-red-50 hover:text-red-700"
                  onClick={() => onDeleteClass(c.id)}
                >
                  <Trash2 size={14} className="mr-2" />
                  Хичээл устгах
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
