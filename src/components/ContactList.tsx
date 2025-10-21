import { Badge } from './ui/badge';
import { Avatar, AvatarFallback } from './ui/avatar';

interface Contact {
  id: string;
  name: string;
  type: 'user' | 'group';
  online?: boolean;
  count?: number;
  avatar?: string;
}

interface ContactListProps {
  contacts: Contact[];
  selectedId?: string;
  onSelectContact: (id: string) => void;
}

export function ContactList({ contacts, selectedId, onSelectContact }: ContactListProps) {
  return (
    <div className="space-y-2">
      {contacts.map((contact) => (
        <div
          key={contact.id}
          onClick={() => onSelectContact(contact.id)}
          className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors ${
            selectedId === contact.id
              ? 'bg-slate-600'
              : 'hover:bg-slate-700'
          }`}
        >
          <div className="relative">
            <Avatar className="w-10 h-10">
              <AvatarFallback className="bg-slate-500 text-white">
                {contact.type === 'group' ? '群' : contact.name.charAt(0)}
              </AvatarFallback>
            </Avatar>
            {contact.online && (
              <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-slate-800"></div>
            )}
          </div>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-white truncate">{contact.name}</span>
              {contact.online && (
                <Badge variant="secondary" className="bg-green-500/20 text-green-400 text-xs px-1.5 py-0">
                  在线
                </Badge>
              )}
            </div>
            {contact.count !== undefined && (
              <div className="text-slate-400 text-sm">{contact.count} 人</div>
            )}
          </div>
          
          {contact.type === 'group' && (
            <Badge className="bg-purple-600 text-white text-xs">群</Badge>
          )}
        </div>
      ))}
    </div>
  );
}
