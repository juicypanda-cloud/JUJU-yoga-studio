import React from 'react';
import { User, Mail } from 'lucide-react';
import { UserDocument } from '../../types';

interface ProfileOverviewProps {
  user: {
    displayName?: string | null;
    email?: string | null;
    photoURL?: string | null;
  };
  profile?: UserDocument | null;
}

export const ProfileOverview: React.FC<ProfileOverviewProps> = ({ user, profile }) => {
  return (
    <div className="bg-brand-ink p-6 text-white relative overflow-hidden sm:p-10 md:p-12">
      <div className="absolute top-0 right-0 w-64 h-64 bg-brand-icon/10 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl" />
      <div className="relative z-10 flex flex-col md:flex-row items-center gap-8">
        <div className="relative h-24 w-24 shrink-0 rounded-full border-4 border-white/10 overflow-hidden bg-secondary/25">
          {user.photoURL ? (
            <img
              src={user.photoURL}
              alt={user.displayName || 'Профайл зураг'}
              className="h-full w-full object-cover"
              loading="eager"
              decoding="async"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center">
              <User size={40} className="text-white/40" />
            </div>
          )}
        </div>
        <div className="text-center md:text-left">
          <h1 className="text-3xl font-serif mb-2">{user.displayName || profile?.displayName || 'Хэрэглэгч'}</h1>
          <p className="text-white/60 font-light flex items-center justify-center md:justify-start gap-2">
            <Mail size={14} />
            {user.email || profile?.email}
          </p>
        </div>
      </div>
    </div>
  );
};
