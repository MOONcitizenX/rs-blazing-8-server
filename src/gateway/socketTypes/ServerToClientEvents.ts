import { ChatMessage } from 'src/chatService/chatService';
import { RoomStateType } from 'src/gameService/roomService';

export interface ServerToClientEvents {
  'room-state': (room: RoomStateType | null) => void;

  'choose-color': (isChooseColor: boolean) => void;

  'get-me': (myId: { id: string }) => void;

  'leave-success': () => void;

  'get-chat': (chat: ChatMessage[]) => void;

  error: ({ message }: { message: string }, func?: () => void) => void;
}
