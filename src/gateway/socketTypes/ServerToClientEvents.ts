import { ChatMessage } from 'src/chatService/chatService';
import { Player, RoomStateType } from 'src/gameService/roomService';

export interface ServerToClientEvents {
  'room-state': (room: RoomStateType | null) => void;

  'choose-color': (isChooseColor: boolean) => void;

  'get-me': (myId: { id: string }) => void;

  'leave-success': () => void;

  'get-chat': (chat: ChatMessage[]) => void;

  'winner-winner': (winner: Player['id']) => void;

  error: ({ message }: { message: string }, func?: () => void) => void;
}
