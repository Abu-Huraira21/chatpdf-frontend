import { Download, Share2, Trash2, Menu } from 'lucide-react';
import { Button } from './ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';
import { Avatar, AvatarFallback } from './ui/avatar';
import type { Document } from '../App';

interface HeaderProps {
  document: Document | null;
  onToggleSidebar: () => void;
  onSettingsClick: () => void;
  onShareClick: () => void;
  onDeleteClick: () => void;
  onProfileClick: () => void;
  onLogout?: () => void;
  userProfile: {
    name: string;
    email: string;
    avatarUrl?: string;
    joinDate: string;
  };
}

export function Header({ document, onToggleSidebar, onSettingsClick, onShareClick, onDeleteClick, onProfileClick, onLogout, userProfile }: HeaderProps) {
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };
  return (
    <header className="flex items-center justify-between px-6 py-4 bg-white border-b border-gray-200">
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={onToggleSidebar}
          className="lg:hidden"
        >
          <Menu className="h-5 w-5" />
        </Button>

        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg">
            <svg
              className="w-6 h-6 text-white"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"
              />
            </svg>
          </div>
          <div>
            <h1 className="text-gray-900">ChatPdf</h1>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 flex-1 justify-center max-w-md">
        {document ? (
        <div className="flex flex-col items-center max-w-full">
          <p
            className="text-gray-900 max-w-full truncate"
            title={document.name}
          >
            {document.name}
          </p>
          <p className="text-sm text-gray-500">
            {document.pages} pages · {document.size}
          </p>
        </div>
        ) : (
          <div className="flex flex-col items-center">
            <p className="text-gray-500">No document selected</p>
          </div>
        )}
      </div>

      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" disabled={!document}>
          <Download className="h-4 w-4 mr-2" />
          Download
        </Button>
        <Button variant="ghost" size="sm" onClick={onShareClick} disabled={!document}>
          <Share2 className="h-4 w-4 mr-2" />
          Share
        </Button>
        <Button variant="ghost" size="sm" onClick={onDeleteClick} disabled={!document}>
          <Trash2 className="h-4 w-4 mr-2" />
          Delete
        </Button>
        
        <Button 
          variant="ghost" 
          size="icon" 
          className="rounded-full"
          onClick={() => {
            console.log('Avatar clicked - opening profile');
            onProfileClick();
          }}
        >
          <Avatar className="h-8 w-8 cursor-pointer hover:ring-2 hover:ring-blue-500 transition-all">
            {userProfile.avatarUrl ? (
              <img src={userProfile.avatarUrl} alt={userProfile.name} className="object-cover" />
            ) : (
              <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-white">
                {getInitials(userProfile.name)}
              </AvatarFallback>
            )}
          </Avatar>
        </Button>
      </div>
    </header>
  );
}
